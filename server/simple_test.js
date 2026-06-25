const axios = require('axios');

const BASE_URL = 'http://localhost:5002';

async function simpleTest() {
  try {
    console.log('\n🧪 Simple Test: Triggering Instagram scrape...\n');
    
    const result = await axios.post(`${BASE_URL}/api/scrape/social`, {
      platform: 'instagram',
      query: 'wedding photographers in hyderabad',
      category: 'Photographers',
      location: 'Hyderabad'
    });
    
    console.log('Response:', result.data);
    
    // Wait for scraper to process
    console.log('\n⏳ Waiting 10 seconds for scraper to process...\n');
    await new Promise(r => setTimeout(r, 10000));
    
    // Check for new data
    const leads = await axios.get(`${BASE_URL}/api/vendors`);
    console.log(`📊 Total leads in database: ${leads.data.length}`);
    
    // Show last 5 adds
    if (leads.data.length > 0) {
      console.log('\n📌 Latest leads:');
      leads.data.slice(-5).forEach((l, i) => {
        console.log(`  ${i+1}. ${l.name} (${l.source})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response?.data) console.error('Response:', err.response.data);
  }
}

simpleTest();
