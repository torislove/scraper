const axios = require('axios');

const BASE_URL = 'http://localhost:5002';

async function comprehensiveTest() {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 COMPREHENSIVE SCRAPER TEST SUITE');
  console.log('='.repeat(60) + '\n');

  const platforms = ['instagram', 'facebook'];
  
  for (const platform of platforms) {
    console.log(`\n📱 Testing ${platform.toUpperCase()}...`);
    try {
      const res = await axios.post(`${BASE_URL}/api/scrape/social`, {
        platform,
        query: 'wedding photographers in hyderabad',
        category: 'Photographers',
        location: 'Hyderabad'
      });
      console.log(`  ✅ Scrape initiated: "${res.data.message}"`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }

  // Test TrueCaller
  console.log(`\n☎️  Testing TRUECALLER...`);
  try {
    const res = await axios.post(`${BASE_URL}/api/scrape/truecaller`, {
      query: 'wedding caterers in hyderabad',
      category: 'Caterers',
      location: 'Hyderabad'
    });
    console.log(`  ✅ Scrape initiated: "${res.data.message}"`);
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  console.log('\n⏳ Waiting 15 seconds for all scrapers to process...\n');
  await new Promise(r => setTimeout(r, 15000));

  // Summary
  try {
    const leads = await axios.get(`${BASE_URL}/api/vendors`);
    console.log('\n' + '='.repeat(60));
    console.log('  📊 RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n  Total Leads in Database: ${leads.data.length}`);
    
    if (leads.data.length > 0) {
      const bySou = {};
      leads.data.forEach(l => {
        const source = l.source || 'Unknown';
        bySou[source] = (bySou[source] || 0) + 1;
      });
      
      console.log('\n  Breakdown by Source:');
      Object.entries(bySou).sort((a,b) => b[1] - a[1]).forEach(([src, cnt]) => {
        console.log(`    - ${src}: ${cnt}`);
      });

      console.log('\n  Latest 10 Leads:');
      leads.data.slice(-10).reverse().forEach((l, i) => {
        const social = l.instagram || l.facebook || l.youtube || 'N/A';
        const type = l.instagram ? 'IG' : l.facebook ? 'FB' : l.youtube ? 'YT' : 'Direct';
        console.log(`    ${String(i+1).padStart(2)}. ${(l.name || 'Unknown').substring(0, 35).padEnd(35)} [${type}] (${(l.source || '').substring(0, 15)})`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (err) {
    console.error('Error fetching summary:', err.message);
  }
}

comprehensiveTest().catch(console.error);
