const express = require('express')
const router = express.Router();
const adminController = require('../controller/admin/adminController');
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController')
const brandController = require('../controller/admin/brandController')
const productController = require('../controller/admin/productController')
const orderController = require('../controller/admin/orderController')
const {adminAuth} = require('../middlewares/auth')
const upload = require('../middlewares/multer')

router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login)
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//customer management

router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked)


//Category management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, upload.single('categoryImage'), categoryController.addCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unListCategory', adminAuth, categoryController.getUnlistCategory);
router.post('/editCategory/:id', upload.single('categoryImage'), adminAuth, categoryController.editCategory);
router.delete('/deleteCategory/:id', adminAuth, categoryController.deleteCategory);
router.post('/addSubcategory', adminAuth, categoryController.addSubcategory);
//product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/saveImage", adminAuth, upload.single('image'), productController.saveImage);
router.post("/addProducts", adminAuth, upload.none(), productController.addProducts);
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
router.post("/delete-image",adminAuth,productController.deleteSingleVariantImage);
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
router.get('/product/:id/variants', productController.showProductVariants);
router.post('/product/:productId/variants/add', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), productController.addProductVariants);
// router.post('/product/:productId/variant/:variantId/delete',productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/delete', productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/edit', upload.fields([
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
router.get('/orders/stats', adminAuth, orderController.getOrderStats);


module.exports = router;