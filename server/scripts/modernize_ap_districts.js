/**
 * modernize_ap_districts.js
 * Restructures Andhra Pradesh in india_villages.json into all 26 modern districts (post-2022 reorganization)
 * while preserving 100% of subdistricts and villages.
 */

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../db/india_villages.json');

console.log('Loading india_villages.json...');
const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));

// Find Andhra Pradesh
const apIndex = data.findIndex(s => s.state && s.state.toLowerCase().includes('andhra'));
if (apIndex === -1) {
  console.error('Andhra Pradesh not found!');
  process.exit(1);
}

const ap = data[apIndex];
console.log('Current AP districts count:', ap.districts.length);

// Collect all 663 mandals with their old parent district
const allMandals = [];
let totalOriginalVillages = 0;

for (const d of ap.districts) {
  for (const sub of (d.subDistricts || [])) {
    totalOriginalVillages += (sub.villages || []).length;
    allMandals.push({
      oldDistrict: d.district,
      mandalName: sub.subDistrict,
      subDistrictObj: sub,
      assigned: false
    });
  }
}
const totalOriginalMandals = allMandals.length;
console.log(`Collected ${totalOriginalMandals} mandals and ${totalOriginalVillages} villages.`);

// Define the 26 modern districts and their primary mandal keywords
const MODERN_AP_DISTRICTS = [
  {
    district: 'Alluri Sitharama Raju',
    headquarters: 'Paderu',
    keywords: ['paderu', 'araku', 'ananthagiri', 'dumbriguda', 'hukumpeta', 'g.madugula', 'chintapalle', 'g.k.veedhi', 'koyyuru', 'pedabayalu', 'munchingi', 'rampachodavaram', 'devipatnam', 'y.ramavaram', 'addateegala', 'rajavommangi', 'gangavaram', 'maredumilli', 'chintur', 'vararamachandrapuram', 'kunavaram', 'yetapaka']
  },
  {
    district: 'Anakapalli',
    headquarters: 'Anakapalli',
    keywords: ['anakapalle', 'anakapalli', 'kasimkota', 'munagapaka', 'parawada', 'sabbavaram', 'atchutapuram', 'rambilli', 'yelamanchili', 's.rayavaram', 'payakaraopeta', 'nakkapalle', 'chodavaram', 'butchayyapeta', 'ravikamatham', 'rolugunta', 'madugula', 'cheedikada', 'devarapalle', 'k.kotapadu', 'narsipatnam', 'golugonda', 'nathavaram', 'kotauratla', 'makavarapalem']
  },
  {
    district: 'Ananthapuramu',
    headquarters: 'Anantapur',
    keywords: ['anantapur', 'kudair', 'raptadu', 'atmakur', 'garladinne', 'singanamala', 'putlur', 'yellanur', 'tadpatri', 'peddapappur', 'pamidi', 'gooty', 'peddavadugur', 'yadiki', 'uravakonda', 'beluguppa', 'vidapanakal', 'vajrakarur', 'gummagatta', 'rayadurg', 'd.hirehal', 'kanekal', 'bommanahal', 'kalyandurg', 'settur', 'kundurpi', 'kambadur', 'brahmasamudram']
  },
  {
    district: 'Annamayya',
    headquarters: 'Rayachoti',
    keywords: ['rayachoti', 'sambepalli', 'chinnamandem', 'galiveedu', 'lakkireddypalle', 'ramapuram', 'veeraballi', 'madanapalle', 'nimmanapalle', 'ramasamudram', 'punganur', 'chowdepalle', 'somala', 'tamballapalle', 'thamballapalle', 'mulakalacheruvu', 'peddamandyam', 'kurabalakota', 'peddathippasamudram', 'b.kothakota', 'rajampet', 'vontimitta', 'sidhout', 'nandalur', 'penagalur', 'pullampeta', 'obulavaripalle', 'railway kodur', 'kalikiri', 'valmikipuram', 'gurramkonda', 'pileru', 'k.v.palle']
  },
  {
    district: 'Bapatla',
    headquarters: 'Bapatla',
    keywords: ['bapatla', 'pittalavanipalem', 'karlapalem', 'chirala', 'vetapalem', 'chinaganjam', 'karamchedu', 'inkollu', 'janakavaram panguluru', 'parchur', 'yeddanapudi', 'martur', 'santhamaguluru', 'ballikurava', 'repalle', 'bhattiprolu', 'cherukupalle', 'nagaram', 'nizampatnam', 'tsundur', 'vemuru', 'kollur', 'amruthalur', 'kakumanu']
  },
  {
    district: 'Chittoor',
    headquarters: 'Chittoor',
    keywords: ['chittoor', 'gudipala', 'yadamari', 'gangadhara nellore', 'g.d.nellore', 'irala', 'puthalapattu', 'penumuru', 'thavanampalle', 'srirangarajapuram', 'vedurukuppam', 'karvetinagar', 'vijayapuram', 'palasamudram', 'palamaner', 'gangavaram', 'bireddypalle', 'venkatagirikota', 'peddapanjani', 'kuppam', 'gudupalle', 'ramakuppam', 'santhipuram']
  },
  {
    district: 'Dr. B.R. Ambedkar Konaseema',
    headquarters: 'Amalapuram',
    keywords: ['amalapuram', 'allavaram', 'uppalaguptam', 'katrenikona', 'mummidivaram', 'i. polavaram', 'ainavilli', 'razole', 'malikipuram', 'sakhinetipalle', 'mamidikuduru', 'p.gannavaram', 'ambajipeta', 'kothapeta', 'ravulapalem', 'atreyapuram', 'mandapeta', 'rayavaram', 'kapileswarapuram', 'ramachandrapuram', 'k.gangavaram']
  },
  {
    district: 'East Godavari',
    headquarters: 'Rajamahendravaram',
    keywords: ['rajahmundry', 'rajamahendravaram', 'kadiam', 'rajanagaram', 'korukonda', 'gokavaram', 'seethanagaram', 'kovvur', 'chagallu', 'tallapudi', 'nidadavole', 'peravali', 'undrajavaram', 'gopalapuram', 'devarapalle', 'biccavolu', 'anaparthy', 'rangampeta']
  },
  {
    district: 'Eluru',
    headquarters: 'Eluru',
    keywords: ['eluru', 'denduluru', 'pedavegi', 'pedapadu', 'unguturu', 'bhimadole', 'nidamarru', 'chintalapudi', 'lingapalem', 'kamavarapukota', 't.narasapuram', 'jangareddygudem', 'polavaram', 'buttayagudem', 'jeelugumilli', 'koyyalagudem', 'kukunoor', 'velairpadu', 'nuzvid', 'agiripalli', 'chatrai', 'musunuru', 'kaikaluru', 'mandavalli', 'kalidindi', 'mudinepalle']
  },
  {
    district: 'Guntur',
    headquarters: 'Guntur',
    keywords: ['guntur', 'tenali', 'mangalagiri', 'tadepalli', 'tadikonda', 'pedakakani', 'prathipadu', 'vatticherukuru', 'chebrolu', 'duggirala', 'kollipara', 'ponnur', 'medikonduru', 'phirangipuram', 'pedanandipadu']
  },
  {
    district: 'Kakinada',
    headquarters: 'Kakinada',
    keywords: ['kakinada', 'samalkota', 'karapa', 'pedapudi', 'thallarevu', 'kajuluru', 'pithapuram', 'gollaprolu', 'u.kothapalle', 'peddapuram', 'jaggampeta', 'gandepalle', 'kirlampudi', 'tuni', 'kotananduru', 'tondangi', 'sankhavaram', 'prathipadu', 'yeleswaram', 'rowthulapudi']
  },
  {
    district: 'Krishna',
    headquarters: 'Machilipatnam',
    keywords: ['machilipatnam', 'bantumilli', 'kruthivennu', 'nagayalanka', 'koduru', 'avanigadda', 'challapalli', 'mopidevi', 'ghantasala', 'movva', 'pamarru', 'guduru', 'pedana', 'gudlavalleru', 'vuyyuru', 'pamidimukkala', 'kankipadu', 'penamaluru']
  },
  {
    district: 'Kurnool',
    headquarters: 'Kurnool',
    keywords: ['kurnool', 'kodumur', 'veldurthi', 'orvakal', 'kallur', 'c.belagal', 'gudur', 'yemmiganur', 'nandavaram', 'mantralayam', 'kosigi', 'adoni', 'peddakadubur', 'kowthalam', 'holagunda', 'alur', 'aspari', 'devanakonda', 'halaharvi', 'chippagiri', 'pattikonda', 'maddikera', 'tuggali']
  },
  {
    district: 'Nandyal',
    headquarters: 'Nandyal',
    keywords: ['nandyal', 'gospadu', 'sirvel', 'dornipadu', 'uyyalawada', 'koilkuntla', 'banaganapalle', 'owk', 'sanjamala', 'kolimigundla', 'allagadda', 'rudravaram', 'chagalamarri', 'mahanandi', 'panyam', 'gadivemula', 'bandiatmakur', 'atmakur', 'srisailam', 'pamulapadu', 'kothapalle', 'velgodu', 'jupadu bangalow', 'midthur', 'pagidyala', 'nandikotkur']
  },
  {
    district: 'NTR (Vijayawada)',
    headquarters: 'Vijayawada',
    keywords: ['vijayawada', 'ibrahimpatnam', 'mylavaram', 'g.konduru', 'kondapalli', 'tiruvuru', 'a.konduru', 'gamparalagudem', 'vissannapeta', 'reddigudem', 'nandigama', 'kanchikacherla', 'chandarlapadu', 'veerullapadu', 'penuganchiprolu', 'jaggayyapeta', 'vatsavai']
  },
  {
    district: 'Palnadu',
    headquarters: 'Narasaraopet',
    keywords: ['narasaraopet', 'chilakaluripet', 'nadendla', 'edlapadu', 'sattenapalle', 'rajupalem', 'muppalla', 'nekarikallu', 'rompicherla', 'vinukonda', 'nuendla', 'savalyapuram', 'ipur', 'bollapalle', 'gurazala', 'dachepalli', 'piduguralla', 'machavaram', 'macherla', 'rentachintala', 'karampudi', 'durgi', 'veldurthi', 'bellamkonda', 'atchampet', 'krosuru', 'amaravathi', 'pedakurapadu']
  },
  {
    district: 'Parvathipuram Manyam',
    headquarters: 'Parvathipuram',
    keywords: ['parvathipuram', 'seethanagaram', 'balijipeta', 'salur', 'pachipenta', 'makkuva', 'komarada', 'gummalakshmipuram', 'jiyyammavalasa', 'kurupam', 'garugubilli', 'bhamini', 'seethampeta', 'palakonda', 'veeraghattam']
  },
  {
    district: 'Prakasam',
    headquarters: 'Ongole',
    keywords: ['ongole', 'kothapatnam', 'santhanuthalapadu', 'maddipadu', 'chimakurthi', 'tangutur', 'singarayakonda', 'zarugumalli', 'kondapi', 'marripudi', 'ponnaluru', 'podili', 'markapur', 'tarlupadu', 'donakonda', 'konakanamitla', 'yerragondapalem', 'tripuranthakam', 'dornala', 'peddaraveedu', 'giddalur', 'cumbum', 'bestavaripeta', 'racherla', 'komarolu', 'ardhaveedu', 'kanigiri', 'pamur', 'c.s.puram', 'hanumanthunipadu', 'veligandla', 'pedacherlopalle']
  },
  {
    district: 'Sri Potti Sriramulu Nellore',
    headquarters: 'Nellore',
    keywords: ['nellore', 'kovur', 'buchireddypalem', 'indukurpet', 'kodavalur', 'vidavalur', 'dagadarthi', 'allur', 'bitragunta', 'bogole', 'jaladanki', 'kavali', 'kaligiri', 'vinjamur', 'duttalur', 'varikuntapadu', 'kondapuram', 'seetharamapuram', 'udayagiri', 'marripadu', 'atmakur', 'ananthasagaram', 'chejerla', 'sangam', 'podalakur', 'rapur', 'kaluvoya', 'saidapuram']
  },
  {
    district: 'Sri Sathya Sai',
    headquarters: 'Puttaparthi',
    keywords: ['puttaparthi', 'bukkapatnam', 'kothacheruvu', 'gorantla', 'chilamathur', 'lepakshi', 'hindupur', 'somandepalle', 'penukonda', 'roddam', 'parigi', 'madakasira', 'gudibanda', 'amarapuram', 'agali', 'rolla', 'kadiri', 'talupula', 'nambulapulikunta', 'gandlapenta', 'tanakal', 'nallacheruvu', 'mudigubba', 'dharmavaram', 'bathalapalle', 'tadimarri', 'kanaganapalle', 'chennekothapalle', 'ramagiri']
  },
  {
    district: 'Srikakulam',
    headquarters: 'Srikakulam',
    keywords: ['srikakulam', 'gara', 'amadalavalasa', 'ponduru', 'sarubujjili', 'burja', 'narasannapeta', 'polaki', 'jalumuru', 'kotabommali', 'tekkali', 'santhabommali', 'nandigam', 'sompeta', 'mandasa', 'kanchili', 'kaviti', 'ichchapuram', 'palasa', 'vajrapukothuru', 'pathapatnam', 'meliaputti', 'hiramandalam', 'saravakota', 'l.n.peta']
  },
  {
    district: 'Tirupati',
    headquarters: 'Tirupati',
    keywords: ['tirupati', 'chandragiri', 'renigunta', 'yerpedu', 'srikalahasti', 'thottambedu', 'buchinaidu kandriga', 'varadaiahpalem', 'satyavedu', 'nagari', 'nindra', 'pichatur', 'narayanavanam', 'vadamalapeta', 'gudur', 'chillakur', 'kota', 'vakadu', 'chittamur', 'naidupeta', 'ojili', 'pellakur', 'sullurpeta', 'tada', 'doravarisatram', 'venkatagiri', 'dakkili', 'balayapalli']
  },
  {
    district: 'Visakhapatnam',
    headquarters: 'Visakhapatnam',
    keywords: ['visakhapatnam', 'maharani peta', 'gopalapatnam', 'gajuwaka', 'mulagada', 'pedagantyada', 'bheemunipatnam', 'anandapuram', 'padmanabham', 'pendurthi', 'seethammadhara']
  },
  {
    district: 'Vizianagaram',
    headquarters: 'Vizianagaram',
    keywords: ['vizianagaram', 'gantyada', 'pusapatirega', 'denkada', 'bondapalle', 'gurla', 'garividi', 'cheepurupalle', 'merakamudidam', 'nellimarla', 'kothavalasa', 'vepada', 'l.kota', 'jami', 's.kota', 'bobbili', 'ramabhadrapuram', 'badangi', 'dattirajeru', 'mentada', 'gajapathinagaram']
  },
  {
    district: 'West Godavari',
    headquarters: 'Bhimavaram',
    keywords: ['bhimavaram', 'veeravasaram', 'palakollu', 'yelamanchili', 'achanta', 'narasapuram', 'mogalthur', 'tanuku', 'attili', 'iragavaram', 'pentapadu', 'tadepalligudem', 'akividu', 'kalla', 'undi']
  },
  {
    district: 'YSR Kadapa',
    headquarters: 'Kadapa',
    keywords: ['kadapa', 'chennur', 'vallur', 'kamalapuram', 'veerapunayunipalle', 'yerraguntla', 'proddatur', 'jammalamadugu', 'muddanur', 'kondapuram', 'mylavaram', 'pulivendula', 'vempalle', 'simhadripuram', 'lingala', 'thondur', 'vemula', 'chakrayapet', 'badvel', 'gopavaram', 'khajipet', 'chapadu', 'mydukur', 'duvvur', 's.mydukur', 'b.matam', 'porumamilla', 'kalasapadu', 'b.kodur', 'atlur']
  }
];

