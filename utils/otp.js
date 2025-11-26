const crypto = require("crypto");

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();   // create a random otp
}

module.exports = generateOtp;