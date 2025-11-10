const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")

const loadBrandPage = async (req, res) => {
  try {
    const brands = await Brand.find().lean();
    res.render("admin/brand", { brands });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading brand page");
  }
};

const addBrand = async (req, res) => {
  try {
    
    const { name, description } = req.body;
    const brandImage = req.file ? req.file.filename : null;

    if (!name) return res.json({ status: false, message: "Brand name is required" });

    const existing = await Brand.findOne({ name });
    if (existing) return res.json({ status: false, message: "Brand already exists" });

    await Brand.create({ name, description, brandImage });
    res.json({ status: true, message: "Brand added successfully" });
  } catch (err) {
    console.error(err);
    res.json({ status: false, message: "Error adding brand" });

  }
};

const editBrand = async (req, res) => {
  try {
    const { id, name, description } = req.body;
    const updateData = { name, description };
    if (req.file) updateData.brandImage = req.file.filename;

    await Brand.findByIdAndUpdate(id, updateData);
    res.json({ status: true, message: "Brand updated successfully" });
  } catch (err) {
    console.error(err);
    res.json({ status: false, message: "Error editing brand" });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.body;
    await Brand.findByIdAndDelete(id);
    res.json({ status: true, message: "Brand deleted successfully" });
  } catch (err) {
    console.error(err);
    res.json({ status: false, message: "Error deleting brand" });
  }
};

const toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.body;
    const brand = await Brand.findById(id);
    brand.isListed = !brand.isListed;
    await brand.save();
    res.json({ status: true, message: `Brand ${brand.isListed ? "listed" : "unlisted"} successfully` });
  } catch (err) {
    console.error(err);
    res.json({ status: false, message: "Error changing brand status" });
  }
};

module.exports = {
  loadBrandPage,
  addBrand,
  editBrand,
  deleteBrand,
  toggleBrandStatus
};
