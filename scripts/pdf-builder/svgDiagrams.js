'use strict';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapLines(text, maxChars) {
  const rawLines = String(text || '').split('\n');
  const out = [];
  for (const raw of rawLines) {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= maxChars) {
        cur = (cur ? cur + ' ' : '') + w;
      } else {
        if (cur) out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

function box(x, y, w, h, fill, stroke, title, sub = '', titleColor = '#0f172a', subColor = '#475569') {
  const maxSubChars = Math.max(18, Math.floor((w - 18) / 5.2));
  const subLines = sub ? wrapLines(sub, maxSubChars).slice(0, 3) : [];
  const maxTitleChars = Math.max(14, Math.floor((w - 16) / 6.6));
  const titleFontSize = title.length > maxTitleChars ? 11 : 12;

  let titleY = y + h * 0.56;
  if (subLines.length === 1) titleY = y + h * 0.42;
  else if (subLines.length === 2) titleY = y + Math.min(24, h * 0.31);
  else if (subLines.length >= 3) titleY = y + Math.min(20, h * 0.25);

  const subStartY = titleY + 14;
  const lineGap = subLines.length >= 3 ? 11.5 : 12.5;
  const subSvg = subLines.length
    ? `<text x="${x + w / 2}" y="${subStartY}" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="9.3" font-weight="600" fill="${subColor}">${subLines
        .map((ln, idx) => `<tspan x="${x + w / 2}" dy="${idx === 0 ? 0 : lineGap}">${esc(ln)}</tspan>`)
        .join('')}</text>`
    : '';

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2" />
      <text x="${x + w / 2}" y="${titleY}" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="${titleFontSize}" font-weight="800" fill="${titleColor}">${esc(title)}</text>
      ${subSvg}
    </g>
  `;
}

function arrow(x1, y1, x2, y2, color = '#475569', label = '', lx = null, ly = null) {
  const mx = lx !== null ? lx : (x1 + x2) / 2;
  const my = ly !== null ? ly : (y1 + y2) / 2 - 6;
  return `
    <g>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.2" marker-end="url(#arr-${color.replace('#', '')})" />
      ${label ? `<rect x="${mx - label.length * 3.0 - 6}" y="${my - 10}" width="${label.length * 6.0 + 12}" height="15" rx="4" fill="#ffffff" stroke="${color}" stroke-width="1" opacity="0.96" /><text x="${mx}" y="${my + 1}" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="9" font-weight="700" fill="${color}">${esc(label)}</text>` : ''}
    </g>
  `;
}

function defsBlock() {
  const colors = ['059669', '4f46e5', '7c3aed', 'd97706', '0891b2', 'e11d48', '475569', '0f172a'];
  return `
    <defs>
      ${colors.map(c => `
        <marker id="arr-${c}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#${c}" />
        </marker>
      `).join('')}
      <linearGradient id="gradBrain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ede9fe" />
        <stop offset="100%" stop-color="#e0e7ff" />
      </linearGradient>
    </defs>
  `;
}

function svg4PillarOverview() {
  return `
  <svg viewBox="0 0 900 415" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 1 — 4-PILLAR MASTER PLATFORM ARCHITECTURE</text>

    ${box(35, 50, 250, 74, '#ecfdf5', '#059669', '1. CLIENT APP (client/)', 'Port 5173 · app.scraper.co.in\nCustomer Workspace & CRM', '#065f46', '#047857')}
    ${box(325, 50, 250, 74, '#eef2ff', '#4f46e5', '2. MASTER APP (master/)', 'Port 5174 · master.scraper.co.in\nOperator Sweeps & Client Desk', '#312e81', '#4338ca')}
    ${box(615, 50, 250, 74, '#fffbeb', '#d97706', '3. BROWSER EXTENSION', 'extension/ · Zero-Knowledge\nBlind RAM & Residential Relay', '#78350f', '#b45309')}

    <rect x="65" y="165" width="770" height="128" rx="16" fill="url(#gradBrain)" stroke="#7c3aed" stroke-width="2.5" />
    <text x="450" y="188" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="13" font-weight="900" fill="#4c1d95">4. PRIVATE SERVER BRAIN (server/ · Port 5002 · Express 5 + Node)</text>
    ${box(85, 202, 175, 74, '#ffffff', '#6d28d9', 'scrape.js Gatekeeper', 'Auth · Scope · Credits\nStop & Resume Routes', '#4c1d95', '#6d28d9')}
    ${box(275, 202, 195, 74, '#ffffff', '#0891b2', 'omniSearchOrchestrator', '9-Stage Zone, Engine\n& Contact Mesh Swarm', '#164e63', '#0e7490')}
    ${box(485, 202, 165, 74, '#ffffff', '#059669', 'queue.js + Budget', 'Fair-Share Round-Robin\n+ Dynamic RAM Slots', '#065f46', '#047857')}
    ${box(665, 202, 150, 74, '#ffffff', '#d97706', 'extensionRelayHub', '30s HMAC Tickets\n+ Built-In PKZIP', '#78350f', '#b45309')}

    ${box(45, 328, 270, 70, '#ecfeff', '#0891b2', '23 Keyless Scrapers (11 Countries)', 'Maps · JustDial · IndiaMART\nYelp · OSM · Wikidata · Web', '#155e75', '#0e7490')}
    ${box(335, 328, 235, 70, '#fef2f2', '#e11d48', 'Offline Geo + AI Brain', '619,287 Villages Gazetteer\nBrand / Product / Typo Intel', '#881337', '#be123c')}
    ${box(590, 328, 270, 70, '#f1f5f9', '#475569', 'Vaults & Storage (data/ + db/)', 'scraped_vendors.json\nuser_sessions/ & learned.json', '#0f172a', '#475569')}

    ${arrow(160, 124, 160, 165, '#059669', 'SSE + REST')}
    ${arrow(450, 124, 450, 165, '#4f46e5', 'x-workspace-scope: master')}
    ${arrow(740, 124, 740, 165, '#d97706', 'Signed Tickets')}
    ${arrow(372, 276, 180, 328, '#0891b2')}
    ${arrow(410, 276, 452, 328, '#e11d48')}
    ${arrow(565, 276, 710, 328, '#475569')}
  </svg>`;
}

function svgDeploymentModes() {
  return `
  <svg viewBox="0 0 900 435" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 2 — ALL 4 DEPLOYMENT MODES & PRODUCTION TRAFFIC ROUTING</text>

    <rect x="25" y="48" width="200" height="170" rx="14" fill="#ecfdf5" stroke="#059669" stroke-width="2" />
    <text x="125" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#065f46">MODE 1: LOCAL DEV</text>
    ${box(40, 82, 170, 38, '#ffffff', '#10b981', 'npm run dev -- --all', 'dev.js / START_ALL.bat', '#065f46')}
    ${box(40, 127, 170, 38, '#ffffff', '#10b981', 'Client :5173 | Master :5174', 'Vite Hot-Reload UI', '#065f46')}
    ${box(40, 172, 170, 38, '#ffffff', '#10b981', 'Express Server :5002', 'Local Chromium + JSON Vault', '#065f46')}

    <rect x="242" y="48" width="205" height="170" rx="14" fill="#eef2ff" stroke="#4f46e5" stroke-width="2" />
    <text x="344" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#312e81">MODE 2: DOCKER PROD</text>
    ${box(257, 82, 175, 38, '#ffffff', '#6366f1', 'scraper-client (:8081)', 'Nginx Alpine + client/dist', '#312e81')}
    ${box(257, 127, 175, 38, '#ffffff', '#6366f1', 'scraper-master (:8082)', 'Nginx Alpine + master/dist', '#312e81')}
    ${box(257, 172, 175, 38, '#ffffff', '#6366f1', 'scraper-server (:5002)', 'shm_size 1GB + Volumes', '#312e81')}

    <rect x="464" y="48" width="205" height="170" rx="14" fill="#fffbeb" stroke="#d97706" stroke-width="2" />
    <text x="566" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#78350f">MODE 3: EXTENSION-ONLY</text>
    ${box(479, 82, 175, 38, '#ffffff', '#f59e0b', 'SCRAPER_EXTENSION_ONLY', 'Dockerfile.server Default = true', '#78350f')}
    ${box(479, 127, 175, 38, '#ffffff', '#f59e0b', 'BROWSER_SLOTS = 0', '0 MB Server Chromium RAM!', '#78350f')}
    ${box(479, 172, 175, 38, '#ffffff', '#f59e0b', '95% Lower Cloud Bill', '500+ Users on 1-2GB Node', '#78350f')}

    <rect x="686" y="48" width="189" height="170" rx="14" fill="#fef2f2" stroke="#e11d48" stroke-width="2" />
    <text x="780" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#881337">MODE 4: SERVERLESS</text>
    ${box(700, 82, 160, 38, '#ffffff', '#f43f5e', 'Firebase Hosting/Auth', 'Firestore onSnapshot Live UI', '#881337')}
    ${box(700, 127, 160, 38, '#ffffff', '#f43f5e', 'Cloud Run Jobs', 'Or GitHub Actions Runner', '#881337')}
    ${box(700, 172, 160, 38, '#ffffff', '#f43f5e', 'Cloud Storage Exports', 'CSV / JSON / Deep Profiles', '#881337')}

    <rect x="25" y="236" width="850" height="182" rx="16" fill="#ecfeff" stroke="#0891b2" stroke-width="2.5" />
    <text x="450" y="258" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12.5" font-weight="900" fill="#164e63">KUBERNETES CLUSTER (k8s/) &amp; PHASE-2 SCALE-OUT ARCHITECTURE</text>

    ${box(45, 274, 195, 64, '#ffffff', '#0891b2', 'NGINX INGRESS + TLS', 'proxy-buffering: off (SSE)\napp. / master. / api.', '#164e63', '#0e7490')}
    ${box(275, 274, 185, 64, '#ffffff', '#059669', 'Client / Master Pods', 'HPA 2-6 Replicas\nStateless Nginx Frontends', '#065f46', '#047857')}
    ${box(495, 274, 185, 64, '#ffffff', '#7c3aed', 'Server Monolith (v1)', '1 Pod · Recreate Strategy\n512Mi /dev/shm', '#4c1d95', '#6d28d9')}
    ${box(705, 274, 150, 64, '#ffffff', '#475569', 'PVC Storage', 'Persistent data/\n+ db/ Mounts', '#0f172a', '#475569')}

    ${box(45, 352, 810, 52, '#f0fdfa', '#0d9488', 'Phase-2 Horizontal Scale Path (docs/DEPLOYMENT-PLAN.md)', 'Postgres RLS (client_id isolation) + Redis Queue & SSE Pub/Sub + Job-Controller (1 K8s Pod/Scrape) + Egress Gateway', '#115e59', '#0f766e')}

    ${arrow(240, 306, 275, 306, '#0891b2', '/')}
    ${arrow(460, 306, 495, 306, '#7c3aed', '/api')}
    ${arrow(680, 306, 705, 306, '#475569')}
  </svg>`;
}

function svgExtensionZeroKnowledge() {
  return `
  <svg viewBox="0 0 900 390" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 3 — ZERO-KNOWLEDGE BROWSER EXTENSION (7-STEP BLIND RELAY FLOW)</text>

    <rect x="22" y="48" width="418" height="322" rx="16" fill="#ecfdf5" stroke="#059669" stroke-width="2.2" />
    <text x="231" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="800" fill="#065f46">CUSTOMER BROWSER (ZERO SECRET CODE VISIBLE)</text>

    ${box(38, 86, 178, 70, '#ffffff', '#059669', 'CommandCenter.jsx', 'deviceRamEngine.js\nPolls every 2,500ms', '#065f46', '#047857')}
    ${box(246, 86, 178, 70, '#ffffff', '#0891b2', 'contentBridge.js', 'SCRAPER_EXT_PING/PONG\n0ms Handshake Bridge', '#164e63', '#0e7490')}
    ${box(108, 190, 245, 76, '#fffbeb', '#d97706', 'background.js (Service Worker)', 'Executes fetch(targetUrl)\nUser RAM + Residential IP\n750KB Cap · Wipes Memory', '#78350f', '#b45309')}
    ${box(108, 294, 245, 58, '#f1f5f9', '#475569', 'Public Maps / Directories', 'Returns Raw HTML / JSON', '#0f172a', '#475569')}

    <rect x="462" y="48" width="415" height="322" rx="16" fill="#eef2ff" stroke="#4f46e5" stroke-width="2.2" />
    <text x="670" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="800" fill="#312e81">PRIVATE CLOUD SERVER (100% LOCKED IP &amp; ENGINES)</text>

    ${box(485, 86, 370, 70, '#ffffff', '#4f46e5', 'extensionRelayHub.js (Ticket Authority)', 'Signs HMAC-SHA256 Tickets\n30s Expiry · 90s Heartbeat TTL', '#312e81', '#4338ca')}
    ${box(485, 190, 370, 76, '#ffffff', '#7c3aed', 'Secret 23-Engine Parsers & AI Brain', 'All CSS Selectors, 619k Villages,\nlibphonenumber & Fidelity Rules', '#4c1d95', '#6d28d9')}
    ${box(485, 294, 370, 58, '#ecfdf5', '#059669', 'Clean Leads -> Live SSE & Excel', 'POST /api/scrape/relay-result\n(crypto.timingSafeEqual)', '#065f46', '#047857')}

    ${arrow(216, 121, 246, 121, '#059669', '1. Ping', 231, 102)}
    ${arrow(440, 108, 485, 108, '#4f46e5', '2. Heartbeat', 462, 92)}
    ${arrow(485, 138, 440, 138, '#d97706', '3. Ticket', 462, 152)}
    ${arrow(335, 156, 275, 190, '#0891b2', '4. Forward')}
    ${arrow(230, 266, 230, 294, '#d97706', '5. User IP')}
    ${arrow(353, 232, 485, 315, '#059669', '6. Raw Blob Only', 442, 268)}
    ${arrow(670, 294, 670, 266, '#7c3aed', '7. Parse & Clean')}
  </svg>`;
}

function svgScrapeJsRouter() {
  return `
  <svg viewBox="0 0 900 415" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 4 — HOW scrape.js ROUTES, GUARDS &amp; EXECUTES EVERY REQUEST</text>

    ${box(28, 52, 195, 66, '#ecfdf5', '#059669', 'Incoming API Call', 'Client (:5173)\nor Master (:5174)', '#065f46', '#047857')}

    <rect x="252" y="48" width="242" height="346" rx="14" fill="#eef2ff" stroke="#4f46e5" stroke-width="2.2" />
    <text x="373" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#312e81">SECURITY &amp; QUOTA GATES</text>
    ${box(268, 84, 210, 54, '#ffffff', '#6366f1', '1. Scope & Role Check', 'Master header or 403 block\non State/District sweeps', '#312e81')}
    ${box(268, 148, 210, 54, '#ffffff', '#d97706', '2. Extension-Only Gate', 'HTTP 428 if missing when\nSCRAPER_EXTENSION_ONLY=true', '#78350f')}
    ${box(268, 212, 210, 54, '#ffffff', '#e11d48', '3. Credits & Client Gate', 'HTTP 402 if 0 credits\nHTTP 403 if paused', '#881337')}
    ${box(268, 276, 210, 54, '#ffffff', '#0891b2', '4. NL Parse + Country', 'requestedCountry()\n+ parseUniversalQuery', '#164e63')}
    ${box(268, 340, 210, 40, '#d1fae5', '#059669', 'Return HTTP 200 Immediately', 'Client UI never freezes!', '#065f46')}

    ${box(530, 52, 342, 60, '#ecfdf5', '#059669', 'POST /auto & POST /omni', 'Client: 400 max zones\nEnqueues Orchestrator', '#065f46', '#047857')}
    ${box(530, 124, 342, 60, '#f5f3ff', '#7c3aed', 'POST /master-sweep & /preview', 'India Gazetteer or Global\nLattice (up to 2,600 zones)', '#4c1d95', '#6d28d9')}
    ${box(530, 196, 342, 60, '#fef2f2', '#e11d48', 'POST /stop & POST /resume', 'Surgical session abort\nResume skips done zones', '#881337', '#be123c')}
    ${box(530, 268, 342, 60, '#fffbeb', '#d97706', 'POST /enrich-now & /deep-enrich', 'Backfill phones (8x)\n+ Website extract (6x)', '#78350f', '#b45309')}
    ${box(530, 340, 342, 60, '#ecfeff', '#0891b2', 'GET /zone-plan & POST /client-ingest', 'Feeds RAM Web Worker (<10ms)\n& saves batches live', '#164e63', '#0e7490')}

    ${arrow(223, 85, 252, 85, '#059669')}
    ${arrow(494, 108, 530, 82, '#059669')}
    ${arrow(494, 152, 530, 152, '#7c3aed')}
    ${arrow(494, 224, 530, 224, '#e11d48')}
    ${arrow(494, 294, 530, 296, '#d97706')}
    ${arrow(494, 360, 530, 368, '#0891b2')}
  </svg>`;
}

function svgOrchestrator9Stage() {
  return `
  <svg viewBox="0 0 900 470" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 5 — omniSearchOrchestrator.js: THE 9-STAGE SWARM PIPELINE</text>

    ${box(35, 50, 250, 88, '#eef2ff', '#4f46e5', 'STAGE 1: Intent & Dealer Brain', 'Brand/Product -> dealer phrase\nService categories stay clean', '#312e81', '#4338ca')}
    ${box(325, 50, 250, 88, '#ecfeff', '#0891b2', 'STAGE 2: Instant Vault + Enricher', 'Opens <sessionId>.json live\nBoots 4x streamingEnricher', '#164e63', '#0e7490')}
    ${box(615, 50, 250, 88, '#ecfdf5', '#059669', 'STAGE 3: 0ms Geo + Center Sort', '619k Gazetteer or BBox Lattice\nCenter-Out (Zone 1 first)', '#065f46', '#047857')}

    ${box(615, 178, 250, 88, '#fffbeb', '#d97706', 'STAGE 4: Radar + Tier-0 Burst', 'Emits Map Grid at t=0s\nOSM + Web + Wiki in <1.2s', '#78350f', '#b45309')}
    ${box(325, 178, 250, 88, '#f5f3ff', '#7c3aed', 'STAGE 5: Scope Engines + Queue', 'JustDial 1x/city (6-8 sweeps)\nPriority 30 -> Priority 2', '#4c1d95', '#6d28d9')}
    ${box(35, 178, 250, 88, '#fef2f2', '#e11d48', 'STAGE 6: Monitor + Quad-Split', '1s Loop · Blended Sliding ETA\n>=18 leads -> 4x 1.2km cells', '#881337', '#be123c')}

    ${box(35, 310, 250, 92, '#fff7ed', '#ea580c', 'STAGE 7: Boundary Containment', 'District Mandal Circles + SAB\nRejects -> master_oob_ folder', '#7c2d12', '#c2410c')}
    ${box(325, 310, 250, 92, '#ecfeff', '#0891b2', 'STAGE 8: Contact Mesh & Telecom', 'DB Peer Match + SERP Dork\n+91 Mobile vs 0.. STD Landline', '#164e63', '#0e7490')}
    ${box(615, 310, 250, 92, '#ecfdf5', '#059669', 'STAGE 9: Quality, Learn & Save', 'Dedup + 0-100% Score + Free\nCarry-Forward + Auto-Learn', '#065f46', '#047857')}

    ${arrow(285, 94, 325, 94, '#4f46e5')}
    ${arrow(575, 94, 615, 94, '#0891b2')}
    ${arrow(740, 138, 740, 178, '#059669')}
    ${arrow(615, 222, 575, 222, '#d97706')}
    ${arrow(325, 222, 285, 222, '#7c3aed')}
    ${arrow(160, 266, 160, 310, '#e11d48')}
    ${arrow(285, 356, 325, 356, '#d97706')}
    ${arrow(575, 356, 615, 356, '#0891b2')}

    <rect x="35" y="422" width="830" height="30" rx="8" fill="#0f172a" />
    <text x="450" y="441" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="10.8" font-weight="700" fill="#f8fafc">LIVE STREAMING: Every discovered lead, radar zone pulse &amp; phone enrichment streams to Client/Master UI over SSE in real time.</text>
  </svg>`;
}

function svgZonesAndContainment() {
  return `
  <svg viewBox="0 0 900 355" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">HOW ZONES, QUAD-SPLITS &amp; DISTRICT BOUNDARY CONTAINMENT WORK</text>

    <rect x="28" y="48" width="415" height="285" rx="14" fill="#ffffff" stroke="#0891b2" stroke-width="2" />
    <text x="235" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="800" fill="#164e63">CITY / MANDAL: CENTER-OUT + QUAD-SPLIT</text>

    <g stroke="#cbd5e1" stroke-width="1" fill="none">
      <rect x="70" y="88" width="210" height="210" rx="6" />
      <line x1="112" y1="88" x2="112" y2="298" />
      <line x1="154" y1="88" x2="154" y2="298" />
      <line x1="196" y1="88" x2="196" y2="298" />
      <line x1="238" y1="88" x2="238" y2="298" />
      <line x1="70" y1="130" x2="280" y2="130" />
      <line x1="70" y1="172" x2="280" y2="172" />
      <line x1="70" y1="214" x2="280" y2="214" />
      <line x1="70" y1="256" x2="280" y2="256" />
    </g>

    <circle cx="175" cy="193" r="96" fill="rgba(6,182,212,0.08)" stroke="#0891b2" stroke-width="2" stroke-dasharray="5,4" />
    <circle cx="175" cy="193" r="52" fill="rgba(16,185,129,0.14)" stroke="#059669" stroke-width="2" />
    <circle cx="175" cy="193" r="14" fill="#059669" />
    <text x="175" y="197" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="9.5" font-weight="800" fill="#ffffff">Z1</text>

    <rect x="112" y="130" width="42" height="42" fill="rgba(225,29,72,0.18)" stroke="#e11d48" stroke-width="2" />
    <line x1="133" y1="130" x2="133" y2="172" stroke="#e11d48" stroke-width="1.5" />
    <line x1="112" y1="151" x2="154" y2="151" stroke="#e11d48" stroke-width="1.5" />
    <text x="122" y="144" text-anchor="middle" font-size="7.5" font-weight="800" fill="#881337">NW</text>
    <text x="144" y="144" text-anchor="middle" font-size="7.5" font-weight="800" fill="#881337">NE</text>
    <text x="122" y="165" text-anchor="middle" font-size="7.5" font-weight="800" fill="#881337">SW</text>
    <text x="144" y="165" text-anchor="middle" font-size="7.5" font-weight="800" fill="#881337">SE</text>

    ${box(294, 92, 138, 56, '#ecfdf5', '#059669', '1. Named Zones', 'Priority 30 (Core)', '#065f46', '#047857')}
    ${box(294, 156, 138, 56, '#ecfeff', '#0891b2', '2. Grid Lattice', '5x5 / 7x7 / 10x10', '#164e63', '#0e7490')}
    ${box(294, 220, 138, 62, '#fef2f2', '#e11d48', '3. Quad-Split', '>=18 Leads\n-> 4x 1.2km Cells', '#881337', '#be123c')}
    <text x="235" y="320" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="10.2" font-weight="700" fill="#475569">Zone 1 runs at t=0s · Hotspots split up to 16 times</text>

    <rect x="460" y="48" width="412" height="285" rx="14" fill="#ffffff" stroke="#7c3aed" stroke-width="2" />
    <text x="666" y="70" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="800" fill="#4c1d95">MASTER DISTRICT BOUNDARY CONTAINMENT</text>

    <circle cx="555" cy="175" r="46" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="2" />
    <circle cx="617" cy="155" r="44" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="2" />
    <circle cx="600" cy="215" r="44" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="2" />
    <circle cx="663" cy="192" r="42" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="2" />

    <circle cx="550" cy="172" r="6" fill="#059669" />
    <circle cx="619" cy="150" r="6" fill="#059669" />
    <circle cx="603" cy="210" r="6" fill="#059669" />
    <text x="603" y="274" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="10.2" font-weight="800" fill="#059669">Inside Mandal Circles = KEPT</text>

    <circle cx="780" cy="128" r="7" fill="#e11d48" />
    <text x="780" y="114" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="9.2" font-weight="800" fill="#e11d48">Neighbor District!</text>
    ${box(716, 178, 144, 76, '#fef2f2', '#e11d48', 'Out-of-Bounds Vault', 'master_oob_folder\nArchived Safely', '#881337', '#be123c')}
    ${arrow(780, 136, 780, 178, '#e11d48')}
    <text x="666" y="320" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="10.2" font-weight="700" fill="#475569">0% cross-district pollution · Audit via /district-audit</text>
  </svg>`;
}

function svgWorkersAnd11Countries() {
  return `
  <svg viewBox="0 0 900 415" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 6 — 4 WORKER LAYERS &amp; 11-COUNTRY KEYLESS ENGINE ROUTING</text>

    <text x="218" y="54" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#312e81">4 PARALLEL WORKER LAYERS</text>
    ${box(28, 66, 380, 72, '#ecfdf5', '#059669', '1. Client RAM Web Worker (deviceRamEngine)', '4GB Eco=3 Lanes | 8GB Turbo=5 Lanes\n16GB+ Ultra=8 Parallel Zones', '#065f46', '#047857')}
    ${box(28, 150, 380, 72, '#fffbeb', '#d97706', '2. Extension Blind Relay (background.js)', 'Executes HMAC tickets in User RAM\n& Residential IP (750KB Cap)', '#78350f', '#b45309')}
    ${box(28, 234, 380, 72, '#eef2ff', '#4f46e5', '3. Server Persistent Queue (queue.js)', 'Fair-Share Round-Robin Scheduler\n12 HTTP Slots · Atomic jobs.json', '#312e81', '#4338ca')}
    ${box(28, 318, 380, 72, '#f5f3ff', '#7c3aed', '4. Dynamic Browser Budget (browserBudget)', 'Auto-scales Chromium (3-10 Slots)\nDiscovery + Enrichment Reserve', '#4c1d95', '#6d28d9')}

    <rect x="452" y="48" width="424" height="346" rx="16" fill="#ecfeff" stroke="#0891b2" stroke-width="2.2" />
    <text x="664" y="72" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="11.5" font-weight="800" fill="#164e63">COUNTRY-AWARE ROUTER (countryEngineMap.js)</text>

    ${box(470, 86, 388, 84, '#ecfdf5', '#059669', 'INDIA (IN) — Home Gazetteer Mode', '36 States/UTs · 627 Districts · 619,287 Villages\nJustDial · IndiaMART · WeddingBazaar · Maps · OSM', '#065f46', '#047857')}
    ${box(470, 184, 388, 96, '#ffffff', '#0891b2', '10+ GLOBAL MARKETS (countrySweepPlan.js)', 'US · GB · CA · AU · AE · SG · NZ · ZA · IE · MY (+DE)\nYelp · YellowPages · FreeIndex UK · GoldenPages IE\nCylex · Bing Places · TripAdvisor · Wikidata · Trustpilot', '#164e63', '#0e7490')}
    ${box(470, 294, 388, 84, '#fff7ed', '#ea580c', 'NORMALIZATION & PHONE CLASSIFICATION', 'libphonenumber-js/max per Country Code\nValid Mobile -> +Prefix & wa.me | STD -> Call Only', '#7c2d12', '#c2410c')}

    ${arrow(408, 102, 452, 120, '#059669')}
    ${arrow(408, 186, 452, 186, '#d97706')}
    ${arrow(408, 270, 452, 232, '#4f46e5')}
    ${arrow(408, 354, 452, 326, '#7c3aed')}
  </svg>`;
}

function svgMasterVsClient() {
  return `
  <svg viewBox="0 0 900 320" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 7 — CLIENT WORKSPACE vs. MASTER OPERATOR CONTROL ROOM</text>

    <rect x="30" y="48" width="380" height="252" rx="16" fill="#ecfdf5" stroke="#059669" stroke-width="2.2" />
    <text x="220" y="72" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12.5" font-weight="900" fill="#065f46">CLIENT COMMAND CENTER (:5173)</text>
    ${box(48, 86, 344, 44, '#ffffff', '#10b981', 'City / Mandal / Town Search (Max 400 Zones)', 'Blocked from District/State sweeps (403)', '#065f46')}
    ${box(48, 140, 344, 44, '#ffffff', '#10b981', 'Cockpit, Leads Table, Satellite Map & Folders', '52-Field Vendor Drawer + Excel / CSV / VCF', '#065f46')}
    ${box(48, 194, 344, 44, '#ffffff', '#10b981', 'WhatsApp CRM + Credits + Notification Bell', '1 Credit = 1 New Lead · Carry-Forward = Free', '#065f46')}
    ${box(48, 248, 344, 38, '#d1fae5', '#059669', 'Identity: x-user-id (or JWT in Auth mode)', 'Isolated to own user_sessions/<id>/', '#065f46')}

    <rect x="490" y="48" width="380" height="252" rx="16" fill="#eef2ff" stroke="#4f46e5" stroke-width="2.2" />
    <text x="680" y="72" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12.5" font-weight="900" fill="#312e81">MASTER CONTROL ROOM (:5174)</text>
    ${box(508, 86, 344, 44, '#ffffff', '#6366f1', 'Full Territorial Sweeps (Up to 2,600 Zones)', 'City · Mandal · District (All Villages) · State', '#312e81')}
    ${box(508, 140, 344, 44, '#ffffff', '#6366f1', 'Client Desk (/clients) + Pause / Credits / Import', 'Read/Import Client Folders · Broadcast Alerts', '#312e81')}
    ${box(508, 194, 344, 44, '#ffffff', '#6366f1', 'Engine Health Board + Learning Center + Terminal', 'Live 23-Engine Telemetry + AI Taxonomy Brain', '#312e81')}
    ${box(508, 248, 344, 38, '#e0e7ff', '#4f46e5', 'Header: x-workspace-scope: master (+ MASTER_KEY)', 'Post-Sweep Quality Filters + OOB Vault', '#312e81')}

    ${arrow(490, 162, 410, 162, '#4f46e5', 'Notifications')}
    ${arrow(410, 216, 490, 216, '#059669', 'Folder Import')}
  </svg>`;
}

function svgSearchBarPipeline() {
  return `
  <svg viewBox="0 0 900 425" width="100%" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border-radius:16px;border:1.5px solid #cbd5e1;">
    ${defsBlock()}
    <text x="450" y="28" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="800" fill="#0f172a">FLOWCHART 8 — HOW THE SMART SEARCH BAR &amp; NATURAL LANGUAGE ENGINE WORK</text>

    ${box(28, 50, 255, 80, '#ecfdf5', '#059669', '1. User Types Any Phrase', 'Shortcuts: / or Ctrl+K · 0ms lag\n"phtgaphers I gntur 10km with phone"', '#065f46', '#047857')}
    ${box(322, 50, 255, 80, '#ecfeff', '#0891b2', '2. Client 0ms LRU + Vault Match', '300-Key Memory Cache · Recent List\n"ALREADY IN YOUR SAVED LISTS"', '#164e63', '#0e7490')}
    ${box(616, 50, 255, 80, '#fffbeb', '#d97706', '3. 70ms Debounced Suggest API', 'AbortController cancels old calls\nGET /api/search/suggest?q=...', '#78350f', '#b45309')}

    <rect x="28" y="162" width="844" height="126" rx="16" fill="#eef2ff" stroke="#4f46e5" stroke-width="2.2" />
    <text x="450" y="184" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="900" fill="#312e81">4. BACKEND INTELLIGENCE (searchSuggest.js + universalQueryEngine.js + brandIntel.js)</text>
    ${box(44, 198, 192, 76, '#ffffff', '#6366f1', 'A. Modifiers & Fluff', 'Strips "best / find me"\nExtracts 10km, 4+, urgent', '#312e81')}
    ${box(250, 198, 194, 76, '#ffffff', '#059669', 'B. Typo Auto-Repair', 'gntur->Guntur, fotogrfy->Photo\n"I" / "n" -> "in" preposition', '#065f46')}
    ${box(458, 198, 194, 76, '#ffffff', '#7c3aed', 'C. Brand/Product/Geo', '619k Villages + Landmarks\nDealer Expansion + PINs', '#4c1d95')}
    ${box(666, 198, 190, 76, '#ffffff', '#0891b2', 'D. Live HUD & Zones', 'Pre-computes Zone Count,\nOSM/Wikidata Tags & Vectors', '#164e63')}

    ${box(28, 320, 258, 84, '#ffffff', '#059669', '5. 2-Column Highlighted Menu', 'Left: Suggested Searches (<mark>)\nRight: Matching Places · Typo Tip', '#065f46', '#047857')}
    ${box(320, 320, 260, 84, '#f5f3ff', '#7c3aed', '6. [A] Find Leads / Enter Deploy', 'Launches /api/scrape/auto + RAM\nHardware (Eco 3x / Turbo 5x / 8x)', '#4c1d95', '#6d28d9')}
    ${box(614, 320, 258, 84, '#fef2f2', '#e11d48', '7. Self-Learning Feedback Loop', 'POST /api/search/feedback\nPromotes real hits in learned.json', '#881337', '#be123c')}

    ${arrow(283, 90, 322, 90, '#059669')}
    ${arrow(577, 90, 616, 90, '#0891b2')}
    ${arrow(743, 130, 743, 162, '#d97706')}
    ${arrow(450, 288, 165, 320, '#4f46e5')}
    ${arrow(286, 362, 320, 362, '#059669', 'Pick/Tab')}
    ${arrow(580, 362, 614, 362, '#7c3aed', 'Learn')}
  </svg>`;
}

module.exports = {
  svg4PillarOverview,
  svgDeploymentModes,
  svgExtensionZeroKnowledge,
  svgScrapeJsRouter,
  svgOrchestrator9Stage,
  svgZonesAndContainment,
  svgWorkersAnd11Countries,
  svgMasterVsClient,
  svgSearchBarPipeline
};
