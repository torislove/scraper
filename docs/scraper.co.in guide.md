# scraper.co.in guide — Complete Architecture, Dashboards & Operations Manual

> **Authors:** Kadiyala Manoj & Mannava Praneeth Chowdary
> **Companion Visual PDF:** [scraper.co.in guide.pdf](./scraper.co.in%20guide.pdf) | [scraper.co.in guide.html](./scraper.co.in%20guide.html)

---

## 1. The 4-Pillar System Overview

Think of the platform like a **Smart Logistics Company**:
1. **`server/` (Port 5002 — The Private Cloud Brain):** Holds all 23 scraping parsers, CSS selectors, regexes, the 619,287-village Indian gazetteer, AI brand/product intelligence, and JSON data vaults (`server/data/` & `server/db/`).
2. **`client/` (Port 5173 — Customer Control Room):** Customer-facing app (`app.scraper.co.in`) for city/mandal searches, live radar maps, 52-field lead drawer, WhatsApp CRM, saved folders, and Excel/CSV/VCF exports.
3. **`master/` (Port 5174 — Operator Control Room):** Restricted operator dashboard (`master.scraper.co.in`) for District & State sweeps (up to 2,600 zones), Client Desk (`/clients`), Engine Health Board, and AI Learning Center (`/learning`).
4. **`extension/` (Zero-Knowledge Browser Extension):** Manifest V3 Chrome/Edge add-on containing **zero** scraping engines or selectors — executes 30-second HMAC-signed fetch tickets in the customer's browser RAM & residential IP.

---

## 2. Live Dashboards & All Features

Captured live screenshots stored in `docs/screenshots/`:
- `01-client-landing.png` — Client Landing Page, 11-country showcase, 6 engines, and RAM hardware tiers.
- `02-client-cockpit.png` — Client Command Center Cockpit (`/command?tab=cockpit`), 11-Country Flag Strip, Smart Search Console, Notification Bell, Credits Pill, and KPI summary.
- `03-client-leads-drawer.png` — Leads Table with `+91` Mobile vs `0...` STD Landline badges, 0–100% Quality Score Ring, CRM stages, and 52-field Vendor Drawer.
- `04-client-map-radar.png` — Live Satellite Map Radar with zone circles, active scanning highlight, and sidebar directory.
- `05-client-saved-folders.png` — Append-only Saved Folders with city filters, merge/rename, Excel (`.xlsx`), CSV, and WhatsApp `.vcf` export.
- `06-master-sweep-launchpad.png` — Master Geo-Coverage Sweep Launchpad (`City / Mandal / District / State`), dry-run preview, and post-sweep quality filters.
- `07-master-engines-board.png` — Live Engine Health Board (`/command?tab=engines`) showing Green/Amber/Red status chips, latency, and Politeness Guard cooldowns.
- `08-master-learning-center.png` — Master AI Learning Center (`/learning`) showing auto-learned products, services, categories, brands, and queries.
- `09-master-clients-desk.png` — Master Client Registry Desk (`/clients`) for managing plans, credits, account Pause/Resume, folder inspection/import, and broadcast notifications.
- `10-extension-popup.png` — `RAM Turbo Bridge v1.0.0` popup showing connection status, detected RAM/CPU, and relayed task count.

---

## 3. How the Search Bar Works (`SearchConsole.jsx` + `searchSuggest.js` + `universalQueryEngine.js`)

1. **Instant UX & Shortcuts:** Press `/` or `Ctrl+K` to focus. Maintains a **300-entry LRU cache** for 0 ms instant backspace responses and debounces network requests by **70 ms** with `AbortController` cancellation.
2. **Saved Folder Vault Bridge:** Before starting a new scrape, checks existing user folders and shows **"ALREADY IN YOUR SAVED LISTS"** with 1-click open so users never waste credits.
3. **7-Step Natural Language Parser (`universalQueryEngine.js`):**
   - Extracts explicit radius (`within 12km` -> 1–25 km, default 5 km).
   - Extracts modifiers (`with phone`, `top rated / 4+`, `urgent / 24/7`, `wholesale / dealer`).
   - Strips conversational fluff (`"please find best"`, `"list all"`).
   - Repairs typos and shorthand prepositions (`"phtgaphers I gntur"` -> `"Photographers in Guntur"`).
   - Maps urban landmarks (`Benz Circle` -> `Vijayawada`, `Morrispet` -> `Tenali`).
   - Expands products/brands into dealer/wholesaler phrases (`brandIntel.js`).
   - Pre-computes zone count, OSM tags, and Wikidata SPARQL classes live.
4. **Self-Learning Loop:** Dispatches `POST /api/search/feedback` and records successful lead-returning runs via `taxonomyLearner.js` into `server/data/taxonomy/learned.json`.

---

## 4. How Zones, Adaptive Quad-Splits & Containment Work

1. **Named Locality / Village Zones (`locality` / `vector`):** Deliver ~97% of fast leads; sorted **Center-Out** so Downtown / Zone 1 runs first at Priority **30**.
2. **Coordinate Lattice Grids (`grid` / `lattice`):** `5x5` (25 cells) for cities, `7x7` (49) for counties, `10x10` (100) for international states, and `3x3` deep sub-grids.
3. **Adaptive Quad-Split (`split`):** Any completed zone yielding **>= 18 leads** automatically subdivides into **4 tighter 1.2 km micro-cells (`NE, NW, SE, SW`)** at `±0.0075°` (up to 16 splits per run).
4. **Territorial Containment:** District sweeps enforce surveyed sub-district union circles (`isInsideDistrictBoundary`) plus structured district/state name validation. Rejected rows go safely to the **Out-of-Bounds Vault (`master_oob_<district>`)**, repairable via `POST /api/scrape/district-audit`.

