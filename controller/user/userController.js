const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');

const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const loadHomepage = async (req,res) =>{
    try {

        let user = null;
        if (req.session.user) {                        //normal user exist
            user = await User.findById(req.session.user);  // get daa from db
          } else if (req.user) {                      // by google
            user = req.user; // <-- from Passport Google
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

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();   // create a random otp
}

async function sendVerificationEmail(email,otp){
     try {                        

        const transporter =  nodemailer.createTransport({                 // we set the default email and password , that mail will send otp to user registered mail 

            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })   
        
        const info = await transporter.sendMail({     //info of sending mail with otp
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP: ${otp}`,
            html:`<b>Your OTP: ${otp} </b>,`
        })

        return info.accepted.length > 0
        
     } catch (error) {
        console.error("Error sending email",error)
        return false;
     }
}

const register = async (req,res) =>{
    try {
        
        const {username,phone,email,password,cpassword} = req.body;

        if(password !== cpassword){
            return res.render("user/register",{message:"Password does not match"})
        }
        const findUser = await User.findOne({email});         // checking email exist
        if(findUser){
            return res.render("user/register",{message:"User with this email already existed"})
        }

        const otp = generateOtp();

        // to send generate otp to user registered mail

        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json("email-error")
        }                                       // after successfully snding otp, we just asign otp to session

        req.session.userOtp = otp;
        req.session.userData = {username,email,phone,password};
                                    //a after session stored, we get the message varify otp
        res.render("user/confirmotp");
        console.log("Otp Sent",otp)

    } catch (error) {
        
        console.error("register error",error)
        res.redirect("/pageNotFound")
    }

}

const securePassword = async (password)=>{                            //hashing password
    try{
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash;
    }catch(error){

    }
}

const confirmOtp = async (req,res)=> {
    try {
        console.log("BODY RECEIVED:", req.body);
        const { otp } = req.body;
        console.log("Received OTP:", otp);
        console.log("Session OTP:", req.session.userOtp);

        if(String(otp) === String(req.session.userOtp)){
            const user = req.session.userData

            const passwordHash = await securePassword(user.password);

            const savedUserData = new User ({
                username:user.username,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await savedUserData.save();
            req.session.user = savedUserData._id;
            req.session.userOtp = null;
            req.session.userData = null;
            res.json({success:true, redirectUrl:"/"})
            

        }else{
            res.status(400).json({success:false,message:"Invallid OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}


const resendOTP = async (req, res) => {
    try {
      console.log("Session at resend:", req.session.userData);
      const { email } = req.session.userData || {};
  
      if (!email) {
        return res.status(400).json({ success: false, message: "Email not found in session" });
      }
  
      const otp = generateOtp();
      req.session.userOtp = otp;
  
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
            return res.render("user/login")
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
        req.session.user = findUser._id;
        res.redirect('/')

    } catch (error) {

        console.log("login error",error)
        res.render("login",{message:"Login failed, Plesae try again later"})
        
    }
}
const logout = async (req, res, next) => {
    try {
      req.logout(err => {
        if (err) return next(err);
  
        req.session.destroy(err => {
          if (err) return res.status(500).send("Error logging out");
          res.clearCookie('connect.sid');
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
        if(user) {
            const userDoc = await User.findById(user).select('wishlist').lean();
            wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
        const userData = user ? await User.findOne({ _id: user }) : null;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const search = req.query.search || null;
        let query = {
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
          };
          if (search) {
           
            query.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ];
          }
        const products = await Product.find(query).sort({createdAt: -1}).skip(skip).limit(limit);
        
      products.forEach(product => {
  const category = categories.find(cat => cat._id.toString() === product.category?.toString());
  const subcategory = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory?.toString());

  const productOffer = product.offer || 0;
  const categoryOffer = category?.categoryOffer || 0;
  const subcategoryOffer = subcategory?.offer || 0;

  const effectiveOffer = Math.max(productOffer, categoryOffer, subcategoryOffer);
  product.effectiveOffer = effectiveOffer;

  // ✅ Total stock across variants
  product.totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);

  // ✅ Choose lowest priced variant
  if (product.variants.length > 0) {
    let minVariant = product.variants[0];

    product.variants.forEach(v => {
      if (v.salePrice < minVariant.salePrice) minVariant = v;
    });

    // ✅ Apply offer discount
    const finalSalePrice = minVariant.salePrice * (1 - effectiveOffer / 100);

    product.displayRegularPrice = minVariant.regularPrice;
    product.displaySalePrice = Math.round(finalSalePrice * 100) / 100;
  } else {
    product.displayRegularPrice = product.displaySalePrice = null;
  }
});


        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments({isBlocked:false,category:{$in:categoryIds} ,variants:{ $elemMatch: { quantity: { $gt: 0 } } } });
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
            isBlocked :false,
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
         }
         
        if (color) variantQuery.color = color;
        if (price) variantQuery.price = price;

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

        // ✅ Set display price based on the lowest priced variant
findProducts.forEach(product => {
  if (product.variants && product.variants.length > 0) {

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