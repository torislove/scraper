const fs = require('fs');
const path = require('path');
const { geocodeLocation } = require('./olaMaps');

// Known high-precision coordinates for primary regional hubs and major cities
const KNOWN_COORDS = {
  // Telangana
  'nalgonda': { lat: 17.0504, lng: 79.2669, district: 'Nalgonda', mandal: 'Nalgonda', state: 'Telangana', isDual: true },
  'hyderabad': { lat: 17.3850, lng: 78.4867, district: 'Hyderabad', mandal: 'Hyderabad', state: 'Telangana', isDual: true },
  'secunderabad': { lat: 17.4399, lng: 78.4983, district: 'Hyderabad', mandal: 'Secunderabad', state: 'Telangana', isDual: false },
  'warangal': { lat: 17.9689, lng: 79.5941, district: 'Warangal', mandal: 'Warangal', state: 'Telangana', isDual: true },
  'khammam': { lat: 17.2473, lng: 80.1514, district: 'Khammam', mandal: 'Khammam', state: 'Telangana', isDual: true },
  'karimnagar': { lat: 18.4386, lng: 79.1288, district: 'Karimnagar', mandal: 'Karimnagar', state: 'Telangana', isDual: true },
  'nizamabad': { lat: 18.6725, lng: 78.0941, district: 'Nizamabad', mandal: 'Nizamabad', state: 'Telangana', isDual: true },
  'suryapet': { lat: 17.1439, lng: 79.6239, district: 'Suryapet', mandal: 'Suryapet', state: 'Telangana', isDual: true },
  'miryalaguda': { lat: 16.8741, lng: 79.5638, district: 'Nalgonda', mandal: 'Miryalaguda', state: 'Telangana', isDual: false },
  'devarakonda': { lat: 16.6974, lng: 78.9242, district: 'Nalgonda', mandal: 'Devarakonda', state: 'Telangana', isDual: false },
  'nakrekal': { lat: 17.1656, lng: 79.4287, district: 'Nalgonda', mandal: 'Nakrekal', state: 'Telangana', isDual: false },
  'narketpally': { lat: 17.1958, lng: 79.1972, district: 'Nalgonda', mandal: 'Narketpally', state: 'Telangana', isDual: false },
  'chityal': { lat: 17.2343, lng: 79.1245, district: 'Nalgonda', mandal: 'Chityal', state: 'Telangana', isDual: false },
  'munugode': { lat: 17.0658, lng: 79.0345, district: 'Nalgonda', mandal: 'Munugode', state: 'Telangana', isDual: false },
  'chandur': { lat: 17.0035, lng: 78.9868, district: 'Nalgonda', mandal: 'Chandur', state: 'Telangana', isDual: false },
  'haliya': { lat: 16.7428, lng: 79.3248, district: 'Nalgonda', mandal: 'Anumula (Haliya)', state: 'Telangana', isDual: false },
  
  // Andhra Pradesh (Post-2022 Districts & Hubs)
  'guntur': { lat: 16.3067, lng: 80.4365, district: 'Guntur', mandal: 'Guntur', state: 'Andhra Pradesh', isDual: true },
  'guntur east': { lat: 16.3067, lng: 80.4480, district: 'Guntur', mandal: 'Guntur East', state: 'Andhra Pradesh', isDual: false },
  'guntur west': { lat: 16.3115, lng: 80.4280, district: 'Guntur', mandal: 'Guntur West', state: 'Andhra Pradesh', isDual: false },
  'medikonduru': { lat: 16.3312, lng: 80.2974, district: 'Guntur', mandal: 'Medikonduru', state: 'Andhra Pradesh', isDual: false },
  'pedanandipadu': { lat: 16.0373, lng: 80.3015, district: 'Guntur', mandal: 'Pedanandipadu', state: 'Andhra Pradesh', isDual: false },
  'phirangipuram': { lat: 16.3023, lng: 80.2608, district: 'Guntur', mandal: 'Phirangipuram', state: 'Andhra Pradesh', isDual: false },
  'prathipadu': { lat: 16.1772, lng: 80.3725, district: 'Guntur', mandal: 'Prathipadu', state: 'Andhra Pradesh', isDual: false },
  'tadikonda': { lat: 16.4258, lng: 80.4486, district: 'Guntur', mandal: 'Tadikonda', state: 'Andhra Pradesh', isDual: false },
  'thullur': { lat: 16.5369, lng: 80.4722, district: 'Guntur', mandal: 'Thullur', state: 'Andhra Pradesh', isDual: false },
  'tullur': { lat: 16.5369, lng: 80.4722, district: 'Guntur', mandal: 'Thullur', state: 'Andhra Pradesh', isDual: false },
  'vatticherukuru': { lat: 16.1950, lng: 80.4410, district: 'Guntur', mandal: 'Vatticherukuru', state: 'Andhra Pradesh', isDual: false },
  'chebrolu': { lat: 16.2008, lng: 80.5312, district: 'Guntur', mandal: 'Chebrolu', state: 'Andhra Pradesh', isDual: false },
  'duggirala': { lat: 16.3262, lng: 80.6272, district: 'Guntur', mandal: 'Duggirala', state: 'Andhra Pradesh', isDual: false },
  'kakumanu': { lat: 16.0380, lng: 80.4040, district: 'Guntur', mandal: 'Kakumanu', state: 'Andhra Pradesh', isDual: false },
  'kollipara': { lat: 16.2862, lng: 80.7228, district: 'Guntur', mandal: 'Kollipara', state: 'Andhra Pradesh', isDual: false },
  'mangalagiri': { lat: 16.4326, lng: 80.5645, district: 'Guntur', mandal: 'Mangalagiri', state: 'Andhra Pradesh', isDual: false },
  'ponnur': { lat: 16.0682, lng: 80.5542, district: 'Guntur', mandal: 'Ponnur', state: 'Andhra Pradesh', isDual: false },
  'tadepalle': { lat: 16.4789, lng: 80.6014, district: 'Guntur', mandal: 'Tadepalle', state: 'Andhra Pradesh', isDual: false },
  'tenali': { lat: 16.2435, lng: 80.6400, district: 'Guntur', mandal: 'Tenali', state: 'Andhra Pradesh', isDual: false },
  'pedakakani': { lat: 16.3458, lng: 80.4952, district: 'Guntur', mandal: 'Pedakakani', state: 'Andhra Pradesh', isDual: false },
  'vijayawada': { lat: 16.5062, lng: 80.6480, district: 'NTR', mandal: 'Vijayawada', state: 'Andhra Pradesh', isDual: true },
  'chirala': { lat: 15.8281, lng: 80.3524, district: 'Bapatla', mandal: 'Chirala', state: 'Andhra Pradesh', isDual: false },
  'bapatla': { lat: 15.9042, lng: 80.4674, district: 'Bapatla', mandal: 'Bapatla', state: 'Andhra Pradesh', isDual: true },
  'narasaraopet': { lat: 16.2359, lng: 80.0499, district: 'Palnadu', mandal: 'Narasaraopet', state: 'Andhra Pradesh', isDual: true },
  'chilakaluripet': { lat: 16.0892, lng: 80.1670, district: 'Palnadu', mandal: 'Chilakaluripet', state: 'Andhra Pradesh', isDual: false },
  'macherla': { lat: 16.4800, lng: 79.4300, district: 'Palnadu', mandal: 'Macherla', state: 'Andhra Pradesh', isDual: false },
  'piduguralla': { lat: 16.4820, lng: 79.8880, district: 'Palnadu', mandal: 'Piduguralla', state: 'Andhra Pradesh', isDual: false },
  'sattenapalle': { lat: 16.3961, lng: 80.1793, district: 'Palnadu', mandal: 'Sattenapalle', state: 'Andhra Pradesh', isDual: false },
  'vinukonda': { lat: 16.0520, lng: 79.7420, district: 'Palnadu', mandal: 'Vinukonda', state: 'Andhra Pradesh', isDual: false },
  'ongole': { lat: 15.5057, lng: 80.0499, district: 'Prakasam', mandal: 'Ongole', state: 'Andhra Pradesh', isDual: true },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, district: 'Visakhapatnam', mandal: 'Visakhapatnam', state: 'Andhra Pradesh', isDual: true },
  'tirupati': { lat: 13.6288, lng: 79.4192, district: 'Tirupati', mandal: 'Tirupati', state: 'Andhra Pradesh', isDual: true },
  'kurnool': { lat: 15.8281, lng: 78.0373, district: 'Kurnool', mandal: 'Kurnool', state: 'Andhra Pradesh', isDual: true },
  'nellore': { lat: 14.4426, lng: 79.9865, district: 'Sri Potti Sriramulu Nellore', mandal: 'Nellore', state: 'Andhra Pradesh', isDual: true },
  'rajahmundry': { lat: 17.0005, lng: 81.8040, district: 'East Godavari', mandal: 'Rajahmundry', state: 'Andhra Pradesh', isDual: true },
  'kakinada': { lat: 16.9891, lng: 82.2475, district: 'Kakinada', mandal: 'Kakinada', state: 'Andhra Pradesh', isDual: true },
  'eluru': { lat: 16.7107, lng: 81.0952, district: 'Eluru', mandal: 'Eluru', state: 'Andhra Pradesh', isDual: true },

  // Key Pan-India Metros and Cities
  'bengaluru': { lat: 12.9716, lng: 77.5946, district: 'Bengaluru', mandal: 'Bengaluru Urban', state: 'Karnataka', isDual: true },
  'bangalore': { lat: 12.9716, lng: 77.5946, district: 'Bengaluru', mandal: 'Bengaluru Urban', state: 'Karnataka', isDual: true },
  'chennai': { lat: 13.0827, lng: 80.2707, district: 'Chennai', mandal: 'Chennai', state: 'Tamil Nadu', isDual: true },
  'mumbai': { lat: 19.0760, lng: 72.8777, district: 'Mumbai', mandal: 'Mumbai City', state: 'Maharashtra', isDual: true },
  'pune': { lat: 18.5204, lng: 73.8567, district: 'Pune', mandal: 'Pune City', state: 'Maharashtra', isDual: true },
  'pune city': { lat: 18.5204, lng: 73.8567, district: 'Pune', mandal: 'Pune City', state: 'Maharashtra', isDual: true },
  'punecity': { lat: 18.5204, lng: 73.8567, district: 'Pune', mandal: 'Pune City', state: 'Maharashtra', isDual: true },
  'poona': { lat: 18.5204, lng: 73.8567, district: 'Pune', mandal: 'Pune City', state: 'Maharashtra', isDual: true },
  'delhi': { lat: 28.6139, lng: 77.2090, district: 'New Delhi', mandal: 'New Delhi', state: 'Delhi', isDual: true },
  'new delhi': { lat: 28.6139, lng: 77.2090, district: 'New Delhi', mandal: 'New Delhi', state: 'Delhi', isDual: true },
  'jaipur': { lat: 26.9124, lng: 75.7873, district: 'Jaipur', mandal: 'Jaipur', state: 'Rajasthan', isDual: true },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, district: 'Ahmedabad', mandal: 'Ahmedabad', state: 'Gujarat', isDual: true },
  'surat': { lat: 21.1702, lng: 72.8311, district: 'Surat', mandal: 'Surat', state: 'Gujarat', isDual: true },
  'lucknow': { lat: 26.8467, lng: 80.9462, district: 'Lucknow', mandal: 'Lucknow', state: 'Uttar Pradesh', isDual: true },
  'kanpur': { lat: 26.4499, lng: 80.3319, district: 'Kanpur Nagar', mandal: 'Kanpur', state: 'Uttar Pradesh', isDual: true },
  'varanasi': { lat: 25.3176, lng: 82.9739, district: 'Varanasi', mandal: 'Varanasi', state: 'Uttar Pradesh', isDual: true },
  'kochi': { lat: 9.9312, lng: 76.2673, district: 'Ernakulam', mandal: 'Kochi', state: 'Kerala', isDual: true },
  'indore': { lat: 22.7196, lng: 75.8577, district: 'Indore', mandal: 'Indore', state: 'Madhya Pradesh', isDual: true },
  'bhopal': { lat: 23.2599, lng: 77.4126, district: 'Bhopal', mandal: 'Bhopal', state: 'Madhya Pradesh', isDual: true },
  'nagpur': { lat: 21.1458, lng: 79.0882, district: 'Nagpur', mandal: 'Nagpur', state: 'Maharashtra', isDual: true },
  'kolkata': { lat: 22.5726, lng: 88.3639, district: 'Kolkata', mandal: 'Kolkata', state: 'West Bengal', isDual: true },
  'chandigarh': { lat: 30.7333, lng: 76.7794, district: 'Chandigarh', mandal: 'Chandigarh', state: 'Chandigarh', isDual: true },
  'coimbatore': { lat: 11.0168, lng: 76.9558, district: 'Coimbatore', mandal: 'Coimbatore', state: 'Tamil Nadu', isDual: true }
};

