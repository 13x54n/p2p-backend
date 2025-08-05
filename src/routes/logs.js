const express = require('express');
const { query } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const logQueryValidation = [
  query('route')
    .optional()
    .isIn(['users', 'orders', 'health', 'errors', 'access'])
    .withMessage('Route must be users, orders, health, errors, or access'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('level')
    .optional()
    .isIn(['ERROR', 'WARN', 'INFO', 'DEBUG'])
    .withMessage('Level must be ERROR, WARN, INFO, or DEBUG'),
];

// @desc    Get logs for a specific route
// @route   GET /api/logs
// @access  Public
router.get('/', logQueryValidation, async (req, res) => {
  try {
    const { route = 'access', date, limit = 100, level } = req.query;

    // Get logs for the specified route and date
    let logs = logger.getLogs(route, date);

    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // Apply limit
    logs = logs.slice(-parseInt(limit));

    res.json({
      success: true,
      data: {
        logs,
        meta: {
          route,
          date: date || logger.getCurrentDate(),
          total: logs.length,
          level: level || 'all'
        }
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @desc    Get recent logs for all routes
// @route   GET /api/logs/recent
// @access  Public
router.get('/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const routes = ['users', 'orders', 'health', 'errors', 'access'];
    const allLogs = [];

    // Get recent logs from all routes
    routes.forEach(route => {
      const routeLogs = logger.getRecentLogs(route, parseInt(limit));
      allLogs.push(...routeLogs.map(log => ({ ...log, route })));
    });

    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit to combined logs
    const limitedLogs = allLogs.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: limitedLogs,
        meta: {
          total: limitedLogs.length,
          routes: routes
        }
      }
    });
  } catch (error) {
    console.error('Get recent logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @desc    Clear old logs
// @route   DELETE /api/logs/clear
// @access  Public
router.delete('/clear', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Clear old logs
    logger.clearOldLogs(parseInt(days));

    res.json({
      success: true,
      message: `Cleared logs older than ${days} days`,
      data: {
        daysCleared: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @desc    Get log statistics
// @route   GET /api/logs/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const routes = ['users', 'orders', 'health', 'errors', 'access'];
    const stats = {};

    // Get stats for each route
    routes.forEach(route => {
      const logs = logger.getLogs(route, date);
      const levelCounts = {
        ERROR: 0,
        WARN: 0,
        INFO: 0,
        DEBUG: 0
      };

      logs.forEach(log => {
        if (levelCounts.hasOwnProperty(log.level)) {
          levelCounts[log.level]++;
        }
      });

      stats[route] = {
        total: logs.length,
        levels: levelCounts
      };
    });

    res.json({
      success: true,
      data: {
        stats,
        date: date || logger.getCurrentDate()
      }
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router; 