const fs = require('fs');
const path = require('path');

// ── AUTHORITATIVE COMMERCIAL CLUSTERS FOR MAJOR INDIAN CITIES & METROS ──
const AUTHORITATIVE_CLUSTERS = {
  'mumbai': [
    'Colaba & Cuffe Parade', 'Fort & Marine Drive', 'Lower Parel & Worli',
    'Dadar & Prabhadevi', 'Byculla & Mazgaon', 'Bandra West & BKC',
    'Khar & Santacruz West', 'Juhu & Vile Parle', 'Andheri West & Lokhandwala',
    'Andheri East & MIDC', 'Jogeshwari & Oshiwara', 'Goregaon West & East',
    'Malad West & Mindspace', 'Kandivali West & East', 'Borivali West & IC Colony',
    'Dahisar', 'Kurla & BKC Annex', 'Ghatkopar & Vidyavihar',
    'Chembur & Govandi', 'Sion & Chunabhatti', 'Vikhroli & Kanjurmarg',
    'Powai & Hiranandani', 'Bhandup & Mulund', 'Thane West & Naupada'
  ],
  'bombay': [
    'Colaba & Cuffe Parade', 'Fort & Marine Drive', 'Lower Parel & Worli',
    'Dadar & Prabhadevi', 'Byculla & Mazgaon', 'Bandra West & BKC',
    'Khar & Santacruz West', 'Juhu & Vile Parle', 'Andheri West & Lokhandwala',
    'Andheri East & MIDC', 'Jogeshwari & Oshiwara', 'Goregaon West & East',
    'Malad West & Mindspace', 'Kandivali West & East', 'Borivali West & IC Colony',
    'Dahisar', 'Kurla & BKC Annex', 'Ghatkopar & Vidyavihar',
    'Chembur & Govandi', 'Sion & Chunabhatti', 'Vikhroli & Kanjurmarg',
    'Powai & Hiranandani', 'Bhandup & Mulund', 'Thane West & Naupada'
  ],
  'delhi': [
    'Connaught Place', 'Hauz Khas', 'South Extension', 'Karol Bagh', 'Saket', 
    'Lajpat Nagar', 'Vasant Kunj', 'Dwarka', 'Rohini', 'Pitampura', 
    'Chandni Chowk', 'Janakpuri', 'Laxmi Nagar', 'Noida Sector 18', 'Gurugram Cyber City'
  ],
  'new delhi': [
    'Connaught Place', 'Hauz Khas', 'South Extension', 'Karol Bagh', 'Saket', 
    'Lajpat Nagar', 'Vasant Kunj', 'Dwarka', 'Rohini', 'Pitampura', 
    'Chandni Chowk', 'Janakpuri', 'Laxmi Nagar', 'Noida Sector 18', 'Gurugram Cyber City'
  ],
  'bangalore': [
    'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 
    'Electronic City', 'Malleshwaram', 'Hebbal', 'Marathahalli', 'BTM Layout', 
    'JP Nagar', 'Rajajinagar', 'Yelahanka', 'Banashankari', 'Bellandur'
  ],
  'bengaluru': [
    'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 
    'Electronic City', 'Malleshwaram', 'Hebbal', 'Marathahalli', 'BTM Layout', 
    'JP Nagar', 'Rajajinagar', 'Yelahanka', 'Banashankari', 'Bellandur'
  ],
  'hyderabad': [
    'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'HITEC City', 'Madhapur', 
    'Kondapur', 'Secunderabad', 'Ameerpet', 'Kukatpally', 'Begumpet', 
    'Charminar', 'Himayatnagar', 'Dilsukhnagar', 'LB Nagar'
  ],
  'secunderabad': [
    'Paradise Secunderabad', 'MG Road Secunderabad', 'Sainikpuri', 'Trimulgherry',
    'Alwal', 'Marredpally', 'Tarnaka', 'Begumpet'
  ],
  'pune': [
    'Shivaji Nagar & Deccan Gymkhana',
    'Kothrud & Karve Road',
    'Koregaon Park & Bund Garden',
    'Kalyani Nagar & Nagar Road',
    'Viman Nagar & Airport Road',
    'Baner & Balewadi High Street',
    'Aundh & University Road',
    'Hinjawadi IT Park Phase 1 & 2',
    'Wakad & Dange Chowk',
    'Pimple Saudagar & Rahatani',
    'Pimpri & Chinchwad Station',
    'Bhosari & MIDC Industrial Area',
    'Nigdi & Akurdi Pradhikaran',
    'Hadapsar & Magarpatta City',
    'Fatima Nagar & Wanowrie',
    'Camp & MG Road (Pune Cantonment)',
    'Swargate & Tilak Road',
    'Bibwewadi & Market Yard',
    'Katraj & Kondhwa',
    'Sinhagad Road & Dhayari',
    'Warje & Karve Nagar',
    'Yerawada & Vishrantwadi',
    'Dhanori & Lohegaon',
    'Wagholi & Kharadi IT Hub'
  ],
  'punecity': [
    'Shivaji Nagar & Deccan Gymkhana',
    'Kothrud & Karve Road',
    'Koregaon Park & Bund Garden',
    'Kalyani Nagar & Nagar Road',
    'Viman Nagar & Airport Road',
    'Baner & Balewadi High Street',
    'Aundh & University Road',
    'Hinjawadi IT Park Phase 1 & 2',
    'Wakad & Dange Chowk',
    'Pimple Saudagar & Rahatani',
    'Pimpri & Chinchwad Station',
    'Bhosari & MIDC Industrial Area',
    'Nigdi & Akurdi Pradhikaran',
    'Hadapsar & Magarpatta City',
    'Fatima Nagar & Wanowrie',
    'Camp & MG Road (Pune Cantonment)',
    'Swargate & Tilak Road',
    'Bibwewadi & Market Yard',
    'Katraj & Kondhwa',
    'Sinhagad Road & Dhayari',
    'Warje & Karve Nagar',
    'Yerawada & Vishrantwadi',
    'Dhanori & Lohegaon',
    'Wagholi & Kharadi IT Hub'
  ],
  'guntur': [
    'Brodipet', 'Arundelpet', 'Lakshmipuram', 'Kothapet', 'Pattabhipuram', 
    'Brindavan Gardens', 'Old Guntur', 'SVN Colony', 'Guvvalagutta', 'Collector Office Road Guntur'
  ],
  'tenali': [
    'Tenali Central', 'Morrispet', 'Chenchupet', 'Ganga Mandiram', 'Chinaravuru', 
    'Nazarpet', 'Guntur Road Tenali', 'Gandhinagar Tenali'
  ],
  'mangalagiri': [
    'Mangalagiri Town', 'Temple Road Mangalagiri', 'Nowlur', 'Atmakur Mangalagiri', 
    'Old Bus Stand Mangalagiri', 'Tadepalle'
  ],
  'vijayawada': [
    'Benz Circle', 'Governorpet', 'Moghalrajpuram', 'Patamata', 'Auto Nagar', 
    'Bhavanipuram', 'Satyanarayanapuram', 'Gunadala', 'One Town Vijayawada', 'Machavaram'
  ],
  'visakhapatnam': [
    'Siripuram', 'Dwaraka Nagar', 'MVP Colony', 'Gajuwaka', 'Rushikonda', 
    'Madhurawada', 'Jagadamba Centre', 'Seethammadhara', 'Pendurthi'
  ],
  'chennai': [
    'T Nagar', 'Anna Nagar', 'Nungambakkam', 'Adyar', 'Velachery', 
    'Besant Nagar', 'Alwarpet', 'Mylapore', 'OMR', 'Kilpauk', 'Guindy', 'Porur'
  ],
  'kolkata': [
    'Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Alipore', 
    'Gariahat', 'Howrah Central', 'Behala', 'Dum Dum', 'Rajarhat'
  ],
  'jaipur': [
    'C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 
    'Raja Park', 'Tonk Road', 'MI Road', 'Jagatpura', 'Ajmer Road'
  ],
  'ahmedabad': [
    'SG Highway', 'Bodakdev', 'Satellite', 'Vastrapur', 'Prahlad Nagar', 
    'Navrangpura', 'Maninagar', 'Thaltej', 'Sindhu Bhavan', 'Ashram Road'
  ],
  'surat': [
    'Adajan', 'Athwa', 'Vesu', 'Ghod Dod Road', 'Varachha', 'Ring Road Surat', 'Katargam', 'Piplod'
  ],
  'lucknow': [
    'Gomti Nagar', 'Hazratganj', 'Alambagh', 'Indira Nagar', 'Mahanagar', 'Aminabad', 'Aliganj', 'Ashiyana'
  ],
  'kanpur': [
    'Civil Lines Kanpur', 'Swaroop Nagar', 'Mall Road Kanpur', 'Kakadeo', 'Kidwai Nagar', 'Govind Nagar', 'Gumti No 5', 'Harsh Nagar'
  ],
  'nagpur': [
    'Dharampeth', 'Ramdaspeth', 'Sitabuldi', 'Sadar', 'Wardha Road', 'Civil Lines Nagpur', 'Pratap Nagar', 'Manish Nagar'
  ],
  'indore': [
    'Vijay Nagar', 'Palasia', 'MG Road Indore', 'Rajwada', 'Chappan Dukan', 'Sapna Sangeeta', 'Bhawarkua', 'Annapurna'
  ],
  'bhopal': [
    'MP Nagar', 'Arera Colony', 'New Market Bhopal', 'Kolar Road', 'TT Nagar', 'Hoshangabad Road', 'Bairagarh', 'Govindpura'
  ],
  'coimbatore': [
    'RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Peelamedu', 'Race Course', 'Ramanathapuram', 'Saravanampatti', 'Singanallur'
  ],
  'madurai': [
    'KK Nagar Madurai', 'Simmakkal', 'Anna Nagar Madurai', 'Town Hall Road', 'West Tower Street', 'Mattuthavani', 'Sellur', 'Bye Pass Road'
  ],
  'kochi': [
    'MG Road Kochi', 'Marine Drive Kochi', 'Edappally', 'Kaloor', 'Kakkanad', 'Fort Kochi', 'Panampilly Nagar', 'Palarivattom'
  ],
  'chandigarh': [
    'Sector 17', 'Sector 35', 'Sector 22', 'Sector 8', 'Sector 9', 'Sector 26', 'Industrial Area Phase 1', 'Mohali Phase 7'
  ],
  'nashik': [
    'College Road Nashik', 'Gangapur Road', 'Panchavati', 'Dwarka Nashik', 'Indira Nagar Nashik', 'Mahatma Nagar', 'Satpur', 'Nashik Road'
  ],
  'rajkot': [
    'Yagnik Road', 'Kalawad Road', 'Ring Road Rajkot', 'University Road', 'Dhebar Road', 'Amin Marg', 'Kotecha Chowk', 'Mavdi'
  ],
  'varanasi': [
    'Sigra', 'Cantt Varanasi', 'Bhelupur', 'Godowlia', 'Lanka', 'Orderly Bazar', 'Mahmoorganj', 'Chowk Varanasi'
  ],
  'agra': [
    'Sanjay Place', 'Civil Lines Agra', 'Kamla Nagar', 'Tajganj', 'Dayal Bagh', 'MG Road Agra', 'Shahganj', 'Sadar Bazar Agra'
  ],
  'patna': [
    'Frazer Road', 'Boring Road', 'Kankarbagh', 'Bailey Road', 'Rajendra Nagar', 'Exhibition Road', 'Patliputra', 'Ashiana Nagar'
  ],
  'vadodara': [
    'Alkapuri', 'Sayajigunj', 'Fatehgunj', 'Gotri', 'Vasna Road', 'Manjalpur', 'Karelibaug', 'Old Padra Road'
  ],
  'ludhiana': [
    'Ferozepur Road', 'Model Town Ludhiana', 'Sarabha Nagar', 'Mall Road Ludhiana', 'Ghumar Mandi', 'Civil Lines Ludhiana', 'Pakhowal Road', 'Focal Point'
  ],
  'amritsar': [
    'Lawrence Road Amritsar', 'Mall Road Amritsar', 'Ranjit Avenue', 'Hall Bazar', 'Katra Jaimal Singh', 'Circular Road', 'Majitha Road', 'Cantonment'
  ],
  'dehradun': [
    'Rajpur Road', 'Paltan Bazar', 'Chakrata Road', 'Ballupur', 'Clement Town', 'Saharanpur Road', 'Dharampur', 'Karanpur'
  ],
  'guwahati': [
    'GS Road Guwahati', 'Christian Basti', 'Paltan Bazar Guwahati', 'Pan Bazar', 'Ganeshguri', 'Zoo Road', 'Dispur', 'Six Mile'
  ]
};

