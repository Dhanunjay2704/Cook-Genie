const { getConnectionStatus } = require('../config/db');

/**
 * Middleware to check if MongoDB is connected before processing requests
 * Blocks API requests if database is not available
 */
const requireDatabaseConnection = (req, res, next) => {
    const dbStatus = getConnectionStatus();

    // Allow health check endpoint even if DB is down
    if (req.path === '/api/health') {
        return next();
    }

    // Check if database is connected
    if (!dbStatus.isConnected || dbStatus.readyState !== 1) {
        console.warn(`🚫 Request blocked - Database not connected: ${req.method} ${req.path}`);

        return res.status(503).json({
            error: 'Service Temporarily Unavailable',
            message: 'Database connection is not available. Please try again later.',
            database: {
                connected: dbStatus.isConnected,
                readyState: dbStatus.readyState,
                retryCount: dbStatus.retryCount,
                maxRetries: dbStatus.maxRetries
            },
            timestamp: new Date().toISOString()
        });
    }

    // Database is connected, proceed with request
    next();
};

module.exports = { requireDatabaseConnection };