const mongoose = require("mongoose")
const {Schema} = mongoose;

const addressSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"USer",
        required:true,
    },
    address:[{
        addressType:{
            type:String,
            required:true,
        },
        name:{
            type:String,
            required:true,
        },
<<<<<<< HEAD
        houseNo:{
            type:String,
            required:true,
        },
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        city:{
            type:String,
            required:true,
        },
        landMark:{
            type:String,
            required:true,
        },
        state:{
            type:String,
            required:true,
        },
        pincode:{
            type:Number,
            required:true,
        },
        phone:{
            type:String,
            required:true,
        },
        altPhone:{
            type:String,
<<<<<<< HEAD
            required:false,
=======
            requiredtrue,
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
        }
    }]

})

const Address = mongoose.model("Address",addressSchema);

module.exports = Address;