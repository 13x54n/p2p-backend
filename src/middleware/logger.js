const logger = require('../utils/logger');

// Middleware to log all requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Store original send method
  const originalSend = res.send;
  
  // Override send method to capture response
  res.send = function(data) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Determine route type based on URL
    let routeType = 'access';
    if (req.originalUrl.startsWith('/api/users')) {
      routeType = 'users';
    } else if (req.originalUrl.startsWith('/api/orders')) {
      routeType = 'orders';
    } else if (req.originalUrl.startsWith('/api/health')) {
      routeType = 'health';
    }
    
    // Log the request
    logger.logRoute(routeType, req.method, req, res, responseTime, statusCode);
    
    // Also log to access log
    logger.logAccess(
      req.method,
      req.originalUrl,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent'),
      statusCode,
      responseTime
    );
    
    // Call original send method
    originalSend.call(this, data);
  };
  
  next();
};

// Middleware to log errors
const errorLogger = (err, req, res, next) => {
  // Determine route type based on URL
  let routeType = 'errors';
  if (req.originalUrl.startsWith('/api/users')) {
    routeType = 'users';
  } else if (req.originalUrl.startsWith('/api/orders')) {
    routeType = 'orders';
  } else if (req.originalUrl.startsWith('/api/health')) {
    routeType = 'health';
  }
  
  // Log the error
  logger.logError(routeType, err, req);
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
}; 