# Client Application Audit — React SPA (`client/`)

**Audit owner:** client-auditor (shared task `task-3`)
**Scope:** `client/src/**` (all JS/JSX read in full, large files in chunks), `client/index.html`, `client/vite.config.js`, `client/postcss.config.js`, `client/tailwind.config.js`, `client/.env.production`, `client/package.json`, `client/README.md`, committed `client/dist/**` (static inspection), plus a read-only cross-check of `server/index.js` and the server route files needed to verify the frontend↔backend contract.
**Method / constraints:** static read-only analysis. No installs, no dev server, no production build was run. `npm ls --depth=0 --prefix client` was run read-only. All claims below cite `file:line`; line numbers refer to the current source.
**Deliverable:** this file is the only artifact written by this audit.

---

## 0. Executive summary

The client is a **demo-forward, monolithic React SPA** whose visible polish is far ahead of its data layer. It is a working scraper *console* in the happy path (search → SSE stream → map/list → session vaults → CSV), but almost every "trust" surface is either duplicated, stubbed, localStorage-only, or fabricated:

- **No authentication or tenant isolation in the UI.** `App.jsx` hardcodes an admin user, `/login` is a redirect to the dashboard, the real `Login` page is never rendered, and the public `/marketplace/*` route renders the full admin cockpit with no gate (`client/src/App.jsx:42-46,74-87,90`). The server middleware has no token checks either (`server/index.js:142-154`), so the UI's lack of auth is not merely cosmetic.
- **The production bundle is wired to a dead backend.** `client/.env.production` sets `VITE_API_URL=https://gomandap-api.onrender.com/api/scraper-app`; `apiConfig.js` always routes through `VITE_API_URL` (`client/src/apiConfig.js:14-19`). The committed `client/dist/assets/apiConfig-*.js` literally contains that host. Firebase Hosting serves `dist/` (`client/firebase.json`), so a deployed client talks to an old URL with a non-existent `/api/scraper-app` prefix.
- **Two contradicting persistence layers for the same concepts.** Sessions are auto-saved both by the server orchestrator (`server/src/routes/scrape.js:888-930`) and by the client after every search (`client/src/pages/dashboard/Overview.jsx:668-683`, `client/src/utils/sessionManager.js:314-372`). This produces duplicate "Lead Vaults" (observed: 27 session JSON files / 3.2 MB for a handful of searches, with identical category+location sessions 30 s apart) and two ID schemes (`session_<ts>` vs `sess_<cat>_<loc>_<ts>`).
- **CRM is three incompatible localStorage schemas plus a no-op server call.** `FolderLeadsModal` writes `vault_crm_state_<id>_<timestamp>` (`client/src/components/FolderLeadsModal.jsx:47-49`), while `CRMPipeline`, `CRMAnalytics` and `FolderDetail` read/write `vault_crm_state_<id>` (`client/src/pages/dashboard/CRMPipeline.jsx:50,147,166`, `CRMAnalytics.jsx:51`, `FolderDetail.jsx:75-77`). Stages set in the richest CRM UI are invisible to the CRM pages. Server `PATCH /api/crm/leads/:id/stage` is called with session-local lead IDs and silently no-ops (`server/src/routes/crm.js:21-73`).
- **Several core flows are knowingly faked.** Semantic search is a dummy Web Worker returning identical embeddings (`client/src/semanticWorker.js:4-17`), "AI Verified" badges, "14.8/s swarm rate", "18 workers", "96/100 A-Grade" quality and "780+ Districts" are hardcoded/fallback numbers (`Overview.jsx:761,910,985,997,1892`), and first-run "verified" search sessions are seeded fake businesses (`sessionManager.js:18-291`). The landing page's live "scraper" is an animated fake (`LandingPage.jsx:23-79`).
- **The entire client-side scraping stack is dead code.** Five DOM-based engines, a frontend queue and two hooks exist but are not imported by any rendered component; their transport (`/api/proxy`) is not even mounted on the server (`server/src/routes/proxy.js` exists; `server/index.js:142-154` never mounts it), and their save call `POST /api/vendors` has no server route.
- **The app is one re-render storm over a 1.8k-line page + 2k-line page.** `ScraperDashboard` is the de-facto global store (1,169 lines) and re-creates a giant context value every 600 ms while scraping; `Overview.jsx` is 2,003 lines/101 KB, `FolderLeadsModal.jsx` is 1,849 lines/92 KB. The eager `Overview` import drags Leaflet + framer-motion + react-leaflet into the 886 KB initial bundle even for the public landing page (`App.jsx:12`).

**Readiness verdict for a world-class rewrite:** the client is not a foundation to extend incrementally; it is a demo/prototype that should be re-architected around a typed API client, a server-canonical lead/session/CRM model, real auth, and small composable pages/components. Treat the visual design language as the reusable asset, not the code.

---

## 1. Current feature inventory by page/route

Route table is the real, registered routing (`client/src/App.jsx:69-119`). "Live?" = reachable through the rendered app.

| # | Route | Component | Live? | What a user can actually do today |
|---|-------|-----------|-------|-----------------------------------|
| 1 | `/` | `pages/LandingPage.jsx` (1,472 lines) | ✅ | Marketing page. Animated *simulated* scrape demo over hardcoded sample businesses (`LandingPage.jsx:23-79`); FAQs; UPI donation modal; CTAs to `/app/overview`; links to `/pricing`, `/login`; WhatsApp/contact links. No API calls, no real data. |
| 2 | `/pricing` | `pages/PricingPage.jsx` | ✅ | Static USD plans ($490–$990/yr, "Silver/Gold/Enterprise"), monthly/annual toggle only; **no checkout, no plan state, no API**; says "OmniLead AI" (stale brand). Contradicts the "100% Free Forever" landing copy. |
| 3 | `/marketplace/*` | `ScraperDashboard` with nested `Overview` | ✅ (public!) | Full admin cockpit rendered for a `Guest` user with `onLogout={() => {}}` (`App.jsx:74-83`) — i.e. the scraper cockpit is publicly reachable and unmetered. The actual `pages/Marketplace.jsx` component is **never routed** (dead lazy import at `App.jsx:24`). |
| 4 | `/products/phone-scraper` | `pages/products/PhoneScraper.jsx` | ✅ | Demo of the "Deep Extractor" API: type a site/name → `POST /api/public/deep-extract` → show extracted phones. Branded "OmniLead Extractor API". |
| 5 | `/terms`, `/privacy` | static pages | ✅ | Static legal text. |
| 6 | `/login` | — | ❌ redirect | `<Navigate to="/app/overview" />` (`App.jsx:87`). The `Login.jsx` component (with offline hardcoded creds) is imported but never rendered (`App.jsx:4`). |
| 7 | `/app/overview` | `pages/dashboard/Overview.jsx` (2,003 lines) | ✅ | **The product.** One search bar that auto-starts a scrape on select (`Overview.jsx:830-856`); Master Abort; CSV export of filtered leads; Leaflet radar map with 3 tile modes, lead pins (max 200), active-worker radar (max 20 points); "Territory Directory" tab (fake AP fallback tree when no `searchProgress.fullHierarchy`); 4 KPI cards (fake fallbacks); live leads feed (max 80 rendered) with All/WhatsApp/★4.2+ tabs and mandal chips; Past Sessions drawer (load/export/delete); Live Logs terminal modal; lead dossier drawer (copy/WhatsApp/call/email/site links, GPS); "WhatsApp Automation — coming soon" modal. Cannot choose engines, search scope, radius, or confirm a search before it starts. |
| 8 | `/app/folders` | `pages/dashboard/Folders.jsx` | ✅ | Grid/list of "Lead Vaults" (sessions), search/category filter/sort, manual "New Vault" (localStorage only), delete, "Export CSV" (exports empty lead list — see §7), open detail. All server sessions render as **"Unnamed Vault"** because the list API returns no `name` and the UI only reads `folder.name` (`Folders.jsx:374`, `server/src/routes/sessionRoutes.js:93-102`). |
| 9 | `/app/folders/:folderId` | `pages/dashboard/FolderDetail.jsx` | ✅ | 3-pane lead browser (list / detail / CRM): search, stage filter, tab filters (All/Phone/★4.0+/Verified), CSV/JSON export, call/WhatsApp/site/copy; per-lead CRM stage, tasks checklist and notes — **localStorage only**; "View in Pipeline". Mobile tabbed layout. |
| 10 | `/app/crm` (`/app/crm/:leadId` also maps here) | `pages/dashboard/CRMPipeline.jsx` | ✅ (but sparse/empty for server-only vaults) | Kanban of 6 stages (`new…archived`) built from session leads + localStorage overrides; vault filter; search; move stage forward/back or pick stage in drawer; WhatsApp/call; deep-link `:leadId` is ignored (no `useParams`). No notes/tasks in this view. |
| 11 | `/app/crm-analytics` | `pages/dashboard/CRMAnalytics.jsx` | ✅ | Funnel + top industries + top regions + "Closed Won" table aggregated from session leads and localStorage CRM. Timeframe selector is cosmetic (`CRMAnalytics.jsx:14,141-149` — never used in `stats`). |
| 12 | `/app/leads` | `pages/dashboard/Leads.jsx` | ⚠️ **orphan** | Four views: Pipeline kanban, virtualized Fast List, Category folders, Radar map (clustered). Filters: search, city, category, min rating, phone-only; Push to Prod; Clear queue; delete/verify. **No nav link anywhere in the app** → only reachable by typing the URL. Export button exports a different dataset than displayed (see §7). |
| 13 | `/app/automations` | `pages/dashboard/Automations.jsx` | ✅ (mostly mock) | Catalog of 7 "automation nodes" + 4 workflow templates; modal runner. Only the phone/email extractor calls an API (`/api/vendors/extract-phones`, **which does not exist**); Google Places calls `startScrape(null, query)` with the whole sentence as "category" (broken); scheduled-rescrape/bulk/AI/workflow "runs" only show success toasts (`Automations.jsx:229-237,655-663`). Credits are decorative. Running server jobs (`GET /scrape/jobs`) can be stopped/started. |
| 14 | `/app/settings` | `pages/dashboard/Settings.jsx` | ✅ | Bulk CSV task upload (naive CSV parser, see §7); change admin username/password (`PUT /api/auth/admin`, unprotected); view masked NVIDIA/OLA keys and save new ones; create/delete employee agents (avatar upload); purge unverified staging; static "architecture" claims (React 18, 22 engines, 26 AP districts). |
| 15 | `/app/users` | `pages/dashboard/Users.jsx` | ⚠️ **orphan** | Marketplace user accounts: list from `GET /api/public/admin/list`, edit credits, toggle "Deep Extractor API" permission. No nav link → only by URL. |
| — | `/app/locations` | `pages/dashboard/LocationIntelligence.jsx` (440 lines) | ❌ **dead** | GeoAI memory explorer, state "warmer", OSM resolver, Leaflet map. Component exists, **no route registered**, calls two server endpoints that don't exist. |
| — | `/app/out-of-bounds` | `pages/dashboard/OutOfBounds.jsx` | ❌ **dead** | Light-themed out-of-bounds lead list. No route. |
| — | — | `EmployeeDashboard.jsx` (330 lines) | ❌ **dead** | Light-themed field-agent dashboard (`OmniLead.` brand); never imported. |

