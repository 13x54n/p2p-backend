const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'User UID is required'],
    index: true,
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: [true, 'Order type is required'],
  },
  cryptocurrency: {
    type: String,
    default: 'USDT',
    enum: ['USDT', 'BTC', 'ETH'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  totalValue: {
    type: Number,
    required: [true, 'Total value is required'],
    min: [0, 'Total value must be positive'],
  },
  paymentMethods: {
    type: [String],
    enum: ['Bank Transfer', 'Esewa', 'Khalti', 'Connect IPS', 'Mobile Banking', 'Cash'],
    required: [true, 'At least one payment method is required'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one payment method must be selected'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'active',
  },
  additionalInfo: {
    type: String,
    maxlength: [1000, 'Additional information cannot exceed 1000 characters'],
    default: '',
  },
  minOrderLimit: {
    type: Number,
    min: [0, 'Minimum order limit must be positive'],
    default: null,
  },
  maxOrderLimit: {
    type: Number,
    min: [0, 'Maximum order limit must be positive'],
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for better query performance
orderSchema.index({ uid: 1, createdAt: -1 });
orderSchema.index({ type: 1, status: 1 });
orderSchema.index({ cryptocurrency: 1, status: 1 });

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return `${this.type.toUpperCase()} ${this.amount} ${this.cryptocurrency} at ${this.price}`;
});

// Pre-save middleware to calculate total value
orderSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('price')) {
    this.totalValue = this.amount * this.price;
  }
  next();
});

// Pre-save middleware to validate order limits
orderSchema.pre('save', function(next) {
  if (this.minOrderLimit !== null && this.maxOrderLimit !== null) {
    if (this.maxOrderLimit <= this.minOrderLimit) {
      return next(new Error('Maximum order limit must be greater than minimum order limit'));
    }
  }
  next();
});

// Static method to create order
orderSchema.statics.createOrder = async function(orderData) {
  const order = new this(orderData);
  await order.save();
  return order;
};

// Static method to find user orders
orderSchema.statics.findUserOrders = function(uid, options = {}) {
  const { type, status, limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;
  
  let query = { uid };
  
  if (type) query.type = type;
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Instance method to get public order data
orderSchema.methods.getPublicOrder = function() {
  const orderObject = this.toObject();
  return orderObject;
};

module.exports = mongoose.model('Order', orderSchema); 