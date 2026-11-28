// scripts/test_live_instant_scrape.js
const http = require('http');

async function run() {
  const userId = 'client_test_user_' + Date.now();
  console.log(`[Test] 1. Connecting to SSE: http://localhost:5002/api/logs/stream?scope=client&uid=${userId} ...`);
  
  const startTime = Date.now();
  let firstLeadTime = null;
  let leadCount = 0;
  let zoneCount = 0;

  const reqSse = http.request(`http://localhost:5002/api/logs/stream?scope=client&uid=${userId}`, {
    headers: { 'Accept': 'text/event-stream' }
  }, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // keep remainder

      for (const block of lines) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*(\w+)/);
        const dataMatch = block.match(/data:\s*(.+)/s);
        const eventType = eventMatch ? eventMatch[1] : 'message';
        let data = {};
        try {
          data = JSON.parse(dataMatch ? dataMatch[1] : '{}');
        } catch (_) {}

        if (eventType === 'vendor') {
          const v = data.vendor || data;
          if (!firstLeadTime) {
            firstLeadTime = Date.now() - startTime;
            console.log(`[Test] ⚡⚡⚡ FIRST LIVE LEAD RECEIVED in ${firstLeadTime}ms! ⚡⚡⚡`);
          }
          leadCount++;
          const phone = v.mobilePhone || v.phone || 'No phone';
          if (leadCount <= 5 || leadCount % 20 === 0) {
            console.log(`[Test Lead #${leadCount}] ${v.name} | ${v.category} | 📱 ${phone} | Source: ${v.source}`);
          }
        } else if (eventType === 'progress') {
          if (data.activeMandal) {
            console.log(`[Test Zone Progress] Active Zone: "${data.activeMandal}" (${data.overallCompletedMandals || 0}/${data.overallTotalMandals || 0}) | Total Leads: ${data.totalLeads || 0}`);
          }
        } else if (eventType === 'log') {
          const msg = data.message || '';
          if (msg.includes('Google') || msg.includes('Justdial') || msg.includes('Zone')) {
            console.log(`[Test Log] ${msg.trim()}`);
          }
        }
      }
    });
  });

  reqSse.end();

  // Wait 300ms for SSE connection to establish, then trigger scrape
  await new Promise(r => setTimeout(r, 300));

  console.log('[Test] 2. Triggering Auto Scrape: "Restaurants" in "Mumbai City"...');
  const triggerStart = Date.now();
  
  const postData = JSON.stringify({
    category: 'Restaurants',
    location: 'Mumbai City',
    country: 'IN',
    userId,
    headed: false
  });

  const triggerReq = http.request('http://localhost:5002/api/scrape/auto', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-user-id': userId,
      'x-workspace-scope': 'client'
    }
  }, (res) => {
    let respBody = '';
    res.on('data', c => respBody += c);
    res.on('end', () => {
      const planTime = Date.now() - triggerStart;
      console.log(`[Test] Scrape API Responded in ${planTime}ms with HTTP ${res.statusCode}`);
      try {
        const json = JSON.parse(respBody);
        console.log(`[Test] Plan Zones: ${json.plan?.zones?.length || 0} zones generated.`);
      } catch (_) {}
    });
  });

  triggerReq.write(postData);
  triggerReq.end();

  // Watch for 15 seconds
  await new Promise(r => setTimeout(r, 15000));

  console.log(`\n================ TEST SUMMARY ================`);
  console.log(`First Lead Latency : ${firstLeadTime}ms`);
  console.log(`Total Leads Streamed: ${leadCount}`);
  console.log(`==============================================`);

  // Stop scrape session
  http.get('http://localhost:5002/api/scrape/stop', () => {
    process.exit(0);
  });
}

run().catch(console.error);
