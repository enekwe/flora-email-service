/**
 * Helper Utility Functions
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize user input (prevent XSS)
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate pagination metadata
 */
const getPaginationMetadata = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Retry with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000, maxDelay = 10000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Mask sensitive data for logging
 */
const maskSensitiveData = (data) => {
  if (!data) return data;

  const masked = { ...data };

  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  });

  return masked;
};

/**
 * Format error for API response
 */
const formatError = (error) => {
  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * Format success response
 */
const formatSuccess = (data, message = null) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return response;
};

/**
 * Extract bearer token from request header
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
};

module.exports = {
  isValidEmail,
  sanitizeInput,
  getPaginationMetadata,
  retryWithBackoff,
  maskSensitiveData,
  formatError,
  formatSuccess,
  extractBearerToken
};
