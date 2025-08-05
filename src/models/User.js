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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for display name (fallback to email if displayName not set)
userSchema.virtual('displayNameFallback').get(function() {
  return this.displayName || this.email;
});

// Index for better query performance
userSchema.index({ createdAt: -1 });

// Static method to create or update user from Google auth
userSchema.statics.findOrCreateFromGoogle = async function(googleUser) {
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
        isActive: true, // Set to true on login
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
userSchema.statics.findByUid = function(uid) {
  return this.findOne({ uid });
};



// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 