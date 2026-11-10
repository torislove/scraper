# GOD-LEVEL SCRAPER — BUG AUDIT & IMPLEMENTATION PLAN

Audited against working tree on top of commit `b816981` (≈4,900 uncommitted lines, including the Gemini edits).
Everything below was read in the code, not guessed. Every item has a file:line.

---

## 0. TL;DR — why your leads disappear

There are **five independent causes**, and they stack:

1. **Every new search purges the live store at the start.** `leadRetention.prepareFreshRun()` deletes all leads that are not CRM-engaged and not in the *new* session. So the folder you just finished is gone from `data/scraped_vendors.json` the moment you press Search again. The JSON folder survives, the main table does not. → feels like "leads are not coming / data folder is empty".
2. **Containment throws away good city leads.** The per-zone radial filter (`max 6.5 km`) is applied to *text* zones whose centre is the city centre, so real Guntur businesses at 7–9 km are dumped to `out_of_bounds.json` (1,320 rows there right now vs 131–150 kept). The cement run logs show it live: `Rejected "Apollo Dental Clinic, Guntur" · 6.6km (max 6.5km)`.
3. **Leads are written non-atomically from two processes.** `dbAdapter` writes with debounced `fs.writeFile` (no temp file, no rename, no lock). Engine + any script = last writer wins, file can be truncated. That is how a run once replaced 776 real rows with 284, and later with 0.
4. **Credits can silently refuse a lead.** `saveVendor()` returns `false` and only `console.warn`s when `credits.spend(1)` fails (`SCRAPER_CREDITS_ENFORCE=1` on desktop). The UI never learns that a lead was dropped. Individual "search lead" works because it is a different code path.
5. **A stopped run keeps working.** Stop sets the abort flag, but the orchestrator carries on to harvest → containment → **phone backfill (≤90 s)** → **website crawl (≤90 s)** → persist as `completed`. It can even relaunch a browser after `closeAllBrowsers()`.

---

## 1. P0 — DATA LOSS & "LEADS NOT IN THE DATA FOLDER"

| # | Bug | File:line | Effect |
|---|-----|-----------|--------|
| P0-1 | Fresh-run purge deletes the previous dataset from the live store | `server/src/services/leadRetention.js:71-123`, called `routes/scrape.js:885`, `:1706`, `:1813` | Every search wipes the previous run. Aborted/short runs leave almost nothing. |
| P0-2 | Non-atomic, multi-process writes | `server/src/config/dbAdapter.js:66-84`, `:200-207` | `fs.writeFile` (async) + `writeFileSync` interleave; crash/exit mid-write = truncated JSON. Two writers = total replacement. |
| P0-3 | Credits silently drop leads | `dbAdapter.js:188-196`, `credits.js:276-307` | `saveVendor` returns false, no error to caller/UI. Looks like an empty scrape. |
| P0-4 | Harvest picks up other sessions' leads | `routes/scrape.js:1362-1368` (`v.scrapedAt >= startTime`) | Master + client runs in parallel contaminate each other; re-run merges foreign leads. |
| P0-5 | Stop re-writes an aborted folder as `completed` | `routes/scrape.js:1352-1360`, `:1543-1569` vs stop handler `:2234-2335` | "Aborted" badge flips to completed because the orchestrator persists after the stop. |
| P0-6 | Out-of-bounds file grows forever and is shown as leads-adjacent data | `dbAdapter.js:239-262`, written from `engine-google-places.js:1162`, `scrape.js:1426` | 1,320 stale rows (1,189 from an old engine) — never cleared per run. |
| P0-7 | `saveVendors([])` used by delete endpoints could empty the store atomically-wide | `routes/vendors.js:131/144/364` (now fixed to `replaceVendors([])`) | Any caller that passed a partial list used to replace everything. **Already fixed in this session**; must ship with the rest. |

**Correct run order should be:** create folder → purge = *nothing* (append model) → stream leads → containment → enrich → snapshot folder atomically → done. Folder and store must contain the same set for that session.

### Fix

