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

const redirectTo = (target) => (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, `${target}${query}`);
};

router.get("/",userController.loadHomepage)
router.get('/pagenotfound',userController.pageNotFound)
router.get('/sign-up',userController.loadRegister);
router.get('/register', redirectTo('/sign-up'));
router.post('/register',userController.register);

router.get('/forgot-password',profileController.loadForgotPassword);
router.post('/forgot-password/send-otp',profileController.forgotPasswordSendOTP)
router.post('/forgot-password/verify-otp',profileController.verifyForgotPasswordOTP)
router.get('/update-password',profileController.loadResetPassword);
router.post('/update-password',profileController.updatePassword);
// router.get('/confirmotp',userController.loadOtp)
router.post('/confirmotp',userController.confirmOtp);
router.post('/resend-otp',userController.resendOTP);
router.get('/sign-in',userController.loadLogin);
router.get('/login', redirectTo('/sign-in'));
router.post('/login',userController.login);
router.get('/logout',userController.logout);
router.get("/products",userController.loadShoppingPage);
router.get('/shop', redirectTo('/products'));
router.get("/filter",userController.filterProduct);
router.get("/products/:slug",productController.productDetails);
router.get('/productDetails/:slug', (req, res) => {
  res.redirect(301, `/products/${req.params.slug}`);
});

// router.get('/userProfile',userAuth,profileController.userProfile);
router.get('/account',userAuth,profileController.userProfile);
router.get('/profile', userAuth, redirectTo('/account'));
router.get("/account/change-email", userAuth, profileController.changeEmail);
router.get('/change-email', userAuth, redirectTo('/account/change-email'));
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.post('/updateProfile', userAuth,profileController.updateProfile);
router.get("/account/change-password", userAuth, profileController.getChangePassword);
router.get('/change-password', userAuth, redirectTo('/account/change-password'));
router.post("/change-password", userAuth, profileController.changePassword);
router.post("/upload-profile-pic",userAuth,uploads.single("profileImage"), profileController.changeProfilePic)
router.post('/remove-profile-pic', userAuth, profileController.removeProfilePic)

//Address Management
// router.get("/addAddress", userAuth, profileController.getAddAddress);
// router.post('/add-address', userAuth, profileController.addAddress)
// router.get("/editAddress", userAuth, profileController.getEditAddress);
// router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

// Address Management (Add + Edit for Profile & Checkout)
router.get('/account/address', userAuth, addressController.getAddressPage);              // Add
router.get('/account/address/:addressId', userAuth, addressController.getAddressPage);   // Edit
router.get('/address', userAuth, redirectTo('/account/address'));
router.get('/address/:addressId', userAuth, (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, `/account/address/${req.params.addressId}${query}`);
});
router.post('/address/save', userAuth, addressController.saveAddress);  

//Wallet Management
router.post("/createWalletOrder", userAuth, profileController.createWalletOrder);
router.post("/verifyWalletPayment", userAuth, profileController.verifyWalletPayment);


//Cart Management
router.get("/my-cart", userAuth, cartController.getCartPage);
router.get('/cart', userAuth, redirectTo('/my-cart'));
router.post("/addToCart",userAuth, cartController.addToCart)
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.post("/removeCartItem", userAuth, cartController.deleteProduct);
router.get('/validate-cart', userAuth, cartController.validateCartBeforeCheckout);

//Order management
router.get("/secure-checkout", userAuth, orderController.getCheckoutPage)
router.get('/checkout', userAuth, redirectTo('/secure-checkout'));
router.post('/check-stock', userAuth, orderController.checkStock)
router.post('/placeOrder', userAuth, orderController.placeOrder)
router.get('/orders/success/:orderId', userAuth, orderController.getOrderSuccessPage);
router.get('/order-success/:orderId', userAuth, (req, res) => {
  res.redirect(301, `/orders/success/${req.params.orderId}`);
});
router.get('/orders/payment-failed/:orderId', userAuth, orderController.retryPayment);
router.get('/payment-failed/:orderId', userAuth, (req, res) => {
  res.redirect(301, `/orders/payment-failed/${req.params.orderId}`);
});
router.get('/retry-payment/:orderId', userAuth, orderController.createRetryPayment);
router.get('/orders/:orderId', userAuth, orderController.viewOrderDetails)
router.get('/viewOrderDetails/:orderId', userAuth, (req, res) => {
  res.redirect(301, `/orders/${req.params.orderId}`);
});
router.post('/paymentConfirm',userAuth, orderController.paymentConfirm);

router.post("/cancelOrder",userAuth,orderController.cancelOrder);
router.post('/orders/return-request', userAuth, orderController.returnRequest);

// Wishlist Management
router.get('/my-wishlist', userAuth, wishlistController.getWishlistPage);
router.get('/wishlist', userAuth, redirectTo('/my-wishlist'));
router.post('/addToWishlist', userAuth, wishlistController.addToWishlist);
router.post('/removeFromWishlist', userAuth, wishlistController.removeFromWishlist);


//coupon management
router.get('/available-coupons', userAuth, orderController.getAvailableCoupons)
router.post('/apply-coupon', userAuth, orderController.applyCoupon)
router.get('/cancel-coupon', userAuth, orderController.deleteCoupon)

//Razor pay
router.post("/create-razorpay-order", userAuth, orderController.createRazorpayOrder);
router.post("/verify-razorpay-payment",userAuth, orderController.verifyRazorpayPayment);
router.get("/productDetails",productController.productDetails);


module.exports = router
