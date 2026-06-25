const axios = require('axios');

const BASE_URL = 'http://localhost:5002';

async function testScraper(platform, query, category, location) {
  try {
    console.log(`\n📱 Testing ${platform.toUpperCase()} scraper...`);
    console.log(`Query: "${query}"\n`);
    
    const response = await axios.post(`${BASE_URL}/api/scrape/social`, {
      platform,
      query,
      category,
      location
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ ${platform.toUpperCase()} scrape initiated:`, response.data);
    
    // Wait a bit and check logs
    await new Promise(r => setTimeout(r, 3000));
    
    const logs = await axios.get(`${BASE_URL}/api/logs`);
    const recentLogs = logs.data.filter(l => l.includes(platform.charAt(0).toUpperCase() + platform.slice(1)) || l.includes('[Dork Engine]'));
    console.log(`Recent logs for ${platform}:`);
    recentLogs.slice(-5).forEach(l => console.log('  ' + l));
    
  } catch (err) {
    console.error(`❌ ${platform} error:`, err.response?.data || err.message || err.toString());
  }
}

async function runTests() {
  console.log('🚀 Starting scraper tests...\n');
  
  // Test Instagram
  await testScraper('instagram', 'wedding photographers in hyderabad', 'Photographers', 'Hyderabad');
  
  // Wait between tests
  await new Promise(r => setTimeout(r, 5000));
  
  // Test Facebook
  await testScraper('facebook', 'wedding caterers in hyderabad', 'Caterers', 'Hyderabad');
  
  // Wait between tests  
  await new Promise(r => setTimeout(r, 5000));
  
  // Test TrueCaller via omni endpoint
  console.log('\n☎️  Testing TrueCaller scraper...');
  try {
    const res = await axios.post(`${BASE_URL}/api/scrape/truecaller`, {
      query: 'wedding photographers',
      category: 'Photographers',
      location: 'Hyderabad'
    });
    console.log('✅ TrueCaller scrape initiated:', res.data);
    
    await new Promise(r => setTimeout(r, 3000));
    const logs = await axios.get(`${BASE_URL}/api/logs`);
    const truecallerLogs = logs.data.filter(l => l.includes('TrueCaller'));
    console.log('Recent TrueCaller logs:');
    truecallerLogs.slice(-5).forEach(l => console.log('  ' + l));
  } catch (err) {
    console.error('❌ TrueCaller error:', err.response?.data || err.message);
  }
  
  console.log('\n✅ Tests complete! Check server logs and database for results.\n');
}

runTests().catch(console.error);
