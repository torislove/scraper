'use strict';

const diagrams = require('./svgDiagrams');

function imgFigure(screenshots, key, badge, title, subtitle, points = []) {
  const shot = screenshots?.[key];
  const imgTag = shot?.dataUri
    ? `<img src="${shot.dataUri}" alt="${title}" class="shot-img" />`
    : `<div class="shot-missing">Screenshot preview unavailable (${key})</div>`;

  const pointsHtml = points.length
    ? `<div class="shot-points">${points.map((p, i) => `
        <div class="shot-pt">
          <span class="pt-num">${i + 1}</span>
          <div><b>${p.label}:</b> ${p.desc}</div>
        </div>`).join('')}
      </div>`
    : '';

  return `
    <div class="shot-card avoid-break">
      <div class="shot-head">
        <span class="shot-badge">${badge}</span>
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
      </div>
      <div class="shot-frame">${imgTag}</div>
      ${pointsHtml}
    </div>
  `;
}

function analogyBox(title, body, theme = 'emerald') {
  return `
    <div class="analogy-box theme-${theme} avoid-break">
      <div class="analogy-tag">PLAIN-ENGLISH ANALOGY</div>
      <h4>${title}</h4>
      <p>${body}</p>
    </div>
  `;
}

function buildHtmlDocument(screenshots = {}) {
  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="author" content="Kadiyala Manoj & Mannava Praneeth Chowdary" />
  <title>scraper.co.in guide — Complete Architecture, Dashboards & Operations Manual</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 16mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.52;
      font-size: 11.5px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .page-break {
      break-before: page;
      page-break-before: always;
    }

    /* Cover Page */
    .cover {
      border-radius: 22px;
      padding: 36px 34px 32px;
      background: linear-gradient(135deg, #0f172a 0%, #312e81 42%, #065f46 100%);
      color: #ffffff;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
      border: 2px solid #6366f1;
    }
    .cover-kicker {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.22);
      border: 1px solid rgba(52, 211, 153, 0.6);
      color: #a7f3d0;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .cover h1 {
      margin: 0 0 12px;
      font-size: 31px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .cover-sub {
      margin: 0 0 22px;
      font-size: 14px;
      color: #e2e8f0;
      max-width: 680px;
      line-height: 1.55;
    }
    .authors-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      background: rgba(255, 255, 255, 0.11);
      border: 1.5px solid rgba(255, 255, 255, 0.28);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .authors-label {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #fde68a;
      margin-bottom: 3px;
    }
    .authors-names {
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.01em;
    }
    .cover-date {
      text-align: right;
      font-size: 11px;
      color: #cbd5e1;
      font-weight: 700;
    }
    .cover-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .cover-stat {
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 11px 12px;
    }
    .cover-stat b {
      display: block;
      font-size: 18px;
      font-weight: 900;
      color: #34d399;
    }
    .cover-stat span {
      display: block;
      font-size: 10px;
      color: #cbd5e1;
      font-weight: 600;
      margin-top: 2px;
    }

    /* TOC Card */
    .toc-box {
      border-radius: 16px;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      padding: 16px 20px;
      margin-bottom: 18px;
    }
    .toc-box h2 {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 900;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 18px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 9px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .toc-num {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      flex-shrink: 0;
    }

    /* Section Headings */
    .sec-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 18px 0 12px;
      padding: 11px 16px;
      border-radius: 14px;
      color: #ffffff;
    }
    .sec-emerald { background: linear-gradient(135deg, #065f46, #10b981); }
    .sec-indigo  { background: linear-gradient(135deg, #312e81, #6366f1); }
    .sec-cyan    { background: linear-gradient(135deg, #164e63, #06b6d4); }
    .sec-amber   { background: linear-gradient(135deg, #78350f, #f59e0b); }
    .sec-violet  { background: linear-gradient(135deg, #4c1d95, #8b5cf6); }
    .sec-rose    { background: linear-gradient(135deg, #881337, #f43f5e); }
    .sec-slate   { background: linear-gradient(135deg, #0f172a, #334155); }

    .sec-badge {
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.22);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sec-header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 900;
      letter-spacing: -0.01em;
    }
    .sec-header p {
      margin: 2px 0 0;
      font-size: 11px;
      opacity: 0.92;
      font-weight: 500;
    }

    /* Analogy Box */
    .analogy-box {
      border-radius: 14px;
      padding: 13px 16px;
      margin: 10px 0 14px;
      border-left: 6px solid #059669;
    }
    .theme-emerald { background: #ecfdf5; border-color: #059669; }
    .theme-indigo  { background: #eef2ff; border-color: #4f46e5; }
    .theme-amber   { background: #fffbeb; border-color: #d97706; }
    .theme-cyan    { background: #ecfeff; border-color: #0891b2; }
    .theme-rose    { background: #fef2f2; border-color: #e11d48; }
    .theme-violet  { background: #f5f3ff; border-color: #7c3aed; }

    .analogy-tag {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 3px;
    }
    .analogy-box h4 {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .analogy-box p {
      margin: 0;
      font-size: 11.2px;
      color: #334155;
    }

    /* Cards & Grids */
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 10px 0 14px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0 14px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 10px 0 14px;
    }
    .card {
      border-radius: 12px;
      padding: 12px 13px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
    }
    .card-emerald { background: #f0fdf4; border-color: #86efac; }
    .card-indigo  { background: #eef2ff; border-color: #a5b4fc; }
    .card-amber   { background: #fffbeb; border-color: #fcd34d; }
    .card-cyan    { background: #ecfeff; border-color: #67e8f9; }
    .card-rose    { background: #fff1f2; border-color: #fda4af; }
    .card-violet  { background: #f5f3ff; border-color: #c4b5fd; }

    .card h4 {
      margin: 0 0 5px;
      font-size: 12.2px;
      font-weight: 800;
      color: #0f172a;
    }
    .card p, .card li {
      margin: 0;
      font-size: 10.8px;
      color: #334155;
    }
    .card ul {
      margin: 5px 0 0;
      padding-left: 16px;
    }
    .card li { margin-bottom: 3px; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
      font-size: 10.4px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      text-align: left;
      padding: 7px 9px;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 6.5px 9px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    code {
      font-family: "JetBrains Mono", "Consolas", monospace;
      font-size: 9.8px;
      background: #f1f5f9;
      color: #4338ca;
      padding: 1.5px 5px;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
    }

    /* Flowchart Wrapper */
    .diagram-wrap {
      margin: 12px 0 16px;
    }

    /* Dashboard Screenshots */
    .shot-card {
      border-radius: 16px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      padding: 13px;
      margin: 12px 0 16px;
    }
    .shot-head {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }
    .shot-badge {
      background: #4f46e5;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 900;
      padding: 4px 9px;
      border-radius: 999px;
      white-space: nowrap;
      margin-top: 2px;
    }
    .shot-head h3 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .shot-head p {
      margin: 2px 0 0;
      font-size: 10.6px;
      color: #475569;
    }
    .shot-frame {
      border-radius: 11px;
      overflow: hidden;
      border: 1.5px solid #94a3b8;
      background: #ffffff;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    }
    .shot-img {
      display: block;
      width: 100%;
      max-height: 410px;
      object-fit: contain;
      object-position: top center;
      background: #ffffff;
    }
    .shot-ext-row {
      display: grid;
      grid-template-columns: 1.45fr 0.75fr;
      gap: 12px;
      align-items: start;
    }
    .shot-points {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 7px 12px;
      margin-top: 10px;
    }
    .shot-pt {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      padding: 6px 8px;
      font-size: 10.2px;
      color: #334155;
    }
    .pt-num {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #059669;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 800;
    }
    .pill-green { background: #d1fae5; color: #065f46; }
    .pill-blue  { background: #e0e7ff; color: #312e81; }
    .pill-amber { background: #fef3c7; color: #78350f; }
    .pill-rose  { background: #ffe4e6; color: #881337; }
    .step-list {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .step-list li {
      margin-bottom: 5px;
      font-size: 11px;
      color: #1e293b;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover avoid-break">
    <div class="cover-kicker">Scraper.co.in · Complete System &amp; Architecture Manual</div>
    <h1>Deployment, Browser Extension, Search Bar, Zones, Scraping Engines &amp; Dashboards</h1>
    <p class="cover-sub">
      A complete, visual, simple-language handbook explaining every part of the Gomandap / Scraper.co.in platform:
      how deployment works, how the zero-knowledge browser extension protects your code, how the smart search bar &amp; zones work,
      how <code>scrape.js</code> and <code>omniSearchOrchestrator.js</code> run all 4 worker layers across 11 countries, and how Client &amp; Master dashboards work together.
    </p>

    <div class="authors-banner">
      <div>
        <div class="authors-label">Authored &amp; Engineered By</div>
        <div class="authors-names">Kadiyala Manoj &amp; Mannava Praneeth Chowdary</div>
      </div>
      <div class="cover-date">
        Platform Docs · ${generatedOn}<br />
        Stored in <code>docs/</code>
      </div>
    </div>

    <div class="cover-stats">
      <div class="cover-stat"><b>4 Pillars</b><span>Client · Master · Server · Extension</span></div>
      <div class="cover-stat"><b>23 Engines</b><span>100% Keyless · Zero API Fees</span></div>
      <div class="cover-stat"><b>619,287+</b><span>Indian Villages + 11 Countries</span></div>
      <div class="cover-stat"><b>4 Workers</b><span>RAM · Extension · Queue · Browser</span></div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="toc-box avoid-break">
    <h2>Inside This Guide (9 Visual Chapters)</h2>
    <div class="toc-grid">
      <div class="toc-item"><span class="toc-num">1</span> 4-Pillar Platform Overview + Architecture Flowchart</div>
      <div class="toc-item"><span class="toc-num">2</span> Live Dashboards Tour &amp; All Features (With Screenshots)</div>
      <div class="toc-item"><span class="toc-num">3</span> How the Smart Search Bar &amp; NL Parser Work</div>
      <div class="toc-item"><span class="toc-num">4</span> How Zones, Quad-Splits &amp; Boundary Containment Work</div>
      <div class="toc-item"><span class="toc-num">5</span> How Deployment Works (Local, Docker, K8s, Extension Cloud)</div>
      <div class="toc-item"><span class="toc-num">6</span> How the Zero-Knowledge Browser Extension Works</div>
      <div class="toc-item"><span class="toc-num">7</span> Deep Dive: <code>scrape.js</code> (Reception &amp; Traffic Gatekeeper)</div>
      <div class="toc-item"><span class="toc-num">8</span> Deep Dive: <code>omniSearchOrchestrator.js</code> (9-Stage Brain)</div>
      <div class="toc-item"><span class="toc-num">9</span> All 4 Worker Layers, 11 Countries &amp; Master vs. Client</div>
    </div>
  </div>

  <!-- CHAPTER 1 -->
  <div class="sec-header sec-indigo avoid-break">
    <span class="sec-badge">Chapter 1</span>
    <div>
      <h2>4-Pillar Platform Overview</h2>
      <p>How Client, Master, Server, and the Browser Extension connect cleanly</p>
    </div>
  </div>

  ${analogyBox(
    'Think of Scraper.co.in like a Smart Logistics Company',
    'Your <b>Server</b> (<code>server/</code>) is the private headquarters holding all trade secrets, 619,287 Indian village coordinates, and 23 scraping parsers. The <b>Browser Extension</b> (<code>extension/</code>) and <b>Browser RAM Workers</b> act like blind delivery vans using the user’s own internet and laptop memory to fetch raw pages. Meanwhile, customers sit in the <b>Client Room</b> (<code>client/</code>) and you (the operator) sit in the <b>Master Control Room</b> (<code>master/</code>).',
    'indigo'
  )}

  <div class="grid-4 avoid-break">
    <div class="card card-emerald">
      <h4>1. Client App (<code>client/</code>)</h4>
      <p>Port <b>5173</b> (<code>app.scraper.co.in</code>). Customer workspace for city/mandal searches, live radar maps, 52-field lead drawer, WhatsApp CRM, saved folders, and Excel exports.</p>
    </div>
    <div class="card card-indigo">
      <h4>2. Master App (<code>master/</code>)</h4>
      <p>Port <b>5174</b> (<code>master.scraper.co.in</code>). Operator-only command center for district &amp; state sweeps, client credit/pause control, folder imports, engine health, and AI learning.</p>
    </div>
    <div class="card card-violet">
      <h4>3. Server Brain (<code>server/</code>)</h4>
      <p>Port <b>5002</b>. Houses Express routes (<code>scrape.js</code>), 9-stage orchestrator, 23 keyless scrapers, phone parser (<code>libphonenumber-js/max</code>), and JSON vaults.</p>
    </div>
    <div class="card card-amber">
      <h4>4. Extension (<code>extension/</code>)</h4>
      <p>Manifest V3 Chrome/Edge add-on. Contains <b>zero</b> scraping logic or selectors. Runs 30-second HMAC-signed fetch tickets in the user’s browser RAM &amp; residential IP.</p>
    </div>
  </div>

  <div class="diagram-wrap avoid-break">${diagrams.svg4PillarOverview()}</div>

  <!-- CHAPTER 2: DASHBOARDS & SCREENSHOTS -->
  <div class="page-break"></div>
  <div class="sec-header sec-emerald avoid-break">
    <span class="sec-badge">Chapter 2</span>
    <div>
      <h2>Visual Tour of Your Dashboards &amp; All Features</h2>
      <p>Real live screenshots captured from your running Client (:5173), Master (:5174) &amp; Extension UI</p>
    </div>
  </div>

  ${analogyBox(
    'Two Separate Doors Into One Engine',
    'Both websites talk to the exact same backend server on port <b>5002</b>, but customers only ever get the green <b>Client App</b> (locked to cities and mandals), while only you get the indigo <b>Master App</b> (which unlocks state/district sweeps, client management, and live engine diagnostics).',
    'emerald'
  )}

  ${imgFigure(screenshots, '01-client-landing', 'SCREEN 1 · CLIENT LANDING', 'Client Landing Page & Hardware RAM Showcase (http://localhost:5173/)', 'Introduces the 11-country engine, live animated demo scenarios, and 6 Cloud Engines + Browser RAM Extension architecture.', [
    { label: '11-Country Showcase', desc: 'Displays supported markets (IN, US, GB, CA, AU, AE, SG, NZ, IE, ZA, DE) with live typewriter search previews.' },
    { label: '6 Built-in Engines Explained Simply', desc: 'Explains Satellite Pins, Directories, Website Finder, B2B Trade, Open Web/Social, and Excel Deduplication.' },
    { label: 'Hardware RAM Tiers', desc: 'Shows 4GB Eco (3 parallel zones), 8GB Turbo (5 zones), and 16GB+ Ultra Swarm (8 zones).' },
    { label: '30-Second Extension Setup', desc: '1-click ZIP download button and simple reassurance that zero personal tabs or passwords are ever touched.' }
  ])}

  ${imgFigure(screenshots, '02-client-cockpit', 'SCREEN 2 · CLIENT COCKPIT', 'Client Command Center Cockpit (/command?tab=cockpit)', 'Main customer dashboard combining the 11-Country Flag Strip, Smart Search Bar, Live Metrics, and Saved Folders.', [
    { label: '11-Country Flag Strip', desc: 'Locks Google gl, phone prefix (+91/+1/+44), currency, and local directories to the selected country.' },
    { label: 'Smart Search Console', desc: 'Type any free-text query ("plumbers in Vijayawada", "AMD GPU dealer Hyderabad") or press "/" / Ctrl+K.' },
    { label: 'Notification Bell & Credits Pill', desc: 'Displays remaining search credits and real-time broadcast announcements pushed from Master.' },
    { label: 'Recent Folders & KPI Strip', desc: 'Shows total businesses, verified mobile numbers, WhatsApp-ready contacts, and quick folder exports.' }
  ])}

  <div class="page-break"></div>

  ${imgFigure(screenshots, '03-client-leads-drawer', 'SCREEN 3 · LEADS & DRAWER', 'Client Leads Table & 52-Field Deep Profile Drawer (/command?tab=leads)', 'Shows every extracted business with Telecom Validation, Quality Score Ring, CRM Stage, and Deep Contact Enrichment.', [
    { label: 'Mobile (+91) vs Landline (0...)', desc: 'Valid Indian mobiles get green WhatsApp (wa.me) links; STD landlines preserve leading 0 and show Call Only.' },
    { label: '0–100% Quality Score Ring', desc: 'Automatically grades every lead as Premium (>=80%), Standard (>=55%), or Basic based on phone/web/email/rating.' },
    { label: '52-Field Slide-Out Vendor Drawer', desc: 'Click any row to view address, maps pin, emails, Instagram/Facebook, GSTIN, reviews, and run 1-click Deep Enrich.' },
    { label: 'Built-in CRM Pipeline', desc: 'Move leads through New -> Contacted -> Interested -> Converted stages with persistent CRM notes.' }
  ])}

  ${imgFigure(screenshots, '04-client-map-radar', 'SCREEN 4 · SATELLITE MAP', 'Live Satellite Map Radar & Zone Pin Explorer (/command?tab=map)', 'Real-time spatial view displaying coverage zone pockets, active radar sweep target, and clickable business pins.', [
    { label: 'Live Zone Circles', desc: 'Displays named commercial zones and grid cells emitted by omniSearchOrchestrator via SSE.' },
    { label: 'Active Scanning Beacon', desc: 'Automatically flies the map camera to whichever mandal or ward a worker is currently scraping.' },
    { label: 'Sidebar Pin Directory', desc: 'Lists businesses plotted on the map with Phone vs Pin badges; click any item to open its Vendor Drawer.' },
    { label: 'Instant Area Filtering', desc: 'Filter pins by phone presence, minimum star rating, website presence, or specific zone name.' }
  ])}

  <div class="page-break"></div>

  ${imgFigure(screenshots, '05-client-saved-folders', 'SCREEN 5 · SAVED FOLDERS', 'Client Saved Folders & Multi-Format Export Vault (/command?tab=folders)', 'Every search automatically saves into an isolated JSON vault so previous results are never lost when starting a new run.', [
    { label: 'Append-Only Vaults', desc: 'Starting a new search never overwrites old lists; every folder lives inside server/db/user_sessions/<userId>/.' },
    { label: 'City Pills & Search', desc: 'Filter saved lists by city or keyword, rename folders, or merge multiple lists into one master list.' },
    { label: 'God-Level Excel (.xlsx) Export', desc: 'Separates Primary Phone (validated mobiles only) from Secondary Phone (landlines & extra lines) cleanly.' },
    { label: 'CSV & WhatsApp .VCF Export', desc: 'Download instant CSV spreadsheets or direct smartphone .vcf contact books for bulk WhatsApp outreach.' }
  ])}

  ${imgFigure(screenshots, '06-master-sweep-launchpad', 'SCREEN 6 · MASTER SWEEPS', 'Master Command Center & Geo-Coverage Sweep Launchpad (/command?tab=folders)', 'Master-only control room allowing full City, Mandal, District (all villages), and State sweeps across India & 10+ global markets.', [
    { label: 'Client vs Master Folders Sub-Tabs', desc: 'Switch between reviewing your own Master Geo Folders and inspecting Client Search Folders.' },
    { label: '4 Territorial Scopes', desc: 'Choose City (commercial hubs), Mandal (every village), District (up to 2,600 mandals+villages), or State (1,200 zones).' },
    { label: 'Dry-Run Scope Preview', desc: 'Calls /api/scrape/master-sweep/preview to show exact zone count, coverage mode, and honest ETA before start.' },
    { label: 'Post-Sweep Quality Filters', desc: 'Apply minRating, mobileOnly, hasWebsite, and verifiedOnly cleanly after the sweep completes.' }
  ])}

  <div class="page-break"></div>

  ${imgFigure(screenshots, '07-master-engines-board', 'SCREEN 7 · ENGINE BOARD', 'Master Live Engine Health Board (/command?tab=engines)', 'Real-time diagnostics panel showing which of the 23 keyless engines are healthy, resting under cooldown, or rate-limited.', [
    { label: 'Green / Amber / Red Engine Chips', desc: 'Powered by engineHealth.js & safeExecute(); shows latency (ms), last run count, and exact error if a source failed.' },
    { label: 'Queue & Browser Slot Meters', desc: 'Displays active Playwright browser slots vs HTTP worker slots and free server RAM percentage.' },
    { label: 'Politeness & Ban Guard Snapshot', desc: 'Shows requestGuard.js cooldown timers when an engine detects HTTP 429 or CAPTCHA walls.' },
    { label: '1-Click Reset Controls', desc: 'Reset engine health counters via POST /api/scrape/engines/reset after network or proxy updates.' }
  ])}

  ${imgFigure(screenshots, '08-master-learning-center', 'SCREEN 8 · AI LEARNING', 'Master AI Taxonomy Learning Center (/learning)', 'Displays everything the offline AI brain has automatically learned from successful scrapes (zero hallucinations, verified yields only).', [
    { label: '5 Learned Memory Buckets', desc: 'Tracks proven Queries (cap 4,000), Products (1,500), Categories (2,500), Services (2,500), and Brands (800).' },
    { label: 'Zero-Lead Protection Rule', desc: 'taxonomyLearner.js never saves a run that returned 0 leads, keeping autocomplete suggestions 100% high-signal.' },
    { label: 'Real Dealer Expansions', desc: 'Remembers which expanded phrases (e.g. "graphic card dealer") returned real leads and promotes them.' },
    { label: 'Feeds Client & Master Search Bars', desc: 'Learned rows automatically surface as top suggestions on the very next keystroke across both apps.' }
  ])}

  <div class="page-break"></div>

  <div class="shot-card avoid-break">
    <div class="shot-head">
      <span class="shot-badge">SCREEN 9 &amp; 10 · CLIENT DESK &amp; EXTENSION</span>
      <div>
        <h3>Master Client Registry Desk (/clients) &amp; Zero-Knowledge Browser Extension Popup</h3>
        <p>Manage customer accounts, credits, suspension &amp; folder imports on the left; Browser Extension hardware monitor on the right.</p>
      </div>
    </div>
    <div class="shot-ext-row">
      <div class="shot-frame">
        ${screenshots?.['09-master-clients-desk']?.dataUri ? `<img src="${screenshots['09-master-clients-desk'].dataUri}" alt="Master Client Desk" class="shot-img" />` : '<div class="shot-missing">Master Client Desk</div>'}
      </div>
      <div class="shot-frame" style="padding:10px;background:#f5f3ff;">
        ${screenshots?.['10-extension-popup']?.dataUri ? `<img src="${screenshots['10-extension-popup'].dataUri}" alt="Browser Extension Popup" class="shot-img" />` : '<div class="shot-missing">Extension Popup</div>'}
      </div>
    </div>
    <div class="shot-points">
      <div class="shot-pt"><span class="pt-num">1</span><div><b>Plans, Credits &amp; Credentials:</b> Assign Free (1k), Starter (2k), Pro (10k), Agency (50k), or Custom plans and reset client passwords.</div></div>
      <div class="shot-pt"><span class="pt-num">2</span><div><b>Pause / Resume Access Gate:</b> Suspending a client blocks new searches (<code>HTTP 403</code> via <code>clientGate.js</code>) while letting them keep existing folders.</div></div>
      <div class="shot-pt"><span class="pt-num">3</span><div><b>Inspect &amp; Import Client Folders:</b> Pull any client’s saved lists into your Master workspace either <i>Separately</i> or <i>Consolidated</i> (deduped).</div></div>
      <div class="shot-pt"><span class="pt-num">4</span><div><b>Notifications &amp; Extension Status:</b> Broadcast alerts to 1 or all clients; Extension popup shows live hardware RAM/cores &amp; relayed ticket count.</div></div>
    </div>
  </div>

  <!-- CHAPTER 3: HOW THE SEARCH BAR WORKS -->
  <div class="page-break"></div>
  <div class="sec-header sec-cyan avoid-break">
    <span class="sec-badge">Chapter 3</span>
    <div>
      <h2>How the Smart Search Bar Works (End-to-End)</h2>
      <p>From a single keystroke in SearchConsole.jsx to natural-language parsing, typo healing, vault matching &amp; launch</p>
    </div>
  </div>

  ${analogyBox(
    'Like a Bilingual Travel Agent + Spellchecker Inside One Input Box',
    'Users do not need to pick rigid dropdowns or worry about spelling mistakes. Whether someone types <i>"phtgaphers I gntur 10km with phone"</i> or <i>"AMD graphic card in Hyderabad"</i>, the Search Bar repairs spelling typos, extracts filters (radius, phone-only, 4+ stars), looks up our 619,287-village gazetteer, checks if you already searched it before, and launches the exact multi-engine plan in milliseconds.',
    'cyan'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgSearchBarPipeline()}</div>

  <div class="grid-3 avoid-break">
    <div class="card card-emerald">
      <h4>1. Zero-Lag Typing &amp; Shortcuts</h4>
      <ul>
        <li>Press <code>/</code> or <code>Ctrl+K</code> anywhere to focus the search bar instantly.</li>
        <li>Animated typewriter placeholder cycles real examples for the active country.</li>
        <li>Synchronous React <code>draft</code> state + <b>300-entry LRU cache</b> gives <b>0 ms</b> instant responses on backspace or repeat typing.</li>
        <li><b>70 ms debounce</b> + <code>AbortController</code> cancels stale requests on fast typing.</li>
      </ul>
    </div>
    <div class="card card-indigo">
      <h4>2. Smart Dropdown &amp; Vault Bridge</h4>
      <ul>
        <li><b>Empty input:</b> Shows last 5 <i>Recent Searches</i> (per country) + <i>Popular Examples</i>.</li>
        <li><b>Typing (&ge;2 chars):</b> Calls <code>GET /api/search/suggest</code> and splits results into <b>Suggested Searches</b> (left) and <b>Matching Places</b> (right) with <code>&lt;mark&gt;</code> highlights.</li>
        <li><b>Vault Bridge Banner:</b> If a saved folder already matches your query, a green banner offers 1-click <b>Open Saved List</b> so you never waste time or credits!</li>
        <li>Press <code>Tab</code> to autocomplete, <code>Enter</code> to run.</li>
      </ul>
    </div>
    <div class="card card-amber">
      <h4>3. Self-Learning Feedback Loop</h4>
      <ul>
        <li>Whenever you pick a suggestion or press <b>Find Leads</b>, the bar sends <code>POST /api/search/feedback</code>.</li>
        <li><code>taxonomyLearner.js</code> records successful queries, categories, products, services, and brands into <code>learned.json</code>.</li>
        <li><b>"Did You Mean?"</b> banner repairs typos like <code>hydrabad &rarr; Hyderabad</code> or <code>photgraphy &rarr; photography</code> automatically.</li>
      </ul>
    </div>
  </div>

  <div class="card avoid-break">
    <h4>Inside the 7-Step Natural Language Parser (<code>server/src/utils/universalQueryEngine.js</code> &amp; <code>searchSuggest.js</code>)</h4>
    <table>
      <thead>
        <tr><th>Step</th><th>What It Looks For</th><th>Real Input Example</th><th>Clean Output Extracted</th></tr>
      </thead>
      <tbody>
        <tr><td><b>1. Radius Extraction</b></td><td>Matches <code>within/around X km</code> (clamped 1–25 km, default 5 km)</td><td><code>plumbers near Tenali within 12km</code></td><td><code>radius = 12</code></td></tr>
        <tr><td><b>2. Intent Modifiers</b></td><td>Detects <code>with phone</code>, <code>top rated / 4+</code>, <code>urgent / 24/7</code>, <code>wholesale / dealer</code></td><td><code>top rated wholesale steel in Vijayawada</code></td><td><code>minRating: 4.0, isB2B: true</code></td></tr>
        <tr><td><b>3. Fluff Stripping</b></td><td>Removes filler words (<i>"find me", "best", "give me list of"</i>)</td><td><code>please find best dentists in Guntur</code></td><td><code>dentists in Guntur</code></td></tr>
        <tr><td><b>4. Typo &amp; Preposition Fix</b></td><td>Fixes <code>"I" / "n" / "arund" &rarr; "in"</code>, city typos (<code>gntur</code>, <code>vizag</code>, <code>banglore</code>) &amp; trade typos</td><td><code>phtgaphers I gntur</code></td><td><code>Photographers in Guntur</code></td></tr>
        <tr><td><b>5. Landmark Mapping</b></td><td>Checks <code>LANDMARK_DICTIONARY</code> (e.g., <i>Benz Circle, Auto Nagar, Morrispet</i>)</td><td><code>hotels near Benz Circle</code></td><td><code>Benz Circle, Vijayawada</code></td></tr>
        <tr><td><b>6. Brand / Product Expansion</b></td><td>Uses <code>brandIntel.js</code> to expand products into dealer/wholesaler phrases</td><td><code>AMD graphic card Hyderabad</code></td><td><code>graphic card dealer</code> + IndiaMART enabled</td></tr>
        <tr><td><b>7. Live Zone &amp; Tag Compile</b></td><td>Pre-computes zone pockets, OSM tags (<code>craft=plumber</code>) &amp; Wikidata SPARQL classes</td><td><code>plumbers in Vijayawada</code></td><td>Ready = <code>true</code> · Zones previewed live</td></tr>
      </tbody>
    </table>
  </div>

  <!-- CHAPTER 4: ZONES & CONTAINMENT -->
  <div class="page-break"></div>
  <div class="sec-header sec-violet avoid-break">
    <span class="sec-badge">Chapter 4</span>
    <div>
      <h2>How Zones, Adaptive Quad-Splits &amp; Boundary Containment Work</h2>
      <p>Why splitting territories into zones yields 10x–25x more businesses with 0% cross-border noise</p>
    </div>
  </div>

  ${analogyBox(
    'The "Slice the Pizza" Secret',
    'Search engines and maps normally cap a single city search at around 20 to 60 visible listings—hiding 90% of local businesses! Our Zone Engine slices a city, mandal, or district into dozens of small neighborhood pockets and coordinates. Searching each slice separately uncovers almost every shop, and if a slice turns out to be a packed market (&ge;18 leads), the radar slices it again into 4 mini-squares (NE, NW, SE, SW)!',
    'violet'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgZonesAndContainment()}</div>

  <div class="grid-2 avoid-break">
    <div class="card card-cyan">
      <h4>The 4 Zone Types Inside Every Sweep</h4>
      <ul>
        <li><b>1. Named Locality / Ward / Village Zones:</b> High-yield commercial areas (<code>coverageKind: 'locality'</code>). On measured runs, named zones deliver ~97% of fast leads. Sorted <b>Center-Out</b> so Downtown (Zone 1) launches at <code>t=0s</code> with Priority <b>30</b>.</li>
        <li><b>2. Coordinate Grid Lattice Zones:</b> Sweeps outer residential and industrial edges evenly: <code>5&times;5 = 25</code> cells for cities, <code>7&times;7 = 49</code> for counties, <code>10&times;10 = 100</code> for international states, plus <code>3&times;3</code> inner lattices in <i>Deep</i> mode.</li>
        <li><b>3. Adaptive Quad-Split Micro-Zones:</b> Whenever a finished zone returns <b>&ge;18 leads</b>, the orchestrator spawns 4 tighter <b>1.2 km micro-cells</b> (<code>NE, NW, SE, SW</code> at &plusmn;0.0075&deg; lat/lng) up to 16 splits per run!</li>
        <li><b>4. Repeat-Covered Deprioritization:</b> Zones that already yielded 3+ validated mobiles for the same category in the last 24h are never skipped, but queued last at Priority <b>2</b>.</li>
      </ul>
    </div>
    <div class="card card-rose">
      <h4>Strict Territorial Containment &amp; Out-of-Bounds Vault</h4>
      <ul>
        <li><b>District Boundary Circles (<code>isInsideDistrictBoundary</code>):</b> Builds surveyed circular boundaries around every mandal/sub-district in the target district.</li>
        <li><b>Structured Admin Check:</b> Even if GPS coordinates drift slightly, if a business listing explicitly names a neighboring district (e.g. <i>Palnadu</i> or <i>Bapatla</i> during a <i>Guntur</i> sweep), it is rejected.</li>
        <li><b>SAB (Service-Area Business) Guard:</b> Mobile freelancers (e.g. wedding photographers) whose pin sits at a city default are preserved if their address or locality matches the target town.</li>
        <li><b>Zero Silent Data Loss:</b> Every rejected lead is archived in <code>master_oob_&lt;district&gt;</code> (Out-of-Bounds Vault) so operators can audit or recover them anytime via <code>/api/scrape/district-audit</code>.</li>
      </ul>
    </div>
  </div>

  <table class="avoid-break">
    <thead>
      <tr><th>Scope Level</th><th>Client App (:5173)</th><th>Master App (:5174)</th><th>What Gets Scraped</th><th>Max Zone Cap</th></tr>
    </thead>
    <tbody>
      <tr><td><b>City / Town / Locality</b></td><td><span class="pill pill-green">Allowed</span></td><td><span class="pill pill-blue">Allowed</span></td><td>Commercial hubs, wards, authoritative clusters + optional GPS lattice</td><td>Client: 400 (auto) · Master: 80 (policy)</td></tr>
      <tr><td><b>Mandal / Tehsil / Taluk</b></td><td><span class="pill pill-green">Allowed</span></td><td><span class="pill pill-blue">Allowed</span></td><td>Sub-district HQ + <b>every revenue village</b> inside that mandal</td><td>Client: 400 · Master: 400</td></tr>
      <tr><td><b>District / County</b></td><td><span class="pill pill-rose">Blocked (403)</span></td><td><span class="pill pill-blue">Master Only</span></td><td>District HQ + all mandals + every revenue village (India) or curated/7&times;7 lattice (Global)</td><td>Master: <b>2,600 zones</b></td></tr>
      <tr><td><b>State / Province</b></td><td><span class="pill pill-rose">Blocked (403)</span></td><td><span class="pill pill-blue">Master Only</span></td><td>All districts + every sub-district (India) or 10&times;10 bbox lattice (Global)</td><td>Master: <b>1,200 zones</b></td></tr>
    </tbody>
  </table>

  <!-- CHAPTER 5: DEPLOYMENT -->
  <div class="page-break"></div>
  <div class="sec-header sec-slate avoid-break">
    <span class="sec-badge">Chapter 5</span>
    <div>
      <h2>How Deployment Works (All 4 Environments)</h2>
      <p>From 1-command laptop development to Docker Compose, Kubernetes Clusters &amp; Zero-Knowledge Extension Cloud</p>
    </div>
  </div>

  ${analogyBox(
    'Two Ways to Pay for Cloud Power: Server Browsers vs. Extension-Only Cloud',
    'Running headless Chrome browsers on cloud servers is expensive (300–500 MB RAM per browser) and datacenter IPs get CAPTCHAs easily. That is why your project includes <b>Extension-Only Production Mode (<code>SCRAPER_EXTENSION_ONLY=true</code>)</b>: in Docker/Kubernetes, your server uses <b>0 browsers</b> (1–2 GB RAM serves 500+ users!) while each customer’s own Chrome Extension fetches pages using their residential IP and laptop RAM.',
    'amber'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgDeploymentModes()}</div>

  <div class="grid-2 avoid-break">
    <div class="card card-emerald">
      <h4>Mode 1 &amp; 2: Local Dev &amp; Docker Compose</h4>
      <ul>
        <li><b>Local Development:</b> Run <code>npm run dev -- --all</code> or <code>START_ALL.bat</code>. <code>dev.js</code> launches Server (<code>:5002</code>), Client (<code>:5173</code>), and Master (<code>:5174</code>).</li>
        <li><b>Docker Compose (<code>docker-compose.prod.yaml</code>):</b> Builds 3 hardened containers:
          <br/>&bull; <code>scraper-server</code> (<code>Dockerfile.server</code>, <code>node:20-bookworm-slim</code>, non-root <code>USER node</code>, <code>dumb-init</code>, <code>shm_size: 1gb</code>, persistent volumes <code>scraper_production_data</code> &amp; <code>scraper_production_db</code>).
          <br/>&bull; <code>scraper-client</code> (<code>Dockerfile.client</code> -> Nginx 1.27 Alpine on port <code>8081:80</code>).
          <br/>&bull; <code>scraper-master</code> (<code>Dockerfile.master</code> -> Nginx 1.27 Alpine on port <code>8082:80</code>).</li>
      </ul>
    </div>
    <div class="card card-indigo">
      <h4>Mode 3 &amp; 4: Kubernetes Cluster &amp; Serverless Path</h4>
      <ul>
        <li><b>Live K8s Manifests (<code>k8s/</code>):</b> <code>ingress.yaml</code> routes <code>app.scraper.co.in</code>, <code>master.scraper.co.in</code>, and <code>api.scraper.co.in</code> with <code>proxy-buffering: off</code> (critical so SSE never stalls!). <code>hpa.yaml</code> autoscales frontend pods (2–6 replicas).</li>
        <li><b>Single-Writer Protection:</b> <code>server-deployment.yaml</code> intentionally keeps <code>replicas: 1</code> and <code>strategy: Recreate</code> because current <code>scraped_vendors.json</code> uses a single-process <code>.store.lock</code>.</li>
        <li><b>Phase-2 Scale-Out (<code>DEPLOYMENT-PLAN.md</code>):</b> Moves leads/jobs into Postgres (with <code>client_id</code> RLS + <code>scraper_master BYPASSRLS</code>), Redis pub/sub SSE, a Job-Controller spawning 1 K8s Job pod per scrape, and an Egress Gateway rate-limiter.</li>
        <li><b>Firebase / Cloud Run option (<code>firebase.json</code>):</b> Static hosting + Cloud Run Jobs alternative.</li>
      </ul>
    </div>
  </div>

  <!-- CHAPTER 6: BROWSER EXTENSION -->
  <div class="page-break"></div>
  <div class="sec-header sec-amber avoid-break">
    <span class="sec-badge">Chapter 6</span>
    <div>
      <h2>How the Zero-Knowledge Browser Extension Works</h2>
      <p>Protecting 100% of your proprietary code &amp; IP while borrowing the customer’s RAM and residential IP</p>
    </div>
  </div>

  ${analogyBox(
    'The Blind Courier Envelope Pattern',
    'Imagine you own a secret recipe book. Instead of giving competitors your recipes inside a Chrome Extension (which anyone can unzip and read!), your extension is a <b>90-line Blind Courier</b>. Your server hands it a sealed envelope containing a temporary URL ticket (valid for 30 seconds). The extension fetches the raw webpage using the user’s computer, returns the raw text to your server, and immediately erases its memory. All 23 parsers, CSS selectors, and 619k village maps never leave your private server.',
    'amber'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgExtensionZeroKnowledge()}</div>

  <table class="avoid-break">
    <thead>
      <tr><th>File / Component</th><th>Role in Plain English</th><th>Security &amp; Technical Guardrails</th></tr>
    </thead>
    <tbody>
      <tr><td><code>extension/manifest.json</code></td><td>Chrome / Edge Manifest V3 definition</td><td>Only requests <code>storage</code> permission + host access; injects bridge only on <code>scraper.co.in</code> &amp; <code>localhost</code>.</td></tr>
      <tr><td><code>extension/contentBridge.js</code></td><td>0ms Handshake Bridge inside the webpage</td><td>Sets <code>dataset.scraperExtension = '1.0.0'</code>, answers <code>SCRAPER_EXT_PING</code>, forwards tickets via <code>window.postMessage</code>.</td></tr>
      <tr><td><code>extension/background.js</code></td><td>Blind Fetch Service Worker</td><td>Executes <code>fetch(targetUrl)</code> with <code>credentials: 'omit'</code>, 2–20s timeout, <b>750,000-char body cap</b>; wipes RAM immediately.</td></tr>
      <tr><td><code>extension/popup.html / .js</code></td><td>Mini Hardware Status Card</td><td>Displays green <code>CONNECTED · READY</code> pill, RAM/CPU cores, total relayed tasks, and 1-click Workspace launch.</td></tr>
      <tr><td><code>server/src/services/extensionRelayHub.js</code></td><td>Ticket Signer &amp; ZIP Packager</td><td>Signs <b>HMAC-SHA256</b> tickets (30s TTL), tracks <b>90s heartbeats</b>, verifies via <code>crypto.timingSafeEqual</code>, and builds the downloadable <code>.zip</code> with zero external dependencies (built-in CRC32 + deflate PKZIP!).</td></tr>
    </tbody>
  </table>

  <!-- CHAPTER 7: SCRAPE.JS -->
  <div class="page-break"></div>
  <div class="sec-header sec-rose avoid-break">
    <span class="sec-badge">Chapter 7</span>
    <div>
      <h2>Deep Dive: How <code>scrape.js</code> Works (The Gatekeeper)</h2>
      <p>Every endpoint, security guard, credit rule, surgical stop &amp; crash-resume flow inside <code>server/src/routes/scrape.js</code></p>
    </div>
  </div>

  ${analogyBox(
    'The Airport Check-In & Air-Traffic Control Desk',
    '<code>scrape.js</code> does not scrape websites itself. Instead, every button click in the Client or Master UI calls <code>scrape.js</code> first. It checks your passport (Client vs Master role), checks your ticket balance (Credits), checks if your Browser Extension is plugged in (in Cloud Extension-Only mode), creates an empty folder immediately, returns HTTP 200 in milliseconds so the screen never freezes, and hands the mission over to the Orchestrator.',
    'rose'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgScrapeJsRouter()}</div>

  <table class="avoid-break">
    <thead>
      <tr><th>Endpoint / Helper in <code>scrape.js</code></th><th>Who Calls It</th><th>What It Does Simply</th></tr>
    </thead>
    <tbody>
      <tr><td><code>registerTask()</code> + <code>safeExecute()</code></td><td>Internal boot</td><td>Registers all 23 scrapers + <code>scrapeOmniOrchestrator</code> with <code>queue.js</code>; records timing, lead count &amp; errors to <code>engineHealth.js</code> and <code>requestGuard.js</code>.</td></tr>
      <tr><td><code>POST /api/scrape/auto</code> &amp; <code>/omni</code></td><td>Client &amp; Master</td><td>Parses NL query, checks Extension-Only mode (<code>428</code> if missing), blocks Clients from Indian districts/states on <code>/omni</code> (<code>403</code>), checks <code>creditsPreflight</code> (<code>402</code> if 0 credits; <b>searching is free, 1 credit = 1 NEW lead</b>), caps Client zones at 400 (Master 2,600), and enqueues orchestrator.</td></tr>
      <tr><td><code>POST /api/scrape/master-sweep/preview</code> &amp; <code>/master-sweep</code></td><td>Master Only</td><td>Requires <code>x-workspace-scope: master</code>. Builds full India gazetteer plan (<code>buildScopeZones</code>) or global lattice (<code>buildCountrySweepPlan</code>) + applies post-sweep filters.</td></tr>
      <tr><td><code>POST /api/scrape/stop</code> (<code>/stop-all</code>)</td><td>Client &amp; Master</td><td><b>Surgical Abort:</b> Only stops the requested <code>sessionId</code> (a Client cannot stop another client or a Master sweep!). Clears queued jobs, closes idle browsers, and saves all collected leads with an <code>Aborted</code> badge.</td></tr>
      <tr><td><code>POST /api/scrape/resume</code></td><td>Client &amp; Master</td><td>Reads <code>completedZoneNames</code> &amp; <code>completedZoneIndices</code> from disk vault JSON, filters out finished zones, rebuilds district boundaries, and re-queues only unfinished zones.</td></tr>
      <tr><td><code>POST /api/scrape/enrich-now</code> &amp; <code>/deep-enrich</code></td><td>Client &amp; Master</td><td><code>/enrich-now</code> triggers 8-worker mobile backfill (<code>backfillPhones</code>); <code>/deep-enrich</code> runs 6 parallel workers using <code>fastWebsiteExtract</code> for emails, Instagram, Facebook, LinkedIn &amp; GSTIN.</td></tr>
      <tr><td><code>POST /api/scrape/district-audit</code></td><td>Master Only</td><td>Audits any saved district folder against sub-district boundary circles and safely moves out-of-district leads to <code>outOfBoundsVault</code> (supports <code>dryRun: true</code>).</td></tr>
      <tr><td><code>GET /zone-plan</code> &amp; <code>POST /client-ingest</code></td><td>Browser RAM Worker</td><td>Serves up to 48 zones in &lt;10 ms to the user’s Web Worker and ingests up to 200 deduplicated leads per batch straight into the live session.</td></tr>
      <tr><td><code>/extension-*</code> &amp; <code>/relay-result</code></td><td>Extension Bridge</td><td>Handles 90s heartbeats, distributes up to 4 HMAC tickets per poll, validates returned payloads, and serves the downloadable extension <code>.zip</code>.</td></tr>
    </tbody>
  </table>

  <!-- CHAPTER 8: OMNISEARCHORCHESTRATOR.JS -->
  <div class="page-break"></div>
  <div class="sec-header sec-indigo avoid-break">
    <span class="sec-badge">Chapter 8</span>
    <div>
      <h2>Deep Dive: <code>omniSearchOrchestrator.js</code> (The 9-Stage Brain)</h2>
      <p>How one search coordinates 23 engines, streams leads in 1.2s, splits hotspots, verifies phones &amp; trains AI</p>
    </div>
  </div>

  ${analogyBox(
    'The Orchestra Conductor',
    'While <code>scrape.js</code> welcomes the request, <code>omniSearchOrchestrator.js</code> conducts the entire symphony across 9 clear stages: translating product terms into dealer phrases, sending an instant 1-second HTTP scout wave so your screen lights up immediately, dispatching Google Maps &amp; directory workers in Center-Out waves, splitting busy neighborhoods into 4 sub-squares, filtering out wrong cities, hunting missing phone numbers across peers, and writing a clean, deduplicated Excel-ready folder.',
    'indigo'
  )}

  <div class="diagram-wrap avoid-break">${diagrams.svgOrchestrator9Stage()}</div>

  <div class="grid-3 avoid-break">
    <div class="card card-indigo">
      <h4>Stages 1–3: Prep &amp; 0ms Geo</h4>
      <ul>
        <li><b>Stage 1 (Intent):</b> Expands products/brands into directory dealer phrases (e.g. <i>"graphic card dealer"</i>) without mangling services.</li>
        <li><b>Stage 2 (Instant Vault):</b> Creates <code>&lt;sessionId&gt;.json</code> on disk, starts 4-worker <code>streamingEnricher</code>, drops stale crashed jobs without hurting other live sessions.</li>
        <li><b>Stage 3 (0ms Geo):</b> Looks up <code>ZONE_COORDINATES</code> / <code>indiaGeoIndex</code>, builds global lattices if outside India, corrects anchor drift, and sorts zones <b>Center-Out</b>.</li>
      </ul>
    </div>
    <div class="card card-amber">
      <h4>Stages 4–6: Burst &amp; Swarm</h4>
      <ul>
        <li><b>Stage 4 (Radar + Tier-0):</b> Emits map grid at <code>t=0s</code> and fires <code>OSM Overpass</code>, <code>Web Discovery</code>, <code>Wikidata</code> &amp; <code>Trustpilot</code> immediately for &lt;1.2s first leads!</li>
        <li><b>Stage 5 (Scope &amp; Queue):</b> <code>planScopeEngines</code> runs JustDial once/city (6–8 centers on district/state sweeps). Zones queue at Priority <code>30</code> down to <code>2</code>.</li>
        <li><b>Stage 6 (Monitor + Split):</b> 1s loop computes blended ETA (60% recent + 40% overall), auto-splits &ge;18-lead hotspots into 4 <code>1.2km</code> cells, and saves live checkpoints every 6 ticks.</li>
      </ul>
    </div>
    <div class="card card-emerald">
      <h4>Stages 7–9: Clean &amp; Learn</h4>
      <ul>
        <li><b>Stage 7 (Containment):</b> Runs district boundary circles, client city filter, and category fidelity filter (<code>categoryFidelity.js</code>), archiving rejects to OOB vault.</li>
        <li><b>Stage 8 (Contact Mesh):</b> Cross-matches missing phones against DB peers, runs SERP phone dorking (up to 15 leads), and targeted place backfill (6x workers).</li>
        <li><b>Stage 9 (Telecom &amp; Learn):</b> <code>libphonenumber-js/max</code> splits Mobiles (<code>+91</code> + <code>wa.me</code>) vs STD Landlines (<code>0...</code>), assigns 0–100% score, carries forward client repeats free, trains <code>taxonomyLearner.js</code>, and starts 300-lead deep profile extraction.</li>
      </ul>
    </div>
  </div>

  <!-- CHAPTER 9: WORKERS, 11 COUNTRIES & MASTER VS CLIENT -->
  <div class="page-break"></div>
  <div class="sec-header sec-emerald avoid-break">
    <span class="sec-badge">Chapter 9</span>
    <div>
      <h2>All 4 Worker Layers, 11 Countries &amp; Master vs. Client Guide</h2>
      <p>How concurrency auto-tunes to RAM, how all 23 engines map to 11 countries, and exact Master vs. Client capabilities</p>
    </div>
  </div>

  <div class="diagram-wrap avoid-break" style="margin:6px 0 8px;">${diagrams.svgWorkersAnd11Countries()}</div>

  <div class="grid-2 avoid-break" style="margin:6px 0 8px;">
    <div class="card card-violet">
      <h4>Server Queue &amp; Fair-Share Round-Robin (<code>queue.js</code> &amp; <code>browserBudget.js</code>)</h4>
      <ul>
        <li><b>Atomic Crash-Safe Queue:</b> Saves <code>jobs.json</code> via temp-file + rename so sudden shutdowns never corrupt the queue.</li>
        <li><b>Playwright vs HTTP Split:</b> Tracks heavy Playwright jobs separately from lightweight HTTP jobs (12 HTTP slots, dropping to 5 if free RAM &lt; 20%).</li>
        <li><b>Fair-Share Scheduler (<code>activeSlotsBySession</code>):</b> Gives every active search a fair turn! A 1,200-zone Master district sweep will never starve a Customer’s 20-zone city search.</li>
        <li><b>Auto RAM Browser Budget:</b> Scales total browser slots by system RAM (<code>&ge;15.5GB &rarr; 8–10 slots</code>, <code>&ge;12GB &rarr; 6–8</code>, <code>&ge;7GB &rarr; 5</code>, <code>&lt;7GB &rarr; 3</code>, critical &lt;600MB free &rarr; 1), always reserving 1–2 slots for real-time phone enrichment.</li>
      </ul>
    </div>
    <div class="card card-cyan">
      <h4>Client Browser RAM Worker Tiers (<code>deviceRamEngine.js</code>)</h4>
      <ul>
        <li><b>Eco Mode (4 GB RAM / 2–4 Cores):</b> Runs <b>3 Parallel Zones</b> inside an in-browser Web Worker (~55–85 leads/min). Smooth on everyday laptops.</li>
        <li><b>Turbo Mode (8 GB RAM / 4–8 Cores):</b> Runs <b>5 Parallel Zones</b> in browser memory (~120–170 leads/min). Ideal for agencies.</li>
        <li><b>Ultra Swarm (16 GB+ RAM / 8+ Cores):</b> Runs <b>8 Parallel Zones</b> simultaneously (~240–320+ leads/min).</li>
        <li><b>How It Works:</b> Spawns a Blob Web Worker that pulls <code>/api/scrape/zone-plan</code>, queries OpenStreetMap Nominatim directly from user RAM, deduplicates via <code>Set()</code>, and streams results to <code>/api/scrape/client-ingest</code>.</li>
      </ul>
    </div>
  </div>

  <h3 style="margin:6px 0 4px;font-size:12.5px;font-weight:800;color:#0f172a;">All 11 Countries &amp; 23 Keyless Scraping Engines (<code>countryEngineMap.js</code> &amp; <code>LandingV2.jsx</code>)</h3>
  <table class="avoid-break" style="margin:4px 0 6px;font-size:9.6px;">
    <thead>
      <tr><th>Code</th><th>Country &amp; Phone</th><th>Admin Hierarchy (Top &rarr; Local)</th><th>Geo Planning Method</th><th>Active Keyless Engines Dispatched</th></tr>
    </thead>
    <tbody>
      <tr><td><b>IN</b></td><td>India (<code>+91</code> · INR)</td><td>State &rarr; District &rarr; Mandal &rarr; Village</td><td>619,287-Village Offline Gazetteer</td><td>Google Places, Local Finder, OSM, <b>JustDial</b>, <b>IndiaMART</b>, WeddingBazaar, WeddingWire, Web Discovery, Social Dork</td></tr>
      <tr><td><b>US</b></td><td>United States (<code>+1</code> · USD)</td><td>State &rarr; County &rarr; City</td><td>Curated Cities + BBox Lattice</td><td>Google Places, Local Finder, OSM, <b>Yelp</b>, YellowPages Global, Cylex, Bing Places, TripAdvisor, Web Discovery, Wikidata, Social Dork Intl, Trustpilot</td></tr>
      <tr><td><b>GB</b></td><td>United Kingdom (<code>+44</code> · GBP)</td><td>Nation &rarr; County &rarr; Borough/Town</td><td>Curated Boroughs + BBox Lattice</td><td>Google Places, Local Finder, OSM, Yell UK (YellowPages Global), <b>FreeIndex UK</b>, Cylex, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>CA</b></td><td>Canada (<code>+1</code> · CAD)</td><td>Province &rarr; Census Division &rarr; City</td><td>Curated Subdivisions + Lattice</td><td>Google Places, Local Finder, OSM, Yelp, YP Canada, Cylex, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>AU</b></td><td>Australia (<code>+61</code> · AUD)</td><td>State &rarr; LGA &rarr; Suburb</td><td>Curated LGAs + BBox Lattice</td><td>Google Places, Local Finder, OSM, Yelp, YP Australia, Cylex, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>AE</b></td><td>UAE (<code>+971</code> · AED)</td><td>Emirate &rarr; Municipality &rarr; Area</td><td>7 Emirates + BBox Lattice</td><td>Google Places, Local Finder, OSM, YP UAE, Cylex, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>SG</b></td><td>Singapore (<code>+65</code> · SGD)</td><td>Region &rarr; Planning Area</td><td>Planning Areas + Lattice</td><td>Google Places, Local Finder, OSM, YP Singapore, Cylex, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>NZ</b></td><td>New Zealand (<code>+64</code> · NZD)</td><td>Region &rarr; District &rarr; Town</td><td>Curated Towns + Lattice</td><td>Google Places, Local Finder, OSM, YP New Zealand, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>ZA</b></td><td>South Africa (<code>+27</code> · ZAR)</td><td>Province &rarr; Municipality &rarr; Town</td><td>Curated Metros + Lattice</td><td>Google Places, Local Finder, OSM, YP South Africa, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>IE</b></td><td>Ireland (<code>+353</code> · EUR)</td><td>Province &rarr; County &rarr; Town</td><td>Curated Counties + Lattice</td><td>Google Places, Local Finder, OSM, <b>GoldenPages IE</b>, Bing Places, TripAdvisor, Web, Wikidata, Social Intl, Trustpilot</td></tr>
      <tr><td><b>MY / DE</b></td><td>Malaysia (<code>+60</code>) &amp; Germany (<code>+49</code>)*</td><td>State/Bundesland &rarr; District &rarr; City</td><td>Curated Hubs + BBox Lattice</td><td>Google Places, Local Finder, OSM, YP Malaysia / Cylex DE, Bing Places, TripAdvisor, Web Discovery, Wikidata, Social Intl, Trustpilot</td></tr>
    </tbody>
  </table>
  <p style="font-size:9.8px;color:#475569;margin-top:-8px;">*Note: <code>countryEngineMap.js</code> defines explicit regional engine profiles for 11 markets (<code>IN, US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY</code>) plus a global fallback for any ISO country including <code>DE</code> (featured in the Client Landing UI <code>LOCKED_11_CODES</code>).</p>

  <div class="diagram-wrap avoid-break" style="margin:6px 0 8px;">${diagrams.svgMasterVsClient()}</div>

  <div class="analogy-box theme-emerald avoid-break" style="margin:6px 0 0;padding:10px 14px;">
    <div class="analogy-tag">DOCUMENTATION SUMMARY · PREPARED BY KADIYALA MANOJ &amp; MANNAVA PRANEETH CHOWDARY</div>
    <h4>Everything You Need to Operate, Scale &amp; Explain Scraper.co.in</h4>
    <p>
      This handbook lives permanently in <code>docs/scraper.co.in guide.pdf</code> (alongside <code>.html</code> and <code>.md</code>).
      To refresh screenshots and rebuild the PDF anytime after future UI updates, run <code>node scripts/generate-architecture-pdf.js</code>.
    </p>
  </div>

</body>
</html>`;
}

function buildMarkdownDocument() {
  return `# scraper.co.in guide — Complete Architecture, Dashboards & Operations Manual

> **Authors:** Kadiyala Manoj & Mannava Praneeth Chowdary
> **Companion Visual PDF:** [scraper.co.in guide.pdf](./scraper.co.in%20guide.pdf) | [scraper.co.in guide.html](./scraper.co.in%20guide.html)

---

## 1. The 4-Pillar System Overview

Think of the platform like a **Smart Logistics Company**:
1. **\`server/\` (Port 5002 — The Private Cloud Brain):** Holds all 23 scraping parsers, CSS selectors, regexes, the 619,287-village Indian gazetteer, AI brand/product intelligence, and JSON data vaults (\`server/data/\` & \`server/db/\`).
2. **\`client/\` (Port 5173 — Customer Control Room):** Customer-facing app (\`app.scraper.co.in\`) for city/mandal searches, live radar maps, 52-field lead drawer, WhatsApp CRM, saved folders, and Excel/CSV/VCF exports.
3. **\`master/\` (Port 5174 — Operator Control Room):** Restricted operator dashboard (\`master.scraper.co.in\`) for District & State sweeps (up to 2,600 zones), Client Desk (\`/clients\`), Engine Health Board, and AI Learning Center (\`/learning\`).
4. **\`extension/\` (Zero-Knowledge Browser Extension):** Manifest V3 Chrome/Edge add-on containing **zero** scraping engines or selectors — executes 30-second HMAC-signed fetch tickets in the customer's browser RAM & residential IP.

---

## 2. Live Dashboards & All Features

Captured live screenshots stored in \`docs/screenshots/\`:
- \`01-client-landing.png\` — Client Landing Page, 11-country showcase, 6 engines, and RAM hardware tiers.
- \`02-client-cockpit.png\` — Client Command Center Cockpit (\`/command?tab=cockpit\`), 11-Country Flag Strip, Smart Search Console, Notification Bell, Credits Pill, and KPI summary.
- \`03-client-leads-drawer.png\` — Leads Table with \`+91\` Mobile vs \`0...\` STD Landline badges, 0–100% Quality Score Ring, CRM stages, and 52-field Vendor Drawer.
- \`04-client-map-radar.png\` — Live Satellite Map Radar with zone circles, active scanning highlight, and sidebar directory.
- \`05-client-saved-folders.png\` — Append-only Saved Folders with city filters, merge/rename, Excel (\`.xlsx\`), CSV, and WhatsApp \`.vcf\` export.
- \`06-master-sweep-launchpad.png\` — Master Geo-Coverage Sweep Launchpad (\`City / Mandal / District / State\`), dry-run preview, and post-sweep quality filters.
- \`07-master-engines-board.png\` — Live Engine Health Board (\`/command?tab=engines\`) showing Green/Amber/Red status chips, latency, and Politeness Guard cooldowns.
- \`08-master-learning-center.png\` — Master AI Learning Center (\`/learning\`) showing auto-learned products, services, categories, brands, and queries.
- \`09-master-clients-desk.png\` — Master Client Registry Desk (\`/clients\`) for managing plans, credits, account Pause/Resume, folder inspection/import, and broadcast notifications.
- \`10-extension-popup.png\` — \`RAM Turbo Bridge v1.0.0\` popup showing connection status, detected RAM/CPU, and relayed task count.

---

## 3. How the Search Bar Works (\`SearchConsole.jsx\` + \`searchSuggest.js\` + \`universalQueryEngine.js\`)

1. **Instant UX & Shortcuts:** Press \`/\` or \`Ctrl+K\` to focus. Maintains a **300-entry LRU cache** for 0 ms instant backspace responses and debounces network requests by **70 ms** with \`AbortController\` cancellation.
2. **Saved Folder Vault Bridge:** Before starting a new scrape, checks existing user folders and shows **"ALREADY IN YOUR SAVED LISTS"** with 1-click open so users never waste credits.
3. **7-Step Natural Language Parser (\`universalQueryEngine.js\`):**
   - Extracts explicit radius (\`within 12km\` -> 1–25 km, default 5 km).
   - Extracts modifiers (\`with phone\`, \`top rated / 4+\`, \`urgent / 24/7\`, \`wholesale / dealer\`).
   - Strips conversational fluff (\`"please find best"\`, \`"list all"\`).
   - Repairs typos and shorthand prepositions (\`"phtgaphers I gntur"\` -> \`"Photographers in Guntur"\`).
   - Maps urban landmarks (\`Benz Circle\` -> \`Vijayawada\`, \`Morrispet\` -> \`Tenali\`).
   - Expands products/brands into dealer/wholesaler phrases (\`brandIntel.js\`).
   - Pre-computes zone count, OSM tags, and Wikidata SPARQL classes live.
4. **Self-Learning Loop:** Dispatches \`POST /api/search/feedback\` and records successful lead-returning runs via \`taxonomyLearner.js\` into \`server/data/taxonomy/learned.json\`.

---

## 4. How Zones, Adaptive Quad-Splits & Containment Work

1. **Named Locality / Village Zones (\`locality\` / \`vector\`):** Deliver ~97% of fast leads; sorted **Center-Out** so Downtown / Zone 1 runs first at Priority **30**.
2. **Coordinate Lattice Grids (\`grid\` / \`lattice\`):** \`5x5\` (25 cells) for cities, \`7x7\` (49) for counties, \`10x10\` (100) for international states, and \`3x3\` deep sub-grids.
3. **Adaptive Quad-Split (\`split\`):** Any completed zone yielding **>= 18 leads** automatically subdivides into **4 tighter 1.2 km micro-cells (\`NE, NW, SE, SW\`)** at \`±0.0075°\` (up to 16 splits per run).
4. **Territorial Containment:** District sweeps enforce surveyed sub-district union circles (\`isInsideDistrictBoundary\`) plus structured district/state name validation. Rejected rows go safely to the **Out-of-Bounds Vault (\`master_oob_<district>\`)**, repairable via \`POST /api/scrape/district-audit\`.

---

## 5. How Deployment Works (4 Modes)

1. **Local Dev:** \`npm run dev -- --all\` launches Server (\`:5002\`), Client (\`:5173\`), and Master (\`:5174\`).
2. **Docker Compose (\`docker-compose.prod.yaml\`):** \`scraper-server\` (\`shm_size: 1gb\`, non-root \`node\` user, volumes \`scraper_production_data\` & \`scraper_production_db\`), \`scraper-client\` (\`:8081\`), and \`scraper-master\` (\`:8082\`).
3. **Kubernetes (\`k8s/\` + \`DEPLOYMENT-PLAN.md\`):** Nginx Ingress (\`app.\`, \`master.\`, \`api.scraper.co.in\`) with \`proxy-buffering: "off"\` for SSE, Frontend HPA (2–6 pods), single-writer server Deployment (\`Recreate\`) for v1, plus Phase-2 scale-out (Postgres RLS, Redis queue & pub/sub, K8s Job-per-scrape controller, and Egress Gateway).
4. **Zero-Knowledge Extension-Only Cloud (\`SCRAPER_EXTENSION_ONLY=true\`, \`SCRAPER_BROWSER_SLOTS=0\`):** Runs zero Chromium browsers on the cloud server while customers fetch pages through the Chrome Extension using their own RAM and residential IP (95% server cost reduction).

---

## 6. How the Browser Extension Works (\`extension/\` + \`extensionRelayHub.js\`)

- **Zero Secrets Shipped:** Contains 0 CSS selectors, 0 category dictionaries, 0 geo databases, and 0 parsers.
- **Handshake:** \`contentBridge.js\` announces \`SCRAPER_EXT_PONG\` and forwards tickets via \`window.postMessage\`.
- **Signed Ticket Security:** \`extensionRelayHub.js\` generates **HMAC-SHA256** signed tickets with **30s TTL**, **90s heartbeat TTL**, and timing-safe verification (\`crypto.timingSafeEqual\`).
- **Blind Worker:** \`background.js\` executes \`fetch(targetUrl)\` with \`credentials: 'omit'\`, caps bodies at **750,000 chars**, posts raw bytes to \`POST /api/scrape/relay-result\`, and clears memory immediately.
- **Built-in ZIP Download:** \`GET /api/scrape/extension-download\` packs the extension on the fly using a dependency-free PKZIP generator.

---

## 7. Deep Dive: \`scrape.js\` (\`server/src/routes/scrape.js\`)

- **Task Wrapper:** Registers all 23 scrapers via \`registerTask\` + \`safeExecute()\` updating \`engineHealth\` and \`requestGuard\`.
- **Search Dispatch (\`/auto\`, \`/omni\`):** Enforces Extension-Only gate (\`428\`), Client City/Mandal gate (\`403\` on Indian states/districts), Credit preflight (\`402\` if 0 credits; **1 credit = 1 new lead**), and append-only folder safety.
- **Master Sweeps (\`/master-sweep/preview\`, \`/master-sweep\`):** Restricted to \`x-workspace-scope: master\`; launches up to 2,600 Indian zones or global country lattices with post-sweep filters.
- **Surgical Stop & Smart Resume (\`/stop\`, \`/resume\`):** Aborts only the target \`sessionId\`, saves collected leads with \`Aborted\` status, and resumes strictly from remaining unfinished zones.
- **Enrichment & RAM Workers:** \`/enrich-now\` (8x mobile backfill), \`/deep-enrich\` (6x website contact extraction), \`/district-audit\`, \`/zone-plan\`, and \`/client-ingest\`.

---

## 8. Deep Dive: \`omniSearchOrchestrator.js\`

1. **Intent & Dealer Expansion** (\`categoryRouter\` + \`brandIntel\`)
2. **Instant Vault Open + 4x Streaming Enricher Boot**
3. **0ms Offline Gazetteer / International Lattice + Center-Out Sorting**
4. **Live Radar Grid Broadcast (\`emitGridEvent\`)**
5. **Tier-0 <1.2s Direct HTTP Turbo-Burst** (OSM, Web Discovery, Wikidata, Trustpilot)
6. **Scope Engine Planning (\`planScopeEngines\`) + Priority Queueing (30 -> 2)**
7. **1s Monitor Loop, Blended Sliding ETA & Adaptive Quad-Split (>=18 leads)**
8. **Territorial Containment + Category Fidelity + Out-of-Bounds Archive**
9. **Cooperative Contact Mesh + SERP Phone Dork + \`libphonenumber-js/max\` (\`+91\` Mobile vs \`0...\` STD Landline) + Quality Score + Carry-Forward + \`taxonomyLearner\` + 300x Deep Profile Job**

---

## 9. Workers & 11 Countries

- **4 Worker Layers:**
  1. Server Queue (\`queue.js\`): Atomic \`jobs.json\`, 12 HTTP slots, Fair-Share Round-Robin across sessions.
  2. Browser Budget (\`browserBudget.js\`): Auto-scales Chromium slots (3–10) by RAM + Discovery/Enrichment reserve.
  3. Browser RAM Web Worker (\`deviceRamEngine.js\`): Eco 4GB (3 lanes), Turbo 8GB (5 lanes), Ultra 16GB+ (8 lanes).
  4. Extension Relay Worker (\`extension/background.js\`): Residential IP ticket executor.
- **11 Countries Supported:** \`IN, US, GB (UK), CA, AU, AE, SG, NZ, ZA, IE, MY\` (plus global fallback including \`DE\` Germany featured in the Client UI).
`;
}

module.exports = { buildHtmlDocument, buildMarkdownDocument };
