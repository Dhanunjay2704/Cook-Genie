require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectDB, disconnectDB, getConnectionStatus } = require("./config/db");
const { requireDatabaseConnection } = require("./middleware/database");
const recipeRoutes = require("./routes/recipeRoutes");

const app = express();
const DEFAULT_PORT = process.env.PORT || 5000;

// Global server instance - prevents multiple servers
let server = null;
let selectedPort = null;

/**
 * Validate required environment variables
 */
const validateEnvironment = () => {
  const required = ['MONGODB_URI', 'GROQ_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
};

/**
 * Check if a port is available
 */
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const testServer = net.createServer();

    testServer.listen(port, '127.0.0.1', () => {
      testServer.close(() => resolve(true));
    });

    testServer.on('error', () => {
      resolve(false);
    });
  });
};

/**
 * Find the first available port starting from the given port
 */
const findAvailablePort = async (startPort) => {
  console.log(`🔍 Checking port availability starting from ${startPort}...`);

  let port = startPort;
  const maxAttempts = 10; // Prevent infinite loops
  let attempts = 0;

  while (attempts < maxAttempts) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✅ Port ${port} is available`);
      return port;
    } else {
      console.log(`❌ Port ${port} is busy`);
      port++;
      attempts++;
    }
  }

  throw new Error(`Could not find an available port after checking ${maxAttempts} ports`);
};

/**
 * Configure Express middleware
 */
const setupMiddleware = () => {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }));

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`📨 ${timestamp} - ${req.method} ${req.path}`);
      next();
    });
  }
};

/**
 * Configure API routes with database protection
 */
const setupRoutes = () => {
  // Health check (no DB required)
  app.get("/api/health", (req, res) => {
    const dbStatus = getConnectionStatus();
    res.json({
      status: "Server is running",
      timestamp: new Date(),
      port: selectedPort,
      database: dbStatus,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.version
    });
  });

  // Protected API routes (require database connection)
  app.use("/api/recipes", requireDatabaseConnection, recipeRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err.message);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map(e => e.message)
      });
    }

    // MongoDB connection error
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      return res.status(503).json({
        error: 'Database Error',
        message: 'Service temporarily unavailable'
      });
    }

    res.status(500).json({
      error: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
};

/**
 * Start the server after database connection is established
 */
const startServer = async () => {
  try {
    // Prevent multiple server instances
    if (server) {
      console.log('⚠️  Server is already running, skipping startup');
      return;
    }

    console.log('🚀 Starting AI Recipe Server...');

    // Validate environment
    validateEnvironment();

    // Find available port (only once)
    if (!selectedPort) {
      selectedPort = await findAvailablePort(DEFAULT_PORT);

      if (selectedPort !== DEFAULT_PORT) {
        console.log(`📡 Default port ${DEFAULT_PORT} was busy, using port ${selectedPort} instead`);
      } else {
        console.log(`✅ Using default port ${selectedPort}`);
      }
    }

    // Attempt initial database connection
    console.log('🔄 Establishing database connection...');
    await connectDB();

    // Only start server if database is connected
    const dbStatus = getConnectionStatus();
    if (!dbStatus.isConnected) {
      console.error('❌ Cannot start server: Database connection failed');
      console.error('🔧 Please fix MongoDB connection and restart');
      process.exit(1);
    }

    // Setup middleware and routes
    setupMiddleware();
    setupRoutes();

    // Start HTTP server (only once)
    console.log(`🌐 Starting server on port ${selectedPort}...`);

    server = app.listen(selectedPort, '127.0.0.1', () => {
      console.log(`✅ Server successfully started!`);
      console.log(`🌐 Health check: http://localhost:${selectedPort}/api/health`);
      console.log(`📚 API endpoints: http://localhost:${selectedPort}/api/recipes`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: Connected to ${dbStatus.name} (${dbStatus.host})`);
      console.log(`🎯 Server is ready to accept connections`);
    });

    server.on('error', (error) => {
      console.error('❌ Server startup error:', error.message);

      if (error.code === 'EADDRINUSE') {
        console.error(`💥 Port ${selectedPort} is already in use despite availability check`);
        console.error('🔧 This should not happen. Please check for other server instances.');
      }

      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    console.log('🔌 Closing HTTP server...');
    server.close(async () => {
      console.log('✅ HTTP server closed');
      server = null; // Clear server instance

      try {
        await disconnectDB();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    console.log('ℹ️  No server instance to shut down');
    process.exit(0);
  }
};

// Process event handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the application (only once)
if (require.main === module) {
  startServer();
}

module.exports = app;