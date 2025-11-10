const mongoose = require('mongoose')

const {Schema} = mongoose;

const brandSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    brandImage: {
      type: String,
      default: null
    },
    isListed: {
      type: Boolean,
      default: true
    },
    isBlocked:{
      type:Boolean,
      default:false
    }
  }, { timestamps: true });

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand;