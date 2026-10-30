const mongoose = require('mongoose');
const StagingLead = require('./models/StagingLead');
const fs = require('fs');
const path = require('path');

const backendEnvPath = path.join(__dirname, '../../backend/.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

async function clearVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/gomandap_scraper');
    console.log('Connected to MongoDB. Deleting all vendors...');
    const result = await StagingLead.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} vendors.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearVendors();
