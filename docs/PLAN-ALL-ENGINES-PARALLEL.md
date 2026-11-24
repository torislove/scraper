# PLAN — All Engines Working + Real Parallel Scraping

**Status:** IMPLEMENTED & VERIFIED (2026-11-23) — All parallel engines verified, zero-yield engines revived (JustDial: 30 leads, OSM: 11 leads, Local Finder: 92 leads), SPA bundle phone extraction active, and subvector trade expansion live.
**Evidence date:** 2026-11-23 (smoke test pass, contract test pass, client & master builds pass)
**Scope:** `server/`, `master/`, `client/`, `extension/`

---

## 0. The verdict in one screen

The platform advertises ~30 engines. **In practice it is a Google Maps scraper with 29 decorative switches.**

Measured from `server/data/scraped_vendors.json` (1,381 rows total):

| Source | Rows | Share |
|---|---|---|
| Google Maps | 968 | 70.1% |
| Google Maps Live (Archived Intelligence) | 332 | 24.0% |
| Web Discovery | 22 | 1.6% |
| OpenStreetMap | 21 | 1.5% |
| JustDial | 20 | 1.4% |
| Client RAM Geo Worker | 4 | 0.3% |
| archived duplicates | 14 | 1.0% |
| **everything else** | **0** | **0%** |

Measured from `server/data/engine_health.json` — the last full run cycle (2026-11-23 00:20–00:32):

| Engine | Runs | Failures | Last count | Reality |
|---|---|---|---|---|
| `maps` | 363 | 2 | 2 | **the only real workhorse** |
| `google-local-finder` | 6 | 0 | **0** | green light, zero leads |
| `justdial` | 4 | 0 | **0** | "Mobile API turbo-burst" returns nothing |
| `openstreetmap` | 6 | 0 | **0** | query matches no OSM tags |
| `web-discovery` | 6 | **6** | — | **100% failure rate** |
| `social` | 3 | 0 | **0** | dorks return nothing |
| `geocoder` | 3 | 0 | — | works (utility, not a lead source) |

Six engines ran. Five produced zero. The health board reports them **green**, because `engineHealth` only turns red when a run *throws* — returning 0 is treated as success. That is the single most damaging defect in the system: **the operator cannot see that 80% of the fleet is dead.**

So the plan is not "add more engines." It is:

1. Make the board tell the truth.
2. Make the browser budget real — six engines currently ignore it.
3. Make the five zero-yield engines actually yield.
4. Delete or fix the engines that can never run.
5. Then raise parallelism, because right now the bottleneck is not concurrency — it is that one engine does all the work.

---

## 1. Verified architecture — how parallel scraping actually works today

Parallelism is enforced by **four gates in series**, not one. A job must pass all four before a page loads.

```
HTTP request
   │
   ├─► [Gate 1] clientGate / resolveIdentity      auth + suspension
   │
   ├─► [Gate 2] queue.js  global job queue         session fair-share + priority
   │      └─ getDynamicConcurrency()
   │            maxHttp        = 4 | 8 | 14 | 18  (by RAM: <7.5 / ≥7.5 / ≥14 / ≥30 GB)
   │            maxPlaywright  = browserBudget.discoveryLimit()
   │
   ├─► [Gate 3] browserBudget.js                   hard Chromium ceiling
   │            ≥30 GB → min(8, max(6, cores×0.75))  enrich 3
   │            ≥14 GB → 6 (8-core) or 5             enrich 2
   │            ≥7.5 GB → 4 (6-core) or 3            enrich 1
   │            else   → 2                           enrich 1
   │            hard cap 12 (env SCRAPER_BROWSER_SLOTS up to 16)
   │
   ├─► [Gate 4] requestGuard.beforeJob()           per-engine pacing / cooldown
   │            allow | defer(notBefore) | skip
   │
   └─► engine runs
```

`engineHealth` is deliberately **advisory only** — it never blocks a job (`server/src/services/engineHealth.js:15-16`). That is correct, but it means a red engine is a *display* problem, not a *control* problem, and nothing currently converts "returns 0 forever" into red.

### 1.1 The queue is fair across runs, not just priority-ordered

`server/src/utils/queue.js:217-225, 274-324`:

- Jobs carry `meta.sessionId`.
- `activeSlotsBySession()` counts live slots per run.
- The scheduler picks the runnable job whose **session holds the fewest slots**, tie-broken by declared `priority`.

Consequence: a 1,200-zone Master state sweep and a 108-zone client city sweep both make progress. Without this, the big sweep would eat every slot. With a single run, load is equal everywhere, so the priority gradient is unchanged.

Other queue facts:
- In-memory queue with debounced persist to `data/jobs.json` (no Redis — the file header explicitly says this removed the ECONNREFUSED storm).
- `markSessionAborted(sessionId)` purges that run's pending jobs immediately; a 10-minute timer clears the abort flag.
- **10-minute hard timeout per job** (`queue.js:404`) — Places extraction needs it.
- Deferred jobs use a single `setTimeout` wake-up (`scheduleDeferred`), not a busy loop.
- `PLAYWRIGHT_TASKS` is an explicit allow-list (`queue.js:139-148`): Places, Local Finder, WeddingBazaar, WeddingWire, Mandap, PuppeteerIndiaMART, CrawleeDeep, ScrapySpider. Anything not on the list is counted as an HTTP job — which is why a new browser engine silently bypasses the browser budget until someone adds it here.

### 1.2 The orchestrator's parallel structure

`server/src/services/omniSearchOrchestrator.js`:

| Stage | Lines | Concurrency model |
|---|---|---|
| Engine/country resolution | 460–525 | sequential, cheap |
| Vault open + streaming enricher start | 527–560 | enricher runs concurrently with discovery |
| **Tier-0 burst** (mixed HTTP + browser) | 1106–1289 | `Promise.allSettled` — JustDial, Google Local HTTP, OSM, **Web Discovery (Chromium)**, Wikidata, Trustpilot fire together |
| Directory job queueing | 1307–1359 | one job per directory site, priority **12** |
| Zone job queueing | 1361–1451 | Maps **30→10** gradient, Local Finder only first 2 zones when Maps also on, grid **3→10**, repeat-covered **2** |
| Monitor loop | 1453–1809 | serial but non-blocking: ETA, stall detector, adaptive quad-split |
| Adaptive quad-split | ~1700s | fires on zones with **≥18 leads**, adds 4 micro-cells at priority **18**, capped by `MAX_ADAPTIVE_SPLITS` |
| Late reconciliation | 2080–2379 | dedupe, contact filter, carry-forward, persist |

Post-run stages that run in sequence: cooperative cross-engine phone match → SERP dork for ≤15 phone-less leads → place-detail backfill (60 s budget, 4–8 slots) → zone-yield ledger → reconcile → session purity filter → category fidelity filter → smart dedupe → verified contact filter → carry-forward → final vault persist.

**This is already a genuinely parallel design.** The problem is not the shape — it is that five of the six Tier-0 engines contribute nothing, so the burst is mostly wasted sockets.

### 1.3 The two structural faults under the parallelism

A second source pass found two things that are worse than "an engine returns zero," because they make *every* engine slower and less reliable.

**Fault A — the browser budget is not actually enforced.**

`PLAYWRIGHT_TASKS` (`queue.js:139-148`) is the allow-list that decides which tasks are counted against the browser slot budget. It contains only:

`scrapeGooglePlaces`, `scrapeGoogleLocalFinder`, `scrapeWeddingBazaar`, `scrapeWeddingWire`, `scrapeMandap`, `scrapePuppeteerIndiaMart`, `scrapeCrawleeDeep`, `scrapeScrapySpider`.

But `getBrowser()` — the single global Chromium — is called by **eight** engine files. Six of them are **not** on that list, so they are budgeted as HTTP jobs:

| Engine | Launches Chromium at | Counted as | Should be |
|---|---|---|---|
| Web Discovery | `engine-web-discovery.js:257` | HTTP | browser |
| Yelp | `engine-yelp.js:43` | HTTP | browser |
| YellowPages global | `engine-yellowpages-global.js:38,112,197` | HTTP | browser |
| Bing Places | `engine-bing-places.js:40` | HTTP | browser |
| TripAdvisor | `engine-tripadvisor.js:74` | HTTP | browser |
| Brave Dork | `engine-brave-dork.js:1` | HTTP | browser |

With `maxHttpConcurrency` up to 18 (`queue.js:160-164`) and the real browser ceiling at 5–8, the machine can open **3–4× the intended number of Chromium contexts on one shared process**. That is the most plausible root cause of Web Discovery's 6/6 failures and of the general RAM spikes and slow zones. Fixing engines before fixing this means the fixes cannot be measured.

**Fault B — the orchestrator is itself a queue job.**

`registerTask('scrapeOmniOrchestrator', …)` at `scrape.js:403` puts the whole sweep in the same queue as its children. It is not in `PLAYWRIGHT_TASKS`, so it holds an **HTTP slot for the entire run**, and it is subject to the same **10-minute job timeout** (`queue.js:404-420`). A long sweep therefore has its orchestrator marked failed and its slot freed while the monitor loop keeps running detached — a split-brain control plane.

Related: `queue.js:404-420` races a timer against the task but **never cancels it**. When a job times out, the slot is released while the page keeps running, so true concurrency exceeds the budget and memory grows.

---

## 2. Master vs Client — verified capability matrix

Derived by diffing the exported API surface of `master/src/v2/api.js` against `client/src/v2/api.js`, then confirming server-side enforcement.

### 2.1 App-level delta

| Capability | Master | Client | Server enforcement |
|---|:---:|:---:|---|
| City sweep | ✅ | ✅ | — |
| Mandal sweep | ✅ | ✅ | — |
| **District sweep** | ✅ | ❌ | `scopeEngines/index.js:24` `MASTER_ONLY`; `/master-sweep` 403 |
| **State sweep** | ✅ | ❌ | same |
| **Sweep preview + ETA** (`/master-sweep/preview`) | ✅ | ❌ | 403 unless `x-workspace-scope: master` |
| **Engine health board** | ✅ | ❌ | `getEngineStatus` master-only export |
| **Reset engine health** | ✅ | ❌ | ⚠️ `POST /engines/reset` has **no scope check** — see §6 |
| **Client desk** (create/delete, credentials, reset codes, revoke sessions, import, pause) | ✅ | ❌ | `routes/master.js` `requireMaster` + optional `MASTER_KEY` |
| **All client sessions / live sessions** | ✅ | ❌ | `getAllMasterSessions`, `getLiveClientSessions` |
| **Cross-client leads** | ✅ | ❌ | `getMasterLeads` |
| **Send notifications** | ✅ | ❌ | `POST /master/notifications` |
| **Read own notifications** | ✅ | ✅ | `/api/notifications` |
| **Learned catalog / taxonomy** | ✅ | ❌ | `getLearnedCatalog`, `getLearnedTaxonomy` |
| CRM notes / status / tasks | ✅ | ✅ | shared |
| Vault / sessions / trash / merge / rename / export | ✅ | ✅ | shared |
| Deep enrich / deep batch | ✅ | ✅ | shared |
| WhatsApp suite | ✅ | ✅ | shared |
| Geo hierarchy / stats | ✅ | ✅ | shared |
| Suggest search / locations | ✅ | ✅ | shared |
| Search feedback | ✅ | ✅ | shared |

**23 functions are Master-only.** Only 3 are Client-only: `getNotifications`, `getWorkspaceStatus`, `markNotificationRead`.

### 2.2 What Master's extra scope actually buys, engine-wise

`server/src/services/scopeEngines/`:

- **Client** — city/mandal plan. Directory engines queried once at city level.
- **Master district** — same zone map, **plus JustDial re-queried from up to 6 mandal towns**.
- **Master state** — same, **plus JustDial re-queried from up to 8 district cities**.
- Client requesting district/state gets `clientAllowed: false` and a **silent fallback to the city plan** (`scopeEngines/index.js:58, 75`).

That last behaviour is a UX trap: a client can type a district and believe they swept it. The plan below fixes the messaging.

### 2.3 Identity chain (verified)

1. `resolveIdentity.js` — signed token → `x-user-id` + `x-workspace-scope`; verifies live `tokenVersion` and suspension; returns 401/403 for revoked/paused accounts. Public allowlist: auth, health, ready, app/info, diagnostics, map-tiles, public, extension download/status/heartbeat.
2. `clientGate.js` — suspended workspace cannot start searches; saved folders stay readable; **master bypasses**.
3. `routes/master.js:24` `requireMaster` — workspace scope, plus `x-master-key` **only if** `MASTER_KEY` is set.
4. `scopeEngines` `MASTER_ONLY` — final semantic gate.

---

## 3. Engine inventory — every file, honest status

28 files in `server/src/scrapers/`. 23 tasks registered in `routes/scrape.js`.

| Engine | File | Registered | Registry access | Last measured yield | Verdict |
|---|---|:---:|---|---|---|
| Google Maps / Places | `engine-google-places.js` (85 KB) | ✅ | public-html | **968 rows** | **LIVE — the platform** |
| Google Local Finder | `engine-google-serp-local.js` (28 KB) | ✅ | public-html | 0 (6 runs) | **WIRED, ZERO YIELD** |
| JustDial | `engine-justdial.js` (34 KB) | ✅ | public-html | 0 (4 runs) | **WIRED, ZERO YIELD** |
| OpenStreetMap | `engine-openstreetmap.js` (30 KB) | ✅ | open-api | 0 (6 runs) | **WIRED, ZERO YIELD** |
| Web Discovery | `engine-web-discovery.js` (16 KB) | ✅ | public-html | 22 rows, **6/6 runs FAILED** | **BROKEN** |
| Web Contact | `engine-web-contact.js` (19 KB) | indirect | public-html | — | enrichment only, no direct yield |
| Social (India) | `engine-social-dork.js` | ❌ legacy | public-html | 0 (3 runs via `social`) | **ZERO YIELD** |
| Social intl | `engine-social-dork-intl.js` | ✅ | public-html | — | untested in corpus |
| Wikidata | `engine-wikidata-businesses.js` | ✅ | open-api | — | works, low volume |
| Trustpilot | `engine-trustpilot.js` | ✅ | public-html **enabled:true** | — | ⚠️ docs say **removed 2026-11-18** (403). Registry is out of sync |
| YellowPages global | `engine-yellowpages-global.js` | ✅ | public-html | — | intl bundle |
| Yelp | `engine-yelp.js` | ✅ | public-html | — | intl bundle |
| Bing Places | `engine-bing-places.js` + `bingSearch.js` | ✅ | public-html | — | intl bundle |
| TripAdvisor | `engine-tripadvisor.js` | ✅ | public-html | — | intl bundle |
| Cylex | `engine-cylex.js` | ✅ | public-html | — | intl bundle |
| FreeIndex UK | `engine-freeindex-uk.js` | ✅ | public-html | — | intl bundle |
| GoldenPages IE | `engine-goldenpages-ie.js` | ✅ | public-html | — | intl bundle |
| WeddingBazaar | `engine-weddingbazaar.js` | ✅ | public-html | — | wedding family |
| WeddingWire | `engine-weddingwire.js` (26 KB) | ✅ | public-html | — | wedding family |
| Mandap | `engine-mandap.js` | ✅ | public-html | — | wedding family |
| Google SERP | `engine-google-serp.js` | ✅ | **blocked, disabled** | — | **DEAD** (consent wall) |
| IndiaMART (Puppeteer) | `engine-puppeteer-indiamart.js` | ✅ | **blocked, disabled** | — | **DEAD — cannot even load** |
| Brave Dork | `engine-brave-dork.js` | ✅ | public-html, **disabled** | — | **DEAD** (429) |
| DuckDuckGo Dork | `engine-crawlee-deep.js` | ✅ | — | — | **DEAD** (Crawlee not installed) |
| Scrapy spider | — | ✅ registered | — | — | **DEAD** (no spider, no Python wiring) |
| BBB / Manta / Canada411 / Thomson / TrueLocal / YP-SA | — | ❌ | blocked / untested | — | correctly disabled |
| `proxyManager.js`, `browserFactory.js`, `concurrencyManager.js`, `directoryVendor.js` | infra | — | — | — | support modules |

**Dead-on-arrival count: 6** (Google SERP, IndiaMART, Brave, Crawlee, Scrapy, Trustpilot-per-docs).
**Wired-but-zero-yield count: 5** (Local Finder, JustDial, OSM, Web Discovery, Social).

### 3.1 Why IndiaMART/Crawlee/Scrapy are dead — verified

`server/package.json` has `playwright`, `playwright-extra`, `puppeteer-extra`, `puppeteer-extra-plugin-stealth`, `axios`, `cheerio`, `libphonenumber-js`, `fuse.js`, `exceljs`.

It does **not** have `puppeteer` and does **not** have `crawlee`.

So `scrapePuppeteerIndiaMart` and `scrapeCrawleeDeep` are registered tasks that throw `MODULE_NOT_FOUND` the moment they are dispatched. `PLAYWRIGHT_TASKS` even includes them (`queue.js:145-147`), so they consume browser-slot accounting before failing.

A registered task that can only throw is worse than no task: it produces red health entries, burns slots, and makes the board noisy so the *real* failures hide.

---

## 4. The defects that silently kill yield

Ordered by blast radius. Each is verified in source or in the live data files.

| # | Defect | Where | Effect |
|---|---|---|---|
| D1 | `engineHealth` treats "0 rows" as success | `engineHealth.js:9-13` | 5 dead engines shown green. **Root cause of "all engines look fine but nothing comes out."** |
| D2 | No `.env` in `server/` | `server/.env` absent | Engine runs on defaults; no keys, no overrides, no way to tune slots |
| D3 | `puppeteer` / `crawlee` not installed | `server/package.json` | 3 registered tasks can only throw |
| D4 | Web Discovery fails 6/6 | `engine-web-discovery.js` | 100% failure; only 22 historical rows |
| D5 | OSM returns 0 for every run | `engine-openstreetmap.js` | Category→OSM-tag mapping missing; Overpass query matches nothing |
| D6 | JustDial "mobile API turbo-burst" returns 0 | `engine-justdial.js` | Upstream endpoint dead; no HTML fallback |
| D7 | Local Finder 5.1 s/zone, lower yield than Maps | `engine-google-serp-local.js` | Already demoted to first-2-zones, but still burns slots for 0 rows |
| D8 | Trustpilot enabled in registry, removed in docs | `registry.js` vs `docs/blocked-sources.md` | Ghost switch |
| D9 | `google-serp` + `indiamart` still in nearly every `FAMILY_DEFINITIONS` | `categoryRouter.js:19-77` | UI/estimate over-promises; blocked engines appear planned |
| D10 | Placeholder phones stored as real | phone ingest path | "Requires Manual Lookup/Login", "Requires 1 Credit" pollute vault |
| D11 | `ui-avatars.com` URLs stored as logos | ingest | Fake brand images in exports |
| D12 | Pincode regex can match phone digits | `phoneUtils` / geo parse | Wrong postcode on some leads |
| D13 | Hard-coded Windows Chrome/Edge paths | `browserFactory.js` | Engine fails on mac/linux and on non-standard installs |
| D14 | Hard-coded secrets | `config/settingsManager.js`, `utils/olaMaps.js` | Credential leak |
| D15 | Default admin password `password123` | auth bootstrap | Trivial takeover |
| D16 | `POST /engines/reset` has no scope check | `routes/scrape.js:1170` | Any client can wipe engine health |
| D17 | Client district/state silently downgrades to city | `scopeEngines/index.js:58` | User believes a district was swept when it was not |
| D18 | **6 Chromium engines counted as HTTP** — browser budget bypassed | `queue.js:139-148` vs 8 `getBrowser()` callers | Up to 18 contexts on a 5-slot budget; RAM spikes, crashes, slow zones |
| D19 | `emitActivePointEvent` called but never defined | `orchestrator:1087, 1724`; deps at `398-406` omit it | `ReferenceError` every tick, swallowed by `try{}catch{}` — live map never gets the active point |
| D20 | `scrapeWebContact` imported, in both country bundles, **never registered** | `scrape.js:9, 430` — no `registerTask` | Engine can never run; still advertised in the UI |
| D21 | Trustpilot (403, documented removed) fires on **every auto run** | `engineMatch.js:24-32` returns true for all but `brave`; burst at `orchestrator:1277-1281` | Wasted 403 request per sweep |
| D22 | `chargeOmniCredits()` is a no-op | `scrape.js:758-760` returns `{ok:true}` | Credit gate silently does nothing at search start |
| D23 | `/omni` response claims "Started in Background via BullMQ" | `scrape.js:909` | There is no BullMQ/Redis; the queue is an in-memory array |
| D24 | Nothing ever writes `error`/`failed` to `completedTargetsMap` | `orchestrator:1486` counts them, no writer | Failed zones stay `'queued'` and get re-enqueued until the 45-min ceiling |
| D25 | `requestGuard` skip **splices the job out permanently** | `queue.js:305-312` | Silent coverage loss — a zone is dropped, not retried |
| D26 | Per-job timeout frees the slot but does not cancel the work | `queue.js:404-420` | Real concurrency exceeds budget; memory grows after timeout |
| D27 | `addScrapeJob` re-sorts the **entire queue on every insert** | `queue.js:435` | O(n² log n) — 2,600 Master zones spend a long CPU burst before monitoring starts |
| D28 | Orchestrator holds an HTTP slot for the whole run and is subject to the 10-min timeout | `scrape.js:403` | Split-brain: orchestrator "failed", children still running |
| D29 | **JustDial unlisted / masked phone omission** | `engine-justdial.js:368-400` | Free/unclaimed JustDial listings (e.g. `Studio Sandhya Raagam` in Guntur) mask mobile or embed it in action URLs; leads saved without phone |
| D30 | **Missing aggressive social backfill for phone-less leads** | `aggressivePhoneEnricher.js:220-270` | Leads without `.com` websites (studios/photographers) rely on Instagram/Facebook bios & `wa.me` links, but enricher only checked website + fragile DuckDuckGo |
| D31 | **11-Country & All-Zone verification gap** | `countryEngineMap.js`, `countrySweepPlan.js` | 11 countries (US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, DE + IN) lack an automated matrix audit to verify every country's directory engines fire and match cross-engine phones |
| D32 | **Tail-zone latency & priority inversion** | `omniSearchOrchestrator.js:1441, 1654`, `engine-google-places.js` | Final 2 zones take 35–60s due to concurrency collapse, 15 scroll attempts on sparse outskirt cards, and priority preemption from adaptive quad-splits |
| D33 | **Frontend Stop button stuck on completion** | `CommandCenter.jsx:982, 2254` | Button stays on `Stop · X/Y Zones` even when `done === total` because `progress.sessionActive !== false` during 60s post-run backfill |
| D34 | **Search bar UX clutter (folder bridge & history)** | `SearchConsole.jsx:263-271, 681-699` | Search input dropdown displays distracting "ALREADY IN YOUR SAVED LISTS" banners and stale history chips instead of pure fresh category/location suggestions |

