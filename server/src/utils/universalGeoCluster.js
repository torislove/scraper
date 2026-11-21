const fs = require('fs');
const path = require('path');
const indiaTradeIntelligence = require('./indiaTradeIntelligence');

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
    // West IT Corridor & High Growth
    'HITEC City', 'Madhapur', 'Gachibowli', 'Kondapur', 'Financial District', 
    'Nanakramguda', 'Kokapet', 'Gandipet', 'Manikonda', 'Puppalaguda', 
    'Shaikpet', 'Rai Durg', 'Hafeezpet', 'Tellapur', 'Kollur',
    
    // North-West Commercial & High-Density Residential
    'Kukatpally', 'KPHB Colony', 'Nizampet', 'Bachupally', 'Pragathi Nagar', 
    'Miyapur', 'Chandanagar', 'Serilingampally', 'Lingampally', 'BHEL', 
    'Patancheru', 'Beeramguda', 'Ameenpur',
    
    // Central Commercial, Dining & Healthcare
    'Banjara Hills', 'Jubilee Hills', 'Somajiguda', 'Punjagutta', 'Begumpet', 
    'Prakash Nagar', 'Ameerpet', 'SR Nagar', 'Sanath Nagar', 'Erragadda', 
    'Balkampet', 'Khairatabad', 'Lakdikapul', 'Nampally', 'Abids', 
    'Koti', 'Sultan Bazar', 'Basheerbagh', 'Himayatnagar', 'Chikkadpally', 
    'Narayanguda', 'Domalguda', 'RTC X Roads', 'Ashok Nagar', 'Gandhi Nagar',
    
    // Secunderabad & Cantonment Belt
    'Secunderabad', 'Paradise Secunderabad', 'MG Road Secunderabad', 'Marredpally', 
    'East Marredpally', 'West Marredpally', 'Trimulgherry', 'Bowenpally', 
    'Old Bowenpally', 'Karkhana', 'Gunrock', 'Alwal', 'Old Alwal', 
    'Lothkunta', 'Bolarum', 'Yapral', 'Kowkoor', 'Hakimpet',
    
    // East Tech & Industrial Corridor
    'Uppal', 'Ramanthapur', 'Habsiguda', 'Tarnaka', 'Nacharam', 
    'Mallapur', 'ECIL', 'Kushaiguda', 'AS Rao Nagar', 'Sainikpuri', 
    'Kapra', 'Moula Ali', 'Cherlapally', 'Peerzadiguda', 'Boduppal', 
    'Medipally', 'Chengicherla', 'Ghatkesar',
    
    // South Heritage & Old City Commercial
    'Charminar', 'Laad Bazaar', 'Chowmahalla', 'Madina', 'High Court', 
    'City College', 'Nayapul', 'Pathergatti', 'Moghalpura', 'Falaknuma', 
    'Chandrayangutta', 'Santoshnagar', 'Malakpet', 'Old Malakpet', 
    'New Malakpet', 'Saidabad', 'Chanchalguda', 'Bahadurpura', 'Purana Pul', 
    'Tadbun', 'Jahanuma',
    
    // South-East Residential & Transit Corridor
    'Dilsukhnagar', 'Moosarambagh', 'Kothapet', 'Chaitanyapuri', 'LB Nagar', 
    'Sagar Ring Road', 'Mansoorabad', 'Saroornagar', 'Karmanghat', 'Champapet', 
    'Vanasthalipuram', 'Hastinapuram', 'Hayathnagar', 'Auto Nagar Hyderabad', 'BN Reddy Nagar',
    
    // South-West Transit & Airport Corridor
    'Mehdipatnam', 'Gudimalkapur', 'Tolichowki', 'Paramount Hills', 'Attapur', 
    'Hyderguda Attapur', 'Upperpally', 'Rajendranagar', 'Bandlaguda Jagir', 
    'Sun City', 'Langer Houz', 'Shamshabad', 'Airport Road Hyderabad', 
    'Aramghar', 'Mailardevpally', 'Kattedan'
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
    'Brodipet', 'Arundelpet', 'Lalapet & Market Center', 'Kothapet', 'Pattabhipuram', 
    'Brindavan Gardens', 'Lakshmipuram', 'Old Guntur', 'SVN Colony', 'Guvvalagutta', 
    'Collector Office Road Guntur', 'Amaravathi Road', 'Gorantla & Inner Ring Road',
    'Gujjanagundla', 'Syamala Nagar', 'Vidyanagar', 'Chandramouli Nagar',
    'Autonagar Guntur', 'Nallapadu', 'Nallacheruvu', 'Stambhalagaruvu',
    'Pedakakani Road Guntur', 'Etukuru Road Guntur', 'Chowdavaram & RVR Guntur'
  ],
  'tenali': [
    'Tenali Central', 'Morrispet', 'Chenchupet', 'Bose Road Tenali', 'Ganganammapet Tenali',
    'Kothapet Tenali', 'Ithanagar Tenali', 'Ganga Mandiram', 'Chinaravuru', 
    'Nazarpet', 'Guntur Road Tenali', 'Gandhinagar Tenali'
  ],
  'mangalagiri': [
    'Mangalagiri Town', 'Temple Road Mangalagiri', 'Nowlur', 'Atmakur Mangalagiri', 
    'Old Bus Stand Mangalagiri', 'Tadepalle'
  ],
  'vijayawada': [
    'Suryaraopeta', 'Benz Circle', 'Governorpet', 'Labbipet', 'Moghalrajpuram', 'Patamata', 'Auto Nagar', 
    'Bhavanipuram', 'Satyanarayanapuram', 'Gunadala', 'Gandhinagar Vijayawada', 'Kanuru', 'Poranki', 'One Town Vijayawada', 'Machavaram'
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
    // Official 18 Mandals of Guntur District across Guntur Division (10) & Tenali Division (8)
    const GUNTUR_18_MANDALS = [
      'Guntur East', 'Guntur West', 'Medikonduru', 'Pedakakani', 'Pedanandipadu',
      'Phirangipuram', 'Prathipadu', 'Tadikonda', 'Thullur', 'Vatticherukuru',
      'Chebrolu', 'Duggirala', 'Kakumanu', 'Kollipara', 'Mangalagiri',
      'Ponnur', 'Tadepalle', 'Tenali'
    ];

    districtIndex.set('guntur', {
      district: 'Guntur',
      state: 'Andhra Pradesh',
      mandals: GUNTUR_18_MANDALS
    });

    districtIndex.set('palnadu', {
      district: 'Palnadu',
      state: 'Andhra Pradesh',
      mandals: [
        'Narasaraopet', 'Macherla', 'Vinukonda', 'Sattenapalle', 'Chilakaluripet',
        'Piduguralla', 'Gurazala', 'Dachepalle', 'Rentachintala', 'Karempudi',
        'Nadendla', 'Edlapadu', 'Rompicherla', 'Ipur', 'Savalyapuram',
        'Bollapalle', 'Nekarikallu', 'Mupla', 'Atchampet', 'Krosuru',
        'Amaravathi', 'Bellamkonda', 'Rajupalem', 'Pedakurapadu', 'Veldurthi',
        'Durgi', 'Muppalla'
      ]
    });

    districtIndex.set('bapatla', {
      district: 'Bapatla',
      state: 'Andhra Pradesh',
      mandals: [
        'Bapatla', 'Chirala', 'Vetapalem', 'Karamchedu', 'Inkollu',
        'Chinaganjam', 'Parchur', 'Yeddanapudi', 'Martur', 'Santhamaguluru',
        'Ballikurava', 'Korisapadu', 'Panguluru', 'Addanki', 'Jangamaheswarapuram',
        'Repalle', 'Nizampatnam', 'Nagaram', 'Cherukupalle', 'Bhattiprolu',
        'Tsundur', 'Amruthalur', 'Karlapalem', 'Pittalavanipalem', 'Kollur'
      ]
    });

    districtIndex.set('ntr', {
      district: 'NTR',
      state: 'Andhra Pradesh',
      mandals: [
        'Vijayawada Urban', 'Vijayawada Rural', 'Jaggayyapeta', 'Nandigama', 'Tiruvuru',
        'Mylavaram', 'G.Konduru', 'Ibrahimpatnam', 'Penamaluru', 'Kanchikacherla',
        'Chandarlapadu', 'Veerullapadu', 'Vatsavai', 'Reddigudem', 'A.Konduru',
        'Gampalagudem', 'Vissannapeta'
      ]
    });

    const ALL_26_AP_DISTRICTS = [
      'Srikakulam', 'Vizianagaram', 'Parvathipuram Manyam', 'Alluri Sitharama Raju',
      'Visakhapatnam', 'Anakapalli', 'Kakinada', 'Dr. B. R. Ambedkar Konaseema',
      'East Godavari', 'West Godavari', 'Eluru', 'Krishna', 'NTR', 'Guntur',
      'Palnadu', 'Bapatla', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Kurnool',
      'Nandyal', 'Ananthapuramu', 'Sri Sathya Sai', 'YSR Kadapa', 'Annamayya',
      'Tirupati', 'Chittoor'
    ];
    const apState = stateIndex.get('andhrapradesh');
    if (apState && Array.isArray(apState.districts)) {
      ALL_26_AP_DISTRICTS.forEach(d => {
        if (!apState.districts.some(x => x.toLowerCase().replace(/[^a-z0-9]/g, '') === d.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
          apState.districts.push(d);
        }
      });
    }

    const AP_OVERRIDES = {
      'guntur east': { subDistrict: 'Guntur East', district: 'Guntur', state: 'Andhra Pradesh' },
      'guntur west': { subDistrict: 'Guntur West', district: 'Guntur', state: 'Andhra Pradesh' },
      'medikonduru': { subDistrict: 'Medikonduru', district: 'Guntur', state: 'Andhra Pradesh' },
      'pedakakani': { subDistrict: 'Pedakakani', district: 'Guntur', state: 'Andhra Pradesh' },
      'pedanandipadu': { subDistrict: 'Pedanandipadu', district: 'Guntur', state: 'Andhra Pradesh' },
      'phirangipuram': { subDistrict: 'Phirangipuram', district: 'Guntur', state: 'Andhra Pradesh' },
      'prathipadu': { subDistrict: 'Prathipadu', district: 'Guntur', state: 'Andhra Pradesh' },
      'tadikonda': { subDistrict: 'Tadikonda', district: 'Guntur', state: 'Andhra Pradesh' },
      'thullur': { subDistrict: 'Thullur', district: 'Guntur', state: 'Andhra Pradesh' },
      'tullur': { subDistrict: 'Thullur', district: 'Guntur', state: 'Andhra Pradesh' },
      'vatticherukuru': { subDistrict: 'Vatticherukuru', district: 'Guntur', state: 'Andhra Pradesh' },
      'chebrolu': { subDistrict: 'Chebrolu', district: 'Guntur', state: 'Andhra Pradesh' },
      'duggirala': { subDistrict: 'Duggirala', district: 'Guntur', state: 'Andhra Pradesh' },
      'kakumanu': { subDistrict: 'Kakumanu', district: 'Guntur', state: 'Andhra Pradesh' },
      'kollipara': { subDistrict: 'Kollipara', district: 'Guntur', state: 'Andhra Pradesh' },
      'mangalagiri': { subDistrict: 'Mangalagiri', district: 'Guntur', state: 'Andhra Pradesh' },
      'ponnur': { subDistrict: 'Ponnur', district: 'Guntur', state: 'Andhra Pradesh' },
      'tadepalle': { subDistrict: 'Tadepalle', district: 'Guntur', state: 'Andhra Pradesh' },
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

    for (const [rawKey, val] of Object.entries(AP_OVERRIDES)) {
      const cleanKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = mandalIndex.get(cleanKey) || mandalIndex.get(rawKey) || {};
      let villages = Array.isArray(val.villages) && val.villages.length > 0
        ? val.villages
        : (Array.isArray(existing.villages) && existing.villages.length > 0 ? existing.villages : []);

      if ((!villages || villages.length === 0) && cleanKey.includes('guntureast')) {
        villages = ['Old Guntur', 'Kothapet', 'Collector Office Road', 'Autonagar', 'Etukur', 'Budampadu', 'Chowdavaram', 'Ankireddipalem'];
      } else if ((!villages || villages.length === 0) && cleanKey.includes('gunturwest')) {
        villages = ['Brodipet', 'Arundelpet', 'Lakshmipuram', 'Pattabhipuram', 'Brindavan Gardens', 'SVN Colony', 'Guvvalagutta', 'Gorantla', 'Pedapalakaluru', 'Nallapadu'];
      }

      const merged = { ...existing, ...val, villages };
      mandalIndex.set(cleanKey, merged);
      if (cleanKey !== rawKey) mandalIndex.set(rawKey, merged);
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
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'banjara hills': { lat: 17.4156, lng: 78.4357 },
  'banjara hills hyderabad': { lat: 17.4156, lng: 78.4357 },
  'jubilee hills': { lat: 17.4319, lng: 78.4073 },
  'gachibowli': { lat: 17.4401, lng: 78.3489 },
  'madhapur': { lat: 17.4483, lng: 78.3915 },
  'hitec city': { lat: 17.4435, lng: 78.3772 },
  'kondapur': { lat: 17.4699, lng: 78.3578 },
  'kukatpally': { lat: 17.4938, lng: 78.4018 },
  'begumpet': { lat: 17.4448, lng: 78.4682 },
  'secunderabad': { lat: 17.4399, lng: 78.4983 },
  'somajiguda': { lat: 17.4260, lng: 78.4578 },
  'himayatnagar': { lat: 17.4042, lng: 78.4891 },
  'ameerpet': { lat: 17.4375, lng: 78.4482 },
  'dilsukhnagar': { lat: 17.3688, lng: 78.5247 },
  'uppal': { lat: 17.4057, lng: 78.5591 },
  'mehdipatnam': { lat: 17.3916, lng: 78.4384 },
  'manikonda': { lat: 17.3975, lng: 78.3776 },
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
  'amaravathi road': { lat: 16.3210, lng: 80.4120 },
  'gorantla': { lat: 16.3380, lng: 80.4050 },
  'lalapet': { lat: 16.3015, lng: 80.4465 },
  'syamala nagar': { lat: 16.3140, lng: 80.4280 },
  'vidyanagar': { lat: 16.3180, lng: 80.4210 },
  'gujjanagundla': { lat: 16.3120, lng: 80.4160 },
  'autonagar guntur': { lat: 16.2950, lng: 80.4720 },
  'chandramouli nagar': { lat: 16.3200, lng: 80.4180 },
  'nallapadu': { lat: 16.2820, lng: 80.3980 },
  'nallacheruvu': { lat: 16.2890, lng: 80.4410 },
  'stambhalagaruvu': { lat: 16.3190, lng: 80.4270 },
  'pedakakani road': { lat: 16.3320, lng: 80.4680 },
  'etukuru road': { lat: 16.2810, lng: 80.4690 },
  'chowdavaram': { lat: 16.2410, lng: 80.3420 },

  // Guntur District Official 18 Mandals (Guntur Division & Tenali Division)
  'guntur east': { lat: 16.3067, lng: 80.4480 },
  'guntur west': { lat: 16.3115, lng: 80.4280 },
  'medikonduru': { lat: 16.3312, lng: 80.2974 },
  'pedakakani': { lat: 16.3458, lng: 80.4952 },
  'pedanandipadu': { lat: 16.0373, lng: 80.3015 },
  'phirangipuram': { lat: 16.3023, lng: 80.2608 },
  'prathipadu': { lat: 16.1772, lng: 80.3725 },
  'tadikonda': { lat: 16.4258, lng: 80.4486 },
  'thullur': { lat: 16.5369, lng: 80.4722 },
  'tullur': { lat: 16.5369, lng: 80.4722 },
  'vatticherukuru': { lat: 16.1950, lng: 80.4410 },
  'chebrolu': { lat: 16.2008, lng: 80.5312 },
  'duggirala': { lat: 16.3262, lng: 80.6272 },
  'kakumanu': { lat: 16.0380, lng: 80.4040 },
  'kollipara': { lat: 16.2862, lng: 80.7228 },
  'mangalagiri': { lat: 16.4326, lng: 80.5645 },
  'ponnur': { lat: 16.0682, lng: 80.5542 },
  'tadepalle': { lat: 16.4789, lng: 80.6014 },
  'tenali': { lat: 16.2435, lng: 80.6400 },
  'bose road tenali': { lat: 16.2428, lng: 80.6432 },
  'morrispet': { lat: 16.2389, lng: 80.6355 },
  'chenchupet': { lat: 16.2465, lng: 80.6480 },
  'ganganammapet tenali': { lat: 16.2410, lng: 80.6415 },
  'kothapet tenali': { lat: 16.2450, lng: 80.6370 },
  'ithanagar tenali': { lat: 16.2480, lng: 80.6440 },
  'chinaravuru': { lat: 16.2310, lng: 80.6550 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'suryaraopeta': { lat: 16.5132, lng: 80.6276 },
  'suryaraopet': { lat: 16.5132, lng: 80.6276 },
  'labbipet': { lat: 16.5050, lng: 80.6380 },
  'benz circle': { lat: 16.4988, lng: 80.6558 },
  'governorpet': { lat: 16.5140, lng: 80.6210 },
  'patamata': { lat: 16.4920, lng: 80.6680 },
  'moghalrajpuram': { lat: 16.5040, lng: 80.6480 },
  'auto nagar': { lat: 16.4950, lng: 80.6850 },
  'gunadala': { lat: 16.5250, lng: 80.6650 },
  'bhavanipuram': { lat: 16.5280, lng: 80.5950 },
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
  'nalgonda': { lat: 17.0504, lng: 79.2669 },

  // Commercial Village Nodes & Sub-Centres
  'vadlamudi': { lat: 16.2378, lng: 80.5524 },
  'nambur': { lat: 16.3680, lng: 80.5230 },
  'perecherla': { lat: 16.3275, lng: 80.3270 },
  'pericherla': { lat: 16.3275, lng: 80.3270 },
  'undavalli': { lat: 16.4950, lng: 80.5820 },
  'velagapudi': { lat: 16.5180, lng: 80.5050 },
  'atmakur': { lat: 16.4210, lng: 80.5500 },
  'navuluru': { lat: 16.4420, lng: 80.5750 },
  'burripalem': { lat: 16.2750, lng: 80.6120 },
  'chiluvuru': { lat: 16.3520, lng: 80.6450 },
  'lam': { lat: 16.3980, lng: 80.4410 },
  'angalakuduru': { lat: 16.2550, lng: 80.6150 },
  'kolakaluru': { lat: 16.2820, lng: 80.6280 },
  'chinakakani': { lat: 16.4150, lng: 80.5600 },
  'kaza': { lat: 16.3900, lng: 80.5350 },
  'narakodur': { lat: 16.2410, lng: 80.5050 },
  'vejendla': { lat: 16.2720, lng: 80.4910 },
  'sekuru': { lat: 16.2300, lng: 80.5100 },
  'vaddeswaram': { lat: 16.4400, lng: 80.6180 },
  'kunchanapalle': { lat: 16.4650, lng: 80.6120 },
  'penumaka': { lat: 16.5050, lng: 80.5700 },
  'mandadam': { lat: 16.5120, lng: 80.5350 },
  'rayapudi': { lat: 16.5280, lng: 80.4850 },
  'ainavolu': { lat: 16.5020, lng: 80.4950 }
};

const MANDAL_TYPOLOGY = {
  // Urban: Dense clusters requiring 3.2 - 3.8 km to prevent 20-lead pagination truncations
  'guntureast': { type: 'urban', radiusKm: 3.5 },
  'gunturwest': { type: 'urban', radiusKm: 3.5 },
  'guntur': { type: 'urban', radiusKm: 3.5 },
  'tenali': { type: 'urban', radiusKm: 3.8 },
  'vijayawadaurban': { type: 'urban', radiusKm: 3.5 },
  'vijayawada': { type: 'urban', radiusKm: 3.5 },
  'visakhapatnam': { type: 'urban', radiusKm: 3.8 },
  
  // Corridor: High-growth development corridors requiring 4.5 - 6.0 km
  'mangalagiri': { type: 'corridor', radiusKm: 5.5 },
  'tadepalle': { type: 'corridor', radiusKm: 5.0 },
  'pedakakani': { type: 'corridor', radiusKm: 5.5 },
  'chebrolu': { type: 'corridor', radiusKm: 5.5 },
  
  // Rural / Agricultural / Capital Region: Expansive territories requiring 6.5 - 8.0 km
  'thullur': { type: 'rural', radiusKm: 7.5 },
  'tullur': { type: 'rural', radiusKm: 7.5 },
  'medikonduru': { type: 'rural', radiusKm: 7.5 },
  'phirangipuram': { type: 'rural', radiusKm: 8.0 },
  'pedanandipadu': { type: 'rural', radiusKm: 7.5 },
  'prathipadu': { type: 'rural', radiusKm: 7.5 },
  'tadikonda': { type: 'rural', radiusKm: 7.0 },
  'vatticherukuru': { type: 'rural', radiusKm: 7.0 },
  'kakumanu': { type: 'rural', radiusKm: 7.5 },
  'kollipara': { type: 'rural', radiusKm: 7.0 },
  'duggirala': { type: 'rural', radiusKm: 6.5 },
  'ponnur': { type: 'rural', radiusKm: 7.0 }
};

function getMandalTypology(mandalName) {
  if (!mandalName) return { type: 'corridor', radiusKm: 5.5 };
  const clean = String(mandalName).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (MANDAL_TYPOLOGY[clean]) return MANDAL_TYPOLOGY[clean];
  for (const [key, val] of Object.entries(MANDAL_TYPOLOGY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  return { type: 'corridor', radiusKm: 5.5 };
}

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

/**
 * Resolve a zone anchor.
 *
 * `options.center` is the sweep's own anchor (the geocoded mandal / district /
 * city the operator asked for). It must win over the district fallback: a
 * Tenali Mandal sweep was previously anchoring every village on Guntur city,
 * which made Google return Guntur businesses for a Tenali query. `options.spread`
 * widens the deterministic ring for larger scopes (a state needs degrees, a
 * mandal needs a few hundred metres of separation).
 */
function zoneCoordinates(name, district, index = 0, total = 1, options = {}) {
  const key = String(name || '').toLowerCase().trim();
  const districtKey = String(district || '').toLowerCase().trim();
  const direct = ZONE_COORDINATES[key];
  if (direct) return { lat: direct.lat, lng: direct.lng, isApproximate: false };

  const cached = cachedZoneCoords(name, district);
  if (cached) return cached;

  const explicitCenter = options.center
    && Number.isFinite(Number(options.center.lat))
    && Number.isFinite(Number(options.center.lng))
    ? options.center
    : null;
  const center = explicitCenter
    || ZONE_COORDINATES[districtKey]
    || cachedZoneCoords(district, '')
    || null;
  const spread = Number.isFinite(Number(options.spread)) && Number(options.spread) > 0
    ? Number(options.spread)
    : 0.075;
  return spreadCoords(center, index, total, spread);
}

// ── WHOLE-CITY COVERAGE GRID ──
// A city is not a handful of famous localities. Google only reveals ~120
// results per query, so the only honest way to cover a whole city is to split
// its true footprint into viewport-sized cells and let each cell return its own
// slice. Cells are Maps-only (Local Finder cannot be area-biased) and are
// skipped when a named locality already sits on top of them.

const GRID_CELL_KM = 2.6;
const GRID_KM_PER_DEG_LAT = 111.0;
// Famous businesses often sit just outside the municipal core (highway
// restaurants, resorts, function halls, industrial suppliers). A city run must
// therefore search a ring *around* the city, not only inside it. 5 km is enough
// to catch the highway/outskirt belt without turning every run into a district
// sweep.
const CITY_GRID_RING_KM = 5;
const GRID_MAX_CELLS_PER_AXIS = 9;

// ── CATEGORY SUB-VECTORS ──
// Google's Maps list is capped at ~20 places per query ("limited view").
// Coordinate cells alone keep returning the same top-20, so the honest way to
// reach the long tail is to ask the *same city* for its real sub-categories:
// a city with 40 restaurants for dinner has separate biryani, veg, dhaba,
// bakery, cafe and military-hotel clusters. These are search vectors, not
// invented businesses — every lead still comes from Google.
const CATEGORY_SUBVECTORS = [
  // 1. Manufacturers, Industrial Units, Factories & Fabrication
  {
    match: /manufactur|factory|factories|industrial|fabricat|oem|production|plant|mill|processing unit|packaging|machinery|foundry/i,
    labels: [
      'Industrial equipment manufacturer', 'Fabrication works', 'OEM parts manufacturer',
      'Machinery manufacturer', 'Plastic products manufacturer', 'Chemical manufacturing plant',
      'Packaging material manufacturer', 'Steel fabrication workshop', 'Food processing unit',
      'Electrical goods manufacturer', 'Industrial estate factory units', 'Warehouse and industrial supplier',
      'Pipes and fittings manufacturer', 'Corrugated box manufacturer', 'Textile mill'
    ]
  },
  // 2. Computer Stores, Laptops, IT Hardware, PC Builders & Laptop Repair (Strictly zero CCTV)
  {
    match: /\b(computer|computers|laptop|laptops|desktop|pc|gaming pc|macbook|pc builder|computer hardware|computer accessories)\b/i,
    exclude: /\b(cctv|surveillance|security|biometric|dvr|nvr|camera|dslr)\b/i,
    labels: [
      'Laptop showroom', 'Computer hardware shop', 'Desktop PC builder', 'Computer repair and service',
      'Laptop screen and motherboard repair', 'Refurbished laptop store', 'Computer accessories and peripherals',
      'Gaming PC builder', 'Computer AMC service provider', 'Networking equipment supplier',
      'Printer dealer and cartridge refill'
    ]
  },
  // 2a. CCTV, Security Systems & Surveillance (Strictly Isolated from Computer Stores)
  {
    match: /\b(cctv|surveillance|security camera|security systems|biometric|dvr|nvr|access control|video door phone)\b/i,
    labels: [
      'CCTV camera dealer', 'CCTV installation and wiring', 'Security surveillance systems',
      'Hikvision and CP Plus dealer', 'IP camera and wireless security', 'DVR and NVR setup and networking',
      'Biometric attendance systems', 'Access control and smart locks', 'CCTV repair and AMC service'
    ]
  },
  // 2b. Mobile Phones, Smartphones, Tablets & Mobile Repair
  {
    match: /\b(mobile|mobiles|smartphone|smartphones|iphone|cellphone|phone shop|phone store|phone repair|mobile repair)\b/i,
    exclude: /\b(automobile|mobility)\b/i,
    labels: [
      'Mobile phone showroom', 'Multi-brand smartphone store', 'Mobile phone repair center',
      'Mobile accessories and back covers', 'Second hand and refurbished mobile phones',
      'iPhone repair and service center'
    ]
  },
  // 2b. Camera & DSLR Shops, Lenses, Repair & Photography Gear (Distinct from CCTV & Photo Studios)
  {
    match: /\b(camera|cameras|camra|dslr|mirrorless|camera lens|photography gear|gimbal)\b/i,
    exclude: /\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i,
    labels: [
      'Camera showroom', 'DSLR camera dealer', 'Canon camera store', 'Nikon camera shop',
      'Sony Alpha camera dealer', 'Camera lens and accessories store', 'Camera and lens repair center',
      'Second hand DSLR camera shop', 'Drone and gimbal store', 'Studio lighting and tripod dealer'
    ]
  },
  // 3. Photography, Studios, Videography & Digital Labs
  {
    match: /\b(photo|photographer|photographers|photography|photo studio|photo studios|studio|studios|videographer|videographers|videography|candid|digital lab|shoot)\b/i,
    labels: [
      'Wedding photographer', 'Photo studio', 'Digital photo lab', 'Candid wedding photography',
      'Pre wedding photoshoot', 'Newborn baby photographer', 'Just born baby photoshoot',
      'Maternity photoshoot studio', 'Birthday and event photographer', 'Drone videography and cinematography',
      'Cinematographer and video editor', 'Portrait studio', 'Passport photo studio',
      'Photo frame and album maker', 'Commercial photographer', 'Baby portfolio studio'
    ]
  },
  // 4. Venues, Mandaps, Function Halls, Banquets & Catering
  {
    match: /wedding|mandap|decorator|catering|banquet|function hall|marriage hall|convention|kalyana mandapam/i,
    labels: [
      'Convention centre', 'Function hall', 'Marriage hall', 'Kalyana mandapam',
      'AC banquet hall', 'Open party lawn', 'Wedding caterers', 'Outdoor catering service',
      'Veg catering service', 'Non veg catering', 'Brahmin catering service', 'Wedding decorator',
      'Mandap decoration', 'Stage decoration', 'Flower decorator', 'DJ sound and lighting',
      'Wedding planner', 'Event management company'
    ]
  },
  // 5. Food, Dining, Restaurants & Cafes
  {
    match: /restaurant|restaurent|dhaba|biryani|eatery|food court|dining|meals|mess|cafe|bakery|fast food/i,
    labels: [
      'Biryani restaurant', 'Veg restaurant', 'Non veg restaurant', 'Family restaurant',
      'Dhaba', 'Cafe', 'Bakery', 'Fast food', 'Chinese restaurant', 'South Indian restaurant',
      'North Indian restaurant', 'Bar and restaurant', 'Ice cream parlour', 'Pizza',
      'Military hotel', 'Meals mess', 'Grill and BBQ', 'Seafood restaurant', 'Sweets shop'
    ]
  },
  // 6a. Hospitals, Emergency Care & Nursing Homes (Strictly In-Patient, Trauma & Surgery)
  {
    match: /\b(hospital|hospitals|nursing home|nursing homes|trauma cent(?:er|re)|emergency care|icu|maternity home|healthcare center)\b/i,
    labels: [
      'Multispeciality hospital', 'Emergency and trauma care hospital', 'Children and pediatric hospital',
      'Maternity hospital and gynaec care', 'Eye hospital', 'Orthopaedic and fracture hospital',
      'Cardiology hospital', 'Super speciality hospital', 'Surgical nursing home', 'Cancer hospital'
    ]
  },
  // 6b. Pharmacies, Medical Stores, Chemists & Drug Stores (Medicines & Surgical Supplies)
  {
    match: /\b(pharmacy|pharmacies|medical store|medical stores|medical shop|medical shops|chemist|chemists|druggist|druggists|drug store|drug stores|apothecary|jan aushadhi|medicine shop|medicine store)\b/i,
    labels: [
      '24 hours pharmacy', 'Medical store and chemist', 'Retail pharmacy shop',
      'Wholesale medicine distributor', 'Surgical equipment supplier', 'Generic medicine store (Jan Aushadhi)',
      'Ayurvedic pharmacy and medical store', 'Homeopathy medical store', 'Veterinary pharmacy'
    ]
  },
  // 6c. Doctors, Clinics & Specialist Practitioners (Outpatient Consultations)
  {
    match: /\b(clinic|clinics|doctor|doctors|physician|dental|dentist|eye care|ophthalmologist|orthopedic|pediatrician|gynecologist|dermatologist|ent clinic|physiotherapy)\b/i,
    labels: [
      'General physician clinic', 'Dental clinic and implant centre', 'Skin and dermatology clinic',
      'Pediatrician child clinic', 'Gynaecologist clinic', 'ENT specialist clinic',
      'Orthopedic consultation clinic', 'Physiotherapy centre', 'Eye care and optometry clinic',
      'Ayurvedic and homeopathic clinic'
    ]
  },
  // 6d. Diagnostics, Scan Centers & Pathology Labs
  {
    match: /\b(diagnostic|diagnostics|pathology|blood test|scan cent(?:er|re)|mri|ct scan|x ray|ultrasound|laboratory|path lab)\b/i,
    labels: [
      'Diagnostic centre', 'Pathology and blood testing lab', 'MRI and CT scan centre',
      'Ultrasound and X-ray clinic', 'Thyroid and clinical lab', 'Full body health checkup centre'
    ]
  },
  // 7. Salons, Spas, Makeup & Beauty
  {
    match: /salon|beauty|spa|parlour|parlor|hair|makeup/i,
    labels: [
      'Beauty parlour', 'Unisex salon', 'Bridal makeup artist', 'Mehendi artist',
      'Hair spa and styling salon', 'Nail art studio', 'Massage and wellness spa',
      'Men grooming salon', 'Ladies beauty parlour', 'Skin and laser treatment clinic'
    ]
  },
  // 8. Building Materials, Hardware & Construction
  {
    match: /tiles?|cement|steel|hardware|paint|building material|sanitary|plywood|timber|glass|aluminium/i,
    labels: [
      'Building material supplier', 'Hardware and tools shop', 'Tiles and granite showroom',
      'Sanitaryware shop', 'Plywood and laminates', 'TMT steel and cement dealer',
      'Paints and hardware store', 'Electrical goods and wiring', 'Glass and aluminium works',
      'Bathroom fittings dealer', 'Modular kitchen hardware', 'PVC pipe dealer'
    ]
  },
  // 8b. Shopping Malls, Commercial Centers & Retail Plazas
  {
    match: /\b(mall|malls|shopping mall|shopping malls|shopping cent(?:er|re)|commercial complex|retail plaza|hypermarket)\b/i,
    labels: [
      'Shopping mall', 'Commercial shopping complex', 'Central retail mall',
      'Multiplex and shopping mall', 'Hypermarket and departmental mall',
      'Retail plaza and fashion center', 'Food court and entertainment mall',
      'Commercial business arcade'
    ]
  },
  // 8c. Agriculture, Spices & Agro Commodities
  {
    match: /\b(turmeric|haldi|pasupu|spices?|masala|chilli|chillies|mirchi|cotton|ginning|rice\s*mill|paddy|grain|grains|pulses?|dal\s*mill|oil\s*mill|groundnut|jaggery|bellam|tobacco|agro\s*commodit|agricultural|apmc|mandi|krishi|fertilizer|seeds?|pesticide|grain\s*merchant|produce\s*merchant|dry\s*fruits?|cashew|cardamom|pepper|coriander|cumin|jeera|oilseeds?|cold\s*storage)\b/i,
    exclude: /\b(saree|textile|cloth|steel|iron|cement|tiles|sanitary|hospital|clinic|doctor|pharmacy|hotel|lodge|restaurant|barber|salon|parlour)\b/i,
    labels: [
      'Agricultural commodity traders', 'Spices wholesalers and commission agents',
      'Grain and pulse wholesale merchants', 'Rice mills and paddy processors',
      'Mandi merchants and APMC yard stockists', 'Cold storage and agro warehouse'
    ]
  },
  // 9a. Textiles, Sarees, Handlooms & Apparel
  {
    match: /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|fabric|fabrics|cloth|clothes|clothing|garment|garments|spinning\s*mill|weaving|silk|cotton\s*cloth|readymade|apparel|hosiery|tailor|boutique)\b/i,
    exclude: /\b(turmeric|spices|chilli|grain|steel|iron|cement|tiles|sanitary|hospital|clinic)\b/i,
    labels: [
      'Saree showroom', 'Handloom sarees and silk', 'Textile wholesaler',
      'Readymade garments wholesale', 'Fabric and cloth merchants', 'Boutique and designer studio'
    ]
  },
  // 9b. Footwear & Shoes Showrooms
  {
    match: /\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|chappal|sandals)\b/i,
    exclude: /\b(turmeric|spices|steel|saree|hospital|clinic)\b/i,
    labels: [
      'Footwear showroom', 'Wholesale shoe dealer', 'Leather footwear store',
      'Sports shoe and sneaker store'
    ]
  },
  // 9c. Furniture, Woodwork & Mattresses
  {
    match: /\b(furniture|wooden\s*furniture|sofas?|mattresses?|office\s*furniture|wardrobes?)\b/i,
    exclude: /\b(turmeric|spices|steel|saree|hospital|clinic)\b/i,
    labels: [
      'Furniture showroom', 'Wooden furniture manufacturer', 'Sofa and interior furniture store',
      'Mattress and sleep studio', 'Office furniture supplier'
    ]
  },
  // 9d. Jewellery, Gold & Diamonds
  {
    match: /\b(jeweller|jewellers|jewellery|gold\s*shop|gold\s*merchant|bullion|diamond\s*jewell?ery)\b/i,
    exclude: /\b(turmeric|steel|saree|cement|clinic)\b/i,
    labels: [
      'Jewellery showroom', 'Gold merchants and bullion', 'Diamond jewellery store',
      'Silver ornaments and articles'
    ]
  },
  // 9e. Pure Wholesale & Distribution (General, when no specific retail industry matches)
  {
    match: /\b(wholesaler|wholesale\s*market|wholesale\s*dealer|distributor|bulk\s*supplier|c&f\s*agent|stockist)\b/i,
    exclude: /\b(turmeric|spices|chilli|cotton|grain|rice|dal|saree|garment|cloth|furniture|footwear|jewell|cctv|computer|doctor|clinic|hotel|restaurant|tiles|cement|steel)\b/i,
    labels: [
      'Wholesale market', 'Wholesale dealer', 'Authorized distributor', 'Bulk supplier and stockist'
    ]
  },
  // 10. Education, Coaching, Institutes & Academies
  {
    match: /school|college|coaching|tuition|institute|academy|training/i,
    labels: [
      'School', 'High school', 'College', 'IIT JEE NEET coaching', 'Competitive exam coaching',
      'Spoken English and IELTS institute', 'Computer software training institute', 'Tuition centre',
      'Play school and daycare', 'Music academy', 'Dance academy'
    ]
  },
  // 11. Fitness, Gym & Sports
  {
    match: /gym|fitness|yoga|sports|swimming/i,
    labels: [
      'Gym and fitness centre', 'Yoga studio', 'Crossfit gym', 'Ladies gym',
      'Swimming pool', 'Sports academy', 'Badminton court', 'Cricket coaching academy'
    ]
  },
  // 12. Real Estate, Builders & Properties
  {
    match: /real estate|property|builder|flat|apartment|land|plot/i,
    labels: [
      'Real estate agent', 'Property dealer', 'Builder and developer', 'Apartment project',
      'Open plots and layouts', 'Villa project', 'Rental flats', 'Commercial property', 'Land surveyor'
    ]
  },
  // 13. Automobiles, Vehicles, Spares & Servicing
  {
    match: /car|bike|automobile|vehicle|tyre|spare parts|service centre|service center/i,
    labels: [
      'Car repair workshop', 'Bike service centre', 'Car showroom', 'Bike showroom',
      'Tyre shop and wheel alignment', 'Auto spare parts shop', 'Car accessories', 'Car wash and detailing',
      'Car battery dealer', 'Car AC repair', 'Driving school'
    ]
  },
  // 14. Home Maintenance, Plumbing, Electrical & Repair
  {
    match: /plumber|electrician|carpenter|painter|pest control|cleaning|packers|movers|appliance|ac repair/i,
    labels: [
      'Plumbing contractor', 'Electrician and house wiring', 'Carpenter and woodwork',
      'Painter and whitewashing', 'AC repair and servicing', 'Home appliance repair',
      'Deep cleaning service', 'Pest control service', 'Packers and movers', 'RO water purifier service'
    ]
  },
  // 15. Legal, Financial & Corporate Services
  {
    match: /lawyer|advocate|legal|chartered accountant|ca |tax|consultant/i,
    labels: [
      'Lawyer', 'Advocate and legal counsel', 'Chartered accountant', 'Tax consultant', 'GST consultant',
      'Company registration consultant', 'Notary advocate', 'Legal advisor and firm'
    ]
  },
  // 16. Logistics, Travel, Printing & General Services
  {
    match: /service|repair|install|maintenance|security|transport|courier|travel|tour|insurance|finance|printing|xerox|laundry|tailor|agency/i,
    labels: [
      'Courier service', 'Transport and logistics service', 'Travel agency and tours',
      'Security services', 'Printing press and digital printing', 'Insurance agency',
      'Laundry and dry cleaners', 'Tailor and boutique', 'Installation and repair service'
    ]
  }
];

// Generic last-resort vectors that work for any category. They surface the
// long tail (wholesale, 24-hour, service, famous) that a single ranked list
// hides behind the top-20 cap.
const GENERIC_SUBVECTORS = [
  'best', 'famous', 'near railway station', 'near bus stand',
  'near main road', '24 hours', 'wholesale', 'service centre'
];

function normalizeCategoryKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildCategorySubVectorZones(category, cityLabel, limit = 32) {
  const cat = String(category || '').replace(/\s+/g, ' ').trim();
  if (!cat) return [];
  const city = String(cityLabel || '').replace(/,\s*$/, '').trim();
  if (!city) return [];

  const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat);
  let labels = [];

  if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
    // Exact trade intelligence subvectors have highest priority and absolute domain purity
    labels = [...tradeVectors];
  } else {
    const family = CATEGORY_SUBVECTORS.find(entry => entry.match.test(cat) && (!entry.exclude || !entry.exclude.test(cat)));
    labels = family ? [...family.labels] : [];
  }

  // Cross-Industry Negative Gate: Strictly drop any label matching negative avoid keywords
  const sectorAvoids = indiaTradeIntelligence.getNegativeAvoidsForQuery(cat);
  if (Array.isArray(sectorAvoids) && sectorAvoids.length > 0) {
    labels = labels.filter(lbl => {
      const lower = lbl.toLowerCase();
      return !sectorAvoids.some(avoid => lower.includes(avoid.toLowerCase()));
    });
  }

  const catKey = normalizeCategoryKey(cat);

  // Add generic modifiers only when they do not dilute or contradict the sector intent
  const isAgroOrCommodity = /\b(turmeric|haldi|pasupu|spices?|masala|chilli|cotton|grain|paddy|rice|dal|oilseed|tobacco|jaggery)\b/i.test(cat);
  const generic = (tradeVectors.length > 0 || isAgroOrCommodity)
    ? [] // When we have authoritative trade vectors or commodities, keep 100% pure focus
    : GENERIC_SUBVECTORS
        .filter(mod => {
          if (/wholesale|service centre/.test(mod)) return /shop|dealer|store|repair|computer|mobile|car|bike|electronics/i.test(catKey);
          return true;
        })
        .map(mod => (mod === 'best' || mod === 'famous') ? `${mod} ${cat}` : `${cat} ${mod}`);

  const seen = new Set();
  const zones = [];
  const base = ZONE_COORDINATES[String(city).toLowerCase().trim()] || null;
  for (const label of [...labels, ...generic]) {
    const key = label.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    zones.push({
      zoneName: `${city} · ${label}`,
      queryText: `${label} in ${city}`,
      lat: base ? base.lat : null,
      lng: base ? base.lng : null,
      engines: ['local_finder', 'maps'],
      coverageKind: 'vector',
      precisionLevel: 'category_vector',
      radiusKm: 2.8,
      isVectorQuery: true,
      isSingle: false
    });
    if (zones.length >= limit) break;
  }
  return zones;
}

function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = (a.lat - b.lat) * Math.PI / 180;
  const dLng = (a.lng - b.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function compassLabel(centerLat, centerLng, minLat, maxLat, minLng, maxLng) {
  const vertical = centerLat < minLat + (maxLat - minLat) / 3 ? 'South'
    : centerLat > maxLat - (maxLat - minLat) / 3 ? 'North' : '';
  const horizontal = centerLng < minLng + (maxLng - minLng) / 3 ? 'West'
    : centerLng > maxLng - (maxLng - minLng) / 3 ? 'East' : '';
  if (vertical && horizontal) return `${vertical}-${horizontal}`;
  return vertical || horizontal || 'Central';
}

/**
 * Build viewport grid cells over a city footprint.
 * @param {string} cityName display name ("Guntur")
 * @param {string} category search category ("Restaurants")
 * @param {Array<{lat:number,lng:number}>} anchors known locality coordinates
 * @param {{cappedRadiusKm?:number}} options
 * @returns {Array} grid zone objects
 */
function buildCityGridZones(cityName, category, anchors = [], options = {}) {
  const coords = (anchors || []).filter(a => a && Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng)));
  const center = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()]
    || options.center
    || (coords.length ? {
      lat: coords.reduce((sum, c) => sum + Number(c.lat), 0) / coords.length,
      lng: coords.reduce((sum, c) => sum + Number(c.lng), 0) / coords.length
    } : null);
  if (!center) return [];

  // The searched footprint = the city's own extent (at least an 11 km core)
  // plus a 5 km ring on every side. The ring is where highway restaurants,
  // resorts, function halls, showrooms and out-of-town suppliers usually live,
  // so a city run that stops at the municipal edge silently loses them.
  const ringKm = Number.isFinite(Number(options.ringKm))
    ? Math.max(0, Number(options.ringKm))
    : CITY_GRID_RING_KM;
  const cosLat = Math.max(0.2, Math.cos(center.lat * Math.PI / 180));

  let halfLat;
  let halfLng;
  if (coords.length >= 3) {
    let spanLat = 0;
    let spanLng = 0;
    for (const c of coords) {
      spanLat = Math.max(spanLat, Math.abs(Number(c.lat) - Number(center.lat)) * 2);
      spanLng = Math.max(spanLng, Math.abs(Number(c.lng) - Number(center.lng)) * 2);
    }
    // 15 % breathing room over the outermost known locality, never less than
    // an 11 km core, then the ring.
    halfLat = Math.max((spanLat / 2) * 1.15, 0.05);
    halfLng = Math.max((spanLng / 2) * 1.15, 0.055);
  } else {
    const baseRadiusKm = Number(options.cappedRadiusKm) || 6;
    halfLat = Math.max(baseRadiusKm / GRID_KM_PER_DEG_LAT, 0.05);
    halfLng = Math.max(baseRadiusKm / (GRID_KM_PER_DEG_LAT * cosLat), 0.055);
  }

  halfLat += ringKm / GRID_KM_PER_DEG_LAT;
  halfLng += ringKm / (GRID_KM_PER_DEG_LAT * cosLat);

  const minLat = Number(center.lat) - halfLat;
  const maxLat = Number(center.lat) + halfLat;
  const minLng = Number(center.lng) - halfLng;
  const maxLng = Number(center.lng) + halfLng;

  const latMeters = Math.max(0.01, (maxLat - minLat) * GRID_KM_PER_DEG_LAT);
  const lngMeters = Math.max(0.01, (maxLng - minLng) * GRID_KM_PER_DEG_LAT * cosLat);
  const cols = Math.max(2, Math.min(GRID_MAX_CELLS_PER_AXIS, Math.round(lngMeters / GRID_CELL_KM)));
  const rows = Math.max(2, Math.min(GRID_MAX_CELLS_PER_AXIS, Math.round(latMeters / GRID_CELL_KM)));

  const prefix = category ? `${category} ` : '';
  const city = String(cityName || '').trim() || 'City';
  const cells = [];
  const usedNames = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = minLat + (maxLat - minLat) * ((r + 0.5) / rows);
      const lng = minLng + (maxLng - minLng) * ((c + 0.5) / cols);
      const point = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };

      // Skip cells already covered by a named locality query.
      const nearest = coords.reduce((best, a) => {
        const d = distanceKm(point, a);
        return d < best.d ? { d, a } : best;
      }, { d: Infinity, a: null });
      if (nearest.a && nearest.d < 1.8) continue;

      const dir = compassLabel(point.lat, point.lng, minLat, maxLat, minLng, maxLng);
      let zoneName = `${city} ${dir} Sector ${cells.length + 1}`;
      if (usedNames.has(zoneName.toLowerCase())) zoneName = `${city} ${dir} Grid ${cells.length + 1}`;
      usedNames.add(zoneName.toLowerCase());

      cells.push({
        zoneName,
        // Google Maps understands coordinates in the query text: "Restaurants near
        // 16.36,80.38" plus tight 2.2 km viewport zoom makes each grid cell unique.
        queryText: `${prefix}near ${point.lat.toFixed(4)},${point.lng.toFixed(4)}`,
        lat: point.lat,
        lng: point.lng,
        radiusKm: 2.2,
        engines: ['maps'],
        coverageKind: 'grid',
        precisionLevel: 'sector_grid',
        isVectorQuery: true,
        isSingle: false,
        isApproximate: false
      });
    }
  }
  return cells;
}

