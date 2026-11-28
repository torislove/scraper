'use strict';

const http = require('http');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Request timeout')));
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function listenToSse(sessionId, onLead, onPoint) {
  const req = http.get(`http://localhost:5002/api/scrape/stream?sessionId=${sessionId}`, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const block of lines) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*([^\n]+)/);
        const dataMatch = block.match(/data:\s*([^\n]+)/);
        const eventType = eventMatch ? eventMatch[1].trim() : 'message';

        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1].trim());
            if (eventType === 'vendor') {
              const lead = data.vendor || data.place || data;
              if (lead && (lead.name || lead.title)) onLead(lead);
            } else if (eventType === 'activePoint') {
              onPoint(data);
            }
          } catch (_) {}
        }
      }
    });
  });

  req.on('error', () => {});
  return { close: () => req.destroy() };
}

async function testSingleCountrySweep({ country, countryName, location, query, maxLeads = 5, timeoutSec = 20 }) {
  console.log(`\n=============================================================================`);
  console.log(`🌍 TESTING NATION: ${countryName} (${country}) | 📍 City: ${location} | 🔎 Query: "${query}"`);
  console.log(`=============================================================================`);

  const t0 = Date.now();
  const streamedLeads = [];
  const pointsSeen = [];

  const startRes = await httpRequest({
    hostname: 'localhost',
    port: 5002,
    path: '/api/scrape/start',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    query,
    location,
    country,
    targetLeads: maxLeads,
    depth: 1,
    extractEmails: false
  });

  if (startRes.status !== 200 || !startRes.body.ok) {
    console.error(`❌ Failed to start sweep:`, startRes.body);
    return { country, countryName, location, query, success: false, error: startRes.body };
  }

  const { sessionId, totalZones, subcategories, hardwareTier } = startRes.body;
  console.log(`🚀 Sweep Active! Session: ${sessionId} | Hardware Tier: ${hardwareTier}`);
  console.log(`🗺️  Municipal Wards: ${totalZones} | 🏷️  Subvectors (${subcategories.length}): [${subcategories.join(', ')}]`);

  const sseConn = listenToSse(
    sessionId,
    (lead) => {
      streamedLeads.push(lead);
      const isMob = lead.isMobile ? ' [MOBILE+WA]' : '';
      console.log(`   ⚡ [LIVE SSE] +1 Lead: "${lead.name}" | 📞 ${lead.phone || 'No phone'}${isMob} | 📍 ${lead.zone || lead.address || 'Locality'}`);
    },
    (point) => {
      pointsSeen.push(point);
      console.log(`   🎯 [WARD HOP] Scanning: ${point.name || point.city} (Ward ${point.zoneIndex}/${point.totalZones})`);
    }
  );

  const deadline = Date.now() + (timeoutSec * 1000);
  while (Date.now() < deadline) {
    if (streamedLeads.length >= maxLeads) break;
    await sleep(500);
  }

  sseConn.close();
  await httpRequest({
    hostname: 'localhost',
    port: 5002,
    path: `/api/scrape/stop?sessionId=${sessionId}`,
    method: 'POST'
  });

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

  const healthRes = await httpRequest({ hostname: 'localhost', port: 5002, path: '/api/health', method: 'GET' });
  const ramMb = healthRes.body?.ramMb || 0;

  console.log(`\n📊 RESULTS FOR ${countryName} - "${query}" in ${location}:`);
  console.log(`   ⏱️  Speed: ${durationSec}s | 📦 Leads Streamed: ${streamedLeads.length} | 🧠 RAM RSS: ${ramMb} MB`);

  if (streamedLeads.length > 0) {
    console.log(`   📋 Sample Dossier:`);
    streamedLeads.slice(0, 2).forEach((lead, i) => {
      console.log(`      [Lead ${i + 1}] ${lead.name}`);
      console.log(`         • Phone: ${lead.phone || 'N/A'} (Mobile: ${lead.isMobile ? 'Yes' : 'No'})`);
      console.log(`         • WhatsApp: ${lead.whatsappLink || 'None'}`);
      console.log(`         • Address: ${lead.address || 'N/A'}`);
      console.log(`         • Source: ${lead.source || 'polyglot'} | Zone: ${lead.zone || 'N/A'}`);
    });
  }

  return {
    country,
    countryName,
    location,
    query,
    zonesCount: totalZones,
    subvectorsCount: subcategories.length,
    leadsCount: streamedLeads.length,
    durationSec,
    ramMb,
    sampleLead: streamedLeads[0] || null,
    success: streamedLeads.length > 0
  };
}

async function runAll() {
  console.log('=============================================================================');
  console.log('⚡ SOVEREIGN 11-NATIONS BENCHMARK: INDIA, CANADA, UAE, AUSTRALIA');
  console.log('=============================================================================');

  const testCases = [
    { country: 'IN', countryName: 'India', location: 'Guntur', query: 'Dentists', maxLeads: 5 },
    { country: 'CA', countryName: 'Canada', location: 'Toronto', query: 'HVAC Contractors', maxLeads: 5 },
    { country: 'AE', countryName: 'United Arab Emirates', location: 'Dubai', query: 'Real Estate Agencies', maxLeads: 5 },
    { country: 'AU', countryName: 'Australia', location: 'Sydney', query: 'Tradies', maxLeads: 5 }
  ];

  const results = [];
  for (const tc of testCases) {
    try {
      const res = await testSingleCountrySweep(tc);
      results.push(res);
      await sleep(1500);
    } catch (err) {
      console.error(`💥 Error in ${tc.countryName}:`, err.message);
      results.push({ ...tc, success: false, error: err.message });
    }
  }

  console.log('\n=============================================================================');
  console.log('🎯 SUMMARY SCORECARD: SOVEREIGN 11 NATIONS FLEET');
  console.log('=============================================================================');
  console.table(results.map(r => ({
    Nation: `${r.countryName} (${r.country})`,
    City: r.location,
    Query: r.query,
    Wards: r.zonesCount || 0,
    Subvectors: r.subvectorsCount || 0,
    'Leads Streamed': r.leadsCount || 0,
    'RAM (MB)': r.ramMb || 0,
    Speed: `${r.durationSec || 0}s`,
    Status: r.success ? '✅ PASS' : '❌ FAIL'
  })));
}

runAll().catch(console.error);
