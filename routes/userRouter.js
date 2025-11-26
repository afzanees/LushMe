const express = require('express')
const router = express.Router();
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const bcrypt = require('bcrypt');
const profileController = require('../controller/user/profileController');
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
router.get("/productDetails",productController.productDetails);

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
router.get("/addAddress", userAuth, profileController.getAddAddress);
router.post('/add-address', userAuth, profileController.addAddress)
router.get("/editAddress", userAuth, profileController.getEditAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

//Wallet Management
router.post("/createWalletOrder", userAuth, profileController.createWalletOrder);
router.post("/verifyWalletPayment", userAuth, profileController.verifyWalletPayment);


module.exports = router