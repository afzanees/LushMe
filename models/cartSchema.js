const mongoose = require('mongoose');
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true,
        },
<<<<<<< HEAD
        variantIndex: { 
            type: Number, 
            required: true 
        },
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true,
        },
        status:{
            type:String,
            default: 'placed',
        },
        cancellationReason:{
            type:String,
            default:"none"
        }
    }]
})

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;
