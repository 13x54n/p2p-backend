const express = require('express');
const { body, query } = require('express-validator');
const {
  getUsers,
  getUserById,
  getUserByUid,
  createOrUpdateGoogleUser,
  logoutUser,
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
    .withMessage('Please enter a valid email'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters'),
  body('photoURL')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Photo URL cannot exceed 500 characters'),
];

const logoutValidation = [
  body('uid')
    .notEmpty()
    .withMessage('UID is required'),
];

const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
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
router.post('/logout', logoutValidation, logoutUser);
router.get('/uid/:uid', getUserByUid);
router.get('/search', searchValidation, searchUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);

module.exports = router; 