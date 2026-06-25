const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Background Cloud HTTP Sync for Oracle Cloud Free Tier
if (process.env.CLOUD_SYNC_URL) {
  const axios = require('axios');
  console.log(`✅ Cloud HTTP Sync Active. Polling: ${process.env.CLOUD_SYNC_URL}`);
  setInterval(async () => {
    try {
      const res = await axios.get(`${process.env.CLOUD_SYNC_URL}?secret=${process.env.SYNC_SECRET || 'sync123'}`);
      if (res.data && Array.isArray(res.data.vendors)) {
        const cloudVendors = res.data.vendors;
        const localMap = new Map();
        
        // Load current local
        if (!cachedVendors) {
          try { cachedVendors = JSON.parse(fs.readFileSync(vendorsFile, 'utf-8')); } 
          catch (e) { cachedVendors = []; }
        }
        
        cachedVendors.forEach(v => localMap.set(v.id, v));
        // Overwrite with cloud vendors (cloud is source of truth for public scrapes)
        cloudVendors.forEach(v => localMap.set(v.id, v));
        
        cachedVendors = Array.from(localMap.values());
        _flushVendors();
      }
    } catch (err) {
      console.error('[Cloud Sync] Error fetching leads from Oracle Cloud:', err.message);
    }
  }, 10000); // every 10 seconds
}

// Flexible Schema to accept all scraped fields
const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: String,
  name: String
}, { strict: false });

const VendorModel = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

const dataDir = path.join(__dirname, '../../data');
const vendorsFile = path.join(dataDir, 'scraped_vendors.json');
const outOfBoundsFile = path.join(dataDir, 'out_of_bounds.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure files exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(vendorsFile)) fs.writeFileSync(vendorsFile, JSON.stringify([]));
if (!fs.existsSync(outOfBoundsFile)) fs.writeFileSync(outOfBoundsFile, JSON.stringify([]));
if (!fs.existsSync(usersFile)) {
  const defaultUsers = [{
    id: 'admin_1',
    username: 'admin',
    password: 'password123',
    role: 'admin',
    subscription: 'Enterprise'
  }];
  fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
}

// --- USERS ---
function getUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8')); } catch (e) { return []; }
}
function saveUsers(data) { fs.writeFileSync(usersFile, JSON.stringify(data, null, 2)); }

// --- MEMORY BUFFERED I/O FOR BLAZING FAST SCRAPING ---
let cachedVendors = null;
let cachedOutOfBounds = null;
let vendorsWriteTimeout = null;
let oobWriteTimeout = null;

let pendingMongoUpdates = {};
let mongoWriteTimeout = null;

function _flushVendors() {
  if (cachedVendors) {
    fs.writeFile(vendorsFile, JSON.stringify(cachedVendors), (err) => {
      if (err) console.error('Failed to write vendors file:', err.message);
    });
  }
}

function _flushMongo() {
  const updates = Object.values(pendingMongoUpdates);
  if (updates.length === 0) return;
  pendingMongoUpdates = {};

  if (mongoose.connection.readyState === 1) {
    const bulkOps = updates.map(vendor => ({
      updateOne: {
        filter: { id: vendor.id },
        update: { $set: vendor },
        upsert: true
      }
    }));
    VendorModel.bulkWrite(bulkOps)
      .then(res => {
        console.log(`[MongoDB] Bulk upserted ${updates.length} vendors to cloud database.`);
      })
      .catch(err => {
        console.error('[MongoDB] Bulk write failed, attempting individual fallbacks:', err.message);
        updates.forEach(vendor => {
          VendorModel.updateOne({ id: vendor.id }, vendor, { upsert: true })
            .catch(e => console.error('[MongoDB] Fallback write failed:', e.message));
        });
      });
  }
}

function _syncFromMongo() {
  if (mongoose.connection.readyState === 1) {
    VendorModel.find({}).lean().then(docs => {
      const mongoMap = new Map();
      docs.forEach(d => {
        delete d._id;
        delete d.__v;
        mongoMap.set(d.id, d);
      });
      // Ensure pending writes aren't overwritten by stale Mongo data
      Object.values(pendingMongoUpdates).forEach(d => {
        mongoMap.set(d.id, d);
      });
      cachedVendors = Array.from(mongoMap.values());
      _flushVendors(); // Write to local JSON for fast booting
    }).catch(e => console.error("[MongoDB] Sync error:", e.message));
  }
}

// Sync from MongoDB automatically when connection opens
mongoose.connection.once('open', () => {
  console.log('✅ MongoDB connection established. Preloading cache from DB...');
  _syncFromMongo();
});

