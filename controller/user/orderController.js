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
    // 1️⃣ Session check
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to place order"
      });
    }

    const userId = req.session.user;
    const { totalPrice, addressId, payment, discount } = req.body;

    if (!addressId || !payment) {
      return res.status(400).json({
        success: false,
        message: "Address and payment method are required"
      });
    }

    // 2️⃣ Cart check
    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    if (!cartData || cartData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

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
      quantity: item.quantity,
      price: item.price,
      color: item.color
    }));

    // 5️⃣ Wallet check BEFORE order creation
    if (payment === "wallet") {
      const user = await User.findById(userId);
      if (user.wallet < totalPrice) {
        return res.json({
          success: false,
          method: "wallet",
          message: "Insufficient wallet balance"
        });
      }
    }

    // 6️⃣ Create order
    const newOrder = await Order.create({
      userId,
      orderedItems,
      totalPrice,
      discount: discount || 0,
      finalAmount: totalPrice,
      address: selectedAddress ? selectedAddress.toObject() : undefined,
      paymentMethod: payment,
      status: "Pending",
      createdOn: new Date()
    });

    // 7️⃣ Update stock (safe)
    for (const item of cartData.items) {
      const product = await Product.findById(item.productId._id);
      if (!product) throw new Error("Product not found");

      const variant = product.variants.find(v => v.color === item.color);
      if (!variant || variant.quantity < item.quantity) {
        throw new Error("Insufficient stock");
      }

      variant.quantity -= item.quantity;
      await product.save();
    }

    // 8️⃣ Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    // 9️⃣ Payment handling
    if (payment === "cod") {
      return res.json({ success: true, method: "cod", order: newOrder });
    }

    if (payment === "wallet") {
      const user = await User.findById(userId);
      user.wallet -= totalPrice;
      user.walletTransactions.push({
        amount: totalPrice,
        status: "debited",
        method: "order",
        description: `Order #${newOrder._id}`
      });
      await user.save();

      newOrder.status = "Processing";
      await newOrder.save();

      return res.json({
        success: true,
        method: "wallet",
        order: newOrder
      });
    }

    if (payment === "razorpay") {
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const razorPayOrder = await razorpay.orders.create({
        amount: Math.round(totalPrice * 100),
        currency: "INR",
        receipt: `order_${newOrder._id}`
      });

      return res.json({
        success: true,
        method: "razorpay",
        razorPayOrder,
        order: newOrder
      });
    }

  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error placing order"
    });
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
      const order = await Order.findOne({ orderId }).populate('orderedItems.product userId');
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
      const orderId = req.params.orderId;
      
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(404).json({status:false, message: 'Invalid order ID' });
      }
  
      const perPage = 5; 
      const currentPage = parseInt(req.query.page) || 1;
  
      const order = await Order.findById(orderId).populate({path:'orderedItems.product', select: 'productImages productName' }).populate('userId', 'name phone').populate('userId', 'name phone');;
      console.log("order details.........................",order)
  
      if (!order) {
        return res.status(404).json({status:false, message: 'Order not found' });
      }
  
      const totalItems = order.orderedItems.length;
      console.log("item:",totalItems)
      const totalPages = Math.ceil(totalItems / perPage);
  
      const paginatedItems = order.orderedItems.slice((currentPage - 1) * perPage, currentPage * perPage);
      order.orderedItems = paginatedItems;
      console.log("item pages:",totalPages)
      console.log("order details.........................",order)
      res.render('user/order-details', {
        user: req.session.userData || null ,
        orderObj: order,
        totalPages,
        currentPage,
        user: req.session.user,
      });
  
    } catch (err) {
      console.error(err);
      res.redirect('/pageNotFound');
    }
  };


 const cancelOrder= async (req,res)=>{
   try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const { orderId, itemIndex, reason } = req.body;

    if (!orderId || itemIndex === undefined) {
      return res.status(400).send('Order ID and item index are required');
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).send('Order not found');

   
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return res.status(400).send('Cannot cancel items in this order status');
    }

    if (itemIndex < 0 || itemIndex >= order.orderedItems.length) {
      return res.status(400).send('Invalid item index');
    }

    const item = order.orderedItems[itemIndex];

    if (item.status === 'cancelled') {
      return res.status(400).send('Item already cancelled');
    }

    if (item.status === 'delivered') {
      return res.status(400).send('Cannot cancel delivered item');
    }
    const itemTotal = item.finalPrice * item.quantity;
    let refundAmount = itemTotal;

    if (order.discount > 0 && order.subTotal > 0) {
      const proportionalDiscount = (itemTotal / order.subTotal) * order.discount;
      refundAmount -= proportionalDiscount;
      refundAmount = Math.round(refundAmount); 
    }

    
    // Refund logic for Razorpay or Wallet payments
    if ((order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") && order.status === "confirmed") {
      
      user.wallet += refundAmount; 

       // Wallet history update
       user.walletTransactions.push({
        amount: refundAmount,
        status: "credited",
        method: 'refund',
        
        description: `Refund for cancelled product (${item.name}) in order ${order._id}`,
      });

      await user.save();
    }
    
    // Update product status to Cancel
    order.orderedItems[itemIndex].status = "cancelled";
    item.cancellationReason = reason || ''

   //  Recalculate new total (non-cancelled items)
   let newTotal = 0;
   order.orderedItems.forEach(item => {
     if (item.status !== "cancelled") {
       newTotal += item.finalPrice * item.quantity;
     }
   });

   order.subTotal = newTotal;

   //  Recalculate proportional coupon discount
   let newDiscount = 0;
   if (order.discount > 0) {
     // Calculate based on original total before any cancellations
     const originalTotal = order.orderedItems.reduce((sum, p) => {
       return sum + (p.finalPrice * p.quantity);
     }, 0);

     newDiscount = Math.round((newTotal / originalTotal) * order.discount);
   }

   order.discount = newDiscount;
   const deliveryCharge = newTotal > 0 && newTotal < 500 ? 50 : 0;

   // Update final amount
   order.finalAmount = newTotal - newDiscount + deliveryCharge;


   // Update order.status if needed
   const allCancelled = order.orderedItems.every(p => p.status === "cancelled");
   if (allCancelled) {
     order.status = "cancelled";
   } 

   await order.save();
  await Product.findByIdAndUpdate(
      item.product,
      {
        $inc: { 'variants.$[elem].quantity': item.quantity }
      },
      {
        arrayFilters: [{ 'elem.color': item.color, 'elem.size': item.size }]
      }
    );
    
    
    try {
      await sendOrderCancellation(user.email, item, order._id, refundAmount);
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr);
    }


    res.send({ message: 'Order item cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    res.status(500).send('Server error');
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

    if (item.status !== 'delivered') {
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

  module.exports={
    getCheckoutPage,
    checkStock,
    placeOrder,
    verifyPayment,
    confirmOrderAfterRazorpay,
    getOrderSuccessPage,
    viewOrderDetails,
    cancelOrder,
    returnRequest,
    generateInvoice,
    paymentConfirm,

  }