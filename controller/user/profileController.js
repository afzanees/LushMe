const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Address = require('../../models/addressSchema')
const Order = require("../../models/orderSchema");
const generateOtp = require('../../utils/otp');
const sendVerificationEmail = require('../../utils/sendEmail')
const generateReferralCode = require('../../utils/referralCode');
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')

// Hash password function
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}


const loadForgotPassword = async (req, res) => {
    try {

        res.render("user/forgetPassword", { message: null });

    } catch (error) {
        console.error("Load Forgot Password Error:", error);
        res.redirect("/pageNotFound");
    }
};

const forgotPasswordSendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.render("user/forgetPassword", { message: "Email not found" });
        }

        // Generate OTP
        const otp = generateOtp();

        // Send OTP to email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error");
        }

        // Save OTP & email in session
        req.session.resetOtp = otp;
        req.session.resetEmail = email;

        console.log("Forgot Password OTP:", otp);

        res.render("user/confirmotp", { otpAction:"/forgot-password/verify-otp" });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.redirect("/pageNotFound");
    }
};

const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { otp } = req.body;

        if (String(otp) !== String(req.session.resetOtp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // OTP correct → redirect user to reset password page
        return res.json({
            success: true,
            redirectUrl: "/update-password"
        });

    } catch (error) {
        console.error("Verify Forgot Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const loadResetPassword = async (req, res) => {
    try {
        if (!req.session.resetEmail) {
            return res.redirect("/forgot-password");
        }

        res.render("user/resetPassword", { email: req.session.resetEmail });
    } catch (error) {
        console.error("Reset Password Load Error:", error);
        res.redirect("/pageNotFound");
    }
};

const updatePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.render("user/resetPassword", {
                message: "Password does not match",
                email: req.session.resetEmail
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne(
            { email: req.session.resetEmail },
            { $set: { password: hashedPassword } }
        );

        // Clear session
        req.session.resetOtp = null;
        req.session.resetEmail = null;

        res.redirect("/login");

    } catch (error) {
        console.error("Update Password Error:", error);
        res.redirect("/pageNotFound");
    }
};

const userProfile = async (req,res)=>{
    try{ 
        const userId =req.session.user
        const userData = await User.findById(userId)
        const userAddress = await Address.findOne({ userId: userId });
        const addresses = userAddress ? userAddress.address : [];
        console.log("View Loaded")
        console.log("✅ USER FROM DB:", userData);
        console.log("✅ REFERRAL CODE FROM DB:", userData.referalCode);
        //for order
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments({ userId });
        console.log('🔍 Total Orders Found:', totalOrders);
        console.log('🔍 User ID:', userId);
        const orders = await Order.find({ userId })
          .sort({ createdOn: -1 }) // latest first
          .skip(skip)
          .limit(limit)
          .populate('orderedItems.product')
          .lean();
        console.log('🔍 Orders Retrieved:', orders.length);
        console.log('🔍 Orders Data:', JSON.stringify(orders, null, 2));
        const totalPages = Math.ceil(totalOrders / limit);

        if (!userData.referalCode) {
          userData.referalCode = generateReferralCode();
          await userData.save();
          console.log("✅ Referral code generated & saved to DB:", userData.referalCode);
        }

        // Wallet history pagination
        const walletPage = parseInt(req.query.walletPage) || 1;
        const walletLimit = 5;
        const walletSkip = (walletPage - 1) * walletLimit;
        const walletHistory = userData.walletTransactions || [];

        const paginatedHistory = walletHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // newest first
        .slice(walletSkip, walletSkip + walletLimit);
        const totalWalletPages = Math.ceil(walletHistory.length / walletLimit);

        const walletTransactions = userData.walletTransactions || [];
        
        res.render('user/profile',{user:userData,
            addresses,
            orders,
            currentPage: page,
            totalPages,
            walletTransactions: paginatedHistory,
            walletCurrentPage: walletPage,
            walletTotalPages: totalWalletPages,
        })
       }catch (err){
        res.redirect("/pageNotFound")
       }
    }
//change email
const changeEmail = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    
    // Check if user is Google login user
    if (!userData.password) {
      return res.redirect('/profile'); // or show error message
    }
    
    res.render('user/change-email', {
      user: userData,
      message: null
    });
  } catch (err) {
    res.redirect('/pagenotfound');
  }
};