// ── IN-MEMORY INDEXING OF INDIA_VILLAGES.JSON ──
const districtIndex = new Map(); // cleanName -> { district, state, mandals: [] }
const mandalIndex = new Map();   // cleanName -> { subDistrict, district, state, villages: [] }
const villageIndex = new Map();  // cleanName -> { village, mandal, district, state, siblings: [] }
const stateIndex = new Map();    // cleanName -> { state, districts: [] }

let isInitialized = false;

function initIndiaGeoMemory() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const dbPath = path.join(__dirname, '../../db/india_villages.json');
    if (!fs.existsSync(dbPath)) return;

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    for (const stateObj of data) {
      const stateName = stateObj.state;
      if (!stateName) continue;
      const cleanState = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');

      const distList = [];
      if (stateObj.districts) {
        for (const distObj of stateObj.districts) {
          const distName = distObj.district;
          if (!distName) continue;
          distList.push(distName);
          const cleanDist = distName.toLowerCase().replace(/[^a-z0-9]/g, '');

          const subList = [];
          if (distObj.subDistricts) {
            for (const subObj of distObj.subDistricts) {
              const subName = subObj.subDistrict;
              if (!subName) continue;
              subList.push(subName);
              const cleanSub = subName.toLowerCase().replace(/[^a-z0-9]/g, '');
              const villages = Array.isArray(subObj.villages) ? subObj.villages : [];
              mandalIndex.set(cleanSub, { subDistrict: subName, district: distName, state: stateName, villages });

              // Index constituent villages with sibling proximity links
              for (const vName of villages) {
                if (!vName || typeof vName !== 'string') continue;
                const cleanV = vName.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!cleanV) continue;
                if (!villageIndex.has(cleanV)) {
                  villageIndex.set(cleanV, {
                    village: vName,
                    mandal: subName,
                    district: distName,
                    state: stateName,
                    siblings: villages.filter(x => x && x !== vName).slice(0, 8)
                  });
                }
              }
            }
          }

          districtIndex.set(cleanDist, { district: distName, state: stateName, mandals: subList });
        }
      }

      stateIndex.set(cleanState, { state: stateName, districts: distList });
    }

    // Authoritative Post-2022 Andhra Pradesh District Reorganization Overrides
    const AP_OVERRIDES = {
      'narasaraopet': { subDistrict: 'Narasaraopet', district: 'Palnadu', state: 'Andhra Pradesh' },
      'macherla': { subDistrict: 'Macherla', district: 'Palnadu', state: 'Andhra Pradesh' },
      'vinukonda': { subDistrict: 'Vinukonda', district: 'Palnadu', state: 'Andhra Pradesh' },
      'chilakaluripet': { subDistrict: 'Chilakaluripet', district: 'Palnadu', state: 'Andhra Pradesh' },
      'sattenapalle': { subDistrict: 'Sattenapalle', district: 'Palnadu', state: 'Andhra Pradesh' },
      'piduguralla': { subDistrict: 'Piduguralla', district: 'Palnadu', state: 'Andhra Pradesh' },
      'bapatla': { subDistrict: 'Bapatla', district: 'Bapatla', state: 'Andhra Pradesh' },
      'chirala': { subDistrict: 'Chirala', district: 'Bapatla', state: 'Andhra Pradesh' },
      'repalle': { subDistrict: 'Repalle', district: 'Bapatla', state: 'Andhra Pradesh' },
      'tenali': {
        subDistrict: 'Tenali',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Morrispet', 'Gandhinagar', 'Angalakuduru', 'Burripalem', 'China Ravuru', 'Kolakaluru', 'Nandivelugu', 'Katevaram', 'Pinapadu']
      },
      'vijayawada': { subDistrict: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh' },
      'machilipatnam': { subDistrict: 'Machilipatnam', district: 'Krishna', state: 'Andhra Pradesh' },
      'gudivada': { subDistrict: 'Gudivada', district: 'Krishna', state: 'Andhra Pradesh' }
    };

    for (const [key, val] of Object.entries(AP_OVERRIDES)) {
      mandalIndex.set(key, val);
    }

    console.log(`[Universal Geo Engine] Indexed ${stateIndex.size} states, ${districtIndex.size} districts, ${mandalIndex.size} mandals, and ${villageIndex.size} villages from local database.`);
  } catch (err) {
    console.error('[Universal Geo Engine] Error indexing india_villages.json:', err.message);
  }
}