1. **Kill the purge.** Keep every lead forever, tagged with `sessionId` + `sessionIds[]`. The live table becomes "current session filter", not "only data on disk". Credit still charges once per unique lead id/target key.
2. **One writer, atomic.** New `server/src/config/vendorStore.js`:
   - in-memory `Map<id,vendor>` + `Map<key,id>` dedupe index;
   - append-only `data/vendors.journal.jsonl` for crash safety;
   - `snapshot()` writes `scraped_vendors.json.tmp` then `fs.renameSync` (atomic on NTFS);
   - debounce 300 ms + `flushNow()`;
   - lock file `data/.store.lock` with PID; second process refuses to write (scripts must call the API instead).
3. **Never silently drop.** `saveVendor` returns `{stored:true}` or `{stored:false, reason:'credits_exhausted'}`; the orchestrator emits a SSE `lead_rejected` event and the search API returns `402 credits_exhausted` *before* starting a run (already the product rule), never mid-run.
4. **Session-scoped harvest.** Only `sessionId`, `lastSessionId`, `sessionIds[]`. Delete the `scrapedAt >= startTime` clause.
5. **Abort wins.** Persist immediately on abort with `status:'aborted'`; orchestrator checks `aborted` before *every* post-phase and never overwrites that snapshot (write `if (status !== 'completed' || !aborted)`).
6. **Out-of-bounds = per-run, capped, labelled.** Reset the panel on each run, keep max 500, store `runId`, and exclude from normal counts.
7. **Auto-heal on boot.** If `scraped_vendors.json` is empty/corrupt but folders exist, rebuild from the newest folders + `restore-vendors.js` logic. No customer should ever start with a wiped store.

---

## 2. P1 — WHY THE MOBILE IS MISSING (bulk vs single lookup)

| # | Bug | File:line | Effect |
|---|-----|-----------|--------|
| P1-1 | Radial filter on text zones | `scrapers/engine-google-places.js:544-553`, callers `:697`, `:1018` | City-wide query zones are pinned to the city centre; `maxKm = radius + 1.5` (≈6.5 km) rejects real city leads at 7–9 km. This is the #1 extraction loss. |
| P1-2 | Feed card has no phone, panel is optional | `engine-google-places.js` extraction path + `:1162` | The card shows name/rating only; phone lives on the `/place/` panel. If the panel is skipped, the lead is stored phone-less. |
| P1-3 | Backfill is capped and short | `routes/scrape.js:1447-1458` (`cap 120`, `90 s`, `concurrency 4`) | Only the first 120 phoneless leads are probed; everything else stays empty. Big cities lose most mobiles. |
| P1-4 | Backfill runs after containment/stop | same block, no abort check | After Stop it still opens new browsers (getBrowser relaunches after `closeAllBrowsers`). |
| P1-5 | Merge can overwrite a mobile with `''` | `engine-google-places.js` save/merge paths; `directoryVendor.js` | Later partial row wins. Need "best non-empty wins". |
| P1-6 | Grid cells never get a phone pass | queue: only feed extraction | Even inside 6.5 km, grid-cell leads often remain phoneless. |

### Fix

1. **Two zone kinds, two rules:**
   - `grid` (viewport cell): radial filter `cellsize + 2 km`.
   - `vector` (text query): **no radial filter**; use the run boundary (`city radius + 5 km ring + 3 km`, floor 12 km). 28 km floor already exists at run level — mirror it per zone.
2. **Phone-first extraction:** every card that lacks a phone gets its panel opened (bounded queue, 8–12 contexts). Parse `tel:` anchors, `data-phone`, and the `[data-item-id^="phone"]` block; normalise to validated 10-digit mobile.
3. **Backfill becomes a streaming worker, not a tail blocker:** starts immediately after the first leads exist, runs alongside scraping, drains with a hard per-lead timeout, persists each fill via the store (SSE update), and stops on abort. No cap of 120 — budget by time, not count.
4. **Merge rule:** `bestPhone(old,new)`, same for email/website/address; never overwrite non-empty with empty.
5. **Mobile validation in one place:** `+91`, `0`, spaces, `-`, `(0)` → last 10 digits → `/^[6-9]\d{9}$/`; landlines stored as `secondaryPhone`, never as `phone`.

**Expected:** 131 → 250–400 leads for a Guntur-class city; mobile coverage 60% → 85%+.

---

## 3. P2 — SWARM, PARALLEL ENGINES, SPEED