// Authoritative Mandals for Primary Target Districts
const AUTHORITATIVE_DISTRICT_MANDALS = {
  'nalgonda': [
    'Nalgonda', 'Miryalaguda', 'Devarakonda', 'Nakrekal', 'Narketpally', 'Chityal',
    'Anumula (Haliya)', 'Munugode', 'Chandur', 'Thipparthy', 'Kethepally', 'Kangal',
    'Kattangur', 'Shaligouraram', 'Vemulapally', 'Tripuraram', 'Madugulapally',
    'Nidamanoor', 'Peddavoora', 'Gurrampode', 'Marriguda', 'Nampally', 'Chinthapally',
    'Gundlapally (Dindi)', 'Chandampet', 'Adavidevulapally', 'Damaracherla', 'Nereducherla',
    'Kondamallepally', 'Tirumalagiri Sagar', 'Ghattuppal'
  ],
  'guntur': [
    'Guntur East', 'Guntur West', 'Chebrolu', 'Tenali', 'Mangalagiri', 'Tadepalle',
    'Pedakakani', 'Medikonduru', 'Vatticherukuru', 'Prathipadu', 'Duggirala',
    'Kollipara', 'Ponnur', 'Kakumanu', 'Tadikonda', 'Thullur', 'Phirangipuram', 'Pedanandipadu'
  ],
  'bapatla': [
    'Chirala', 'Bapatla', 'Vetapalem', 'Karamchedu', 'Inkollu', 'Chinaganjam',
    'Parchur', 'Yeddanapudi', 'Martur', 'Santhamaguluru', 'Ballikurava', 'Korisapadu',
    'Panguluru', 'Addanki', 'Jangamaheswarapuram', 'Repalle', 'Nizampatnam', 'Nagaram',
    'Cherukupalle', 'Bhattiprolu', 'Tsundur', 'Amruthalur', 'Karlapalem', 'Pittalavanipalem'
  ],
  'ntr': [
    'Vijayawada Urban', 'Vijayawada Rural', 'Jaggayyapeta', 'Nandigama', 'Tiruvuru',
    'Mylavaram', 'G.Konduru', 'Ibrahimpatnam', 'Penamaluru', 'Kanchikacherla',
    'Chandarlapadu', 'Veerullapadu', 'Vatsavai', 'Reddigudem', 'A.Konduru', 'Gampalagudem', 'Vissannapeta'
  ],
  'palnadu': [
    'Chilakaluripet', 'Narasaraopet', 'Sattenapalle', 'Piduguralla', 'Vinukonda',
    'Macherla', 'Gurazala', 'Dachepalle', 'Rentachintala', 'Karempudi', 'Nadendla',
    'Edlapadu', 'Rompicherla', 'Ipur', 'Savalyapuram', 'Bollapalle', 'Nekarikallu',
    'Mupla', 'Atchampet', 'Krosuru', 'Amaravathi', 'Bellamkonda', 'Rajupalem', 'Pedakurapadu'
  ]
};

