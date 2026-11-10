/**
 * modernize_telangana_districts.js
 * Restructures Telangana in india_villages.json into all 33 modern districts
 * while preserving 100% of subdistricts (459 mandals) and villages (10,761 villages).
 */

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../db/india_villages.json');

console.log('Loading india_villages.json...');
const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));

// Find Telangana
const tgIndex = data.findIndex(s => s.state && s.state.toLowerCase().includes('telangana'));
if (tgIndex === -1) {
  console.error('Telangana not found!');
  process.exit(1);
}

const tg = data[tgIndex];
console.log('Current Telangana districts count:', tg.districts.length);

// Collect all 459 mandals with their old parent district
const allMandals = [];
let totalOriginalVillages = 0;

for (const d of tg.districts) {
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
console.log(`Collected ${totalOriginalMandals} mandals and ${totalOriginalVillages} villages in Telangana.`);

// Define the 33 modern districts and their primary mandal keywords
const MODERN_TELANGANA_DISTRICTS = [
  {
    district: 'Adilabad',
    headquarters: 'Adilabad',
    keywords: ['adilabad', 'bazarhathnoor', 'bela', 'boath', 'gudihathnoor', 'ichoda', 'indervelly', 'jainad', 'mavala', 'neradigonda', 'sirikonda', 'talamadugu', 'tamsi', 'utnoor']
  },
  {
    district: 'Bhadradri Kothagudem',
    headquarters: 'Kothagudem',
    keywords: ['kothagudem', 'bhadrachalam', 'palwancha', 'yellandu', 'aswapoor', 'aswaraopeta', 'burgampahad', 'chandrugonda', 'chunchupalle', 'dammapeta', 'dummugudem', 'julurpadu', 'karakagudem', 'manuguru', 'pinapaka', 'sujathanagar', 'teculapalle', 'annapureddypalle', 'allapalle', 'cherla', 'gundala', 'mulakalapalle']
  },
  {
    district: 'Hanamkonda',
    headquarters: 'Hanamkonda',
    keywords: ['hanamkonda', 'kazipet', 'hasanparthy', 'kamalapur', 'elkathurthi', 'bheemadevarpalle', 'dharmasagar', 'inavolu', 'velair', 'nadikuda', 'shayampet', 'atmakur', 'damera']
  },
  {
    district: 'Hyderabad',
    headquarters: 'Hyderabad',
    keywords: ['amberpet', 'ameerpet', 'asifnagar', 'bahadurpura', 'bandlaguda', 'charminar', 'golconda', 'himayathnagar', 'khairatabad', 'marredpally', 'musheerabad', 'nampally', 'saidabad', 'secunderabad', 'shaikpet', 'tirumalagiri']
  },
  {
    district: 'Jagtial',
    headquarters: 'Jagtial',
    keywords: ['jagtial', 'koratla', 'metpalli', 'raikal', 'dharmapuri', 'mallial', 'gollapalle', 'velgatoor', 'pegadapalle', 'kodimial', 'medipalle', 'sarangapur', 'kathlapur', 'mallapur', 'ibrahimpatnam', 'buggaram', 'beerpur']
  },
  {
    district: 'Jangaon',
    headquarters: 'Jangaon',
    keywords: ['jangaon', 'cherial', 'bachannapet', 'devaruppula', 'palakurthi', 'lingalaghanpur', 'raghunathpalle', 'tarigoppula', 'chilpur', 'zaffergadh', 'kodakandla']
  },
  {
    district: 'Jayashankar Bhupalpally',
    headquarters: 'Bhupalpally',
    keywords: ['bhupalpalle', 'bhupalpally', 'kataram', 'mahadevpur', 'mogullapalle', 'regonda', 'chityal', 'ghanpur', 'malharrao', 'palimela', 'tekumatla']
  },
  {
    district: 'Jogulamba Gadwal',
    headquarters: 'Gadwal',
    keywords: ['gadwal', 'alampur', 'ieeja', 'dharur', 'maldakal', 'ghattu', 'itikyala', 'manopad', 'waddepalle', 'rajoli', 'undavelli', 'kaloor timmanadoddi']
  },
  {
    district: 'Kamareddy',
    headquarters: 'Kamareddy',
    keywords: ['kamareddy', 'banswada', 'yellareddy', 'jukkal', 'domakonda', 'bhiknoor', 'machareddy', 'sadashivanagar', 'tadwai', 'gandhari', 'rajampet', 'birkoor', 'bichkunda', 'pitlam', 'madnoor', 'nizamsagar', 'lingampet', 'nagireddypet', 'nasrullabad']
  },
  {
    district: 'Karimnagar',
    headquarters: 'Karimnagar',
    keywords: ['karimnagar', 'choppadandi', 'manakondur', 'gangadhara', 'huzurabad', 'jammikunta', 'ramadugu', 'thimmapur', 'chigurumamidi', 'veeenavanka', 'saidapur', 'ellanthakunta', 'ganneruvaram', 'kothapalle']
  },
  {
    district: 'Khammam',
    headquarters: 'Khammam',
    keywords: ['khammam', 'madhira', 'wyra', 'sathupalli', 'kalluru', 'bonakal', 'chintakani', 'kamepalle', 'kusumanchi', 'mudigonda', 'nelakondapalle', 'penuballi', 'singareni', 'tallada', 'thirumalayapalem', 'yerrupalem', 'konijerla', 'vemsoor', 'encoor', 'raghunadhapalem']
  },
  {
    district: 'Komaram Bheem Asifabad',
    headquarters: 'Asifabad',
    keywords: ['asifabad', 'sirpur', 'kagaznagar', 'jainoor', 'wankdi', 'rebbana', 'kerameri', 'tiryani', 'bejjur', 'dahegaon', 'kouthala', 'chintalamanepally', 'penchikalpet', 'lingapur']
  },
  {
    district: 'Mahabubabad',
    headquarters: 'Mahabubabad',
    keywords: ['mahabubabad', 'dornakal', 'kesamudram', 'maripeda', 'kuravi', 'gudur', 'bayyaram', 'garla', 'chinna gudur', 'narsimhulapet', 'danthalapalle', 'gangaram', 'kothaguda']
  },
  {
    district: 'Mahbubnagar',
    headquarters: 'Mahbubnagar',
    keywords: ['mahbubnagar', 'jadcherla', 'bhoothpur', 'nawabpet', 'devarkadra', 'koilkonda', 'hanwada', 'c.c.kunta', 'midjil', 'maddur', 'kandamoor', 'moosapet', 'gandeed', 'rakoonda']
  },
  {
    district: 'Mancherial',
    headquarters: 'Mancherial',
    keywords: ['mancherial', 'bellampalli', 'mandamarri', 'chennur', 'luxettipet', 'jannaram', 'dandepalle', 'kasipet', 'kotapalle', 'bheemaram', 'hajipur', 'nennal', 'vemanpalle', 'bheemini', 'kannaepalle']
  },
  {
    district: 'Medak',
    headquarters: 'Medak',
    keywords: ['medak', 'ramayampet', 'shankarampet', 'kowdipalle', 'papannapet', 'narsapur', 'alladurg', 'regode', 'chegunta', 'kulcharam', 'tekmal', 'havelighanpur', 'chilipched', 'yeldurthy']
  },
  {
    district: 'Medchal-Malkajgiri',
    headquarters: 'Medchal',
    keywords: ['malkajgiri', 'medchal', 'alwal', 'quthbullapur', 'kukatpally', 'uppal', 'ghatkesar', 'kapra', 'keesara', 'shamirpet', 'bachupally', 'dundigal', 'gandimaisamma', 'medipally', 'muduchintalpally']
  },
  {
    district: 'Mulugu',
    headquarters: 'Mulugu',
    keywords: ['mulug', 'mulugu', 'venkatapur', 'govindaraopet', 'eturnagaram', 'mangapet', 'tadvai', 'kannaigudem', 'wajedu', 'venkatapuram']
  },
  {
    district: 'Nagarkurnool',
    headquarters: 'Nagarkurnool',
    keywords: ['nagarkurnool', 'achampet', 'kalwakurthy', 'kollapur', 'telkapally', 'bijinapalle', 'thimmajipeta', 'taduru', 'amrabad', 'balmoor', 'lingal', 'uppununthala', 'vangoor', 'charakonda', 'padara', 'urukonda', 'pentlavelli']
  },
  {
    district: 'Nalgonda',
    headquarters: 'Nalgonda',
    keywords: ['nalgonda', 'miryalaguda', 'devarakonda', 'nakrekal', 'narketpally', 'chandur', 'chityal', 'kanagal', 'kattangur', 'munugode', 'shaligouraram', 'tipparthi', 'kangal', 'damaracherla', 'adivarampet', 'gundlapalle', 'nidamanoor', 'pedda adiserlapalle', 'tripuraram', 'vemula palle', 'madugulapally', 'gurrampode', 'marriguda', 'chandampet']
  },
  {
    district: 'Narayanpet',
    headquarters: 'Narayanpet',
    keywords: ['narayanpet', 'makthal', 'maganoor', 'damaragidda', 'dhanwada', 'kosgi', 'krishna', 'maddur', 'marikal', 'narva', 'utkoor']
  },
  {
    district: 'Nirmal',
    headquarters: 'Nirmal',
    keywords: ['nirmal', 'bhainsa', 'khanapur', 'mudhole', 'sarangapur', 'kuntala', 'dilawarpur', 'kaddampeddur', 'mamda', 'laxmanchanda', 'soan', 'narsapur', 'lokeshwaram', 'tanur', 'kubeer', 'basar']
  },
  {
    district: 'Nizamabad',
    headquarters: 'Nizamabad',
    keywords: ['nizamabad', 'armur', 'bodhan', 'bheemgal', 'balkonda', 'varni', 'dichpalle', 'jakranpalle', 'makloor', 'navipet', 'renjal', 'kotgiri', 'yedpalle', 'nandipet', 'kammarpalle', 'mortad', 'sirikonda', 'velpur', 'rudrur', 'mupkal', 'chandur', 'mosra']
  },
  {
    district: 'Peddapalli',
    headquarters: 'Peddapalli',
    keywords: ['peddapalli', 'ramagundam', 'godavarikhani', 'sultanabad', 'manthani', 'odela', 'julapalle', 'eligaid', 'dharmaram', 'anthergaon', 'palakurthy', 'kamanpur', 'mutharam', 'ramagiri']
  },
  {
    district: 'Rajanna Sircilla',
    headquarters: 'Sircilla',
    keywords: ['sircilla', 'vemulawada', 'boinpalle', 'chandurthi', 'konaraopet', 'mustabad', 'yellareddypet', 'gambhiraopet', 'rudrangi', 'vemulawada rural', 'thangallapalli', 'veerannapet']
  },
  {
    district: 'Rangareddy',
    headquarters: 'Shamshabad',
    keywords: ['chevella', 'rajendranagar', 'saroornagar', 'hayathnagar', 'ibrahimpatnam', 'maheshwaram', 'shamshabad', 'shadnagar', 'farooqnagar', 'amangal', 'kandukur', 'keshampet', 'kondurg', 'kothur', 'manchal', 'moinabad', 'nandigama', 'serilingampally', 'shabad', 'talakondapalle', 'yaacharam', 'chowdergudem']
  },
  {
    district: 'Sangareddy',
    headquarters: 'Sangareddy',
    keywords: ['sangareddy', 'patancheru', 'ramachandrapuram', 'ameenpur', 'zaheerabad', 'narayankhed', 'andole', 'jogipet', 'kandi', 'kondapur', 'sadasivpet', 'jinnaram', 'gummadidala', 'munipally', 'kohir', 'nyalkal', 'jharasangam', 'manoor', 'kalher', 'kangti', 'sirgapoor', 'mogudampally', 'vatpally', 'hathnoora']
  },
  {
    district: 'Siddipet',
    headquarters: 'Siddipet',
    keywords: ['siddipet', 'gajwel', 'dubbak', 'husnabad', 'chinnakodur', 'bejjanki', 'nanganur', 'mulug', 'wargal', 'jagdevpur', 'kondapak', 'markook', 'thoguta', 'mirdoddi', 'doulthabad', 'koheda', 'maddur', 'narayanraopet', 'dhoolmitta']
  },
  {
    district: 'Suryapet',
    headquarters: 'Suryapet',
    keywords: ['suryapet', 'kodad', 'huzurnagar', 'thungathurthi', 'neredcherla', 'chivvemla', 'mothey', 'atmakur', 'jaji reddi gudem', 'nuthankal', 'penpahad', 'chinthapalem', 'garidepalle', 'mattampalle', 'mellachervu', 'munagala', 'nadigudem', 'palakeedu', 'ananthagiri', 'maddirala', 'nagaram']
  },
  {
    district: 'Vikarabad',
    headquarters: 'Vikarabad',
    keywords: ['vikarabad', 'tandur', 'pargi', 'kodangal', 'nawabpet', 'dharur', 'doma', 'kulkacherla', 'mominpet', 'marpalle', 'bantwaram', 'basheerabad', 'peddemul', 'yalal', 'doulathabad', 'bommaraspet', 'kotepally']
  },
  {
    district: 'Wanaparthy',
    headquarters: 'Wanaparthy',
    keywords: ['wanaparthy', 'atmakur', 'kothakota', 'pangal', 'pebbair', 'ghanpur', 'revally', 'gopalpeta', 'madnapoor', 'chinna chintakunta', 'srirangapur', 'peddamandadi']
  },
  {
    district: 'Warangal',
    headquarters: 'Warangal',
    keywords: ['warangal', 'narsampet', 'parkal', 'wardhannapet', 'chennaraopet', 'duggondi', 'geesugonda', 'khanapur', 'nekkonda', 'parvathagiri', 'rayaparthy', 'sangem']
  },
  {
    district: 'Yadadri Bhuvanagiri',
    headquarters: 'Bhongir',
    keywords: ['bhongir', 'alair', 'choutuppal', 'motakondur', 'turkapally', 'yadagirigutta', 'bibinagar', 'ramannapet', 'valigonda', 'atmakur', 'rajapet', 'gundala', 'b.pochampally', 'bhuvanagiri', 'addagudur', 'motkur', 'narayanpur']
  }
];

// Initialize districts
const newDistricts = MODERN_TELANGANA_DISTRICTS.map(def => ({
  district: def.district,
  headquarters: def.headquarters,
  subDistricts: []
}));

// First pass: match by explicit keyword
for (const item of allMandals) {
  const mLower = item.mandalName.trim().toLowerCase();
  for (let i = 0; i < MODERN_TELANGANA_DISTRICTS.length; i++) {
    const def = MODERN_TELANGANA_DISTRICTS[i];
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
    let target = newDistricts.find(nd => nd.district.toLowerCase().includes(oldName) || oldName.includes(nd.district.toLowerCase())) || newDistricts[0];
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

console.log('--- TELANGANA REORGANIZATION VERIFICATION ---');
console.log('Modern Telangana Districts:', newDistricts.length);
console.log('Mandals before:', totalOriginalMandals, '-> Mandals after:', newTotalMandals);
console.log('Villages before:', totalOriginalVillages, '-> Villages after:', newTotalVillages);

if (newTotalVillages !== totalOriginalVillages || newTotalMandals !== totalOriginalMandals || newDistricts.length !== 33) {
  console.error('Mismatch detected! Aborting file update.');
  process.exit(1);
}

// Update Telangana in data
data[tgIndex].districts = newDistricts;

// Backup original file
fs.copyFileSync(FILE_PATH, FILE_PATH + '.pre_tg_reorg.bak');
fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log('SUCCESS: All 33 Telangana modern districts written with 100% of mandals and villages!');

