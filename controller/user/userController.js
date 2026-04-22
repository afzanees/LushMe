const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Coupon = require('../../models/couponSchema');
const generateOtp = require('../../utils/otp');
const sendVerificationEmail = require('../../utils/sendEmail')
const generateReferralCode = require('../../utils/referralCode');
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const { getEffectiveOffer, applyOffer } = require('../../utils/offerHelper');


const loadHomepage = async (req,res) =>{
    try {

        let user = null;
        if (req.session.user) {                        //normal user exist
            user = await User.findById(req.session.user);  // get data from db
            
            // Check if user is blocked
            if (user && user.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                });
                return res.redirect("/login?error=blocked");
            }
          } else if (req.user) {                      // by google
            user = req.user; // <-- from Passport Google
            
            // Check if Google user is blocked
            if (user && user.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                });
                return res.redirect("/login?error=blocked");
            }
          }
          console.log("Homepage user:", user);      
          res.render("user/home", { user });
    } catch (error) {
        console.log("Home page not found",error)   // to showing error to back end
        res.status(500).send("server error")  // to showing error to frnd end

    }

}

const pageNotFound = async (req,res)=>{
    try {
        res.render("user/pagenotfound")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const loadRegister = async (req,res)=>{
    try {
        return res.render("user/register")
    } catch (error) {
        console.log("register page is not found")
        res.status(500).send("server error")
    }
}

// const register = async (req,res) =>{
//     const {username,email,phone,password} = req.body
//     try {
//       const newUser = new User({username,email,phone,password})
//       console.log(newUser)

//       await newUser.save() //this is the method to save dtaa in db

//       return res.redirect('/register')
//     } catch (error) {
//         console.error("error for save user", error) // for seeing backend 
//         res.status(500).send('internal server error')   // for seen error in frondend
//     }
// }



const register = async (req, res) => {
  try {
    const { username, phone, email, password, cpassword, referralCode} = req.body;

    console.log("ðŸ“ Referral code entered by user:", referralCode);

    if (password !== cpassword) {
      return res.render("user/register", { 
        message: "Password does not match",
        formData: { username, email, phone, referralCode }
      });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("user/register", {
        message: "User with this email already existed",
        formData: { username, email, phone, referralCode }
      });
    }

    // Referral validation (ONLY if entered)
    let referrerId = null;

    if (referralCode && referralCode.trim() !== "") {
      const enteredCode = referralCode.trim();
      const referrer = await User.findOne({ referralCode: enteredCode });

      console.log("ðŸ” Referrer found:", referrer);

      if (!referrer) {
        return res.render("user/register", {
          message: "Invalid referral code",
          formData: { username, email, phone, referralCode }
        });
      }

      referrerId = referrer._id;
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }

    console.log("ðŸ“¦ Session userData:", {
      username,
      email,
      referrerId
    });

    req.session.userOtp = otp;
    req.session.otpExpiry = Date.now() + 60 * 1000;
    req.session.userData = { username, email, phone, password, referrerId };

    res.render("user/confirmotp", { otpAction: "/confirmotp" });
    console.log("Otp Sent", otp);

  } catch (error) {
    console.error("register error", error);
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password)=>{                            //hashing password
    try{
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash;
    }catch(error){

    }
}
const confirmOtp = async (req, res) => {
  try {
    console.log("ðŸ“¦ Session userData in confirmOtp:", req.session.userData);

    const { otp } = req.body;

    
    const userData = req.session.userData;
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please register again"
      });
    }


    if (!req.session.otpExpiry || Date.now() > req.session.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please resend OTP"
      });
    }

    if (String(otp) !== String(req.session.userOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP, please try again"
      });
    }



    delete req.session.userOtp;
