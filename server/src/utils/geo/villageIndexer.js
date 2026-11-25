/**
 * villageIndexer.js
 * In-memory indexing of india_villages.json and hierarchy lookup maps.
 */

const fs = require('fs');
const path = require('path');
const indiaGeoIndex = require('../indiaGeoIndex');

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
        const candidatePaths = [
      path.join(__dirname, '../../../db/india_villages.json'),
      path.join(__dirname, '../../db/india_villages.json'),
      path.join(process.cwd(), 'server/db/india_villages.json'),
      path.join(process.cwd(), 'db/india_villages.json')
    ];
    const dbPath = candidatePaths.find(p => fs.existsSync(p));
    if (dbPath && fs.existsSync(dbPath)) {
      try {
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
      } catch (parseErr) {}
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
      'chebrolu': {
        subDistrict: 'Chebrolu',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Chebrolu', 'Vadlamudi', 'Pathareddypalem', 'Narakoduru', 'Vejendla', 'Sreerangapuram', 'Lemalle', 'Thotapalem', 'Mandepudi', 'Gundavaram']
      },
      'duggirala': {
        subDistrict: 'Duggirala',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Duggirala', 'Emani', 'Chintalapudi', 'Tummapudi', 'Morampudi', 'Pedapalem', 'Peravali', 'Godavarru', 'Kunchavaram', 'Pedakonduru']
      },
      'kakumanu': { subDistrict: 'Kakumanu', district: 'Guntur', state: 'Andhra Pradesh' },
      'kollipara': {
        subDistrict: 'Kollipara',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Kollipara', 'Athota', 'Munnangi', 'Davuluru', 'Vallabhapuram', 'Bommuvanipalem', 'Siripuram', 'Chivaluru', 'Annivaripalem']
      },
      'mangalagiri': {
        subDistrict: 'Mangalagiri',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Mangalagiri Town', 'Nowlur', 'Yerrabalem', 'Bethapudi', 'Kuragallu', 'Nidamarru', 'Atmakuru', 'Chinakakani', 'Kaza']
      },
      'ponnur': {
        subDistrict: 'Ponnur',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Ponnur Town', 'Nidubrolu', 'Mulukuduru', 'Nanduru', 'Brahmanakoduru', 'Vellaluru', 'Kasukarru', 'Doppalapudi']
      },
      'tadepalle': { subDistrict: 'Tadepalle', district: 'Guntur', state: 'Andhra Pradesh' },
      'narasaraopet': {
        subDistrict: 'Narasaraopet',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: ['Narasaraopet Town', 'Prakash Nagar', 'Arundelpet', 'Palnadu Road', 'Jonnalagadda', 'Kesanupalli', 'Kakani', 'Ravipadu', 'Dondapadu', 'Petlurivaripalem']
      },
      'macherla': {
        subDistrict: 'Macherla',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: ['Macherla Town', 'Kambampadu', 'Koppunuru', 'Mutukuru', 'Nagulavaram', 'Pasuvula Bodu', 'Rayavaram', 'Thallapalle']
      },
      'vinukonda': {
        subDistrict: 'Vinukonda',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: ['Vinukonda Town', 'Brahmanapalle', 'Gokanakonda', 'Nayunipalem', 'Sivapuram', 'Surepalle', 'Venkupalem', 'Vittamaraju Palle']
      },
      'chilakaluripet': {
        subDistrict: 'Chilakaluripet',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: [
          'Chilakaluripet Town', 'Ganapavaram', 'Boppudi', 'Pasumarru', 'Purushotha Patnam',
          'Manukondavaripalem', 'Rajupalem', 'Kavuru', 'Veluru', 'Maddirala',
          'Govindapuram', 'Murikipudi', 'Thimmapuram', 'Edlapadu', 'Kotappakonda'
        ]
      },
      'sattenapalle': {
        subDistrict: 'Sattenapalle',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: ['Sattenapalle Town', 'Dhullipalla', 'Gudipudi', 'Kankanalapalli', 'Pakalapadu', 'Panidem', 'Rentapalla', 'Bhatrupalem']
      },
      'piduguralla': {
        subDistrict: 'Piduguralla',
        district: 'Palnadu',
        state: 'Andhra Pradesh',
        villages: ['Piduguralla Town', 'Gutti Konda', 'Janapadu', 'Karalapadu', 'Konanki', 'Pinnelli', 'Tumrukota', 'Julakallu']
      },
      'bapatla': {
        subDistrict: 'Bapatla',
        district: 'Bapatla',
        state: 'Andhra Pradesh',
        villages: ['Bapatla Town', 'Suryalanka', 'Appikatla', 'Karlapalem', 'Jillellamudi', 'Maruproluvaripalem', 'Poondla', 'Murukondapadu', 'Yazali', 'Etheru']
      },
      'chirala': {
        subDistrict: 'Chirala',
        district: 'Bapatla',
        state: 'Andhra Pradesh',
        villages: ['Chirala Town', 'Vadarevu', 'Vetapalem', 'Kothapeta', 'Perala', 'Ipurupalem', 'Gavinivaripalem', 'Ramapuram', 'Jandrapeta']
      },
      'repalle': {
        subDistrict: 'Repalle',
        district: 'Bapatla',
        state: 'Andhra Pradesh',
        villages: ['Repalle Town', 'Aravapalle', 'Bethapudi', 'Chavali', 'Isukapalle', 'Karumuru', 'Penumudi', 'Poondla', 'Uppudi']
      },
      'tenali': {
        subDistrict: 'Tenali',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        villages: ['Morrispet', 'Gandhinagar', 'Angalakuduru', 'Burripalem', 'China Ravuru', 'Kolakaluru', 'Nandivelugu', 'Katevaram', 'Pinapadu', 'Bose Road', 'Chenchupet', 'Pedaravuru', 'Sangam Jagarlamudi']
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

      for (const vName of villages) {
        if (!vName || typeof vName !== 'string') continue;
        const cleanV = vName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanV) continue;
        if (!villageIndex.has(cleanV)) {
          villageIndex.set(cleanV, {
            village: vName,
            mandal: val.subDistrict,
            district: val.district,
            state: val.state,
            siblings: villages.filter(x => x && x !== vName).slice(0, 8)
          });
        }
      }
    }

    console.log(`[Universal Geo Engine] Indexed ${stateIndex.size} states, ${districtIndex.size} districts, ${mandalIndex.size} mandals, and ${villageIndex.size} villages from local database.`);
  } catch (err) {
    console.error('[Universal Geo Engine] Error indexing india_villages.json:', err.message);
  }
}

// Ensure memory index is built on boot
initIndiaGeoMemory();


module.exports = {
  districtIndex,
  mandalIndex,
  villageIndex,
  stateIndex,
  initIndiaGeoMemory
};