---

## 5. The plan

Six phases. Each has a hard acceptance gate. Nothing in a later phase starts until the earlier gate passes.

### P0 — Make the board tell the truth  *(0.5–1 day)*

**Goal:** the operator can see, in one glance, which engines are actually producing.

1. `engineHealth` gains a yield dimension. Track `runsSinceLastLead`, `lastNonZeroCount`, `lastNonZeroAt`, `zeroRunStreak`.
2. New status `stalled` (amber→red): `zeroRunStreak >= 3` **and** engine is enabled. Distinct from `error` (threw) and `empty` (one zero run).
3. `/engines/status` returns per-engine `yieldPerRun` and `lastNonZeroAt`.
4. `EngineStatusBoard.jsx` renders `stalled` distinctly and shows "last lead: N days ago".
5. Reconcile `registry.js` with `docs/blocked-sources.md` — Trustpilot → `blocked, enabled:false`.
6. Remove `google-serp` and `indiamart` from every `FAMILY_DEFINITIONS` entry in `categoryRouter.js`.

**Gate:** every enabled engine either has `lastNonZeroAt` within 7 days or renders `stalled`. No engine renders green with `lastCount: 0`.

---

### P0.5 — Enforce the browser budget  *(0.5–1 day)*

**Goal:** stop running 3–4× the intended Chromium concurrency. This must land before P1, because until it does, engine failures are caused by resource starvation and cannot be diagnosed or measured.

1. **Fix `PLAYWRIGHT_TASKS`.** Add every engine that calls `getBrowser()`: `scrapeWebDiscovery`, `scrapeYelp`, `scrapeYellowPagesGlobal`, `scrapeBingPlaces`, `scrapeTripAdvisor`, `scrapeBraveDork`. Remove the phantom `scrapeScrapySpider` (D4 in the dead-task list — no task, no engine). Remove `scrapeJustDial` from the browser kind in `engineHealth` — it is pure HTTP.
2. **Make the classification structural, not a hand-maintained list.** Export a `usesBrowser: true` flag from each engine module (or derive it from a single map next to `registerTask`) and have the queue read it. A hand-maintained `Set` is exactly how six engines fell off it.
3. **Make timeout actually cancel.** Pass an `AbortController` into the task; on the 10-min timeout, abort the controller and close the context, not just release the slot.
4. **Take the orchestrator out of the job slot accounting.** Either register it with `meta.unmetered = true` so it does not hold an HTTP slot and is exempt from the 10-min cap, or run it outside the queue entirely.
5. **Fix the two silent-loss paths** while here: write a terminal `failed` state to `completedTargetsMap` when a job throws (D24), and make `requestGuard` `skip` mark the zone `skipped` rather than splicing it silently (D25).
6. **Batch the enqueue.** Replace the per-insert `sort()` with a push + single sort after the zone loop (D27).

**Gate:** `/engines/status` reports `browserActive` that never exceeds `browserSlots` during a 100-zone sweep. No zone disappears without a terminal state. A timed-out job closes its context.

---

### P1 — Bring the five zero-yield engines back  *(3–5 days)*

**Goal:** each engine produces ≥1 real lead on a canonical live query.

