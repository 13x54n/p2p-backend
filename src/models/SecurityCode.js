const mongoose = require('mongoose');

const securityCodeSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Transfer details
  transferId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Security code
  code: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 6
  },
  
  // Code status
  isUsed: {
    type: Boolean,
    default: false
  },
  
  // Expiration and cooldown
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  

  
  // Transfer details for email
  recipient: {
    type: String,
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  token: {
    type: String,
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  usedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
securityCodeSchema.index({ userId: 1, createdAt: -1 });
securityCodeSchema.index({ transferId: 1 }, { unique: true });
securityCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to set expiration
securityCodeSchema.pre('save', function(next) {
  if (this.isNew) {
    // Code expires in 5 minutes
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  }
  next();
});

// Method to check if code is expired
securityCodeSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};



// Method to mark code as used
securityCodeSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  this.usedAt = new Date();
  return this.save();
};



// Static method to get valid code for transfer
securityCodeSchema.statics.getValidCode = async function(transferId) {
  return this.findOne({
    transferId: transferId,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to cleanup expired codes
securityCodeSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount;
};

const SecurityCode = mongoose.model('SecurityCode', securityCodeSchema);

module.exports = SecurityCode;