/**
 * Merge named locality zones with whole-city grid cells.
 * @param {string} cityName
 * @param {string} category
 * @param {string[]} localityNames
 * @param {string} locationLabel location string used in locality queries
 * @param {number} maxZones optional hard cap (Infinity = cover everything)
 */
function buildCityCoverage(cityName, category, localityNames, locationLabel, maxZones = Infinity) {
  const prefix = category ? `${category} in ` : '';
  const named = (localityNames || []).map((name, idx) => {
    let coord = ZONE_COORDINATES[String(name).toLowerCase().trim()]
      || zoneCoordinates(name, cityName, idx, (localityNames || []).length);
    if (!coord || !Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) {
      const base = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()];
      if (base) {
        const angle = (idx + 1) * 2.3999632;
        const r = 0.0085 * Math.sqrt(idx + 1);
        coord = {
          lat: Number((base.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((base.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
    }
    return {
      zoneName: name,
      queryText: `${prefix}${name}, ${locationLabel}`,
      lat: coord ? coord.lat : null,
      lng: coord ? coord.lng : null,
      radiusKm: 1.8,
      engines: ['maps'],
      coverageKind: 'locality',
      precisionLevel: 'city_ward',
      isVectorQuery: true,
      isSingle: false
    };
  });

  const anchors = named
    .filter(z => z.lat && z.lng)
    .map(z => ({ lat: z.lat, lng: z.lng, name: z.zoneName }));
  const cityLabel = locationLabel || cityName;
  const subVectors = buildCategorySubVectorZones(category, cityLabel, 8).map(z => ({
    ...z,
    radiusKm: 3.5,
    coverageKind: 'vector',
    engines: ['maps']
  }));
  const grid = buildCityGridZones(cityName || locationLabel, category, anchors);
  const mustKeep = [...named, ...subVectors];
  const rawMerged = [...mustKeep, ...grid];
  const seenKeys = new Set();
  const merged = rawMerged.filter(z => {
    const key = `${Math.round(Number(z.lat || 0) * 1000)}:${Math.round(Number(z.lng || 0) * 1000)}:${String(z.queryText || '').toLowerCase().trim()}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  if (merged.length <= maxZones) return merged;

  // Keep every locality and every category sub-vector, then sample the grid
  // evenly by distance so the outer ring is represented too. Sub-vectors are
  // the highest-yield zones because each one returns a different top-20 list.
  const center = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()] || { lat: anchors[0]?.lat, lng: anchors[0]?.lng };
  const slots = Math.max(0, maxZones - mustKeep.length);
  const sortedGrid = grid
    .map(z => ({ z, d: center && center.lat ? distanceKm(z, center) : 0 }))
    .sort((a, b) => a.d - b.d);

  // User mandate: Search all over the city not leaving one single lead/locality.
  // Never truncate authentic named localities.
  if (slots <= 0) return mustKeep;
  if (slots >= sortedGrid.length) return [...mustKeep, ...sortedGrid.map(entry => entry.z)];

  const picked = new Set();
  for (let i = 0; i < slots; i++) {
    const idx = Math.round((i * (sortedGrid.length - 1)) / Math.max(1, slots - 1));
    picked.add(sortedGrid[idx].z);
  }
  // Rounding can collide at the edges; top up with any cell not yet picked.
  for (const entry of sortedGrid) {
    if (picked.size >= slots) break;
    picked.add(entry.z);
  }
  return [...mustKeep, ...picked];
}

// ── UNIVERSAL CATEGORY & LOCALITY INTELLIGENCE ENGINE ──
function getUniversalCategoryVectors(category, cleanLoc) {
  let cat = (category || 'Business').trim();
  cat = cat.replace(new RegExp(`\\s+(in|near|at|around)\\s+.*$`, 'i'), '').trim();
  if (!cat) cat = 'Business';
  const lowerCat = cat.toLowerCase();

  // 1. Manufacturers & Industrial Units
  if (lowerCat.match(/manufactur|factory|factories|industrial|fabricat|oem|production|plant|mill|processing|packaging material|corrugated/i)) {
    return [
      { zoneName: `${cleanLoc} Industrial Equipment Manufacturers`, queryText: `Industrial Equipment Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fabrication Works & Workshops`, queryText: `Fabrication Works in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} OEM Parts & Machinery Manufacturers`, queryText: `Machinery Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Plastic & Packaging Manufacturers`, queryText: `Packaging Material Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Industrial Area Factory Units`, queryText: `Factories in Industrial Area ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Chemical & Processing Plants`, queryText: `Manufacturing Plants in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 1b. Shopping Malls & Commercial Complexes
  if (lowerCat.match(/\b(mall|malls|shopping mall|shopping malls|shopping cent(?:er|re)|commercial complex|retail plaza|hypermarket)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Shopping Malls & Retail Plazas`, queryText: `Shopping Malls in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Shopping Complexes`, queryText: `Commercial Shopping Complex in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Shopping Centers`, queryText: `Shopping Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hypermarket & Departmental Malls`, queryText: `Hypermarket in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Entertainment & Multiplex Malls`, queryText: `Mall Multiplex in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2. Computer Stores, IT Hardware & Laptops (Strictly zero CCTV)
  if (lowerCat.match(/\b(computer|laptop|pc|desktop|pc builder|hardware store|gaming pc)\b/i) && !lowerCat.match(/\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Laptop & Computer Showrooms`, queryText: `Laptop Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer Hardware & PC Builders`, queryText: `Computer Hardware Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer & Laptop Repair Centers`, queryText: `Computer Repair and Service in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Refurbished & Used Laptop Stores`, queryText: `Second Hand Laptop Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer Peripherals & Accessories`, queryText: `Computer Accessories Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Networking & Server Equipment`, queryText: `Networking Solutions in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2a. CCTV & Security Surveillance (Dedicated Independent Category)
  if (lowerCat.match(/\b(cctv|surveillance|security camera|security systems|biometric|access control|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} CCTV & Security System Dealers`, queryText: `CCTV Camera Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} CCTV Installation & Wiring Services`, queryText: `CCTV Installation Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} IP Camera & Wireless Surveillance`, queryText: `IP Security Camera Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Biometric Attendance & Access Control`, queryText: `Biometric Attendance System Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DVR NVR Hardware & Setup`, queryText: `DVR NVR Security Systems in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2b. Camera Stores, DSLR Dealers, Lenses & Camera Repair (Distinct from CCTV & Photo Studios!)
  if (lowerCat.match(/\b(camera|cameras|camra|dslr|mirrorless|camera lens|photography gear|gimbal)\b/i) && !lowerCat.match(/\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Camera & DSLR Showrooms`, queryText: `Camera Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Canon Nikon Sony Camera Dealers`, queryText: `DSLR Camera Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Camera Lenses & Studio Gear`, queryText: `Camera Lens and Accessories Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Camera & Lens Repair Centres`, queryText: `Camera Repair Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Drone & Gimbal Dealers`, queryText: `Drone and Gimbal Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Used & Refurbished Cameras`, queryText: `Second Hand Camera Shop in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 3. Photography, Studios & Videography
  if (lowerCat.match(/photo|studio|album|shoot|video|candid|cinemat/i)) {
    return [
      { zoneName: `${cleanLoc} Photo Studios & Digital Labs`, queryText: `Photo Studio in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding Photographers`, queryText: `Wedding Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Candid & Pre-Wedding Shoots`, queryText: `Candid Wedding Photography in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Newborn & Baby Photographers`, queryText: `Baby Photoshoot in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Drone Videographers & Cinematography`, queryText: `Drone Videography in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Passport & Instant Photo Studios`, queryText: `Passport Photo Studio in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4. Venues, Mandaps, Function Halls & Catering
  if (lowerCat.match(/wedding|mandap|decorator|catering|banquet|function hall|marriage/i)) {
    return [
      { zoneName: `${cleanLoc} Convention & Function Halls`, queryText: `Function Hall in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} AC Banquet Halls`, queryText: `Banquet Hall in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Marriage & Kalyana Mandapams`, queryText: `Kalyana Mandapam in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding & Outdoor Caterers`, queryText: `Catering Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Stage & Mandap Decorators`, queryText: `Wedding Decorators in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DJ & Event Organizers`, queryText: `Event Management Company in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5a. Pharmacies, Chemists, Medical Stores & Drugstores (Strictly medicine & supplies)
  if (lowerCat.match(/\b(pharmacy|pharmacies|medical store|medical stores|medical shop|medical shops|chemist|chemists|druggist|drug store|drug stores|jan aushadhi|medicine shop)\b/i)) {
    return [
      { zoneName: `${cleanLoc} 24 Hours Pharmacies & Chemists`, queryText: `24 Hours Pharmacy in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Retail Medical Stores & Drugstores`, queryText: `Medical Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wholesale Pharmaceutical Distributors`, queryText: `Wholesale Medicine Distributors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Surgical & Medical Equipment Suppliers`, queryText: `Surgical Equipment Suppliers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Generic Medicine Stores (Jan Aushadhi)`, queryText: `Generic Medicine Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Ayurvedic & Herbal Medical Stores`, queryText: `Ayurvedic Pharmacy in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5b. Hospitals, Emergency Care & Nursing Homes (Strictly Inpatient & Trauma)
  if (lowerCat.match(/\b(hospital|hospitals|nursing home|nursing homes|trauma|emergency care|icu|maternity home)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Multispeciality Hospitals`, queryText: `Multispeciality Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Emergency & Trauma Care Centers`, queryText: `Trauma Care Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Children & Pediatric Hospitals`, queryText: `Children Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Maternity & Gynecologist Hospitals`, queryText: `Maternity Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Orthopedic & Fracture Hospitals`, queryText: `Orthopedic Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Eye Care Hospitals`, queryText: `Eye Hospital in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5c. Doctors, Clinics & Specialist Consultations
  if (lowerCat.match(/\b(clinic|clinics|doctor|doctors|physician|dental|dentist|dermatolog|pediatric|gynecolog|ent|physiotherapy)\b/i)) {
    return [
      { zoneName: `${cleanLoc} General Physician & Family Clinics`, queryText: `Clinics in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Dental Clinics & Implant Centers`, queryText: `Dental Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Skin & Dermatology Clinics`, queryText: `Skin Specialist Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Eye Care & Optometry Clinics`, queryText: `Eye Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pediatric & Child Care Clinics`, queryText: `Pediatrician Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Physiotherapy & Rehab Centers`, queryText: `Physiotherapy Centre in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5d. Diagnostics, Scan Centers & Pathology Labs
  if (lowerCat.match(/\b(diagnostic|diagnostics|pathology|blood test|scan|mri|ct scan|x ray|ultrasound|lab|laboratory)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Diagnostic & Imaging Centers`, queryText: `Diagnostic Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pathology & Blood Test Labs`, queryText: `Pathology Lab in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} MRI & CT Scan Centers`, queryText: `MRI Scan Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Ultrasound & X-Ray Clinics`, queryText: `Scan Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Health Checkup Centers`, queryText: `Clinical Laboratory in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Blood Testing Laboratories`, queryText: `Blood Testing Lab in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // Generic Dynamic Vectors
  return [
    { zoneName: `${cleanLoc} Core`, queryText: `${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Top Rated`, queryText: `Best ${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Central / Main`, queryText: `${cat} in ${cleanLoc} Central`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Commercial Market`, queryText: `${cat} near Market, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Station & Bus Stand Area`, queryText: `${cat} near Railway Station / Bus Stand, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Wholesale & Services`, queryText: `${cat} Services in ${cleanLoc}`, isVectorQuery: true }
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

  // Wide-area sweeps (Districts, Mandals, States, Metros) are supported seamlessly across all modes.

  // 1. Authoritative Pre-Mapped Cities & Metros (All 24 Mumbai Wards, All Delhi Wards, etc.)
  // Runs comprehensively across ALL localities of the city (NO arbitrary truncation)
  for (const [key, zones] of Object.entries(AUTHORITATIVE_CLUSTERS)) {
    if (!isExplicitDistrict && (lowerLoc === key || primaryName === key || strippedName === key) && !lowerLoc.includes('rural')) {
      // Whole-city coverage: every named locality plus viewport grid cells that
      // fill the gaps between them. Without the grid, a city run can only ever
      // see the businesses those few phrases happen to rank.
      const cityLabel = cleanLoc.replace(/\b(city|town)\b/gi, '').replace(/\s+/g, ' ').trim() || cleanLoc;
      const cityTitle = key.replace(/\b\w/g, ch => ch.toUpperCase());
      // No coverage cap: every named locality plus every grid cell is dispatched.
      return buildCityCoverage(cityTitle, category, zones, cityLabel, Infinity);
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

    const sectorZones = citySectors.map((sector, idx) => {
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
        radiusKm: 2.0,
        engines: ['local_finder', 'maps'],
        coverageKind: 'locality',
        precisionLevel: 'city_ward',
        isVectorQuery: true,
        isSingle: false
      };
    });

    // Fill the rest of the city with viewport grid cells so the sweep is not
    // limited to eight hand-written sectors.
    const grid = buildCityGridZones(cityName, category, [], { cappedRadiusKm: 6 });
    // No coverage cap: the named sectors and the whole viewport grid are returned.
    return [...sectorZones, ...grid];
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
      radiusKm: 1.6,
      precisionLevel: 'mandal_village',
      isVectorQuery: true,
      isSingle: false
    });

    // B. Contiguous Neighboring Villages in the same mandal (within 5-8km)
    const siblings = Array.isArray(villageEntry.siblings) ? villageEntry.siblings : [];
    const chosenSiblings = siblings.slice(0, 4);
    chosenSiblings.forEach((sibling, sIdx) => {
      let sCoords = zoneCoordinates(sibling, mName, sIdx + 1, chosenSiblings.length + 1);
      if ((!sCoords || !sCoords.lat) && centerCoords?.lat && centerCoords?.lng) {
        const angle = (sIdx + 1) * 2.3999632;
        const r = 0.0075 * Math.sqrt(sIdx + 1);
        sCoords = {
          lat: Number((centerCoords.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: `${sibling} (Nearby)`,
        queryText: `${prefix}${sibling}, ${mName}`,
        district: dName,
        state: sName,
        lat: sCoords?.lat || null,
        lng: sCoords?.lng || null,
        radiusKm: 1.6,
        precisionLevel: 'mandal_village',
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
      radiusKm: 2.2,
      precisionLevel: 'mandal_hub',
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
      radiusKm: 2.2,
      precisionLevel: 'mandal_hub',
      scope: 'mandal',
      isVectorQuery: true,
      isSingle: false
    });

    // Every constituent village of the mandal, not a sample. A sub-district with
    // 140 villages used to stop at 12 (client) or 100 (Master); the tail was
    // silently unsearched.
    const villages = Array.isArray(entry.villages) ? entry.villages : [];
    const selectedVillages = villages;
    selectedVillages.forEach((village, idx) => {
      let vCoords = zoneCoordinates(village, townName, idx + 1, selectedVillages.length + 1);
      if (
        (!vCoords || !vCoords.lat || (centerCoords && Math.abs(vCoords.lat - centerCoords.lat) < 0.0002 && Math.abs(vCoords.lng - centerCoords.lng) < 0.0002))
        && centerCoords?.lat && centerCoords?.lng
      ) {
        const angle = (idx + 1) * 2.3999632;
        const r = 0.0075 * Math.sqrt(idx + 1);
        vCoords = {
          lat: Number((centerCoords.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: village,
        queryText: `${prefix}${village}, ${townName}`,
        district: entry.district,
        state: entry.state,
        lat: vCoords?.lat || null,
        lng: vCoords?.lng || null,
        radiusKm: 1.8,
        precisionLevel: 'mandal_village',
        scope: 'mandal',
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
      // Every sub-district in the district, not the first 120.
      const selected = entry.mandals;
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
          scope: 'district',
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
      const stateDistricts = entry.districts;
      const zones = [];
      const center = STATE_CENTERS[entry.state.toLowerCase()] || STATE_CENTERS[strippedName] || null;
      
      // Every district, and every sub-district inside it. The old loop stopped
      // at 200 zones and kept only 3 mandals per district, so a state sweep
      // covered a fraction of the state it was asked for.
      for (let di = 0; di < stateDistricts.length; di++) {
        const d = stateDistricts[di];
        const prefix = category ? `${category} in ` : '';
        const distCoords = zoneCoordinates(d, d, di, stateDistricts.length)
          || (center ? spreadCoords(center, di, stateDistricts.length, center.radius) : null);
        
        // District HQ City Zone
        zones.push({
          zoneName: d,
          queryText: `${prefix}${d}, ${entry.state}`,
          district: d,
          state: entry.state,
          lat: distCoords?.lat || null,
          lng: distCoords?.lng || null,
          isApproximate: Boolean(distCoords?.isApproximate),
          scope: 'state',
          isVectorQuery: true,
          isSingle: false
        });

        // Every commercial mandal of the district.
        const cleanD = d.toLowerCase().replace(/[^a-z0-9]/g, '');
        const distEntry = districtIndex.get(cleanD);
        if (distEntry && Array.isArray(distEntry.mandals)) {
          const subMandals = distEntry.mandals
            .filter(m => m.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanD);
          for (let mi = 0; mi < subMandals.length; mi++) {
            const sm = subMandals[mi];
            const mCoords = zoneCoordinates(sm, d, mi, subMandals.length);
            zones.push({
              zoneName: sm,
              queryText: `${prefix}${sm}, ${d}`,
              district: d,
              state: entry.state,
              lat: mCoords?.lat || null,
              lng: mCoords?.lng || null,
              isApproximate: Boolean(mCoords?.isApproximate),
              scope: 'state',
              isVectorQuery: true,
              isSingle: false
            });
          }
        }
      }
      return zones;
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

  const sectorZones = citySectors.map((sector, idx) => {
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
      radiusKm: 2.0,
      engines: ['local_finder', 'maps'],
      coverageKind: 'locality',
      precisionLevel: 'city_ward',
      isVectorQuery: true,
      isSingle: false
    };
  });

  // Any city not in the curated clusters still gets the full treatment:
  // named sectors + real sub-category vectors + a grid that covers the city
  // and its 5 km ring. No cap: every planned zone is returned.
  const subVectors = buildCategorySubVectorZones(category, cityName);
  const grid = buildCityGridZones(cityName, category, [], { cappedRadiusKm: 6 });
  const mustKeep = [...sectorZones, ...subVectors];
  return [...mustKeep, ...grid];
}

function classifyLocation(queryOrLoc) {
  if (!queryOrLoc || typeof queryOrLoc !== 'string') {
    return { type: 'unknown', name: '', zoneCount: 1, estimatedLeads: 50, badge: '📍 LOCAL', label: 'Local search' };
  }

  let text = queryOrLoc.trim();
  const prepMatch = text.match(/\s+(in|near|around|at|across|within)\s+(.+)$/i);
  let locCandidate = prepMatch ? prepMatch[2].trim() : text;
  locCandidate = locCandidate.replace(/^(the|a|an)\s+/i, '').replace(/[?,.!]+$/, '').trim();

  const explicitDistrict = /\b(district|dist|zilla|zila|jilla)\b/i.test(locCandidate);
  const explicitState = /\b(state|pradesh|territory)\b/i.test(locCandidate);
  const explicitMandal = /\b(mandal|mandals|tehsil|tehsils|taluk|taluks|taluka|talukas|tahsil|block|subdivision)\b/i.test(locCandidate);
  const explicitMunicipality = /\b(municipality|municipal|corporation|council|ulb|gmc|vmc|ghmc|bbmp|mcgm|pcmc)\b/i.test(locCandidate);
  const explicitCity = /\b(city|town|urban|corporation|municipality)\b/i.test(locCandidate);
  const stripped = locCandidate.replace(/\b(district|dist|mandal|mandals|tehsil|tahsil|taluk|taluka|state|city|town|metro|municipality|municipal|corporation|council|ulb|gmc|vmc|ghmc|bbmp|mcgm|pcmc)\b/gi, '').trim();

  const rawCandidates = [
    locCandidate,
    stripped,
    locCandidate.split(',')[0].trim(),
    stripped.split(',')[0].trim(),
    locCandidate.split(',').pop().trim()
  ].filter(Boolean);

  const MUNICIPAL_ACRONYMS = {
    'gmc': 'guntur',
    'vmc': 'vijayawada',
    'ghmc': 'hyderabad',
    'bbmp': 'bangalore',
    'mcgm': 'mumbai',
    'pmc': 'pune',
    'pcmc': 'pimpri chinchwad'
  };

  const initialClean = [...new Set(rawCandidates.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')))];
  const cleanCandidates = [...new Set([
    ...initialClean,
    ...initialClean.map(c => MUNICIPAL_ACRONYMS[c]).filter(Boolean)
  ])];

  // 1. Check state
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

  // 2. Check explicit district
  if (explicitDistrict) {
    for (const c of cleanCandidates) {
      if (districtIndex.has(c)) {
        const distObj = districtIndex.get(c);
        const count = distObj.mandals ? distObj.mandals.length : 25;
        return {
          type: 'district',
          name: distObj.district,
          state: distObj.state,
          zoneCount: count,
          estimatedLeads: count * 45,
          badge: '🗺️ DISTRICT-WIDE',
          label: `District sweep: ${distObj.district} (${count} mandals)`
        };
      }
    }
  }

  // 3. Check explicit mandal OR explicit municipality / corporation
  if (explicitMandal || explicitMunicipality) {
    for (const c of cleanCandidates) {
      if (mandalIndex.has(c) || AUTHORITATIVE_CLUSTERS[c]) {
        const mObj = mandalIndex.get(c) || {};
        const subName = mObj.subDistrict || (c.charAt(0).toUpperCase() + c.slice(1));
        const vCount = Array.isArray(mObj.villages) ? mObj.villages.length : 11;
        const isDual = Boolean(AUTHORITATIVE_CLUSTERS[c] || AUTHORITATIVE_CLUSTERS[keyOf(subName)]);
        const totalZ = isDual ? (AUTHORITATIVE_CLUSTERS[c]?.length || 24) + vCount + 86 : Math.max(8, vCount + 1);
        const badgeLabel = isDual
          ? (explicitMunicipality ? '🏛️ MUNICIPAL CORPORATION & DUAL-MANDAL SWARM' : '📍 DUAL-STATUS MANDAL & MUNICIPALITY')
          : (explicitMunicipality ? '🏛️ MUNICIPALITY SWARM' : '📍 MANDAL SWARM');
        return {
          type: 'mandal',
          name: subName,
          district: mObj.district || subName,
          state: mObj.state || 'Andhra Pradesh',
          zoneCount: totalZ,
          estimatedLeads: totalZ * 30,
          badge: badgeLabel,
          label: isDual
            ? `${subName} Municipal Corporation & Mandal Swarm: ${totalZ} zones (Urban Wards + Villages + GPS Grid)`
            : `${subName} ${explicitMunicipality ? 'Municipality' : 'Mandal'} sweep (${vCount} zones)`
        };
      }
    }
  }

  // 4. Check metro / city cluster (when not explicitly requested as district or mandal)
  if (!explicitDistrict && !explicitMandal) {
    for (const c of cleanCandidates) {
      if (AUTHORITATIVE_CLUSTERS[c]) {
        const zones = AUTHORITATIVE_CLUSTERS[c];
        const cityTitle = c.charAt(0).toUpperCase() + c.slice(1);
        const coverage = buildCityCoverage(cityTitle, '', zones, cityTitle, 250);
        return {
          type: 'metro',
          name: cityTitle,
          zoneCount: coverage.length,
          estimatedLeads: coverage.length * 28,
          badge: '🏙️ METRO/CITY',
          label: `Whole-city sweep: ${coverage.length} zones`
        };
      }
    }
  }

  // 5. Check district headquarters / major cities (e.g. Nellore, Nalgonda, Kurnool, Solapur, Bareilly)
  if (!explicitDistrict && !explicitMandal) {
    for (const c of cleanCandidates) {
      if (districtIndex.has(c)) {
        const distObj = districtIndex.get(c);
        return {
          type: 'city',
          name: distObj.district,
          state: distObj.state,
          zoneCount: 8 + buildCityGridZones(distObj.district, '', [], { cappedRadiusKm: 6 }).length,
          estimatedLeads: 240,
          badge: '🏙️ CITY/TOWN',
          label: `Whole-city sweep: ${distObj.district}`
        };
      }
    }
  }

  // 6. Check generic mandal match
  for (const c of cleanCandidates) {
    if (mandalIndex.has(c)) {
      const mObj = mandalIndex.get(c);
      const vCount = Array.isArray(mObj.villages) ? mObj.villages.length : 0;
      const isDual = Boolean(AUTHORITATIVE_CLUSTERS[c] || AUTHORITATIVE_CLUSTERS[keyOf(mObj.subDistrict)]);
      const totalZ = isDual ? (AUTHORITATIVE_CLUSTERS[c]?.length || 24) + vCount + 80 : Math.max(8, vCount + 1);
      return {
        type: 'mandal',
        name: mObj.subDistrict,
        district: mObj.district,
        state: mObj.state,
        zoneCount: totalZ,
        estimatedLeads: totalZ * 30,
        badge: isDual ? '📍 DUAL-STATUS MANDAL' : '📍 MANDAL SWARM',
        label: `Mandal sweep: ${mObj.subDistrict} (${mObj.district})`
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

  return {
    type: 'city',
    name: locCandidate,
    zoneCount: 8 + buildCityGridZones(locCandidate, '', [], { cappedRadiusKm: 6 }).length,
    estimatedLeads: 240,
    badge: '🏙️ CITY/TOWN',
    label: `Whole-city sweep: ${locCandidate}`
  };
}

module.exports = {
  resolveUniversalZones,
  buildCityGridZones,
  buildCityCoverage,
  buildCategorySubVectorZones,
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
  stateIndex,
  MANDAL_TYPOLOGY,
  getMandalTypology
};
