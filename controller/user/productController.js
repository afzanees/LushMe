const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")
const mongoose = require('mongoose');
<<<<<<< HEAD
const { getEffectiveOffer, applyOffer } = require('../../utils/offerHelper');
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

const productDetails = async (req,res) => {

    try {
        const userId = req.session.user;
        let wishlistIds = [];
<<<<<<< HEAD
        let userData = null;
        
        if(userId) {
            userData = await User.findById(userId);
            
            // Check if user is blocked
            if (userData && userData.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                });
                return res.redirect("/login?error=blocked");
            }
            
            wishlistIds = userData?.wishlist?.map(id => id.toString()) || [];
        }
        
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
        
         // Calculate effective offer (product, category, subcategory)
        const category = await Category.findById(product.category);
        const subcategory = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory?.toString());
        
        // const productOffer = product.productOffer || 0;
        // const categoryOffer = category?.categoryOffer || 0;
        // const subcategoryOffer = subcategory?.offer || 0;
        
        // const effectiveOffer = Math.max(productOffer, categoryOffer, subcategoryOffer);
        
         // Apply offer to all variants
        // if (product.variants && product.variants.length > 0) {
        //     product.variants = product.variants.map(variant => {
        //         const variantObj = variant.toObject ? variant.toObject() : variant;
        //         // Apply offer discount to salePrice
        //         const discountedPrice = variantObj.salePrice * (1 - effectiveOffer / 100);
        //         return {
        //             ...variantObj,
        //             salePrice: Math.round(discountedPrice),
        //             regularPrice: Math.round(variantObj.regularPrice)
        //         };
        //     });
        // }


    const effectiveOffer = getEffectiveOffer(product, category, subcategory);
product.variants = product.variants.map(variant => {
  const variantObj = variant.toObject ? variant.toObject() : variant;
  return {
    ...variantObj,
    salePrice:    applyOffer(variantObj.salePrice, effectiveOffer),
    regularPrice: Math.round(variantObj.regularPrice)
  };
});

        
=======
        if(userId) {
            const userDoc = await User.findById(userId).select('wishlist').lean();
            wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
        const userData =  userId ? await User.findById(userId) : null;
        const productId = req.query.id;
        const product = await Product.findOne({ _id: productId, isBlocked: false})
        .populate('category')
        .populate({ path: 'ratings.userId', select: 'name profilePicture' })
        .populate('brand');
        if (!product) {
            return res.redirect('/pageNotFound');
          }
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
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
          

<<<<<<< HEAD
        res.render("user/product-details",{
=======
        res.render("product-details",{
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
            user:userData,
            product:product,
            products: relatedProducts,
            totalQuantity:totalQuantity,
            category:findCategory,
            wishlistIds,
            ratingsCount,
<<<<<<< HEAD
            effectiveOffer,
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
           
        })
    } catch (error) {
        
        console.error("Error for fetching product details",error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    productDetails
}