// Ensure memory index is built on boot
initIndiaGeoMemory();

// High precision GPS anchors for map centers and distance computation
const ZONE_COORDINATES = {
  // Mumbai Key Zones
  'mumbai': { lat: 18.9220, lng: 72.8347 },
  'colaba & cuffe parade': { lat: 18.9067, lng: 72.8147 },
  'fort & marine drive': { lat: 18.9322, lng: 72.8315 },
  'lower parel & worli': { lat: 18.9986, lng: 72.8300 },
  'dadar & prabhadevi': { lat: 19.0178, lng: 72.8478 },
  'byculla & mazgaon': { lat: 18.9750, lng: 72.8360 },
  'bandra west & bkc': { lat: 19.0596, lng: 72.8295 },
  'khar & santacruz west': { lat: 19.0700, lng: 72.8350 },
  'juhu & vile parle': { lat: 19.1075, lng: 72.8263 },
  'andheri west & lokhandwala': { lat: 19.1363, lng: 72.8277 },
  'andheri east & midc': { lat: 19.1136, lng: 72.8697 },
  'jogeshwari & oshiwara': { lat: 19.1410, lng: 72.8420 },
  'goregaon west & east': { lat: 19.1663, lng: 72.8526 },
  'malad west & mindspace': { lat: 19.1860, lng: 72.8485 },
  'kandivali west & east': { lat: 19.2060, lng: 72.8540 },
  'borivali west & ic colony': { lat: 19.2288, lng: 72.8541 },
  'dahisar': { lat: 19.2500, lng: 72.8590 },
  'kurla & bkc annex': { lat: 19.0726, lng: 72.8845 },
  'ghatkopar & vidyavihar': { lat: 19.0860, lng: 72.9080 },
  'chembur & govandi': { lat: 19.0522, lng: 72.8994 },
  'sion & chunabhatti': { lat: 19.0400, lng: 72.8640 },
  'vikhroli & kanjurmarg': { lat: 19.1100, lng: 72.9280 },
  'powai & hiranandani': { lat: 19.1176, lng: 72.9060 },
  'bhandup & mulund': { lat: 19.1726, lng: 72.9565 },
  'thane west & naupada': { lat: 19.2183, lng: 72.9781 },

  // Metros
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'punecity': { lat: 18.5204, lng: 73.8567 },
  'pune city': { lat: 18.5204, lng: 73.8567 },
  'poona': { lat: 18.5204, lng: 73.8567 },
  'shivaji nagar & deccan gymkhana': { lat: 18.5314, lng: 73.8446 },
  'kothrud & karve road': { lat: 18.5074, lng: 73.8077 },
  'koregaon park & bund garden': { lat: 18.5362, lng: 73.8940 },
  'kalyani nagar & nagar road': { lat: 18.5463, lng: 73.9034 },
  'viman nagar & airport road': { lat: 18.5679, lng: 73.9143 },
  'baner & balewadi high street': { lat: 18.5590, lng: 73.7868 },
  'aundh & university road': { lat: 18.5580, lng: 73.8075 },
  'hinjawadi it park phase 1 & 2': { lat: 18.5913, lng: 73.7389 },
  'wakad & dange chowk': { lat: 18.5987, lng: 73.7686 },
  'pimple saudagar & rahatani': { lat: 18.5987, lng: 73.7997 },
  'pimpri & chinchwad station': { lat: 18.6279, lng: 73.8009 },
  'bhosari & midc industrial area': { lat: 18.6298, lng: 73.8478 },
  'nigdi & akurdi pradhikaran': { lat: 18.6517, lng: 73.7711 },
  'hadapsar & magarpatta city': { lat: 18.5089, lng: 73.9259 },
  'fatima nagar & wanowrie': { lat: 18.4988, lng: 73.8967 },
  'camp & mg road (pune cantonment)': { lat: 18.5167, lng: 73.8786 },
  'swargate & tilak road': { lat: 18.5018, lng: 73.8636 },
  'bibwewadi & market yard': { lat: 18.4789, lng: 73.8678 },
  'katraj & kondhwa': { lat: 18.4575, lng: 73.8677 },
  'sinhagad road & dhayari': { lat: 18.4712, lng: 73.8189 },
  'warje & karve nagar': { lat: 18.4833, lng: 73.8000 },
  'yerawada & vishrantwadi': { lat: 18.5529, lng: 73.8794 },
  'dhanori & lohegaon': { lat: 18.5833, lng: 73.8988 },
  'wagholi & kharadi it hub': { lat: 18.5515, lng: 73.9488 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },

  // Andhra Pradesh & Telangana
  'guntur': { lat: 16.3067, lng: 80.4365 },
  'brodipet': { lat: 16.3115, lng: 80.4372 },
  'arundelpet': { lat: 16.3032, lng: 80.4418 },
  'lakshmipuram': { lat: 16.3090, lng: 80.4285 },
  'kothapet': { lat: 16.2980, lng: 80.4500 },
  'pattabhipuram': { lat: 16.3160, lng: 80.4250 },
  'brindavan gardens': { lat: 16.3130, lng: 80.4190 },
  'old guntur': { lat: 16.2920, lng: 80.4580 },
  'svn colony': { lat: 16.3220, lng: 80.4140 },
  'guvvalagutta': { lat: 16.3010, lng: 80.4450 },
  'tenali': { lat: 16.2435, lng: 80.6400 },
  'mangalagiri': { lat: 16.4328, lng: 80.5694 },
  'tadepalle': { lat: 16.4820, lng: 80.6030 },
  'chebrolu': { lat: 16.1950, lng: 80.5280 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'narasaraopet': { lat: 16.2359, lng: 80.0499 },
  'bapatla': { lat: 15.9042, lng: 80.4673 },
  'chirala': { lat: 15.8246, lng: 80.3522 },
  'machilipatnam': { lat: 16.1875, lng: 81.1389 },
  'eluru': { lat: 16.7107, lng: 81.0952 },
  'rajahmundry': { lat: 17.0005, lng: 81.8040 },
  'kakinada': { lat: 16.9891, lng: 82.2475 },
  'tirupati': { lat: 13.6288, lng: 79.4192 },
  'nellore': { lat: 14.4426, lng: 79.9865 },
  'kurnool': { lat: 15.8281, lng: 78.0373 },
  'anantapur': { lat: 14.6819, lng: 77.6006 },
  'kadapa': { lat: 14.4673, lng: 78.8242 },
  'warangal': { lat: 17.9689, lng: 79.5941 },
  'karimnagar': { lat: 18.4386, lng: 79.1288 },
  'khammam': { lat: 17.2473, lng: 80.1514 },
  'nizamabad': { lat: 18.6725, lng: 78.0941 },
  'nalgonda': { lat: 17.0504, lng: 79.2669 }
};

// State reference points used to spread state-wide sweeps on the map. These are
// geographic anchors, not claims that every district sits at the capital.
const STATE_CENTERS = {
  'andhra pradesh': { lat: 16.5062, lng: 80.648, radius: 2.1 },
  'telangana': { lat: 17.385, lng: 78.4867, radius: 1.9 },
  'maharashtra': { lat: 19.7515, lng: 75.7139, radius: 2.4 },
  'karnataka': { lat: 15.3173, lng: 75.7139, radius: 2.2 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569, radius: 2.0 },
  'kerala': { lat: 10.8505, lng: 76.2711, radius: 1.2 },
  'gujarat': { lat: 22.2587, lng: 71.1924, radius: 2.0 },
  'rajasthan': { lat: 27.0238, lng: 74.2179, radius: 2.6 },
  'madhya pradesh': { lat: 23.5937, lng: 78.9629, radius: 2.6 },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462, radius: 2.6 },
  'bihar': { lat: 25.0961, lng: 85.3131, radius: 1.4 },
  'west bengal': { lat: 22.9868, lng: 87.855, radius: 1.5 },
  'odisha': { lat: 20.9517, lng: 85.0985, radius: 1.8 },
  'punjab': { lat: 31.1471, lng: 75.3412, radius: 1.2 },
  'haryana': { lat: 29.0588, lng: 76.0856, radius: 1.1 },
  'assam': { lat: 26.2006, lng: 92.9376, radius: 1.8 },
  'jharkhand': { lat: 23.6102, lng: 85.2799, radius: 1.3 },
  'chhattisgarh': { lat: 21.2787, lng: 81.8661, radius: 1.7 },
  'uttarakhand': { lat: 30.0668, lng: 79.0193, radius: 1.3 },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734, radius: 1.2 },
  'goa': { lat: 15.2993, lng: 74.124, radius: 0.4 },
  'delhi': { lat: 28.6139, lng: 77.209, radius: 0.25 }
};