delete req.session.otpExpiry;

    console.log("ðŸ“‹ Registration Data:", {
      username: userData.username,
      email: userData.email,
      hasReferrerId: !!userData.referrerId
    });

    const passwordHash = await securePassword(userData.password);

    // âœ… Create new user
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      password: passwordHash,
      referralCode: generateReferralCode(), // user's own referral code
      wallet: 0,
      walletTransactions: []
    });

    await newUser.save();
    console.log("âœ… New user created:", newUser._id);

    // âœ… Referral reward logic
    if (userData.referrerId) {
      console.log("ðŸŽ¯ Processing referral reward for referrerId:", userData.referrerId);

      try {
        const referrer = await User.findById(userData.referrerId);

        console.log("ðŸ”¥ Referrer document:", referrer);

        if (referrer) {
          const referralReward = 100;

          // Ensure walletTransactions exists
          referrer.wallet = (referrer.wallet || 0) + referralReward;
          referrer.walletTransactions = referrer.walletTransactions || [];

          referrer.walletTransactions.push({
            date: new Date(),
            amount: referralReward,
            status: "credited",
            method: "reward",
            description: `Referral reward for ${newUser.username}'s registration`
          });

          await referrer.save();

          console.log(`âœ… â‚¹${referralReward} credited to referrer's wallet`);

          // ✅ Create referral coupon
          const coupon = await Coupon.create({
            name: "Referral Reward",
            code: `REF-${referrer.referralCode}-${Date.now().toString().slice(-4)}`,
            type: "fixed",
            offerPrice: 100,
            minimumPrice: 500,
            startingDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "Active",
            source: "referral",
            createdFor: referrer._id,
            usageLimit: 1,
            usagePerUser: 1,
            usedCount: 0,
            usedUsers: []
          });

          console.log("ðŸŽ Referral coupon created:", coupon.code);
        } else {
          console.log("âŒ Referrer not found for ID:", userData.referrerId);
        }
      } catch (referralError) {
        console.error("âŒ Error during referral processing:", referralError);
        // Do NOT fail user registration
      }
    } else {
      console.log("â„¹ï¸ No referral used during registration");
    }

    // âœ… Clear session
    req.session.user = newUser._id;
    req.session.userOtp = null;
    req.session.userData = null;

    res.json({
      success: true,
      redirectUrl: "/"
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred"
    });
  }
};


const resendOTP = async (req, res) => {
    try {
      console.log("Session at resend:", req.session.userData);
      const { email } = req.session.userData || {};
  
      if (!email) {
        return res.status(400).json({ success: false, message: "Email not found in session" });
      }
  
      const otp = generateOtp();
      req.session.userOtp = otp;
      req.session.otpExpiry = Date.now() + 60 * 1000; // ⭐ ADD THIS
  
      req.session.save(async (err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ success: false, message: "Session save failed" });
        }
  
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
          console.log("Resend OTP:", otp);
          res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
          res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
        }
      });
  
    } catch (error) {
      console.error("Error resending OTP", error);
      res.status(500).json({ success: false, message: "Internal Server Error. Please try again" });
    }
  };


  const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            const errorMessage = req.query.error === 'blocked' 
                ? 'Your account has been blocked. Please contact support.' 
                : null;
            return res.render("user/login", { message: errorMessage })
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log("login page is not found")
        res.redirect('/pageNotFound')
    }
}

