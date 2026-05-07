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
const crypto = require("crypto");
const env = require("dotenv").config();

// Initialize Razorpay
const Razorpay = require('razorpay');
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

const syncCartOfferPrices = async (cartData) => {
  if (!cartData || !Array.isArray(cartData.items)) return;

  let hasChanges = false;
  for (const item of cartData.items) {
    const product = item.productId;
    const category = product?.category;
    const effectivePrice = getEffectiveVariantPrice(product, item.variantIndex, category);
    const effectiveTotal = effectivePrice * item.quantity;

    if (item.price !== effectivePrice || item.totalPrice !== effectiveTotal) {
      item.price = effectivePrice;
      item.totalPrice = effectiveTotal;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await cartData.save();
  }
};

  
const getCheckoutPage = async (req, res) => {
    try {
      const userId = req.session?.user || (req.user && req.user._id);
      if (!userId) return res.redirect('/sign-in');
  
      const findUser = await User.findById(userId);
      if (!findUser) return res.redirect('/products');
  
      const addressData = await Address.findOne({ userId });
  
      const cartData = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [{ path: 'category' }, { path: 'brand' }]
      });
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        return res.redirect('/products');
      }

      await syncCartOfferPrices(cartData);
      
       //Validate each cart item
    const invalidItem = cartData.items.find(item => {
      const product = item.productId;
      const variant = product.variants && product.variants[item.variantIndex];

      return (
        !product ||
        product.isBlocked ||
        product.status !== 'Available' ||
        !product.category?.isListed ||
        !variant ||
        variant.quantity <= 0 ||
        item.quantity > variant.quantity ||
        item.quantity > 3
      );
    });

    if (invalidItem) {
      req.flash('error', 'Your cart contains invalid or unavailable items. Please update your cart.');
      return res.redirect('/my-cart');
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
        
        // Validate applied coupon before checkout
        let discount = 0;
        let appliedCoupon = req.session.appliedCoupon;
        
        if (appliedCoupon) {
          const coupon = await Coupon.findById(appliedCoupon.couponId);
          const now = new Date();
          
          // Check if coupon is still valid
          if (!coupon || 
              coupon.status !== 'Active' || 
              coupon.startingDate > now || 
              coupon.expiryDate < now ||
              totalPrice < coupon.minimumPrice) {
            // Coupon is no longer valid, clear from session
            req.session.appliedCoupon = null;
            req.session.discount = 0;
            req.session.newTotal = null;
            appliedCoupon = null;
          } else {
            // Recalculate discount to ensure accuracy
            if (coupon.type === "percentage") {
              discount = Math.floor(totalPrice * coupon.offerPrice / 100);
            } else {
              discount = coupon.offerPrice;
            }
            // Ensure discount doesn't exceed order total
            discount = Math.min(discount, totalPrice);
            req.session.discount = discount;
            appliedCoupon.discount = discount;
          }
        }
        
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
      console.error('🔴 CHECKOUT ERROR:', error.message);
      console.error('🔴 FULL ERROR:', error);
      console.log('🧾 checkout HIT');
      console.log('USER:', req.session.user);
      res.redirect('/pagenotfound');
    }
  };

  const checkoutPage = async (req,res)=>{
    try
    {
        const user=req.session.user
     res.render('check',{user})
    }catch (error){
        res.redirect('/pagenotfound'); 
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
        const variant = product?.variants?.[item.variantIndex];

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

// Place order (CORRECT VERSION)
const placeOrder = async (req, res) => {
  try {
    // 1️⃣ Session check
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to place order"
      });
    }

    const userId = req.session.user;
    const { addressId, payment, discount } = req.body;

    if (!addressId || !payment) {
      return res.status(400).json({
        success: false,
        message: "Address and payment method are required"
      });
    }

    // 2️⃣ Cart check
      const cartData = await Cart.findOne({ userId }).populate({
        path: "items.productId",
        populate: [{ path: "category" }]
      });
    if (!cartData || cartData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    await syncCartOfferPrices(cartData);

    // 3️⃣ Address check
    const addressData = await Address.findOne({ userId });
    if (!addressData || !addressData.address) {
      return res.status(400).json({
        success: false,
        message: "No address found"
      });
    }

    const selectedAddress = addressData.address.id(addressId);
    if (!selectedAddress) {
      return res.status(400).json({
        success: false,
        message: "Selected address not found"
      });
    }

    // 4️⃣ Prepare order items
    const orderedItems = cartData.items.map(item => ({
      product: item.productId._id,
      variantIndex: item.variantIndex,
      quantity: item.quantity,
      price: item.price
    }));

    // 5️⃣ 🔥 CALCULATE SUBTOTAL (SOURCE OF TRUTH)
    const subTotal = cartData.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 6️⃣ Delivery charge
    const deliveryCharge = subTotal < 500 ? 50 : 0;

    // 7️⃣ Coupon discount validation and calculation
    let couponDiscount = 0;
    let appliedCouponCode = null;
    
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);
      const now = new Date();
      
      // Validate coupon is still valid
      if (coupon && 
          coupon.status === 'Active' && 
          coupon.startingDate <= now && 
          coupon.expiryDate >= now &&
          subTotal >= coupon.minimumPrice) {
        
        // Calculate discount
        if (coupon.type === "percentage") {
          couponDiscount = Math.floor(subTotal * coupon.offerPrice / 100);
        } else {
          couponDiscount = coupon.offerPrice;
        }
        
        // Ensure discount doesn't exceed subtotal
        couponDiscount = Math.min(couponDiscount, subTotal);
        
        appliedCouponCode = coupon.code;
        
        // Update coupon usage
        const usageEntry = coupon.usedUsers.find(u => u.userId.toString() === userId.toString());
        if (usageEntry) {
          usageEntry.count += 1;
        } else {
          coupon.usedUsers.push({ userId, count: 1 });
        }
        coupon.usedCount = (coupon.usedCount || 0) + 1;
        await coupon.save();
        
      } else {
        // Coupon is no longer valid, clear from session
        req.session.appliedCoupon = null;
        req.session.discount = 0;
        req.session.newTotal = null;
      }
    }

    // 8️⃣ Final payable amount
    const finalAmount = Math.max(
      subTotal - couponDiscount + deliveryCharge,
      0
    );

    const COD_LIMIT = 1000;

