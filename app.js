require('dotenv').config();
const express = require('express')
const db = require("./config/db")
const userRouter = require('./routes/userRouter')
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const adminRouter = require("./routes/adminRouter")
const authRoute = require("./routes/authRoute");
const passport = require("./config/passport"); 
const User = require('./models/userSchema');
const { errorHandler, notFound } = require('./middlewares/errorhandling');
const userHeaderData = require("./middlewares/userHeaderData");
db();

const app = express()
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    name: "connect.sid",
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 72 * 60 * 60 * 1000
    }
}))

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files FIRST (before routes)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));
app.use('/vendor', express.static(path.join(__dirname, 'public/vendor')));

// Browsers request /favicon.ico automatically; avoid noisy 404 logs if no icon file exists.
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(async (req, res, next) => {
    try {
      if (req.session.user) {
        const sessionUser = req.session.user;
        const userId = sessionUser && (sessionUser._id || sessionUser);
        const userFromDB = userId ? await User.findById(userId) : null;
        res.locals.user = userFromDB;
      } else if (req.user) {
        res.locals.user = req.user;
      } else {
        res.locals.user = null;
      }
      next();
    } catch (error) {
      console.error(error);
      res.locals.user = null;
      next();
    }
  });

  app.use(userHeaderData);

app.use('/',userRouter)
app.use('/admin',adminRouter)
app.use("/auth", authRoute);

// 404 handler - must be after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

app.listen(process.env.PORT, ()=>{
    console.log("server is running")
})

module.exports = app



//admin password : qqqqqqqq1