**Net "what a user can actually do":** run an autonomous scrape for a text query (server-side), watch an SSE-driven stream/map, browse results globally or by session vault, hand-toggle a `verified` flag, mark stages/notes in browser storage, export CSV/JSON/ZIP (with bugs), generate WhatsApp links, and manage a few admin-ish settings. There is no working team/CRM persistence, no saved-search alerting, no billing, no real user accounts, and no reachable route for user management or the global leads workbench.

---

## 2. Client-side scraping engines (dead subsystem)

### 2.1 What exists

| File | Transport | Platforms | Entry | Fields returned | Reachable from UI? |
|---|---|---|---|---|---|
| `utils/engines/googleSerp.js` | server `/api/proxy` → `DOMParser` | Google SERP (organic + local panel) | `scrapeGoogleSerp(category, location, onLog)` | `id,name,category,city,phone,email,website,images,platform,sourceUrl,score,tier,status` | ❌ |
| `utils/engines/justdial.js` | same | JustDial category pages | `scrapeJustDial` | `id,name,category,city,phone,email,address,rating,reviewsCount,images,platform,sourceUrl,score,tier,status` | ❌ |
| `utils/engines/mandap.js` | same | Mandap.com venues + JSON-LD fallback | `scrapeMandap` | +`address,website,images,rating` | ❌ |
| `utils/engines/weddingBazaar.js` | same | WeddingBazaar listings + JSON-LD | `scrapeWeddingBazaar` | name, phone, email, rating, images, platform, sourceUrl, score, tier, status | ❌ |
| `utils/engines/weddingWire.js` | same | WeddingWire.in listings + JSON-LD; category map | `scrapeWeddingWire` | name, phone, email, address, rating, images, website, score, tier, status | ❌ |
| `utils/ScraperEngine.js` | **different** older direct `fetch('/api/proxy')` + DOMParser | JustDial + Google (older duplicate) | `scrapeJustDialFrontend`, `scrapeGoogleFrontend` | subset, no score/tier | ❌ (dead file) |
| `utils/FrontendQueue.js` | in-browser FIFO, concurrency 3, localStorage recovery, 3-min timeout | all 5 via `ENGINES` map | `FrontendQueue` class | persists to `POST /api/vendors` (**route absent**) | ❌ |
| `hooks/useQueue.js` | React binding of FrontendQueue | — | — | — | ❌ |
| `utils/proxyFetch.js` | `fetch('/api/proxy?url=…')`, 3 retries, 20 s timeout, 60 s `Map` cache; helpers `extractContactInfo`, `calculateLeadScore`, `determineTier` | generic | `proxyFetch(url)` | HTML / regex contacts / score 0-100 | ❌ |
| `hooks/useSSEScraper.js` | EventSource `/api/logs/stream` | — | — | status/lastEventAt | ❌ (duplicate of inline SSE in `ScraperDashboard`) |
| `utils/gridGenerator.js` | pure math, Phyllotaxis grid | — | `generateGridCoordinates` | coords | ❌ (frontend port of server logic) |
| `utils/hierarchyEngine.js` | bundles `../../../server/db/india_villages.json` (**26.8 MB**), Nominatim fallback | India | `getSubLocations` | sub-locations | ❌ (frontend port of server logic) |

No file in the rendered tree imports `useQueue`, `FrontendQueue`, the `engines/*`, or `ScraperEngine` (verified by import graph; only self/`FrontendQueue` references). The only live scraping path is server-side `POST /api/scrape/omni` from `ScraperDashboard.startScrape` (`ScraperDashboard.jsx:838-899`). `triggerPython`/`triggerMaps`/`triggerCheerio` remain exposed through context but no page calls them; `triggerCheerio` targets a non-existent route.

### 2.2 Why it is dead (and why it can't be revived as-is)

1. **No UI entry point** — the search bar (`UniversalSearchBar`) always calls `startScrape` (server), never `useQueue`.
2. **Broken transport** — `proxyFetch` targets `${API_URL}/proxy` (`proxyFetch.js:9`), but `server/src/routes/proxy.js` is never mounted in `server/index.js:142-154`. Every engine call would 404. The proxy route itself is also an unbounded SSRF (fetches any `?url=` from the server).
3. **Broken sink** — `FrontendQueue.saveResultsToBackend` posts an array to `POST /api/vendors` (`FrontendQueue.js:188-206`); `server/src/routes/vendors.js` has no `POST /` route. Results would be lost after being scraped.
4. **Selector fragility / anti-bot reality** — all parsing is CSS-selector-based on HTML fetched with a server UA (`proxyFetch.js:12-16`). Google SERP returns consent/JS shells to datacenter IPs; JustDial often serves a login/OTP wall (engine acknowledges and returns `[]`, `justdial.js:23-28`); WeddingWire/WeddingBazaar are JS-rendered, so the fallback often yields 0 cards (engines return `[]` with only an `onLog` message).
5. **No auth/cookies/session/proxy rotation**, no pagination, no rate limiting beyond 1.5 s delay in the queue, no dedupe before save, no schema validation, and the score is a trivial additive heuristic (`proxyFetch.js:85-100`).
6. **Duplication of server engines** — server already has Google Places/SERP/Local, JustDial, Mandap, WeddingBazaar, WeddingWire, IndiaMART, DeepSeek, Crawlee, Scrapy engines (`server/src/scrapers/*.js`), plus its own grid/hierarchy logic. The client copies (`gridGenerator.js`, `hierarchyEngine.js`, `proxyFetch.js` score/tier) are stale ports and should be deleted, not ported forward.
7. **Bundle risk if it stays** — `hierarchyEngine.js:9` imports a 26.8 MB server JSON; importing it reactively would add ~26 MB to the build (currently tree-shaken only because nothing imports it).