| # | Bug | File:line | Effect |
|---|-----|-----------|--------|
| P2-1 | "Swarm" duplicates work | `utils/universalGeoCluster.js:633-673` (`buildCategorySubVectorZones`) | 20–24 text zones all carry the **same** city-centre lat/lng. Maps returns the same 20 cards for every one → 24× wasted time. |
| P2-2 | Per-job browser launch | `scrapers/browserFactory.js:32-103`, `:152-158` | `launchStealthBrowser` always launches a new Chromium; `userDataDir` is computed (`:63`) but **never passed** to `launchOptions` (`:65-69`). Cold profile every job, no cookie reuse, 2–4 s + RAM per job. |
| P2-3 | HTTP queue misclassifies browser jobs | `utils/queue.js:75-84` | `scrapeDuckDuckGoDork`, `scrapeBraveDork`, `scrapeWebContact`-adjacent browser work are not in `PLAYWRIGHT_TASKS`; up to 16 Chromium launches are allowed. |
| P2-4 | Local Finder asks 10 pages per zone | `routes/scrape.js:1147-1154` | 10 pages × 64 zones = up to 640 page loads before a single panel is opened. |
| P2-5 | Post-phase tail blocks completion | `scrape.js:1441-1476` | Backfill (90 s) + website pass (90 s) run *after* the progress loop exits → user watches "running" with zero new leads for minutes. |
| P2-6 | 10-min timeout does not cancel | `queue.js:228-242` (`Promise.race`) | Timeout rejects the promise; the Playwright page keeps running and eats slots. |
| P2-7 | `getVendors()` inside hot loops | engines' dedupe (`engine-justdial.js`, `engine-social-dork.js:133`, `engine-brave-dork.js`) | O(n²) scan per lead; gets slower as the store grows. |
| P2-8 | ETA lies | `scrape.js:1289-1298` | Uses zones only; ignores queue depth/stragglers. |

### Fix (the speed plan)

1. **Query planner with dedupe:** key = `normalise(query) + rounded viewport`. One job per unique key. Text vectors are distinct *queries* (buy their own 20 results) but share one viewport → run **once each**, not once per grid cell.
2. **Browser pool:** one Chromium process per app (Edge on desktop), N reusable contexts (`BROWSER_POOL=8` on desktop, 6 on low RAM), lazy launch, health check, auto-relaunch on crash. Pass `userDataDir` (persistent profile) so Google/JustDial cookies survive.
3. **Block heavy resources:** abort `image,media,font,svg` and known trackers/ads; keep `document,script,xhr,fetch`. 2–4× faster page loads.
4. **Right concurrency classes:** `browserJobs` vs `httpJobs` with separate caps (8–12 / 16).
5. **Per-zone budget:** Local Finder `maxPages = 3` for vector zones (results cap ~20 anyway), `5` for grid cells only when the cell is thin.
6. **Streaming backfill + website pass** start early and are joined at the end with a **hard cap** (client 30 s / master 60 s), not awaited unconditionally.
7. **Cancellation token** (`AbortController`-style) passed to every engine: `page.close()` on abort, queue purge, `Promise.race` timeout also closes the page.
8. **Index dedupe** in the store (`Map` by id + `Map` by normalised key) → O(1) per lead.
9. **Real ETA:** `(pending + running + drained)/throughput` sliding window, displayed with current leads/s.

**Targets:** first lead ≤ 5 s; sustained ≥ 10 leads/s on desktop; 64-zone run finished (including enrichment) ≤ 90 s; no duplicate queries in logs.

---

## 4. P3 — STOP BUTTON

| # | Bug | File:line |
|---|-----|-----------|
| P3-1 | Post-phases ignore abort | `scrape.js:1441-1545` |
| P3-2 | Backfill/web-contact relaunch browsers after stop | `scrape.js:1444-1476`, `browserFactory.js:152-158` |
| P3-3 | Aborted folder overwritten as completed | `scrape.js:1543` vs `:2308` |
| P3-4 | Streaming enricher not stopped | `scrape.js:1441-1445` calls `stop()`, but `handleMasterStopAll` does not |
| P3-5 | Client shows "STOP SWARM" but no immediate state change if SSE is down | `client/src/v2/SearchConsole.jsx:456-460`, `CommandCenter.jsx:3209` |

