const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")
const mongoose = require('mongoose');


const productDetails = async (req,res) => {

    try {
        const userId = req.session.user;
        let wishlistIds = [];
        if(userId) {
            const userDoc = await User.findById(userId).select('wishlist').lean();
            wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
        const userData =  userId ? await User.findById(userId) : null;
        const identifier = req.params.slug;
        
        // Try to find by slug first, then by ID as fallback
        let product;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            // If it's a valid ObjectId, try finding by ID
            product = await Product.findById(identifier)
                .populate('category')
                .populate({ path: 'ratings.userId', select: 'name profilePicture' })
                .populate('brand');
        }
        
        // If not found by ID or not a valid ObjectId, try by slug
        if (!product) {
            product = await Product.findOne({ slug: identifier })
                .populate('category')
                .populate({ path: 'ratings.userId', select: 'name profilePicture' })
                .populate('brand');
        }
        
        if (!product) {
            return res.redirect('/pageNotFound');
        }
        if (product.isBlocked) {
            // Product exists but blocked by admin
            return res.redirect('/shop');
        }
        const ratingsCount = product?.ratings?.length || 0;  
        let totalQuantity = 0;
        if (product.variants && product.variants.length > 0) {
            totalQuantity = product.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
          }  
        const findCategory = product.category;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());

        // const products = await Product.find({
        //     isBlocked: false,
        //     category: { $in: categoryIds },
        //     _id: { $ne: productId },
        // })
        // .sort({ createdAt: -1 })
        // .skip(0)
        // .limit(9)
        // .lean()
        let relatedProducts = await Product.find({
            isBlocked: false,
            category: product.category,
            subcategory: product.subcategory,
            _id: { $ne: product._id }
          })
          .sort({ createdAt: -1 })
          .limit(9)
          .lean();
          
          if (!relatedProducts.length) {
            relatedProducts = await Product.find({
              isBlocked: false,
              category: product.category,
              _id: { $ne: product._id }
            })
            .sort({ createdAt: -1 })
            .limit(9)
            .lean();
          }
          

        res.render("user/product-details",{
            user:userData,
            product:product,
            products: relatedProducts,
            totalQuantity:totalQuantity,
            category:findCategory,
            wishlistIds,
            ratingsCount,
           
        })
    } catch (error) {
        
        console.error("Error for fetching product details",error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    productDetails
}