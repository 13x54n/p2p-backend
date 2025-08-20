const logger = require('../utils/logger');
const SecurityCode = require('../models/SecurityCode');
const User = require('../models/User');
const Transfer = require('../models/Transfer');
const { generateSecurityCode, sendSecurityCodeEmail } = require('../utils/emailService');
const circleService = require('../utils/circleService');
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
    const { recipient, recipientType, amount, token, memo, senderId, blockchain } = req.body;

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
      token: token,
      blockchain: blockchain || 'ETH'
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
      blockchain: blockchain || 'ETH', // Store blockchain from frontend
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
    const { recipient, recipientType, amount, token, memo, securityCode, transferId, senderId, blockchain } = req.body;

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
      transferId: transferId,
      blockchain: selectedBlockchain
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

    // Validate user has sufficient balance (this would check against Circle API)
    // For now, we'll proceed with the transfer and let Circle handle balance validation

    // Use blockchain from frontend request, fallback to user's default chain
    const selectedBlockchain = blockchain || senderUser.defaultChain || 'ETH-SEPOLIA';

    // Get sender's wallet info for the selected blockchain
    const senderWalletInfo = senderUser.getWalletInfo(selectedBlockchain);
    if (!senderWalletInfo) {
      return res.status(400).json({
        success: false,
        message: `Sender does not have a wallet configured for ${selectedBlockchain}`,
        data: null
      });
    }

    // Get destination address based on recipient type
    let destinationAddress;
    if (recipientType === 'internal') {
      // For internal users, get their wallet address
      const recipientUser = await findUserByIdentifier(recipient); // Re-find recipientUser here
      if (!recipientUser) {
        return res.status(400).json({
          success: false,
          message: `Recipient not found for internal transfer`,
          data: null
        });
      }
      const recipientWalletInfo = recipientUser.getWalletInfo(selectedBlockchain);
      if (!recipientWalletInfo) {
        return res.status(400).json({
          success: false,
          message: `Recipient does not have a wallet configured for ${selectedBlockchain}`,
          data: null
        });
      }
      destinationAddress = recipientWalletInfo.walletAddress;
    } else {
      // For external wallets, use the provided address directly
      destinationAddress = recipient;
    }

    // Get Circle token ID for the specified token
    const tokenId = circleService.getTokenId(token, selectedBlockchain);
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: `Token ${token} is not supported on ${selectedBlockchain}`,
        data: null
      });
    }

    // Create transfer record in database
    const transfer = new Transfer({
      senderId: senderUser.uid,
      recipient: destinationAddress,
      recipientType,
      recipientUserId: recipientType === 'internal' ? recipientUser.uid : null,
      amount: parseFloat(amount),
      token,
      memo,
      securityCode,
      blockchain: selectedBlockchain,
      status: 'pending'
    });

    await transfer.save();

    // Check if Circle service is available
    if (!circleService.isAvailable()) {
      // Mark transfer as failed if Circle service is not available
      await transfer.markAsFailed('Circle API service not available');

      return res.status(503).json({
        success: false,
        message: 'Blockchain service temporarily unavailable. Please try again later.',
        data: {
          transferId: transfer._id,
          status: 'failed',
          error: 'Circle API service not available'
        }
      });
    }

    try {
      // Mark transfer as processing
      await transfer.markAsProcessing();

      // Create Circle transaction
      const circleResponse = await circleService.createTransaction({
        senderWalletId: senderWalletInfo.walletId,
        destinationAddress,
        tokenId,
        amount: amount.toString(),
        feeLevel: 'MEDIUM' // Could be configurable per user
      });

      if (circleResponse.success) {
        // Update transfer with Circle transaction details
        transfer.circleTransactionId = circleResponse.transactionId;
        transfer.circleTransactionStatus = 'pending';
        await transfer.save();

        // Mark transfer as completed (Circle will handle the actual blockchain transaction)
        await transfer.markAsCompleted(
          circleResponse.transactionId,
          circleResponse.data?.transactionHash || null
        );

        logger.info('Transfer completed successfully', {
          transferId: transfer._id,
          circleTransactionId: circleResponse.transactionId,
          userId: senderUser.uid,
          recipient: destinationAddress,
          amount,
          token
        });

        // TODO: Send confirmation email to sender and recipient (if internal)
        // await sendTransferConfirmationEmail(senderUser, recipientUser, transfer);

        res.status(200).json({
          success: true,
          message: 'Transfer completed successfully',
          data: {
            transferId: transfer._id,
            circleTransactionId: circleResponse.transactionId,
            status: 'completed',
            transactionHash: circleResponse.data?.transactionHash,
            blockchain,
            amount,
            token
          }
        });

      } else {
        // Circle transaction failed
        await transfer.markAsFailed(circleResponse.error);

        logger.error('Circle transaction failed', {
          transferId: transfer._id,
          error: circleResponse.error,
          userId: senderUser.uid
        });

        res.status(400).json({
          success: false,
          message: `Transfer failed: ${circleResponse.error}`,
          data: {
            transferId: transfer._id,
            status: 'failed',
            error: circleResponse.error
          }
        });
      }

    } catch (error) {
      // Handle any unexpected errors during Circle API call
      await transfer.markAsFailed(error.message);

      logger.error('Unexpected error during transfer', {
        transferId: transfer._id,
        error: error.message,
        userId: senderUser.uid,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Transfer failed due to an unexpected error',
        data: {
          transferId: transfer._id,
          status: 'failed',
          error: error.message
        }
      });
    }

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

    // Get user's transfers from database
    const transfers = await Transfer.findByUserId(user.uid);

    // Remove sensitive information before sending to client
    const sanitizedTransfers = transfers.map(transfer => ({
      id: transfer._id,
      senderId: transfer.senderId,
      recipient: transfer.recipient,
      recipientType: transfer.recipientType,
      amount: transfer.amount,
      token: transfer.token,
      memo: transfer.memo,
      status: transfer.status,
      blockchain: transfer.blockchain,
      circleTransactionStatus: transfer.circleTransactionStatus,
      transactionHash: transfer.transactionHash,
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,
      errorMessage: transfer.errorMessage
    }));

    res.status(200).json({
      success: true,
      message: 'User transfers retrieved successfully',
      data: {
        transfers: sanitizedTransfers,
        total: sanitizedTransfers.length
      }
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

    // Find transfer by ID
    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
        data: null
      });
    }

    // Check if user has access to this transfer (sender or recipient)
    if (transfer.senderId !== user.uid && transfer.recipientUserId !== user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer',
        data: null
      });
    }

    // Remove sensitive information before sending to client
    const sanitizedTransfer = {
      id: transfer._id,
      senderId: transfer.senderId,
      recipient: transfer.recipient,
      recipientType: transfer.recipientType,
      amount: transfer.amount,
      token: transfer.token,
      memo: transfer.memo,
      status: transfer.status,
      blockchain: transfer.blockchain,
      circleTransactionId: transfer.circleTransactionId,
      circleTransactionStatus: transfer.circleTransactionStatus,
      transactionHash: transfer.transactionHash,
      gasUsed: transfer.gasUsed,
      gasPrice: transfer.gasPrice,
      feeAmount: transfer.feeAmount,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      completedAt: transfer.completedAt,
      errorMessage: transfer.errorMessage
    };

    res.status(200).json({
      success: true,
      message: 'Transfer details retrieved successfully',
      data: sanitizedTransfer
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

    // Find transfer by ID
    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
        data: null
      });
    }

    // Check if user has access to this transfer (sender or recipient)
    if (transfer.senderId !== user.uid && transfer.recipientUserId !== user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer',
        data: null
      });
    }

    // If transfer has a Circle transaction ID, get latest status from Circle API
    let circleStatus = null;
    if (transfer.circleTransactionId && circleService.isAvailable()) {
      try {
        const circleResponse = await circleService.getTransactionStatus(transfer.circleTransactionId);
        if (circleResponse.success) {
          circleStatus = circleResponse.data;

          // Update local transfer status if Circle status has changed
          if (circleResponse.status !== transfer.circleTransactionStatus) {
            await transfer.updateCircleStatus(circleResponse.status);
          }
        }
      } catch (error) {
        logger.warn('Failed to get Circle transaction status', {
          transferId: id,
          circleTransactionId: transfer.circleTransactionId,
          error: error.message
        });
      }
    }

    // Return transfer status
    const statusData = {
      id: transfer._id,
      status: transfer.status,
      blockchain: transfer.blockchain,
      circleTransactionId: transfer.circleTransactionId,
      circleTransactionStatus: transfer.circleTransactionStatus,
      transactionHash: transfer.transactionHash,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      completedAt: transfer.completedAt,
      errorMessage: transfer.errorMessage
    };

    // Include Circle status if available
    if (circleStatus) {
      statusData.circleStatus = circleStatus;
    }

    res.status(200).json({
      success: true,
      message: 'Transfer status retrieved successfully',
      data: statusData
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
