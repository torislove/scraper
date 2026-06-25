require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const StagingLead = require('./models/StagingLead');

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const DATA_FILE = path.join(__dirname, 'data', 'scraped_vendors.json');
    if (!fs.existsSync(DATA_FILE)) {
      console.log('No scraped_vendors.json found. Nothing to migrate.');
      process.exit(0);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const vendors = JSON.parse(rawData);

    console.log(`Found ${vendors.length} vendors in local file. Starting migration...`);

    let inserted = 0;
    let skipped = 0;

    for (const vendor of vendors) {
      let parsedRating = null;
      if (vendor.rating && vendor.rating !== '-') {
        parsedRating = parseFloat(vendor.rating);
        if (isNaN(parsedRating)) parsedRating = null;
      }
      vendor.rating = parsedRating;

      const existing = await StagingLead.findOne({ id: vendor.id });
      if (!existing) {
        await StagingLead.create(vendor);
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`Migration Complete. Inserted: ${inserted}, Skipped (Already exists): ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
