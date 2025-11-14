const express = require('express')
const router = express.Router();
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const bcrypt = require('bcrypt');
const profileController = require('../controller/user/profileController');

router.get("/",userController.loadHomepage)
router.get('/pagenotfound',userController.pageNotFound)
router.get('/register',userController.loadRegister);
router.post('/register',userController.register);

router.get('/forgot-password',profileController.loadForgotPassword);
router.post('/forgot-password/send-otp',profileController.forgotPasswordSendOTP)
router.post('/forgot-password/verify-otp',profileController.verifyForgotPasswordOTP)
// router.get('/confirmotp',userController.loadOtp)
router.post('/confirmotp',userController.confirmOtp);
router.post('/resend-otp',userController.resendOTP);
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/logout',userController.logout);
router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);
router.get("/productDetails",productController.productDetails);



module.exports = router