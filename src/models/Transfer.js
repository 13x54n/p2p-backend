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
    enum: ['internal', 'external'],
    required: true
  },
  recipientUserId: {
    type: String,
    sparse: true,
    index: true
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

  // Circle API details
  circleTransactionId: {
    type: String,
    sparse: true,
    index: true
  },
  circleTransactionStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Blockchain details
  transactionHash: {
    type: String,
    sparse: true
  },
  blockchain: {
    type: String,
    required: true,
    enum: ['ARB', 'ARB-SEPOLIA', 'AVAX', 'AVAX-FUJI', 'BASE', 'BASE-SEPOLIA', 'ETH', 'ETH-SEPOLIA', 'MATIC', 'MATIC-AMOY', 'OP', 'OP-SEPOLIA', 'SOL', 'SOL-DEVNET', 'UNI', 'UNI-SEPOLIA']
  },
  gasUsed: {
    type: Number
  },
  gasPrice: {
    type: Number
  },
  feeAmount: {
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
transferSchema.index({ recipientUserId: 1, createdAt: -1 });
transferSchema.index({ status: 1, createdAt: -1 });
transferSchema.index({ token: 1, createdAt: -1 });
transferSchema.index({ circleTransactionStatus: 1 });

// Pre-save middleware to update updatedAt
transferSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find transfer by ID
transferSchema.statics.findById = function(id) {
  return this.findOne({ _id: id });
};

// Static method to find transfers by user ID
transferSchema.statics.findByUserId = function(userId) {
  return this.find({
    $or: [
      { senderId: userId },
      { recipientUserId: userId }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to find pending transfers
transferSchema.statics.findPending = function() {
  return this.find({ status: 'pending' });
};

// Instance method to mark as processing
transferSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as completed
transferSchema.methods.markAsCompleted = function(circleTransactionId, transactionHash) {
  this.status = 'completed';
  this.circleTransactionId = circleTransactionId;
  this.circleTransactionStatus = 'confirmed';
  this.transactionHash = transactionHash;
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
transferSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to update Circle transaction status
transferSchema.methods.updateCircleStatus = function(status) {
  this.circleTransactionStatus = status;
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Transfer', transferSchema);
