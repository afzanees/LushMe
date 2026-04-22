const mongoose = require('mongoose');
const {Schema} = mongoose;


const subcategorySchema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    offer: {                    // Optional offer for subcategory
      type: Number,
      default: 0
    },
    isListed: {
      type: Boolean,
      default: true
    }
  });


const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
    },
    description:{
        type:String,
        required:true,
    },
    categoryImage: {        // ✅ field for category image filename
        type: String,
        default: null
      },
    offerValidUntil: {
        type: Date,
        default: null,
      },
    isListed: {
        type: Boolean,
        default:true,
    },
    categoryOffer:{
        type:Number,
        default:0,
    },
    createdAt:{
        type: Date,
        default:Date.now
    },
<<<<<<< HEAD
    isDeleted:{
      type:Boolean,
      default:false
    },
=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
    subcategories: [subcategorySchema]

})

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