| Engine | Fix |
|---|---|
| **Web Discovery** | Diagnose the 6/6 failure first — pull `lastError` from `engine_health.json` history and the run log. Likely selector drift or `requestGuard` skip. It is the highest-value target because it is the only engine already producing contact-rich rows. |
| **OpenStreetMap** | Add a category→OSM-tag map (`shop=photo`, `shop=electronics`, `amenity=pharmacy`, `tourism=hotel`, `craft=*`, …). Overpass currently returns 0 because the tag filter does not match the category vocabulary. Free, keyless, unlimited, **no browser slot** — biggest cheap win in the whole plan. |
| **JustDial** | The mobile API path is dead. Fall back to the HTML/browser path, or retire the turbo-burst note. Keep JustDial because it is the only India-specific directory that has ever produced rows (20). |
| **Local Finder** | Either fix the two-pass selector or **retire it**. It is 5.1 s/zone for less yield than Maps and already restricted to 2 zones. If it cannot beat 0 rows in a smoke test, remove it from the bundle and say so in `blocked-sources.md`. |
| **Social dork** | Verify the dork templates against a live query. 3 runs / 0 rows suggests the query strings are stale or the result parser broke. |

Also in this phase:
- Commit `server/scripts/smoke-engines.js` — runs each engine once on a fixed query, prints `{engine, rows, ms, error}`. This becomes the regression harness for every later phase.

**Gate:** `node server/scripts/smoke-engines.js` shows non-zero rows for Maps, OSM, Web Discovery, JustDial, and at least one directory engine. Retired engines are removed from `INDIA_ENGINES`/`INTERNATIONAL_ENGINES` **and** documented in `blocked-sources.md`.

---

### P2 — No task that can only throw  *(0.5 day)*

**Goal:** every registered task either runs or is gone.

1. **Option A (recommended):** add `puppeteer` and `crawlee` to `server/package.json`, wire `browserFactory.js` to them, re-verify IndiaMART + Crawlee.
2. **Option B:** delete `registerTask('scrapePuppeteerIndiaMart')`, `registerTask('scrapeCrawleeDeep')`, `registerTask('scrapeScrapySpider')`, remove them from `PLAYWRIGHT_TASKS`, mark IndiaMART `removed` in the registry.

Do not leave them registered-but-broken. A silent `MODULE_NOT_FOUND` in the queue is indistinguishable from a site block in the logs.

**Gate:** `npm ls puppeteer crawlee` resolves **and** both engines pass the smoke test — **or** zero references remain in `registerTask` / `PLAYWRIGHT_TASKS` / registry bundles.

---

### P3 — Raise real parallelism  *(2–3 days)*

**Goal:** stop letting the browser budget be spent on engines that return nothing.

Today one global Playwright pool is shared by Maps, Local Finder, WeddingBazaar, WeddingWire, Mandap, and the dead Puppeteer tasks. A slow Local Finder zone holds a slot that Maps would use better.

1. **Per-engine lane budgets.** Replace the single `discoveryLimit()` with per-engine caps derived from measured yield:
   - Maps: the majority of slots (it is 70% of output).
   - Local Finder: 1 lane, or 0 if P1 retires it.
   - Directories/wedding: 1–2 lanes total.
   - `browserBudget` stays the hard ceiling — lanes are a *scheduling* policy on top, never an increase.
2. **Expand the Tier-0 HTTP burst.** OSM Overpass, Wikidata SPARQL, and any keyless API already run in `Promise.allSettled`; make sure they never consume a browser slot and fire in the first second of every sweep. This is free throughput.
3. **Lower the adaptive-split threshold adaptively.** Currently fixed at ≥18 leads. Use the zone-yield ledger: high-value categories (wedding venues, hospitals) split at ≥12.
4. **Expose RAM headroom.** `browserBudget.calculateSafeSlots()` already computes `reservedHeadroomGb`. Surface it in `/engines/status`, and refuse to honour a raised `SCRAPER_BROWSER_SLOTS` when free RAM < reserved.
5. **Verify slot saturation.** Instrument the queue so `/engines/status` reports `browserUtilisationPct` over the last 60 s. If it is below ~85% on a large sweep, the scheduler is leaving throughput on the floor.

**Gate:** on a 16 GB / 8-core box, a 108-zone city sweep shows browser utilisation ≥85% of wall time, and non-Maps engines contribute ≥25% of leads (up from ~4%).

---

### P4 — Data correctness  *(1–2 days)*

1. One `sanitizePhone()` in `phoneUtils.js`, applied at ingest: drop `Requires Manual Lookup/Login`, `Requires 1 Credit`, `N/A`, all-zero, and <7-digit strings. Keep the listing, set `contactStatus: 'needs_lookup'`.
2. `ui-avatars.com` / `placehold.*` / `via.placeholder.com` → `logo: null`.
3. Postal code: strict per-country pattern (India 6 digits, US 5(+4), UK postcode regex, …). Never infer from a phone number.
4. Dedupe key: normalise phone + name + geo before the smart-dedupe pass so the same vendor from two engines collapses.

**Gate:** zero rows in the vault with a placeholder phone string, zero `ui-avatars` URLs, zero invalid postal codes on a 1,000-row sample.

---

### P5 — Close Master/Client drift  *(1–2 days)*