**Recommendation:** delete `utils/engines/*`, `FrontendQueue.js`, `useQueue.js`, `useSSEScraper.js`, `ScraperEngine.js`, `proxyFetch.js`, `gridGenerator.js`, `hierarchyEngine.js` in the rewrite; keep extraction helpers only if they move server-side. If client-side scraping is a product requirement, reimplement as a server "engine adapter" API, not browser fetches.

---

## 3. State & data-flow architecture

### 3.1 The "provider" is a 1.2k-line page component

`context/ScraperContext.jsx` is only a `createContext` + `useScraper` guard (11 lines). The **actual provider is `ScraperDashboard`** (`ScraperDashboard.jsx:1057-1160`), which owns:

- `vendors` (entire server DB), `outOfBoundsVendors`, `activeJobs`, `employees`, `logs`, `knowledge`, `suggestions`, `gridPoints`, `activePoints`, `searchProgress`, `sseStatus`, `loading`, `searchHistory`, `enabledEngines`, `modelLoadingStatus`, `publicUsers` (fetched but never used), `searchRadius` (destructured by `Overview` but never provided — `Overview.jsx:405`).
- all actions: `startScrape`, `handleMasterStop`, `fetchVendors`, `handleVerify`, `handleDelete`, `handleAssign`, `pushToProd`, `clearQueue`, `exportToCSV`, `exportCategoryCSV`, `handleFileUpload`, `handleUpdateJob`, plus legacy `triggerPython/Maps/Cheerio`.
- the `contextValue` is rebuilt with `useMemo` whose dependency array includes **all fetched/computed arrays** (`ScraperDashboard.jsx:1128-1136`), so *every* 600 ms log/vendor flush produces a new context object and re-renders every context consumer (Overview, Leads, Settings, Automations, the layout, the folders sidebar) plus the whole provider subtree.

There is no store library, no React Query/SWR, no server-state cache, no selectors, and no request deduplication. Components call `axios` directly with `API_URL` (`apiConfig.js:19`); 12 files import axios separately.

### 3.2 SSE consumption (`/api/logs/stream`)

`ScraperDashboard.jsx:322-458` opens **one** `EventSource` per dashboard mount and handles named events:

| SSE event | Server emitter | Client handler | Effect |
|---|---|---|---|
| `init` | `server/index.js:179-180` (log backlog, ≤50 lines) | `setLogs(arr)` | log terminal |
| `vendor` | `server/index.js:62-79` (`{action,vendor}`; action `inserted`/`out-of-bounds`) | pushes into `vendorBuffer`/`oobBuffer`; flushed every 600 ms into `vendors` | live lead feed + map; dedupe by `id`, and by `phone` for non-null phones (`:397-403`) |
| `grid_points` | `server/index.js:81-88` | `setGridPoints` (unused by any page) | — |
| `dispatch_targets` | `server/index.js:100-107` | toast | — |
| `active_point` | `server/index.js:109-116` (`{instanceId, lat/lng, locationName, completed}`) | `setActivePoints` (cap 20) | radar map |
| `progress` | `server/index.js:118-125` | `setSearchProgress` | HUD/mandal tree/ETA |
| `intervention` | `server/index.js:90-98` | **not handled** | manual-intervention prompts are invisible |
| default `message` | `addLog` → `sendSse` (`server/index.js:48-60`) | `onmessage` → log buffer (cap 200) | log terminal, keyed filters |

Reconnection is left to the browser; `sseStatus` is displayed but never used to recover state. **In parallel**, `ScraperDashboard` polls:
- `GET /api/vendors?since=…` + `GET /api/public/admin/list` + `GET /api/vendors/out-of-bounds?since=…` every **3 s** (`ScraperDashboard.jsx:543-549,741-779`);
- `GET /api/scrape/jobs` every **4 s** (`:781-785`).

So each running dashboard issues ~45 HTTP requests/minute at idle plus SSE; the same vendor is received via SSE and then re-fetched by polling. Cleanup is also buggy: the 600 ms `bufferInterval` (`:393`) is **not cleared** in the effect cleanup (`:451-457` clears a non-existent `logInterval`), and the semantic worker created at `:494` is never terminated — both leak across unmounts (and StrictMode double-mount in dev).

### 3.3 Session / folder model

"Lead Vault"/"Folder"/"Session" are the same object in three storage locations:

1. **Server JSON files** — `server/src/routes/sessionRoutes.js`: `POST /api/sessions/save` writes `server/db/user_sessions/<userId>/<sessionId>.json` containing **all leads inline**; `GET /api/sessions/list` scans *all* user directories and returns metadata **without leads**; `GET /:userId/:sessionId` returns the full object.
2. **Client localStorage** — `sessionManager.js`: `gomandap_search_sessions_v1`, capped at 50 sessions, each `leads: leads.slice(0,500)` (`:314-372`); `gomandap_user_uuid` (random, not auth); `gomandap_search_history`.
3. **Server-side auto-save** — after each omni run the orchestrator writes its own vault file with ID `session_<Date.now()>` (`server/src/routes/scrape.js:888-930`).

The client never passes its own `sessionId` or `userId` to `/scrape/omni` (`ScraperDashboard.jsx:873-879`), so the server saves under a different ID than the client auto-save (`Overview.jsx:668-683`). Result: **each search can create multiple vaults**. Observed in `server/db/user_sessions` (27 files, 3.2 MB): e.g. `sess_rental_cars_bangalore_20261021083748`, `…083818`, `…083848` (three files for one run), two 0-lead `session_…` files, and one file whose category is the location (`sess_macherla_andhra_pradesh_full_…`). Server list also returns **every user's sessions to every caller** (`sessionRoutes.js:66-72` scans all subdirectories; `apiConfig` user ID is client-generated), contradicting the "100% Isolated Vaults" UI copy.

On first load with empty localStorage, `getLocalSessions()` writes **three entirely fabricated sessions with fake leads/phones** ("Amaravathi Moments Photography…", `sessionManager.js:18-291`). These are then merged with server sessions by `fetchAllUserSessions()` (`sessionManager.js:375-395`) and displayed in Folders/CRM/Analytics, and their leads can be exported. The first-run experience of the product is therefore fake lead data.

Folder loading paths replace the **global** `vendors` array (`ScrapedFoldersSidebar.jsx:110-112,189`, `Overview.jsx:658-665`), so clicking a vault mutates the cockpit's data view until the next poll merges the server DB back in.

### 3.4 Lead flow, end to end

```
UniversalSearchBar.onSearchQuery
  → Overview sets category/location (+district/mandal/resolve coords)
  → ScraperDashboard.startScrape → POST /api/scrape/omni {query,category,location,strategy:'full',enabledEngines}
  → server orchestrator SSE: progress / active_point / vendor
  → ScraperDashboard buffers 600ms → setVendors(dedupe id/phone)
  → Overview.filteredLiveLeads (client-side relevance heuristics + freshness window)
      → map markers (max 200), lead feed (max 80), KPI cards
  → useEffect debounce 4s: saveSearchSession(filteredLiveLeads)
      → localStorage (50 sessions × ≤500 leads) + POST /api/sessions/save (duplicate files)
  → Folders / FolderDetail / CRM read merged localStorage+server session list
      → FolderDetail/CRM stage/notes → localStorage (3 schemas) + fire-and-forget CRM PATCH
  → Exports: CSV/JSON from session leads; CSV from Overview; ZIP from old dashboard context
```

Consequences: Leads are duplicated across display surfaces with different filters; `verified`, `pushed`, `pushedToProd`, `qualityScore`, `tier`, `crmStage` mean different things in different components; and there is no single canonical read model for a "lead".

