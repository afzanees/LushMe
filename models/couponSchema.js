const mongoose = require('mongoose');
const {Schema} = mongoose;

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        trim: true,
       
     },
    code:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        match: /^[A-Z0-9]{5,}$/,
      
    },
    startingDate:{
        type: Date,
        default: Date.now,
        required: true
    },
    expiryDate:{
        type: Date,
        required: true
    },
    offerPrice:{
        type: Number,
        required: true,
        min: 1
    },
    minimumPrice:{
        type: Number,
        required: true,
        min: 500
    },
    type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed'
      },
      
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    source: {
        type: String,
        enum: ['admin', 'referral'],
        default: 'admin'
      },
      createdFor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      assignedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
    usageLimit: { type: Number, default: 1, min: 1 },
    usagePerUser: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0 }, 
    usedUsers: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          count: { type: Number, default: 0 } // How many times this user used it
        }
      ],
        
});

couponSchema.pre("validate", function (next) {
  if (this.startingDate && this.expiryDate && this.expiryDate <= this.startingDate) {
    this.invalidate("expiryDate", "Expiry date must be greater than starting date");
  }

  if (this.type === "percentage" && this.offerPrice > 100) {
    this.invalidate("offerPrice", "Percentage discount cannot be greater than 100");
  }

  if (
    Number.isFinite(this.usageLimit) &&
    Number.isFinite(this.usagePerUser) &&
    this.usagePerUser > this.usageLimit
  ) {
    this.invalidate("usagePerUser", "Usage per user cannot be greater than usage limit");
  }

  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
