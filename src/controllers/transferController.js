const logger = require('../utils/logger');
const SecurityCode = require('../models/SecurityCode');
const User = require('../models/User');
const { generateSecurityCode, sendSecurityCodeEmail } = require('../utils/emailService');
const { v4: uuidv4 } = require('uuid');

/**
 * Find user by uid, email, or wallet address
 * @param {string} identifier - uid, email, or wallet address
 * @returns {Object|null} User object or null if not found
 */
const findUserByIdentifier = async (identifier) => {
  try {
    if (!identifier) return null;

    // Try to find by uid first
    let user = await User.findByUid(identifier);
    if (user) return user;

    // Try to find by email
    user = await User.findOne({ email: identifier.toLowerCase() });
    if (user) return user;

    // Try to find by wallet address (search across all chains)
    const walletQuery = {
      $or: [
        { 'wallet.ethereum.walletAddress': identifier },
        { 'wallet.polygon.walletAddress': identifier },
        { 'wallet.arbitrum.walletAddress': identifier }
      ]
    };

    user = await User.findOne(walletQuery);
    if (user) return user;

    return null;
  } catch (error) {
    logger.error('Error finding user by identifier', { identifier, error: error.message });
    return null;
  }
};

/**
 * Request security code for transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const requestSecurityCode = async (req, res) => {
  try {
    const { recipient, recipientType, amount, token, memo, senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
        data: null
      });
    }

    // Find sender user
    const senderUser = await findUserByIdentifier(senderId);
    if (!senderUser) {
      return res.status(400).json({
        success: false,
        message: 'Sender not found',
        data: null
      });
    }

    // Validate recipient based on type
    let recipientInfo = {
      type: recipientType,
      address: recipient,
      userId: null
    };

    if (recipientType === 'internal') {
      // For internal transfers, validate that recipient exists
      const recipientUser = await findUserByIdentifier(recipient);
      if (!recipientUser) {
        return res.status(400).json({
          success: false,
          message: 'Internal recipient not found',
          data: null
        });
      }
      recipientInfo.userId = recipientUser.uid;
    } else if (recipientType === 'external') {
      // For external transfers, validate wallet address format
      const isValidWalletAddress =
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum-style addresses
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient); // Other crypto addresses

      if (!isValidWalletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Invalid external wallet address format',
          data: null
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient type. Must be "internal" or "external"',
        data: null
      });
    }

    logger.info('Security code requested', {
      userId: senderUser.uid,
      recipient: recipient,
      amount: amount,
      token: token
    });

    // Generate unique transfer ID
    const transferId = uuidv4();

    // Generate 6-digit security code
    const securityCode = generateSecurityCode();

    // Create security code record
    const newSecurityCode = new SecurityCode({
      userId: senderUser.uid,
      transferId: transferId,
      code: securityCode,
      recipient: recipient,
      amount: amount,
      token: token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    });

    // Save security code to database
    await newSecurityCode.save();

    const emailSent = await sendSecurityCodeEmail(
      senderUser.email,
      securityCode,
      recipient,
      amount,
      token
    );

    if (!emailSent) {
      // Delete the security code if email failed
      await SecurityCode.findByIdAndDelete(newSecurityCode._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send security code email',
        data: null
      });
    }

    logger.info('Security code created and sent successfully', {
      userId: senderUser.uid,
      transferId: transferId,
      recipient: recipient
    });

    res.status(200).json({
      success: true,
      message: 'Security code sent to your email',
      data: {
        transferId: transferId,
        expiresIn: '5 minutes'
      }
    });

  } catch (error) {
    logger.error('Error requesting security code', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

/**
 * Create a new transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createTransfer = async (req, res) => {
  try {
    const { recipient, recipientType, amount, token, memo, securityCode, transferId, senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
        data: null
      });
    }

    // Find sender user
    const senderUser = await findUserByIdentifier(senderId);
    if (!senderUser) {
      return res.status(400).json({
        success: false,
        message: 'Sender not found',
        data: null
      });
    }

    // Validate recipient based on type
    let recipientInfo = {
      type: recipientType,
      address: recipient,
      userId: null
    };

    if (recipientType === 'internal') {
      // For internal transfers, validate that recipient exists
      const recipientUser = await findUserByIdentifier(recipient);
      if (!recipientUser) {
        return res.status(400).json({
          success: false,
          message: 'Internal recipient not found',
          data: null
        });
      }
      recipientInfo.userId = recipientUser.uid;
    } else if (recipientType === 'external') {
      // For external transfers, validate wallet address format
      const isValidWalletAddress =
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum-style addresses
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient); // Other crypto addresses

      if (!isValidWalletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Invalid external wallet address format',
          data: null
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient type. Must be "internal" or "external"',
        data: null
      });
    }

    logger.info('Transfer creation requested', {
      userId: senderUser.uid,
      recipient: recipient,
      amount: amount,
      token: token,
      transferId: transferId
    });

    // Validate security code
    if (!securityCode || !transferId) {
      return res.status(400).json({
        success: false,
        message: 'Security code and transfer ID are required',
        data: null
      });
    }

    // Get and validate security code
    const validSecurityCode = await SecurityCode.getValidCode(transferId);
    if (!validSecurityCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired security code',
        data: null
      });
    }

    // Check if code matches
    if (validSecurityCode.code !== securityCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid security code',
        data: null
      });
    }

    // Check if code belongs to this user
    if (validSecurityCode.userId !== senderUser.uid) {
      return res.status(403).json({
        success: false,
        message: 'Security code does not belong to this user',
        data: null
      });
    }

    // Mark security code as used
    await validSecurityCode.markAsUsed();

    // TODO: Implement actual transfer logic
    // 1. Validate user has sufficient balance
    // 2. Create transfer record in database
    // 3. Update user balances
    // 4. Send confirmation email
    // 5. Return transfer details

    logger.info('Transfer validated successfully', {
      userId: senderUser.uid,
      transferId: transferId,
      recipient: recipient
    });

    res.status(200).json({
      success: false,
      message: 'Transfer creation not yet implemented (security code validated)',
      data: {
        transferId: transferId,
        validated: true
      }
    });

  } catch (error) {
    logger.error('Error creating transfer', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

/**
 * Get user's transfer history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserTransfers = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null
      });
    }

    // Find user
    const user = await findUserByIdentifier(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    logger.info('User transfers requested', { userId: user.uid });

    // TODO: Implement get user transfers logic
    // 1. Query database for user's transfers
    // 2. Apply pagination and filtering
    // 3. Return transfer list

    res.status(501).json({
      success: false,
      message: 'Get user transfers not yet implemented',
      data: null
    });

  } catch (error) {
    logger.error('Error getting user transfers', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

/**
 * Get specific transfer details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null
      });
    }

    // Find user
    const user = await findUserByIdentifier(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    logger.info('Transfer details requested', { userId: user.uid, transferId: id });

    // TODO: Implement get transfer by ID logic
    // 1. Validate transfer ID
    // 2. Check if user has access to this transfer
    // 3. Return transfer details

    res.status(501).json({
      success: false,
      message: 'Get transfer by ID not yet implemented',
      data: null
    });

  } catch (error) {
    logger.error('Error getting transfer by ID', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

/**
 * Get transfer status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null
      });
    }

    // Find user
    const user = await findUserByIdentifier(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    logger.info('Transfer status requested', { userId: user.uid, transferId: id });

    // TODO: Implement get transfer status logic
    // 1. Validate transfer ID
    // 2. Check if user has access to this transfer
    // 3. Return current transfer status

    res.status(501).json({
      success: false,
      message: 'Get transfer status not yet implemented',
      data: null
    });

  } catch (error) {
    logger.error('Error getting transfer status', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  requestSecurityCode,
  createTransfer,
  getUserTransfers,
  getTransferById,
  getTransferStatus
};
