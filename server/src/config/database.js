const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://kadiyalamanoj8_db_user:Manoj%40587487@cluster0.rpsl7h6.mongodb.net/gomandapweb?retryWrites=true&w=majority';
        await mongoose.connect(uri);
        console.log('Scraper connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
