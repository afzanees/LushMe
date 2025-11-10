const express = require('express')
const router = express.Router();
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')

router.get("/",userController.loadHomepage)
router.get('/pagenotfound',userController.pageNotFound)
router.get('/register',userController.loadRegister);
router.post('/register',userController.register);
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