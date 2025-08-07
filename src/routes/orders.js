const express = require('express');
const { body, query } = require('express-validator');
const {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderStats,
} = require('../controllers/orderController');

const router = express.Router();

// Validation middleware
const createOrderValidation = [
  body('uid')
    .notEmpty()
    .withMessage('User UID is required')
    .isString()
    .withMessage('UID must be a string'),
  body('type')
    .isIn(['buy', 'sell'])
    .withMessage('Order type must be either buy or sell'),
  body('cryptocurrency')
    .optional()
    .isIn(['USDT', 'BTC', 'ETH'])
    .withMessage('Cryptocurrency must be USDT, BTC, or ETH'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('paymentMethods')
    .isArray({ min: 1 })
    .withMessage('At least one payment method is required'),
  body('paymentMethods.*')
    .isIn(['Bank Transfer', 'Esewa', 'Khalti', 'Connect IPS', 'Mobile Banking', 'Cash'])
    .withMessage('Invalid payment method'),
  body('additionalInfo')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Additional information cannot exceed 1000 characters'),
  body('minLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum limit must be a non-negative number'),
  body('maxLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum limit must be a non-negative number'),
];

const updateOrderValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('paymentMethods')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one payment method is required'),
  body('paymentMethods.*')
    .optional()
    .isIn(['Bank Transfer', 'Esewa', 'Khalti', 'Connect IPS', 'Mobile Banking', 'Cash'])
    .withMessage('Invalid payment method'),
  body('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('additionalInfo')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Additional information cannot exceed 1000 characters'),
  body('minLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum limit must be a non-negative number'),
  body('maxLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum limit must be a non-negative number'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const filterValidation = [
  query('type')
    .optional()
    .isIn(['buy', 'sell'])
    .withMessage('Type must be either buy or sell'),
  query('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  query('cryptocurrency')
    .optional()
    .isIn(['USDT', 'BTC', 'ETH'])
    .withMessage('Cryptocurrency must be USDT, BTC, or ETH'),
];

// Routes
router.post('/', createOrderValidation, createOrder);
router.get('/', paginationValidation, filterValidation, getOrders);
router.get('/stats', getOrderStats);
router.get('/user/:uid', paginationValidation, filterValidation, getUserOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrderValidation, updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router; 