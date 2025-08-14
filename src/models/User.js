const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'User UID is required'],
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    index: true,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters'],
  },
  photoURL: {
    type: String,
    trim: true,
    maxlength: [500, 'Photo URL cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  wallet: {
    ethereum: {
      walletId: {
        type: String,
        trim: true,
        index: true,
      },
      walletAddress: {
        type: String,
        trim: true,
        index: true,
      },
    },
    polygon: {
      walletId: {
        type: String,
        trim: true,
        index: true,
      },
      walletAddress: {
        type: String,
        trim: true,
        index: true,
      },
    },
    arbitrum: {
      walletId: {
        type: String,
        trim: true,
        index: true,
      },
      walletAddress: {
        type: String,
        trim: true,
        index: true,
      },
    }
  },
  // Default chain preference (can be overridden per user)
  defaultChain: {
    type: String,
    enum: ['ethereum', 'polygon', 'arbitrum'],
    default: 'ethereum',
    index: true,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for display name (fallback to email if displayName not set)
userSchema.virtual('displayNameFallback').get(function () {
  return this.displayName || this.email;
});

// Virtual for total orders count
userSchema.virtual('totalOrders', {
  ref: 'Order',
  localField: 'uid',
  foreignField: 'uid',
  count: true,
  justOne: false
});

// Index for better query performance
userSchema.index({ createdAt: -1 });

// Static method to create or update user from Google auth
userSchema.statics.findOrCreateFromGoogle = async function (googleUser) {
  const { uid, email, displayName, photoURL } = googleUser;

  // Use findOneAndUpdate with upsert to handle race conditions
  const user = await this.findOneAndUpdate(
    { uid },
    {
      $set: {
        email,
        displayName,
        photoURL,
        lastLogin: new Date(),
        isActive: true, 
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return user;
};

// Static method to find user by UID
userSchema.statics.findByUid = function (uid) {
  return this.findOne({ uid });
};

/**
 * Instance method
 */
// Instance method to get public profile
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  return userObject;
};

// Instance method to get total orders count
userSchema.methods.getTotalOrders = async function () {
  const Order = mongoose.model('Order');
  return await Order.countDocuments({ uid: this.uid });
};

// Instance method to check if user has a wallet for a specific chain
userSchema.methods.hasWallet = function (chain = 'ethereum') {
  return !!(this.wallet?.[chain]?.walletId && this.wallet?.[chain]?.walletAddress);
};

// Instance method to check if user has any wallet
userSchema.methods.hasAnyWallet = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  return supportedChains.some(chain => this.hasWallet(chain));
};

// Instance method to get wallet info for a specific chain
userSchema.methods.getWalletInfo = function (chain = 'ethereum') {
  if (this.hasWallet(chain)) {
    return {
      walletId: this.wallet[chain].walletId,
      walletAddress: this.wallet[chain].walletAddress,
      blockchain: chain
    };
  }
  return null;
};

// Instance method to get default wallet info
userSchema.methods.getDefaultWalletInfo = function () {
  return this.getWalletInfo(this.defaultChain);
};

// Instance method to set wallet info for a specific chain
userSchema.methods.setWalletInfo = function (walletId, walletAddress, chain = 'ethereum') {
  if (!this.wallet) {
    this.wallet = {};
  }
  if (!this.wallet[chain]) {
    this.wallet[chain] = {};
  }
  this.wallet[chain].walletId = walletId;
  this.wallet[chain].walletAddress = walletAddress;
  return this;
};

// Instance method to get all wallet info
userSchema.methods.getAllWalletInfo = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  const wallets = {};

  supportedChains.forEach(chain => {
    if (this.hasWallet(chain)) {
      wallets[chain] = this.getWalletInfo(chain);
    }
  });

  return wallets;
};

// Instance method to set default chain
userSchema.methods.setDefaultChain = function (chain) {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  if (supportedChains.includes(chain)) {
    this.defaultChain = chain;
  }
  return this;
};

// Instance method to get wallet count
userSchema.methods.getWalletCount = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  return supportedChains.filter(chain => this.hasWallet(chain)).length;
};

// Instance method to get missing wallets
userSchema.methods.getMissingWallets = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  return supportedChains.filter(chain => !this.hasWallet(chain));
};

// Instance method to check if user has all wallets
userSchema.methods.hasAllWallets = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  return supportedChains.every(chain => this.hasWallet(chain));
};

// Instance method to get wallet summary
userSchema.methods.getWalletSummary = function () {
  const supportedChains = ['ethereum', 'polygon', 'arbitrum'];
  const summary = {
    total: supportedChains.length,
    owned: 0,
    missing: 0,
    chains: {}
  };

  supportedChains.forEach(chain => {
    const hasWallet = this.hasWallet(chain);
    summary.chains[chain] = {
      hasWallet,
      walletInfo: hasWallet ? this.getWalletInfo(chain) : null
    };
    if (hasWallet) {
      summary.owned++;
    } else {
      summary.missing++;
    }
  });

  return summary;
};

// Instance method to create missing wallets (for bulk operations)
userSchema.methods.createMissingWallets = async function () {
  const missingChains = this.getMissingWallets();
  const createdWallets = [];

  for (const chain of missingChains) {
    try {
      // This would typically call the Circle API
      // For now, we'll just mark it as a placeholder
      createdWallets.push({
        chain,
        status: 'pending',
        message: `Wallet creation for ${chain} initiated`
      });
    } catch (error) {
      createdWallets.push({
        chain,
        status: 'error',
        message: `Failed to create wallet for ${chain}`
      });
    }
  }

  return createdWallets;
};

module.exports = mongoose.model('User', userSchema);