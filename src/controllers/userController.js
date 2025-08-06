const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({});

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    // Log user list retrieval
    logger.logUserAction('get_users', 'system', { page, limit, total });
  } catch (error) {
    console.error('Get users error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: user
      },
    });

    // Log user retrieval
    logger.logUserAction('get_user_by_id', user.uid, { userId: req.params.id });
  } catch (error) {
    console.error('Get user by ID error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Create or update user from Google Sign-In
// @route   POST /api/users/google
// @access  Public
const createOrUpdateGoogleUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { uid, email, displayName, photoURL } = req.body;

    // Validate required fields
    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'UID and email are required',
      });
    }

    // Create or update user from Google auth data
    const user = await User.findOrCreateFromGoogle({
      uid,
      email,
      displayName,
      photoURL,
    });

    res.status(200).json({
      success: true,
      message: user.isNew ? 'User created successfully' : 'User updated successfully',
      data: {
        user: user.getPublicProfile(),
      },
    });

    // Log user creation/update
    logger.logUserAction(user.isNew ? 'user_created' : 'user_updated', uid, {
      email,
      displayName,
      isNew: user.isNew
    });
  } catch (error) {
    console.error('Create/Update Google user error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get user by UID
// @route   GET /api/users/uid/:uid
// @access  Public
const getUserByUid = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });

    const totalOrders = await user.getTotalOrders();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const data = {
      ...user.getPublicProfile(),
      totalOrders
    }

    res.json({
      success: true,
      data
    });

    // Log user retrieval by UID
    logger.logUserAction('get_user_by_uid', req.params.uid, { uid: req.params.uid });
  } catch (error) {
    console.error('Get user by UID error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (email !== undefined) user.email = email;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.getPublicProfile(),
      },
    });

    // Log user update
    logger.logUserAction('user_updated', user.uid, {
      userId: req.params.id,
      updatedFields: { email }
    });
  } catch (error) {
    console.error('Update user error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Logout user (set isActive to false)
// @route   POST /api/users/logout
// @access  Public
const logoutUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { uid } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID is required',
      });
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { uid },
      {
        isActive: false,
        lastLogin: new Date() // Update last login time on logout
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User logged out successfully',
      data: {
        user: user.getPublicProfile(),
      },
    });

    // Log user logout
    logger.logUserAction('user_logout', uid, {
      isActive: false,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Logout user error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }



    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });

    // Log user deletion
    logger.logUserAction('user_deleted', user.uid, {
      userId: req.params.id,
      email: user.email
    });
  } catch (error) {
    console.error('Delete user error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const searchRegex = new RegExp(q, 'i');
    const users = await User.find({
      email: searchRegex,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      email: searchRegex,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    // Log user search
    logger.logUserAction('search_users', 'system', {
      query: q,
      page,
      limit,
      total
    });
  } catch (error) {
    console.error('Search users error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserByUid,
  createOrUpdateGoogleUser,
  logoutUser,
  updateUser,
  deleteUser,
  searchUsers,
}; 