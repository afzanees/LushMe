const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

// Add product to wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ 
                status: false, 
                message: 'Please login to add items to wishlist' 
            });
        }

        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ 
                status: false, 
                message: 'Product ID is required' 
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                status: false, 
                message: 'Product not found' 
            });
        }

        // Find user and update wishlist
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                status: false, 
                message: 'User not found' 
            });
        }

        // Initialize wishlist if it doesn't exist
        if (!user.wishlist) {
            user.wishlist = [];
        }

        // Check if product is already in wishlist
        const isAlreadyInWishlist = user.wishlist.some(
            item => item.toString() === productId.toString()
        );

        if (isAlreadyInWishlist) {
            return res.json({ 
                status: false, 
                message: 'Product already in wishlist' 
            });
        }

        // Add to wishlist
        user.wishlist.push(productId);
        await user.save();

        res.json({ 
            status: true, 
            message: 'Product added to wishlist successfully' 
        });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ 
            status: false, 
            message: 'Error adding to wishlist' 
        });
    }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ 
                status: false, 
                message: 'Please login' 
            });
        }

        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ 
                status: false, 
                message: 'Product ID is required' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                status: false, 
                message: 'User not found' 
            });
        }

        // Remove from wishlist
        user.wishlist = user.wishlist.filter(
            item => item.toString() !== productId.toString()
        );
        
        await user.save();

        res.json({ 
            status: true, 
            message: 'Product removed from wishlist' 
        });

    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ 
            status: false, 
            message: 'Error removing from wishlist' 
        });
    }
};

// Get wishlist page
const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/sign-in');
        }

        const user = await User.findById(userId).populate({
            path: 'wishlist',
            populate: [
                { path: 'category' },
                { path: 'brand' }
            ]
        });

        if (!user) {
            return res.redirect('/sign-in');
        }

        // Filter out null/deleted products from wishlist
        const validWishlist = (user.wishlist || []).filter(item => item != null);
        
        // Clean up the user's wishlist in database if there were null values
        if (user.wishlist && validWishlist.length !== user.wishlist.length) {
            console.log(`Cleaning wishlist: had ${user.wishlist.length}, keeping ${validWishlist.length}`);
            user.wishlist = validWishlist.map(item => item._id);
            await user.save();
        }

        res.render('user/wishlist', { 
            user,
            wishlist: validWishlist
        });

    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.redirect('/pagenotfound');
    }
};





module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlistPage,
   
};
