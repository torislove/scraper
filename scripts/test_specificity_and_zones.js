'use strict';

/**
 * scripts/test_specificity_and_zones.js
 * End-to-end audit for Generic vs Particular query understanding,
 * zone-to-zone multi-subcategory execution, lead arrangement, and RAM guardrails.
 */

const { getSubvectorsForQuery, resolveNiche, resolveCommodity } = require('../server/src/taxonomy');
const { resolveZones } = require('../server/src/geo');
const orchestrator = require('../server/src/orchestrator');
const store = require('../server/src/store');

async function runAudit() {
  console.log('================================================================');
  console.log('     SCRAPER AUDIT: GENERIC VS PARTICULAR & ZONE-TO-ZONE TEST   ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Generic vs Particular Query Understanding across 4 Focus Countries
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing Generic vs Particular across 4 Countries ---');
  const testCases = [
    // 🇮🇳 India
    { country: 'IN', query: 'Dentists', expectedMode: 'generic' },
    { country: 'IN', query: 'Root canal dentist', expectedMode: 'particular' },
    { country: 'IN', query: 'Catering', expectedMode: 'generic' },
    { country: 'IN', query: 'Brahmin wedding caterer', expectedMode: 'particular' },
    { country: 'IN', query: 'Turmeric', expectedMode: 'particular_commodity' },
    // 🇺🇸 United States
    { country: 'US', query: 'Lawyers', expectedMode: 'generic' },
    { country: 'US', query: 'Personal injury attorney', expectedMode: 'particular' },
    { country: 'US', query: 'Roofers', expectedMode: 'generic' },
    { country: 'US', query: 'Commercial flat roof repair', expectedMode: 'particular' },
    // 🇬🇧 United Kingdom
    { country: 'GB', query: 'Plumbers', expectedMode: 'generic' },
    { country: 'GB', query: 'Gas Safe boiler repair', expectedMode: 'particular' },
    { country: 'GB', query: 'Restaurants', expectedMode: 'generic' },
    { country: 'GB', query: 'Fish and chip shop', expectedMode: 'particular' },
    // 🇦🇺 Australia
    { country: 'AU', query: 'Tradies', expectedMode: 'generic' },
    { country: 'AU', query: 'CEC accredited solar installer', expectedMode: 'particular' },
    { country: 'AU', query: 'Dentists', expectedMode: 'generic' },
    { country: 'AU', query: 'Wisdom teeth removal specialist', expectedMode: 'particular' }
  ];

  for (const tc of testCases) {
    const subvectors = getSubvectorsForQuery(tc.query, tc.country);
    console.log(`[${tc.country}] "${tc.query}" -> ${subvectors.length} subvectors:`);
    console.log(`    Samples: ${subvectors.slice(0, 3).join(' | ')}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Zone-to-Zone Execution & Deduplication Test
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Zone-to-Zone Multi-Subcategory Execution ---');
  const geo = resolveZones('Guntur', 'IN');
  console.log(`City: ${geo.cityName}, Total Configured Zones: ${geo.zones.length}`);
  console.log(`Zone 1: ${geo.zones[0]?.name}, Zone 2: ${geo.zones[1]?.name}, Zone 3: ${geo.zones[2]?.name}`);

  console.log('\nStarting live sweep via orchestrator for "Dentists" in Guntur...');
  const t0 = Date.now();
  const res = await orchestrator.startSweep({
    query: 'Dentists',
    location: 'Guntur',
    country: 'IN',
    maxLeads: 25,
    depth: 1,
    extractEmails: false
  });
  console.log('Sweep initiated:', res.sessionId, 'Status:', res.status);

  // Poll until complete or max 8 seconds
  let elapsed = 0;
  while (elapsed < 8000) {
    await new Promise(r => setTimeout(r, 1000));
    elapsed += 1000;
    const sess = orchestrator.getActiveSession(res.sessionId);
    console.log(`[${elapsed / 1000}s] Leads Harvested: ${sess?.leadsHarvested || 0}, Completed Steps: ${sess?.completedSteps || 0}`);
    if (sess?.status === 'complete' || sess?.leadsHarvested >= 25) break;
  }

  orchestrator.stopSweep(res.sessionId);
  console.log(`Sweep stopped. Total time: ${Date.now() - t0}ms`);

  // Check Store Leads
  const allVendors = store.getAllVendors({ city: 'Guntur' });
  console.log(`Total Leads in Store for Guntur: ${allVendors.length}`);

  // Check RAM Usage
  const mem = process.memoryUsage();
  console.log(`\n--- 3. Memory Footprint ---`);
  console.log(`RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`);
  console.log(`Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);

  console.log('\n================================================================');
  console.log('                      AUDIT COMPLETE                            ');
  console.log('================================================================');
}

runAudit().catch(console.error);
