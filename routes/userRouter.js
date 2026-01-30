const express = require('express')
const router = express.Router();
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const bcrypt = require('bcrypt');
const profileController = require('../controller/user/profileController');
const cartController = require('../controller/user/cartController'); 
const orderController = require('../controller/user/orderController');
const addressController = require('../controller/user/addressController');
const wishlistController = require('../controller/user/wishlistController');
const uploads = require('../middlewares/multer')
const {userAuth} = require('../middlewares/auth')

router.get("/",userController.loadHomepage)
router.get('/pagenotfound',userController.pageNotFound)
router.get('/register',userController.loadRegister);
router.post('/register',userController.register);

router.get('/forgot-password',profileController.loadForgotPassword);
router.post('/forgot-password/send-otp',profileController.forgotPasswordSendOTP)
router.post('/forgot-password/verify-otp',profileController.verifyForgotPasswordOTP)
router.get('/update-password',profileController.loadResetPassword);
router.post('/update-password',profileController.updatePassword);
// router.get('/confirmotp',userController.loadOtp)
router.post('/confirmotp',userController.confirmOtp);
router.post('/resend-otp',userController.resendOTP);
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/logout',userController.logout);
router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);
router.get("/productDetails/:slug",productController.productDetails);

// router.get('/userProfile',userAuth,profileController.userProfile);
router.get('/profile',userAuth,profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.post('/updateProfile', userAuth,profileController.updateProfile);
router.get("/change-password", userAuth, profileController.getChangePassword);
router.post("/change-password", userAuth, profileController.changePassword);
router.post("/upload-profile-pic",userAuth,uploads.single("profileImage"), profileController.changeProfilePic)

//Address Management
// router.get("/addAddress", userAuth, profileController.getAddAddress);
// router.post('/add-address', userAuth, profileController.addAddress)
// router.get("/editAddress", userAuth, profileController.getEditAddress);
// router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

// Address Management (Add + Edit for Profile & Checkout)
router.get('/address', userAuth, addressController.getAddressPage);              // Add
router.get('/address/:addressId', userAuth, addressController.getAddressPage);   // Edit
router.post('/address/save', userAuth, addressController.saveAddress);  

//Wallet Management
router.post("/addWalletMoney", userAuth, profileController.addWalletMoney);
router.post("/createWalletOrder", userAuth, profileController.createWalletOrder);
router.post("/verifyWalletPayment", userAuth, profileController.verifyWalletPayment);


//Cart Management
router.get("/cart", userAuth, cartController.getCartPage);
router.post("/addToCart",userAuth, cartController.addToCart)
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.post("/removeCartItem", userAuth, cartController.deleteProduct);
router.get('/validate-cart', userAuth, cartController.validateCartBeforeCheckout);

//Order management
router.get("/checkout", userAuth, orderController.getCheckoutPage)
router.post('/check-stock', userAuth, orderController.checkStock)
router.post('/placeOrder', userAuth, orderController.placeOrder)
router.get('/order-success/:orderId', userAuth, orderController.getOrderSuccessPage);
router.get('/payment-failed/:orderId', userAuth, orderController.retryPayment);
router.get('/retry-payment/:orderId', userAuth, orderController.createRetryPayment);
router.get('/viewOrderDetails/:orderId', userAuth, orderController.viewOrderDetails)
router.post('/paymentConfirm',userAuth, orderController.paymentConfirm);

router.post("/cancelOrder",userAuth,orderController.cancelOrder);
router.post('/orders/return-request', userAuth, orderController.returnRequest);

// Wishlist Management
router.get('/wishlist', userAuth, wishlistController.getWishlistPage);
router.post('/addToWishlist', userAuth, wishlistController.addToWishlist);
router.post('/removeFromWishlist', userAuth, wishlistController.removeFromWishlist);


//coupon management
router.get('/available-coupons', userAuth, orderController.getAvailableCoupons)
router.post('/apply-coupon', userAuth, orderController.applyCoupon)
router.get('/cancel-coupon', userAuth, orderController.deleteCoupon)

//Razor pay
router.post("/create-razorpay-order", userAuth, orderController.createRazorpayOrder);
router.post("/verify-razorpay-payment",userAuth, orderController.verifyRazorpayPayment);

module.exports = router