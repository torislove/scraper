const fs = require('fs');
const path = require('path');

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

function _flushVendors() {
  if (cachedVendors) {
    fs.writeFile(vendorsFile, JSON.stringify(cachedVendors), (err) => {
      if (err) console.error('Failed to write vendors file:', err.message);
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

function saveVendor(userId, vendor) {
  const all = getVendors(); 
  const idx = all.findIndex(v => 
    v.id === vendor.id || 
    (v.mapsLink && vendor.mapsLink && v.mapsLink === vendor.mapsLink) || 
    (v.name && vendor.name && v.phone && vendor.phone && v.name === vendor.name && v.phone === vendor.phone)
  );
  vendor.userId = userId || vendor.userId || 'admin_1'; 
  
  if (idx !== -1) {
    // Preserve the original ID so we don't duplicate on next runs
    vendor.id = all[idx].id;
    
    // Merge arrays to not lose data
    if (all[idx].images && vendor.images) {
      vendor.images = [...new Set([...all[idx].images, ...vendor.images])];
    }
    
    all[idx] = { ...all[idx], ...vendor };
  } else {
    all.push(vendor);
  }
  
  // Debounced write (1000ms window) for ultra-fast scraping
  clearTimeout(vendorsWriteTimeout);
  vendorsWriteTimeout = setTimeout(_flushVendors, 1000);
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
