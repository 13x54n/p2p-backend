const express = require('express');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
router.get('/', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'unknown',
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      version: '1.0.0',
    };

    res.json({
      success: true,
      message: 'API is running',
      data: healthData,
    });

    // Log health check
    logger.logHealth('healthy', healthData);
  } catch (error) {
    console.error('Health check error:', error);
    logger.logHealth('unhealthy', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
});

module.exports = router; 