### 3.5 Caching / optimistic updates

There is no shared cache. Per-component caching: `proxyFetch` 60 s `Map` (dead path), `IntelligentSearchBar` OSM `useRef` cache (dead), Fuse indexes, React state. Optimistic updates are inconsistent: `Users` and `CRM` update local state then fire the API; verify/delete/assign/push all **re-fetch the entire vendor DB** (`ScraperDashboard.jsx:901-942`) or rely on the 3 s poll. Failed pushes still toast success in some flows (`Leads.jsx:185-190` — `pushToProd` swallows errors internally then the caller toasts success; then the real failure toast appears too).

---

## 4. UX / product gaps for a world-class lead-gen platform

Legend: ✅ present / ⚠️ partial / ❌ missing.

### 4.1 Search & discovery

| Capability | State | Evidence / gap |
|---|---|---|
| Natural-language search with typo correction | ⚠️ | `UniversalSearchBar`: only 20 hardcoded `COMMON_WORDS` for Levenshtein correction (`:177-199`); 5 fake default history items (`:86-92`); suggestions from a ~660-line AP/Telangana/metro gazetteer, not "780+ districts". |
| Preview results before scraping / scope selection | ❌ | Selecting any suggestion immediately starts a scrape (`:235-249`, `Overview.jsx:830-856`). No "search vs deep scrape", no result-count preview. |
| Engine selection, radius, grid density, strategy | ❌ | `enabledEngines` default is sent but has **no UI control**; `searchScope` sent as `'full'` and ignored server-side; `searchRadius` is undefined (context never provides it). Deleted with the old search bar. |
| Search filters (rating, phone availability, category synonyms) | ⚠️ | Only post-hoc client filters: WhatsApp/★4.2+ in Overview (`Overview.jsx:1351-1372`), more on Leads; no server-side query filters/pagination. |
| Saved searches / alerts / monitoring / change detection | ❌ | Only a 10-item `gomandap_search_history` localStorage list with clear/delete. No saved-search entities, no alerting, no re-run schedule, no diffing. |
| Multi-query / bulk search UX | ⚠️ | CSV upload in Settings/Automations (naive parser); no queue UI with progress, retrites or per-row errors. |

### 4.2 Lead quality & verification

| Capability | State | Gap |
|---|---|---|
| Verification state | ⚠️ **misleading** | Single `verified` boolean, manually toggled; UI labels any phone as "WhatsApp Verified" / "100% Reachable Mobile Numbers" (`Overview.jsx:969-975`, `SearchProgressHUD.jsx:174-176`, `Leads.jsx:303-307`). No phone validity, DND, carrier, WhatsApp-existence checks, no per-field verification status or provenance. |
| Data verification UI (field-level confidence, source, last checked) | ❌ | Detail drawers show single fallback values (e.g. quality "96/100 (A-Grade)" when absent, `Overview.jsx:1892`; "Verified Customer Reviews" placeholder, `:1701`; rating "4.5"/"15 reviews" in `FolderDetail.jsx:451-456`). |
| Review mining (review text, sentiment, keywords, recent activity) | ❌ | Only `rating`/`reviewsCount` numbers are stored/displayed; no review corpus, themes or competitor comparison. |
| Dedupe review / merge | ❌ | Duplicates are silently hidden by `id`/`phone` (and leaked across sessions); no "possible duplicates" review, no merge/split UI, no canonical business entity across platforms. |
| Lead scoring | ⚠️ | Three different additive scores (`proxyFetch.js:85-100`, `FolderLeadsModal.jsx:180-187`, server `qualityScore`) + fake tiers. No explainability, weighting config, model versioning or calibration. |
| Data freshness / last verified | ⚠️ | `scrapedAt` shown, but no freshness badges/filters, no stale-lead warnings, no refresh action per lead/vault. |
| Suppression / DNC / consent | ❌ | Nothing. |

### 4.3 Coverage, maps, analytics

| Capability | State | Gap |
|---|---|---|
| Coverage map (where do we have data? density, gaps) | ❌ | The map only plots the currently filtered leads; no national/state/district coverage layer, no "scrape this district next" gap analysis. "Territory Directory" shows a hardcoded 5-district fallback (`Overview.jsx:1241-1247`). |
| Geography honesty | ⚠️ | Label claims "780+ Districts / 28 States & 8 UTs" (`Overview.jsx:984-991`), while bundled gazetteer is AP + Telangana + a few metros; `AUTHORITATIVE_MANDALS` has 21 district keys (`panIndiaGazetteer.js:4-96`). |
| Analytics | ⚠️ | CRM funnel/top industries/regions only (from sparse session leads), timeframe selector no-op; no acquisition, contactability, source-quality, verification-rate, coverage or cohort analytics. |

### 4.4 Productivity & workflow

| Capability | State | Gap |
|---|---|---|
| Bulk actions | ⚠️ | Only in `FolderLeadsModal` (bulk stage, copy phones, deep extract). Overview/Leads have no multi-select for assign/verify/export/tag/delete. |
| Sorting & column controls | ❌ | Folders has 5 sort options; Leads/vault details have no column sorting, no table column config, no saved views. |
| Tags / lists / segments / custom fields | ❌ | None. |
| Saved views / filters persistence | ❌ | Filters reset on navigation; only one localStorage "active category" hack (`Leads.jsx:86-93`). |
| Exports | ⚠️ | CSV, JSON and ZIP-of-CSVs; **no Excel (.xlsx)**, no Google Sheets, no CRM sync (HubSpot/Salesforce/Pipedrive/Zoho), no webhook/Zapier, no scheduled export, no field selection, no "export selected". Multiple inconsistent implementations. |
| CRM integration & pipeline | ⚠️ | Local-only kanban with 3 incompatible schemas; no contacts/companies/deals model, no activity timeline UI, no tasks reminders/notifications, no email/WhatsApp send history, no ownership/RBAC. |
| Team collaboration | ❌ | Assignment dropdown exists in the legacy staging UI; Agents CRUD in Settings; but no employee login, no shared inbox, no mentions/comments, no audit log in UI. `Users` page is unreachable. |
| Notifications | ❌ | Nothing (no bell feed; mobile bell icon is decorative). |

### 4.5 Onboarding, trust, errors, mobile, a11y

| Capability | State | Gap |
|---|---|---|
| Onboarding / first-run | ❌ | First run shows fake seeded vaults + a simulated-step HUD; no guided tour, sample export, setup checklist, or "connect backend" wizard beyond a full-screen error. |
| Empty states | ⚠️ | Several good ones (Folders, SearchSessionsDrawer, Leads list), but many screens show fake values instead of empty/unknown. |
| Error states / retries | ❌ | `alert()` on polling failure (`ScraperDashboard.jsx:776`), `window.confirm` for destructive actions, `console.error` for most fetches, silent `.catch(()=>{})` for CRM/deep-enrich, no error boundaries around public routes, error boundary prints raw stack (`ScraperDashboard.jsx:36-47`). No retry/backoff, no offline detection banner, no partial-failure summaries. |
| Loading states | ⚠️ | Skeleton only in Folders; elsewhere spinners/spinners-forever (see sticky `loading` bug §7); no optimistic skeletons for stream. |
| Mobile | ⚠️ | Responsive shell + bottom nav + mobile tabs in FolderDetail; but fixed `h-[680px]`/`h-[520px]` panes, 80-card unvirtualized feeds, 1,849-line full-screen modal with 4-column grids, tiny 8–10 px text, no pull-to-refresh, no PWA/offline. `body{overflow:hidden}` (`index.css:63`) can clip public pages. |
| Accessibility | ❌ | Buttons are icon-only without `aria-label`s; modals are `<div onClick>` without `role="dialog"`/focus trap/Escape-only handling; low-contrast text (`white/25` at 8 px); emoji as icons; no skip links; animation reduced-motion CSS exists (`index.css:659`) but many JS animations (framer-motion) ignore it. |
| Internationalization/currency | ❌ | India-focused but pricing in USD and "OmniLead AI" brand; no ₹/GST/CPM expectations; hardcoded English copy. |
| Auth / account / billing UI | ❌ | No login/logout/session, no role-aware UI, no billing/paywall enforcement (Pricing "Subscribe" is a dead button; Marketplace paywall unreachable). |

