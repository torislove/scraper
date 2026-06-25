const axios = require('axios');

const API_URL = 'http://localhost:5002/api';

async function runQATest() {
  console.log('🛡️ Starting Frontend & Backend Integration QA...');
  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // Test 1: Check API health and knowledge endpoint
  console.log('\n--- Test 1: Knowledge API ---');
  try {
    const res = await axios.get(`${API_URL}/knowledge`);
    assert(res.status === 200, 'Knowledge API returns status 200');
    assert(Array.isArray(res.data.categories), 'Categories list is an array');
    assert(res.data.categories.length > 0, 'Categories list is not empty');
    assert(Array.isArray(res.data.locations), 'Locations list is an array');
  } catch (err) {
    assert(false, `Knowledge API failed: ${err.message}`);
  }

  // Test 2: Check proxy functionality for all targeted platforms
  console.log('\n--- Test 2: CORS Proxy API for Platforms ---');
  const testUrls = [
    { name: 'Google Search', url: 'https://www.google.com/search?q=photographers+in+guntur' },
    { name: 'WeddingBazaar', url: 'https://www.weddingbazaar.com/wedding-photographers-in-guntur' },
    { name: 'WeddingWire', url: 'https://www.weddingwire.in/wedding-photographers/guntur' },
    { name: 'Mandap.com', url: 'https://www.mandap.com/wedding-venues/chennai' }
  ];

  for (const item of testUrls) {
    try {
      console.log(`Proxying: ${item.name} (${item.url.slice(0, 45)}...)`);
      const res = await axios.get(`${API_URL}/proxy`, {
        params: { url: item.url }
      });
      assert(res.status === 200, `${item.name} proxy request returns 200`);
      assert(res.data && res.data.length > 500, `${item.name} proxy returns non-empty HTML content`);
    } catch (err) {
      assert(false, `${item.name} proxy request failed: ${err.message}`);
    }
  }

  // Test 3: Check POST /api/vendors to save scraped lead
  console.log('\n--- Test 3: Insert Scraped Lead to local Database ---');
  const mockVendor = {
    id: 'test-qa-vendor-' + Math.random().toString(36).substring(7),
    name: 'QA Test Studio',
    category: 'Wedding Photographers',
    city: 'Guntur',
    phone: '9876543210',
    email: 'qa@teststudio.com',
    address: 'Guntur Andhra Pradesh',
    rating: 4.5,
    platform: 'google',
    sourceUrl: 'https://google.com'
  };

  try {
    const res = await axios.post(`${API_URL}/vendors`, mockVendor);
    assert(res.status === 200, 'POST /api/vendors returns status 200');
    assert(res.data.success === true, 'Response contains success field true');
    assert(res.data.inserted >= 0, `Database reported inserted/updated count: ${res.data.inserted}`);

    // Verify it was saved by fetching the vendors list
    const listRes = await axios.get(`${API_URL}/vendors`);
    const found = listRes.data.find(v => v.name === mockVendor.name && v.city === mockVendor.city);
    assert(found !== undefined, 'Scraped lead is successfully saved and found in database');
    assert(found && found.phone === mockVendor.phone, 'Scraped lead contains correct phone number');
  } catch (err) {
    assert(false, `Vendor insertion test failed: ${err.message}`);
  }

  console.log(`\n📊 === QA INTEGRATION SUMMARY ===`);
  console.log(`Passed: ${testsPassed} / ${totalTests} (${Math.round((testsPassed / totalTests) * 100)}%)`);
  console.log(`==================================\n`);

  process.exit(testsPassed === totalTests ? 0 : 1);
}

runQATest();
