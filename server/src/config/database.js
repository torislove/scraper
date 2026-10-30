const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadharvest';
        await mongoose.connect(uri);
        console.log('LeadHarvest Engine connected to MongoDB');
    } catch (err) {
        console.warn('MongoDB connection warning (falling back to local memory adapter):', err.message);
    }
};

module.exports = connectDB;