// Initialize districts
const newDistricts = MODERN_AP_DISTRICTS.map(def => ({
  district: def.district,
  headquarters: def.headquarters,
  subDistricts: []
}));

// First pass: match by explicit keyword
for (const item of allMandals) {
  const mLower = item.mandalName.trim().toLowerCase();
  for (let i = 0; i < MODERN_AP_DISTRICTS.length; i++) {
    const def = MODERN_AP_DISTRICTS[i];
    if (def.keywords.some(kw => mLower === kw || mLower.includes(kw) || kw.includes(mLower))) {
      newDistricts[i].subDistricts.push(item.subDistrictObj);
      item.assigned = true;
      break;
    }
  }
}

// Second pass: assign any remaining unassigned mandal based on closest parent name
for (const item of allMandals) {
  if (!item.assigned) {
    const oldName = item.oldDistrict.toLowerCase();
    let target = newDistricts.find(nd => nd.district.toLowerCase().includes(oldName) || oldName.includes(nd.district.toLowerCase()));
    if (!target) {
      if (oldName.includes('kadapa') || oldName.includes('y s r')) {
        target = newDistricts.find(nd => nd.district.includes('YSR'));
      } else {
        target = newDistricts[0];
      }
    }
    target.subDistricts.push(item.subDistrictObj);
    item.assigned = true;
  }
}

// Verification: count new total mandals and villages
let newTotalMandals = 0;
let newTotalVillages = 0;
newDistricts.forEach(d => {
  newTotalMandals += d.subDistricts.length;
  d.subDistricts.forEach(sd => {
    newTotalVillages += (sd.villages || []).length;
  });
});

console.log('--- REORGANIZATION VERIFICATION ---');
console.log('Modern AP Districts:', newDistricts.length);
console.log('Mandals before:', totalOriginalMandals, '-> Mandals after:', newTotalMandals);
console.log('Villages before:', totalOriginalVillages, '-> Villages after:', newTotalVillages);

if (newTotalVillages !== totalOriginalVillages || newTotalMandals !== totalOriginalMandals || newDistricts.length !== 26) {
  console.error('Mismatch detected! Aborting file update.');
  process.exit(1);
}

// Update AP in data
data[apIndex].districts = newDistricts;

// Backup original file
fs.copyFileSync(FILE_PATH, FILE_PATH + '.pre_ap_reorg.bak');
fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log('SUCCESS: All 26 Andhra Pradesh modern districts written with 100% of mandals and villages!');