// ── COORDINATE RESOLUTION HELPERS ──
// A zone may not have a hard-coded anchor. We first consult the persisted
// forward-geocode cache (populated by earlier runs), then fall back to a
// deterministic spread around the parent district centre. The spread keeps
// every zone distinct on the map and inside the search grid, and is flagged
// `isApproximate` so the UI never pretends it is a precise centroid.
function cachedZoneCoords(name, district) {
  if (!name) return null;
  try {
    const { getCache } = require('./olaMaps');
    const cache = getCache() || {};
    const keys = [];
    if (district) keys.push(`${name}, ${district}, india`);
    keys.push(`${name}, india`, `${name}`);
    for (const key of keys) {
      const hit = cache[key.toLowerCase().trim()];
      if (hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lng))) {
        return { lat: Number(hit.lat), lng: Number(hit.lng), isApproximate: false };
      }
    }
  } catch (error) {}
  return null;
}

function spreadCoords(center, index, total, radius = 0.075) {
  if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) return null;
  const golden = 2.399963229728653;
  const angle = golden * (index + 1);
  const ring = 0.35 + 0.65 * Math.sqrt(((index + 1) / Math.max(1, total)));
  return {
    lat: Number((Number(center.lat) + Math.sin(angle) * radius * ring).toFixed(5)),
    lng: Number((Number(center.lng) + Math.cos(angle) * radius * ring).toFixed(5)),
    isApproximate: true
  };
}

