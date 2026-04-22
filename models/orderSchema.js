const mongoose = require("mongoose")
const {Schema} = mongoose
const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema ({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true,
    },
<<<<<<< HEAD
    userId:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    orderedItems:[{
        product:{
            type: Schema.Types.ObjectId,
            ref:"Product",
            required:true,
        },
<<<<<<< HEAD
        variantIndex: {
            type: Number,
            required: true,
        },
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        quantity:{
            type:Number,
            required:true,
        },
        price:{
            type:Number,
            default:0
<<<<<<< HEAD
        },
        status:{
            type:String,
            default:'Pending',
            enum:['Pending','confirmed','Shipped','Delivered','cancelled','Returned','return_requested','cancellation_requested']
        },
        cancellationReason:{
            type:String,
            default:''
        },
        returnReason:{
            type:String,
            default:''
        },
        returnRejected:{
            type:Boolean,
            default:false
        },
        returnRejectionReason:{
            type:String,
            default:''
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        }
    }],
    totalPrice:{
        type:Number,
        required:true,
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true,
    },
<<<<<<< HEAD
    deliveryCharge:{
        type:Number,
        default:0
    },
    address:{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        houseNo:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altPhone:{
            type:String,
        }
    },
    invoiceDate: {
        type: Date,
        default: Date.now
=======
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    invoiceDate:{
        type:Date
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    },
    status:{
        type:String,
        required:true,
<<<<<<< HEAD
        enum:['Pending','Shipped','Delivered','Cancelled', 'Returned']
    },
    paymentMethod:{
        type:String,
        required:true,
        enum:['cod','razorpay','wallet']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    razorpayDetails: {
        orderId: {
            type: String
        },
        paymentId: {
            type: String
        },
        signature: {
            type: String
        }
=======
        enum:['Pendings','Shipped','Delivered','Cancelled','Return Request', 'Returned']
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true,
    },
    couponApplied:{
        type:Boolean,
        default:false
<<<<<<< HEAD
    },
    couponCode: {
        type: String,
        default: null
    },

    couponDiscount: {
        type: Number,
        default: 0
    }


=======
    }

>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
})

const Order = mongoose.model("order",orderSchema);
module.exports = Order