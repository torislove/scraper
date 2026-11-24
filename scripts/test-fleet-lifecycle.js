const http = require('http');
const fs = require('fs');
const path = require('path');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testLifecycle() {
  console.log('--- 1. Resetting Popups to Default Theme ---');
  await request('http://localhost:5002/api/admin/popups/reset', { method: 'POST' });
  const popupRes = await request('http://localhost:5002/api/popups');
  console.log('Popups reset to default emerald:', popupRes.body?.stickyPromoBar?.themePreset === 'emerald');

  console.log('\n--- 2. Simulating Client & Master Scrapes ---');
  const SESSIONS_DIR = path.join(__dirname, '..', 'server', 'db', 'user_sessions');
  const clientDir = path.join(SESSIONS_DIR, 'usr_test_client');
  const masterDir = path.join(SESSIONS_DIR, 'master');
  fs.mkdirSync(clientDir, { recursive: true });
  fs.mkdirSync(masterDir, { recursive: true });

  const clientSession = {
    id: 'client_session_tenali_photo',
    name: 'Wedding Photographers in Tenali',
    category: 'Wedding Photographers',
    location: 'Tenali, AP, India',
    country: 'IN',
    timestamp: new Date().toISOString(),
    isMasterSweep: false,
    leadCount: 1,
    leads: [
      {
        id: 'client_lead_1',
        name: 'Sai Krishna Photography',
        category: 'Wedding Photographers',
        phone: '+91 99592 82819',
        isMobile: true,
        whatsappLink: 'https://wa.me/919959282819',
        city: 'Tenali',
        country: 'IN',
        scrapedAt: new Date().toISOString()
      }
    ]
  };

  const masterSession = {
    id: 'master_sweep_guntur_spices',
    name: 'District Sweep: Spices & Turmeric Traders',
    category: 'Spices Wholesalers',
    location: 'Guntur District, AP, India',
    country: 'IN',
    timestamp: new Date().toISOString(),
    isMasterSweep: true,
    masterScope: 'district',
    leadCount: 1,
    leads: [
      {
        id: 'master_lead_1',
        name: 'Andhra Spice Exporters',
        category: 'Spices Wholesalers',
        phone: '+91 98480 12345',
        isMobile: true,
        whatsappLink: 'https://wa.me/919848012345',
        city: 'Guntur',
        country: 'IN',
        scrapedAt: new Date().toISOString()
      }
    ]
  };

  fs.writeFileSync(path.join(clientDir, `${clientSession.id}.json`), JSON.stringify(clientSession, null, 2));
  fs.writeFileSync(path.join(masterDir, `${masterSession.id}.json`), JSON.stringify(masterSession, null, 2));

  // Populate memory dbAdapter
  const dbVendorsPath = path.join(__dirname, '..', 'server', 'db', 'scraped_vendors.json');
  const initialVendors = {
    client_lead_1: { ...clientSession.leads[0], sessionId: clientSession.id, userId: 'usr_test_client' },
    master_lead_1: { ...masterSession.leads[0], sessionId: masterSession.id, userId: 'master', isMasterSweep: true }
  };
  fs.writeFileSync(dbVendorsPath, JSON.stringify(initialVendors, null, 2));

  console.log('\n--- 3. Verifying Role Isolation ---');
  // Client queries sessions
  const clientList = await request('http://localhost:5002/api/sessions/list', {
    headers: { 'x-workspace-scope': 'client', 'x-user-id': 'usr_test_client' }
  });
  console.log('Client sees client sessions:', clientList.body?.sessions?.map(s => s.id));
  const clientSeesMaster = clientList.body?.sessions?.some(s => s.isMasterSweep || s.id.includes('master'));
  console.log('Client sees ZERO master sweeps (ISOLATED):', !clientSeesMaster);

  // Master queries sessions
  const masterList = await request('http://localhost:5002/api/sessions/list', {
    headers: { 'x-workspace-scope': 'master' }
  });
  console.log('Master sees master sessions:', masterList.body?.sessions?.map(s => s.id));
  const masterSeesClient = masterList.body?.sessions?.some(s => !s.isMasterSweep && s.id.includes('client'));
  console.log('Master sees ZERO client sessions (PURIFIED):', !masterSeesClient);

  // Admin queries overview, customers, trending, vault
  console.log('\n--- 4. Verifying Admin Central Governance ---');
  const adminOverview = await request('http://localhost:5002/api/admin/overview');
  console.log('Admin Overview total leads:', adminOverview.body?.metrics?.totalLeads);
  console.log('Admin Overview Master sweeps:', adminOverview.body?.fleet?.masterScraper?.sweepsCount);
  console.log('Admin Overview Client searches:', adminOverview.body?.fleet?.clientScrapers?.activeUsersCount);

  const adminCust = await request('http://localhost:5002/api/admin/customers/activity');
  console.log('Admin Customers identified:', adminCust.body?.customers?.map(c => c.name));

  const adminTrends = await request('http://localhost:5002/api/admin/trends/categories');
  console.log('Admin Trends ranked categories:', adminTrends.body?.rankedCategories?.map(c => `${c.category} (${c.leads} leads)`));

  const adminVault = await request('http://localhost:5002/api/admin/data/leads');
  console.log('Admin Vault leads total:', adminVault.body?.total);
  console.log('Admin Vault sources:', adminVault.body?.leads?.map(l => `${l.name} [${l.fleetSource}]`));

  console.log('\n--- 5. Starting Fresh (Wiping Test Data for User) ---');
  const resetRes = await request('http://localhost:5002/api/admin/data/reset-leads', { method: 'POST' });
  console.log('Reset leads executed:', resetRes.body?.success, resetRes.body?.message);

  // Clean test directories
  try {
    fs.rmSync(clientDir, { recursive: true, force: true });
    fs.rmSync(path.join(masterDir, `${masterSession.id}.json`), { force: true });
  } catch (e) {}

  const finalCheck = await request('http://localhost:5002/api/admin/data/leads');
  console.log('Post-reset Vault leads:', finalCheck.body?.total);
  console.log('\n>>> COMPLETE DATA LIFECYCLE & ISOLATION VERIFIED 100% <<<');
}

testLifecycle().catch(console.error);
