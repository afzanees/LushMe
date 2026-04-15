// const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Coupon = require("../../models/couponSchema");
const mongodb = require("mongodb");
const errorHandler = require('../../middlewares/errorhandling');

const getEffectiveOffer = (product, categoryDoc) => {
  const productOffer = Number(product?.productOffer || 0);
  const categoryOffer = Number(categoryDoc?.categoryOffer || 0);
  const subcategoryOffer = Number(
    categoryDoc?.subcategories?.find(
      sc => sc?._id?.toString() === product?.subcategory?.toString()
    )?.offer || 0
  );

  return Math.max(productOffer, categoryOffer, subcategoryOffer);
};

const getEffectiveVariantPrice = (product, variantIndex, categoryDoc) => {
  const variant = product?.variants?.[variantIndex];
  if (!variant) return 0;

  const offer = getEffectiveOffer(product, categoryDoc);
  const baseSalePrice = Number(variant.salePrice || 0);
  const discounted = baseSalePrice * (1 - offer / 100);
  return Math.round(discounted);
};

//Add to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user;
    if (!userId) {
      console.log('User not logged in - sending 401');
      return res.status(401).json({ status: false, message: 'User not logged in' });
    }
    const { productId, variantIndex, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    if (!productId || variantIndex === undefined || !qty) 
        {
      return res.json({ status: false, message: 'Product, variant and quantity are required' });
    }

    const product = await Product.findById(productId).populate('category').lean();
    if (!product) {
      return res.json({ status: false, message: 'Product not found' });
    }
    
    if (product.isBlocked) {
      return res.json({ status: false, message: 'This product is currently unavailable.' });
    }

    if (product.status !== 'Available') {
      return res.json({ status: false, message: 'This product is currently out of stock.' });
    }
    const category = await Category.findById(product.category._id || product.category).lean();
    if (!category || !category.isListed) {
    return res.json({ status: false, message: 'This product category is currently unavailable.' });
   }
    const subcategory = category.subcategories.find(sc =>
      sc._id.toString() === product.subcategory.toString() &&
      sc.isListed === true &&
      !sc.isDeleted
    );
    if (!subcategory) {
      return res.json({ status: false, message: 'This product subcategory is currently unavailable.' });
    }
    // const variant = product.variants.find(v => v.color === color);

    const variant = product.variants[variantIndex];
if (!variant) {
  return res.json({
    status: false,
    message: 'Selected variant not available'
  });
}

    if (!variant) {
      return res.json({ status: false, message: 'Selected color is not available' });
    }

    if (variant.quantity < qty) {
      return res.json({ status: false, message: 'Insufficient stock for selected color' });
    }

    // Find user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      // Create new cart with this item
      const effectivePrice = getEffectiveVariantPrice(product, Number(variantIndex), category);

      const newItem = {
        productId: product._id,
        variantIndex: Number(variantIndex),
        quantity: Math.min(qty, 3),
        price: effectivePrice,
        totalPrice: effectivePrice * Math.min(qty, 3),

      };

      cart = new Cart({
        userId,
        items: [newItem]
      });

      await cart.save();
      
      // Update session cartTotal
      req.session.cartTotal = newItem.totalPrice;
      
      return res.json({ status: true, cartLength: 1 });
    }

    // Find existing item index for same product variant
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      item.variantIndex === Number(variantIndex)
    );

    if (itemIndex === -1) {
      // Add new item
      const quantityToAdd = Math.min(qty, 3);
      const effectivePrice = getEffectiveVariantPrice(product, Number(variantIndex), category);
      cart.items.push({
        productId: product._id,
        variantIndex: Number(variantIndex),
        quantity: quantityToAdd,
        price: effectivePrice,
        totalPrice: effectivePrice * quantityToAdd,
      });
      await cart.save();
      
      // Update session cartTotal
      const grandTotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      req.session.cartTotal = grandTotal;
      
      console.log("cart found",cart)
      return res.json({ status: true, cartLength: cart.items.length });
    } else {
      // Update existing item quantity
      const existingItem = cart.items[itemIndex];
      const newQuantity = existingItem.quantity + qty;

      if (newQuantity > 3) {
        return res.json({ status: false, message: 'Maximum 3 units per product variant allowed' });
      }

      if (newQuantity > variant.quantity) {
        return res.json({ status: false, message: 'Not enough stock available' });
      }

      cart.items[itemIndex].quantity = newQuantity;
      const effectivePrice = getEffectiveVariantPrice(product, Number(variantIndex), category);
      cart.items[itemIndex].price = effectivePrice;
      cart.items[itemIndex].totalPrice = effectivePrice * newQuantity;

      await cart.save();
      
      // Update session cartTotal
      const grandTotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      req.session.cartTotal = grandTotal;
      
      return res.json({ status: true, cartLength: cart.items.length });
    }
  } catch (error) {
    console.error('Error in addToCart:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};


//Load Cart page
const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user;

    if (!userId) return res.redirect('/login');
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: [{ path: 'category' }, { path: 'brand', select: 'name' }]
    });

    const cartData = [];
    let cartChanged = false;

    if (cart && cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        const product = item.productId;
        if (!product) continue;

        const selectedVariant = product.variants?.[item.variantIndex];
        const category = product.category;
        const effectivePrice = getEffectiveVariantPrice(product, item.variantIndex, category);
        const effectiveTotal = effectivePrice * item.quantity;

        if (item.price !== effectivePrice || item.totalPrice !== effectiveTotal) {
          item.price = effectivePrice;
          item.totalPrice = effectiveTotal;
          cartChanged = true;
        }

        const isBlocked = !!product.isBlocked;
        const isCategoryListed = !!category?.isListed;
        const isOutOfStock = !selectedVariant || selectedVariant.quantity <= 0 || product.status !== "Available";
        const exceedsStock = selectedVariant ? item.quantity > selectedVariant.quantity : true;
        const exceedsLimit = item.quantity > 3;

        cartData.push({
          productId: product._id,
          variantIndex: item.variantIndex,
          quantity: item.quantity,
          totalPrice: effectiveTotal,
          productName: product.name,
          color: selectedVariant?.color || 'N/A',
          productPrice: effectivePrice,
          productImage: selectedVariant?.productImage?.[0] || '',
          productStock: selectedVariant?.quantity || 0,
          productStatus: product.status,
          brand: product.brand || null,
          isBlocked,
          isCategoryListed,
          isOutOfStock,
          exceedsStock,
          exceedsLimit
        });
      }
    }

    if (cartChanged) {
      await cart.save();
    }

    // Calculate grand total for cart
    let grandTotal = 0;
    cartData.forEach(item => {
      grandTotal += item.totalPrice;
    });

    console.log("cart data :",cartData)
    
    // Update session cartTotal
    req.session.cartTotal = grandTotal;
    
    // Validate and recalculate applied coupon
    let discount = 0;
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);
      
      if (!coupon || grandTotal < coupon.minimumPrice) {
        // Remove coupon if it's no longer valid
        req.session.appliedCoupon = null;
        req.session.discount = 0;
        req.session.newTotal = null;
      } else {
        // Recalculate discount
        if (coupon.type === "percentage") {
          discount = Math.floor(grandTotal * coupon.offerPrice / 100);
        } else {
          discount = coupon.offerPrice;
        }
        req.session.discount = discount;
        req.session.appliedCoupon.discount = discount;
      }
    }
    
    const totalAfterDiscount = Math.max(grandTotal - discount, 0);
    req.session.newTotal = totalAfterDiscount;
    
    let shippingCharge = 0;
    if (grandTotal > 0 && grandTotal < 500) {
         shippingCharge = 50;
    } else {
     shippingCharge = 0; // free shipping for 500 and above
    }
    const totalPayable = totalAfterDiscount + shippingCharge;
    console.log(totalPayable,shippingCharge)

    res.render('user/cart', {
      user: req.session.user,
      cartItems: cartData,
      grandTotal,
      discount,
      shippingCharge,
      totalPayable,
      appliedCoupon: req.session.appliedCoupon || null
    });

  } catch (error) {
    console.error('Error in getCartPage:', error);
    res.status(500).send('An error occurred while loading the cart');
  }
};