### Fix
- Stop = `abort()` on the token → clear queue → `closeAllBrowsers()` → **skip** backfill/web-contact/deep → persist current leads as `aborted` → emit `progress {sessionActive:false, status:'aborted'}` → API returns `{preservedCount}`.
- UI: on stop click, immediately set local status `stopping`, then `aborted` on the response (no waiting for SSE).
- Guarantee: stop completes in < 3 s and never launches another browser.

---

## 5. P4 — CLIENT & MASTER UX BUGS

| # | Bug | File:line | Effect |
|---|-----|-----------|--------|
| P4-1 | Folder title duplicate key | `server/src/routes/scrape.js:753-754` (`name` twice) | The nice "Category in City • Nov 5, 7:12 PM" title is overwritten by the plain one. |
| P4-2 | Run table shows the live store, folders are separate | `client/src/v2/CommandCenter.jsx:2612-2620`, `:3444-3474` | After a purge, the previous run looks empty in the main table even though its folder has leads. |
| P4-3 | No "dropped / out-of-bounds" feedback | `CommandCenter.jsx` (no consumer of out-of-bounds counts) | User cannot see that 50% of found leads were rejected by containment. |
| P4-4 | Stop button in UI only reacts to SSE/progress | `CommandCenter.jsx:2989-2996` | Stuck "running" if SSE misses the last event. |
| P4-5 | Health board after restart shows stale rows until engine reboot | `services/engineHealth.js:160-186` | Board lies for a few seconds/until restart. |
| P4-6 | Master sweep + client share one global abort signal | `scrape.js:85`, `:2236` | Master Stop kills the client run too (by design?) — must scope abort per session. |
| P4-7 | `scrapedAt >= startTime` harvest mixes master/client | `scrape.js:1362-1368` | See P0-4 in UI: foreign leads appear in the folder. |

### Fix
- Folder title: remove the duplicate key.
- UI truth: table = selected session (`sessionId` filter on `/vendors`); folders = history; never infer.
- Add a small **"Funnel"** widget per run: `found → in bounds → with mobile → saved` with the exact count of drops and why (top reason).
- Stop: optimistic status.
- Health: read file mtime and merge, or serve from the store.
- Abort: per-session token; Master Stop kills only master sessions, client stop only its session.

---

## 6. ENGINE-LEVEL BUGS (short list)

- `engine-google-places.js`: panel phone extraction conditional; partial `saveVendors` overwrite; out-of-bounds writer inside the engine.
- `engine-google-serp-local.js`: same radial issue; `saveVendors` partial writes.
- `engine-social-dork.js:133` + `engine-brave-dork.js:65`: `getVendors()` full-store scan per result (O(n²)); create-evergreen duplicates (name+city check only).
- `engine-justdial.js`: fine on fidelity, but re-fetches vendors list per item too.
- `engine-web-contact.js`: 0 enrichments on real leads in my last probe (6 sites read, 0 new fields) — needs a per-site parser test (tel links, `mailto:`, JSON-LD) before claiming it works.
- `proxyManager`: disabled by default (correct), but `browserFactory` still calls `getRandomIP()` and sets UA args that Playwright ignores (`--user-agent` is overridden by context UA) — dead code.

---

## 7. IMPLEMENTATION PLAN (phased, each phase shippable)

### Phase 1 — "No lead is ever lost" (1–2 days) ← highest value
1. `vendorStore.js` (atomic snapshot + journal + single writer + lock).
2. Remove fresh-run purge; keep append + session tags. Add `/vendors?sessionId=`.
3. Abort-safe finalize; stop returns immediately; no post-phases after abort.
4. Out-of-bounds per run + cap + funnel counters.
5. Boot auto-heal (rebuild from folders/backups if store empty/corrupt).
6. Tests: `kill -9` mid-run → no lost rows; two runs back-to-back → both folders complete; stop → folder `aborted` and stable.

### Phase 2 — "Extract every mobile" (2 days)
1. Zone-kind aware boundary (grid radial; vector run-boundary).
2. Phone-first panel pass + normalized mobile validator in one module.
3. Streaming backfill with time budget (no 120 cap), abortable, persists per lead.
4. Best-non-empty merge.
5. Tests: same city run before/after → mobile coverage and lead count compared; assert 0 containment drops for in-city coordinates.

