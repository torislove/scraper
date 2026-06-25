require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') }); // Try backend .env
require('dotenv').config(); // Fallback to local .env

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const StagingLead = require('./src/models/StagingLead');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gomandap_omni";

async function exportData() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Export Vendors
    console.log('Exporting vendors...');
    const vendors = await StagingLead.find().lean();
    const cleanVendors = vendors.map(v => {
      const { _id, __v, ...rest } = v;
      return rest;
    });
    fs.writeFileSync(path.join(dataDir, 'vendors.json'), JSON.stringify(cleanVendors, null, 2));
    console.log(`Successfully exported ${cleanVendors.length} vendors to data/vendors.json`);

    // We don't have an Employee model exported explicitly in the code snippets provided,
    // but if it exists, we can export it. For now, we create an empty array if not found.
    const employeesFile = path.join(dataDir, 'employees.json');
    if (!fs.existsSync(employeesFile)) {
      fs.writeFileSync(employeesFile, JSON.stringify([], null, 2));
      console.log('Initialized empty employees.json');
    } else {
      console.log('employees.json already exists.');
    }

    console.log('Export Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportData();