if (payment === "cod" && finalAmount > COD_LIMIT) {
  return res.status(400).json({
    success: false,
    method: "cod",
    message: `Cash on Delivery is not available for orders above ₹${COD_LIMIT}`
  });
}

    // 9️⃣ Wallet check (AFTER calculation)
    if (payment === "wallet") {
      const user = await User.findById(userId);
      if (user.wallet < finalAmount) {
        return res.json({
          success: false,
          method: "wallet",
          message: "Insufficient wallet balance"
        });
      }
    }

    // 🔟 Create order
    const newOrder = await Order.create({
      userId,
      orderedItems,
      totalPrice: subTotal,           // subtotal only
      couponDiscount,
      couponApplied: couponDiscount > 0,
      couponCode: appliedCouponCode,
      deliveryCharge,
      finalAmount,                    // FINAL PAYABLE
      address: selectedAddress.toObject(),
      paymentMethod: payment,
      status: "Pending",
      createdOn: new Date()
    });

    // 1️⃣1️⃣ Update stock
    for (const item of cartData.items) {
      const product = await Product.findById(item.productId._id);
      if (!product) throw new Error("Product not found");

      const variant = product.variants[item.variantIndex];
      if (!variant || variant.quantity < item.quantity) {
        throw new Error("Insufficient stock");
      }

      variant.quantity -= item.quantity;
      await product.save();
    }

    // 1️⃣3️⃣ Payment handling
    if (payment === "cod") {
      // Clear cart and coupon session
      await Cart.updateOne({ userId }, { $set: { items: [] } });
      req.session.appliedCoupon = null;
      req.session.discount = 0;
      req.session.newTotal = null;
      req.session.cartTotal = 0;
      
      newOrder.status = "Pending";
      await newOrder.save();
      return res.json({ 
        success: true, 
        method: "cod", 
        order: {
          _id: newOrder._id,
          orderId: newOrder.orderId,
          finalAmount: newOrder.finalAmount
        }
      });
    }

    if (payment === "wallet") {
      // Deduct from wallet
      const user = await User.findById(userId);
      user.wallet -= finalAmount;
      user.walletTransactions.push({
        amount: finalAmount,
        status: "debited",
        method: "order",
        description: `Order #${newOrder.orderId}`
      });
      await user.save();

      // Clear cart and coupon session
      await Cart.updateOne({ userId }, { $set: { items: [] } });
      req.session.appliedCoupon = null;
      req.session.discount = 0;
      req.session.newTotal = null;
      req.session.cartTotal = 0;
      
      newOrder.status = "Pending";
      newOrder.paymentStatus = "paid";
      await newOrder.save();

      return res.json({
        success: true,
        method: "wallet",
        order: {
          _id: newOrder._id,
          orderId: newOrder.orderId,
          finalAmount: newOrder.finalAmount
        }
      });
    }
    
    // Razorpay ❗❗ DO NOT CLEAR CART HERE (cleared after payment verification)
    if (payment === "razorpay") {
      const razorPayOrder = await razorpayInstance.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `order_${newOrder._id}`
      });

      return res.json({
        success: true,
        method: "razorpay",
        razorPayOrder,
        orderId: newOrder._id,
        order: {
          _id: newOrder._id,
          orderId: newOrder.orderId,
          finalAmount: newOrder.finalAmount
        },
        key_id: process.env.RAZORPAY_KEY_ID
      });
    }


  } catch (error) {
    console.error("========== Place Order Error ==========");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("User ID:", req.session?.user);
    console.error("Payment method:", req.body?.payment);
    console.error("=======================================");
    res.status(500).json({
      success: false,
      message: error.message || "Error placing order"
    });
  }
};



  

  // Confirm order after Razorpay payment
  const confirmOrderAfterRazorpay = async (
    userId,
    addressId,
    totalPrice,
    discount,
    paymentId,
    razorpayOrderId
  ) => {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const addressData = await Address.findOne({ userId });
    const selectedAddress = addressData.address.id(addressId);
  
    const orderedItems = cart.items.map(item => ({
      product: item.productId._id,
      variantIndex: item.variantIndex,
      quantity: item.quantity,
      price: item.price
    }));
  
    const order = new Order({
      userId,
      orderedItems,
      totalPrice,
      discount: discount || 0,
      finalAmount: totalPrice - (discount || 0),
      address: selectedAddress,
      paymentMethod: "Razorpay",
      paymentStatus: "Paid",
      paymentId,
      razorpayOrderId,
      status: "Confirmed",
      createdOn: new Date()
    });
  
    await order.save();
  
    // stock update
    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      product.variants[item.variantIndex].quantity -= item.quantity;
      await product.save();
    }
  
    await Cart.updateOne({ userId }, { $set: { items: [] } });
  
    return order._id;
  };

  