### Phase 3 — "Ultra blazing" (2–3 days)
1. Browser pool + persistent profile + resource blocking.
2. Query planner dedupe + per-zone page budget.
3. Queue classes & real cancellation; O(1) dedupe index.
4. Parallel enrichment (backfill | web-contact | deep profile) in one worker pool.
5. Bench script: `measure-run.js` prints leads/s, first lead, mobiles %, drops.
   Target: ≥10 leads/s, first lead ≤5 s, 64-zone run ≤90 s.

### Phase 4 — "Truth in the UI" (1–2 days)
1. Session-scoped table + folders untouched.
2. Funnel widget (found / in-bounds / mobile / saved / dropped-by-reason).
3. Optimistic stop; per-session abort.
4. Fix folder title, health freshness, stale out-of-bounds panel.
5. Master: scope selector (city/mandal/district/state) uses the same run engine, no duplicate code path.

### Phase 5 — Hardening (1 day)
- Crash/kill drills, corrupt-file recovery, 10k-lead perf test, Playwright leak check (`chromium` processes after stop = 0).
- Remove dead code: `localDb.js`, `engine-deepseek.js`, `engine-scrapy.js`, probe scripts.
- Commit the whole (currently uncommitted) tree as one reviewed baseline.

---

## 8. ACCEPTANCE CRITERIA (what "god level" means, measurable)

| Metric | Now (measured) | Target |
|---|---|---|
| Leads for a Guntur-class city | 131 (folder) | 250–400 |
| Mobile coverage | ~60–69% | ≥85% |
| In-city leads dropped by containment | ~50% | 0 |
| First lead | 7–8 s | ≤5 s |
| Sustained throughput | 3–4 leads/s (burst) | ≥10 leads/s |
| Stop button total time | 1–3 min (keeps working) | <3 s |
| Data loss after crash/kill | possible | none |
| Duplicate queries per run | 20–24 identical Maps viewports | 0 |
| Folder vs live store for a session | can disagree | identical |

---

## 9. WHAT I ALREADY CHANGED IN THIS SESSION (safe, reversible)

- `dbAdapter.saveVendors` now merges instead of replacing; `replaceVendors` added for real deletes (`vendors.js`, `leadRetention.js`).
- `engineHealth.flushNow()` + `note` support (short scripts no longer lose health writes).
- `google-serp` paused honestly; `brave` reports HTTP 429 as a rate limit instead of pretending 0 rows.
- `social` dork: fallback query when Bing ignores `site:`, unwrapped links, now returns real profiles (verified: 2 profiles, 1 lead with mobile).
- Dental category fidelity: no more eye hospitals in dental searches.
- `scripts/restore-vendors.js` (rebuild store from backups + folders), `inspect-session.js`, probes.

## 10. DATA SAFETY RIGHT NOW

- Your old leads are in `db/user_sessions/**` (131–133 per folder) and in `server/data/scraped_vendors.backup-*.json`.
- The live store is currently small because every run purged it. Phase 1 stops that permanently.
- Before approving, I will run `restore-vendors.js` once more and snapshot it as the baseline, then never purge again.

---

## Approve?

Reply with **“approve phase 1”** (safest, fastest win), **“approve 1+2”** (data + mobiles), or **“approve all”** (phases 1–5). I will start immediately with the approved phases and report measured before/after numbers per phase.

---

## 11. PHASE 2.5 — DATA-INTEGRITY HARDENING (measured 2026-11-06)

The Phase 1+2 verification exposed a real wipe and several silent-loss paths. Fixed and verified:

