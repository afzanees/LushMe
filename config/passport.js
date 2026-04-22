// config/passport.js

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("../models/userSchema");

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: "User not found" });

        if (!user.password) return done(null, false, { message: "Use Google login" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return done(null, false, { message: "Incorrect password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails[0].value;

        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.findOne({ email });

          if (user) {
            user.googleId = googleId;
            if ((!user.profileImage || user.profileImage === "/images/profile.png") && profile.photos[0]?.value) {
              user.profileImage = profile.photos[0].value;
            }
            await user.save();
          } else {
            user = await User.create({
              username: profile.displayName,
              email,
              googleId,
              profileImage: profile.photos[0]?.value || "/images/profile.png",
              password: null,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        console.error("Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
    console.log("Deserialized user:", user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
