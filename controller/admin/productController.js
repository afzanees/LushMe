const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const multer = require('multer');
const mongoose = require('mongoose');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const path = require("path")
const fs = require("fs")
const sharp = require("sharp")
<<<<<<< HEAD
const slugify = require("slugify");

=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

const calculateEffectivePrice = async (product) => {
 
  const category = await Category.findById(product.category).lean();

  const categoryOffer = category?.categoryOffer || 0;

<<<<<<< HEAD
  const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
  const subcategoryOffer = subcat?.offer || 0;

  const productOffer = product.productOffer || 0; 
=======

  const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
  const subcategoryOffer = subcat?.offer || 0;

  const productOffer = product.offer || 0; 
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

  
  const effectiveOffer = Math.max(categoryOffer, subcategoryOffer, productOffer);


  const effectivePrice = product.price * (1 - effectiveOffer / 100);
  // const effectivePrice = product.finalPrice * (1 - effectiveOffer / 100);

 
  return Math.round(effectivePrice * 100) / 100;
};





<<<<<<< HEAD


=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
const getProductAddPage = async (req, res) => {
  try {
  
    const categories = await Category.find({ isListed: true })
      .select('name subcategories')
      .sort({ createdAt: -1 })
      .lean();

    
    let subcategories = [];
    categories.forEach(cat => {
      if (cat.subcategories && cat.subcategories.length > 0) {
        subcategories = subcategories.concat(cat.subcategories);
      }
    });

    
    const brand = await Brand.find({ isListed:true }).sort({ createdAt: -1 });


    res.render('admin/add-products', {
      cat: categories,
      subcat: subcategories,
      brand: brand
    });
  } catch (error) {
    console.error("Error loading product add page:", error);
    res.status(500).json({ success: false, message: "Error loading product add page" });
  }
};

  const saveImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const uploadDir = path.join(__dirname, "../../public/uploads/categoryImages");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + '-' + file.originalname.replace(/\s/g, "");
    const filepath = path.join(uploadDir, filename);

    await sharp(file.buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    return res.status(200).json({ success: true, message: "Image saved successfully", filename });
  } catch (error) {
    console.error("Error saving image:", error);
    return res.status(500).json({ success: false, message: "Error saving image" });
  }
};

