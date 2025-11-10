const mongoose = require('mongoose');
const env = require('dotenv').config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connecting to:", process.env.MONGODB_URI);  // to checking database yrl
        console.log("✅ DB connected",mongoose.connection.name);
    } catch (error) {
        console.log("DB connecton error", error.message)
        process.exit(1)
    }
}
module.exports = connectDB;