---

## 5. Performance & maintainability

### 5.1 Giant files (top by size/lines, `client/src`)

| Rank | File | Size / lines | Responsibility & issues |
|---|---|---|---|
| 1 | `pages/dashboard/Overview.jsx` | 101 KB / 2,003 | Whole cockpit: 5 Leaflet DivIcon factories, map bounds logic, search wiring, 7 local filter states, leads feed, drawer, session drawer, logs modal, automation modal, KPI cards, 200-marker map. ~15 useEffects, ~20 useStates. |
| 2 | `components/FolderLeadsModal.jsx` | 92 KB / 1,849 | Full-screen vault CRM: grid/table/list views, 3 CRM stores (localStorage), custom-lead creator, pitch templates, bulk actions, 3 modals. Three near-duplicate card layouts in one file. |
| 3 | `pages/LandingPage.jsx` | 86 KB / 1,472 | Static marketing + interactive fake demo (sample datasets, timers, FAQ, donation modal, WhatsApp CTA matrix). |
| 4 | `pages/dashboard/Leads.jsx` | 52 KB / 1,078 | Four views (kanban/list/categories/map), 3 modals, 2 memoized card components, 6 filters. |
| 5 | `ScraperDashboard.jsx` | 47 KB / 1,169 | De-facto global store + provider + SSE + polling + legacy vendor/folder cards + exports + all mutation handlers. |
| 6 | `pages/dashboard/FolderDetail.jsx` | 29 KB / 684 | 3-pane vault/CRM view, local CRM store. |
| 7 | `pages/dashboard/Automations.jsx` | 31 KB / 672 | 7 mock automations + 4 templates + 2 modals; only 2 API paths real. |
| 8 | `components/UniversalSearchBar.jsx` | 24 KB / 615 | Search/autocomplete/typo correction/auto-execute; 6 suggestion sections. |
| 9 | `pages/dashboard/Folders.jsx` | 26 KB / 596 | Vault grid/list + create modal. |
| 10 | `pages/dashboard/CRMPipeline.jsx` | 24 KB / 567 | Kanban + drawer + its own stage constants. |
| 11 | `layouts/DashboardLayout.jsx` | 15 KB / 405 | Shell + nav + folders sidebar + mobile nav; inlines 6 color theme maps. |

Adjacent: `Settings.jsx` 452, `LocationIntelligence.jsx` 440, `CRMAnalytics.jsx` 348, `SearchSessionsDrawer.jsx` 383, `ScrapedFoldersSidebar.jsx` 431, `OmniSearch.jsx` 434, `IntelligentSearchBar.jsx` 436 (last three dead).

### 5.2 Inline duplication (rewrite must consolidate)

