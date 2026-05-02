const mongoose = require("mongoose");

// Connection state
let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

// Exponential backoff delay calculation
const getRetryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000);

/**
 * Connect to MongoDB with modern Mongoose (v8+)
 * Uses minimal, non-deprecated options only
 */
const connectDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (mongoose.connection.readyState > 0) {
    console.log("✅ MongoDB connection already in progress or established");
    return;
  }

  try {
    retryCount++;
    const attempt = retryCount;

    console.log(`🔄 Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})...`);

    // Validate environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Mask password in logs for security
    const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]{4})[^:@]*@/, ':****@');
    console.log(`📍 URI: ${maskedUri}`);

    // Modern Mongoose connection - minimal options, no deprecated ones
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Connection successful
    isConnected = true;
    retryCount = 0; // Reset retry counter

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Ready State: ${conn.connection.readyState} (1 = connected)`);

    // Set up event listeners for connection monitoring
    setupConnectionListeners();

  } catch (error) {
    isConnected = false;

    console.error(`❌ MongoDB Connection Failed (attempt ${retryCount}/${MAX_RETRIES}):`);
    console.error(`   Message: ${error.message}`);

    // Provide helpful troubleshooting for common errors
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   💡 Troubleshooting:');
      console.error('      - Check if MongoDB Atlas cluster is not paused');
      console.error('      - Verify Network Access allows your IP (0.0.0.0/0 for testing)');
      console.error('      - Confirm connection string is correct');
      console.error('      - Check internet connectivity');
    }

    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryDelay(retryCount - 1);
      console.log(`⏳ Retrying in ${delay / 1000} seconds... (${retryCount}/${MAX_RETRIES})`);
      setTimeout(connectDB, delay);
    } else {
      console.error(`💥 Failed to connect after ${MAX_RETRIES} attempts`);
      console.error('🚨 Server will start without database - API routes will return 503');
      console.error('🔧 Fix MongoDB connection and restart server');
      throw new Error('Database connection failed after maximum retries');
    }
  }
};

/**
 * Set up MongoDB connection event listeners
 */
const setupConnectionListeners = () => {
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Runtime Error:', err.message);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB Disconnected');
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB Reconnected');
    isConnected = true;
    retryCount = 0;
  });
};

/**
 * Close MongoDB connection gracefully
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
    isConnected = false;
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    throw error;
  }
};

/**
 * Get detailed connection status
 */
const getConnectionStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
  retryCount,
  maxRetries: MAX_RETRIES,
  readyStateDescription: getReadyStateDescription(mongoose.connection.readyState)
});

/**
 * Get human-readable description of connection readyState
 */
const getReadyStateDescription = (readyState) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[readyState] || 'unknown';
};

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected,
  getConnectionStatus
};
