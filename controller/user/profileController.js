const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');

const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')


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

        res.render("user/forgotOtpVerify", { message: null });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.redirect("/pageNotFound");
    }
};

const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp != req.session.resetOtp) {
            return res.render("user/forgotOtpVerify", { message: "Invalid OTP" });
        }

        // OTP correct → move to reset password page
        res.render("user/resetPassword", {
            email: req.session.resetEmail,
            message: null
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    loadForgotPassword,
    forgotPasswordSendOTP,
    verifyForgotPasswordOTP,
}