const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');

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
    let user = await User.findOrCreateFromGoogle({
      uid,
      email,
      displayName,
      photoURL,
    });

    // Check if user already has a wallet
    if (!user.hasWallet()) {
      try {
        // Import & Initialize Circle client
        const client = initiateDeveloperControlledWalletsClient({
          apiKey: process.env.CIRCLE_API_KEY,
          entitySecret: process.env.CIRCLE_ENTITY_SECRET
        });

        // Create wallet for the user
        const response = await client.createWallets({
          blockchains: ['ETH-SEPOLIA', 'MATIC-AMOY', 'ARB-SEPOLIA'],
          count: 1,
          accountType: 'SCA',
          walletSetId: 'c11abfbc-7ac5-5bc8-b1bc-b27586fd4ba7'
        });

        // Extract wallet information from response
        // The response contains wallets for all requested blockchains
        const blockchainMapping = {
          'ETH-SEPOLIA': 'ethereum',
          'MATIC-AMOY': 'polygon',
          'ARB-SEPOLIA': 'arbitrum'
        };

        if (response.data && response.data.wallets && response.data.wallets.length > 0) {
          for (const wallet of response.data.wallets) {
            const chain = blockchainMapping[wallet.blockchain];
            if (chain) {
              // Update user with wallet information for this chain
              user.setWalletInfo(wallet.id, wallet.address, chain);

              logger.logUserAction('wallet_created', uid, {
                walletId: wallet.id,
                walletAddress: wallet.address,
                blockchain: chain
              });
            }
          }
        }

        await user.save();
      } catch (walletError) {
        console.error('Wallet creation error:', walletError);
        logger.logError('wallet_creation', walletError, req);
        // Continue with user creation even if wallet creation fails
      }
    }

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

    // Token balances functionality not yet implemented
    // const tokenBalances = await user.tokenBalances();

    const data = {
      ...user.getPublicProfile(),
      totalOrders,
      hasWallet: user.hasAnyWallet(),
      defaultChain: user.defaultChain,
      wallets: user.getAllWalletInfo(),
      walletSummary: user.getWalletSummary(),
      walletCount: user.getWalletCount(),
      hasAllWallets: user.hasAllWallets(),
      missingWallets: user.getMissingWallets()
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

// @desc    Fetch user balance
// @route   GET /api/users/uid/:uid/balance
// @access  Public
const fetchUserBalance = async (req, res) => {
  try {
    const { uid } = req.params;

    // Check if user exists
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has wallet data
    if (!user.wallet || !user.wallet.ethereum?.walletId || !user.wallet.polygon?.walletId || !user.wallet.arbitrum?.walletId) {
      return res.status(400).json({
        success: false,
        message: 'User wallet not configured',
      });
    }

    // Get Circle API key from environment variables
    const circleApiKey = process.env.CIRCLE_API_KEY;
    if (!circleApiKey) {
      logger.logError('users', new Error('Circle API key not configured'), req);
      return res.status(500).json({
        success: false,
        message: 'Service configuration error',
      });
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${circleApiKey}`
      }
    };

    let response = null;
    let ethPrice, maticPrice, arbPrice;
    let ethPriceChange, maticPriceChange, arbPriceChange;
    
    // Check if CoinMarketCap API key is configured
    const cmcApiKey = process.env.CMC_API_KEY;
    if (!cmcApiKey) {
      console.error('CMC_API_KEY not configured. Percentage changes will not be available.');
      throw new Error('CoinMarketCap API key not configured. Please set CMC_API_KEY environment variable.');
    }

    try {
      response = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=ETH,POL,ARB`, {
        method: 'GET',
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
        },
      });

      if (response.ok) {
        const json = await response.json();
        ethPrice = json.data.ETH[0].quote.USD.price;
        ethPriceChange = json.data.ETH[0].quote.USD.percent_change_24h;
        maticPrice = json.data.POL[0].quote.USD.price;
        maticPriceChange = json.data.POL[0].quote.USD.percent_change_24h;
        arbPrice = json.data.ARB[0].quote.USD.price;
        arbPriceChange = json.data.ARB[0].quote.USD.percent_change_24h;
      } else {
        console.error('CoinMarketCap API request failed:', response.status, response.statusText);
        throw new Error(`CoinMarketCap API request failed: ${response.status} ${response.statusText}`);
      }
    } catch (ex) {
      console.error('CoinMarketCap fetch error:', ex);
      throw new Error(`Failed to fetch CoinMarketCap data: ${ex.message}`);
    }

    // Parallel fetch calls for better performance
    const [ethereumResponse, polygonResponse, arbitrumResponse] = await Promise.allSettled([
      fetch(`https://api.circle.com/v1/w3s/wallets/${user.wallet.ethereum.walletId}/balances?includeAll=true`, options)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Ethereum API error: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .catch(err => {
          console.error('Ethereum fetch error:', err);
          throw err;
        }),
      fetch(`https://api.circle.com/v1/w3s/wallets/${user.wallet.polygon.walletId}/balances?includeAll=true`, options)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Polygon API error: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .catch(err => {
          console.error('Polygon fetch error:', err);
          throw err;
        }),
      fetch(`https://api.circle.com/v1/w3s/wallets/${user.wallet.arbitrum.walletId}/balances?includeAll=true`, options)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Arbitrum API error: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .catch(err => {
          console.error('Arbitrum fetch error:', err);
          throw err;
        })
    ]);

    // Process results and handle any failed requests
    const balances = {
      ethereum: ethereumResponse.status === 'fulfilled' ? ethereumResponse.value.data.tokenBalances : { error: 'Failed to fetch Ethereum balance' },
      polygon: polygonResponse.status === 'fulfilled' ? polygonResponse.value.data.tokenBalances : { error: 'Failed to fetch Polygon balance' },
      arbitrum: arbitrumResponse.status === 'fulfilled' ? arbitrumResponse.value.data.tokenBalances : { error: 'Failed to fetch Arbitrum balance' },
      ethPrice: ethPrice,
      ethPriceChange: ethPriceChange,
      maticPrice: maticPrice,
      maticPriceChange: maticPriceChange,
      arbPrice: arbPrice,
      arbPriceChange: arbPriceChange,
    };

    // Inject percentage changes into token data based on symbol (regardless of blockchain)
    const allTokens = [
      ...(balances.ethereum && !balances.ethereum.error ? balances.ethereum : []),
      ...(balances.polygon && !balances.polygon.error ? balances.polygon : []),
      ...(balances.arbitrum && !balances.arbitrum.error ? balances.arbitrum : [])
    ];
    
    allTokens.forEach(token => {
      if (token.token.symbol.includes('ETH') || token.token.symbol.includes('ETH-SEPOLIA')) {
        token.percentChange = ethPriceChange;
      } else if (token.token.symbol.includes('POL') || token.token.symbol.includes('MATIC') || token.token.symbol.includes('POL-AMOY')) {
        token.percentChange = maticPriceChange;
      } else if (token.token.symbol.includes('ARB') || token.token.symbol.includes('ARB-SEPOLIA')) {
        token.percentChange = arbPriceChange;
      } else if (token.token.symbol.includes('USDC') || token.token.symbol.includes('USDT')) {
        token.percentChange = 0; // Stablecoins have 0% change
      } else {
        // For any other tokens, set a default percentage change
        token.percentChange = 0;
      }
    });

    // Log summary of all tokens processed
    // Ensure every token has a percentChange field
    allTokens.forEach(token => {
      if (token.percentChange === undefined) {
        token.percentChange = 0;
      }
    });
 
    // Log successful balance fetch
    logger.logUserAction('fetch_user_balance', uid, {
      userId: uid,
      hasErrors: Object.values(balances).some(balance => balance.error)
    });

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error('Get user balance by UID error:', error);
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

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID is required',
      });
    }

    const user = await User.findOneAndUpdate(
      { uid },
      {
        isActive: false,
        lastLogin: new Date()
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

// @desc    Ensure all users have wallets (create missing ones)
// @route   POST /api/users/ensure-all-wallets
// @access  Public
const ensureAllUsersWallets = async (req, res) => {
  try {
    // Find all users without wallets
    const usersWithoutWallets = await User.find({
      $or: [
        { 'wallet.ethereum.walletId': { $exists: false } },
        { 'wallet.ethereum.walletId': null },
        { 'wallet.ethereum.walletAddress': { $exists: false } },
        { 'wallet.ethereum.walletAddress': null }
      ]
    });

    if (usersWithoutWallets.length === 0) {
      return res.json({
        success: true,
        message: 'All users already have wallets',
        data: {
          processed: 0,
          created: 0,
          failed: 0
        }
      });
    }

    const client = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET
    });

    let created = 0;
    let failed = 0;

    // Process users in batches to avoid overwhelming the API
    for (const user of usersWithoutWallets) {
      try {
        const response = await client.createWallets({
          blockchains: ['ETH-SEPOLIA'], // this could be solana, polygon, arbitrum, etc.
          count: 1,
          accountType: 'SCA',
          walletSetId: 'c11abfbc-7ac5-5bc8-b1bc-b27586fd4ba7'
        });

        if (response.data && response.data.wallets && response.data.wallets.length > 0) {
          const wallet = response.data.wallets[0];

          user.setWalletInfo(wallet.id, wallet.address);
          await user.save();

          created++;
          logger.logUserAction('wallet_created_bulk', user.uid, {
            walletId: wallet.id,
            walletAddress: wallet.address
          });
        } else {
          failed++;
          logger.logError('wallet_creation_bulk', new Error('No wallet data received'), { uid: user.uid });
        }
      } catch (error) {
        failed++;
        logger.logError('wallet_creation_bulk', error, { uid: user.uid });
      }

      // Add a small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Processed ${usersWithoutWallets.length} users`,
      data: {
        processed: usersWithoutWallets.length,
        created,
        failed
      }
    });

  } catch (error) {
    console.error('Ensure all users wallets error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Create wallet for specific chain
// @route   POST /api/users/:uid/create-wallet/:chain
// @access  Public
const createWalletForChain = async (req, res) => {
  try {
    const { uid, chain } = req.params;
    const supportedChains = ['ethereum', 'polygon', 'arbitrum'];

    if (!supportedChains.includes(chain)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported blockchain. Supported chains: ethereum, polygon, arbitrum',
      });
    }

    // Find user by UID
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a wallet for this chain
    if (user.hasWallet(chain)) {
      const walletInfo = user.getWalletInfo(chain);
      return res.json({
        success: true,
        message: `User already has a ${chain} wallet`,
        data: {
          walletId: walletInfo.walletId,
          walletAddress: walletInfo.walletAddress,
          blockchain: chain
        },
      });
    }

    // Map chain names to Circle blockchain identifiers
    const chainMapping = {
      'ethereum': 'ETH-SEPOLIA',
      'polygon': 'MATIC-AMOY',
      'arbitrum': 'ARB-SEPOLIA'
    };

    // Create wallet for the user
    try {
      const client = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET
      });

      const response = await client.createWallets({
        blockchains: [chainMapping[chain]],
        count: 1,
        accountType: 'SCA',
        walletSetId: 'c11abfbc-7ac5-5bc8-b1bc-b27586fd4ba7'
      });

      // Extract wallet information from response
      if (response.data && response.data.wallets && response.data.wallets.length > 0) {
        const wallet = response.data.wallets[0];

        // Update user with wallet information
        user.setWalletInfo(wallet.id, wallet.address, chain);
        await user.save();

        logger.logUserAction('wallet_created_for_chain', uid, {
          walletId: wallet.id,
          walletAddress: wallet.address,
          blockchain: chain
        });

        res.json({
          success: true,
          message: `${chain} wallet created successfully`,
          data: {
            walletId: wallet.id,
            walletAddress: wallet.address,
            blockchain: chain
          },
        });
      } else {
        throw new Error('No wallet data received from Circle API');
      }
    } catch (walletError) {
      console.error('Wallet creation error:', walletError);
      logger.logError('wallet_creation', walletError, req);
      res.status(500).json({
        success: false,
        message: 'Failed to create wallet',
        error: walletError.message,
      });
    }
  } catch (error) {
    console.error('Create wallet for chain error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Ensure user has wallet (create if missing)
// @route   POST /api/users/:uid/ensure-wallet
// @access  Public
const ensureUserWallet = async (req, res) => {
  try {
    const { uid } = req.params;

    // Find user by UID
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a wallet
    if (user.hasWallet()) {
      const walletInfo = user.getWalletInfo();
      return res.json({
        success: true,
        message: 'User already has a wallet',
        data: {
          walletId: walletInfo.walletId,
          walletAddress: walletInfo.walletAddress,
        },
      });
    }

    // Create wallet for the user
    try {
      const client = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET
      });

      const response = await client.createWallets({
        blockchains: ['ETH-SEPOLIA'], // this could be solana, polygon, arbitrum, etc.
        count: 1,
        accountType: 'SCA',
        walletSetId: 'c11abfbc-7ac5-5bc8-b1bc-b27586fd4ba7'
      });

      // Extract wallet information from response
      if (response.data && response.data.wallets && response.data.wallets.length > 0) {
        const wallet = response.data.wallets[0];

        // Update user with wallet information
        user.setWalletInfo(wallet.id, wallet.address);
        await user.save();

        logger.logUserAction('wallet_created', uid, {
          walletId: wallet.id,
          walletAddress: wallet.address
        });

        res.json({
          success: true,
          message: 'Wallet created successfully',
          data: {
            walletId: wallet.id,
            walletAddress: wallet.address,
          },
        });
      } else {
        throw new Error('No wallet data received from Circle API');
      }
    } catch (walletError) {
      console.error('Wallet creation error:', walletError);
      logger.logError('wallet_creation', walletError, req);
      res.status(500).json({
        success: false,
        message: 'Failed to create wallet',
        error: walletError.message,
      });
    }
  } catch (error) {
    console.error('Ensure user wallet error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Create all missing wallets for user
// @route   POST /api/users/:uid/create-all-wallets
// @access  Public
const createAllMissingWallets = async (req, res) => {
  try {
    const { uid } = req.params;

    // Find user by UID
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has all wallets
    if (user.hasAllWallets()) {
      return res.json({
        success: true,
        message: 'User already has all wallets',
        data: {
          walletSummary: user.getWalletSummary(),
          wallets: user.getAllWalletInfo()
        },
      });
    }

    const missingChains = user.getMissingWallets();

    // Map chain names to Circle blockchain identifiers
    const chainMapping = {
      'ethereum': 'ETH-SEPOLIA',
      'polygon': 'MATIC-AMOY',
      'arbitrum': 'ARB-SEPOLIA'
    };

    const client = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET
    });

    let created = 0;
    let failed = 0;
    const results = [];

    // Create wallets for missing chains
    for (const chain of missingChains) {
      try {
        const response = await client.createWallets({
          blockchains: [chainMapping[chain]],
          count: 1,
          accountType: 'SCA',
          walletSetId: 'c11abfbc-7ac5-5bc8-b1bc-b27586fd4ba7'
        });

        if (response.data && response.data.wallets && response.data.wallets.length > 0) {
          const wallet = response.data.wallets[0];

          // Update user with wallet information
          user.setWalletInfo(wallet.id, wallet.address, chain);

          created++;
          results.push({
            chain,
            status: 'success',
            walletId: wallet.id,
            walletAddress: wallet.address
          });

          logger.logUserAction('wallet_created_bulk', uid, {
            walletId: wallet.id,
            walletAddress: wallet.address,
            blockchain: chain
          });
        } else {
          failed++;
          results.push({
            chain,
            status: 'error',
            message: 'No wallet data received'
          });
        }
      } catch (error) {
        failed++;
        results.push({
          chain,
          status: 'error',
          message: error.message
        });
        logger.logError('wallet_creation_bulk', error, { uid, chain });
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await user.save();

    res.json({
      success: true,
      message: `Created ${created} wallets, ${failed} failed`,
      data: {
        created,
        failed,
        results,
        walletSummary: user.getWalletSummary(),
        wallets: user.getAllWalletInfo()
      },
    });

  } catch (error) {
    console.error('Create all missing wallets error:', error);
    logger.logError('users', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Set default chain for user
// @route   PUT /api/users/:uid/default-chain
// @access  Public
const setDefaultChain = async (req, res) => {
  try {
    const { uid } = req.params;
    const { chain } = req.body;
    const supportedChains = ['ethereum', 'polygon', 'arbitrum'];

    if (!chain || !supportedChains.includes(chain)) {
      return res.status(400).json({
        success: false,
        message: 'Valid chain is required. Supported chains: ethereum, polygon, arbitrum',
      });
    }

    // Find user by UID
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Set default chain
    user.setDefaultChain(chain);
    await user.save();

    res.json({
      success: true,
      message: `Default chain set to ${chain}`,
      data: {
        defaultChain: user.defaultChain,
        hasWalletForChain: user.hasWallet(chain)
      },
    });

    // Log default chain change
    logger.logUserAction('default_chain_changed', uid, {
      newDefaultChain: chain,
      hasWalletForChain: user.hasWallet(chain)
    });
  } catch (error) {
    console.error('Set default chain error:', error);
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
  fetchUserBalance,
  createOrUpdateGoogleUser,
  logoutUser,
  updateUser,
  deleteUser,
  searchUsers,
  ensureUserWallet,
  ensureAllUsersWallets,
  createWalletForChain,
  setDefaultChain,
  createAllMissingWallets,
}; 