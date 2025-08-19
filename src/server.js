const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { requestLogger, errorLogger } = require('./middleware/logger');

// Import routes
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const healthRoutes = require('./routes/health');
const logRoutes = require('./routes/logs');
const transferRoutes = require('./routes/transfers');

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'P2P Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/transfers', transferRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorLogger);
app.use(errorHandler);

// Start server (only for local development)
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 