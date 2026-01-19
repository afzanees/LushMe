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
db();

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
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
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
    try {
      if (req.session.user) {
        const userFromDB = await User.findById(req.session.user);
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