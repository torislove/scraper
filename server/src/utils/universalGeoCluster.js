const fs = require('fs');
const path = require('path');

// Authoritative commercial clusters for major Indian Tier-1 & Tier-2 economic engines
const AUTHORITATIVE_CLUSTERS = {
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
    'Charminar', 'Himayatnagar', 'Malkajgiri', 'Manikonda'
  ],
  'mumbai': [
    'Bandra West', 'Andheri West', 'Andheri East', 'Juhu', 'Powai', 
    'Colaba', 'Dadar', 'Borivali', 'Malad', 'Goregaon', 
    'Thane West', 'Navi Mumbai', 'Kandivali', 'Lower Parel'
  ],
  'delhi': [
    'Connaught Place', 'Hauz Khas', 'South Extension', 'Karol Bagh', 'Saket', 
    'Lajpat Nagar', 'Vasant Kunj', 'Dwarka', 'Rohini', 'Pitampura', 
    'Chandni Chowk', 'Noida', 'Gurugram'
  ],
  'pune': [
    'Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Hinjewadi', 
    'Kothrud', 'Aundh', 'Shivajinagar', 'Wakad', 'Hadapsar', 'Magarpatta'
  ],
  'guntur': [
    'Guntur City', 'Tenali', 'Mangalagiri', 'Tadepalle', 'Chebrolu', 
    'Ponnur', 'Pedakakani', 'Medikonduru', 'Tadikonda', 'Thullur'
  ],
  'vijayawada': [
    'Benz Circle', 'Machavaram', 'Maruthi Nagar', 'Governorpet', 'Satyanarayanapuram', 
    'Bhavanipuram', 'Patamata', 'Auto Nagar', 'Moghalrajpuram', 'Gunadala',
    'One Town Vijayawada', 'Two Town Vijayawada', 'Payakapuram', 'Gollapudi', 'Penamaluru'
  ],
  'visakhapatnam': [
    'Siripuram', 'Dwaraka Nagar', 'MVP Colony', 'Gajuwaka', 'Rushikonda', 
    'Madhurawada', 'Jagadamba Centre', 'Seethammadhara', 'Pendurthi'
  ],
  'chennai': [
    'T Nagar', 'Anna Nagar', 'Nungambakkam', 'Adyar', 'Velachery', 
    'Besant Nagar', 'Alwarpet', 'Mylapore', 'OMR', 'Kilpauk'
  ],
  'kolkata': [
    'Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Alipore', 
    'Gariahat', 'Howrah', 'Behala', 'Dum Dum'
  ],
  'jaipur': [
    'C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 
    'Raja Park', 'Tonk Road', 'MI Road', 'Jagatpura'
  ],
  'ahmedabad': [
    'SG Highway', 'Bodakdev', 'Satellite', 'Vastrapur', 'Prahlad Nagar', 
    'Navrangpura', 'Maninagar', 'Thaltej', 'Sindhu Bhavan'
  ]
};

// ── IN-MEMORY INDEXING OF INDIA_VILLAGES.JSON (0.01ms FAST LOOKUP) ──
// Eliminates all remote OSM network latency and avoids 429 rate-limits
const districtIndex = new Map(); // cleanName -> { district, state, mandals: [] }
const mandalIndex = new Map();   // cleanName -> { subDistrict, district, state }
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
            }
          }

          districtIndex.set(cleanDist, { district: distName, state: stateName, mandals: subList });
        }
      }

      stateIndex.set(cleanState, { state: stateName, districts: distList });
    }

    // Authoritative Post-2022 Andhra Pradesh District Reorganization Overrides (Zero Regional Bleed)
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
    for (const [k, v] of Object.entries(AP_OVERRIDES)) {
      const prev = mandalIndex.get(k);
      mandalIndex.set(k, {
        ...v,
        villages: (v.villages && v.villages.length > 0) ? v.villages : (prev?.villages || [])
      });
    }

    console.log(`[Universal Geo Engine] Indexed ${stateIndex.size} states, ${districtIndex.size} districts, and ${mandalIndex.size} mandals from local database (0ms lookup ready).`);
  } catch (err) {
    console.error('[Universal Geo Engine] Error indexing india_villages.json:', err.message);
  }
}

// Initialize on module load
initIndiaGeoMemory();