const addProducts = async (req, res) => {
  try {
    const {
      name,
      description,
      brand,
      category,
      subcategory,
<<<<<<< HEAD
=======
      regularPrice,
      finalPrice,
      color,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
      status
    } = req.body;

    console.log("Received subcategory:", subcategory);

<<<<<<< HEAD
    // ✅ Validate required fields with specific messages
    const missingFields = [];
    if (!name || !name.trim()) missingFields.push("Product Name");
    if (!description || !description.trim()) missingFields.push("Description");
    if (!brand) missingFields.push("Brand");
    if (!category) missingFields.push("Category");
    if (!subcategory) missingFields.push("Subcategory");
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }
    
    // ✅ Strong validation for product name
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Product name must be at least 3 characters long",
      });
    }
    
    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Product name must not exceed 100 characters",
      });
    }
    
    // Check if name contains at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name must contain at least one letter or number",
      });
    }
    
    // Prevent names with only special characters
    if (/^[^a-zA-Z0-9]+$/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot contain only special characters",
      });
    }
    
    // Prevent names with only spaces or whitespace characters
    if (/^\s+$/.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot contain only spaces",
      });
    }
    
    // Check if name starts with alphanumeric character
    if (!/^[a-zA-Z0-9]/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name must start with a letter or number",
      });
    }
    
    // Check for duplicate product names (case-insensitive)
    const existingProduct = await Product.findOne({ 
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });
    
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "A product with this name already exists",
      });
    }
    
    // Validate description
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters long",
      });
    }
    
    if (trimmedDescription.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description must not exceed 2000 characters",
      });
    }
    
    // Validate brand exists
    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      return res.status(400).json({
        success: false,
        message: "Selected brand does not exist",
      });
    }
    
    if (!brandExists.isListed) {
      return res.status(400).json({
        success: false,
        message: "Selected brand is not active",
      });
    }
    
    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not exist",
      });
    }
    
    if (!categoryExists.isListed) {
      return res.status(400).json({
        success: false,
        message: "Selected category is not active",
      });
    }
    
    // Validate subcategory exists within the category
    const subcategoryExists = categoryExists.subcategories.find(
      sub => sub._id.toString() === subcategory.toString()
    );
    
    if (!subcategoryExists) {
      return res.status(400).json({
        success: false,
        message: "Selected subcategory does not exist in this category",
      });
    }
    
    if (!subcategoryExists.isListed || subcategoryExists.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Selected subcategory is not active",
      });
    }

    let slug = slugify(trimmedName, {
      lower: true,
      strict: true,
    });

    const slugExists = await Product.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Date.now()}`;
    }

   // ✅ Create new product document without images
   const newProduct = new Product({
    name: trimmedName,
    description: trimmedDescription,
    brand,
    slug,
    category,
    subcategory,
    productImage: [], // Empty array, images will be added via variants
=======
    // ✅ Parse numeric fields
    const price = parseFloat(regularPrice);
    const salePrice = parseFloat(finalPrice);

    // ✅ Validate required fields
    if (
      !name || !description || !brand || !category || !subcategory ||
      isNaN(price) || isNaN(salePrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required fields",
      });
    }

    // ✅ Ensure upload directory exists
    const uploadDir = path.join(__dirname, "../../public/uploads/product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageFilenames = [];
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];
      if (croppedImageData && croppedImageData.startsWith("data:image")) {
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filename = `${Date.now()}-image${i}.webp`;
        const filepath = path.join(uploadDir, filename);
        await sharp(imageBuffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
        imageFilenames.push(`uploads/product-images/${filename}`);
      }
    }

   // ✅ Create new product document
   const newProduct = new Product({
    name,
    description,
    brand,
    category,
    subcategory, // ✅ now it matches
    regularPrice: price,
    salePrice: salePrice,
    color: color || "N/A",
    productImage: imageFilenames,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    status: ["Available", "Out Of Stock", "Discontinued"].includes(status)
      ? status
      : "Available",
  });
<<<<<<< HEAD
    console.log({ name: trimmedName, description: trimmedDescription, brand, category, subcategory, status });
=======
    console.log({ name, description, brand, category, subcategory, regularPrice, salePrice, color, imageFilenames, status });

    await newProduct.validate().catch(err => {
      console.error("❌ Mongoose validation error:", err.message);
      throw err;
    });
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

    await newProduct.save();

    
<<<<<<< HEAD
    return res.status(200).json({ 
      success: true, 
      message: "Product added successfully",
      productId: newProduct._id 
    });
=======
    return res.status(200).json({ success: true, message: "Product added successfully" });
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  } catch (error) {
    console.error("🔥 ERROR adding product:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
<<<<<<< HEAD
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${errors.join(", ")}` 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "A product with this name or slug already exists" 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid ${error.path}: ${error.value}` 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: error.message || "An unexpected error occurred while adding product" 
    });
=======
    console.error("Full error object:", error);
    return res.status(500).json({ success: false, message: "Server error while adding product" });
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  }
};





const getProductList = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 9;

    const query = { name: { $regex: search, $options: 'i' } };

    const productData = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('brand','name')
      .populate('category','name subcategories')
      .lean();
      console.log(await Product.find().populate('category', 'name subcategories').lean());
      
      for (const product of productData) {
        if (product.category?.subcategories && product.subcategory) {
          const subObj = product.category.subcategories.find(sub =>
            sub._id.toString() === product.subcategory.toString()
          );
          product.subCategoryDetails = subObj || null;
        } else {
          product.subCategoryDetails = null;
        }
      }
      
      
      //     // If not found by _id or subcategory is not ObjectId, fallback to search by name
      //     if (!subcategoryObj) {
      //       subcategoryObj = product.category.subcategories.find(sub => 
      //         sub.name === product.subcategory
      //       );
      //     }
      
      //
      
    const count = await Product.countDocuments(query);
    const totalPages = Math.ceil(count / limit);
    const categories = await Category.find({ isListed: true }).lean();
    const brand=await Brand.find({isListed:true}).lean();
    res.render('admin/product', {
      products: productData,
      currentPage: page,
      totalPages,
      cat: categories,
      brand:brand,
      searchQuery: search,
      pageSize: limit
    });
  } catch (error) {
    console.error('Error fetching products:', error.stack || error);
    res.status(500).send('Server Error');
  }
};

const blockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    let currentPage = req.query.page || 1;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect(`/admin/products?page=${currentPage}`)
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const unblockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/products")
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const deleteProduct = async (req, res) => {
  const productId = req.query.id;
  
  if (!productId) {
      return res.status(400).json({ status: false, message: 'Product ID is required' });
  }
  
  try {
      
      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
          return res.status(404).json({ status: false, message: 'Product not found' });
      }

      res.redirect('/admin/products'); 
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: 'Server Error' });
  }
}
  
const getEditProduct=async (req,res)=>{
  try {
    const id = req.query.id
    const product = await Product.findById(id)
    .populate({
      path: 'category',
     })
    .populate('brand')
    .lean()
   if (!product) {
      return res.status(404).send("Product not found")
    }
    const categories = await Category.find({isListed: true })
    .select('name subcategories')
    .lean();
<<<<<<< HEAD
    const brand = await Brand.find({isListed: true}).lean();
    console.log('Brands found:', brand.length, brand.map(b => b.name));
=======
    const brand = await Brand.find({isListed:true}).lean();
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    res.render("admin/edit-product", {
      product: product,
      brand:brand,
      cat: categories,
      // subcat: subcategories
    })
  } catch (error) {
    console.error("Error in getEditProduct:", error)
    res.redirect("/pageerror")
  }

}

const editProduct = async (req, res) => {
  try{
    const id = req.params.id
    const {
      name,
      description,
      brand,
      category,
      subcategory,
<<<<<<< HEAD
=======
      regularPrice,
      finalPrice,
      material,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
      status
    } = req.body;
    console.log({ category, subcategory });

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
    if (!mongoose.Types.ObjectId.isValid(subcategory)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory id" });
    }
<<<<<<< HEAD
    
    // ✅ Strong validation for product name
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Product name must be at least 3 characters long",
      });
    }
    
    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Product name must not exceed 100 characters",
      });
    }
    
    // Check if name contains at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name must contain at least one letter or number",
      });
    }
    
    // Prevent names with only special characters
    if (/^[^a-zA-Z0-9]+$/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot contain only special characters",
      });
    }
    
    // Prevent names with only spaces
    if (/^\s+$/.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot contain only spaces",
      });
    }
    
    // Check if name starts with alphanumeric character
    if (!/^[a-zA-Z0-9]/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Product name must start with a letter or number",
      });
    }

    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
=======

    const existingProduct = await Product.findOne({
      name: name,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
      _id: { $ne: id },
    })

    if (existingProduct) {
      return res
        .status(400)
        .json({ success: false, message: "Product with this name already exists. Please try another name." })
    }
<<<<<<< HEAD
    
    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }
    
    // Update slug if name has changed
    if (product.name !== trimmedName) {
      let slug = slugify(trimmedName, {
        lower: true,
        strict: true,
      });
      
      // Check if slug already exists
      const slugExists = await Product.findOne({ slug, _id: { $ne: id } });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
      product.slug = slug;
    }
    
    const updateFields = {
      name: trimmedName,
=======
    const updateFields = {
      name,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
      description,
      brand,
      category,
      subcategory,
<<<<<<< HEAD
      status
    }
=======
      regularPrice,
      finalPrice,
      material,
      status
    }
    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2

    

    if (!product.images) {
      product.images = [];
    }
    
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];
      const fileField = req.files ? req.files[`image${i}`] : null;
    
      if (croppedImageData && croppedImageData.startsWith('data:image')) {
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `${Date.now()}-cropped-image-${i}.webp`;
        const filepath = path.join(__dirname, '../../public/uploads/product-images', filename);
    
        await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toFile(filepath);
    
        const imagePath = `uploads/product-images/${filename}`;
        product.images[i - 1] = imagePath;
    
      } else if (fileField && fileField.length > 0) {
        const file = fileField[0];
        const filename = `${Date.now()}-${file.originalname.replace(/\s/g, '')}.webp`;
        const filepath = path.join(__dirname, '../../public/uploads/product-images', filename);
    
        await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
    
        const imagePath = `uploads/product-images/${filename}`;
        product.images[i - 1] = imagePath;
    
      } else {
        if (!product.images[i - 1]) {
          product.images[i - 1] = '';
        }
      }
    }
    
    // Now update all other fields manually:
    product.name = name;
    product.description = description;
    product.brand = brand;
    product.category = category;
    product.subcategory = subcategory;
<<<<<<< HEAD

=======
    product.price = regularPrice;
    product.finalPrice = finalPrice;
    product.baseFinalPrice =finalPrice;
    product.material = material;
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    product.status = status;
    
    await product.save();
    
    res.json({ success: true, message: "Product updated successfully" });

  }catch (err){
    console.error("Error in editProduct:", err);
    res.status(500).json({ success: false, message: "An error occurred while updating the product" });
  }
}
 
<<<<<<< HEAD
const deleteSingleVariantImage = async (req, res) => {
  try {
    const { productId, variantId, imageIndex } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ status: false, message: "Invalid product or variant ID" });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ status: false, message: "Product not found" });

    // Find variant
    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ status: false, message: "Variant not found" });

    // Make sure productImage exists and image index valid
    if (!variant.productImage || !variant.productImage[imageIndex]) {
      return res.status(400).json({ status: false, message: "Image not found in variant" });
    }

    // Get image path
    const imageToDelete = variant.productImage[imageIndex];

    // Remove from DB array
    variant.productImage.splice(imageIndex, 1);
    await product.save();

    // Remove actual file
    const filePath = path.join(__dirname, "../../public", imageToDelete);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Deleted:", filePath);
    }

    return res.json({ status: true, message: "Variant image deleted successfully" });

  } catch (error) {
    console.error("Error deleting variant image:", error);
    return res.status(500).json({ status: false, message: "Server error while deleting image" });
=======
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer, imageIndex } = req.body;
    console.log("Deleting:", imageNameToServer, productIdToServer, imageIndex);

    // Find product
    const product = await Product.findById(productIdToServer);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // Make sure productImage array exists
    if (!Array.isArray(product.productImage)) {
      return res.status(400).json({ status: false, message: "No images found for this product" });
    }

    // Delete image from array
    product.productImage.splice(imageIndex, 1);
    await product.save();

    // Delete the file from server storage
    const imagePath = path.join(__dirname, "../../public", imageNameToServer);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`🗑️ Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`⚠️ Image file not found: ${imageNameToServer}`);
    }

    res.json({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    res.status(500).json({ status: false, message: "An error occurred while deleting the image" });
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  }
};

