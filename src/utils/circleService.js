const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');
const logger = require('./logger');

class CircleService {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    try {
      const apiKey = process.env.CIRCLE_API_KEY;
      const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

      if (!apiKey || !entitySecret) {
        logger.warn('Circle API credentials not configured. Transfers will not be processed.');
        return;
      }

      this.client = initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
      });

      logger.info('Circle API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Circle API client', { error: error.message });
    }
  }

  /**
   * Create a blockchain transaction
   * @param {Object} params - Transaction parameters
   * @param {string} params.senderWalletId - Sender's Circle wallet ID
   * @param {string} params.destinationAddress - Recipient's wallet address
   * @param {string} params.tokenId - Circle token ID
   * @param {string} params.amount - Amount to transfer
   * @param {string} params.feeLevel - Fee level (LOW, MEDIUM, HIGH)
   * @returns {Object} Transaction response
   */
  async createTransaction(params) {
    try {
      if (!this.client) {
        throw new Error('Circle API client not initialized');
      }

      const { senderWalletId, destinationAddress, tokenId, amount, feeLevel = 'MEDIUM' } = params;

      // Validate required parameters
      if (!senderWalletId || !destinationAddress || !tokenId || !amount) {
        throw new Error('Missing required transaction parameters');
      }

      logger.info('Creating Circle transaction', {
        senderWalletId,
        destinationAddress,
        tokenId,
        amount,
        feeLevel
      });

      const response = await this.client.createTransaction({
        amounts: [amount.toString()],
        destinationAddress,
        tokenId,
        walletId: senderWalletId,
        fee: { type: 'level', config: { feeLevel: feeLevel.toUpperCase() } },
      });

      logger.info('Circle transaction created successfully', {
        transactionId: response.data?.id,
        status: response.data?.status
      });

      return {
        success: true,
        data: response.data,
        transactionId: response.data?.id,
        status: response.data?.status
      };

    } catch (error) {
      logger.error('Failed to create Circle transaction', {
        error: error.message,
        params,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get transaction status
   * @param {string} transactionId - Circle transaction ID
   * @returns {Object} Transaction status
   */
  async getTransactionStatus(transactionId) {
    try {
      if (!this.client) {
        throw new Error('Circle API client not initialized');
      }

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      const response = await this.client.getTransaction({ id: transactionId });
      
      return {
        success: true,
        data: response.data,
        status: response.data?.status
      };

    } catch (error) {
      logger.error('Failed to get transaction status', {
        error: error.message,
        transactionId,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get wallet balance
   * @param {string} walletId - Circle wallet ID
   * @returns {Object} Wallet balance
   */
  async getWalletBalance(walletId) {
    try {
      if (!this.client) {
        throw new Error('Circle API client not initialized');
      }

      if (!walletId) {
        throw new Error('Wallet ID is required');
      }

      const response = await this.client.getWallet({ id: walletId });
      
      return {
        success: true,
        data: response.data,
        balances: response.data?.balances || []
      };

    } catch (error) {
      logger.error('Failed to get wallet balance', {
        error: error.message,
        walletId,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Check if service is available
   * @returns {boolean} Service availability
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Get supported tokens mapping
   * @returns {Object} Token mapping
   */
  getSupportedTokens() {
    // This should be fetched from Circle API or configured
    // For now, returning common token mappings
    return {
      'USDC': '738c8a6d-8896-46d1-b2cb-083600c1c69b', // USDC on Ethereum
      'USDT': '1c7a3670-bdfa-11e3-9c1a-0800200c9a66', // USDT on Ethereum
      'ETH': '2a5c0a8c-8896-46d1-b2cb-083600c1c69b',  // ETH on Ethereum
      // Add more tokens as needed
    };
  }

  /**
   * Get token ID by symbol and chain
   * @param {string} symbol - Token symbol (e.g., 'USDC')
   * @param {string} chain - Blockchain chain (e.g., 'ethereum')
   * @returns {string|null} Token ID or null if not found
   */
  getTokenId(symbol, chain = 'ethereum') {
    const tokens = this.getSupportedTokens();
    const key = `${symbol}_${chain}`.toUpperCase();
    
    // For now, returning the main token ID
    // In production, this should be a proper mapping
    return tokens[symbol] || null;
  }
}

// Create singleton instance
const circleService = new CircleService();

module.exports = circleService;
