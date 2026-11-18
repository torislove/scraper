'use strict';

const axios = require('axios');
const fs = require('fs');
const BASE_URL = 'http://localhost:5002';

const TESTS = [
  {
    country: 'CA',
    category: 'Event Planners',
    location: 'Mississauga, ON',
    isMaster: false
  },
  {
    country: 'AU',
    category: 'Function Centres',
    location: 'Parramatta, NSW',
    isMaster: false
  },
  {
    country: 'AE',
    category: 'Luxury Event Organizers',
    location: 'Business Bay, Dubai',
    isMaster: false
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  for (const t of TESTS) {
    console.log(`\n======================================================`);
    console.log(`[TEST] Country: ${t.country} | Query: "${t.category}" in "${t.location}"`);
    try {
      const res = await axios.post(`${BASE_URL}/api/v2/scrape`, t);
      const sid = res.data.sessionId;
      console.log(`Dispatched: ${sid}`);

      let leads = 0;
      let phones = 0;
      let topLead = null;

      for (let i = 0; i < 10; i++) {
        await sleep(3000);
        try {
          const check = await axios.get(`${BASE_URL}/api/sessions/api_client/${sid}`, {
            headers: { 'x-user-id': 'api_client', 'x-workspace-scope': 'master' }
          });
          const list = check.data?.session?.leads || [];
          leads = list.length;
          phones = list.filter(l => l.phone).length;
          if (list.length > 0) topLead = list[0];
          process.stdout.write(`... [${(i+1)*3}s] Leads: ${leads}, Phones: ${phones}\r`);
          if (leads >= 8) break;
        } catch (e) {}
      }

      console.log(`\n[RESULT ${t.country}] Harvested ${leads} leads (${phones} phones)`);
      if (topLead) {
        console.log(`Sample: ${topLead.name} | Phone: ${topLead.phone} | City: ${topLead.city}`);
      }
    } catch (err) {
      console.error(`[FAIL ${t.country}]:`, err.message);
    }
  }
}

run();