const paymentConfirm = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const updated = await Order.updateOne(
      { _id: orderId },
      { $set: { status: "confirmed" } }
    );

    if (updated.modifiedCount === 1) {
      res.json({ status: true });
    } else {
      res.json({ status: false, message: "Order not updated" });
    }
  } catch (error) {
    console.error("Error in paymentConfirm:", error);
    res.status(500).json({ status: false, error: "Internal Server Error" });
  }
};
  
  
  
//order success page
const getOrderSuccessPage = async (req, res) => {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const user = await User.findById(userId);
    console.log(orderId)
    if (!orderId) return res.redirect('/');
  
    try {
      const order = await Order.findOne({ orderId })
  .populate({
    path: 'orderedItems.product',
    select: 'productName productImages'
  });
      if (!order) return res.redirect('/');
  
      res.render('user/ordersuccess', { order, orderId: order.orderId ,user});

    } catch (error) {
      console.error(error);
      res.redirect('/');
    }
  };

 
 //order details page
 const viewOrderDetails = async (req, res) => {
  try {
    const orderIdParam = req.params.orderId;
    const userId = req.session?.user;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please login to view order details' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const perPage = 5;
    const currentPage = parseInt(req.query.page) || 1;

    // Try _id first, then orderId field
    let order = await Order.findById(orderIdParam).catch(() => null);

    if (!order) {
      order = await Order.findOne({ orderId: orderIdParam });
    }

    if (order) {
      await order.populate([
        { path: 'orderedItems.product', select: 'name variants' },
        { path: 'userId', select: 'username name phone' }
      ]);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = order.userId?._id || order.userId;
    if (orderUserId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
    }

    // Map items with variant + image resolution
    order.orderedItems = order.orderedItems.map((item, idx) => {
      const product = item.product;
      const variants = product?.variants;

      // Safely resolve variant
      const variantIndex = parseInt(item.variantIndex, 10);
      const hasValidIndex = Number.isInteger(variantIndex) && variantIndex >= 0;
      const variant = hasValidIndex && Array.isArray(variants) && variants[variantIndex]
        ? variants[variantIndex]
        : (Array.isArray(variants) && variants.length > 0 ? variants[0] : null);

      // Safely resolve image path across different stored formats
      let productImage = '';
      if (variant) {
        const raw = Array.isArray(variant.productImage)
          ? variant.productImage[0]
          : variant.productImage;

        if (typeof raw === 'string' && raw.trim()) {
          const normalizedRaw = raw.trim().replace(/\\/g, '/');

          // Cases handled:
          // 1) uploads/product-images/a.webp
          // 2) /uploads/product-images/a.webp
          // 3) public/uploads/product-images/a.webp
          // 4) C:/.../public/uploads/product-images/a.webp
          if (normalizedRaw.includes('/public/uploads/')) {
            productImage = 'uploads/' + normalizedRaw.split('/public/uploads/')[1].replace(/^\/+/, '');
          } else if (normalizedRaw.startsWith('public/uploads/')) {
            productImage = normalizedRaw.replace(/^public\/+/, '');
          } else if (normalizedRaw.startsWith('/uploads/')) {
            productImage = normalizedRaw.replace(/^\/+/, '');
          } else if (normalizedRaw.startsWith('uploads/')) {
            productImage = normalizedRaw;
          } else {
            // fallback for unexpected formats
            productImage = normalizedRaw.replace(/^\/+/, '');
          }
        }
      }

      if (!productImage) {
        console.warn(`[OrderDetails] Missing image — orderId: ${order.orderId}, itemIdx: ${idx}, variantIndex: ${item.variantIndex}, productId: ${product?._id}`);
      } else {
        const absImagePath = path.join(__dirname, '../../public', productImage.replace(/^\/+/, ''));
        const existsOnDisk = fs.existsSync(absImagePath);
        console.log(`[OrderDetails] Image debug — orderId: ${order.orderId}, itemIdx: ${idx}, rawVariantImage: ${
          Array.isArray(variant?.productImage) ? variant?.productImage?.[0] : variant?.productImage
        }, mapped: ${productImage}, publicUrl: /${productImage}, existsOnDisk: ${existsOnDisk}`);
      }

      if (!variant) {
        console.log(`[OrderDetails] Variant debug — orderId: ${order.orderId}, itemIdx: ${idx}, variantIndex: ${item.variantIndex}, variantsCount: ${Array.isArray(variants) ? variants.length : 0}`);
      }

      return {
        ...item.toObject(),
        product,
        selectedVariant: variant || { productImage: [], color: 'N/A' },
        productName: product?.name || 'Product',
        productImage,                                   // always a clean '/...' string or ''
        color: variant?.color || 'N/A',
        finalPrice: Number(item.price || 0),
        originalIndex: idx
      };
    });

    // Paginate
    const totalItems = order.orderedItems.length;
    const totalPages = Math.ceil(totalItems / perPage);

    order.orderedItems = order.orderedItems.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage
    );

    res.render('user/order-details', {
      user,
      order,
      totalPages,
      currentPage
    });

  } catch (error) {
    console.error('[viewOrderDetails] Error:', error.message);
    console.error('[viewOrderDetails] Stack:', error.stack);
    console.error('[viewOrderDetails] orderId param:', req.params.orderId, '| userId:', req.session?.user);
    res.status(500).json({ success: false, message: 'Something went wrong!', error: error.message });
  }
};


 const cancelOrder= async (req,res)=>{
   try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const { orderId, itemIndex, reason } = req.body;
    console.log('Cancel Order Request:', { orderId, itemIndex, reason });

    if (!orderId || itemIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Order ID and item index are required' });
    }

    const order = await Order.findOne({ orderId }).populate('orderedItems.product');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    console.log('Order found:', order.orderId, 'Status:', order.status);
   
    // Check order status (case-insensitive)
    const orderStatus = (order.status || '').toLowerCase();
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    const paymentMethod = (order.paymentMethod || '').toLowerCase();

    if (paymentMethod === 'razorpay' && paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an unpaid or failed payment order' });
    }

    if (orderStatus === 'cancelled' || orderStatus === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel items in this order status' });
    }

    if (itemIndex < 0 || itemIndex >= order.orderedItems.length) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const item = order.orderedItems[itemIndex];
    console.log('Item to cancel:', item);

    // Check item status (case-insensitive)
    const itemStatus = (item.status || '').toLowerCase();
    if (itemStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Item already cancelled' });
    }

    if (itemStatus === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel delivered item' });
    }
    
    // User requests cancellation - set to pending approval
    // For Razorpay and Wallet payments, admin must approve before refund
    if (paymentMethod === "razorpay" || paymentMethod === "wallet") {
      // Set status to cancellation_requested - waiting for admin approval
      order.orderedItems[itemIndex].status = "cancellation_requested";
      order.orderedItems[itemIndex].cancellationReason = reason || '';
      
      console.log('🔔 Cancellation request submitted for admin approval');
    } else {
      // For COD orders, cancel immediately (no refund needed)
      order.orderedItems[itemIndex].status = "cancelled";
      order.orderedItems[itemIndex].cancellationReason = reason || '';
      
      // Restore product stock for COD orders
      try {
        const product = await Product.findById(item.product._id || item.product);
        if (product && product.variants && product.variants[item.variantIndex]) {
          product.variants[item.variantIndex].quantity += item.quantity;
          await product.save();
          console.log('Product stock restored for COD cancellation');
        }
      } catch (stockErr) {
        console.error('Error restoring stock:', stockErr);
      }
    }

   //  Recalculate new total (exclude cancelled and cancellation_requested items)
   let newTotal = 0;
   order.orderedItems.forEach(orderItem => {
     const status = (orderItem.status || '').toLowerCase();
     if (status !== "cancelled" && status !== "cancellation_requested") {
       newTotal += orderItem.price * orderItem.quantity;
     }
   });

   order.totalPrice = newTotal;

   //  Recalculate proportional coupon discount
   let newDiscount = 0;
   if (order.discount > 0) {
     const originalTotal = order.orderedItems.reduce((sum, p) => {
       return sum + (p.price * p.quantity);
     }, 0);

     if (originalTotal > 0) {
       newDiscount = Math.round((newTotal / originalTotal) * order.discount);
     }
   }

   order.discount = newDiscount;
   const deliveryCharge = newTotal > 0 && newTotal < 500 ? 50 : 0;
   order.deliveryCharge = deliveryCharge;

   // Update final amount
   order.finalAmount = newTotal - newDiscount + deliveryCharge;


   // Update order.status if needed
   const allCancelled = order.orderedItems.every(p => {
     const s = (p.status || '').toLowerCase();
     return s === "cancelled";
   });
   if (allCancelled) {
     order.status = "Cancelled";
   } 

   await order.save();
   console.log('Order updated successfully');
    
    // Send email notification (optional, don't fail if this errors)
    try {
      if (typeof sendOrderCancellation === 'function') {
        await sendOrderCancellation(user.email, item, order._id, refundAmount);
      }
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr);
    }


    const paymentMethodCheck = (order.paymentMethod || '').toLowerCase();
    const successMessage = (paymentMethodCheck === "razorpay" || paymentMethodCheck === "wallet") 
      ? 'Cancellation request submitted. Waiting for admin approval.'
      : 'Order item cancelled successfully';
    
    res.json({ success: true, message: successMessage });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
 }
 
