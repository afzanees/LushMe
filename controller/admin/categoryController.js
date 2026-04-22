const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const { calculateEffectivePrice } = require("./productController");

const addCategory = async (req, res) => {
<<<<<<< HEAD
  try {

    const { name, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Category image is required" });
    }

    // File validation is now handled by multer middleware
    // But we keep this as a secondary check
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only PNG, JPEG, JPG and WEBP images are allowed"
      });
    }

    const categoryImage = req.file.filename;

    if (!name || !description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await Category.findOne({
      name: new RegExp(`^${name.trim()}$`, "i")
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const newCategory = new Category({
      name: name.trim(),
      description,
      categoryImage
    });

    await newCategory.save();

    return res.status(200).json({
      success: true,
      message: "Category added successfully"
    });

  }catch (error) {
  console.error("Add Category Error:", error);
  res.status(500).json({
    success: false,
    message: error.message || "Something went wrong"
  });
}
};
=======
    try {
      const { name, description } = req.body;
      const categoryImage = req.file ? req.file.filename : null;

      console.log('body:', req.body);
    console.log('file:', req.file);
  
      if (!name || !description || !categoryImage) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
  
      const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
      if (existing) {
        return res.status(400).json({ success: false, message: "Category already exists" });
      }
  
      const newCategory = new Category({
        name: name.trim(),
        description,
        categoryImage
      });
  
      await newCategory.save();
      return res.status(200).json({ success: true, message: "Category added successfully" });

    } catch (error) {
      console.error("Add Category Error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  };
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
 
  //Category list
  const categoryInfo = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const skip = (page - 1) * limit;
  
      const searchQuery = req.query.search ? req.query.search.trim() : '';
<<<<<<< HEAD
      const query = { isDeleted: { $ne: true } }; // Only show non-deleted categories
=======
      const query = {};
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  
      if (searchQuery) {
        // Case-insensitive search for category name
        query.name = { $regex: new RegExp(searchQuery, "i") };
      }
  
      const categoryData = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalCategories = await Category.countDocuments(query);
      const totalPages = Math.ceil(totalCategories / limit);
  
      res.render("admin/category", {
        cat: categoryData,
        currentPage: page,
        totalPages,
        totalCategories,
        searchQuery
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.redirect("/pageerror");
    }
  };

  const getListCategory = async (req, res) => {
    try {
      const id = req.query.id
      await Category.findByIdAndUpdate(id, { isListed: true })
      res.json({ success: true, message: "Category listed successfully" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: "Failed to list category" })
    }
  }
  
  const getUnlistCategory = async (req, res) => {
    try {
      const id = req.query.id
      await Category.findByIdAndUpdate(id, { isListed: false })
      res.json({ success: true, message: "Category unlisted successfully" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: "Failed to unlist category" })
    }
  }

  const editCategory = async (req, res) => {
    try {
      const { name, description } = req.body;
      const categoryId = req.params.id;
  
      const updateFields = {
        name,
        description,
      };
  
      if (req.file) {
<<<<<<< HEAD
        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: "Only PNG, JPEG, JPG and WEBP images are allowed"
          });
        }
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        updateFields.categoryImage = req.file.filename;
      }
  
      const updated = await Category.findByIdAndUpdate(categoryId, updateFields, { new: true });
  
      if (!updated) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error updating category" });
    }
  };
  const deleteCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;
<<<<<<< HEAD
      const deleted = await Category.updateOne({ _id: categoryId }, { isDeleted: true });
=======
      const deleted = await Category.findByIdAndDelete(categoryId);
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };

  const addCategoryOffer = async (req, res) => {
    try {
      const { categoryId, percentage, validUntil } = req.body;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
      const pct = Number(percentage);
      if (isNaN(pct) || pct < 1 || pct > 99) {
        return res.json({ status: false, message: "Invalid percentage value" });
      }
  
      if (!validUntil) {
        return res.json({ status: false, message: "Offer valid date required" });
      }
  
      await Category.updateOne(
        { _id: categoryId },
        {
          $set: {
            categoryOffer: pct,
            offerValidUntil: new Date(validUntil)
          }
        }
      );
  
      const products = await Product.find({ category: categoryId });
      for (const product of products) {
        // product.baseFinalPrice = product.finalPrice;

        if (!product.baseFinalPrice) {
          product.baseFinalPrice = product.finalPrice || product.price;
        }
        
      // recalc finalPrice using helper which should read category/subcategory/product offers
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Offer added successfully" });
    } catch (error) {
      console.error("Error in addCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };


  const removeCategoryOffer = async (req, res) => {
    try {
      const { categoryId } = req.body;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      
      await Category.updateOne(
        { _id: categoryId },
        {
          $set: {
            categoryOffer: 0,
            offerValidUntil: null
          }
        }
      );
  
      
      const products = await Product.find({ category: categoryId });
  
      for (const product of products) {
       
        const updatedCategory = await Category.findById(product.category).lean();
        const categoryOffer = updatedCategory?.categoryOffer || 0;
  
        const subcategory = updatedCategory?.subcategories?.find(
          sc => sc._id.toString() === product.subcategory.toString()
        );
        const subcategoryOffer = subcategory?.offer || 0;
        const productOffer = product.offer || 0;
  
        
        if (productOffer === 0 && subcategoryOffer === 0 && categoryOffer === 0) {
          product.finalPrice = product.baseFinalPrice || product.price;
        } else {
          product.finalPrice = await calculateEffectivePrice(product);
        }
  
        await product.save();
      }
  
      res.json({ status: true, message: "Category offer removed and products updated." });
    } catch (error) {
      console.error("Error in removeCategoryOffer:", error);
      return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };

  const addSubcategory = async (req, res) => {
    try {
      const { categoryId, subcategoryName } = req.body;
  
      if (!subcategoryName.trim()) {
        return res.json({ status: false, message: "Subcategory name required" });
      }
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      // Check if subcategory already exists
      const exists = category.subcategories.some(
        (sc) => sc.name.toLowerCase() === subcategoryName.toLowerCase()
      );
  
      if (exists) {
        return res.json({ status: false, message: "Subcategory already exists" });
      }
  
      // Push new subcategory
      category.subcategories.push({ name: subcategoryName });
      await category.save();
  
      res.json({ status: true, message: "Subcategory added successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  };



  
module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    deleteCategory,
    editCategory,
    addSubcategory
    

}