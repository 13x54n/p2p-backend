const logger = require('../utils/logger');

/**
 * Validate transfer request data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateTransfer = (req, res, next) => {
  try {
    const { recipient, recipientType, amount, token, memo, securityCode, senderId } = req.body;

    // Check required fields
    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
        data: null
      });
    }

    if (!recipientType || !['internal', 'external'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        message: 'Recipient type must be "internal" or "external"',
        data: null
      });
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient is required',
        data: null
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
        data: null
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        data: null
      });
    }

    if (!securityCode || securityCode.length !== 6 || !/^\d{6}$/.test(securityCode)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-digit security code is required',
        data: null
      });
    }

    // Validate senderId format (email, UID, or wallet address)
    const isValidSenderId = 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderId) || // Email format
      /^[a-zA-Z0-9_-]{3,}$/.test(senderId) || // UID format (more flexible, min 3 chars)
      /^0x[a-fA-F0-9]{40}$/.test(senderId) || // Ethereum wallet address
      /^[a-zA-Z0-9]{26,35}$/.test(senderId) || // Bitcoin-style addresses
      /^[a-zA-Z0-9]{32,44}$/.test(senderId) || // Other crypto addresses
      senderId.length >= 3; // Accept any reasonable length string as fallback

    if (!isValidSenderId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender ID format. Must be email, UID, or wallet address',
        data: null
      });
    }

    // Validate recipient format based on type
    let isValidRecipient = false;
    
    if (recipientType === 'internal') {
      // For internal users, accept email, UID, or wallet address
      isValidRecipient = 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || // Email format
        /^[a-zA-Z0-9_-]{3,}$/.test(recipient) || // UID format (more flexible, min 3 chars)
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum wallet address
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient) || // Other crypto addresses
        recipient.length >= 3; // Accept any reasonable length string as fallback
    } else {
      // For external wallets, only accept valid wallet addresses
      isValidRecipient = 
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum wallet address
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient); // Other crypto addresses
    }

    if (!isValidRecipient) {
      return res.status(400).json({
        success: false,
        message: recipientType === 'internal' 
          ? 'Invalid recipient format for internal user. Must be email, UID, or wallet address'
          : 'Invalid external wallet address format',
        data: null
      });
    }

    // Validate memo length (optional)
    if (memo && memo.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Memo must be less than 500 characters',
        data: null
      });
    }

    // Log validation success
    logger.info('Transfer validation passed', {
      senderId: senderId.substring(0, 10) + '...', // Log partial senderId for privacy
      recipientType,
      recipient: recipient.substring(0, 10) + '...', // Log partial recipient for privacy
      amount,
      token
    });

    next();

  } catch (error) {
    logger.error('Transfer validation error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Validation error',
      data: null
    });
  }
};

/**
 * Validate security code request data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSecurityCodeRequest = (req, res, next) => {
  try {
    const { recipient, recipientType, amount, token, memo, senderId } = req.body;
    console.log('recipient', recipient);

    // Check required fields
    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
        data: null
      });
    }

    if (!recipientType || !['internal', 'external'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        message: 'Recipient type must be "internal" or "external"',
        data: null
      });
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient is required',
        data: null
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
        data: null
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        data: null
      });
    }

    // Validate senderId format (email, UID, or wallet address)
    const isValidSenderId = 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderId) || // Email format
      /^[a-zA-Z0-9_-]{3,}$/.test(senderId) || // UID format (more flexible, min 3 chars)
      /^0x[a-fA-F0-9]{40}$/.test(senderId) || // Ethereum wallet address
      /^[a-zA-Z0-9]{26,35}$/.test(senderId) || // Bitcoin-style addresses
      /^[a-zA-Z0-9]{32,44}$/.test(senderId) || // Other crypto addresses
      senderId.length >= 3; // Accept any reasonable length string as fallback

    if (!isValidSenderId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender ID format. Must be email, UID, or wallet address',
        data: null
      });
    }

    // Validate recipient format based on type
    let isValidRecipient = false;
    
    if (recipientType === 'internal') {
      // For internal users, accept email, UID, or wallet address
      isValidRecipient = 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || // Email format
        /^[a-zA-Z0-9_-]{3,}$/.test(recipient) || // UID format (more flexible, min 3 chars)
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum wallet address
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient) || // Other crypto addresses
        recipient.length >= 3; // Accept any reasonable length string as fallback
    } else {
      // For external wallets, only accept valid wallet addresses
      isValidRecipient = 
        /^0x[a-fA-F0-9]{40}$/.test(recipient) || // Ethereum wallet address
        /^[a-zA-Z0-9]{26,35}$/.test(recipient) || // Bitcoin-style addresses
        /^[a-zA-Z0-9]{32,44}$/.test(recipient); // Other crypto addresses
    }

    if (!isValidRecipient) {
      return res.status(400).json({
        success: false,
        message: recipientType === 'internal' 
          ? 'Invalid recipient format for internal user. Must be email, UID, or wallet address'
          : 'Invalid external wallet address format',
        data: null
      });
    }

    // Validate memo length (optional)
    if (memo && memo.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Memo must be less than 500 characters',
        data: null
      });
    }

    // Log validation success
    logger.info('Security code request validation passed', {
      senderId: senderId.substring(0, 10) + '...', // Log partial senderId for privacy
      recipientType,
      recipient: recipient.substring(0, 10) + '...', // Log partial recipient for privacy
      amount,
      token
    });

    next();

  } catch (error) {
    logger.error('Security code request validation error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Validation error',
      data: null
    });
  }
};

module.exports = {
  validateTransfer,
  validateSecurityCodeRequest
};