//Product varient section
const showProductVariants=async (req,res)=>{
  const productId=req.params.id;
  try{
    const product=await Product.findById(productId).lean();
<<<<<<< HEAD
    console.log('Product ID:', product._id);
    console.log('Product variants:', JSON.stringify(product.variants, null, 2));
    
=======
    console.log(product._id)
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    if(!product)
    {
      return res.status(404).send('product not found')
    }
    res.render("admin/product-varients", { 
      admin: req.session.admin,  // ✅ this line
      product,
      title: "Product Variants"
    })
  }catch(err){
    console.error(err);
      res.status(500).json({ status: false, message: 'Server Error' });
  }

}
const addProductVariants=async(req,res)=>{
  try{
<<<<<<< HEAD
    // ✅ First check if req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, message: 'No form data received. Make sure form is submitted properly.' });
    }

    const { color, regularPrice, salePrice, quantity } = req.body;
    const productId = req.params.productId;

    console.log("📦 Received data:", { color, regularPrice, salePrice, quantity, productId });

    if (!color || typeof color !== 'string' || color.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Color is required and cannot be empty' });
    }
    
    if (!regularPrice || typeof regularPrice !== 'string' || regularPrice.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Regular price is required' });
    }
    
    if (!salePrice || typeof salePrice !== 'string' || salePrice.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Sale price is required' });
    }
    
    if (quantity == null || quantity === '') {
      return res.status(400).json({ success: false, message: 'Quantity is required' });
    }
    
    const salePriceNum = parseFloat(salePrice);
    const regularPriceNum = parseFloat(regularPrice);
    const qtyNum = parseInt(quantity);
    
    if (isNaN(salePriceNum) || salePriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Sale price must be a valid number greater than 0' });
    }
    
    if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Regular price must be a valid number greater than 0' });
    }
    
    if (salePriceNum > regularPriceNum) {
      return res.status(400).json({ success: false, message: 'Sale price cannot be greater than regular price' });
    }
    
    if (isNaN(qtyNum) || qtyNum < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative integer' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const existingVariant = product.variants.find(v =>
      v.color.toLowerCase() === color.trim().toLowerCase()
    );
    
    if (existingVariant) {
      return res.status(400).json({ success: false, message: `Variant with color "${color}" already exists` });
    }

    // ✅ Ensure upload directory exists
    const uploadDir = path.join(__dirname, "../../public/uploads/product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const supportedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const imageFilenames = [];
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];


  // ADD THIS — see exactly what's coming from frontend
  console.log(`image${i} received:`, croppedImageData ? croppedImageData.substring(0, 60) : 'EMPTY');


  
      if (croppedImageData && croppedImageData.startsWith("data:image")) {
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, "");

        

              // Extract mime from base64 string e.g. "data:image/jpeg;base64,..."
      const mimeMatch = croppedImageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : null;

        // ADD THIS — see what mime is being detected
    console.log(`image${i} mime:`, mime);

      if (!mime || !supportedMimes.includes(mime)) {
        return res.status(400).json({ success: false, message: "Unsupported image format" });
      }

        const imageBuffer = Buffer.from(base64Data, "base64");
        const filename = `${Date.now()}-image${i}.webp`;
        const filepath = path.join(uploadDir, filename);
        await sharp(imageBuffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
        imageFilenames.push(`uploads/product-images/${filename}`);
      }
    }

    product.variants.push({
      color: color.trim(),
      regularPrice: regularPriceNum,
      salePrice: salePriceNum,
      quantity: qtyNum,
      productImage: imageFilenames // ✅ Add images to variant
    });

    await product.save();
    return res.status(200).json({ success: true, message: 'Variant added successfully', redirectUrl: `/admin/product/${productId}/variants` });
  } catch (err) {
    console.error("🔥 REAL ERROR →", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Internal server error while adding variant'
    });