1. **Single capability declaration server-side** (`server/src/services/capabilities.js`): the master-only set as data, not as scattered `if (isMaster)` checks.
2. Master UI and Client UI both render from that declaration. A client build cannot show a master control even if the component is imported by mistake.
3. **Add the missing scope check** to `POST /engines/reset` (D16). `/engines/status` stays readable by both (advisory); reset becomes master-only.
4. **Contract test** (`server/scripts/capability-contract.js`): every function exported by `client/src/v2/api.js` must exist in `master/src/v2/api.js`; the only extras in master must be in the declared master-only set.
5. **Fix the silent district downgrade** (D17). When a client requests district/state, return an explicit message — "District and state sweeps are a Master capability; this sweep will run at city resolution" — and reflect it in the plan preview, instead of quietly narrowing.

**Gate:** `node server/scripts/capability-contract.js` passes; `POST /engines/reset` returns 403 for client scope; a client district request surfaces the downgrade in the UI.

---

### P6 — Security hygiene  *(0.5–1 day)*

1. Remove hard-coded secrets from `config/settingsManager.js` and `utils/olaMaps.js` → env only.
2. Force admin password change on first login; delete the `password123` default.
3. `browserFactory.js`: detect Chrome/Edge/Chromium across Windows, macOS, and Linux, plus `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override.
4. Ship `.env.example` and a bootstrap that copies it to `.env` on first run (D2 — there is currently no `.env` at all).

**Gate:** `grep` for `password123` and for literal 20+ char key assignments returns nothing; the engine starts on a machine with no Chrome at a default path.

---

### P7 — JustDial Contact Depth, Social Aggressive Enrichment & 11-Country Verification *(1–2 days)*

**Goal:** Ensure no lead with a public phone number is left phone-less, and ensure full 11-country directory scraping with cross-engine matching.

1. **JustDial Deep Contact Resolution & Fallback (D29):**
   - In `engine-justdial.js`, expand `collectPhoneStrings()` to check secondary action URLs, `button_url` containing `tel:`, and click-to-call parameters.
   - For free/unclaimed listings where phone is omitted in the mobile API JSON (like `Studio Sandhya Raagam` in Guntur), trigger immediate secondary target resolution: `site:justdial.com "{businessName}" "{city}"` to capture the indexed phone snippet without hitting desktop bot walls.
2. **Aggressive Multi-Vector Social & WhatsApp Phone Hunter (D30):**
   - In `aggressivePhoneEnricher.js` and `phoneBackfillService.js`, when a lead lacks a verified mobile:
     - Run targeted Instagram bio dorks: `site:instagram.com "{vendorName}" "{city}" ("wa.me" OR "+91" OR "call" OR "contact")`.
     - Run Facebook page dorks: `site:facebook.com/pages OR site:facebook.com "{vendorName}" "{city}" ("phone" OR "mobile" OR "+91")`.
     - Extract raw 10-digit mobile numbers from bio strings.
     - Extract WhatsApp phone numbers from `wa.me/(\d+)` and `api.whatsapp.com` URL anchors.
     - Resolve static link-in-bio landing pages (`linktr.ee`, `bio.link`, `beacons.ai`) via lightweight HTTP GET (zero CAPTCHAs, static HTML).
3. **11-Country & All-Zone Verification Suite (D31):**
   - Create automated verification suite (`server/scripts/verify/audit-11-countries.js`):
     - Test all 11 supported countries: **IN, US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY** (+ **DE**).
     - Verify every mapped directory engine from `countryEngineMap.js` dispatches, runs, and returns valid leads in both single-zone and multi-zone sweeps.
     - Verify international telephone number parsing via `phoneUtils.js` with country-aware regex and libphonenumber formatting.
4. **Cross-Engine Phone Reconciliation & Cooperative Deduplication:**
   - When Engine A (e.g. Google Maps) discovers a vendor without a phone, and Engine B (e.g. JustDial, Yelp, Instagram, YellowPages) discovers the same vendor with a phone, cooperatively reconcile and merge them into a single high-quality lead with verified status.

**Gate:** `Studio Sandyaraagam` in Guntur is discovered with its phone `9959282819` and WhatsApp link via the enrichment pipeline; `audit-11-countries.js` passes 100% across all 11 country engine sets.

---

### P8 — Tail Zone Acceleration, Stop Button Auto-Reset & Pure Fresh Search UX *(1 day)*

**Goal:** Eliminate the tail-zone crawl latency, ensure the frontend Stop button reverts immediately to "Find Leads" upon zone completion, and streamline the search box to show only fresh suggestions.

1. **Tail-Zone Fast Bail & Priority Boost (D32):**
   - In `engine-google-places.js`, implement fast-bail on perimeter zones: if two consecutive scroll cycles return 0 new places, complete immediately (bails out in 5s instead of 40s).
   - In `omniSearchOrchestrator.js`, when remaining active zones in a sweep drop to ≤ 2, dynamically elevate their queue priority to **35** so all worker slots immediately focus on finishing the run.
   - Decouple post-run phone detail scouting into an asynchronous background task so the zone loop terminates without a 60s freeze.
2. **Frontend Stop Button Immediate Auto-Reset (D33):**
   - In `CommandCenter.jsx` (client and master), update the `running` prop logic: if `doneZones >= totalZones` and totalZones > 0, immediately flip `running: false` so the button displays `"Find Leads"`.
   - Add a client-side watchdog: if all allotted zones reach 100%, trigger `finishRun('complete', { serverConfirmed: true })` without waiting for secondary background passes.
3. **Pure Fresh Search Suggestions UX (D34):**
   - In `SearchConsole.jsx`, remove the `matchedSavedFolder` banner ("ALREADY IN YOUR SAVED LISTS") from the input dropdown.
   - Remove stale `Recent Missions` / `recentSearches` from the input dropdown.
   - Present exclusively fresh, high-intent suggestions: **Suggested Searches** (with NAICS pure tags) on the left, and **Matching Places** on the right.
   - Keep saved lists exclusively in the dedicated Drawer / Sidebar where operators manage leads, preserving search flow and maximizing customer retention.

**Gate:** Tail 2 zones finish in <10s; Stop button reverts to "Find Leads" the instant `done === total`; search dropdown displays only fresh category and location suggestions without folder banners or history chips.

---

## 6. Sequencing rationale

```
P0    truth layer        ──► without this, every later "fix" is unmeasurable
P0.5  budget enforcement ──► without this, engine failures are resource starvation
P1    zero-yield engines ──► the actual product value
P2    dead tasks         ──► stop the noise that hides P1
P3    parallelism        ──► only worth doing once >1 engine produces
P4    data correctness   ──► protects the leads P1/P3 create
P5    master/client      ──► structural, no yield impact
P6    security           ──► independent, can run in parallel with P5
P7    social & 11-intl   ──► deep contact enrichment, JustDial contact depth & 11-country verification
P8    tail & search UX   ──► tail zone speedup, Stop button auto-reset & pure fresh search UX
```

P0 must be first: right now the health board actively hides the problem. P0.5 must precede P1: six browser engines are oversubscribing Chromium, so any engine fix will be drowned out by resource contention until the budget is real. P3 must come after P1: raising concurrency on a fleet that returns zero just burns more RAM.

---

## 7. Files that will change

| Phase | Files |
|---|---|
| P0 | `server/src/services/engineHealth.js`, `server/src/routes/scrape.js`, `server/src/services/sources/registry.js`, `server/src/services/categoryRouter.js`, `master/src/v2/EngineStatusBoard.jsx` |
| P0.5 | `server/src/utils/queue.js` (`PLAYWRIGHT_TASKS`, timeout abort, batch enqueue, skip state), `server/src/services/engineHealth.js` (JustDial kind), `server/src/services/omniSearchOrchestrator.js` (`emitActivePointEvent`, `completedTargetsMap` terminal states), `server/src/routes/scrape.js` (orchestrator unmetered) |
| P1 | `server/src/scrapers/engine-web-discovery.js`, `engine-openstreetmap.js`, `engine-justdial.js`, `engine-google-serp-local.js`, `engine-social-dork.js`, `server/src/services/sources/registry.js`, **new** `server/scripts/smoke-engines.js`, `docs/blocked-sources.md` |
| P2 | `server/package.json`, `server/src/routes/scrape.js`, `server/src/services/sources/registry.js`, `server/src/scrapers/browserFactory.js` |
| P3 | `server/src/utils/browserBudget.js`, `server/src/utils/queue.js`, `server/src/services/omniSearchOrchestrator.js`, `server/src/utils/etaModel.js` |
| P4 | `server/src/utils/phoneUtils.js`, ingest paths in `server/src/scrapers/*`, `server/src/utils/deduplicator.js` |
| P5 | **new** `server/src/services/capabilities.js`, `server/src/routes/scrape.js`, `master/src/v2/api.js`, `client/src/v2/api.js`, **new** `server/scripts/capability-contract.js`, `server/src/services/scopeEngines/index.js` |
| P6 | `server/src/config/settingsManager.js`, `server/src/utils/olaMaps.js`, `server/src/scrapers/browserFactory.js`, `server/src/routes/auth.js`, **new** `server/.env.example` |
| P7 | `server/src/scrapers/engine-justdial.js`, `server/src/scrapers/engine-social-dork.js`, `server/src/services/aggressivePhoneEnricher.js`, `server/src/services/phoneBackfillService.js`, `server/src/services/scopeEngines/countryEngineMap.js`, `server/src/utils/phoneUtils.js`, **new** `server/scripts/verify/audit-11-countries.js` |
| P8 | `client/src/v2/SearchConsole.jsx`, `client/src/v2/CommandCenter.jsx`, `master/src/v2/SearchConsole.jsx`, `master/src/v2/CommandCenter.jsx`, `server/src/scrapers/engine-google-places.js`, `server/src/services/omniSearchOrchestrator.js` |

---

## 8. Non-goals (explicitly out of scope)

- Adding new engines. Fixing the ones that exist is worth more than a 31st switch.
- Changing the zone/geo model. `universalGeoCluster.js` and the India gazetteer work; they are not the bottleneck.
- Rewriting the orchestrator. Its parallel shape is sound — it is starved of working engines, not of concurrency.
- Touching the uncommitted working-tree changes (`client/src/v2/*`, `master/src/v2/*`, `omniSearchOrchestrator.js`, `universalGeoCluster.js`, etc.). They contain active feature work and must be merged, not overwritten.

---

## 9. One-line summary

**The scraper is not un-parallel. It is running one engine out of thirty, showing green lights for the other twenty-nine, and letting six Chromium engines ignore the browser budget. Make the board honest, make the budget real, revive five engines, delete the ones that can never run, then raise concurrency.**
