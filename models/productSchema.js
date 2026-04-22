const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new Schema({
  color: { 
    type: String, 
    required: true 
  },
<<<<<<< HEAD
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
    required:true
  },
    productImage: { 
    type: [String] 
},
=======
  price: { 
    type: Number, 
    required: true 
  },
  quantity: {
    type: Number,
    require:true
  }
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
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
<<<<<<< HEAD
slug: {
  type: String,
  unique: true,
},

=======
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
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
<<<<<<< HEAD
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


=======

  regularPrice: {
    type: Number, 
    required: true 
},
  salePrice: { 
    type: Number, 
    required: true 
},
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  productOffer: { 
    type: Number, 
    default: 0 
},
<<<<<<< HEAD
  offerValidUntil: {
    type: Date
  },

variants: [variantSchema], 

=======
  quantity: { 
    type: Number, 
    default: 0
 }, // ✅ fixed
  shade: { 
    type: String, 
    required: true 
},
  productImage: { 
    type: [String] 
},
variants: [variantSchema], 
  isBlocked: { 
    type: Boolean, 
    default: false },
>>>>>>> c911a6d6918394adcd05e7b533871a02e448c2e2
  status: {
    type: String,
    enum: ["Available", "Out Of Stock", "Discontinued"],
    required: true,
    default: "Available",
  },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);