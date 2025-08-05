const express = require('express');
const { body, query } = require('express-validator');
const {
  getUsers,
  getUserById,
  getUserByUid,
  createOrUpdateGoogleUser,
  updateUser,
  deleteUser,
  searchUsers,
} = require('../controllers/userController');

const router = express.Router();

// Validation middleware
const googleUserValidation = [
  body('uid')
    .notEmpty()
    .withMessage('UID is required'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
];

const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
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

const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  ...paginationValidation,
];

// Routes
router.get('/', paginationValidation, getUsers);
router.post('/google', googleUserValidation, createOrUpdateGoogleUser);
router.get('/uid/:uid', getUserByUid);
router.get('/search', searchValidation, searchUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);

module.exports = router; 