/**
 * search-intelligence.cjs
 *
 * Automated verification suite for:
 * 1. Zero CCTV bleed in Computer & Laptop queries
 * 2. High-precision Shopping Malls & Commercial Complexes
 * 3. High-precision Products & Industrial Manufacturing (Zero AC leak)
 * 4. High-precision Services & Trades
 * 5. Category fidelity negative keyword enforcement
 * 6. Zone-to-zone subvector purity
 */

const assert = require('assert');
const { suggestForCountry } = require('../../server/src/services/searchSuggest');
const { buildCategorySubVectorZones, getUniversalCategoryVectors } = require('../../server/src/utils/universalGeoCluster');
const { isVendorRelevant } = require('../../server/src/services/categoryFidelity');
const { classifyCategory, suggestCategories } = require('../../server/src/services/categoryRouter');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('=== SEARCH INTELLIGENCE & CATEGORY PURITY TEST SUITE ===\n');

  // 1. Computer Shops & Laptop Dealers
  console.log('--- 1. Computer Shops & Laptop Dealers ---');
  await asyncTest('Search suggestions for "computer shops in vijayawada" must NEVER contain CCTV or Spas', async () => {
    const res = await suggestForCountry({ q: 'computer shops in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    const hasCctv = labels.some(l => /\b(?:cctv|surveillance|security camera|biometric)\b/i.test(l));
    const hasSpa = labels.some(l => /\b(?:spas?|saloon?|parlour)\b/i.test(l));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer suggestions: ${labels.join(', ')}`);
    assert.strictEqual(hasSpa, false, `Found Spa in computer suggestions: ${labels.join(', ')}`);
  });

  test('Sub-vector zones for "Computer Shops & Laptop Dealers" in Vijayawada must NEVER contain CCTV', () => {
    const zones = buildCategorySubVectorZones('Computer Shops & Laptop Dealers', 'Vijayawada');
    const names = zones.map(z => z.zoneName.toLowerCase());
    const hasCctv = names.some(n => /\b(?:cctv|surveillance|security)\b/i.test(n));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer sub-vector zones: ${names.join(', ')}`);
    assert.ok(names.some(n => n.includes('laptop showroom')), 'Must include laptop showroom');
    assert.ok(names.some(n => n.includes('computer hardware')), 'Must include computer hardware');
  });

  test('Category vectors for "Computer Stores" in Vijayawada must NEVER contain CCTV', () => {
    const vectors = getUniversalCategoryVectors('Computer Stores', 'Vijayawada');
    const queryTexts = vectors.map(v => v.queryText.toLowerCase());
    const hasCctv = queryTexts.some(q => /\b(?:cctv|surveillance|security)\b/i.test(q));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer category vectors: ${queryTexts.join(', ')}`);
  });

  // 2. CCTV & Security Surveillance
  console.log('\n--- 2. CCTV & Security Surveillance ---');
  await asyncTest('Search suggestions for "cctv in vijayawada" must contain CCTV and Security', async () => {
    const res = await suggestForCountry({ q: 'cctv in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    assert.ok(labels.some(l => l.includes('cctv')), 'Must suggest CCTV');
    assert.ok(labels.every(l => !l.includes('laptop showroom')), 'CCTV must not suggest laptop showrooms');
  });

  // 3. Shopping Malls & Commercial Complexes
  console.log('\n--- 3. Shopping Malls & Commercial Complexes ---');
  await asyncTest('Search suggestions for "shopping malls in vijayawada" must be mall-specific with zero "repair" or "wholesale"', async () => {
    const res = await suggestForCountry({ q: 'shopping malls in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    assert.ok(labels.some(l => l.includes('shopping malls & retail plazas')), 'Must include Shopping Malls & Retail Plazas');
    assert.ok(labels.some(l => l.includes('commercial shopping complexes')), 'Must include Commercial Shopping Complexes');
    const hasRepair = labels.some(l => l.includes('service & repair'));
    assert.strictEqual(hasRepair, false, `Malls must not have "service & repair": ${labels.join(', ')}`);
  });

  test('Sub-vector zones for "Shopping Malls" in Vijayawada must contain pure mall infrastructure', () => {
    const zones = buildCategorySubVectorZones('Shopping Malls', 'Vijayawada');
    const names = zones.map(z => z.zoneName.toLowerCase());
    assert.ok(names.some(n => n.includes('shopping mall')), 'Must include shopping mall');
    assert.ok(names.some(n => n.includes('commercial shopping complex')), 'Must include commercial shopping complex');
    assert.ok(names.some(n => n.includes('central retail mall')), 'Must include central retail mall');
  });

  // 4. Products & Industrial Manufacturing
  console.log('\n--- 4. Products & Industrial Manufacturing ---');
  await asyncTest('Search suggestions for "products manufacturing in vijayawada" must NEVER contain AC repair or AC dealers', async () => {
    const res = await suggestForCountry({ q: 'products manufacturing in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    const hasAc = labels.some(l => /\b(?:ac dealer|air conditioner|hvac)\b/i.test(l));
    assert.strictEqual(hasAc, false, `Found AC in manufacturing suggestions: ${labels.join(', ')}`);
    assert.ok(labels.some(l => l.includes('machinery')), 'Must include industrial machinery');
    assert.ok(labels.some(l => l.includes('fabrication')), 'Must include fabrication');
  });

  test('Category vectors for "Manufacturing Plants" in Vijayawada must contain industrial units', () => {
    const vectors = getUniversalCategoryVectors('Manufacturing Plants', 'Vijayawada');
    const queryTexts = vectors.map(v => v.queryText.toLowerCase());
    assert.ok(queryTexts.some(q => q.includes('machinery')), 'Must include machinery');
    assert.ok(queryTexts.some(q => q.includes('fabrication')), 'Must include fabrication');
  });

  // 5. Category Fidelity Checks
  console.log('\n--- 5. Category Fidelity Enforcement ---');
  test('Computer Store category MUST reject a CCTV & surveillance vendor', () => {
    const cctvVendor = {
      name: 'SecureVision CCTV & Biometric Systems',
      category: 'CCTV Installation & Security Camera Dealer',
      services: ['CCTV installation', 'Biometric attendance']
    };
    const relevant = isVendorRelevant(cctvVendor, 'Computer Shops & Laptop Dealers');
    assert.strictEqual(relevant, false, 'Computer category must reject CCTV vendor');
  });

  test('Computer Store category MUST accept a valid Laptop and PC dealer', () => {
    const computerVendor = {
      name: 'TechZone Laptops & Desktop Computers',
      category: 'Computer Hardware & Laptop Store',
      services: ['Laptop repair', 'Gaming PC assembly']
    };
    const relevant = isVendorRelevant(computerVendor, 'Computer Shops & Laptop Dealers');
    assert.strictEqual(relevant, true, 'Computer category must accept computer vendor');
  });

  test('CCTV category MUST reject a pure computer shop with no security hardware', () => {
    const computerVendor = {
      name: 'Apex Computer Hardware & Laptop Showroom',
      category: 'Computer Dealers',
      services: ['Laptop screen replacement']
    };
    const relevant = isVendorRelevant(computerVendor, 'CCTV & Surveillance');
    assert.strictEqual(relevant, false, 'CCTV category must reject pure computer store');
  });

  // 6. Agricultural Commodities & Spices Trade Intelligence
  console.log('\n--- 6. Agricultural Commodities & Spices (Zero Hallucination) ---');
  test('Sub-vector zones for "Wholesale Turmeric" in Tenali must contain pure Turmeric/Commodity vectors and ZERO Sarees, Steel, Tiles, Footwear, or Furniture', () => {
    const zones = buildCategorySubVectorZones('Wholesale Turmeric Suppliers', 'Tenali');
    const names = zones.map(z => z.zoneName.toLowerCase());
    
    // Positive assertions
    assert.ok(names.some(n => n.includes('turmeric')), `Must include turmeric subvectors: ${names.join(', ')}`);
    assert.ok(names.some(n => n.includes('wholesalers') || n.includes('merchants') || n.includes('mandi') || n.includes('commission agents')), `Must include wholesale/mandi subvectors: ${names.join(', ')}`);
    
    // Absolute Zero-Tolerance Bleed Assertions
    const hasSaree = names.some(n => /\b(?:saree|garment|cloth|apparel|textile)\b/i.test(n));
    const hasSteel = names.some(n => /\b(?:steel|iron|tmt|metal)\b/i.test(n));
    const hasTiles = names.some(n => /\b(?:tiles|sanitaryware|granite|cement)\b/i.test(n));
    const hasFootwear = names.some(n => /\b(?:footwear|shoes|shoe)\b/i.test(n));
    const hasFurniture = names.some(n => /\b(?:furniture|sofa|woodwork)\b/i.test(n));
    const hasHardware = names.some(n => /\b(?:hardware and tools)\b/i.test(n));

    assert.strictEqual(hasSaree, false, `Found Saree in Turmeric zones: ${names.join(', ')}`);
    assert.strictEqual(hasSteel, false, `Found Steel in Turmeric zones: ${names.join(', ')}`);
    assert.strictEqual(hasTiles, false, `Found Tiles in Turmeric zones: ${names.join(', ')}`);
    assert.strictEqual(hasFootwear, false, `Found Footwear in Turmeric zones: ${names.join(', ')}`);
    assert.strictEqual(hasFurniture, false, `Found Furniture in Turmeric zones: ${names.join(', ')}`);
    assert.strictEqual(hasHardware, false, `Found Hardware in Turmeric zones: ${names.join(', ')}`);
  });

  test('Category Fidelity for "Wholesale Turmeric Suppliers" MUST REJECT all 25 mismatched businesses reported in Tenali', () => {
    const requestedCategory = 'Wholesale Turmeric Suppliers';

    const mismatchedVendors = [
      { name: 'MMinar Traders', subcategory: 'Iron & Steel TMT Dealers, Tenali, India', address: 'Tenali' },
      { name: 'SSri Balaji steel railing And Glass Tenali', subcategory: 'Steel Railing & Glass', address: 'Gopal Reddy St' },
      { name: 'LLakshmi sainath metal stores', subcategory: 'Metal Stores', address: 'Sivaji circle, Burripalem Road' },
      { name: 'BBharat Steel And Electricals', subcategory: 'Iron & Steel TMT Dealers', address: 'Tenali' },
      { name: 'RRaja Steel Corporation', subcategory: 'Iron & Steel Corporation', address: '7-11-125, Gopal Reddy St' },
      { name: 'LLakshmi Steel Corporation (Cement, Iron and Steel)', subcategory: 'Cement, Iron and Steel', address: 'Gopal Reddy St' },
      { name: 'VVISAKHA STEEL & CEMENT', subcategory: 'Iron & Steel TMT Dealers', address: 'Tenali' },
      { name: 'Jj k Metal house', subcategory: 'Iron & Steel TMT Dealers', address: 'Tenali' },
      { name: 'SSri Raghavendra Steel Corporation', subcategory: 'Steel Corporation', address: 'Burripalem Road' },
      { name: 'CChamundeswari Enterprises - VOX CEILING', subcategory: 'VOX CEILING False Ceiling', address: 'Gopal Reddy St' },
      { name: 'SSRI SAI TILES SANITARY MARBLES AND GRANITES', subcategory: 'Tiles Sanitary Marbles', address: 'D.No: 11-1-20/3' },
      { name: 'LLAKSHMI SAI TILES AND TILES', subcategory: 'Tiles & Ceramic Showrooms', address: 'Tenali' },
      { name: 'MMAHESH HANDLOOM SAREES', subcategory: 'Handloom Sarees Showroom', address: '6, Nehru Rd' },
      { name: 'KKIRTI SAREES', subcategory: 'Sarees Showroom', address: 'Opp. poorna departmental stores, main road' },
      { name: 'SSubham Grand - Tenali', subcategory: 'Hotel & Banquet', address: 'Bose Rd' },
      { name: 'KKranti Show Room', subcategory: 'Sarees Showroom', address: 'Main Rd' },
      { name: 'Ssatyabhama sarees', subcategory: 'Sarees Showroom', address: 'Main Rd, near Gandhi Chowk' },
      { name: 'SSri Vijaya saradhi textiles', subcategory: 'Textiles Showroom', address: 'Door No: 16' },
      { name: 'TTenali Electricals', subcategory: 'Electrical Goods & Spares', address: 'Bose Rd' },
      { name: 'RRR ELECTRICAL & SPARES', subcategory: 'Electrical & Spares', address: 'opp. ICIC BANK' },
      { name: 'KKuber electricals', subcategory: 'Electricals Store', address: 'Gopal Reddy St' },
      { name: 'SSri sai Durga electricals and sanitary ware', subcategory: 'Electricals and Sanitary Ware', address: 'Gopal Reddy St' },
      { name: 'SSri Venkata Ramana Electricals', subcategory: 'Electrical Goods Store', address: 'Bose Rd' },
      { name: 'SSRI VIJAYA ELECTRICALS', subcategory: 'Electrical Goods & Lighting', address: 'Manda Vari St' }
    ];

    for (const v of mismatchedVendors) {
      const allowed = isVendorRelevant(v, requestedCategory);
      assert.strictEqual(allowed, false, `Category fidelity failed: "${v.name}" was NOT rejected for Turmeric search!`);
    }
  });

  test('Category Fidelity for "Wholesale Turmeric Suppliers" MUST ACCEPT legitimate commodity & spice merchants', () => {
    const requestedCategory = 'Wholesale Turmeric Suppliers';

    const validAgroVendors = [
      { name: 'Sri Lakshmi Turmeric Traders & Exporters', subcategory: 'Agricultural Produce Merchants', address: 'Market Yard, Tenali' },
      { name: 'Guntur Mirchi & Turmeric Mandi Commission Agent', subcategory: 'Spices Wholesalers & Commission Agents', address: 'APMC Yard, Tenali' },
      { name: 'Tenali Agricultural Produce & Spices Wholesale Merchant', subcategory: 'Grain & Spices Wholesaler', address: 'Bazaar Street, Tenali' },
      { name: 'Sri Venkateswara Turmeric Polishing & Cold Storage', subcategory: 'Cold Storage & Agro Processing', address: 'Industrial Belt, Tenali' }
    ];

    for (const v of validAgroVendors) {
      const allowed = isVendorRelevant(v, requestedCategory);
      assert.strictEqual(allowed, true, `Category fidelity failed: Valid agro merchant "${v.name}" was rejected!`);
    }
  });

  // 7. Iron & Steel vs Sarees Mutual Exclusion
  console.log('\n--- 7. Cross-Industry Anti-Bleed Mutual Exclusion ---');
  test('Iron & Steel category MUST ACCEPT steel traders and REJECT turmeric/sarees', () => {
    const steelCategory = 'Iron & Steel TMT Dealers';
    const steelShop = { name: 'Minar Traders - TMT Steel & Iron', subcategory: 'Iron & Steel Dealers', address: 'Tenali' };
    const sareeShop = { name: 'Mahesh Handloom Sarees', subcategory: 'Handloom Sarees', address: 'Tenali' };
    const turmericShop = { name: 'Sri Lakshmi Turmeric Mandi', subcategory: 'Spices Wholesaler', address: 'Tenali' };

    assert.strictEqual(isVendorRelevant(steelShop, steelCategory), true, 'Steel category must accept steel vendor');
    assert.strictEqual(isVendorRelevant(sareeShop, steelCategory), false, 'Steel category must reject saree vendor');
    assert.strictEqual(isVendorRelevant(turmericShop, steelCategory), false, 'Steel category must reject turmeric vendor');
  });

  test('Handloom Sarees category MUST ACCEPT saree showrooms and REJECT steel/turmeric', () => {
    const sareeCategory = 'Handloom Sarees & Silk';
    const sareeShop = { name: 'Mahesh Handloom Sarees', subcategory: 'Handloom Sarees', address: 'Tenali' };
    const steelShop = { name: 'Minar Traders - TMT Steel & Iron', subcategory: 'Iron & Steel Dealers', address: 'Tenali' };
    const turmericShop = { name: 'Sri Lakshmi Turmeric Mandi', subcategory: 'Spices Wholesaler', address: 'Tenali' };

    assert.strictEqual(isVendorRelevant(sareeShop, sareeCategory), true, 'Saree category must accept saree vendor');
    assert.strictEqual(isVendorRelevant(steelShop, sareeCategory), false, 'Saree category must reject steel vendor');
    assert.strictEqual(isVendorRelevant(turmericShop, sareeCategory), false, 'Saree category must reject turmeric vendor');
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