| # | Bug | Impact | Fix | Proof |
|---|-----|--------|-----|-------|
| 1 | A process that only *loaded* the store scheduled a snapshot, which truncates the journal | A read-only probe could wipe pending writes | `load()` snapshots only when it actually repaired something; `.store.lock` owner check; boot-time claim | reader + second server both report `readOnly=true`, lock unchanged |
| 2 | `snapshotNow()` could write `[]` over a non-empty store | Full dataset loss | Hard guard: empty snapshot blocked unless caller forces it (`replaceAll`, last-row delete) | guard unit-tested; `BLOCKED empty snapshot` path |
| 3 | `healFromSessions()` only understood bare arrays, not `{ leads: [...] }` folder files | Boot recovery restored 387 of thousands | Shape-aware folder reader + `bulkRestore()` (O(n)) | **4,899 leads / 3,544 mobiles restored from 20,195 folder rows in 5.1 s** |
| 4 | `uniqueStrings()` stringified phone objects → `"[object Object]"` | Phone numbers destroyed on merge | `normalizePhoneEntries()` / `phoneString()`; boot repair | 0 non-string / 0 `[object Object]` entries after repair |
| 5 | web-contact kept only object phones, dropped string phones | Extra phones erased on each website pass | Shape-agnostic phone list; mobile promotes over landline | code path covered |
| 6 | Website pass read the first N leads regardless of need | Mobile coverage wasted on already-complete rows | Prioritise no-phone → landline-only → mobile | code path covered |
| 7 | Export used only `phone`; landlines in `phones[]` vanished | CSV had no number for 20–24% of leads | `leadPhoneList()`; Primary = validated mobile, Secondary = extra numbers; vCard/txt/dialer too | cement2 export: 213 mobiles + 144 secondary; Sowjanya landline exported; no landline WhatsApp link |

### Verified this session

- **STOP**: `POST /api/scrape/jobs/stop-all {sessionId}` responded in **2.5 s**; run became `aborted`, `finished=true`; folder preserved 32 leads; prior folders/store intact.
- **402**: enforced + 0 credits + anchor off → `HTTP 402 {"error":"credits_exhausted"}`; `/api/sessions/list` and `/api/vendors` still `200`; no run started.
- **Export**: 429 rows, 213 validated mobiles, 144 secondary phones, 214 mobile-only WhatsApp links.
- **Coverage (after recovery)**: cement2 209/425 mobiles (49%), 296 any phone (70%); dental 188/359 (52%), 275 any phone (77%). Landline-only leads are 20–24%; 120–129 leads genuinely have no number published on Maps (only 2–5 have a website).
- **No mobile lead lost in recovery**: 4 id-mismatches in cement2 all survive under another id; `missing mobile leads not present elsewhere: 0`.

### Lesson recorded

`^[6-9]\d{9}$` on the last ten digits is **not** a mobile test in India: `0863 235 3810` → `8632353810` starts with 8 and passes, but `normalizePhone(..., {context:'phone mobile'})` correctly reports `isMobile:false`. Every mobile decision must use the parser, never the regex.

---

## 12. PHASE 2.6 — REAL CAUSE OF THE "REPEAT SEARCH ONLY RETURNS NEW LEADS" SYMPTOM

The suspected bug was that `engine-google-places.js` only stamped `place.sessionId` on brand-new rows. Inspected and **disproved**: the duplicate branch already sets `existing.sessionId`, and `mergeVendor()` appends it to `sessionIds` / `lastSessionId`. Proof: `Sowjanya Dental Clinic` (found again in the repeat run) carries
`sessionIds: [..., "proof_phase12_dental", "proof_phase3_dental"]`.

What actually happened on the repeat run (`proof_phase3_dental`, 203 s):

| Observation | Value |
|---|---|
| Old dental folder | 361 leads |
| Repeat run folder | 83 leads (85 session rows) |
| Old dental leads not seen again | 284 (tagged only with the previous session) |
| Google warnings in the run log | 5 × `Google Search CAPTCHA detected` → Local Finder cooled down 8 min and pivoted to Maps |
| Zones that produced 0 verified records | 57 of 67 |
| Distinct business names extracted | 62 (each returned ~7× across zones) |
| Mobile coverage of what it *did* find | 80/85 = 94% |

So the engine was not losing leads it found. Google throttled Local Finder (CAPTCHA) and Maps returned the same city-wide subset for every zone. The remaining 280 known Guntur dentists were never offered by Google in that run.

### Consequence / decision needed

A new folder is an honest "what this run verified". It currently does **not** carry forward previously verified leads for the same city + category that this run happened not to see. Carrying them in (with `carriedFrom` provenance, strict containment and category-fidelity checks) would make repeat searches return the full known city dataset even when Google throttles — but it is a product-behaviour change, so it is held for explicit approval as **Phase 3**.

### Also fixed here

