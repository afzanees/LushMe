const User = require("../models/userSchema");
const { HTTP_STATUS, USER_ROLES } = require("../utils/constants");
const { asyncHandler, AppError } = require("./errorhandling");

/**
 * User authentication middleware
 * Protects user routes and blocks access for blocked users
 */
const userAuth = asyncHandler(async (req, res, next) => {
  // Check if user session exists
  if (!req.session.user) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Please login to continue' 
      });
    }
    return res.redirect('/login');
  }

  // Verify user exists and is not blocked
  const user = await User.findById(req.session.user);
  
  if (!user) {
    delete req.session.user;
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Invalid session. Please login again' 
      });
    }
    return res.redirect('/login');
  }

  if (user.isBlocked) {
    delete req.session.user;
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        success: false, 
        message: 'Your account has been blocked. Please contact support' 
      });
    }
    return res.redirect('/login?error=blocked');
  }

  // Attach user to request object for use in controllers
  req.user = user;
  next();
});

/**
 * Admin authentication middleware
 * Protects admin routes and verifies admin privileges
 */
// const adminAuth = asyncHandler(async (req, res, next) => {
//   // Check if admin session exists
//   if (!req.session.admin) {
//     return res.redirect("/admin/login");
//   }

//   // Verify admin exists and has admin privileges
//   const admin = await User.findById(req.session.admin);
  
//   if (!admin || !admin.isAdmin) {
//     req.session.destroy((err) => {
//       if (err) console.error("Session destroy error:", err);
//       res.redirect("/admin/login");
//     });
//     return;
//   }

//   // Attach admin to response locals and request for use in views/controllers
//   res.locals.admin = admin;
//   req.admin = admin;
//   next();
// });


const adminAuth = asyncHandler(async (req, res, next) => {
  // ❗ Check admin session
  if (!req.session.admin) {

    // If request comes from fetch / AJAX
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Admin login required'
      });
    }

    // Normal browser navigation
    return res.redirect('/admin/login');
  }

  // Verify admin user
  const admin = await User.findById(req.session.admin);

  if (!admin || !admin.isAdmin) {
    req.session.destroy(() => {});

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized admin access'
      });
    }

    return res.redirect('/admin/login');
  }

  res.locals.admin = admin;
  req.admin = admin;
  next();
});

module.exports = {
  userAuth,
  adminAuth,
};
