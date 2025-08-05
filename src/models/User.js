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
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.email;
});

// Index for better query performance
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1 });
userSchema.index({ uid: 1 });

// Static method to create or update user from Google auth
userSchema.statics.findOrCreateFromGoogle = async function(googleUser) {
  const { uid, email } = googleUser;
  
  let user = await this.findOne({ uid });
  
  if (!user) {
    // Create new user
    user = new this({
      uid,
      email,
    });
    
    await user.save();
  } else {
    // Update last login
    user.lastLogin = new Date();
    await user.save();
  }
  
  return user;
};

// Static method to find user by UID
userSchema.statics.findByUid = function(uid) {
  return this.findOne({ uid });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 