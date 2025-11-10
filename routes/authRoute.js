const express = require("express");
const router = express.Router();
const passport = require("passport");

// Step 1: Start Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


// Step 2: Google Redirect URL
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication

    // ✅ store user id in express-session manually
    req.session.user = req.user._id;

    // redirect to homepage
    res.redirect("/");
  }
);



module.exports = router;
