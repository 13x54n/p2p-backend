const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  // Transfer details
  senderId: {
    type: String,
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['email', 'uid', 'wallet'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  token: {
    type: String,
    required: true
  },
  memo: {
    type: String,
    maxlength: 500
  },
  securityCode: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 6
  },

  // Transfer status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Blockchain details
  transactionHash: {
    type: String,
    sparse: true
  },
  blockchain: {
    type: String,
    required: true
  },
  gasUsed: {
    type: Number
  },
  gasPrice: {
    type: Number
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },

  // Error details
  errorMessage: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transferSchema.index({ senderId: 1, createdAt: -1 });
transferSchema.index({ recipient: 1, createdAt: -1 });
transferSchema.index({ status: 1, createdAt: -1 });
transferSchema.index({ token: 1, createdAt: -1 });

// Pre-save middleware to update updatedAt
transferSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for transfer value in USD (if price data available)
transferSchema.virtual('valueUSD').get(function() {
  // TODO: Implement price conversion logic
  return null;
});

// Method to mark transfer as completed
transferSchema.methods.markCompleted = function(transactionHash) {
  this.status = 'completed';
  this.transactionHash = transactionHash;
  this.completedAt = new Date();
  return this.save();
};

// Method to mark transfer as failed
transferSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Static method to get user's transfer history
transferSchema.statics.getUserTransfers = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ senderId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-securityCode'); // Don't return security code
};

// Static method to get transfer statistics
transferSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { senderId: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

const Transfer = mongoose.model('Transfer', transferSchema);

module.exports = Transfer;