- **Lead card UI implemented 6+ times**: `Overview.jsx:1470-1585`, `Leads.jsx` (LeadKanbanCard/LeadRowCard + modal), `FolderLeadsModal.jsx` (grid/table/list), `ScrapedFoldersSidebar.jsx`, `FolderDetail.jsx`, `CRMPipeline.jsx`, `EmployeeDashboard.jsx` (dead). Same fields, different fallbacks, different WhatsApp URL builders.
- **CRM stage constants defined 3 times**: `FolderLeadsModal.jsx:19-27`, `CRMPipeline.jsx:16-23`, `FolderDetail.jsx:19-26` (plus server's list). Values already drift ('lost' valid on server, absent in UI).
- **Score/tier logic 3 times**: `proxyFetch.js:85-100`, `FolderLeadsModal.jsx:180-187`, server `deep-enrich` scoring.
- **Leaflet icon factories 6+ times** (`Overview.jsx:37-137`, `Leads.jsx:30-46`, `LocationIntelligence.jsx:17-32`) with repeated Google CDN icon URLs duplicated in 4 files; Leaflet CSS imported in 5 files plus a CDN copy in `index.html:9`.
- **CSV export 4+ implementations**: `ScraperDashboard.jsx:980-1015`, `Overview.jsx:616-656`, `sessionManager.js:439-485`, `FolderLeadsModal.jsx:388-416`; plus a dead inline CSV in `OutOfBounds.jsx:25-45`.
- **Map clustering only in `Leads.jsx`**; `Overview` renders up to 200 raw Markers with HTML-divIcons.
- **Date/currency/phone normalization** repeated everywhere with inconsistent `+91` handling: `wa.me/91…` (FolderDetail/FolderCRM) vs bare 10-digit `wa.me/…` (Overview `:1725`, `FolderLeadsModal:1609`) — broken links either way when numbers already include a country code.
- **Search bars implemented 3 times**, only `UniversalSearchBar` used; `OmniSearch`/`IntelligentSearchBar` dead but kept in tree.
- **Cards/buttons/badges mix raw Tailwind with custom `.card/.btn/.badge` CSS** (`index.css`), producing three visual systems (neon dashboard, light legacy pages, marketing pages).

### 5.3 Re-render / memory risks

- Context identity changes on every 600 ms flush (see §3.1); `logs` also updates every flush; the sidebar/layout consumes `loading` so the whole shell re-renders during scrapes.
- `Overview` recomputes `filteredLiveLeads`, `mapDisplayVendors`, `activeTargetCoords`, `activePoint` and 14 mandal-chip counts on every vendor flush — no `useDeferredValue`/memo boundary at row level; lead cards are not memoized.
- `FolderLeadsModal` renders **all** filtered leads in grid mode (no virtualization/windowing), each with a `select` and multiple buttons; 500-lead vaults produce 500 DOM cards + motion wrappers.
- Unbounded state: `vendors` = entire DB and grows for the session; `publicUsers` fetch result unused; logs capped (good: 200), active points capped 20, map markers capped 200, feed 80, leads list 50/column, sessions 50 local. Server calls still return the full DB (no pagination).
- Leaks: un-cleared `bufferInterval` (`ScraperDashboard.jsx:393` vs cleanup `:451-457`); `SemanticWorker` never terminated (`:494`); `debouncedGoogleSearch/debouncedOSMSearch` timers not flushed on unmount; StrictMode doubles the SSE connection + worker in dev (`main.jsx:9-10`).
- `framer-motion` used for nearly every element (cards, modals, sidebar), and `AnimatePresence` wraps large lists — heavy animation work on low-end phones; `useDeviceCapability` exists but is used in only 2 pages to choose mobile tabs, not to reduce work.

### 5.4 Bundle footprint & build config

- Committed `client/dist`: `index-*.js` **886 KB** (all eagerly imported code: React 19 + framer-motion + Leaflet/react-leaflet + the 101 KB Overview page + axios + papaparse/file-saver + context + layout), `index-*.css` **205 KB**, `Leads` chunk 84 KB, `apiConfig` chunk 61 KB (axios + sessionManager), plus a duplicate 1 MB `cyberpunk_anime_bg.png` in both `public/` and `dist/`.
- `App.jsx:12` imports `OverviewPage` **eagerly**, so the public landing page downloads Leaflet + the dashboard code; `Overview` also imports `leaflet.css` (bundled) while `index.html:9` loads Leaflet CSS from unpkg with SRI → duplicate CSS and an external-CDN dependency.
- Dead-but-installed deps: `@huggingface/transformers` (10.2 MB in node_modules, not imported), `@orama/orama` (only dead `OmniSearch`), `olamaps-web-sdk` (not imported), `react-draggable` (not imported), `leaflet.markercluster` (direct import unused; transitively used by `react-leaflet-cluster`), `uuid` (only dead engines). `jest`-style test tooling absent.
- `vite.config.js:28-31` **hardcodes an Ola Maps API key** into `define` (leaks into every build if referenced; secret-in-source). `build.chunkSizeWarningLimit: 30000` (`:33`) suppresses all chunk-size warnings. No `manualChunks`, no compression, no legacy browser targets, no sourcemaps policy.
- `/logs` dev proxy (`vite.config.js:17-21`) is unused (client uses `/api/logs/stream`). `BACKEND_URL` in `apiConfig.js:14-16` is dead. `API_URL` ternary is `'/api' : '/api'` (no-op) — the only real switch is `VITE_API_URL`, which is wrong in production (see §6).
- `tailwind.config.js` is inert under Tailwind v4 (CSS-first config; `@tailwindcss/postcss` used in `postcss.config.js`), so the `brand` colors are decorative only.
- `eslint.config.js` disables `no-unused-vars`, `exhaustive-deps` and several React-hooks rules → ~30 dead files/components and stale hooks accumulate silently. No TypeScript/PropTypes, no tests, no CI config, no error telemetry.
- HTML/brand issues: missing `/favicon.svg` (referenced `index.html:5`, not present in `public/`), title says "LeadHarvest Pro" while app brands are Scraper.co.in/OmniLead/Gomandap; `index.css` embeds Google Fonts `@import` (render-blocking) and `body{overflow:hidden}` (`:63`) that can clip the public marketing page.

---

## 6. Frontend ↔ backend contract

### 6.1 Environment & URL handling

- `client/src/apiConfig.js:14-19`: `API_URL = import.meta.env.VITE_API_URL || '/api'`; `BACKEND_URL` computed but unused. Local dev relies on the Vite proxy (`vite.config.js:10-16`).
- **Production is misconfigured**: `client/.env.production:1` → `VITE_API_URL=https://gomandap-api.onrender.com/api/scraper-app`; no file in `server/src` is mounted under `/api/scraper-app`. The committed `dist` bundle contains this host. Firebase config (`client/firebase.json`) only rewrites to `index.html`; there is no `/api/**` rewrite/proxy, so the deployed app cannot use relative `/api` either.
- No auth headers/tokens anywhere (no `Authorization`, no interceptors). `sessionManager` sends a client-generated `userId` (`usr_…`) only to session endpoints; all other calls are anonymous/global.
- `API_URL` is `/api` at runtime; SSE is `new EventSource('/api/logs/stream')` (`ScraperDashboard.jsx:326`) — server exposes both `/api/logs/stream` and `/logs/stream` (`server/index.js:199-200`), so this one is fine.

### 6.2 Endpoints used vs available

✅ exists · ⚠️ exists but contract mismatch · ❌ missing (called by client, not routed server-side)

| Client call (file) | Server route | Status / mismatch |
|---|---|---|
| `GET /vendors?since` (`ScraperDashboard.jsx:745`) | `GET /api/vendors` (`vendors.js:17`) | ✅ full DB, no pagination; `since` filter uses client `Date.now()` vs server `scrapedAt` |
| `GET /vendors/out-of-bounds?since` (`:747`) | `GET /api/vendors/out-of-bounds` | ✅ |
| `GET /public/admin/list` (`:746`, `Users.jsx:17`) | `GET /api/public/admin/list` | ✅ (but fetched every 3 s and result stored in unused `publicUsers`) |
| `GET /scrape/jobs` (`:721`) | `GET /api/scrape/jobs` | ✅ returns omni sessions + cron jobs |
| `POST /scrape/omni` (`:873`) | `POST /api/scrape/omni` | ⚠️ payload `{query,category,location,strategy:'full',enabledEngines}`; server accepts `radius,gridDensity,sessionId,userId` but client never sends them; `strategy` is only logged server-side (`scrape.js:701`) so `'full'` is meaningless; response `{message,sessionId}` is ignored by client |
| `POST /scrape/jobs/stop-all` → fallback `/scrape/stop` (`:789`) | both exist | ✅ |
| `POST /scrape/jobs/update` (`:806`) | `POST /api/scrape/jobs/update` | ⚠️ client only sends `{category,action:'start'|'stop',intervalMs}`; server `'create'` action (which actually schedules) is never used by UI |
| `POST /scrape/upload` (`:829`) | `POST /api/scrape/upload` | ✅ shape `{tasks:[{category,location}]}` |
| `GET/POST /scrape/settings` (`Settings.jsx:30,41`) | both exist | ✅ keys masked with `*`, server ignores strings containing `**` |
| `PUT /auth/admin` (`Settings.jsx:56`) | `PUT /api/auth/admin` | ⚠️ works but unauthenticated; client never logs in |
| `GET/POST/DELETE /employees` | `/api/employees` | ✅ |
| `POST /upload` (`Settings.jsx:74`) | `POST /api/upload` | ⚠️ response `url=/api/uploads/<file>` while static files are served at `/api/upload/<file>` (`server/src/routes/upload.js:22,27`) → avatar URLs 404 |
| `GET /knowledge`, `GET /suggest`, `GET /location/search` (`ScraperDashboard.jsx:564,650,661`) | `api.js:37-112` | ✅ but only used by legacy dead search UI |
| `GET /logs`, SSE `GET /logs/stream` | both exist | ✅ |
| `POST /sessions/save` (`sessionManager.js:358`) | `/api/sessions/save` | ✅ writes full leads inline |
| `GET /sessions/list/:userId` (`sessionManager.js:380`) | `/api/sessions/list` | ⚠️ **returns no `leads` and no `name`** (`sessionRoutes.js:93-102`) → `Folders` shows "Unnamed Vault" and exports blank; `CRMPipeline`/`CRMAnalytics` build from `v.leads` and are empty for server-only sessions; also scans **all** user dirs (cross-tenant leak) |
| `GET /sessions/:userId/:sessionId`, `DELETE` | both exist | ✅ |
| `PUT /vendors/:id` "verify" (`ScraperDashboard.jsx:903`, `Leads.jsx:876,1059`) | `PUT /api/vendors/:id` | ⚠️ server **forces `verified:true`** (`vendors.js:79`); `Leads` passes a boolean body (`handleVerify(id, !vendor.verified)`) → `express.json` strict rejects primitive → 400. Unverify impossible; Leads verify always fails |
| `DELETE /vendors/:id` | ✅ | ✅ |
| `POST /vendors/assign` | ✅ | ✅ |
| `POST /vendors/push` | ✅ | ⚠️ pushes **all** verified unpushed vendors regardless of the filtered list the button describes; 400 when none (client shows both error and success toasts) |
| `POST /vendors/clear-unverified` | ✅ | ✅ |
| `PATCH /crm/leads/:id/stage` (`FolderDetail.jsx:108`, `CRMPipeline.jsx:154,171`) | `PATCH /api/crm/leads/:vendorId/stage` (`crm.js:21`) | ⚠️ called with **session-local lead IDs**; server searches global vendors → no-op, returns `{success:true}` anyway; no notes endpoint used (`POST …/notes` exists) |
| `POST /scrape/deep-enrich` (`FolderLeadsModal.jsx:422,443`) | ✅ | ✅ server runs async and updates vendors |
| `POST /vendors/extract-phones` (`Automations.jsx:216`) | — | ❌ no such route (`/api/automations/extract-urls` exists and is unused) |
| `POST /scrape/cheerio` (`ScraperDashboard.jsx:959`) | — | ❌ missing (`/python`, `/maps` exist; `/firebase` is a stub that returns success only) |
| `GET /api/proxy?url=…` (engines, `proxyFetch.js:9`, `ScraperEngine.js:4`) | `server/src/routes/proxy.js` **unmounted** | ❌ 404 for the whole client-scraping subsystem |
| `POST /api/vendors` (array) (`FrontendQueue.js:191`) | — | ❌ no `POST /` vendors route (only `POST /lead`, unused by client) |
| `GET /locations/memory`, `/warm-state*` (`LocationIntelligence`) | ✅ | ✅ but page has no route |
| `POST /locations/geocode-sublocations`, `GET /locations/fetch-osm` (`LocationIntelligence:164,186`) | — | ❌ missing (dead page anyway) |
| SSE `intervention` event | server emits (`server/index.js:90-98`) | ⚠️ client has no listener → manual-intervention UI never appears |
| `GET /vendors/public` (`Marketplace.jsx:50`), `POST /public/auth|reveal` | ✅ | ✅ but Marketplace page is never routed |
| `POST /public/deep-extract` (`PhoneScraper.jsx:33`) | ✅ | ✅ live public route |
| `POST /public/admin/credits|permissions` (`Users.jsx:31,45`) | ✅ | ✅ but page has no nav route |

**Fallback-prefix smell:** server mounts duplicate `/api/api/*` aliases (`server/index.js:156-162`) to tolerate a historical double-`/api` client bug; the client has both `API_URL` and an unused `BACKEND_URL`. The rewrite needs exactly one base-URL module + generated/typed client.

---

## 7. Concrete bugs / risky code (file:line) and dead files

### 7.1 P0 — broken or dangerous in real use

| # | Finding | Evidence |
|---|---|---|
| P0-1 | Production API URL points at a retired backend (`…onrender.com/api/scraper-app`) | `client/.env.production:1`; `src/apiConfig.js:14-19`; confirmed inside `client/dist/assets/apiConfig-1nFv0qmQ.js` |
| P0-2 | No authentication/authorization in UI; public `/marketplace/*` renders full admin cockpit; `/login` bypasses login; hardcoded admin identity | `src/App.jsx:4,42-46,74-87,90`; `src/Login.jsx` never rendered; server `index.js:142-154` has no auth middleware |
| P0-3 | Cross-tenant leak: sessions list scans every user directory; client `userId` is a random localStorage UUID, not auth | `server/src/routes/sessionRoutes.js:59-118`; `src/utils/sessionManager.js:8-15` |
| P0-4 | CRM stage/notes set in the richest UI are stored under a different localStorage key than CRM pages read → invisible/lost; server CRM PATCH is a silent no-op for session lead IDs | `components/FolderLeadsModal.jsx:47-49` vs `pages/dashboard/CRMPipeline.jsx:50,147,166` / `CRMAnalytics.jsx:51` / `FolderDetail.jsx:75-77`; `FolderDetail.jsx:106-110` |
| P0-5 | Server-session list omits leads/name → Folders shows "Unnamed Vault", Folders CSV export is empty, CRM/Analytics tiles are zero for server-only data | `server/src/routes/sessionRoutes.js:93-102`; `src/pages/dashboard/Folders.jsx:57-61,374`; `CRMPipeline.jsx:70-85`; `CRMAnalytics.jsx:47-82` |
| P0-6 | Duplicate vaults: client auto-save + server orchestrator auto-save with different IDs; 27 session files/3.2 MB for ~8 distinct searches, including 0-lead and duplicate-second files | `src/pages/dashboard/Overview.jsx:668-683`; `server/src/routes/scrape.js:888-930`; evidence in `server/db/user_sessions/**` |
| P0-7 | First-run fake sessions/leads are seeded and merged into Folders/CRM/exports as if real; fake first-run "experience" | `src/utils/sessionManager.js:18-291,293-311,375-395` |
| P0-8 | Verify flow broken both ways: Leads sends boolean body → 400; server forces `verified:true`, so unverify is impossible | `Leads.jsx:876,982,1059`; `ScraperDashboard.jsx:901-907`; `server/src/routes/vendors.js:73-89` |
| P0-9 | "Export CSV" on Leads exports the staging-phone dataset, not the filtered/visible leads; "Push to Prod" pushes *all* verified leads, not the filtered set, and can toast success despite failure | `Leads.jsx:185-190,258-264`; context `exportToCSV` `ScraperDashboard.jsx:980-1002`; `server/src/routes/vendors.js:190-213` |
| P0-10 | Sticky "scanning" state: `loading` is set true on scrape start / running job but `fetchJobs` never clears it; after a scrape finishes the sidebar/HUD stays "SCANNING LIVE" until Master Abort | `ScraperDashboard.jsx:719-736,872-880,787-802`; `Overview.jsx:419` |
| P0-11 | Fabricated AI/metrics presented as real: dummy semantic worker (identical embeddings, no `ready` event), "AI Verified", "AI Pitch", "14.8/s", "18 workers", "96/100 A-Grade", "780+ Districts" | `src/semanticWorker.js:4-17,37-73`; `ScraperDashboard.jsx:492-541,610-619`; `Overview.jsx:761,910,985,997,1892`; `ScrapedFoldersSidebar.jsx:283-287`; `FolderDetail.jsx:451-456,548-555` |
| P0-12 | Uploaded team-avatar URLs 404 (server returns plural `/api/uploads/`, static serves `/api/upload/`) | `server/src/routes/upload.js:22,27`; `Settings.jsx:70-85` |

### 7.2 P1 — correctness, data integrity, trust

| # | Finding | Evidence |
|---|---|---|
| P1-1 | CSV bulk upload parser splits on `\n`/`,` without quote handling → breaks quoted commands, CRLF, commas in addresses; no validation/error surface | `ScraperDashboard.jsx:814-836`; `Settings.jsx:164`; `Automations.jsx:538` |
| P1-2 | Two writers to `gomandap_search_history` use incompatible formats (categories vs full queries, 5 vs 10 entries, one doesn't guard JSON errors) | `ScraperDashboard.jsx:283-285,855-861` vs `UniversalSearchBar.jsx:81-122` |
| P1-3 | `Overview` destructures `searchRadius/setSearchRadius` that the provider never supplies → always `undefined`; many other context fields are dead (`suggestions`, `knowledge`, `searchScope`, `gridPoints`, `searchHistory`, `activeInput`, `modelLoadingStatus`) | `Overview.jsx:403-417`; provider `ScraperDashboard.jsx:1058-1127` |
| P1-4 | `FolderLeadsModal` filter uses the *filtered* index to look up CRM stage (`list.filter((l,idx)=>getLeadStage(l,idx))`), so stages shift as filters change; lead keys include array index for id-less leads → unstable | `FolderLeadsModal.jsx:136,224-264` |
| P1-5 | Custom "Generate Lead" entries are written to a separate localStorage list, never merged into the session/server; invisible in Folders/CRM/exports elsewhere; lost on other devices | `FolderLeadsModal.jsx:70-89,294-342` |
| P1-6 | Folder page "Create Vault" writes only localStorage (`gomandap_search_sessions_v1`) with a `name` property nothing else reads; server never knows about it; `timestamp` is a number while others are ISO strings | `Folders.jsx:63-89,116-139` |
| P1-7 | Phone normalization/WhatsApp URL bugs: some links prefix `91`, some don't; some double-prefix if the stored number already has `+91`; copy may include non-digits | `Overview.jsx:1472-1474,1725`; `FolderLeadsModal.jsx:1609`; `FolderDetail.jsx:474`; `CRMPipeline.jsx:458`; `EmployeeDashboard.jsx:64-69` |
| P1-8 | `navigator.clipboard.writeText` unguarded → throws in non-secure HTTP contexts (LAN deployments are explicitly supported: `vite.config.js:7 host 0.0.0.0`, `apiConfig.js` detects `192.168/10./172.`); no fallback | `Overview.jsx:608-613`; `FolderLeadsModal.jsx:189-195`; `Leads.jsx:178-183`; `FolderDetail.jsx:113-119`; others |
| P1-9 | "Open Page" in the vault modal does `window.location.href` after `onClose` (full reload; possible race with React unmount) | `FolderLeadsModal.jsx:499-510,640-657` |
| P1-10 | `FolderLeadsModal` deep-extract "for all" passes `sessionId` that server uses to filter `v.sessionId`; session IDs in vault JSON are the client `sess_…` ID, which scraper vendors never have (`sessionId` is the server orchestration ID) → likely enriches 0 leads | `FolderLeadsModal.jsx:419-433`; `server/src/routes/scrape.js:1030-1045` |
| P1-11 | Overview map/logs drawer memory: up to 200 markers with custom divIcons; unvirtualized 80-card feed; `AnimatePresence` per card | `Overview.jsx:1203-1225,1470` |
| P1-12 | Duplicate/contradictory KPI labels: "Verified Quality — Geocoded & phone validated" counted as `v.verified` (manual flag); "WhatsApp Ready" counted as phone-string presence | `Leads.jsx:101-103,303-318`; `Overview.jsx:969-975` |
| P1-13 | Unhandled `intervention` SSE event means the server's manual-captcha workflow can never be surfaced; scraping appears to hang | `ScraperDashboard.jsx:330-390` (no `intervention` listener); `server/index.js:90-98` |
| P1-14 | `pushToProd`/`handlePushAll` success toast fires before/regardless of the request outcome; similar double/false toasts in `Automations` (all mock branches) | `Leads.jsx:185-190`; `Automations.jsx:229-237,655-663` |
| P1-15 | Unbounded `vendors` state + full-DB refetch on every mutation and 3 s poll; `since` filter can permanently desync after a session load (`lastSyncRef` not reset in `handleLoadSession`) | `ScraperDashboard.jsx:741-779,869`; `Overview.jsx:658-665` |
| P1-16 | `marketplace` lazy import and `Login` import are never rendered; `/marketplace/*` renders the dashboard instead; PhoneScraper links to `/marketplace` expecting a marketplace | `App.jsx:4,24,74-83`; `PhoneScraper.jsx:58` |
| P1-17 | `getSeedSessions` fake phone numbers (~12 businesses) stored/exportable; landing page displays real-looking business names/phones in fake demo data | `sessionManager.js:18-291`; `LandingPage.jsx:27-51` |
| P1-18 | Unvalidated external URLs from scraped data are rendered as clickable `href`/`img src` (`vendor.website`, `vendor.images`, `logo`) → `javascript:`/tracking risk; images hotlink third-party sites and fall back to `ui-avatars.com` (external dependency) | `ScraperDashboard.jsx:140-160`; `FolderLeadsModal.jsx:1024-1033,1095-1103`; `FolderDetail.jsx:484-494` |

### 7.3 P2 — quality, maintainability, polish

- `alert()` / `window.confirm` as primary UX for network errors and destructive actions: `ScraperDashboard.jsx:776`, `FolderLeadsModal`, `Folders.jsx:47`, `SearchSessionsDrawer.jsx:103,154`, `Employees`, `Marketplace.jsx:90`, `EmployeeDashboard` (dead).
- Error paths often only `console.error` with no user feedback: `CRMPipeline.loadData`, `CRMAnalytics.loadAnalytics`, `Users.fetchUsers`, `FetchEmployees`, `fetchKnowledge`.
- Dead interval/worker cleanup and StrictMode double-mount (see §5.3).
- `ErrorBoundary` exposes component stack to end users (`ScraperDashboard.jsx:36-47`) and only wraps the dashboard, not public routes.
- No `key` stability in several lists (`key={idx}` in map markers/popups, `RecentSessions`); map uses `vendor.id || idx`, causing marker re-mounts every flush.
- `FolderDetail` deep-links ignore `folder.name`; `CRMPipeline` ignores route param `leadId` (`App.jsx:102` vs `CRMPipeline.jsx` has no `useParams`).
- Navigation gaps: `/app/leads` and `/app/users` have no nav entries; folders detail and leads CTAs don't cross-link; no breadcrumbs; mobile bottom nav links to Settings but not Vaults detail.
- Branding inconsistency: Scraper.co.in / LeadHarvest / OmniLead / Gomandap across pages; Settings "React 18" while React 19 installed (`Settings.jsx:406`); Pricing USD plans vs "100% free".
- Committed build artifacts and duplicate 1 MB PNG (`client/dist/`, `client/public/cyberpunk_anime_bg.png`); stray root scripts `client/orama_qa.mjs`, `client/test_orama.mjs`, `client/skills-lock.json` (Firebase agent skills) unrelated to the app.
- Missing favicon; duplicate Leaflet CSS; external CDN/unpkg/ui-avatars/ArcGIS tiles/nominatim dependencies used directly from the browser without keys or policy handling.
- `eslint.config.js` turns off `no-unused-vars`, `exhaustive-deps` and several hooks rules (`:19-28`), which explains the accumulation of dead code/stale closures.
- No tests, no Storybook, no TypeScript/PropTypes, no error telemetry, no analytics, no feature flags.

### 7.4 Dead / orphan files (no rendered path)

**Never imported anywhere:** `components/ApplePicker.jsx`, `components/AppleScrollPicker.jsx` (only by ApplePicker), `components/IntelligentSearchBar.jsx`, `components/OmniSearch.jsx`, `components/PlatformLandingExplainer.jsx`, `EmployeeDashboard.jsx`, `hooks/useQueue.js` (+ `utils/FrontendQueue.js` + `utils/engines/*` chain), `hooks/useSSEScraper.js`, `utils/ScraperEngine.js`, `utils/gridGenerator.js`, `utils/hierarchyEngine.js`, `utils/proxyFetch.js`, `utils/oramaEngine.js` (only dead OmniSearch).
**Registered but unreachable (no route / no nav / shadowed):** `pages/dashboard/LocationIntelligence.jsx`, `pages/dashboard/OutOfBounds.jsx`, `Login.jsx` (route redirects), `pages/Marketplace.jsx` (lazy import, no route). Also `pages/LandingPage.jsx` is live but its demo data/logic is fake by design.
**Dead code inside live files:** vendor/folder legacy cards and search handlers in `ScraperDashboard.jsx:66-270,276-320,581-710`; unused imports/fields across pages; 4 export implementations; 5 map icon factories; 3 search bars; duplicated stage constants.
**Server-side dead route relevant to client:** `server/src/routes/proxy.js` (unmounted); stale `/api/api/*` aliases (`server/index.js:156-162`).

---

## 8. Rewrite implications (short list)

1. **Contract first**: one typed API client generated from the server contract; single base URL from runtime config (`window.__DSH_BOOT__`-style or env), no dead `BACKEND_URL`/`/api/api` fallbacks; auth token handling on every request.
2. **One canonical lead/session/CRM model server-side**, with IDs that are stable everywhere; sessions list must include summary + paginated leads or separate endpoints; kill client auto-save duplication and seed data; add explicit `run_id`/`session_id` from client → server.
3. **Rebuild the shell**: route-level lazy loading, a real store (TanStack Query/Zustand), SSE normalized into a query cache, 250–400-line pages, shared `LeadCard/LeadTable/LeadDetail/FilterBar/ExportMenu` primitives, one design-system layer (replace the `card/btn/badge` CSS + raw Tailwind mix).
4. **Delete the client scraping subsystem** and the dead pages/components; add `noUnusedLocals`-equivalent lint and a bundle budget (initial < ~200 KB gzip, Leaflet lazily loaded only on map routes).
5. **Trust features before growth features**: field-level verification/provenance UI, dedupe review/merge, freshness + suppression, real portfolio/company model, review mining (server-side), then saved searches/alerts, exports (XLSX/CRM/webhooks), coverage map, RBAC/team, billing.
6. **Accessibility/mobile quality gates**: dialog primitives, keyboard/focus, aria labels, contrast tokens, `prefers-reduced-motion` honored in JS, responsive virtualization, PWA/offline consideration.
7. **Observability**: Sentry/OTel, error boundaries per route with user-safe fallbacks, empty/error/loading state library, no fabricated telemetry — show "unknown" when unknown.

---

### Appendix A — Files read in full or in substantial part

`App.jsx`, `main.jsx`, `apiConfig.js`, `Login.jsx`, `ScraperDashboard.jsx`, `EmployeeDashboard.jsx`, `semanticWorker.js`, `context/ScraperContext.jsx`, all `hooks/*`, `layouts/DashboardLayout.jsx`, all `pages/*` and `pages/dashboard/*`, all `components/*` (incl. `FolderLeadsModal.jsx` in three read passes), all `utils/*` and `utils/engines/*`, `data/panIndiaGazetteer.js` (structure/sample), `index.css` (key sections), `vite.config.js`, `postcss.config.js`, `tailwind.config.js`, `index.html`, `package.json`, `eslint.config.js`, `README.md`, `.env.production`, `firebase.json`, `.firebaserc`, `.gitignore`, `public/` listing, `dist/index.html` + asset inventory + bundle grep. Server contract cross-check: `server/index.js`, `server/src/routes/{api,auth,crm,proxy,sessionRoutes,upload,vendors}.js`, relevant `scrape.js` handlers, and `server/db/user_sessions` inventory.

### Appendix B — Data gathered (read-only commands)

`npm ls --depth=0 --prefix client` → all declared dependencies installed (React 19.3.1, Vite 8.3.5, Tailwind 4.3.3, framer-motion 12.43.0, Leaflet 1.9.4); unused-in-code: `@huggingface/transformers`, `olamaps-web-sdk`, `react-draggable`, `@orama/orama` (only dead component), `uuid` (only dead engines), `leaflet.markercluster` (direct).
`server/db/user_sessions` → 27 session JSON files, 3.2 MB, with duplicate/zero-lead/mislabeled-category sessions confirming §3.3/P0-6.
`client/dist` inventory → 886 KB main JS, 205 KB CSS, 84 KB Leads chunk, 61 KB shared axios/session chunk, 1 MB duplicated background image.
