const express = require("express");
const router = express.Router();
const passport = require("passport");

function getGoogleCallbackUrl(req) {
  const configuredCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
  const requestHost = req.get("host");
  const isProductionHost = requestHost && !/^localhost(:\d+)?$/i.test(requestHost);

  if (
    configuredCallbackUrl &&
    !(isProductionHost && /:\/\/localhost(:\d+)?\//i.test(configuredCallbackUrl))
  ) {
    return configuredCallbackUrl;
  }

  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/auth/google/callback`;
  }

  return `${req.protocol}://${req.get("host")}/auth/google/callback`;
}

router.get(
  "/google",
  (req, res, next) =>
    passport.authenticate("google", {
      scope: ["profile", "email"],
      callbackURL: getGoogleCallbackUrl(req),
    })(req, res, next)
);

router.get(
  "/google/callback",
  (req, res, next) =>
    passport.authenticate("google", {
      failureRedirect: "/login",
      callbackURL: getGoogleCallbackUrl(req),
    })(req, res, next),
  (req, res) => {
    const user = req.user;
    const adminSessionData = req.session.admin;

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

        if (adminSessionData) {
          req.session.admin = adminSessionData;
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save failed:", saveErr);
            return res.redirect("/login");
          }

          return res.redirect("/");
        });
      });
    });
  }
);

module.exports = router;