class IndiaGeoIndex {
  constructor() {
    this.isLoaded = false;
    this.districtsMap = new Map();
    this.subDistrictsMap = new Map();
    this.statesMap = new Map();
    this.stats = { states: 0, districts: 0, subDistricts: 0, villages: 0 };
    this.villageRows = null;
    this.villageIndexBuildMs = 0;
    this.villageIndexBuiltAt = null;
  }

  load() {
    if (this.isLoaded) return;
    try {
      const dbPath = path.join(__dirname, '../../db/india_villages.json');
      if (fs.existsSync(dbPath)) {
        console.log('[IndiaGeoIndex] Indexing server/db/india_villages.json...');
        const rawData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        this.stats.states = rawData.length;

        for (const stateObj of rawData) {
          const stateName = stateObj.state;
          const stateKey = stateName.toLowerCase().trim();
          this.statesMap.set(stateKey, { state: stateName, districts: [] });

          if (!stateObj.districts) continue;

          for (const distObj of stateObj.districts) {
            const distName = distObj.district;
            if (!distName) continue;
            const distKey = distName.toLowerCase().trim();
            this.stats.districts++;

            this.statesMap.get(stateKey).districts.push(distName);

            const subDistNames = [];
            if (distObj.subDistricts) {
              for (const sub of distObj.subDistricts) {
                const subName = sub.subDistrict;
                if (!subName) continue;
                subDistNames.push(subName);
                this.stats.subDistricts++;

                const subKey = subName.toLowerCase().trim();
                if (!this.subDistrictsMap.has(subKey)) {
                  this.subDistrictsMap.set(subKey, []);
                }
                this.subDistrictsMap.get(subKey).push({
                  subDistrict: subName,
                  district: distName,
                  state: stateName
                });

                if (Array.isArray(sub.villages)) {
                  this.stats.villages += sub.villages.filter(Boolean).length;
                }
              }
            }

            this.districtsMap.set(distKey, {
              district: distName,
              state: stateName,
              subDistricts: subDistNames
            });
          }
        }

        // Authoritative Post-2022 Andhra Pradesh Reorganization Overrides
        this.districtsMap.set('guntur', {
          district: 'Guntur',
          state: 'Andhra Pradesh',
          subDistricts: AUTHORITATIVE_DISTRICT_MANDALS['guntur']
        });
        this.districtsMap.set('palnadu', {
          district: 'Palnadu',
          state: 'Andhra Pradesh',
          subDistricts: AUTHORITATIVE_DISTRICT_MANDALS['palnadu']
        });
        this.districtsMap.set('bapatla', {
          district: 'Bapatla',
          state: 'Andhra Pradesh',
          subDistricts: AUTHORITATIVE_DISTRICT_MANDALS['bapatla']
        });
        this.districtsMap.set('ntr', {
          district: 'NTR',
          state: 'Andhra Pradesh',
          subDistricts: AUTHORITATIVE_DISTRICT_MANDALS['ntr']
        });

        this.isLoaded = true;
        console.log(`[IndiaGeoIndex] Indexed ${this.stats.states} states, ${this.stats.districts} districts, ${this.stats.subDistricts} mandals/tehsils, ${this.stats.villages} villages.`);
      }
    } catch (e) {
      console.error('[IndiaGeoIndex] Failed to index india_villages.json:', e.message);
    }
  }

