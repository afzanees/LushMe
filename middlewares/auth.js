const User = require("../models/userSchema");
<<<<<<< HEAD
const { HTTP_STATUS } = require("../utils/constants");
const { asyncHandler } = require("./errorhandling");

/**
 * User authentication middleware
 * Protects user routes and blocks access for blocked users
 */
const userAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.user && !req.user) {
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Please login to continue",
      });
    }
    return res.redirect("/login");
  }

  const sessionUser = req.session.user;
  const userId = req.user?._id || (sessionUser && (sessionUser._id || sessionUser));
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    delete req.session.user;
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid session. Please login again",
      });
    }
    return res.redirect("/login");
  }

  if (user.isBlocked) {
    delete req.session.user;
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Your account has been blocked. Please contact support",
      });
    }
    return res.redirect("/login?error=blocked");
  }

  req.session.user = user._id.toString();
  req.user = user;
  next();
});

/**
 * Admin authentication middleware
 * Protects admin routes and verifies admin privileges
 */
const adminAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Admin login required",
      });
    }
    return res.redirect("/admin/login");
  }

  const admin = await User.findById(req.session.admin);
  if (!admin || !admin.isAdmin) {
    req.session.destroy(() => {});

    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Unauthorized admin access",
      });
    }
    return res.redirect("/admin/login");
  }

  res.locals.admin = admin;
  req.admin = admin;
  next();
});

module.exports = {
  userAuth,
  adminAuth,
};
=======
const userAuth = (req, res, next) => {
  if (req.session.user) {
     User.findById(req.session.user)
      .then(user => {
        if (user && !user.isBlocked) {
          next();
        } else {
          delete req.session.user;
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            // For AJAX/fetch requests, respond with JSON error
            return res.status(401).json({ status: false, message: 'Unauthorized' });
          } else {
            // For normal requests, redirect
            return res.redirect('/login');
          }
        }
      })
      .catch(err => {
        console.error("User Auth Error", err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(500).json({ status: false, message: 'Internal server error' });
        }
        return res.status(500).send("Internal Server Error");
      });
  } else {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ status: false, message: 'Unauthorized' });
    } else {
      return res.redirect('/login');
    }
  }
};

const adminAuth = (req, res, next) => {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }
  
    User.findById(req.session.admin)
      .then(admin => {
        if (admin && admin.isAdmin) {
          res.locals.admin = admin;
          next();
        } else {
          req.session.destroy(() => {
            res.redirect("/admin/login");
          });
        }
      })
      .catch(err => {
        console.error("Admin Auth Error:", err);
        res.redirect("/admin/login");
      });
  };
  
  module.exports = {
    userAuth,
    adminAuth,


    
}


// when program run at first check this middlewaere brfore all route handler. in thi swe call next() then run dashbour in usercontroller
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
