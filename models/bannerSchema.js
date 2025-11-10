const mongoose = require("mongoose")  // this banner for home pge
const {Schema} = mongoose;

const bannerSchema = new Schema({
    image:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    link:{
        type:String
    },
    startDate:{
       type:Date,
       requiredtrue 
    },
    endDate:{
        type:Date,
        required:true
    }
})

const Banner = mongoose.model("Banner",bannerSchema);
module.exports = Banner