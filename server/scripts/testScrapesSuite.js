'use strict';

/**
 * testScrapesSuite.js
 * Automated validation test suite for Master state/district sweeps and Client localized scrapes.
 * Tests India (IN), United States (US), United Kingdom (GB), Canada (CA), Australia (AU), and UAE (AE).
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5002';

const TEST_CASES = [
  {
    id: 'TC-01-CLIENT-IN',
    role: 'Client (Localized)',
    country: 'IN',
    category: 'Wedding Photographers',
    location: 'Benz Circle, Vijayawada',
    isMaster: false
  },
  {
    id: 'TC-02-CLIENT-US',
    role: 'Client (Localized)',
    country: 'US',
    category: 'Corporate Caterers',
    location: 'Troy, NY',
    isMaster: false
  },
  {
    id: 'TC-03-MASTER-US',
    role: 'Master (Territory Sweep)',
    country: 'US',
    category: 'Event Venues',
    location: 'Rensselaer County, NY',
    isMaster: true
  },
  {
    id: 'TC-04-CLIENT-GB',
    role: 'Client (Localized)',
    country: 'GB',
    category: 'Floral Designers',
    location: 'Soho, London',
    isMaster: false
  },
  {
    id: 'TC-05-CLIENT-CA',
    role: 'Client (Localized)',
    country: 'CA',
    category: 'Event Planners',
    location: 'Mississauga, ON',
    isMaster: false
  },
  {
    id: 'TC-06-CLIENT-AU',
    role: 'Client (Localized)',
    country: 'AU',
    category: 'Function Centres',
    location: 'Parramatta, NSW',
    isMaster: false
  },
  {
    id: 'TC-07-CLIENT-AE',
    role: 'Client (Localized)',
    country: 'AE',
    category: 'Luxury Event Organizers',
    location: 'Business Bay, Dubai',
    isMaster: false
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(tc) {
  console.log(`\n======================================================`);
  console.log(`[START] ${tc.id} - ${tc.role}`);
  console.log(`Country: ${tc.country} | Query: "${tc.category}" in "${tc.location}" | Master: ${tc.isMaster}`);
  console.log(`======================================================`);

  try {
    const triggerRes = await axios.post(`${BASE_URL}/api/v2/scrape`, {
      category: tc.category,
      location: tc.location,
      country: tc.country,
      isMaster: tc.isMaster,
      strategy: 'omni'
    }, { timeout: 15000 });

    if (!triggerRes.data || !triggerRes.data.success) {
      console.error(`[FAIL] ${tc.id}: Trigger failed`, triggerRes.data);
      return { ...tc, status: 'FAILED_TRIGGER', error: triggerRes.data };
    }

    const sessionId = triggerRes.data.sessionId;
    console.log(`[DISPATCHED] Session ID: ${sessionId} | Active Engines: ${triggerRes.data.engines?.join(', ')}`);

    // Poll session status for up to 25 seconds
    const start = Date.now();
    let leadCount = 0;
    let finalStatus = 'running';

    while (Date.now() - start < 30000) {
      await sleep(2500);
      try {
        const checkRes = await axios.get(`${BASE_URL}/api/sessions/api_client/${sessionId}`, {
          headers: { 'x-user-id': 'api_client', 'x-workspace-scope': 'master' },
          timeout: 8000
        });
        const sess = checkRes.data?.session || checkRes.data || {};
        leadCount = (sess.leads && sess.leads.length) || (sess.vendors && sess.vendors.length) || Number(sess.leadCount) || 0;
        finalStatus = sess.metadata?.status || sess.status || 'running';
        process.stdout.write(`  ... [${Math.round((Date.now() - start) / 1000)}s] Leads harvested: ${leadCount} | Status: ${finalStatus}\r`);

        if (leadCount >= 10 || finalStatus === 'completed' || finalStatus === 'done') {
          break;
        }
      } catch (err) {
        // Continue polling
      }
    }
    console.log(`\n[RESULT] ${tc.id}: Harvested ${leadCount} leads in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return {
      ...tc,
      sessionId,
      leadCount,
      elapsedSec: ((Date.now() - start) / 1000).toFixed(1),
      status: leadCount > 0 ? 'SUCCESS' : 'NO_LEADS'
    };
  } catch (err) {
    console.error(`[ERROR] ${tc.id}: ${err.message}`);
    return { ...tc, status: 'ERROR', error: err.message };
  }
}

async function main() {
  console.log(`Initiating Global Multi-Country Test Scrape Suite...`);
  console.log(`Server URL: ${BASE_URL}`);

  const results = [];
  for (const tc of TEST_CASES) {
    const res = await runTest(tc);
    results.push(res);
    // Cool down between tests
    await sleep(2000);
  }

  console.log(`\n======================================================`);
  console.log(`FINAL TEST RESULTS SUMMARY`);
  console.log(`======================================================`);
  console.table(results.map(r => ({
    ID: r.id,
    Role: r.role,
    Country: r.country,
    Location: r.location,
    Leads: r.leadCount || 0,
    Duration: `${r.elapsedSec || 0}s`,
    Status: r.status
  })));

  // Query global stats
  const statsRes = await axios.get(`${BASE_URL}/api/v2/stats`);
  console.log(`\nUpdated Database Stats:`, JSON.stringify(statsRes.data, null, 2));
}

main().catch(console.error);
