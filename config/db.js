const mongoose = require('mongoose');
const env = require('dotenv').config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ DB connected");
    } catch (error) {
        console.log("DB connecton error", error.message)
        process.exit(1)
    }
}
module.exports = connectDB;