- `snapshotNow()` / `flushNow()` refuse to run before the store is loaded. Root cause of the earlier wipe: `/omni` calls `dbAdapter.flushSync()` *before* any data load, so a fresh process snapshotted `[]` over the real file. Verified after restart: boot → `/omni` → stop kept the store at 4,901 rows / 12.8 MB.
- `/api/scrape/active` no longer reports `isScraping: true` for a session that is already `aborted`/`completed` while its last browser job settles.

---

## 13. PHASE 3 — CARRY FORWARD KNOWN LEADS (approved 2026-11-06)

At the end of a completed client run, the orchestrator now adds previously verified leads for the **same city + category** that this run did not re-encounter.

Rules enforced in code:

1. Source is the live store only — a carried row always exists and was accepted by containment when it was first found. Nothing is invented.
2. Coordinates must be inside the run's final anchor radius (`finalMaxKm`). Rows without coordinates must pass `isListingRelevantToQuery` text containment against the searched city.
3. Category fidelity: `isVendorRelevant(lead, category)` when the category has a known role; for generic queries only an exact stored-category match is carried.
4. Duplicate-safe by id, Maps link (query string stripped) and parsed mobile.
5. Master filters (`minRating`, `hasWebsite`, `verifiedOnly`, `mobileOnly`) still apply, so a filtered master view never gains a row the operator excluded.
6. Each carried row gets `carriedForward: true` and
   `carriedFrom: { sessionId, sessionIds, scrapedAt, addedAt, reason }`.
   Its `sessionId` / `sessionIds` are **not** rewritten, so "encountered by this run" stays truthful.
7. Folder metadata records `carriedForward: { count, fromSessions }`, and the run log prints a `[Carry Forward]` line.
8. Carried rows are never charged a credit again (credits are charged once at discovery) and never tagged as new discoveries.

### 13.1 Measured proof (2026-11-06, after engine restart)

Run `proof_phase3e_dental` (Dentists, Guntur city — footprint + 5 km ring, 64 zones):

| Metric | Value |
| --- | --- |
| Leads in folder | 115 |
| Carried forward from earlier runs | 34 (29.6%) |
| Carried rows with `carriedFrom` provenance | 34 / 34 |
| Carried rows that failed area/category containment | 0 |
| Leads with a validated mobile | 101 / 115 (88%) |
| Leads with any usable phone (mobile or landline) | 109 / 115 (95%) |
| Farthest lead from the searched centre | 10.1 km |
| Export rows | 117 |
| Export primary mobiles | 101 |
| Export secondary phones (landline / extra numbers) | 44 |

The folder reports 115 rows while the CSV shows 117 because `freshenLeadsFromStore` appends late rows that arrived tagged to the session after the carry-forward snapshot. This is expected and is not double counting.

Restart safety verified: the engine was killed and restarted (new PID, `store.ownerPid == thisPid`), and the folder still returned all 115 rows with all 34 provenance records and a working export. Phase 3 never re-charges a credit for a carried row and never rewrites `sessionId`, so "found by this run" stays truthful.

The folder's `metadata.carriedForward` holds `{ count: 34, fromSessions: [...] }` so the UI can explain where the extra rows came from without opening every lead.

### 13.2 UI provenance

Carried rows are visibly different everywhere:

- `CarriedBadge` ("✓ Verified earlier", tooltip shows source search + date) on telecaller cards, table rows and the recent-leads list in both `CommandCenter.jsx` and `MasterCommandCenter.jsx`.
- `VendorDrawer` shows a green "Verified earlier" notice with the source session and date.
- Styles: `.v2-carried-badge`, `.v2-drawer-notice.is-carried` in both `v2.css` files.

---

## 14. INDIAN ADMINISTRATIVE GEOGRAPHY — ONE VOCABULARY PER STATE (2026-11-06)

A master sweep must mean the same thing to an operator in every state. India has no single word for the level between a district and a village, so the engine stores the **canonical level** and prints the **local word**.

Canonical tree: **state → district → sub-district → city / town / village**.

| Local word for the sub-district | States / UTs |
| --- | --- |
| Mandal | Andhra Pradesh, Telangana |
| Taluk | Tamil Nadu, Karnataka, Kerala, Puducherry |
| Taluka | Maharashtra, Gujarat, Goa, Dadra & Nagar Haveli and Daman & Diu |
| Tehsil | Uttar Pradesh, Madhya Pradesh, Rajasthan, Haryana, Punjab, Bihar, Jharkhand, Chhattisgarh, Uttarakhand, Himachal Pradesh, Jammu & Kashmir, Ladakh, Delhi, Chandigarh, Andaman & Nicobar, Lakshadweep |
| Block (CD block) | West Bengal, Odisha, Assam, the North-East, Sikkim |

