const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const vendorsFile = path.join(dataDir, 'scraped_vendors.json');
const employeesFile = path.join(dataDir, 'employees.json');

// Ensure files exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(vendorsFile)) fs.writeFileSync(vendorsFile, JSON.stringify([]));
if (!fs.existsSync(employeesFile)) fs.writeFileSync(employeesFile, JSON.stringify([]));

// --- VENDORS ---
function getVendors() {
  try {
    return JSON.parse(fs.readFileSync(vendorsFile, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function saveVendors(data) {
  fs.writeFileSync(vendorsFile, JSON.stringify(data, null, 2));
}

// --- EMPLOYEES ---
function getEmployees() {
  try {
    return JSON.parse(fs.readFileSync(employeesFile, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function saveEmployees(data) {
  fs.writeFileSync(employeesFile, JSON.stringify(data, null, 2));
}

module.exports = {
  getVendors,
  saveVendors,
  getEmployees,
  saveEmployees
};
