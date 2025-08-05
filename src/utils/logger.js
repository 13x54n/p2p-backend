const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create route-specific log directories
const routeLogsDir = path.join(logsDir, 'routes');
if (!fs.existsSync(routeLogsDir)) {
  fs.mkdirSync(routeLogsDir, { recursive: true });
}

// Create different log directories for different types
const logTypes = ['users', 'orders', 'health', 'errors', 'access'];
logTypes.forEach(type => {
  const typeDir = path.join(routeLogsDir, type);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }
});

class Logger {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL || 'INFO';
  }

  // Get current timestamp
  getTimestamp() {
    return new Date().toISOString();
  }

  // Get current date for file naming
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Write log to file
  writeLog(type, level, message, data = {}) {
    const timestamp = this.getTimestamp();
    const date = this.getCurrentDate();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data
    };

    const logFile = path.join(routeLogsDir, type, `${date}.log`);
    const logString = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(logFile, logString);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  // Route-specific logging
  logRoute(route, method, req, res, responseTime, statusCode) {
    const logData = {
      method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      responseTime: `${responseTime}ms`,
      statusCode,
      userId: req.body?.uid || req.params?.uid || req.query?.uid || 'anonymous',
      requestBody: method !== 'GET' ? req.body : undefined,
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined
    };

    // Determine log level based on status code
    let level = 'INFO';
    if (statusCode >= 500) level = 'ERROR';
    else if (statusCode >= 400) level = 'WARN';
    else if (statusCode >= 300) level = 'INFO';

    this.writeLog(route, level, `${method} ${req.originalUrl}`, logData);
  }

  // Error logging
  logError(route, error, req = null) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.body?.uid || req.params?.uid || req.query?.uid || 'anonymous'
      } : null
    };

    this.writeLog(route, 'ERROR', `Error in ${route} route`, logData);
  }

  // User-specific logging
  logUserAction(action, userId, details = {}) {
    const logData = {
      action,
      userId,
      ...details
    };

    this.writeLog('users', 'INFO', `User action: ${action}`, logData);
  }

  // Order-specific logging
  logOrderAction(action, orderId, userId, details = {}) {
    const logData = {
      action,
      orderId,
      userId,
      ...details
    };

    this.writeLog('orders', 'INFO', `Order action: ${action}`, logData);
  }

  // Health check logging
  logHealth(status, details = {}) {
    const logData = {
      status,
      ...details
    };

    this.writeLog('health', 'INFO', `Health check: ${status}`, logData);
  }

  // Access logging
  logAccess(method, url, ip, userAgent, statusCode, responseTime) {
    const logData = {
      method,
      url,
      ip,
      userAgent,
      statusCode,
      responseTime: `${responseTime}ms`
    };

    this.writeLog('access', 'INFO', `Access: ${method} ${url}`, logData);
  }

  // General logging methods
  error(message, data = {}) {
    this.writeLog('errors', 'ERROR', message, data);
  }

  warn(message, data = {}) {
    this.writeLog('errors', 'WARN', message, data);
  }

  info(message, data = {}) {
    this.writeLog('errors', 'INFO', message, data);
  }

  debug(message, data = {}) {
    this.writeLog('errors', 'DEBUG', message, data);
  }

  // Get logs for a specific route and date
  getLogs(route, date = null) {
    const targetDate = date || this.getCurrentDate();
    const logFile = path.join(routeLogsDir, route, `${targetDate}.log`);
    
    try {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        return content.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }
      return [];
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  // Get recent logs for a route
  getRecentLogs(route, limit = 100) {
    const logs = this.getLogs(route);
    return logs.slice(-limit);
  }

  // Clear old logs (older than specified days)
  clearOldLogs(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    logTypes.forEach(type => {
      const typeDir = path.join(routeLogsDir, type);
      if (fs.existsSync(typeDir)) {
        const files = fs.readdirSync(typeDir);
        files.forEach(file => {
          const filePath = path.join(typeDir, file);
          const fileDate = new Date(file.replace('.log', ''));
          
          if (fileDate < cutoffDate) {
            try {
              fs.unlinkSync(filePath);
              console.log(`Deleted old log file: ${filePath}`);
            } catch (error) {
              console.error(`Error deleting log file ${filePath}:`, error);
            }
          }
        });
      }
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 