//change email validation
const changeEmailValid = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    
    // Prevent Google users from changing email
    if (!userData.password) {
      return res.redirect('/profile');
    }
    
    const { email } = req.body;

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.render('user/change-email', {
        user: userData,
        message: 'This email is already in use'
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render('user/change-email', {
        user: userData,
        message: 'Failed to send OTP. Try again.'
      });
    }

    // Store ONLY what is needed
    req.session.emailOtp = otp;
    req.session.pendingEmail = email;

    console.log(`OTP sent to ${email}: ${otp}`);

    res.render('user/change-email-otp', {
      user: userData,
      message: null
    });
    

  } catch (err) {
    console.error(err);
    res.redirect('/pagenotfound');
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp !== req.session.emailOtp) {
      return res.render('user/change-email-otp', {
        user: req.user,
        message: 'Invalid OTP'
      });
    }

    // OTP success → update email
    await User.findByIdAndUpdate(req.user._id, {
      email: req.session.pendingEmail
    });

    // Clear OTP data
    req.session.emailOtp = null;
    req.session.pendingEmail = null;

    res.redirect('/profile');

  } catch (err) {
    console.error(err);
    res.redirect('/pagenotfound');
  }
};

const updateEmail= async (req,res)=>
{
    try{
        const newEmail=req.body.newEmail
        const userId=req.session.user
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.redirect('/userProfile')

    }catch (err){
        res.redirect("/pagenotfound")
    }
}
//Updating userData

const updateProfile = async (req, res) => {
    try {
      const userId = req.session.user;
      const { name, phone } = req.body;

      // Update only username and phone
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username: name, phone },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        console.log('User not found');
        return res.status(404).send('User not found');
      }

      // Update session data
      req.session.user.username = updatedUser.username;
      req.session.user.phone = updatedUser.phone;

      console.log('Updated user:', updatedUser);

      return res.redirect('/profile');
    } catch (error) {
      console.error('Update error:', error);
      return res.status(500).send('Server error');
    }
  };

  //Get  change password page
 const getChangePassword = async (req, res) => {
  try {
    res.render('user/change-password', { user: req.session.user || null })
  } catch (err) {
    res.redirect("/pagenotfound")
  }
}
//Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.session.user
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    const userData = await User.findById(userId)

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Google login users
    if (!userData.password) {
      return res.status(400).json({
        success: false,
        message: "Password change not available for Google login users"
      })
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userData.password
    )

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password"
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password must match"
      })
    }

    const passwordHash = await securePassword(newPassword)
    userData.password = passwordHash
    await userData.save()

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    })

  } catch (err) {
    console.error("Error while changing password", err)
    res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}