---

## 5. How Deployment Works (4 Modes)

1. **Local Dev:** `npm run dev -- --all` launches Server (`:5002`), Client (`:5173`), and Master (`:5174`).
2. **Docker Compose (`docker-compose.prod.yaml`):** `scraper-server` (`shm_size: 1gb`, non-root `node` user, volumes `scraper_production_data` & `scraper_production_db`), `scraper-client` (`:8081`), and `scraper-master` (`:8082`).
3. **Kubernetes (`k8s/` + `DEPLOYMENT-PLAN.md`):** Nginx Ingress (`app.`, `master.`, `api.scraper.co.in`) with `proxy-buffering: "off"` for SSE, Frontend HPA (2–6 pods), single-writer server Deployment (`Recreate`) for v1, plus Phase-2 scale-out (Postgres RLS, Redis queue & pub/sub, K8s Job-per-scrape controller, and Egress Gateway).
4. **Zero-Knowledge Extension-Only Cloud (`SCRAPER_EXTENSION_ONLY=true`, `SCRAPER_BROWSER_SLOTS=0`):** Runs zero Chromium browsers on the cloud server while customers fetch pages through the Chrome Extension using their own RAM and residential IP (95% server cost reduction).

---

## 6. How the Browser Extension Works (`extension/` + `extensionRelayHub.js`)

- **Zero Secrets Shipped:** Contains 0 CSS selectors, 0 category dictionaries, 0 geo databases, and 0 parsers.
- **Handshake:** `contentBridge.js` announces `SCRAPER_EXT_PONG` and forwards tickets via `window.postMessage`.
- **Signed Ticket Security:** `extensionRelayHub.js` generates **HMAC-SHA256** signed tickets with **30s TTL**, **90s heartbeat TTL**, and timing-safe verification (`crypto.timingSafeEqual`).
- **Blind Worker:** `background.js` executes `fetch(targetUrl)` with `credentials: 'omit'`, caps bodies at **750,000 chars**, posts raw bytes to `POST /api/scrape/relay-result`, and clears memory immediately.
- **Built-in ZIP Download:** `GET /api/scrape/extension-download` packs the extension on the fly using a dependency-free PKZIP generator.

---

## 7. Deep Dive: `scrape.js` (`server/src/routes/scrape.js`)

- **Task Wrapper:** Registers all 23 scrapers via `registerTask` + `safeExecute()` updating `engineHealth` and `requestGuard`.
- **Search Dispatch (`/auto`, `/omni`):** Enforces Extension-Only gate (`428`), Client City/Mandal gate (`403` on Indian states/districts), Credit preflight (`402` if 0 credits; **1 credit = 1 new lead**), and append-only folder safety.
- **Master Sweeps (`/master-sweep/preview`, `/master-sweep`):** Restricted to `x-workspace-scope: master`; launches up to 2,600 Indian zones or global country lattices with post-sweep filters.
- **Surgical Stop & Smart Resume (`/stop`, `/resume`):** Aborts only the target `sessionId`, saves collected leads with `Aborted` status, and resumes strictly from remaining unfinished zones.
- **Enrichment & RAM Workers:** `/enrich-now` (8x mobile backfill), `/deep-enrich` (6x website contact extraction), `/district-audit`, `/zone-plan`, and `/client-ingest`.

---

## 8. Deep Dive: `omniSearchOrchestrator.js`

1. **Intent & Dealer Expansion** (`categoryRouter` + `brandIntel`)
2. **Instant Vault Open + 4x Streaming Enricher Boot**
3. **0ms Offline Gazetteer / International Lattice + Center-Out Sorting**
4. **Live Radar Grid Broadcast (`emitGridEvent`)**
5. **Tier-0 <1.2s Direct HTTP Turbo-Burst** (OSM, Web Discovery, Wikidata, Trustpilot)
6. **Scope Engine Planning (`planScopeEngines`) + Priority Queueing (30 -> 2)**
7. **1s Monitor Loop, Blended Sliding ETA & Adaptive Quad-Split (>=18 leads)**
8. **Territorial Containment + Category Fidelity + Out-of-Bounds Archive**
9. **Cooperative Contact Mesh + SERP Phone Dork + `libphonenumber-js/max` (`+91` Mobile vs `0...` STD Landline) + Quality Score + Carry-Forward + `taxonomyLearner` + 300x Deep Profile Job**

---

## 9. Workers & 11 Countries

- **4 Worker Layers:**
  1. Server Queue (`queue.js`): Atomic `jobs.json`, 12 HTTP slots, Fair-Share Round-Robin across sessions.
  2. Browser Budget (`browserBudget.js`): Auto-scales Chromium slots (3–10) by RAM + Discovery/Enrichment reserve.
  3. Browser RAM Web Worker (`deviceRamEngine.js`): Eco 4GB (3 lanes), Turbo 8GB (5 lanes), Ultra 16GB+ (8 lanes).
  4. Extension Relay Worker (`extension/background.js`): Residential IP ticket executor.
- **11 Countries Supported:** `IN, US, GB (UK), CA, AU, AE, SG, NZ, ZA, IE, MY` (plus global fallback including `DE` Germany featured in the Client UI).
