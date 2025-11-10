const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");

const pageerror = async (req, res) => {
    try {
      let admin = null;
  
      if (req.session.admin) {
        admin = await User.findById(req.session.admin);
      }
  
      res.render('admin/pageerror', { admin });
    } catch (error) {
      console.error("Page Error:", error);
      res.status(500).send("Internal Server Error");
    }
  };

const loadLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin/dashboard");
  res.render("admin/login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: 1 });

    if (!admin) return res.render("admin/login", { message: "Admin not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.render("admin/login", { message: "Incorrect password" });

    req.session.admin = admin._id;
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.render("admin/login", { message: "Server error" });
  }
};


const loadDashboard = async (req, res) => {
    try {
      if (!req.session.admin) {
        return res.redirect("/admin/login");
      }
  
      // 🧩 Fetch the logged-in admin details
      const admin = await User.findById(req.session.admin);
  
      // 🧮 Example: Fetch simple statistics (replace with real data if needed)
      const totalUsers = await User.countDocuments({ isAdmin: 0 }); // count only normal users
      const totalAdmins = await User.countDocuments({ isAdmin: 1 });
  
      const stats = {
        users: totalUsers,
        admins: totalAdmins,
        // you can add more stats like totalOrders, totalProducts, etc.
      };
  
      // 👇 Now pass both admin and stats to the EJS file
      res.render("admin/dashboard", { admin, stats });
    } catch (error) {
      console.error("Dashboard load error:", error);
      res.redirect("admin/pageerror");
    }
  };

  const logout = async (req, res) => {
    try {
        if (req.session.admin) {
            delete req.session.admin; 
        }
        res.redirect('/admin/login'); 
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('admin/pageerror');
    }
};


module.exports = { 
    loadLogin, 
    login, 
    loadDashboard,
    pageerror,
    logout,
};