//profilepic change
const changeProfilePic = async (req, res) => {
    try {
      const userId = typeof req.session.user === 'string' ? req.session.user : req.session.user._id;
  
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const filename = req.file.filename;
      console.log('Profile image uploaded:', filename);
  
      // Update user profile image
      const updatedUser = await User.findByIdAndUpdate(
        userId, 
        { profileImage: filename },
        { new: true }
      );
      
      // Update session with new profile image
      if (req.session.user) {
        req.session.user.profileImage = filename;
      }
  
      res.json({ success: true, filename });
    } catch (error) {
      console.error('Profile pic upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  };

  //Load Address page
  const getAddAddress = async (req,res) => {
    try {
        const user = req.session.user;
        res.render("add-address",{user:user})
    } catch (error) {
        res.redirect("/pagenotfound")
    }
}
//add address  
const addAddress = async (req,res)=>{
    try{
        const userId = req.session.user
        const userData = await User.findById(userId)

        const {name, addressType, houseNo, city, state, landMark,pincode, phone, altPhone} = req.body
        const userAddress = await Address.findOne({userId: userData._id})
        if(!userAddress){
            const newAddress = new Address({
                userId: userData._id,
                address: [{addressType, name, houseNo, city, state, landMark, pincode, phone, altPhone}]
            })

            await newAddress.save()
        }else{
            
            userAddress.address.push({addressType, name, houseNo, city, state, landMark, pincode, phone, altPhone})
            await userAddress.save()
        }
        res.status(200).json({success: true, message: 'Address added successfully.'})

    }catch (err){
        console.error('Error while adding new address', err)
        res.status(500).json({success: false, message: 'Internal server error'})
    }
}

const getEditAddress =async (req,res)=>{
    try{
        const addressId=req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({
            "address._id": addressId,
        });
        if(!currAddress){
            return res.redirect("/pagenotfound")
        }
        const addressData = currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString(); 
        })
        if(!addressData){
            return res.redirect("/pagenotfound")
        }
        res.render("edit-address",{address:addressData, user:user})

    }catch (error){
        res.redirect("/pagenotfound")
    }
    }

  const postEditAddress =async (req,res)=>{
    try{
        const userId = req.session.user;
        const { addressId, name, addressType, houseNo, city, state, landMark, pincode, phone, altPhone } = req.body;
        const userAddressDoc = await Address.findOne({ userId, "address._id": addressId });
        if (!userAddressDoc) return res.status(404).json({ success: false, message: "Address not found" });

        const addr = userAddressDoc.address.id(addressId);
        if (!addr) return res.status(404).json({ success: false, message: "Address not found" });

        addr.name = name;
        addr.addressType = addressType;
        addr.houseNo = houseNo;
        addr.city = city;
        addr.state = state;
        addr.landMark = landMark;
        addr.pincode = pincode;
        addr.phone = phone;
        addr.altPhone = altPhone;
        await userAddressDoc.save();
    
        res.json({ success: true, message: 'Address updated successfully.' });

    }catch (error){
        console.error('Update address error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });

    }
   
  }
  const deleteAddress = async (req, res) => {
    try {
      const userId = req.user._id;
      const { id: addressId } = req.query;
      const { redirect } = req.query; // checkout or profile

      if (!addressId) {
        return res.status(400).json({ success: false, message: 'Address ID required' });
      }

      // Find and delete the address
      const result = await Address.updateOne(
        { userId, 'address._id': addressId },
        { $pull: { address: { _id: addressId } } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      // Determine redirect based on parameter
      const redirectTo = redirect === 'checkout' ? '/checkout' : '/profile';
      return res.redirect(redirectTo);

    } catch (error) {
      console.error('Error in deleting address', error);
      res.status(500).json({ success: false, message: 'Error deleting address' });
    }
  };

// Simple wallet add money (without payment gateway)
const addWalletMoney = async (req, res) => {
    try {
        const userId = req.session.user;
        const { amount } = req.body;

        console.log('Add wallet money request:', { userId, amount });

        if (!amount || amount <= 0) {
            return res.json({ success: false, message: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Add money to wallet
        user.wallet = (user.wallet || 0) + parseFloat(amount);
        
        // Add transaction to wallet history
        user.walletTransactions = user.walletTransactions || [];
        user.walletTransactions.push({
            date: new Date(),
            amount: parseFloat(amount),
            status: 'credited',
            method: 'razorpay',
            description: 'Wallet top-up (Manual)'
        });

        await user.save();

        res.json({ 
            success: true, 
            message: 'Amount added to wallet successfully',
            newBalance: user.wallet 
        });

    } catch (error) {
        console.error('Add wallet money error:', error);
        res.json({ success: false, message: 'Failed to add money' });
    }
};

// Wallet - Create Razorpay order for wallet top-up
const createWalletOrder = async (req, res) => {
    try {
        const Razorpay = require('razorpay');
        const { amount } = req.body;

        console.log('Wallet order request:', { amount, body: req.body });

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        // Check if Razorpay credentials exist
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay credentials missing');
            return res.status(500).json({ 
                success: false, 
                message: 'Payment gateway not configured. Please contact support.' 
            });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `wallet_${Date.now()}`
        };

        console.log('Creating Razorpay order:', options);
        const order = await razorpay.orders.create(options);
        console.log('Order created successfully:', order.id);
        
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount
        });

    } catch (error) {
        console.error('Wallet order creation error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create order' 
        });
    }
};

// Wallet - Verify payment and add money to wallet
const verifyWalletPayment = async (req, res) => {
    try {
        const crypto = require('crypto');
        const { payment, orderId, amount } = req.body;

        // Verify payment signature
        const sign = payment.razorpay_order_id + "|" + payment.razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (expectedSign !== payment.razorpay_signature) {
            return res.status(400).json({ status: false, message: "Invalid signature" });
        }

        // Add money to user wallet
        const userId = req.session.user;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        user.wallet = (user.wallet || 0) + parseFloat(amount);
        
        // Add transaction to wallet history
        user.walletTransactions = user.walletTransactions || [];
        user.walletTransactions.push({
            date: new Date(),
            amount: parseFloat(amount),
            status: 'credited',
            method: 'razorpay',
            description: 'Wallet top-up'
        });

        await user.save();

        res.json({ status: true, message: "Payment verified and wallet updated" });

    } catch (error) {
        console.error('Wallet payment verification error:', error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
};




module.exports = {
    loadForgotPassword,
    forgotPasswordSendOTP,
    verifyForgotPasswordOTP,
    loadResetPassword,
    updatePassword,
     userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    updateProfile,
    getChangePassword,
    changePassword,
    changeProfilePic,
    getAddAddress,
    addAddress,
    getEditAddress,
    postEditAddress,
    deleteAddress,
    addWalletMoney,
    createWalletOrder,
    verifyWalletPayment,
}