const returnRequest = async (req, res) => {
  try {
    const { orderId, itemIndex, reason } = req.body;
    const userId = req.session.user;
    if (!orderId || itemIndex === undefined || !reason) {
      return res.status(400).send('Order ID, item index and return reason are required');
    }

    // const order = await Order.findOne({ orderId });
    const order = await Order.findOne({ orderId : orderId, userId });
    if (!order) return res.status(404).send('Order not found');

    const item = order.orderedItems[itemIndex];
    if (!item) return res.status(400).send('Invalid item index');

    if (item.status.toLowerCase() !== 'delivered') {
      return res.status(400).send('Only delivered items can be returned');
    }
    const deliveryDate = new Date(order.deliveredOn || order.updatedAt);
    const currentDate = new Date();
    const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ success: false, message: "Return period has expired for this item" });
    }

    item.status = 'return_requested';
    item.returnReason = reason;
    // Clear any previous rejection
    item.returnRejected = false;
    item.returnRejectionReason = '';

    await order.save();

    res.send({ message: 'Return request submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

 // Generate and send PDF invoice for a delivered order
const generateInvoice = async (req, res) => {
  try {
    
    const userId = typeof req.session.user === 'string' ? req.session.user : req.session.user._id;
    const orderId = req.query.orderId;

    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }
   const order = await Order.findOne({ orderId: orderId, userId });
    if (!order) {
      return res.status(404).send('Order not found');
    }
   if (order.status !== 'delivered') {
      return res.status(400).send('Invoice is only available for delivered orders');
    }
    const deliveredItems = (order.orderedItems || []).filter(
      it => (it.status || '').toLowerCase() === 'delivered'
    );

    if (deliveredItems.length === 0) {
     
      return res.status(400).send('No delivered items found for this order');
    }

    
    const subTotalDelivered = deliveredItems.reduce(
      (sum, it) => sum + (Number(it.finalPrice || 0) * Number(it.quantity || 0)),
      0
    );

    if (!order.invoiceDate) {
      order.invoiceDate = new Date();
      await order.save();
    }

    const templatePath = path.join(__dirname, '../../views/user/invoice.ejs');
    const html = await ejs.renderFile(templatePath, { order,deliveredItems,subTotalDelivered });

    // Launch Puppeteer to generate PDF from rendered HTML
    const browser = await puppeteer.launch({ headless: true ,args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'domcontentloaded'  });

    // Ensure invoice directory exists
    const invoiceDir = path.join(__dirname, '../../public/invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Prepare PDF file path and name
    const fileName = `invoice-${order.orderId}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    // Generate PDF file on disk
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    // Send the PDF file to client for download
    res.download(filePath, fileName, (err) => {

      fs.promises.unlink(filePath)
      .catch(e => { if (e.code !== 'ENOENT') console.error('Delete failed:', e); });
     if (err) {
        console.error('Error sending file:', err);
        return res.status(500).send('Error generating invoice');
      }
     });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
};

//Available coupon
const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.session.user;
    const now = new Date();
    let orderTotal = Number(req.session.cartTotal) || 0;

    if (!userId) {
      return res.json({ success: true, coupons: [] });
    }

    // Always use latest cart total to avoid stale/empty session values
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: 'category'
    });

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.json({ success: true, coupons: [] });
    }

    await syncCartOfferPrices(cart);
    orderTotal = cart.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    req.session.cartTotal = orderTotal;

    // Build query for coupons
    // - All admin coupons are available to all users
    // - Referral coupons are only available to the user they were created for
    const couponQuery = {
      status: 'Active',
      startingDate: { $lte: now },
      expiryDate: { $gte: now },
      $or: [
        { source: 'admin' },
        { source: { $exists: false } },
        { source: null },
        { source: 'referral', createdFor: userId }
      ]
    };

    // Fetch coupons
    const coupons = await Coupon.find(couponQuery).lean();

    const usableCoupons = coupons.filter(coupon => {
      const usedUsers = Array.isArray(coupon.usedUsers) ? coupon.usedUsers : [];

      // Per-user usage check
      const usageEntry = usedUsers.find(u => String(u.userId) === String(userId));
      const userCount = usageEntry ? Number(usageEntry.count) || 0 : 0;
      const usagePerUser = Number(coupon.usagePerUser) || 0;
      if (usagePerUser > 0 && userCount >= usagePerUser) {
        return false;
      }

      // Total usage limit check
      const usedCount = Number(coupon.usedCount) || 0;
      const usageLimit = Number(coupon.usageLimit) || 0;
      if (usageLimit > 0 && usedCount >= usageLimit) {
        return false;
      }

      // Current order minimum amount check
      const minimumPrice = Number(coupon.minimumPrice) || 0;
      if (orderTotal < minimumPrice) {
        return false;
      }

      return true;
    });

    res.json({ success: true, coupons: usableCoupons });

  } catch (error) {
    console.error('Error while fetching coupon', error);
    res.status(500).json({ success: false, message: 'something went wrong' });
  }
};

//Apply coupon


const applyCoupon= async (req, res) => {
  try {
    const { code, couponCode } = req.body;
    const userId = req.session.user;
    const now = new Date();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Login required' });
    }

    // Accept both 'code' and 'couponCode' field names
    const couponCodeValue = code || couponCode;
    
    if (!couponCodeValue) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({
      code: couponCodeValue.toUpperCase(),
      status: 'Active',
      startingDate: { $lte: now },
      expiryDate: { $gte: now },
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Coupon not found or expired' });
    }

    const usageEntry = coupon.usedUsers.find(u => u.userId.toString() === userId);
    const userCount = usageEntry ? usageEntry.count : 0;

    if (userCount >= coupon.usagePerUser) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded' });
    }
    
    // Check total usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    // Calculate order total from actual cart data, not session
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: 'category'
    });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Sync cart prices with current offers before calculating total
    await syncCartOfferPrices(cart);
    
    const orderTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Update session with current cart total
    req.session.cartTotal = orderTotal;

    if (orderTotal < coupon.minimumPrice) {
      return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minimumPrice} required` });
    }

    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = Math.floor(orderTotal * coupon.offerPrice / 100);
    
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    
    } else if (coupon.type === 'fixed') {
      discount = coupon.offerPrice;
    }
    
    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderTotal);

    const newTotal = Math.max(orderTotal - discount, 0);
    console.log(orderTotal)
    console.log(discount)
   console.log(newTotal)
    req.session.discount = discount;
    req.session.newTotal = newTotal;
    req.session.appliedCoupon = {
      code: coupon.code,
      discount,
      couponId: coupon._id 
  }

    res.json({ 
      success: true, 
      discount, 
      newTotal,
      couponCode: coupon.code,
      orderTotal 
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const deleteCoupon=async (req, res) => {
  try{
    if (!req.session.appliedCoupon) {
      return res.json({ success: false, message: 'No coupon applied' });
    }
    
    delete req.session.appliedCoupon;
    delete req.session.discount;
    delete req.session.newTotal;
  
    res.json({ success: true, message: 'Coupon removed successfully' });

  }catch(error){
    console.error('Remove coupon error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
 
}


const retryPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect('/sign-in');

    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Can retry payment for Razorpay orders that are not yet paid
    if (order.paymentMethod !== 'razorpay') {
      return res.redirect(`/orders/${orderId}`);
    }

    // Allow retry if payment status is not 'paid'
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    if (paymentStatus === 'paid') {
      return res.redirect(`/orders/${orderId}`);
    }

    // Persist failed state so it appears correctly in order listings.
    if (paymentStatus !== 'failed') {
      order.paymentStatus = 'failed';
      await order.save();
    }

    const user = await User.findById(userId);

    // Render payment failed page with retry option
    res.render('user/payment-failed', {
      order,
      user
    });
  } catch (error) {
    console.error("Retry payment error:", error);
    res.status(500).send('Something went wrong');
  }
};

// API endpoint to create new Razorpay order for retry
const createRetryPayment = async (req, res) => {
  try {
    console.log('=== CREATE RETRY PAYMENT START ===');
    const userId = req.session.user;
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orderId = req.params.orderId;
    console.log('Order ID:', orderId);
    
    const order = await Order.findById(orderId);
    console.log('Order found:', order ? 'YES' : 'NO');
    
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('Order details:', {
      orderId: order.orderId,
      userId: order.userId,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      finalAmount: order.finalAmount
    });

    if (order.userId.toString() !== userId.toString()) {
      console.log('❌ User ID mismatch');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.paymentMethod !== 'razorpay') {
      console.log('❌ Invalid payment method:', order.paymentMethod);
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'retry',
      orderStatus: 'payment_retry'
    });

    console.log('Creating Razorpay order with amount:', Math.round(order.finalAmount * 100));
    
    // Create new Razorpay order for retry
    // Receipt must be max 40 characters
    const receiptId = `retry_${order._id.toString().slice(-20)}`;
    console.log('Receipt ID:', receiptId, 'Length:', receiptId.length);
    
    const razorPayOrder = await razorpayInstance.orders.create({
      amount: Math.round(order.finalAmount * 100),
      currency: "INR",
      receipt: receiptId
    });

    console.log('✅ Razorpay order created:', razorPayOrder.id);
    console.log('=== CREATE RETRY PAYMENT END ===');

    res.json({
      success: true,
      razorPayOrder,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("❌ Create retry payment error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  const orderId = req.body?.orderId;
  try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const userId = req.session.user || (req.user && req.user._id);
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Verify the order exists and belongs to the user
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.userId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
      }

      // Check if payment is already verified
      if (order.paymentStatus === 'paid') {
        return res.json({ success: true, message: 'Payment already verified' });
      }

      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(sign)
          .digest('hex');
      
      if (razorpay_signature === expectedSign) {
          // Update order status and payment details
          await Order.findByIdAndUpdate(orderId, {
              status: 'Pending',
              paymentStatus: 'paid',
              'razorpayDetails.orderId': razorpay_order_id,
              'razorpayDetails.paymentId': razorpay_payment_id,
              'razorpayDetails.signature': razorpay_signature
          });
          
          // Clear cart after successful payment (only if cart has items)
          const cart = await Cart.findOne({ userId });
          if (cart && cart.items && cart.items.length > 0) {
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
          }
          
          // Clear coupon session after successful payment
          req.session.appliedCoupon = null;
          req.session.discount = 0;
          req.session.newTotal = null;
          req.session.cartTotal = 0;
          
          res.json({ success: true });
      } else {

          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'failed',
            orderStatus: 'payment_failed'
          });
          res.json({ success: false, message: 'Invalid payment signature' });
      }
  } catch (error) {
      console.error('Razorpay verification error:', error);
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'failed',
          orderStatus: 'payment_failed'
        });
      }
      
      res.json({ success: false, message: 'Payment verification failed' });
  }
};
const createRazorpayOrder = async (req, res) => {
  try {
      const { addressId } = req.body;
      
      // Calculate total amount from cart
      const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
      const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create your internal order first
      const order = await Order.create({
          userId: req.user._id,
          addressId: addressId,
          items: cart.items,
          totalAmount: totalAmount,
          paymentMethod: 'razorpay',
          paymentStatus: 'pending'
      });
      
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
          amount: totalAmount * 100, // Convert to paise
          currency: 'INR',
          receipt: order._id.toString()
      });
      
      res.json({
          success: true,
          razorpayOrder: razorpayOrder,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          orderId: order._id
      });
  } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'Failed to create order' });
  }
};



  module.exports={
    getCheckoutPage,
    checkStock,
    placeOrder,
    confirmOrderAfterRazorpay,
    getOrderSuccessPage,
    viewOrderDetails,
    cancelOrder,
    returnRequest,
    generateInvoice,
    paymentConfirm,
    getAvailableCoupons,
    applyCoupon,
    deleteCoupon,
    retryPayment,
    createRetryPayment,
    checkoutPage,
    createRazorpayOrder,
    verifyRazorpayPayment
   

  }