//cart validation 
const validateCartBeforeCheckout = async (req, res, next) => {
  try {
    console.log('🧪 validate-cart HIT');
    console.log('USER:', req.session.user);

    const userId = req.session.user;

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: ['category']
    });

    if (!cart || cart.items.length === 0) {
      return res.json({
        valid: false,
        message: 'Your cart is empty.'
      });
    }

    for (const item of cart.items) {
      const product = item.productId;
      const variantIndex = item.variantIndex;
      const variant =
        product &&
        product.variants &&
        product.variants[variantIndex];

      if (
        !product ||
        product.isBlocked ||
        product.status !== 'Available' ||
        !product.category?.isListed ||
        variantIndex === undefined ||
        !variant ||
        variant.quantity <= 0 ||
        item.quantity > variant.quantity ||
        item.quantity > 3
      ) {
        return res.json({
          valid: false,
          message: `"${product?.name || 'One of the items'}" is unavailable or exceeds limit.`
        });
      }
    }

    return res.json({ valid: true });

  } catch (error) {
    console.error('🔥 validateCartBeforeCheckout ERROR:', error);
    next(error); // ✅ goes to error middleware
  }
}


//Change quantity

const changeQuantity = async (req, res) => {
  try {
    const { productId, variantIndex, count } = req.body;
    const userId = req.session.user?._id || req.session.user;

    if (!productId || variantIndex === undefined || !count) {
      return res.json({ status: false, error: "Missing required fields." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ status: false, error: "Cart not found." });
    }

    const product = await Product.findById(productId).populate('category').lean();
    if (!product) {
      return res.json({ status: false, error: "Product not found." });
    }

    // Check if product is available
    if (product.status !== "Available") {
      return res.json({ status: false, error: "This product is currently out of stock." });
    }

    if (product.isBlocked) {
      return res.json({ status: false, error: "This product is currently unavailable." });
    }

    // ✅ find cart item using variantIndex
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      item.variantIndex === Number(variantIndex)
    );

    if (itemIndex === -1) {
      return res.json({ status: false, error: "Product variant not found in cart." });
    }

    const variant = product.variants[variantIndex];
    if (!variant) {
      return res.json({ status: false, error: "Variant not found." });
    }

    const cartItem = cart.items[itemIndex];
    const newQuantity = cartItem.quantity + Number(count);

    if (newQuantity < 1) {
      return res.json({ status: false, error: "Quantity cannot be less than 1." });
    }

    if (newQuantity > 3) {
      return res.json({ status: false, error: "Maximum 3 units allowed." });
    }

    if (newQuantity > variant.quantity) {
      return res.json({ status: false, error: "Stock limit exceeded." });
    }

    // ✅ update
    cartItem.quantity = newQuantity;
    const effectivePrice = getEffectiveVariantPrice(product, Number(variantIndex), product.category);
    cartItem.price = effectivePrice;
    cartItem.totalPrice = effectivePrice * newQuantity;

    await cart.save();

    const grandTotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    
    // Update session cartTotal so available coupons can be fetched correctly
    req.session.cartTotal = grandTotal;

    let discount = req.session.discount || 0;
    let couponRemoved = false;

if (req.session.appliedCoupon) {

  const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);

  if (!coupon || grandTotal < coupon.minimumPrice) {

    // remove coupon if cart total below minimum
    req.session.appliedCoupon = null;
    req.session.discount = 0;
    req.session.newTotal = null;
    discount = 0;
    couponRemoved = true;

  } else {

    // recalculate discount
    if (coupon.type === "percentage") {
      discount = Math.floor(grandTotal * coupon.offerPrice / 100);
    } else {
      discount = coupon.offerPrice;
    }
    
    // Ensure discount doesn't exceed cart total
    discount = Math.min(discount, grandTotal);

    req.session.discount = discount;
    req.session.appliedCoupon.discount = discount;
  }
}

    // Calculate final total after discount
    const totalAfterDiscount = Math.max(grandTotal - discount, 0);
    req.session.newTotal = totalAfterDiscount;

    const shippingCharge = grandTotal > 0 && grandTotal < 500 ? 50 : 0;
    const finalTotal = totalAfterDiscount + shippingCharge;

    res.json({
      status: true,
      newQuantity,
      unitPrice: effectivePrice,
      itemTotal: cartItem.totalPrice,
      grandTotal,
      discount,
      shippingCharge,
      totalPayable: finalTotal,
      updatedStock: variant.quantity,
      couponRemoved,
      appliedCoupon: req.session.appliedCoupon || null
    });

  } catch (error) {
    console.error("🔥 changeQuantity error:", error);
    res.status(500).json({ status: false, error: "Server error occurred." });
  }
};