function _flushOutOfBounds() {
  if (cachedOutOfBounds) {
    fs.writeFile(outOfBoundsFile, JSON.stringify(cachedOutOfBounds), (err) => {
      if (err) console.error('Failed to write out of bounds file:', err.message);
    });
  }
}

// --- MULTI-TENANT VENDORS ---
function getVendors(userId) {
  if (!cachedVendors) {
    try { cachedVendors = JSON.parse(fs.readFileSync(vendorsFile, 'utf-8')); } 
    catch (e) { cachedVendors = []; }
  }
  if (!userId) return cachedVendors;
  return cachedVendors.filter(v => v.userId === userId);
}

function saveVendor(userId, vendor) {
  const all = getVendors(); 
  const idx = all.findIndex(v => v.id === vendor.id);
  vendor.userId = userId || vendor.userId || 'admin_1'; 
  
  if (idx !== -1) {
    all[idx] = vendor;
  } else {
    all.push(vendor);
  }
  
  // Debounced write (1000ms window) for ultra-fast scraping
  clearTimeout(vendorsWriteTimeout);
  vendorsWriteTimeout = setTimeout(_flushVendors, 1000);

  // Buffer and bulk-upsert MongoDB updates (every 2 seconds) for ultra-fast scraping
  pendingMongoUpdates[vendor.id] = vendor;
  clearTimeout(mongoWriteTimeout);
  mongoWriteTimeout = setTimeout(_flushMongo, 2000);
}

function deleteVendor(userId, vendorId) {
  let all = getVendors();
  cachedVendors = all.filter(v => !(v.id === vendorId && v.userId === userId));
  _flushVendors(); // Flush immediately on delete
}

function updateVendorsBatch(userId, updatedList) {
  const all = getVendors();
  const others = all.filter(v => v.userId !== userId);
  const updatedWithTenant = updatedList.map(v => ({...v, userId: userId}));
  cachedVendors = [...others, ...updatedWithTenant];
  _flushVendors(); // Flush immediately on batch updates
}

function saveVendors(data) {
  cachedVendors = data;
  _flushVendors();
}

// --- OUT OF BOUNDS ---
function getOutOfBounds() {
  if (!cachedOutOfBounds) {
    try { cachedOutOfBounds = JSON.parse(fs.readFileSync(outOfBoundsFile, 'utf-8')); } 
    catch (e) { cachedOutOfBounds = []; }
  }
  return cachedOutOfBounds;
}

function saveOutOfBounds(data) { 
  cachedOutOfBounds = data;
  _flushOutOfBounds();
}

function saveOutOfBoundsVendor(vendor) {
  const all = getOutOfBounds();
  const idx = all.findIndex(v => 
    v.id === vendor.id || 
    (v.mapsLink && vendor.mapsLink && v.mapsLink === vendor.mapsLink) || 
    (v.name && vendor.name && v.name === vendor.name)
  );
  
  if (idx !== -1) {
    vendor.id = all[idx].id;
    all[idx] = { ...all[idx], ...vendor };
  } else {
    all.push(vendor);
  }
  
  clearTimeout(oobWriteTimeout);
  oobWriteTimeout = setTimeout(_flushOutOfBounds, 1000);
}

// --- EMPLOYEES (Legacy Support) ---
const employeesFile = path.join(dataDir, 'employees.json');
if (!fs.existsSync(employeesFile)) fs.writeFileSync(employeesFile, JSON.stringify([]));

function getEmployees() {
  try { return JSON.parse(fs.readFileSync(employeesFile, 'utf-8')); } catch (e) { return []; }
}
function saveEmployees(data) { fs.writeFileSync(employeesFile, JSON.stringify(data, null, 2)); }

// --- PUBLIC USERS ---
const publicUsersFile = path.join(dataDir, 'public_users.json');
if (!fs.existsSync(publicUsersFile)) fs.writeFileSync(publicUsersFile, JSON.stringify([]));

function getPublicUsers() {
  try { return JSON.parse(fs.readFileSync(publicUsersFile, 'utf-8')); } catch (e) { return []; }
}
function savePublicUsers(data) { fs.writeFileSync(publicUsersFile, JSON.stringify(data, null, 2)); }

module.exports = {
  getUsers,
  saveUsers,
  getVendors,
  saveVendors,
  saveVendor,
  deleteVendor,
  updateVendorsBatch,
  getEmployees,
  saveEmployees,
  getPublicUsers,
  savePublicUsers,
  getOutOfBounds,
  saveOutOfBounds,
  saveOutOfBoundsVendor
};
