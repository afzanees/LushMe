// middlewares/userHeaderData.js
const Cart = require("../models/cartSchema");
const User = require("../models/userSchema");

module.exports = async (req, res, next) => {
  try {
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    if (!req.session.user) {
      return next();
    }

    const userId = req.session.user._id || req.session.user;

    // CART COUNT - using userId field from cartSchema
    const cart = await Cart.findOne({ userId: userId });
    if (cart && cart.items && cart.items.length > 0) {
      res.locals.cartCount = cart.items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
    }

    // WISHLIST COUNT - from User schema with populated products
    const user = await User.findById(userId).select('wishlist').populate('wishlist');
    if (user && user.wishlist && Array.isArray(user.wishlist)) {
      // Filter out null/undefined/deleted products
      const validWishlist = user.wishlist.filter(item => item != null && item._id);
      res.locals.wishlistCount = validWishlist.length;
      
      // Auto-clean invalid products from database
      if (validWishlist.length !== user.wishlist.length) {
        user.wishlist = validWishlist.map(item => item._id);
        await user.save().catch(err => console.log('Failed to clean wishlist:', err));
      }
    }

    next();
  } catch (err) {
    console.log("Header middleware error:", err);
    next();
  }
};