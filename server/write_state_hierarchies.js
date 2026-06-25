const fs = require('fs');
const path = require('path');

const cachePath = path.join(__dirname, 'data/resolved_hierarchies.json');
const dataDir = path.dirname(cachePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let resolvedCache = {};
if (fs.existsSync(cachePath)) {
  try {
    resolvedCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    resolvedCache = {};
  }
}

const telanganaDistricts = [
  "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", 
  "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", 
  "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", 
  "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", 
  "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", 
  "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", 
  "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
];

const apDistricts = [
  "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", 
  "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", 
  "Konaseema", "Krishna", "Kurnool", "Nandyal", "NTR", 
  "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", 
  "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", 
  "YSR"
];

resolvedCache["telangana"] = {
  level: "state",
  stateName: "Telangana",
  hierarchy: telanganaDistricts.map(d => ({ districtName: d, mandals: [] }))
};

resolvedCache["andhra pradesh"] = {
  level: "state",
  stateName: "Andhra Pradesh",
  hierarchy: apDistricts.map(d => ({ districtName: d, mandals: [] }))
};

fs.writeFileSync(cachePath, JSON.stringify(resolvedCache, null, 2));
console.log('Successfully pre-populated resolved_hierarchies.json cache file with Telangana and Andhra Pradesh districts.');