=======
    const { color, price,quantity } = req.body;
    const productId = req.params.productId;
    if (!color || !price || quantity == null) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (quantity < 0) {
      return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'product not found' });
    }
    const existingVariant = product.variants.find(v =>
      v.color.toLowerCase() === color.toLowerCase()
      //  && v.size.toLowerCase() === size.toLowerCase()
    );
    if (existingVariant) {
      return res.status(400).json({ success: false, message: 'Variant with same color and price already exists' });
    }
    product.variants.push({
      color,
      price,
      quantity: parseInt(quantity)
    });

    await product.save();
    return res.redirect(`/admin/product/${productId}/variants`);
  } catch (err) {
    console.error('Add Subcategory Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  }
}


const deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $pull: { variants: { _id: variantId } } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send('Product not found');
    }

    // Redirect back to the variants management page (adjust the URL as needed)
    res.redirect(`/admin/product/${productId}/variants`);
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).send('Server error');
  }
};

const updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
<<<<<<< HEAD
    const { color, regularPrice, salePrice, quantity } = req.body;

    if (!color || typeof color !== 'string' || color.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Color is required and cannot be empty' });
    }

    if (!salePrice || typeof salePrice !== 'string' || salePrice.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Sale price is required' });
    }

    if (!regularPrice || typeof regularPrice !== 'string' || regularPrice.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Regular price is required' });
    }

    const salePriceNum = parseFloat(salePrice);
    const regularPriceNum = parseFloat(regularPrice);
    
    if (isNaN(salePriceNum) || salePriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Sale price must be a valid number greater than 0' });
    }
    
    if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Regular price must be a valid number greater than 0' });
    }
    
    if (salePriceNum > regularPriceNum) {
      return res.status(400).json({ success: false, message: 'Sale price cannot be greater than regular price' });
=======
    const { color, price, quantity } = req.body;

    if (!color || typeof color !== 'string' || color.trim().length === 0) {
      return res.status(400).send('Invalid color');
    }

    if (!price || typeof price !== 'string' || price.trim().length === 0) {
      return res.status(400).send('Invalid price (max 4 chars)');
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    }

    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 0) {
<<<<<<< HEAD
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative integer' });
=======
      return res.status(400).send('Quantity must be a non-negative integer');
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    }

  
    const product = await Product.findById(productId);
    if (!product) {
<<<<<<< HEAD
      return res.status(404).json({ success: false, message: 'Product not found' });
=======
      return res.status(404).send('Product not found');
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    }

    // Find variant index
    const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
    if (variantIndex === -1) {
<<<<<<< HEAD
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }
    
    // Update basic fields
    product.variants[variantIndex].color = color;
    product.variants[variantIndex].regularPrice = parseFloat(regularPrice)
    product.variants[variantIndex].salePrice = parseFloat(salePrice)
    product.variants[variantIndex].quantity = parseInt(quantity);

    // Process new images if uploaded
    const uploadDir = path.join(__dirname, "../../public/uploads/product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const newImageFilenames = [];
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];
      const deleteImage = req.body[`deleteImage${i}`];
      
      if (croppedImageData && croppedImageData.startsWith("data:image")) {
        // New image uploaded - process it
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filename = `${Date.now()}-variant-image${i}.webp`;
        const filepath = path.join(uploadDir, filename);
        await sharp(imageBuffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
        newImageFilenames.push(`uploads/product-images/${filename}`);
      } else if (deleteImage === 'true') {
        // Image marked for deletion - skip it (don't add to array)
        console.log(`Image ${i} marked for deletion, skipping...`);
      } else if (product.variants[variantIndex].productImage && product.variants[variantIndex].productImage[i - 1]) {
        // Keep existing image if no new one uploaded and not marked for deletion
        newImageFilenames.push(product.variants[variantIndex].productImage[i - 1]);
      }
    }

    // Update images array
    product.variants[variantIndex].productImage = newImageFilenames;

    
    await product.save();
    return res.status(200).json({ success: true, message: 'Variant updated successfully', redirectUrl: `/admin/product/${productId}/variants` });
  } catch (error) {
    console.error('Error updating variant:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error while updating variant' });