//Product delete
const deleteProduct = async (req, res) => {
    try {
      const userId = req.user && req.user._id;
      if (!userId) return res.status(401).json({ status: false, message: 'Not authenticated' });

      // accept from body or query (client may send either)
      const productId = req.body.productId || req.query.productId;
      const variantIndex = req.body.variantIndex ?? req.query.variantIndex;

      if (!productId) return res.status(400).json({ status: false, message: 'productId required' });

      const cart = await Cart.findOne({ userId });
      if (!cart) return res.status(404).json({ status: false, message: "Cart not found" });

      const before = cart.items.length;
      cart.items = cart.items.filter(item =>
        !(item.productId.toString() === productId.toString() && Number(item.variantIndex) === Number(variantIndex))
      );

      await cart.save();
      
      // Update session cartTotal after removing item
      const grandTotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      req.session.cartTotal = grandTotal;
      
      // Remove applied coupon if cart total is below minimum or cart is empty
      if (req.session.appliedCoupon && cart.items.length > 0) {
        const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);
        if (!coupon || grandTotal < coupon.minimumPrice) {
          req.session.appliedCoupon = null;
          req.session.discount = 0;
          req.session.newTotal = grandTotal;
        }
      } else if (cart.items.length === 0) {
        // Clear all coupon-related session data if cart is empty
        req.session.appliedCoupon = null;
        req.session.discount = 0;
        req.session.newTotal = 0;
        req.session.cartTotal = 0;
      }

      return res.json({
        status: true,
        message: "Item removed from cart",
        cartLength: cart.items.length,
        removed: before - cart.items.length
      });
    } catch (err) {
      console.error('removeFromCart error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  };

module.exports = {
  addToCart,
  getCartPage,
  changeQuantity,
  deleteProduct,
  validateCartBeforeCheckout,
};
