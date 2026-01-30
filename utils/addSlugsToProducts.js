const mongoose = require('mongoose');
const Product = require('../models/productSchema');
const slugify = require('slugify');
require('dotenv').config();

async function addSlugsToProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products without a slug
    const productsWithoutSlug = await Product.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });

    console.log(`Found ${productsWithoutSlug.length} products without slugs`);

    let updated = 0;
    let errors = 0;

    for (const product of productsWithoutSlug) {
      try {
        // Generate slug from product name
        let slug = slugify(product.name, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });

        // Check if slug already exists
        const existingProduct = await Product.findOne({ slug });
        if (existingProduct && existingProduct._id.toString() !== product._id.toString()) {
          // If slug exists, append product ID to make it unique
          slug = `${slug}-${product._id.toString().slice(-6)}`;
        }

        // Update the product with the new slug
        product.slug = slug;
        await product.save();
        
        console.log(`✓ Added slug "${slug}" to product: ${product.name}`);
        updated++;
      } catch (error) {
        console.error(`✗ Error updating product ${product.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total products: ${productsWithoutSlug.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);

    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    console.log('✅ Migration complete! You can now use slug URLs.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addSlugsToProducts();