// Precise GPS anchor coordinates for instant radar jumping on map
const ZONE_COORDINATES = {
  // Bangalore
  'indiranagar': { lat: 12.9784, lng: 77.6408 },
  'koramangala': { lat: 12.9352, lng: 77.6245 },
  'whitefield': { lat: 12.9698, lng: 77.7500 },
  'hsr layout': { lat: 12.9121, lng: 77.6446 },
  'jayanagar': { lat: 12.9308, lng: 77.5838 },
  'electronic city': { lat: 12.8399, lng: 77.6770 },
  'malleshwaram': { lat: 13.0031, lng: 77.5643 },
  'hebbal': { lat: 13.0358, lng: 77.5970 },
  'marathahalli': { lat: 12.9591, lng: 77.6974 },
  'btm layout': { lat: 12.9166, lng: 77.6101 },
  'jp nagar': { lat: 12.9063, lng: 77.5857 },
  'rajajinagar': { lat: 12.9982, lng: 77.5530 },
  'yelahanka': { lat: 13.1007, lng: 77.5963 },
  'banashankari': { lat: 12.9255, lng: 77.5468 },
  'bellandur': { lat: 12.9304, lng: 77.6784 },

  // Hyderabad
  'banjara hills': { lat: 17.4156, lng: 78.4357 },
  'jubilee hills': { lat: 17.4319, lng: 78.4073 },
  'gachibowli': { lat: 17.4401, lng: 78.3489 },
  'hitec city': { lat: 17.4474, lng: 78.3762 },
  'madhapur': { lat: 17.4483, lng: 78.3915 },
  'kondapur': { lat: 17.4688, lng: 78.3582 },
  'secunderabad': { lat: 17.4399, lng: 78.4983 },
  'kukatpally': { lat: 17.4948, lng: 78.3996 },

  // Mumbai
  'bandra west': { lat: 19.0596, lng: 72.8295 },
  'andheri west': { lat: 19.1363, lng: 72.8277 },
  'andheri east': { lat: 19.1136, lng: 72.8697 },
  'juhu': { lat: 19.1075, lng: 72.8263 },
  'powai': { lat: 19.1176, lng: 72.9060 },
  'colaba': { lat: 18.9067, lng: 72.8147 },

  // Delhi
  'connaught place': { lat: 28.6304, lng: 77.2177 },
  'hauz khas': { lat: 28.5494, lng: 77.2001 },
  'south extension': { lat: 28.5714, lng: 77.2215 },
  'karol bagh': { lat: 28.6517, lng: 77.1906 },
  'saket': { lat: 28.5244, lng: 77.2167 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },

  // Andhra Pradesh Town & Mandal Centers
  'narasaraopet': { lat: 16.2359, lng: 80.0499 },
  'palnadu': { lat: 16.2359, lng: 80.0499 },
  'macherla': { lat: 16.4800, lng: 79.3000 },
  'vinukonda': { lat: 16.0500, lng: 79.7400 },
  'chilakaluripet': { lat: 16.0892, lng: 80.1672 },
  'sattenapalle': { lat: 16.3956, lng: 80.1802 },
  'piduguralla': { lat: 16.4800, lng: 79.8800 },
  'bapatla': { lat: 15.9042, lng: 80.4673 },
  'chirala': { lat: 15.8246, lng: 80.3522 },
  'guntur city': { lat: 16.3067, lng: 80.4365 },
  'tenali': { lat: 16.2435, lng: 80.6400 },
  'morrispet': { lat: 16.2490, lng: 80.6450 },
  'gandhinagar': { lat: 16.2410, lng: 80.6350 },
  'angalakuduru': { lat: 16.2620, lng: 80.6200 },
  'burripalem': { lat: 16.2750, lng: 80.6050 },
  'china ravuru': { lat: 16.2280, lng: 80.6580 },
  'kolakaluru': { lat: 16.2950, lng: 80.6150 },
  'nandivelugu': { lat: 16.2880, lng: 80.6500 },
  'mangalagiri': { lat: 16.4328, lng: 80.5694 },
  'tadepalle': { lat: 16.4820, lng: 80.6030 },
  'chebrolu': { lat: 16.1950, lng: 80.5280 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'vijayawada rural': { lat: 16.5350, lng: 80.6650 },
  'benz circle': { lat: 16.5000, lng: 80.6500 },
  'machavaram': { lat: 16.5186, lng: 80.6475 },
  'maruthi nagar': { lat: 16.5150, lng: 80.6530 },
  'governorpet': { lat: 16.5118, lng: 80.6276 },
  'satyanarayanapuram': { lat: 16.5242, lng: 80.6305 },
  'bhavanipuram': { lat: 16.5290, lng: 80.5980 },
  'patamata': { lat: 16.4950, lng: 80.6620 },
  'auto nagar': { lat: 16.4900, lng: 80.6750 },
  'moghalrajpuram': { lat: 16.5050, lng: 80.6420 },
  'gunadala': { lat: 16.5190, lng: 80.6700 },
  'payakapuram': { lat: 16.5450, lng: 80.6350 },
  'one town vijayawada': { lat: 16.5170, lng: 80.6150 },
  'two town vijayawada': { lat: 16.5100, lng: 80.6220 },
  'mg road vijayawada': { lat: 16.5080, lng: 80.6380 }
};

// ── UNIVERSAL CATEGORY & LOCALITY INTELLIGENCE ENGINE ──
// Expands ANY business category into 5-6 specialized high-yield query vectors
function getUniversalCategoryVectors(category, cleanLoc) {
  let cat = (category || 'Business').trim();
  cat = cat.replace(new RegExp(`\\s+(in|near|at|around)\\s+.*$`, 'i'), '').trim();
  if (!cat) cat = 'Business';
  const lowerCat = cat.toLowerCase();

  // 0. Album Printing / Color Labs / Photobook Makers / Digital Press
  if (lowerCat.includes('album') || lowerCat.includes('color lab') || lowerCat.includes('colour lab') || lowerCat.includes('photobook') || lowerCat.includes('photo book') || lowerCat.includes('karizma') || lowerCat.includes('canvera') || (lowerCat.includes('print') && (lowerCat.includes('photo') || lowerCat.includes('wedding')))) {
    return [
      { zoneName: `${cleanLoc} Wedding Album Printing Labs`, queryText: `Wedding Album Printing Lab in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Digital Color Labs`, queryText: `Digital Color Lab in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Photo Book Printing Press`, queryText: `Photo Book Printing in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Album Manufacturers`, queryText: `Wedding Album Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Karizma Album Printers`, queryText: `Karizma Album Printing in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Photo Printing Labs`, queryText: `Photo Printing Lab in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 1. Photography / Videography
  if (lowerCat.includes('photo') || lowerCat.includes('camera') || lowerCat.includes('shoot') || lowerCat.includes('video')) {
    return [
      { zoneName: `${cleanLoc} Photo Studios`, queryText: `Photo Studio in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding Photography`, queryText: `Wedding Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Event Photographers`, queryText: `Event Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Digital Video & Studio`, queryText: `Digital Studio & Video in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Commercial`, queryText: `Photographers near Clock Tower / Market, ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Main Road Photo`, queryText: `Photographers near Main Road, ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2. Banquet Halls / Function Halls / Mandapams / Venues
  if (lowerCat.includes('mandap') || lowerCat.includes('hall') || lowerCat.includes('banquet') || lowerCat.includes('convention') || lowerCat.includes('venue') || lowerCat.includes('marriage')) {
    return [
      { zoneName: `${cleanLoc} Function Halls`, queryText: `Function Halls in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Marriage Halls`, queryText: `Marriage Halls in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Kalyana Mandapams`, queryText: `Kalyana Mandapam in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Convention Centers`, queryText: `Convention Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Party & AC Halls`, queryText: `Party Halls in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Lawns & Resorts`, queryText: `Wedding Lawns & Resorts in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 3. Catering / Food / Sweets / Bakeries / Cooks
  if (lowerCat.includes('cater') || lowerCat.includes('food') || lowerCat.includes('mess') || lowerCat.includes('sweet') || lowerCat.includes('biryani') || lowerCat.includes('cook')) {
    return [
      { zoneName: `${cleanLoc} Catering Services`, queryText: `Catering Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding Caterers`, queryText: `Wedding Caterers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Outdoor Caterers`, queryText: `Outdoor Caterers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Sweet Shops & Caterers`, queryText: `Sweet Shops & Caterers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cooking Contractors`, queryText: `Cooking Contractors & Caterers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Veg & Non-Veg Caterers`, queryText: `Caterers in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4. Decorators / Stage Decoration / Event Organizers / Sound / Lighting / DJ
  if (lowerCat.includes('decor') || lowerCat.includes('stage') || lowerCat.includes('event') || lowerCat.includes('flower') || lowerCat.includes('tent') || lowerCat.includes('sound') || lowerCat.includes('lighting') || lowerCat.includes('dj') || lowerCat.includes('orchestra')) {
    return [
      { zoneName: `${cleanLoc} Event Organizers`, queryText: `Event Organizers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Stage Decorators`, queryText: `Stage Decoration in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Flower Decorators`, queryText: `Flower Decorators in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Tent House & Shamiana`, queryText: `Tent House & Shamiana in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Sound & Lighting`, queryText: `Sound and Lighting Suppliers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DJ & Music`, queryText: `DJ & Orchestra in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5. Priests / Purohit / Pandit / Astrology / Vastu
  if (lowerCat.includes('priest') || lowerCat.includes('pandit') || lowerCat.includes('purohit') || lowerCat.includes('astrolog') || lowerCat.includes('vastu') || lowerCat.includes('jyotish') || lowerCat.includes('pooja') || lowerCat.includes('puja')) {
    return [
      { zoneName: `${cleanLoc} Purohits & Pandits`, queryText: `Purohit & Pandits in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding Priests`, queryText: `Wedding Priests in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Astrologers & Jyotish`, queryText: `Astrologers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Vastu Consultants`, queryText: `Vastu Consultants in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pooja Store & Samagri`, queryText: `Pooja Samagri Stores in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 6. Printing / Cards / Flex / Banners
  if (lowerCat.includes('print') || lowerCat.includes('flex') || lowerCat.includes('card') || lowerCat.includes('invitation') || lowerCat.includes('offset') || lowerCat.includes('banner')) {
    return [
      { zoneName: `${cleanLoc} Wedding Card Printers`, queryText: `Wedding Card Printers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Flex Printing & Banners`, queryText: `Flex Printing in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Offset & Digital Printers`, queryText: `Offset Printing Press in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Invitation Cards`, queryText: `Invitation Cards in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DTP & Media Works`, queryText: `Printing Press in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 7. Cafes / Coffee Shops / Restaurants / Dining
  if (lowerCat.includes('cafe') || lowerCat.includes('coffee') || lowerCat.includes('restaurant') || lowerCat.includes('bakery') || lowerCat.includes('tea') || lowerCat.includes('dining') || lowerCat.includes('hotel food')) {
    return [
      { zoneName: `${cleanLoc} Cafes`, queryText: `Cafes in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Coffee Shops`, queryText: `Coffee Shops in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Bakeries & Cake Shops`, queryText: `Bakeries in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Family Restaurants`, queryText: `Restaurants in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Dining`, queryText: `Top Food & Cafes near Main Road, ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 8. Healthcare / Doctors / Clinics / Hospitals / Dentists / Pharmacies
  if (lowerCat.includes('doctor') || lowerCat.includes('clinic') || lowerCat.includes('hospital') || lowerCat.includes('dentist') || lowerCat.includes('dental') || lowerCat.includes('health') || lowerCat.includes('diagnostic') || lowerCat.includes('pharmacy') || lowerCat.includes('medical')) {
    return [
      { zoneName: `${cleanLoc} Clinics & Specialists`, queryText: `Clinics in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hospitals`, queryText: `Hospitals in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Dental Clinics`, queryText: `Dental Clinics in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Diagnostic Centers`, queryText: `Diagnostic Centers & Labs in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Specialist Doctors`, queryText: `Doctors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pharmacies & Medical`, queryText: `Medical Stores & Pharmacies in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 9. Real Estate / Property / Builders / Plots
  if (lowerCat.includes('real estate') || lowerCat.includes('property') || lowerCat.includes('builder') || lowerCat.includes('plot') || lowerCat.includes('flat') || lowerCat.includes('apartment') || lowerCat.includes('land') || lowerCat.includes('construction')) {
    return [
      { zoneName: `${cleanLoc} Real Estate Agents`, queryText: `Real Estate Agents in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Property Dealers`, queryText: `Property Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Builders & Developers`, queryText: `Builders & Developers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Plots & Layouts`, queryText: `Plots & Open Land Developers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Property`, queryText: `Commercial Real Estate in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 10. Beauty / Salons / Spas / Makeup Artists / Boutiques / Tailors
  if (lowerCat.includes('salon') || lowerCat.includes('spa') || lowerCat.includes('makeup') || lowerCat.includes('beauty') || lowerCat.includes('boutique') || lowerCat.includes('mehendi') || lowerCat.includes('saree') || lowerCat.includes('tailor')) {
    return [
      { zoneName: `${cleanLoc} Beauty Parlours & Salons`, queryText: `Beauty Parlour in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Bridal Makeup Artists`, queryText: `Bridal Makeup Artists in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Mens Hair & Grooming`, queryText: `Mens Salon in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Boutiques & Designer Wear`, queryText: `Boutiques & Saree Centers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Tailors & Magam Work`, queryText: `Tailors & Magam Work in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Spas & Wellness`, queryText: `Spa & Salons in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 11. Gyms / Fitness / Yoga / Sports
  if (lowerCat.includes('gym') || lowerCat.includes('fitness') || lowerCat.includes('yoga') || lowerCat.includes('workout') || lowerCat.includes('sports')) {
    return [
      { zoneName: `${cleanLoc} Gyms`, queryText: `Gyms in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fitness Centers`, queryText: `Fitness Centers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Unisex Gyms`, queryText: `Unisex Fitness in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Yoga & Health Studios`, queryText: `Yoga Centers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Crossfit & Training`, queryText: `Weight Training & Gyms in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 12. Education / Schools / Colleges / Coaching
  if (lowerCat.includes('school') || lowerCat.includes('college') || lowerCat.includes('coach') || lowerCat.includes('tuition') || lowerCat.includes('academy') || lowerCat.includes('education') || lowerCat.includes('institute')) {
    return [
      { zoneName: `${cleanLoc} Schools`, queryText: `Schools in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Colleges`, queryText: `Colleges in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Coaching & Tuitions`, queryText: `Coaching Centers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer & Skills Institutes`, queryText: `Training Institutes in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pre-Schools & Daycare`, queryText: `Play Schools in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 13. Automotive / Car Rental / Mechanic / Garages / Travels
  if (lowerCat.includes('car') || lowerCat.includes('auto') || lowerCat.includes('bike') || lowerCat.includes('travel') || lowerCat.includes('rental') || lowerCat.includes('mechanic') || lowerCat.includes('garage') || lowerCat.includes('cab') || lowerCat.includes('taxi')) {
    return [
      { zoneName: `${cleanLoc} Car Rentals & Travels`, queryText: `Car Rentals & Travels in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Two Wheeler Showrooms & Service`, queryText: `Bike Showrooms & Service in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Car Repair & Garages`, queryText: `Car Service & Garages in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Taxi & Tour Services`, queryText: `Tours and Travels in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Automobile Spare Parts`, queryText: `Auto Spare Parts in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14a. Plumber / Plumbing / Sanitary / Water Tank / Drainage
  if (lowerCat.includes('plumb') || lowerCat.includes('pipe') || lowerCat.includes('sanitary') || lowerCat.includes('drain') || lowerCat.includes('tap repair') || lowerCat.includes('water tank clean')) {
    return [
      { zoneName: `${cleanLoc} Plumbers`, queryText: `Plumbers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Plumbing Contractors`, queryText: `Plumbing Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Plumbing & Sanitary Services`, queryText: `Plumbing and Sanitary Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pipe & Tap Repair Plumber`, queryText: `Plumber Pipe and Tap Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Water Tank & Drainage Plumber`, queryText: `Water Tank and Drainage Plumber in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} 24/7 Emergency Plumber`, queryText: `Best Plumbers near ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14b. Electrician / Electrical Works
  if (lowerCat.includes('electric') || lowerCat.includes('wiring') || lowerCat.includes('rewind') || lowerCat.includes('motor repair')) {
    return [
      { zoneName: `${cleanLoc} Electricians`, queryText: `Electricians in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Electrical Contractors`, queryText: `Electrical Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Home Wiring Services`, queryText: `Home Electrical Wiring in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Electrical Works & Repair`, queryText: `Electrical Works in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} 24x7 Electrician Services`, queryText: `Electricians near ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14c. Interior Designers / False Ceiling / Cupboards
  if (lowerCat.includes('interior') || lowerCat.includes('modular kitchen') || lowerCat.includes('false ceiling') || lowerCat.includes('cupboard') || lowerCat.includes('wallpaper')) {
    return [
      { zoneName: `${cleanLoc} Interior Designers`, queryText: `Interior Designers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Modular Kitchen & Cupboards`, queryText: `Modular Kitchen in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Home Interior Works`, queryText: `Home Interiors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} False Ceiling Contractors`, queryText: `False Ceiling in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Living Room & Wardrobe Design`, queryText: `Interior Decorators in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14d. Solar / Batteries / Inverters / UPS
  if (lowerCat.includes('solar') || lowerCat.includes('battery') || lowerCat.includes('inverter') || lowerCat.includes('ups')) {
    return [
      { zoneName: `${cleanLoc} Solar Power Solutions`, queryText: `Solar Companies in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Inverter & Battery Dealers`, queryText: `Battery and Inverter Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Rooftop Solar Installers`, queryText: `Rooftop Solar in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Solar Water Heaters`, queryText: `Solar Water Heaters in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14e. Home Painters / Painting Works
  if (lowerCat.includes('paint') || lowerCat.includes('whitewash') || lowerCat.includes('asian paint')) {
    return [
      { zoneName: `${cleanLoc} Home Painters`, queryText: `Home Painters in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Painting Contractors`, queryText: `Painting Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wall Painting Services`, queryText: `Wall Painting in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Texture & Waterproofing Painting`, queryText: `Waterproofing and Painters in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14f. CCTV & Security Cameras
  if (lowerCat.includes('cctv') || lowerCat.includes('surveillance') || lowerCat.includes('security cam')) {
    return [
      { zoneName: `${cleanLoc} CCTV Dealers`, queryText: `CCTV Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Security Camera Installation`, queryText: `Security Camera Installation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} CCTV Service & Repair`, queryText: `CCTV Services in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14g. AC Repair & HVAC / Refrigeration
  if (lowerCat.includes('ac ') || lowerCat.includes('air condition') || lowerCat.includes('hvac') || lowerCat.includes('fridge') || lowerCat.includes('refrigerat')) {
    return [
      { zoneName: `${cleanLoc} AC Repair & Service`, queryText: `AC Repair and Service in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} AC Installation Contractors`, queryText: `AC Installation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} AC Gas Refilling`, queryText: `AC Technicians in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14h. Carpenters & Woodwork
  if (lowerCat.includes('carpenter') || lowerCat.includes('wood work') || lowerCat.includes('furniture repair')) {
    return [
      { zoneName: `${cleanLoc} Carpenters`, queryText: `Carpenters in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Furniture Wood Work`, queryText: `Wood Work Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Door & Cupboard Carpenters`, queryText: `Door and Window Carpenters in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 15. Retail / Hardware / Electronics / Jewellery / Furniture
  if (lowerCat.includes('jewel') || lowerCat.includes('gold') || lowerCat.includes('hardware') || lowerCat.includes('electronic') || lowerCat.includes('furniture') || lowerCat.includes('appliance') || lowerCat.includes('cloth') || lowerCat.includes('textile')) {
    return [
      { zoneName: `${cleanLoc} Showrooms & Retail`, queryText: `${cat} Showrooms in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wholesale & Dealers`, queryText: `${cat} Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Main Market`, queryText: `${cat} near Main Market / Bazar, ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Commercial`, queryText: `${cat} in ${cleanLoc} Central`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Top Rated`, queryText: `Best ${cat} in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 16. Legal & Financial / Chartered Accountants / Advocates / Insurance
  if (lowerCat.includes('lawyer') || lowerCat.includes('advocate') || lowerCat.includes('ca') || lowerCat.includes('chartered') || lowerCat.includes('tax') || lowerCat.includes('insurance') || lowerCat.includes('loan') || lowerCat.includes('auditor') || lowerCat.includes('legal')) {
    return [
      { zoneName: `${cleanLoc} Advocates & Legal Advisors`, queryText: `Advocates in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Chartered Accountants`, queryText: `Chartered Accountants & Tax in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Insurance & Loans`, queryText: `Insurance & Loan Agents in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Legal Offices`, queryText: `Law Offices near Court, ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Financial Services`, queryText: `Financial Consultants in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 17. UNIVERSAL DYNAMIC FALLBACK FOR ANY INDUSTRY OR CUSTOM QUERY
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
function resolveUniversalZones(location, category = '') {
  if (!location || typeof location !== 'string') {
    return [{ zoneName: 'Central Area', queryText: 'Central Area', isSingle: true }];
  }

  const cleanLoc = location.trim();
  const lowerLoc = cleanLoc.toLowerCase().replace(/[^a-z0-9]/g, '');
  const primaryName = cleanLoc.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Authoritative Pre-Mapped Metros Check (<0.01ms)
  // Exact match to urban metro cluster, preventing rural subdistricts (e.g. Vijayawada Rural) from being hijacked
  for (const [key, zones] of Object.entries(AUTHORITATIVE_CLUSTERS)) {
    if ((lowerLoc === key || primaryName === key) && !lowerLoc.includes('rural')) {
      return zones.map((z, idx) => {
        let coords = ZONE_COORDINATES[z.toLowerCase()] || null;
        if (!coords && ZONE_COORDINATES[key]) {
          const base = ZONE_COORDINATES[key];
          const angle = (idx * 2 * Math.PI) / zones.length;
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

  // 2. Check if Mandal or Town: Autonomous sweep across constituent villages & wards
  if (mandalIndex.has(lowerLoc) || mandalIndex.has(primaryName)) {
    const entry = mandalIndex.get(lowerLoc) || mandalIndex.get(primaryName);
    const townName = entry.subDistrict || cleanLoc.split(',')[0].trim();
    const townLower = townName.toLowerCase();
    const centerCoords = ZONE_COORDINATES[townLower] || ZONE_COORDINATES[lowerLoc] || null;
    const prefix = category ? `${category} in ` : '';

    const zones = [];
    // 1. Central Core Hub
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

    // 2. Real Constituent Villages & Localities from India Villages Memory DB
    const villages = Array.isArray(entry.villages) ? entry.villages : [];
    if (villages.length > 0) {
      const selectedVillages = villages.slice(0, 11);
      selectedVillages.forEach((village, idx) => {
        const vLower = village.toLowerCase();
        let vCoords = ZONE_COORDINATES[vLower] || null;
        if (!vCoords && centerCoords?.lat && centerCoords?.lng) {
          const angle = (idx * 2 * Math.PI) / selectedVillages.length;
          const offsetDist = 0.024; // ~2.5km radial offset for 5km coverage circles
          vCoords = {
            lat: Number((centerCoords.lat + offsetDist * Math.cos(angle)).toFixed(5)),
            lng: Number((centerCoords.lng + offsetDist * Math.sin(angle)).toFixed(5))
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
    }

    // 3. Fallback / supplementary landmark vectors if villages < 6
    if (zones.length < 6) {
      const extraVectors = getUniversalCategoryVectors(category, townName);
      for (const ev of extraVectors) {
        if (zones.length >= 8) break;
        zones.push({
          zoneName: ev.zoneName,
          queryText: ev.queryText,
          district: entry.district,
          state: entry.state,
          lat: centerCoords?.lat || null,
          lng: centerCoords?.lng || null,
          isVectorQuery: true,
          isSingle: false
        });
      }
    }

    return zones;
  }

  // 3. Check if District: Distribute Across Top Mandals
  if (districtIndex.has(lowerLoc) || districtIndex.has(primaryName)) {
    const entry = districtIndex.get(lowerLoc) || districtIndex.get(primaryName);
    if (entry.mandals && entry.mandals.length > 0) {
      const isMaster = /master|sweep|district/i.test(cleanLoc);
      const selected = isMaster ? entry.mandals.slice(0, 40) : entry.mandals.slice(0, 15);
      return selected.map(m => {
        const mLower = m.toLowerCase();
        const coords = ZONE_COORDINATES[mLower] || null;
        const prefix = category ? `${category} in ` : '';
        return {
          zoneName: m,
          queryText: `${prefix}${m}, ${entry.district}`,
          district: entry.district,
          state: entry.state,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 4. Check if State: Distribute Across Top Districts
  if (stateIndex.has(lowerLoc) || stateIndex.has(primaryName)) {
    const entry = stateIndex.get(lowerLoc) || stateIndex.get(primaryName);
    if (entry.districts && entry.districts.length > 0) {
      const isMaster = /master|sweep|state/i.test(cleanLoc);
      const topDistricts = isMaster ? entry.districts.slice(0, 32) : entry.districts.slice(0, 15);
      return topDistricts.map(d => {
        const prefix = category ? `${category} in ` : '';
        return {
          zoneName: d,
          queryText: `${prefix}${d}, ${entry.state}`,
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 5. Universal Fallback for ANY Global Town, Suburb, or Locality
  const vectors = getUniversalCategoryVectors(category, cleanLoc.split(',')[0].trim());
  return vectors.map(v => ({
    zoneName: v.zoneName,
    queryText: v.queryText,
    isVectorQuery: true,
    isSingle: false
  }));
}

/**
 * Classifies a user's location input into State, District, Metro/City, or Mandal
 * Returns instant metadata for UI badges, zone counts, lead estimates, and auto-swarm triggers
 */
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

  const cleanCandidates = [...new Set(rawCandidates.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean))];

  // 1. If explicit District indicated (e.g. "Guntur District", "Krishna Dist")
  if (explicitDistrict) {
    for (const clean of cleanCandidates) {
      if (districtIndex.has(clean)) {
        const entry = districtIndex.get(clean);
        const mCount = entry.mandals ? entry.mandals.length : 14;
        return {
          type: 'district',
          name: `${entry.district} District`,
          state: entry.state,
          zoneCount: mCount,
          estimatedLeads: Math.min(1200, mCount * 35),
          badge: '🗺️ DISTRICT',
          label: 'District sweep (Master only)',
          warning: `⚠️ District-wide sweep (${mCount} mandals). Swarms all towns and villages.`,
          description: `District detected · ${mCount} mandals auto-swarmed · ~${Math.min(1200, mCount * 35)} leads`,
          subZones: entry.mandals ? entry.mandals.slice(0, 20) : []
        };
      }
    }
  }

  // 2. Check State
  for (const clean of cleanCandidates) {
    if (stateIndex.has(clean)) {
      const entry = stateIndex.get(clean);
      const distCount = entry.districts ? entry.districts.length : 25;
      return {
        type: 'state',
        name: entry.state,
        zoneCount: distCount,
        totalMandals: distCount * 14,
        estimatedLeads: 3000,
        badge: '🏛️ STATE SWEEP',
        label: 'State Sweep detected (Master only)',
        warning: `⚠️ State-wide sweep (${distCount} districts, ~${distCount * 14} mandals). Swarms all major hubs.`,
        description: `State: ${entry.state} (${distCount} districts)`,
        subZones: entry.districts ? entry.districts.slice(0, 15) : []
      };
    }
  }

  // 3. Check Authoritative Metro / Tier-1/2 City Cluster (when not explicit district)
  if (!explicitDistrict) {
    for (const clean of cleanCandidates) {
      if (AUTHORITATIVE_CLUSTERS[clean]) {
        const zones = AUTHORITATIVE_CLUSTERS[clean];
        const displayName = locCandidate.split(',')[0].replace(/\b(city|town|metro)\b/gi, '').trim();
        return {
          type: 'city',
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          zoneCount: zones.length,
          estimatedLeads: zones.length * 40,
          badge: '🏙️ TIER-1/2 CITY',
          label: 'City detected',
          description: `Tier-1/2 City · ${zones.length} economic zones swarm · ~${zones.length * 40} leads`,
          subZones: zones
        };
      }
    }
  }

  // 4. Check Mandal
  for (const clean of cleanCandidates) {
    if (mandalIndex.has(clean)) {
      const entry = mandalIndex.get(clean);
      const vCount = entry.villages ? Math.min(entry.villages.length, 10) : 4;
      return {
        type: 'mandal',
        name: entry.subDistrict,
        district: entry.district,
        state: entry.state,
        zoneCount: vCount,
        estimatedLeads: 85,
        badge: '📍 MANDAL',
        label: 'Mandal / Tehsil detected',
        description: `Mandal in ${entry.district}, ${entry.state} · ~85 leads`,
        subZones: entry.villages ? entry.villages.slice(0, 10) : []
      };
    }
  }

  // 5. Check District if not already matched
  for (const clean of cleanCandidates) {
    if (districtIndex.has(clean)) {
      const entry = districtIndex.get(clean);
      const mCount = entry.mandals ? entry.mandals.length : 14;
      return {
        type: 'district',
        name: `${entry.district} District`,
        state: entry.state,
        zoneCount: mCount,
        estimatedLeads: Math.min(1200, mCount * 35),
        badge: '🗺️ DISTRICT',
        label: 'District detected (Master only)',
        description: `District detected · ${mCount} mandals auto-swarmed · ~${Math.min(1200, mCount * 35)} leads`,
        subZones: entry.mandals ? entry.mandals.slice(0, 20) : []
      };
    }
  }

  // Fallback for general locality / town
  return {
    type: 'locality',
    name: locCandidate,
    zoneCount: 1,
    estimatedLeads: 60,
    badge: '📍 LOCALITY',
    label: 'Local Radar Mesh',
    description: `High-precision local zone swarm · ~60 leads`,
    subZones: [locCandidate]
  };
}

module.exports = {
  resolveUniversalZones,
  getUniversalCategoryVectors,
  classifyLocation,
  AUTHORITATIVE_CLUSTERS,
  ZONE_COORDINATES,
  mandalIndex,
  districtIndex,
  stateIndex
};