const login = async (req,res)=>{
    try {
        
        const {email,password} = req.body;
        
        const findUser = await User.findOne({isAdmin:0,email:email}) // this line check(in db) email now we entered is match to email we registered amd isadmin:0 means , that will be user, not admin, if ths two condition matches that will be login
      
        if(!findUser){
            console.log('user not found')
            return res.render("user/login",{message:"user not found"})
            
        }
        if(findUser.isBlocked){
            console.log('user is blocked by admin')
            return res.render("user/login",{message:"user is blockd by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password)

        if(!passwordMatch){
            console.log('incorrect password')
            return res.render('user/login',{message: "Incorrect password"})
        }
        
        // Preserve admin session data if exists
        const adminSessionData = req.session.admin;
        
        req.session.user = findUser._id;
        
        // Restore admin session data after setting user
        if (adminSessionData) {
            req.session.admin = adminSessionData;
        }
        
        res.redirect('/')

    } catch (error) {

        console.log("login error",error)
        res.render("user/login",{message:"Login failed, Please try again later"})
        
    }
}
const logout = async (req, res, next) => {
    try {
      req.logout(err => {
        if (err) return next(err);
  
        // Only clear user session, preserve admin session
        delete req.session.user;
        delete req.session.passport;
        
        req.session.save(err => {
          if (err) return res.status(500).send("Error logging out");
          res.redirect('/');
        });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).send("Server error during logout");
    }
  };

const loadShoppingPage = async (req, res) => {
    try {
         const user = req.session.user;
        let wishlistIds = [];
        let userData = null;
        
        if(user) {
            userData = await User.findById(user);
            
            // Check if user is blocked
            if (userData && userData.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                });
                return res.redirect("/login?error=blocked");
            }
            
            wishlistIds = userData?.wishlist?.map(id => id.toString()) || [];
        }
        
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const search = req.query.search || null;
        let query = {
            isBlocked: false,
            category: { $in: categoryIds }
          };
          if (search) {
            query.name = { $regex: search, $options: 'i' };
          }
        const products = await Product.find(query).populate('brand').sort({createdAt: -1}).skip(skip).limit(limit);
        
      products.forEach(product => {
  const category = categories.find(cat => cat._id.toString() === product.category?.toString());
  const subcategory = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory?.toString());


  const effectiveOffer = getEffectiveOffer(product, category, subcategory);


  // const productOffer = product.productOffer || 0;
  // const categoryOffer = category?.categoryOffer || 0;
  // const subcategoryOffer = subcategory?.offer || 0;

  // const effectiveOffer = Math.max(productOffer, categoryOffer, subcategoryOffer);
  // product.effectiveOffer = effectiveOffer;

  // âœ… Total stock across variants
  product.totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  product.isOutOfStock = product.totalQuantity === 0;
  product.effectiveOffer = effectiveOffer;   //for badge


  if (product.variants.length > 0) {
    const minVariant = product.variants.reduce((min, v) =>
      v.salePrice < min.salePrice ? v : min, product.variants[0]
    );

    // âœ… Apply offer discount
  //   const finalSalePrice = minVariant.salePrice * (1 - effectiveOffer / 100);

  product.displayRegularPrice = Math.round(minVariant.regularPrice);
  product.displaySalePrice    = applyOffer(minVariant.salePrice, effectiveOffer);
} else {
  product.displayRegularPrice = null;
  product.displaySalePrice    = null;
}
});


        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments({isBlocked:false,category:{$in:categoryIds}});
        const totalPages = Math.ceil(totalProducts / limit);
        const brands= await Brand.find({isListed:true})
        const catgoriesWithIds = categories.map(category=>({_id:category._id,name:category.name,subcategories: category.subcategories || []}))
        res.render('user/shop', {
          user: userData,
          products: products,
          category:catgoriesWithIds,
          brands: brands,
          totalProducts:totalProducts,
          currentPage:page,
          totalPages:totalPages,
          search,
          wishlistIds,
          selectedCategory: req.query.category || null,
          selectedBrand: req.query.brand || null,
          selectedSubcategory: req.query.subcategory || null,
          selectedColor: req.query.color || null,
          selectedSize: req.query.size || null,
          selectedPrice: req.query.price || null,
          selectedSort: req.query.sort || null,
          query: req.query,
         });
      }catch (error) {
        console.error('Error loading shop page:', error.message);
        console.error(error.stack);
        res.redirect('/pagenotfound');
      }
  }

  //Product filter
  const filterProduct = async (req, res) => {
    try{
        const user =req.session.user
        const category =req.query.category
        const subcategoryId = req.query.subcategory || null;
        const brand=req.query.brand;
        const color = req.query.color || null;
        const price = req.query.price || null;
        let variantQuery = {};
       
        console.log(" object:", category);
        console.log("  Sub categoryobject:", subcategoryId );
        const findCategory=category? await Category.findOne({_id:category},{ name: 1, subcategories: 1 }):null;
        console.log("findCategory object:", findCategory);

        const findBrand = brand ? await Brand.findOne({_id:brand}):null;
        let wishlistIds = [];
        if (req.session.user) {
        const userDoc = await User.findById(req.session.user).select('wishlist').lean();
        wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
 
        const brands= await Brand.find({}).lean();
         const query={
            isBlocked :false
         }
         
        if (color) variantQuery.color = color;

         if (Object.keys(variantQuery).length > 0) {
                query.variants = { $elemMatch: { ...variantQuery, quantity: { $gt: 0 } } };
            }
        if (findCategory) {
            query.category = findCategory._id;
        }
        if (subcategoryId) {
          query.subcategory = subcategoryId;
          }
        if (findBrand) {
            query.brand = findBrand._id;
        }
       
if (req.query.price) {
  const priceRange = req.query.price;

  if (priceRange === '4000+') {
    query.variants = { 
      $elemMatch: { salePrice: { $gte: 4000 }, quantity: { $gt: 0 } } 
    };
  } else {
    const [min, max] = priceRange.split('-').map(Number);
    query.variants = { 
      $elemMatch: { salePrice: { $gte: min, $lte: max }, quantity: { $gt: 0 } } 
    };
  }
}

          const sort = req.query.sort || 'default';
        let sortCriteria = {};
        switch (sort) {
          case 'price_asc':
            sortCriteria = { "variants.salePrice": 1 };
            break;
          case 'price_desc':
            sortCriteria = { "variants.salePrice": -1 };
            break;
          case 'name_asc':
            sortCriteria = { name: 1 };
            break;
          case 'name_desc':
            sortCriteria = { name: -1 };
            break;
          default:
            sortCriteria = { createdAt: -1 };
        }

          
        const allCategories = await Category.find({}, { name: 1, subcategories: 1 }).lean();
        let selectedSubcategoryName = null;
       
       for (const cat of allCategories) {
         const match = cat.subcategories?.find(sc => sc._id.toString() === subcategoryId);
         if (match) {
           selectedSubcategoryName = match.name;
           break;
         }
        }
        const [products, totalCount] = await Promise.all([
            Product.find(query).sort(sortCriteria).lean(),
            Product.countDocuments(query)
          ]);
        let findProducts = products;

        // âœ… Set display price based on the lowest priced variant
findProducts.forEach(product => {
  if (product.variants && product.variants.length > 0) {

    // Calculate total stock
    product.totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
    product.isOutOfStock = product.totalQuantity === 0;

    // Find minimum sale price variant
    const minVariant = product.variants.reduce((a, b) =>
      a.salePrice < b.salePrice ? a : b
    );

    product.displaySalePrice = Math.round(minVariant.salePrice);
    product.displayRegularPrice = Math.round(minVariant.regularPrice);
    
    // Needed for sorting
    product.minPriceForSort = minVariant.salePrice;

  } else {
    product.displaySalePrice = null;
    product.displayRegularPrice = null;
    product.minPriceForSort = Infinity;
    product.isOutOfStock = true;
  }
});

        const categories = await Category.find({ isListed: true });
        // Pagination setup
        let itemsPerPage = 12;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

         // Handle user data and search history
         let userData = null;
         if (user) {
             userData = await User.findOne({ _id: user });
             if (userData) {
                 const searchEntry = {
                    category : findCategory ? findCategory._id:null,
                    brand : findBrand ?findBrand.name : null,
                    searchedOn : new Date(),                 }
                 userData.searchHistory.push(searchEntry)
                 await userData.save();
                }
            }
    req.session.filteredProducts = currentProduct;   
     // Render the results
     res.render("user/shop", {
        user: userData,
        products: currentProduct,
        category: categories,
        brands:brands,
        totalPages,
        currentPage,
        selectedCategory: category || null,
        selectedBrand: brand || null,
        selectedSubcategory: subcategoryId,
        selectedColor: color || null,
        selectedprice: price || null,
        selectedPrice: req.query.price || null,
        selectedSort: sort || null,
        selectedSubcategoryName,
        wishlistIds,
        search: req.query.search || '',
        query: req.query,
    });
    }catch (error)
    {
        console.error('Error in filterProduct:', error);
        res.redirect('/pagenotfound');
    }
  }





module.exports = {
    loadHomepage,
    pageNotFound,
    loadRegister,
    register,
    confirmOtp,
    resendOTP,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    filterProduct
  
} 

