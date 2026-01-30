const mongoose = require('mongoose');
const User = require('../models/userSchema');
const Product = require('../models/productSchema');
require('dotenv').config();

async function cleanWishlists() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({ wishlist: { $exists: true, $ne: [] } });
    console.log(`Found ${users.length} users with wishlists`);

    let cleanedCount = 0;

    for (const user of users) {
      if (!user.wishlist || user.wishlist.length === 0) continue;

      console.log(`\nChecking user: ${user.email}`);
      console.log(`Current wishlist length: ${user.wishlist.length}`);
      console.log(`Wishlist IDs:`, user.wishlist);

      // Check which products exist
      const validProducts = [];
      for (const productId of user.wishlist) {
        const exists = await Product.findById(productId);
        if (exists) {
          validProducts.push(productId);
          console.log(`  ✓ Product ${productId} exists`);
        } else {
          console.log(`  ✗ Product ${productId} NOT FOUND - will remove`);
        }
      }

      // Update if needed
      if (validProducts.length !== user.wishlist.length) {
        user.wishlist = validProducts;
        await user.save();
        console.log(`✅ Cleaned wishlist: ${user.wishlist.length} → ${validProducts.length}`);
        cleanedCount++;
      } else {
        console.log(`✓ Wishlist already clean`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total users checked: ${users.length}`);
    console.log(`Users cleaned: ${cleanedCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanWishlists();