=======
      return res.status(404).send('Variant not found');
    }
    product.variants[variantIndex].color = color;
    product.variants[variantIndex].price = price;
    product.variants[variantIndex].quantity = parseInt(quantity);

    
    await product.save();
    res.redirect(`/admin/product/${productId}/variants`);
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).send('Internal server error');
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage, validUntil } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    if (isNaN(percentage) || percentage < 1 || percentage > 99) {
      return res.json({ status: false, message: "Invalid percentage value" });
    }

    if (!validUntil) {
      return res.json({ status: false, message: "Offer valid date required" });
    }

    // await Product.updateOne(
    //   { _id: productId },
    //   {
    //     $set: {
    //       Offer: percentage,
    //       offerValidUntil: new Date(validUntil)
    //     }
    //   }
    // );
      // product.baseFinalPrice = product.finalPrice; 
<<<<<<< HEAD
      product.productOffer = parseInt(percentage);
=======
      product.offer = parseInt(percentage);
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
      product.offerValidUntil = new Date(validUntil)
      product.finalPrice = await calculateEffectivePrice(product);
      await product.save();
    

    res.json({ status: true, message: "Offer added successfully" });
  } catch (error) {
    console.error("Error in addCategoryOffer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // Unset the offer fields
    await Product.updateOne(
      { _id: productId },
      {
        $unset: {
<<<<<<< HEAD
          productOffer: "",
=======
          offer: "",
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
          offerValidUntil: ""
        }
      }
    );

    const updatedProduct = await Product.findById(productId);

    // Detect if category or subcategory offer exists
    const category = await Category.findById(updatedProduct.category).lean();
    const categoryOffer = category?.categoryOffer || 0;
    const subcat = category?.subcategories?.find(sc => sc._id.toString() === updatedProduct.subcategory.toString());
    const subcategoryOffer = subcat?.offer || 0;

    // If no other offer is present, restore baseFinalPrice
    if (categoryOffer === 0 && subcategoryOffer === 0) {
      updatedProduct.finalPrice = updatedProduct.baseFinalPrice;
    } else {
      // Else recalculate with the remaining offers
      updatedProduct.finalPrice = await calculateEffectivePrice(updatedProduct);
    }

    await updatedProduct.save();

    res.json({ status: true, message: "Offer removed successfully" });
  } catch (error) {
    console.error("Error in removeProductOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};



module.exports={
     getProductAddPage,
     saveImage,
     addProducts,
     getProductList,
     blockProduct,
     unblockProduct,
     deleteProduct,
     getEditProduct,
     editProduct,
<<<<<<< HEAD
    deleteSingleVariantImage,
=======
     deleteSingleImage,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
     showProductVariants,
     addProductVariants,
     deleteVariant,
     updateVariant,
     addProductOffer,
     removeProductOffer,
     calculateEffectivePrice 
   }