const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Database Configuration
 * Implements MongoDB connection with retry logic and exponential backoff
 * Uses TCP proxy URL for Railway deployment (NOT .railway.internal)
 */

const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const connectDB = async (retryCount = 0) => {
  const options = {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 45000,
    connectTimeoutMS: 45000,
    socketTimeoutMS: 0,
    heartbeatFrequencyMS: 10000,
    family: 4 // Force IPv4
  };

  try {
    logger.info('Attempting to connect to MongoDB...', {
      uri: process.env.MONGODB_URI?.split('@')[1], // Log only host/db (not credentials)
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRY_ATTEMPTS
    });

    await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      poolSize: options.maxPoolSize
    });

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      error: error.message
    });

    if (retryCount < MAX_RETRY_ATTEMPTS) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s...
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying connection in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    } else {
      logger.error('Max retry attempts reached. Could not connect to MongoDB.');
      throw new Error('Failed to connect to MongoDB after maximum retry attempts');
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
