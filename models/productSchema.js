const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new Schema({
  color: { 
    type: String, 
    required: true 
  },
  regularPrice: {
    type: Number, 
    required: true 
},
  salePrice: { 
    type: Number, 
    required: true 
},
  quantity: {
    type: Number,
    require:true
  },
    productImage: { 
    type: [String] 
},
});

const productSchema = new Schema({
  name: {
     type: String, 
     required: true 
    },
  description: { 
    type: String, 
    required: true 
},
  brand: { 
    type:  Schema.Types.ObjectId, 
    ref: 'Brand',
    required: true 
},
  category: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category',
    required: true 
},
  subcategory: {
     type: Schema.Types.ObjectId, 
     required: true 
    },
    isBlocked: {
      type: Boolean,
      default: false  
    },
    ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdOn: {
      type: Date,
      default: Date.now
    }
  }],


  productOffer: { 
    type: Number, 
    default: 0 
},

variants: [variantSchema], 
  isBlocked: { 
    type: Boolean, 
    default: false },
  status: {
    type: String,
    enum: ["Available", "Out Of Stock", "Discontinued"],
    required: true,
    default: "Available",
  },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);