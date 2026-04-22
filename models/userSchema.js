const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({       // creating model
    username: {
        type:String,
        required : true
    },
    email: {
        type:String,
        required:true,
        unique:true
    },
    phone: {
        type:String,
        required:false,  // this false because when we do single sighnup there is only useername and password
<<<<<<< HEAD
       
=======
        unique:true,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        sparse:true,
        default:null,
       
    },

    googleId:{
        type:String,
        unique:true,
<<<<<<< HEAD
        sparse: true, 
        
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    
    },
    password:{
        type:String,
        required:false,
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Number,
        default:0,
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
<<<<<<< HEAD
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Product"
    }],
    wallet: {
        type: Number,
        default: 0
    },
    walletTransactions: [{
        date: {
            type: Date,
            default: Date.now
        },
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['credited', 'debited'],
            required: true
        },
        method: {
            type: String,
            enum: ['razorpay', 'refund', 'reward', 'order'],
            default: 'razorpay'
        },
        description: {
            type: String
        }
=======
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    }],
    orderHIstory:[{
        type:Schema.Types.ObjectId,
    }],
    createdOn:[{
        type:Date,
        default:Date.now,
    }],
<<<<<<< HEAD
    referralCode:{
        type:String,
    },
    referralRewardGiven: {
        type: Boolean,
        default: false
      },
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
=======
    referalCode:{
        type:String,
    },
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    redeemed:{
        type:Boolean,
    },
    profileImage:{
        type:String,
         default: "/images/profile.png",

    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String,
        },
        searchOn: {
            type:Date,
            default:Date.now
        }
    }]
    

})


const User = mongoose.model("User",userSchema) // for export
module.exports = User;