Accepted input spellings are aliases, not separate levels: `mandal`, `tehsil`, `tahsil`, `taluk`, `taluka`, `taluq`, `block`, `cd block`, `circle`, `sub-district`, `subdivision`, `firka` all resolve to the canonical sub-district. District aliases: `district`, `dist`, `zilla`, `zila`, `jilla`, `jila`.

### 14.1 Sweep semantics (coverage-first)

| Scope | What is enumerated | Cap |
| --- | --- | --- |
| State | Every district HQ **plus** every sub-district HQ in every district (each sub-district query covers its own villages) | 1200 |
| District | The district HQ **plus** every sub-district HQ. `deep: true` adds every revenue village as its own zone | 200 |
| Sub-district (mandal / taluk / tehsil / block) | The HQ **plus** every revenue village / ward in it | 400 |
| City / town / village | Every commercial locality inside the city footprint plus the street grid and the 5 km ring | 80 |

Caps are a safety valve, never a silent truncation: zones are allocated coverage-first (every unit gets its HQ before any unit gets a second zone), and the response always reports `coverage` (`districts`, `subDistricts`, `villages` and how many of each were covered) plus `capped`.

### 14.2 Parsing rules

1. An explicit suffix in the typed place wins over the UI dropdown. "Pollachi Taluk" stays a Taluk even if the dropdown says district; "Guntur Zilla" stays a district.
2. A bare place asks the operator to choose when the word is ambiguous (e.g. "guntur" → Guntur city or Guntur district?).
3. Fuzzy resolution is deliberately conservative: a near-match must reach containment ≥ 0.8 **or** Levenshtein distance ≤ 2, so "Barrackpore Block" resolves to "Barrackpur I Block" but a random village is never promoted to a district.
4. If a requested level cannot be found, the engine falls back one level at a time and prepends an explicit warning to the response rather than returning an empty plan.
5. A city plan built from words that match no gazetteer index is flagged `unverifiedPlace: true` and carries a warning ("not found in the offline India gazetteer — check the spelling"). It still runs, because the operator may know a town the offline data missed, but no credits are spent silently on a typo.

### 14.3 Measured previews (2026-11-06)

`POST /api/scrape/master-sweep/preview` with `x-workspace-scope: master` (the same call the master UI debounces while you type):

| Input | Resolved scope | Local term | Zones | Coverage | ETA |
| --- | --- | --- | --- | --- | --- |
| Guntur | district | Mandal | 19 | 1 district / 18 sub-districts / 219 villages | 1 min |
| Tenali Mandal | mandal | Mandal | 10 | 1 / 1 / 9 | 1 min |
| Pollachi Taluk | mandal | Taluk | 121 | 1 / 1 / 120 | 7 min |
| Andhra Pradesh | state | Mandal | 723 | 28 districts / 695 sub-districts | 37 min |
| Coimbatore | city | City | 64 | 1 city / 64 localities | 4 min |
| Barrackpore Block | mandal | Block | 54 | 1 / 1 / 53 | 3 min |

City previews resolve their state from the gazetteer, so Coimbatore reports Tamil Nadu's vocabulary ("Taluk") and Guntur reports Andhra Pradesh's ("Mandal") instead of a generic fallback.

Preview endpoint contract: `403` without master scope, `400` without a place name, `404` when the offline gazetteer cannot resolve the place, and on success `{ scope, requestedScope, targetName, unitTerm, requestedTerm, terminology, coverage, totalZones, capped, warnings, estimatedMinutes, sampleZones }`.

### 14.4 Known limits of the offline gazetteer

- 36 states, 630 districts, 5,623 sub-districts, 413,708 villages (26 MB JSON).
- Andhra Pradesh post-2022 reorganisation is only partly applied.
- Coimbatore lists 6 sub-districts (the source data is incomplete).
- `Srirangapatna` is absent, so it falls back to city scope with a warning instead of failing.

When a place is missing, the response says so and the UI shows it; the engine never silently invents an administrative unit.

