// const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const mongodb = require("mongodb");
const errorHandler = require('../../middlewares/errorhandling');

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
      const newItem = {
        productId: product._id,
        variantIndex,
        quantity: Math.min(qty, 3),
        price: variant.salePrice,
        totalPrice: variant.salePrice * Math.min(qty, 3),

      };

      cart = new Cart({
        userId,
        items: [newItem]
      });

      await cart.save();
      return res.json({ status: true, cartLength: 1 });
    }

    // Find existing item index for same product variant
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      item.variantIndex === variantIndex
    );

    if (itemIndex === -1) {
      // Add new item
      const quantityToAdd = Math.min(qty, 3);
      cart.items.push({
        productId: product._id,
        variantIndex,   
        quantity: quantityToAdd,
        price: variant.salePrice,
        totalPrice: variant.salePrice * quantityToAdd,
      });
      await cart.save();
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
      cart.items[itemIndex].totalPrice = variant.salePrice * newQuantity;

      await cart.save();
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
    const userId = req.session.user;
   
    if (!userId) return res.redirect('/login');
    const oid = new mongodb.ObjectId(userId);

    //e cart items with product, category, and variant info
    const cartData = await Cart.aggregate([
      { $match: { userId:oid } },
      { $unwind: "$items" },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
        // Lookup brand details (new)
      {
       $lookup: {
      from: "brands",                   
      localField: "productDetails.brand", 
      foreignField: "_id",
      as: "brandDetails"
       }
      },
  { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },

      // Lookup category details
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

      // Unwind product variants to find matching variant by color
      {
        $addFields: {
          selectedVariant: {
            $arrayElemAt: ["$productDetails.variants", "$items.variantIndex"]
          }
        }
      },
       {
        $addFields: {
          isBlocked: "$productDetails.isBlocked",
          isCategoryListed: "$categoryDetails.isListed",
          productStatus: "$productDetails.status",
          isOutOfStock: { 
            $or: [
              { $lte: ["$selectedVariant.quantity", 0] },
              { $ne: ["$productDetails.status", "Available"] }
            ]
          },
          exceedsStock: { $gt: ["$items.quantity", "$selectedVariant.quantity"] },
          exceedsLimit: { $gt: ["$items.quantity", 3] }
        }
      },
      
      {
        $project: {
          _id: 0,
          productId: "$items.productId",
          variantIndex: "$items.variantIndex",
          quantity: "$items.quantity",
          totalPrice: "$items.totalPrice",

          productName: "$productDetails.name",
          color: "$selectedVariant.color",
          productPrice: "$selectedVariant.salePrice",
          productImage: { $arrayElemAt: ["$selectedVariant.productImage", 0] },
          productStock: "$selectedVariant.quantity",
          productStatus: "$productDetails.status",

          brandName: "$brandDetails.name",

          isBlocked: "$productDetails.isBlocked",
          isCategoryListed: "$categoryDetails.isListed",
          isOutOfStock: { 
            $or: [
              { $lte: ["$selectedVariant.quantity", 0] },
              { $ne: ["$productDetails.status", "Available"] }
            ]
          },
          exceedsStock: { $gt: ["$items.quantity", "$selectedVariant.quantity"] },
          exceedsLimit: { $gt: ["$items.quantity", 3] }  
            }
      }
    ]);

    // Calculate grand total for cart
    let grandTotal = 0;
    cartData.forEach(item => {
      grandTotal += item.totalPrice;
    });

    console.log("cart data :",cartData)
    let shippingCharge = 0;
    if (grandTotal > 0 && grandTotal < 500) {
         shippingCharge = 50;
    } else {
     shippingCharge = 0; // free shipping for 500 and above
    }
    const totalPayable = grandTotal + shippingCharge;
    console.log(totalPayable,shippingCharge)

    req.session.cartTotal = grandTotal
    res.render('user/cart', {
      user: req.session.user,
      cartItems: cartData,
      grandTotal,
      shippingCharge,
      totalPayable
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

    const product = await Product.findById(productId);
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
    cartItem.price = variant.salePrice;
    cartItem.totalPrice = variant.salePrice * newQuantity;

    await cart.save();

    const grandTotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingCharge = grandTotal > 0 && grandTotal < 500 ? 50 : 0;

    res.json({
      status: true,
      newQuantity,
      grandTotal,
      shippingCharge,
      totalPayable: grandTotal + shippingCharge,
      updatedStock: variant.quantity
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