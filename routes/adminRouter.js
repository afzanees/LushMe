const express = require('express')
const router = express.Router();
const adminController = require('../controller/admin/adminController');
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController')
const brandController = require('../controller/admin/brandController')
const productController = require('../controller/admin/productController')
<<<<<<< HEAD
const orderController = require('../controller/admin/orderController')
const couponController = require('../controller/admin/couponController')
const {adminAuth} = require('../middlewares/auth')
const upload = require('../middlewares/multer')
const { handleMulterError } = require('../middlewares/multer')

// Root admin route - redirect to dashboard if authenticated, otherwise to login
router.get('/', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});
=======
const {userAuth,adminAuth} = require('../middlewares/auth')
const upload = require('../middlewares/multer')
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login)
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

<<<<<<< HEAD
//customer management
=======
//custpmer management
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked)


//Category management
router.get('/category', adminAuth, categoryController.categoryInfo);
<<<<<<< HEAD
router.post('/addCategory', adminAuth, upload.single('categoryImage'), handleMulterError, categoryController.addCategory);
=======
router.post('/addCategory', adminAuth, upload.single('categoryImage'), categoryController.addCategory);
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unListCategory', adminAuth, categoryController.getUnlistCategory);
<<<<<<< HEAD
router.post('/editCategory/:id', upload.single('categoryImage'), handleMulterError, adminAuth, categoryController.editCategory);
=======
router.post('/editCategory/:id', upload.single('categoryImage'), adminAuth, categoryController.editCategory);
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
router.delete('/deleteCategory/:id', adminAuth, categoryController.deleteCategory);
router.post('/addSubcategory', adminAuth, categoryController.addSubcategory);
//product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/saveImage", adminAuth, upload.single('image'), productController.saveImage);
<<<<<<< HEAD
router.post("/addProducts", adminAuth, upload.none(), productController.addProducts);
=======
router.post("/addProducts", adminAuth, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), productController.addProducts);
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
router.get("/products",adminAuth,productController.getProductList )
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get('/deleteProduct',adminAuth,productController.deleteProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post("/editProduct/:id/edit", adminAuth, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), productController.editProduct);
<<<<<<< HEAD
router.post("/delete-image",adminAuth,productController.deleteSingleVariantImage);
=======
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
router.post('/addProductOffer', adminAuth,productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);


//
// Brand management routes
router.get("/brand", adminAuth, brandController.loadBrandPage);
router.post("/addBrand", adminAuth, upload.single("brandImage"), brandController.addBrand);
router.post("/editBrand", adminAuth, upload.single("brandImage"), brandController.editBrand);
router.post("/deleteBrand", adminAuth, brandController.deleteBrand);
router.post("/toggleBrandStatus", adminAuth, brandController.toggleBrandStatus);

//product varient
<<<<<<< HEAD
router.get('/product/:id/variants', adminAuth, productController.showProductVariants);
router.post('/product/:productId/variants/add', adminAuth, upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), productController.addProductVariants);
// router.post('/product/:productId/variant/:variantId/delete',productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/delete', adminAuth, productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/edit', adminAuth, upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), productController.updateVariant);

// Order management routes
router.get('/orderList', adminAuth, orderController.getOrderList);
router.get('/order/:orderId', adminAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/status', adminAuth, orderController.updateOrderStatus);
router.post('/orders/:orderId/items/:itemIndex/status', adminAuth, orderController.updateItemStatus);
router.post('/orders/:orderId/cancel', adminAuth, orderController.cancelOrder);
router.post('/orders/:orderId/items/:itemIndex/return', adminAuth, orderController.handleReturnRequest);
router.post('/orders/:orderId/items/:itemIndex/approve-cancellation', adminAuth, orderController.approveCancellation);
router.get('/orders/stats', adminAuth, orderController.getOrderStats);

//Couponmanagement
router.get('/coupon', adminAuth, couponController.loadCouponPage)
router.get('/coupons/add', adminAuth, couponController.loadAddCouponPage)
router.post('/coupons/add', adminAuth, couponController.addCoupon)
router.get('/coupons/edit/:id', adminAuth, couponController.getEditPage)
router.post('/coupons/edit/:id', adminAuth, couponController.editCoupon)
router.delete('/coupons/delete/:id', adminAuth, couponController.deleteCoupon)

router.get('/sales', adminAuth,  adminController.loadSalesPage);
router.get('/report/generate', adminAuth, adminController.loadSalesPage)
router.get('/dashboard-data', adminAuth, adminController.getDashboardData)

module.exports = router;
=======
router.get('/product/:id/variants', productController.showProductVariants);
router.post('/product/:productId/variants/add', productController.addProductVariants);
// router.post('/product/:productId/variant/:variantId/delete',productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/delete', productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/edit', productController.updateVariant);


module.exports = router;
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
