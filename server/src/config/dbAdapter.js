const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Background MongoDB Connection for Persistent Dual-Storage (Disabled as requested)
/*
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB (Dual-Persistence Active)'))
    .catch(e => console.error('MongoDB Connection Error:', e.message));
}
*/

// Flexible Schema to accept all scraped fields
const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: String,
  name: String
}, { strict: false });

const VendorModel = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

const { DATA_DIR: dataDir } = require('./paths');
const credits = require('../services/credits');
const vendorsFile = path.join(dataDir, 'scraped_vendors.json');
const outOfBoundsFile = path.join(dataDir, 'out_of_bounds.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure files exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(vendorsFile)) fs.writeFileSync(vendorsFile, JSON.stringify([]));
if (!fs.existsSync(outOfBoundsFile)) fs.writeFileSync(outOfBoundsFile, JSON.stringify([]));
if (!fs.existsSync(usersFile)) {
  // Never ship a known password. Operators can set ADMIN_PASSWORD; otherwise a
  // random one is generated and printed once on first boot.
  const crypto = require('crypto');
  const generated = !process.env.ADMIN_PASSWORD;
  const defaultUsers = [{
    id: 'admin_1',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url'),
    role: 'admin',
    subscription: 'Enterprise'
  }];
  fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
  if (generated) {
    console.log('[Auth] Generated admin password (set ADMIN_PASSWORD to control it):', defaultUsers[0].password);
  }
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

function flushSync() {
  clearTimeout(vendorsWriteTimeout);
  if (cachedVendors) {
    try {
      fs.writeFileSync(vendorsFile, JSON.stringify(cachedVendors, null, 2));
      console.log(`[dbAdapter] Synchronously committed ${cachedVendors.length} vendors to disk store.`);
    } catch (e) {
      console.error('[dbAdapter] Sync flush error:', e.message);
    }
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
        console.log(`[MongoDB Dual-Persistence] Bulk upserted ${updates.length} vendors to cloud database.`);
      })
      .catch(err => {
        console.error('[MongoDB Dual-Persistence] Bulk write failed, attempting individual fallbacks:', err.message);
        updates.forEach(vendor => {
          VendorModel.updateOne({ id: vendor.id }, vendor, { upsert: true })
            .catch(e => console.error('[MongoDB Dual-Persistence] Fallback write failed:', e.message));
        });
      });
  }
}

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

/* ------------------------------------------------------------------ */
/* Credit admission                                                    */
/*                                                                     */
/* Every lead that enters the database costs one credit, exactly once.  */
/* The known-id set is rebuilt from disk on boot, so existing leads are */
/* never charged retroactively and a re-scrape never double-charges.    */
/* ------------------------------------------------------------------ */

let knownLeadIds = null;

function knownLeads() {
  if (!knownLeadIds) {
    try {
      knownLeadIds = new Set(getVendors().map(vendor => vendor && vendor.id).filter(Boolean));
    } catch (e) {
      knownLeadIds = new Set();
    }
  }
  return knownLeadIds;
}

function admitLeads(list) {
  if (!credits.ENFORCED) return list;

  const known = knownLeads();
  const admitted = [];
  let dropped = 0;

  for (const vendor of list) {
    if (!vendor || !vendor.id || known.has(vendor.id)) {
      admitted.push(vendor);
      continue;
    }

    if (credits.spend(1).charged >= 1) {
      known.add(vendor.id);
      admitted.push(vendor);
    } else {
      dropped += 1;
    }
  }

  if (dropped) {
    console.warn(`[credits] run out — ${dropped} new lead(s) not stored. Balance: ${credits.status().left}`);
  }

  return admitted;
}

function saveVendor(userId, vendor) {
  const all = getVendors(); 
  const idx = all.findIndex(v => v.id === vendor.id);
  vendor.userId = userId || vendor.userId || 'admin_1'; 
  
  if (idx !== -1) {
    all[idx] = vendor;
  } else {
    // A brand-new lead costs one credit. If there is nothing left to spend the
    // lead is not stored at all, so the ledger can never go negative.
    if (credits.ENFORCED && !knownLeads().has(vendor.id)) {
      if (credits.spend(1).charged < 1) {
        console.warn('[credits] out of credits — lead not stored:', vendor.id);
        return false;
      }
      knownLeads().add(vendor.id);
    }
    all.push(vendor);
  }
  
  // Debounced write (1000ms window) for ultra-fast scraping
  clearTimeout(vendorsWriteTimeout);
  vendorsWriteTimeout = setTimeout(_flushVendors, 1000);

  // Buffer and bulk-upsert MongoDB updates (every 2 seconds) for ultra-fast scraping
  pendingMongoUpdates[vendor.id] = vendor;
  clearTimeout(mongoWriteTimeout);
  mongoWriteTimeout = setTimeout(_flushMongo, 2000);
  return true;
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
  cachedVendors = admitLeads(Array.isArray(data) ? data : []);
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
  saveOutOfBoundsVendor,
  flushSync
};
