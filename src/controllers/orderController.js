const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { 
      uid, 
      type, 
      cryptocurrency, 
      amount, 
      price, 
      paymentMethods, 
      additionalInfo = '',
      minLimit,
      maxLimit
    } = req.body;

    // Validate user exists by Google UID
    const user = await User.findByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate total value
    const totalValue = amount * price;

    // Prepare order data
    const orderData = {
      uid: user.uid,
      type,
      cryptocurrency,
      amount,
      price,
      totalValue,
      paymentMethods,
      additionalInfo,
    };

    // Add order limits only if provided
    if (minLimit !== undefined && minLimit !== null && minLimit !== '') {
      orderData.minOrderLimit = parseFloat(minLimit);
    }
    if (maxLimit !== undefined && maxLimit !== null && maxLimit !== '') {
      orderData.maxOrderLimit = parseFloat(maxLimit);
    }

    // Create order
    const order = await Order.createOrder(orderData);

    res.status(201).json({
      success: true,
      message: `${type.toUpperCase()} order created successfully`,
      data: {
        order: order.getPublicOrder(),
      },
    });

    // Log order creation
    logger.logOrderAction('order_created', order._id, uid, {
      type,
      cryptocurrency,
      amount,
      price,
      totalValue,
      paymentMethods
    });
  } catch (error) {
    console.error('Create order error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Public
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { type, status, cryptocurrency } = req.query;

    let query = { isActive: true };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (cryptocurrency) query.cryptocurrency = cryptocurrency;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    // Log orders retrieval
    logger.logOrderAction('get_orders', 'system', 'system', {
      page,
      limit,
      total,
      filters: { type, status, cryptocurrency }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders/user/:uid
// @access  Public
const getUserOrders = async (req, res) => {
  try {
    const { uid } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { type, status } = req.query;

    // Validate user exists by Google UID
    const user = await User.findByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const orders = await Order.findUserOrders(user.uid, {
      type,
      status,
      limit,
      page,
    });

    const total = await Order.countDocuments({ uid: user.uid });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    // Log user orders retrieval
    logger.logOrderAction('get_user_orders', 'system', uid, {
      page,
      limit,
      total,
      filters: { type, status }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: {
        order: order.getPublicOrder(),
      },
    });

    // Log order retrieval
    logger.logOrderAction('get_order_by_id', order._id, order.uid, {
      orderId: req.params.id
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Public
const updateOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { 
      amount, 
      price, 
      paymentMethods, 
      status, 
      additionalInfo,
      minLimit,
      maxLimit
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update fields
    if (amount !== undefined) order.amount = amount;
    if (price !== undefined) order.price = price;
    if (status !== undefined) order.status = status;
    if (additionalInfo !== undefined) order.additionalInfo = additionalInfo;
    
    if (paymentMethods !== undefined) order.paymentMethods = paymentMethods;
    
    // Update order limits only if provided
    if (minLimit !== undefined) order.minOrderLimit = parseFloat(minLimit);
    if (maxLimit !== undefined) order.maxOrderLimit = parseFloat(maxLimit);

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: {
        order: order.getPublicOrder(),
      },
    });

    // Log order update
    logger.logOrderAction('order_updated', order._id, order.uid, {
      orderId: req.params.id,
      updatedFields: { amount, price, paymentMethods, status, additionalInfo }
    });
  } catch (error) {
    console.error('Update order error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Public
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });

    // Log order deletion
    logger.logOrderAction('order_deleted', order._id, order.uid, {
      orderId: req.params.id,
      type: order.type,
      cryptocurrency: order.cryptocurrency
    });
  } catch (error) {
    console.error('Delete order error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Public
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ isActive: true });
    const buyOrders = await Order.countDocuments({ type: 'buy', isActive: true });
    const sellOrders = await Order.countDocuments({ type: 'sell', isActive: true });
    const pendingOrders = await Order.countDocuments({ status: 'pending', isActive: true });
    const activeOrders = await Order.countDocuments({ status: 'active', isActive: true });
    const completedOrders = await Order.countDocuments({ status: 'completed', isActive: true });

    res.json({
      success: true,
      data: {
        totalOrders,
        buyOrders,
        sellOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
      },
    });

    // Log order stats retrieval
    logger.logOrderAction('get_order_stats', 'system', 'system', {
      totalOrders,
      buyOrders,
      sellOrders,
      pendingOrders,
      activeOrders,
      completedOrders
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    logger.logError('orders', error, req);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderStats,
}; 