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
    const user = req.user;

    // Preserve admin session data before regeneration
    const adminSessionData = req.session.admin;
    
    // Regenerate session after authentication to prevent session fixation.
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("Session regeneration failed:", regenErr);
        return res.redirect("/login");
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Passport re-login failed:", loginErr);
          return res.redirect("/login");
        }

        req.session.user = user._id;
        
        // Restore admin session data after regeneration
        if (adminSessionData) {
          req.session.admin = adminSessionData;
        }
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save failed:", saveErr);
            return res.redirect("/login");
          }
          res.redirect("/");
        });
      });
    });
  }
);



module.exports = router;