function zoneCoordinates(name, district, index = 0, total = 1) {
  const key = String(name || '').toLowerCase().trim();
  const districtKey = String(district || '').toLowerCase().trim();
  const direct = ZONE_COORDINATES[key];
  if (direct) return { lat: direct.lat, lng: direct.lng, isApproximate: false };

  const cached = cachedZoneCoords(name, district);
  if (cached) return cached;

  const center = ZONE_COORDINATES[districtKey] || cachedZoneCoords(district, '') || null;
  return spreadCoords(center, index, total, 0.075);
}

// ── UNIVERSAL CATEGORY & LOCALITY INTELLIGENCE ENGINE ──
function getUniversalCategoryVectors(category, cleanLoc) {  let cat = (category || 'Business').trim();
  cat = cat.replace(new RegExp(`\\s+(in|near|at|around)\\s+.*$`, 'i'), '').trim();
  if (!cat) cat = 'Business';
  const lowerCat = cat.toLowerCase();

  // Photography / Studio / Album Printing
  if (lowerCat.includes('photo') || lowerCat.includes('camera') || lowerCat.includes('studio') || lowerCat.includes('album') || lowerCat.includes('shoot') || lowerCat.includes('video')) {
    return [
      { zoneName: `${cleanLoc} Photo Studios`, queryText: `Photo Studio in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding Photographers`, queryText: `Wedding Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Digital Video & Press`, queryText: `Digital Studio & Video in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Photography`, queryText: `Commercial Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Main Road Photo Hub`, queryText: `Photographers near Main Road, ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Top Rated Studios`, queryText: `Best Photo Studio in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // Generic Dynamic Vectors
  return [
    { zoneName: `${cleanLoc} Core`, queryText: `${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Top Rated`, queryText: `Best ${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Central / Main`, queryText: `${cat} in ${cleanLoc} Central`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Commercial Market`, queryText: `${cat} near Market, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Station & Bus Stand Area`, queryText: `${cat} near Railway Station / Bus Stand, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Services`, queryText: `${cat} Services in ${cleanLoc}`, isVectorQuery: true }
  ];
}

// ── UNIVERSAL ZONE CLUSTER RESOLVER ──
function resolveUniversalZones(location, category = '', isMaster = false) {
  if (!location || typeof location !== 'string') {
    return [{ zoneName: 'Central Area', queryText: 'Central Area', isSingle: true }];
  }

  const cleanLoc = location.trim();
  const lowerLoc = cleanLoc.toLowerCase().replace(/[^a-z0-9]/g, '');
  const primaryName = cleanLoc.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const strippedName = cleanLoc.replace(/\b(district|dist|mandal|mandals|tehsil|taluk|state|city|town)\b/gi, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check if query is an explicit broad sweep
  const isExplicitDistrict = /\b(district|dist)\b/i.test(cleanLoc);
  const isExplicitState = stateIndex.has(strippedName) || stateIndex.has(lowerLoc) || stateIndex.has(primaryName);

  // In Client mode: block explicit district or state sweeps
  if (!isMaster) {
    if (isExplicitDistrict || isExplicitState) {
      throw new Error(`Client searches are restricted strictly to individual cities, mandals and villages. District and state-wide sweeps require Master Command Center.`);
    }
  }

  // 1. Authoritative Pre-Mapped Cities & Metros (All 24 Mumbai Wards, All Delhi Wards, etc.)
  // Runs comprehensively across ALL localities of the city (NO arbitrary truncation)
  for (const [key, zones] of Object.entries(AUTHORITATIVE_CLUSTERS)) {
    if (!isExplicitDistrict && (lowerLoc === key || primaryName === key || strippedName === key) && !lowerLoc.includes('rural')) {
      const targetList = zones; // Comprehensive search of ALL city wards
      return targetList.map((z, idx) => {
        let coords = ZONE_COORDINATES[z.toLowerCase()] || null;
        if (!coords && (ZONE_COORDINATES[key] || ZONE_COORDINATES[strippedName])) {
          const base = ZONE_COORDINATES[key] || ZONE_COORDINATES[strippedName];
          const angle = (idx * 2 * Math.PI) / targetList.length;
          coords = {
            lat: Number((base.lat + 0.02 * Math.cos(angle)).toFixed(5)),
            lng: Number((base.lng + 0.02 * Math.sin(angle)).toFixed(5))
          };
        }
        const prefix = category ? `${category} in ` : '';
        return {
          zoneName: z,
          queryText: `${prefix}${z}, ${cleanLoc}`,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 2. District Headquarters / Major City Sweep (e.g. Solapur, Ujjain, Kurnool, Warangal, Bareilly, etc.)
  if (!isExplicitDistrict && (districtIndex.has(lowerLoc) || districtIndex.has(primaryName))) {
    const entry = districtIndex.get(lowerLoc) || districtIndex.get(primaryName);
    const cityName = entry.district;
    const cityLower = cityName.toLowerCase();
    const cityCenter = ZONE_COORDINATES[cityLower] || ZONE_COORDINATES[lowerLoc] || null;
    const prefix = category ? (category + ' in ') : '';

    const citySectors = [
      { name: cityName + ' Central Commercial Hub', query: prefix + cityName + ' Central' },
      { name: cityName + ' Main Market & Bazaar Area', query: prefix + 'near Main Market / Bazaar, ' + cityName },
      { name: cityName + ' Railway Station & Bus Stand', query: prefix + 'near Railway Station, ' + cityName },
      { name: cityName + ' Main Arterial / Ring Road', query: prefix + 'near Main Road, ' + cityName },
      { name: cityName + ' Industrial & Trade Zone', query: prefix + 'Industrial Estate, ' + cityName },
      { name: cityName + ' Top Rated Specialists', query: 'Best ' + (category || 'Services') + ' in ' + cityName },
      { name: cityName + ' North Sector', query: prefix + cityName + ' North' },
      { name: cityName + ' South Sector', query: prefix + cityName + ' South' }
    ];

    return citySectors.map((sector, idx) => {
      let sCoords = null;
      if (cityCenter && cityCenter.lat && cityCenter.lng) {
        const angle = (idx * 2 * Math.PI) / citySectors.length;
        sCoords = {
          lat: Number((cityCenter.lat + 0.016 * Math.cos(angle)).toFixed(5)),
          lng: Number((cityCenter.lng + 0.016 * Math.sin(angle)).toFixed(5))
        };
      }
      return {
        zoneName: sector.name,
        queryText: sector.query,
        district: entry.district,
        state: entry.state,
        lat: sCoords ? sCoords.lat : null,
        lng: sCoords ? sCoords.lng : null,
        isVectorQuery: true,
        isSingle: false
      };
    });
  }

  // 3. Village Multi-Node Expansion Protocol
  // If user searched a village, expand to village hub + nearby contiguous villages + mandal center!
  const cleanVNorm = lowerLoc.replace(/u$/, '').replace(/a$/, '');
  const villageEntry = villageIndex.get(lowerLoc) || villageIndex.get(primaryName) || villageIndex.get(cleanVNorm);
  if (villageEntry) {
    const vName = villageEntry.village;
    const mName = villageEntry.mandal;
    const dName = villageEntry.district;
    const sName = villageEntry.state;
    const prefix = category ? `${category} in ` : '';
    const centerCoords = zoneCoordinates(mName, dName, 0, 1);

    const zones = [];
    // A. Primary Village Node
    zones.push({
      zoneName: `${vName} Village`,
      queryText: `${prefix}${vName}, ${mName} Mandal`,
      district: dName,
      state: sName,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      isVectorQuery: true,
      isSingle: false
    });

    // B. Contiguous Neighboring Villages in the same mandal (within 5-8km)
    const siblings = Array.isArray(villageEntry.siblings) ? villageEntry.siblings : [];
    const chosenSiblings = siblings.slice(0, 4);
    chosenSiblings.forEach((sibling, sIdx) => {
      let sCoords = null;
      if (centerCoords?.lat && centerCoords?.lng) {
        const angle = (sIdx * 2 * Math.PI) / (chosenSiblings.length || 1);
        sCoords = {
          lat: Number((centerCoords.lat + 0.012 * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + 0.012 * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: `${sibling} (Nearby)`,
        queryText: `${prefix}${sibling}, ${mName}`,
        district: dName,
        state: sName,
        lat: sCoords?.lat || null,
        lng: sCoords?.lng || null,
        isVectorQuery: true,
        isSingle: false
      });
    });

    // C. Parent Mandal Commercial Center Hub
    zones.push({
      zoneName: `${mName} Mandal Center`,
      queryText: `${prefix}${mName} Central`,
      district: dName,
      state: sName,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      isVectorQuery: true,
      isSingle: false
    });

    return zones;
  }

  // 3. Mandal / Tehsil Full-Coverage Sweep
  if (mandalIndex.has(lowerLoc) || mandalIndex.has(primaryName)) {
    const entry = mandalIndex.get(lowerLoc) || mandalIndex.get(primaryName);
    const townName = entry.subDistrict || cleanLoc.split(',')[0].trim();
    const townLower = townName.toLowerCase();
    const centerCoords = zoneCoordinates(townName, entry.district, 0, 1);
    const prefix = category ? `${category} in ` : '';

    const zones = [];
    // Mandal Central Hub
    zones.push({
      zoneName: `${townName} Central`,
      queryText: `${prefix}${townName} Central`,
      district: entry.district,
      state: entry.state,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      isVectorQuery: true,
      isSingle: false
    });

    // Constituent commercial villages across mandal (top 8-10 villages)
    const villages = Array.isArray(entry.villages) ? entry.villages : [];
    const selectedVillages = villages.slice(0, 8);
    selectedVillages.forEach((village, idx) => {
      let vCoords = null;
      if (centerCoords?.lat && centerCoords?.lng) {
        const angle = (idx * 2 * Math.PI) / (selectedVillages.length || 1);
        vCoords = {
          lat: Number((centerCoords.lat + 0.014 * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + 0.014 * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: village,
        queryText: `${prefix}${village}, ${townName}`,
        district: entry.district,
        state: entry.state,
        lat: vCoords?.lat || null,
        lng: vCoords?.lng || null,
        isVectorQuery: true,
        isSingle: false
      });
    });

    return zones;
  }

  // 4. District Sweep: ONLY MASTER CAN DO DISTRICT-WIDE SWEEPS!
  if (isExplicitDistrict && isMaster) {
    const entry = districtIndex.get(strippedName) || districtIndex.get(lowerLoc) || districtIndex.get(primaryName);
    if (entry && entry.mandals && entry.mandals.length > 0) {
      const selected = entry.mandals.slice(0, 60);
      return selected.map((m, index) => {
        const coords = zoneCoordinates(m, entry.district, index, selected.length);
        const prefix = category ? `${category} in ` : '';
        return {
          zoneName: m,
          queryText: `${prefix}${m}, ${entry.district}`,
          district: entry.district,
          state: entry.state,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          isApproximate: Boolean(coords?.isApproximate),
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 5. State Sweep: ONLY MASTER CAN DO STATE-WIDE SWEEPS!
  if (isExplicitState && isMaster) {
    const entry = stateIndex.get(strippedName) || stateIndex.get(lowerLoc) || stateIndex.get(primaryName);
    if (entry && entry.districts && entry.districts.length > 0) {
      const topDistricts = entry.districts.slice(0, 32);
      const center = STATE_CENTERS[entry.state.toLowerCase()] || STATE_CENTERS[strippedName] || null;
      return topDistricts.map((d, index) => {
        const prefix = category ? `${category} in ` : '';
        const coords = zoneCoordinates(d, d, index, topDistricts.length)
          || (center ? spreadCoords(center, index, topDistricts.length, center.radius) : null);
        return {
          zoneName: d,
          queryText: `${prefix}${d}, ${entry.state}`,
          district: d,
          state: entry.state,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          isApproximate: Boolean(coords?.isApproximate),
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 6. Comprehensive City / District Headquarter Sweep for ANY Indian City
  // (e.g. Coimbatore, Nashik, Agra, Varanasi, Kanpur, Nellore, Tirupati, etc.)
  const cityName = cleanLoc.split(',')[0].trim();
  const cityLower = cityName.toLowerCase();
  const cityCenter = ZONE_COORDINATES[cityLower] || ZONE_COORDINATES[lowerLoc] || null;
  const prefix = category ? `${category} in ` : '';

  const citySectors = [
    { name: `${cityName} Central Commercial Hub`, query: `${prefix}${cityName} Central`, offset: 0 },
    { name: `${cityName} Main Market & Bazaar Area`, query: `${prefix}near Main Market / Bazaar, ${cityName}`, offset: 0.012 },
    { name: `${cityName} Railway Station & Bus Stand`, query: `${prefix}near Railway Station, ${cityName}`, offset: -0.012 },
    { name: `${cityName} Main Arterial / Ring Road`, query: `${prefix}near Main Road, ${cityName}`, offset: 0.018 },
    { name: `${cityName} Industrial & Trade Zone`, query: `${prefix}Industrial Estate, ${cityName}`, offset: -0.018 },
    { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 },
    { name: `${cityName} North Sector`, query: `${prefix}${cityName} North`, offset: 0.022 },
    { name: `${cityName} South Sector`, query: `${prefix}${cityName} South`, offset: -0.022 }
  ];

  return citySectors.map((sector, idx) => {
    let sCoords = null;
    if (cityCenter?.lat && cityCenter?.lng) {
      const angle = (idx * 2 * Math.PI) / citySectors.length;
      sCoords = {
        lat: Number((cityCenter.lat + 0.016 * Math.cos(angle)).toFixed(5)),
        lng: Number((cityCenter.lng + 0.016 * Math.sin(angle)).toFixed(5))
      };
    }
    return {
      zoneName: sector.name,
      queryText: sector.query,
      lat: sCoords?.lat || null,
      lng: sCoords?.lng || null,
      isVectorQuery: true,
      isSingle: false
    };
  });
}

function classifyLocation(queryOrLoc) {
  if (!queryOrLoc || typeof queryOrLoc !== 'string') {
    return { type: 'unknown', name: '', zoneCount: 1, estimatedLeads: 50, badge: '📍 LOCAL', label: 'Local search' };
  }

  let text = queryOrLoc.trim();
  const prepMatch = text.match(/\s+(in|near|around|at|across|within)\s+(.+)$/i);
  let locCandidate = prepMatch ? prepMatch[2].trim() : text;
  locCandidate = locCandidate.replace(/^(the|a|an)\s+/i, '').replace(/[?,.!]+$/, '').trim();

  const explicitDistrict = /\b(district|dist)\b/i.test(locCandidate);
  const explicitState = /\b(state)\b/i.test(locCandidate);
  const stripped = locCandidate.replace(/\b(district|dist|mandal|tehsil|taluk|state|city|town|metro)\b/gi, '').trim();

  const rawCandidates = [
    locCandidate,
    stripped,
    locCandidate.split(',')[0].trim(),
    stripped.split(',')[0].trim(),
    locCandidate.split(',').pop().trim()
  ].filter(Boolean);

  const cleanCandidates = [...new Set(rawCandidates.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')))];

  // Check state
  for (const c of cleanCandidates) {
    if (stateIndex.has(c)) {
      const stateObj = stateIndex.get(c);
      const count = stateObj.districts ? stateObj.districts.length : 30;
      return {
        type: 'state',
        name: stateObj.state,
        zoneCount: count,
        estimatedLeads: count * 80,
        badge: '🌐 STATE-WIDE',
        label: `State sweep: ${stateObj.state} (${count} districts)`
      };
    }
  }

  // Check district
  if (explicitDistrict) {
    for (const c of cleanCandidates) {
      if (districtIndex.has(c)) {
        const distObj = districtIndex.get(c);
        const count = distObj.mandals ? distObj.mandals.length : 25;
        return {
          type: 'district',
          name: distObj.district,
          zoneCount: count,
          estimatedLeads: count * 45,
          badge: '🗺️ DISTRICT-WIDE',
          label: `District sweep: ${distObj.district} (${count} mandals)`
        };
      }
    }
  }

  // Check metro / city cluster
  for (const c of cleanCandidates) {
    if (AUTHORITATIVE_CLUSTERS[c]) {
      const zones = AUTHORITATIVE_CLUSTERS[c];
      return {
        type: 'metro',
        name: c.charAt(0).toUpperCase() + c.slice(1),
        zoneCount: zones.length,
        estimatedLeads: zones.length * 50,
        badge: '🏙️ METRO/CITY',
        label: `City sweep: ${zones.length} urban wards`
      };
    }
  }

  // Check village
  for (const c of cleanCandidates) {
    const cleanNorm = c.replace(/u$/, '').replace(/a$/, '');
    if (villageIndex.has(c) || villageIndex.has(cleanNorm)) {
      const vObj = villageIndex.get(c) || villageIndex.get(cleanNorm);
      return {
        type: 'village',
        name: vObj.village,
        zoneCount: 6,
        estimatedLeads: 40,
        badge: '🏡 VILLAGE EXPANSION',
        label: `Village multi-node: ${vObj.village} + ${vObj.mandal} Mandal`
      };
    }
  }

  // Check mandal
  for (const c of cleanCandidates) {
    if (mandalIndex.has(c)) {
      const mObj = mandalIndex.get(c);
      return {
        type: 'mandal',
        name: mObj.subDistrict,
        zoneCount: 8,
        estimatedLeads: 60,
        badge: '📍 MANDAL/TOWN',
        label: `Mandal sweep: ${mObj.subDistrict} (${mObj.district})`
      };
    }
  }

  return {
    type: 'city',
    name: locCandidate,
    zoneCount: 8,
    estimatedLeads: 70,
    badge: '🏙️ CITY/TOWN',
    label: `City sweep: ${locCandidate}`
  };
}

module.exports = {
  resolveUniversalZones,
  getUniversalCategoryVectors,
  classifyLocation,
  zoneCoordinates,
  cachedZoneCoords,
  spreadCoords,
  AUTHORITATIVE_CLUSTERS,
  ZONE_COORDINATES,
  STATE_CENTERS,
  mandalIndex,
  districtIndex,
  villageIndex,
  stateIndex
};