  _norm(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Build a sorted, compact village index on first use.
   * 619k villages are stored as delimited strings (~60 MB) instead of objects,
   * which keeps the server light while making prefix search O(log n + k).
   */
  _buildVillageIndex() {
    if (this.villageRows) return;
    const started = Date.now();
    if (!this.isLoaded) this.load();

    const rows = [];
    const dbPath = path.join(__dirname, '../../db/india_villages.json');
    if (!fs.existsSync(dbPath)) {
      this.villageRows = rows;
      return;
    }

    try {
      const rawData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      for (const stateObj of rawData) {
        const stateName = stateObj.state;
        for (const distObj of (stateObj.districts || [])) {
          const distName = distObj.district;
          for (const sub of (distObj.subDistricts || [])) {
            const subName = sub.subDistrict;
            for (const village of (sub.villages || [])) {
              const name = String(village || '').trim();
              if (!name) continue;
              rows.push(`${name.toLowerCase()}\u0001${name}\u0001${subName}\u0001${distName}\u0001${stateName}`);
            }
          }
        }
      }
      rows.sort();
      this.villageRows = rows;
      this.villageIndexBuiltAt = new Date().toISOString();
      this.villageIndexBuildMs = Date.now() - started;
      console.log(`[IndiaGeoIndex] Village prefix index built: ${rows.length} villages in ${this.villageIndexBuildMs}ms.`);
    } catch (e) {
      console.error('[IndiaGeoIndex] Village index failed:', e.message);
      this.villageRows = [];
    }
  }

  _searchVillages(prefix, limit = 8) {
    this._buildVillageIndex();
    const rows = this.villageRows || [];
    const q = this._norm(prefix);
    if (!q || rows.length === 0) return [];

    let lo = 0;
    let hi = rows.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid] < q) lo = mid + 1;
      else hi = mid;
    }

    const out = [];
    const seen = new Set();
    for (let i = lo; i < rows.length && out.length < limit; i++) {
      const row = rows[i];
      if (!row.startsWith(q)) break;
      const parts = row.split('\u0001');
      const name = parts[1];
      const subDistrict = parts[2];
      const district = parts[3];
      const state = parts[4];
      const dedupeKey = `${name}|${subDistrict}|${district}|${state}`.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const display = this._norm(name) === this._norm(subDistrict)
        ? `${name}, ${district}, ${state}`
        : `${name}, ${subDistrict}, ${district}, ${state}`;
      out.push({
        name,
        type: 'village',
        subDistrict,
        district,
        state,
        village: name,
        display,
        source: 'india_villages'
      });
    }
    return out;
  }

  /**
   * Instant, network-free location autocomplete across states, districts,
   * mandals/tehsils and all 619k Indian villages.
   * In Master mode (isMaster: true), Districts, States and Mandals are given priority
   * so operators can deploy multi-zone territorial swarms in 1 click.
   */
  searchLocations(query, limit = 10, isMaster = false) {
    if (!this.isLoaded) this.load();
    const q = this._norm(query);
    if (!q) return [];

    const qParts = q.split(',');
    const primaryQ = qParts[0].trim();
    const qualifierQ = qParts.slice(1).join(' ').trim();

    const max = Math.max(1, Math.min(25, Number(limit) || 10));
    const seen = new Set();
    const results = [];

    const add = (item, score) => {
      const key = `${item.type}|${this._norm(item.name)}|${this._norm(item.district)}|${this._norm(item.state)}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ ...item, _score: score });
    };

    const matches = (value, weight, itemDistrict = '', itemState = '') => {
      const v = this._norm(value);
      if (!v) return 0;
      let score = 0;
      if (v === q || v === primaryQ) score = weight + 60;
      else if (v.startsWith(q) || v.startsWith(primaryQ)) score = weight + 30 - Math.min(20, Math.abs(v.length - (primaryQ || q).length));
      else if ((q.length >= 3 && v.includes(q)) || (primaryQ.length >= 3 && v.includes(primaryQ))) score = weight;
      
      if (score > 0 && qualifierQ) {
        const dNorm = this._norm(itemDistrict);
        const sNorm = this._norm(itemState);
        if ((dNorm && (dNorm.includes(qualifierQ) || qualifierQ.includes(dNorm))) ||
            (sNorm && (sNorm.includes(qualifierQ) || qualifierQ.includes(sNorm)))) {
          score += 120;
        }
      }
      return score;
    };

    // Districts (Top priority in Master mode for 1-click District Sweeps)
    const districtBaseWeight = isMaster ? 220 : 100;
    for (const [key, dist] of this.districtsMap.entries()) {
      const score = matches(key, districtBaseWeight, dist.district, dist.state);
      if (!score) continue;
      add({
        name: `${dist.district} District`,
        type: 'district',
        district: dist.district,
        state: dist.state,
        detail: 'District',
        scope: 'district',
        display: `${dist.district} District, ${dist.state}`,
        source: 'india_villages'
      }, score);
    }

    // States (Top priority in Master mode for State Swarms)
    const stateBaseWeight = isMaster ? 210 : 80;
    for (const [key, stateObj] of this.statesMap.entries()) {
      const score = matches(key, stateBaseWeight, '', stateObj.state);
      if (!score) continue;
      add({
        name: stateObj.state,
        type: 'state',
        state: stateObj.state,
        detail: 'State',
        scope: 'state',
        display: `${stateObj.state} (State)`,
        source: 'india_villages'
      }, score);
    }

    // Known cities with precise coordinates
    const cityBaseWeight = isMaster ? 180 : 190;
    for (const [key, known] of Object.entries(KNOWN_COORDS)) {
      const score = matches(key, cityBaseWeight, known.district, known.state);
      if (!score) continue;
      add({
        name: known.mandal === known.district ? known.district : known.mandal,
        type: known.isDual ? 'city' : 'town',
        mandal: known.mandal,
        subDistrict: known.mandal,
        district: known.district,
        state: known.state,
        detail: known.isDual ? 'City' : 'Town',
        scope: 'city',
        lat: known.lat,
        lng: known.lng,
        display: `${known.mandal === known.district ? known.district : `${known.mandal}, ${known.district}`}, ${known.state}`,
        source: 'authoritative_coords'
      }, score + 5);
    }

    // Mandals / tehsils / sub-districts
    const mandalBaseWeight = isMaster ? 195 : 160;
    for (const [key, list] of this.subDistrictsMap.entries()) {
      const score = matches(key, mandalBaseWeight, list[0]?.district || '', list[0]?.state || '');
      if (!score) continue;
      for (const sub of list.slice(0, 3)) {
        add({
          name: `${sub.subDistrict} Mandal`,
          type: 'subdistrict',
          subDistrict: sub.subDistrict,
          district: sub.district,
          state: sub.state,
          detail: 'Mandal',
          scope: 'mandal',
          display: `${sub.subDistrict} Mandal, ${sub.district}, ${sub.state}`,
          source: 'india_villages'
        }, score);
      }
    }

    // Villages (prefix only, reduced priority in Master so territorial swarms aren't crowded out)
    const villageQuery = primaryQ;
    if (villageQuery.length >= 3) {
      for (const village of this._searchVillages(villageQuery, Math.max(4, max))) {
        const isExact = this._norm(village.name) === villageQuery;
        let nameScore = isMaster
          ? (isExact ? 140 : 90 - village.name.length)
          : (isExact ? 180 : 125 - village.name.length);
        if (qualifierQ) {
          const vD = this._norm(village.district || '');
          const vS = this._norm(village.state || '');
          if ((vD && (vD.includes(qualifierQ) || qualifierQ.includes(vD))) ||
              (vS && (vS.includes(qualifierQ) || qualifierQ.includes(vS)))) {
            nameScore += 100;
          }
        }
        add({
          ...village,
          detail: 'Village',
          scope: 'city'
        }, nameScore);
      }
    }

    results.sort((a, b) => b._score - a._score);
    return results.slice(0, max).map(({ _score, ...item }) => item);
  }

  /**
   * Synchronous hierarchy resolution. Never performs a network call.
   * Used by the run estimator so ETA is instant.
   */
  resolveQuick(locationStr) {
    if (!this.isLoaded) this.load();
    const clean = this._norm(locationStr);
    if (!clean) return null;

    if (KNOWN_COORDS[clean]) {
      const known = KNOWN_COORDS[clean];
      const distKey = known.district.toLowerCase();
      const mandals = AUTHORITATIVE_DISTRICT_MANDALS[distKey] ||
        (this.districtsMap.get(distKey)?.subDistricts) || [known.mandal];
      return {
        query: locationStr,
        name: known.district === known.mandal ? known.district : `${known.mandal}, ${known.district}`,
        city: known.mandal,
        district: known.district,
        state: known.state,
        lat: known.lat,
        lng: known.lng,
        level: known.isDual ? 'dual_district_city' : 'subdistrict',
        totalMandals: mandals.length,
        mandals,
        source: 'authoritative_coords'
      };
    }

    if (this.statesMap.has(clean)) {
      const state = this.statesMap.get(clean);
      return {
        query: locationStr,
        name: state.state,
        city: null,
        district: null,
        state: state.state,
        lat: null,
        lng: null,
        level: 'state',
        totalMandals: state.districts.length,
        mandals: state.districts,
        source: 'india_villages'
      };
    }

    if (this.districtsMap.has(clean)) {
      const dist = this.districtsMap.get(clean);
      const mandals = AUTHORITATIVE_DISTRICT_MANDALS[clean] || dist.subDistricts || [dist.district];
      return {
        query: locationStr,
        name: `${dist.district} District`,
        city: dist.district,
        district: dist.district,
        state: dist.state,
        lat: null,
        lng: null,
        level: 'district',
        totalMandals: mandals.length,
        mandals,
        source: 'india_villages'
      };
    }

    if (this.subDistrictsMap.has(clean)) {
      const primary = this.subDistrictsMap.get(clean)[0];
      const distKey = primary.district.toLowerCase();
      const mandals = AUTHORITATIVE_DISTRICT_MANDALS[distKey] ||
        (this.districtsMap.get(distKey)?.subDistricts) || [primary.subDistrict];
      return {
        query: locationStr,
        name: `${primary.subDistrict}, ${primary.district}`,
        city: primary.subDistrict,
        district: primary.district,
        state: primary.state,
        lat: null,
        lng: null,
        level: 'subdistrict',
        totalMandals: mandals.length,
        mandals,
        source: 'india_villages'
      };
    }

    // Exact village match (first one wins; autocomplete exposes parents)
    if (clean.length >= 2) {
      const villages = this._searchVillages(clean.split(',')[0].trim(), 25);
      const exact = villages.find(v => this._norm(v.name) === clean.split(',')[0].trim());
      if (exact) {
        return {
          query: locationStr,
          name: `${exact.name}, ${exact.subDistrict}`,
          city: exact.name,
          village: exact.name,
          mandal: exact.subDistrict,
          subDistrict: exact.subDistrict,
          district: exact.district,
          state: exact.state,
          lat: null,
          lng: null,
          level: 'village',
          totalMandals: 1,
          mandals: [exact.name],
          source: 'india_villages'
        };
      }
    }

    // Fall back to a high-confidence autocomplete hit (e.g. "Chebrolu, Guntur")
    const best = this.searchLocations(locationStr, 1)[0];
    if (best) {
      return {
        query: locationStr,
        name: best.name,
        city: best.name,
        village: best.village,
        subDistrict: best.subDistrict,
        district: best.district || null,
        state: best.state || null,
        lat: best.lat || null,
        lng: best.lng || null,
        level: best.type,
        totalMandals: 1,
        mandals: [best.name],
        source: 'india_villages'
      };
    }

    return null;
  }

  getStats() {
    return {
      loaded: this.isLoaded,
      states: this.stats.states,
      districts: this.stats.districts,
      subDistricts: this.stats.subDistricts,
      villages: this.stats.villages,
      villageIndexReady: Boolean(this.villageRows),
      villageIndexBuildMs: this.villageIndexBuildMs,
      villageIndexBuiltAt: this.villageIndexBuiltAt
    };
  }

  /**
   * Resolves any location token into a full pan-India hierarchy
   */
  async resolveHierarchy(locationStr) {
    if (!this.isLoaded) this.load();
    if (!locationStr || typeof locationStr !== 'string') return null;

    const clean = locationStr.toLowerCase().trim();

    // 1. Direct match in KNOWN_COORDS (Ultra-fast 0ms cache)
    if (KNOWN_COORDS[clean]) {
      const known = KNOWN_COORDS[clean];
      const distKey = known.district.toLowerCase();
      const mandals = AUTHORITATIVE_DISTRICT_MANDALS[distKey] || 
                      (this.districtsMap.get(distKey)?.subDistricts) || 
                      [known.mandal];

      return {
        query: locationStr,
        name: known.district === known.mandal ? known.district : `${known.mandal}, ${known.district}`,
        city: known.mandal,
        district: known.district,
        state: known.state,
        lat: known.lat,
        lng: known.lng,
        isDualCityAndDistrict: !!known.isDual,
        level: known.isDual ? 'dual_district_city' : 'subdistrict',
        totalMandals: mandals.length,
        mandals: mandals,
        source: 'authoritative_coords'
      };
    }

    // 2. Check Districts Map
    if (this.districtsMap.has(clean)) {
      const dist = this.districtsMap.get(clean);
      const authMandals = AUTHORITATIVE_DISTRICT_MANDALS[clean];
      const mandalList = authMandals || (dist.subDistricts.length > 0 ? dist.subDistricts : [dist.district]);
      
      // Determine coordinates via OSM Nominatim if not cached
      let lat = null;
      let lng = null;
      try {
        const geo = await geocodeLocation(`${dist.district}, ${dist.state}, India`);
        if (geo && geo.lat) {
          lat = geo.lat;
          lng = geo.lng;
        }
      } catch (e) {}

      return {
        query: locationStr,
        name: `${dist.district} District`,
        city: dist.district,
        district: dist.district,
        state: dist.state,
        lat,
        lng,
        isDualCityAndDistrict: true,
        level: 'district',
        totalMandals: mandalList.length,
        mandals: mandalList,
        source: 'india_villages'
      };
    }

    // 3. Check SubDistricts / Mandals Map
    if (this.subDistrictsMap.has(clean)) {
      const matches = this.subDistrictsMap.get(clean);
      const primary = matches[0];
      const distKey = primary.district.toLowerCase();
      const distMandals = AUTHORITATIVE_DISTRICT_MANDALS[distKey] || 
                          (this.districtsMap.get(distKey)?.subDistricts) || 
                          [primary.subDistrict];

      let lat = null;
      let lng = null;
      try {
        const geo = await geocodeLocation(`${primary.subDistrict}, ${primary.district}, ${primary.state}, India`);
        if (geo && geo.lat) {
          lat = geo.lat;
          lng = geo.lng;
        }
      } catch (e) {}

      return {
        query: locationStr,
        name: `${primary.subDistrict}, ${primary.district}`,
        city: primary.subDistrict,
        district: primary.district,
        state: primary.state,
        lat,
        lng,
        isDualCityAndDistrict: false,
        level: 'subdistrict',
        totalMandals: distMandals.length,
        mandals: distMandals,
        source: 'india_villages'
      };
    }

    // 4. Village exact match (India's 619k villages)
    const villageToken = clean.split(',')[0].trim();
    if (villageToken.length >= 2) {
      const matches = this._searchVillages(villageToken, 25)
        .filter(v => this._norm(v.name) === villageToken);

      if (matches.length > 0) {
        const primary = matches[0];
        let lat = null;
        let lng = null;
        try {
          const geo = await geocodeLocation(`${primary.name}, ${primary.subDistrict}, ${primary.district}, ${primary.state}, India`);
          if (geo && geo.lat) {
            lat = geo.lat;
            lng = geo.lng;
          }
        } catch (e) {}

        return {
          query: locationStr,
          name: `${primary.name}, ${primary.subDistrict}`,
          city: primary.name,
          village: primary.name,
          mandal: primary.subDistrict,
          subDistrict: primary.subDistrict,
          district: primary.district,
          state: primary.state,
          lat,
          lng,
          isDualCityAndDistrict: false,
          level: 'village',
          totalMandals: 1,
          mandals: [primary.name],
          source: 'india_villages'
        };
      }
    }

    // 5. OSM Nominatim Real-Time Fallback
    try {
      const geo = await geocodeLocation(`${locationStr}, India`);
      if (geo && geo.lat) {
        return {
          query: locationStr,
          name: geo.formattedLocation || locationStr,
          city: locationStr,
          district: locationStr,
          state: 'India',
          lat: geo.lat,
          lng: geo.lng,
          isDualCityAndDistrict: false,
          level: 'osm_point',
          totalMandals: 1,
          mandals: [locationStr],
          source: 'osm_nominatim'
        };
      }
    } catch (e) {}

    return null;
  }
}

const geoIndexInstance = new IndiaGeoIndex();
module.exports = geoIndexInstance;
