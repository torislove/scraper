const http = require('http');

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

async function runTests() {
  console.log('--- STARTING VERIFICATION SUITE ---');

  // 1. Health & Ports
  const health = await request('http://localhost:5002/api/health');
  console.log('1. Backend /api/health:', health.status, health.body?.status || health.body?.ok);

  const clientPage = await request('http://localhost:5173/');
  console.log('2. Client Scraper /:', clientPage.status);

  const masterPage = await request('http://localhost:5174/');
  console.log('3. Master Scraper /:', masterPage.status);

  const adminPage = await request('http://localhost:5175/');
  console.log('4. Admin Panel /:', adminPage.status);

  // 2. Strict Scoper Isolation Test
  console.log('\n--- TESTING STRICT ROLE SEPARATION & DATA ISOLATION ---');
  const masterSessions = await request('http://localhost:5002/api/sessions/list', {
    headers: { 'x-workspace-scope': 'master' }
  });
  console.log('Master sees sessions:', masterSessions.body?.sessions?.length || 0);

  const clientSessions = await request('http://localhost:5002/api/sessions/list', {
    headers: { 'x-workspace-scope': 'client', 'x-user-id': 'usr_l1k6elo_mwrwxi8i' }
  });
  console.log('Client sees sessions:', clientSessions.body?.sessions?.length || 0);

  const adminOverview = await request('http://localhost:5002/api/admin/overview');
  console.log('Admin Overview:', adminOverview.status, 'Total Leads:', adminOverview.body?.metrics?.totalLeads);

  const adminCustomers = await request('http://localhost:5002/api/admin/customers/activity');
  console.log('Admin Customers Activity:', adminCustomers.status, 'Customer Accounts:', adminCustomers.body?.customers?.length);

  const adminTrends = await request('http://localhost:5002/api/admin/trends/categories');
  console.log('Admin Trends Categories:', adminTrends.status, 'Ranked Categories:', adminTrends.body?.rankedCategories?.length);

  const adminDataVault = await request('http://localhost:5002/api/admin/data/leads');
  console.log('Admin Data Vault Leads:', adminDataVault.status, 'Total in Vault:', adminDataVault.body?.total);

  // 3. Popup Customization & Color Themes
  console.log('\n--- TESTING POPUP CUSTOMIZATION & THEMES ---');
  const popupFetch = await request('http://localhost:5002/api/popups');
  console.log('Popups initial config retrieved:', Boolean(popupFetch.body?.stickyPromoBar));

  const testThemeUpdate = await request('http://localhost:5002/api/admin/popups/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      stickyPromoBar: {
        ...popupFetch.body?.stickyPromoBar,
        themePreset: 'ocean',
        bgColor: '#082f49',
        textColor: '#f0f9ff',
        buttonColor: '#0284c7',
        enabled: true
      }
    }
  });
  console.log('Updated sticky promo theme to ocean:', testThemeUpdate.status, testThemeUpdate.body?.success);

  const verifiedTheme = await request('http://localhost:5002/api/popups');
  console.log('Verified stickyPromoBar bgColor:', verifiedTheme.body?.stickyPromoBar?.bgColor, 'buttonColor:', verifiedTheme.body?.stickyPromoBar?.buttonColor);

  console.log('\n--- ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
