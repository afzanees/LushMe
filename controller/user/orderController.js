const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

  
const getCheckoutPage = async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) return res.redirect('/login');
  
      const findUser = await User.findById(userId);
      if (!findUser) return res.redirect('/shop');
  
      const addressData = await Address.findOne({ userId });
  
      const cartData = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [{ path: 'category' }, { path: 'brand' }]
      });
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        return res.redirect('/shop');
      }
      
       //Validate each cart item
    const invalidItem = cartData.items.find(item => {
      const product = item.productId;
      const variant = product.variants.find(v => v.color === item.color);

      return (
        !product ||
        product.isBlocked ||
        !product.category?.isListed ||
        !variant ||
        variant.quantity <= 0 ||
        item.quantity > variant.quantity ||
        item.quantity > 3
      );
    });

    if (invalidItem) {
      req.flash('error', 'Your cart contains invalid or unavailable items. Please update your cart.');
      return res.redirect('/cart');
    }
     //Calculate total
      let totalPrice = 0;
     
      cartData.items.forEach(item => {
        totalPrice += item.totalPrice;
      });
      let shippingCharge = 0;
       if (totalPrice > 0 && totalPrice < 500) {
         shippingCharge = 50;
        } else {
        shippingCharge = 0; 
        }
        const appliedCoupon = req.session.appliedCoupon;
        const discount = appliedCoupon ? appliedCoupon.discount || 0 : 0;
        const totalPayable = (totalPrice + shippingCharge) - discount;
        
        res.render('user/checkout', {
        user: findUser,
        userAddress: addressData,
        cartItems: cartData.items,
        grandTotal: totalPrice.toFixed(2),
        shippingCharge,
        discount,
        totalPayable,
        appliedCoupon,
      });
    } catch (error) {
      console.error(error);
      res.redirect('/pageNotFound');
    }
  };

  const checkoutPage = async (req,res)=>{
    try
    {
        const user=req.session.user
     res.render('check',{user})
    }catch (error){
        res.redirect('/pageNotFound'); 
    }
  }

  // Check stock availability before checkout
  const checkStock = async (req, res) => {
    try {
      const userId = req.session.user;
      
      const cartData = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [{ path: 'category' }, { path: 'brand' }]
      });

      if (!cartData || !cartData.items || cartData.items.length === 0) {
        return res.json({ success: false, message: 'Cart is empty' });
      }

      const items = [];
      let hasBlocked = false;

      for (const item of cartData.items) {
        const product = item.productId;
        const variant = product.variants.find(v => v.color === item.color);

        const isBlocked = !product || product.isBlocked || !product.category?.isListed;
        const isOutOfStock = !variant || variant.quantity <= 0;
        const exceedsStock = variant && item.quantity > variant.quantity;
        const exceedsLimit = item.quantity > 3;

        if (isBlocked) hasBlocked = true;

        items.push({
          name: product.name,
          isBlocked,
          isOutOfStock,
          stockChanged: exceedsStock || exceedsLimit,
          availableStock: variant?.quantity || 0
        });
      }

      res.json({ success: true, items, hasBlocked });
    } catch (error) {
      console.error('Check stock error:', error);
      res.json({ success: false, message: 'Error checking stock' });
    }
  };

  // Place order
  const placeOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const { totalPrice, addressId, payment, discount } = req.body;

      if (!addressId) {
        return res.status(400).json({ success: false, message: 'Address is required' });
      }

      if (!payment) {
        return res.status(400).json({ success: false, message: 'Payment method is required' });
      }

      // Get cart
      const cartData = await Cart.findOne({ userId }).populate('items.productId');
      
      if (!cartData || cartData.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }

      // Get address
      const addressData = await Address.findOne({ userId });
      const selectedAddress = addressData.address.id(addressId);

      if (!selectedAddress) {
        return res.status(400).json({ success: false, message: 'Address not found' });
      }

      // Prepare order items
      const orderedItems = cartData.items.map(item => ({
        product: item.productId._id,
        quantity: item.quantity,
        price: item.price,
        color: item.color
      }));

      // Create order
      const newOrder = new Order({
        userId,
        orderedItems,
        totalPrice: totalPrice,
        discount: discount || 0,
        finalAmount: totalPrice,
        address: selectedAddress,
        paymentMethod: payment,
        status: 'Pending',
        createdOn: new Date()
      });

      await newOrder.save();

      // Update product stock
      for (const item of cartData.items) {
        const product = await Product.findById(item.productId._id);
        const variant = product.variants.find(v => v.color === item.color);
        if (variant) {
          variant.quantity -= item.quantity;
          await product.save();
        }
      }

      // Clear cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      // Handle payment methods
      if (payment === 'cod') {
        return res.json({ 
          success: true, 
          method: 'cod', 
          order: newOrder 
        });
      } else if (payment === 'wallet') {
        const user = await User.findById(userId);
        if (user.wallet >= totalPrice) {
          user.wallet -= totalPrice;
          user.walletTransactions.push({
            amount: totalPrice,
            status: 'debited',
            method: 'order',
            description: `Order #${newOrder._id}`
          });
          await user.save();
          newOrder.status = 'Processing';
          await newOrder.save();
          return res.json({ 
            success: true, 
            method: 'wallet', 
            payment: true,
            order: newOrder 
          });
        } else {
          // Delete order if wallet insufficient
          await Order.findByIdAndDelete(newOrder._id);
          return res.json({ 
            success: false, 
            method: 'wallet', 
            payment: false,
            message: 'Insufficient wallet balance'
          });
        }
      } else if (payment === 'razorpay') {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_ClMWweWS70Dbkd',
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
          amount: Math.round(totalPrice * 100),
          currency: 'INR',
          receipt: `order_${newOrder._id}`
        };

        const razorPayOrder = await razorpay.orders.create(options);
        
        return res.json({ 
          success: true, 
          method: 'razorpay',
          razorPayOrder,
          order: newOrder
        });
      }

    } catch (error) {
      console.error('Place order error:', error);
      res.status(500).json({ success: false, message: 'Error placing order' });
    }
  };

  // Verify Razorpay payment
  const verifyPayment = async (req, res) => {
    try {
      const { payment } = req.body;
      const crypto = require('crypto');

      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${payment.razorpay_order_id}|${payment.razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature === payment.razorpay_signature) {
        return res.json({ status: true, message: 'Payment verified' });
      } else {
        return res.json({ status: false, message: 'Payment verification failed' });
      }
    } catch (error) {
      console.error('Verify payment error:', error);
      res.json({ status: false, message: 'Error verifying payment' });
    }
  };

  // Confirm order after Razorpay payment
  const confirmOrderAfterRazorpay = async (req, res) => {
    try {
      const userId = req.session.user;
      const { addressId, payment, totalPrice, discount } = req.body;

      // Get cart
      const cartData = await Cart.findOne({ userId }).populate('items.productId');
      
      if (!cartData || cartData.items.length === 0) {
        return res.json({ success: false, message: 'Cart is empty' });
      }

      // Get address
      const addressData = await Address.findOne({ userId });
      const selectedAddress = addressData.address.id(addressId);

      // Prepare order items
      const orderedItems = cartData.items.map(item => ({
        product: item.productId._id,
        quantity: item.quantity,
        price: item.price,
        color: item.color
      }));

      // Create order
      const newOrder = new Order({
        userId,
        orderedItems,
        totalPrice: totalPrice,
        discount: discount || 0,
        finalAmount: totalPrice,
        address: selectedAddress,
        paymentMethod: payment,
        status: 'Processing',
        createdOn: new Date()
      });

      await newOrder.save();

      // Update product stock
      for (const item of cartData.items) {
        const product = await Product.findById(item.productId._id);
        const variant = product.variants.find(v => v.color === item.color);
        if (variant) {
          variant.quantity -= item.quantity;
          await product.save();
        }
      }

      // Clear cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      res.json({ success: true, orderId: newOrder._id });
    } catch (error) {
      console.error('Confirm order error:', error);
      res.json({ success: false, message: 'Error confirming order' });
    }
  };
  

  module.exports={
    getCheckoutPage,
    checkStock,
    placeOrder,
    verifyPayment,
    confirmOrderAfterRazorpay
  }