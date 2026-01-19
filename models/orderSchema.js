const mongoose = require("mongoose")
const {Schema} = mongoose
const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema ({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true,
    },
    userId:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    orderedItems:[{
        product:{
            type: Schema.Types.ObjectId,
            ref:"Product",
            required:true,
        },
        variantIndex: {
            type: Number,
            required: true,
        },
        quantity:{
            type:Number,
            required:true,
        },
        price:{
            type:Number,
            default:0
        },
        status:{
            type:String,
            default:'Pending',
            enum:['Pending','confirmed','processing','Shipped','Delivered','cancelled','Returned','return_requested','return request']
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
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Shipped','Delivered','Cancelled','Return Request', 'Returned']
    },
    paymentMethod:{
        type:String,
        required:true,
        enum:['cod','razorpay','wallet']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true,
    },
    couponApplied:{
        type:Boolean,
        default:false
    }

})

const Order = mongoose.model("order",orderSchema);
module.exports = Order