# Improvement Plan v2 — Search, Learning, Geo Accuracy, Speed, Mascot

Status: plan for approval · Owner: engineering · Areas: master + client + engine
Last verified: 2026-10-31

---

## 1. Where we are (measured, not assumed)

| Item | Current reality | Evidence |
|---|---|---|
| Learning writes | **Working** | “Computer Delears” run → 122 leads, 106 phones, `learned.json` has 1 product, 2 categories, 3 brands |
| Learning UI | **Times out at 30 s** during an active scrape | user report; `/api/search/learned` answered fine when the engine was idle |
| Learned spelling | **Learns typos** | product stored as `computer delears`, expansions “Computer Delears dealer” |
| Place resolution | **Ambiguous names default to district**, not city | `buildAutoPlan('Computer Dealers in Guntur').zones = 0`; fallback enumerated Tenali/Mangalagiri/Ponnur |
| Geo boundary | Partial guard exists, but leaks | engine log: `Boundary Filter` rejected Croma/VIJAY SALES, yet map still shows far leads from earlier sessions |
| Search state | Old place leaks into new searches | `form` + `autoQuery` were seeded with “Plumbers / Vijayawada”; opening a folder rewrote the search bar |
| Suggestion engine | Correct but occasionally noisy | fuzzy rows like “Car Wash” for `amd graphic card` (now filtered) |
| Mascot | **CSS/SVG faux-3D**, not real 3D | `Mascot3D.jsx` uses perspective + SVG; no WebGL |
| Scraper speed | Good accuracy, ~1.65 leads/s | 122 leads in 74 s on the Guntur run |

Root causes for the two loudest complaints:

1. **Learning tab timeout** — the catalog is built and serialised on the same event loop that is running Playwright jobs. During a sweep the process is busy, so the request sits until the UI’s 30 s timeout.
2. **Guntur going out of bounds** — the resolver treats a bare “Guntur” as a district (mandal fan-out) instead of a city, and the map fits every stored lead, including leads from older sessions.

---

## 2. P0 — Correctness and speed (days 1–5)

### P0.1 Learning that is instant and trustworthy
- **Snapshot cache in `taxonomyLearner`**: keep `snapshot = { totals, lists, version }` in memory; rebuild in <5 ms only after `recordRun`, never on request.
- **Cheap endpoint**: `/api/search/learned` and `/api/search/taxonomy` return the snapshot with `ETag` + `Cache-Control: private, max-age=5`; add `?limit` paging.
- **UI resilience**: `LearningCenter` timeout 8 s, retry once, skeleton rows, “learning stalled — engine busy” message instead of a generic timeout.
- **Live refresh**: push `taxonomy:updated` over the existing SSE stream so the tab updates without polling.
- **Canonical learning**: run `fixSpelling` + `brandIntel.detect` before storing, so `computer delears` is learned as **Computer Dealers** with the dealer/shop/supplier expansions of the corrected phrase.
- **Reject noise**: never learn expansions that contain an unresolved typo token; cap learned phrases per product at 8.

**Acceptance**
- Learning tab renders in <300 ms warm, <1 s during an active scrape.
- A successful run appears in the tab within 2 s without a manual refresh.
- `computer delears in guntur` teaches `Computer Dealers`, and typing `computer` shows it as a LEARNED row.

### P0.2 Place intelligence: city vs district vs mandal
- **Explicit level resolution** (already partially added): `findPlaceVariants` returns every level that shares a name; expose `disambiguation.question`.
- **Default rule**: bare name + a city of that name exists → **city**; only `… District` / `… Mandal` / `… State` suffixes widen the scope.
- **Scope chips** in both apps: `City · District · Mandal · State`, visible before the run starts, with the zone count (“Guntur city → 12 zones”, “Guntur district → 56 mandals”).
- **No silent widening**: district/state on the client shows the custom-service message; master shows an explicit confirmation with the zone cap.
- **Fix `resolveUniversalZones` order**: city → district → mandal → state → locality, driven by the resolved level, never by map iteration order.

**Acceptance**
- `Computer Dealers in Guntur` runs **inside Guntur city** (12–15 zones, all within ~8 km of 16.3067, 80.4365).
- `Computer Dealers in Guntur District` enumerates 56 mandals and says so.
- Choosing the wrong level is one click away in the dropdown.

### P0.3 Geofence and map truth
- New `server/src/services/geoFence.js`: resolve the run’s target box (city ±0.08°, mandal ±0.10°, district from mandal hull, state from district hull).
- Apply the fence at ingestion: leads with coordinates outside the box go to **Out of Bounds** (already a folder concept), never into the folder or map; leads with no coordinates stay but are marked `geoUnverified`.
- **Map fits the target box**, not all stored leads; ignore `geoUnverified` pins unless the operator enables them.
- **One run, one view**: starting a run clears the previous vendor list, map markers and session filter before the first new lead arrives.

**Acceptance**
- Zero leads outside the target box in a Guntur city run (spot-check latitudes 16.2–16.4, longitudes 80.3–80.5).
- Map opens framed on Guntur, never on Vijayawada/Macherla.
- Out-of-bounds leads are visible only in the quarantine folder.

### P0.4 Ultra-fast suggestions
- **Warm prefix index** for cities/mandals/districts built once at boot (the 619k village scan stays lazy).
- **Budget per keystroke**: answer from cache in <16 ms; abort in-flight requests on new input; debounce 120 ms (currently 150 ms).
- **Local memo** in both apps: last 50 prefixes per session, so backspacing is instant.
- **Ranking**: exact > prefix > typo > semantic; drop rows whose score is below the intent gate (already added for categories).
- **Extend autocorrect**: `delears→dealers`, `computor→computer`, `moble→mobile`, `repeir→repair`, `servise→service`, `laptp→laptop`, plus a learned-typo map that promotes a correction after 3 consistent runs.

**Acceptance**
- p95 suggestion latency ≤120 ms warm, ≤600 ms cold; 0 requests when the input is unchanged.
- Typing `computr delears in guntur` yields “Computer Dealers” + Guntur city/district choices.

### P0.5 Scraper speed without losing accuracy
Baseline: 122 leads / 74 s (1.65 leads/s) for the Guntur run.

- **HTTP-first everywhere**: JustDial list pages, Local Finder HTML, Maps API; Playwright only for blocked pages, category-id resolution and IndiaMART.
- **Connection reuse**: keep-alive agents per host, HTTP/2 where offered, gzip.
- **Browser hygiene** (when Playwright is unavoidable): one browser, one context per engine, block images/fonts/media, reuse pages, close after N queries.
- **Adaptive fan-out**: start with `min(6, machineBudget)` workers; scale to `machineBudget × 1.5` only while queue depth > 2× workers and error rate < 5%; back off on 429/403.
- **Early exit**: stop a zone once target leads for that zone are reached; stop the swarm at the global target.
- **Dedupe before enrichment**: phone/name/geo fingerprint before deep extraction, so enrichment only runs on unique leads.
- **Per-engine timeouts** (Local Finder 25 s, Maps 20 s, JustDial 30 s, IndiaMART 35 s) with retry-once on transport errors only.
- **Proxy health**: rotate only on failure; retire a proxy after 3 consecutive failures.

**Acceptance**
- ≥2.5 leads/s on the same Guntur query (≈+50%), no accuracy regression on the existing fidelity tests.
- 0 duplicate phones in the output folder; enrichment count ≤ unique leads.
- No engine exceeds its timeout budget; failures visible on the Engine board.

---

## 3. P1 — Advanced search features (week 2)

1. **Scope-first search bar**: type a phrase → the bar shows `Category × Place × Scope` chips before running; every chip is editable.
2. **Search preview**: “You will search 12 zones around Guntur city · 4 engines · ~2 min · est. 180 leads” before spending a credit.
3. **Feedback loop on suggestions**: 👍/👎 per row; down-voted rows decay in ranking, up-voted rows get learned.
4. **Saved searches & alerts**: save `Computer Dealers in Guntur city`; re-run with one click or on a schedule (master).
5. **Confidence scoring**: each lead gets a confidence badge (phone verified, address match, engine count); filter by confidence.
6. **Duplicate merge UI**: grouped duplicates with “keep best” and field-level merge.
7. **Coverage map**: heatmap of zones searched vs not searched for a district/state, so gaps are visible.
8. **Per-engine benchmark view**: leads/min, dedupe rate, error rate, last successful query — from real telemetry.
9. **Multi-language input**: Telugu/Hindi transliteration for categories and places (ఇనుప → iron, మెకానిక్ → mechanic).
10. **Offline cache**: previously fetched folders and suggestions available with no network; queued runs resume.

---

## 4. P1 — Real 3D mascot (week 2–3)

Current: `Mascot3D.jsx` is CSS perspective + SVG (faux-3D), duplicated in client and master.

Target: a real WebGL mascot with a state machine.

- **Asset**: one GLTF/GLB model (≤2 MB, Draco-compressed), 3 LODs.
- **Runtime**: `three` + `@react-three/fiber` + `drei`; lazy-load only when the mascot is visible.
- **States**: `idle → listening → scanning → celebrating → warning → sleeping`, driven by real app events (typing, run start, lead found, error, idle 60 s).
- **Animation**: spring/ik transitions (no keyframe snapping); blink, head-turn toward cursor, speech bubble tied to state.
- **Performance budget**: 60 fps desktop, 30 fps low-end; idle CPU <3%; pause rendering when tab hidden or mascot off-screen (`IntersectionObserver`).
- **Fallback**: current CSS mascot for `prefers-reduced-motion`, save-data, or WebGL failure.
- **Shared package**: one `packages/mascot` consumed by client and master — no more duplicated copies.

**Acceptance**
- Mascot reacts to a real run within 100 ms of the event.
- No dropped frames while scraping (frame time p95 <16 ms).
- Bundles stay under +400 KB gzip for the mascot chunk.

---

## 5. P2 — Scale and operations (week 4+)

- Scheduled master sweeps (district/state) with resumable checkpoints.
- Role-based master users (operator/viewer/admin) and per-client quotas.
- Coverage ledger across runs (what was searched where, when, with which engine).
- Data-quality dashboard (phone validity, duplicate rate, geo-verified rate).
- Server-side export jobs for very large folders (CSV/Excel) with progress.
- Alerting: engine down, error-rate spike, quota near exhaustion.

---

## 6. Work breakdown by file

| Area | Files |
|---|---|
| Learning snapshot + canonicalisation | `server/src/services/taxonomyLearner.js`, `server/src/services/brandIntel.js` |
| Learning API + timing | `server/src/routes/search.js`, `server/src/routes/scrape.js` |
| Learning UI | `master/src/v2/LearningCenter.jsx`, `master/src/v2/api.js` |
| Suggestion speed | `server/src/services/searchSuggest.js`, `server/src/utils/indiaGeoIndex.js`, `master/src/v2/SuggestInput.jsx`, `client/src/v2/SearchConsole.jsx` |
| Place level + zones | `server/src/utils/universalGeoCluster.js`, `server/src/services/sweepScopePolicy.js`, `server/src/services/categoryRouter.js` |
| Geofence + map | new `server/src/services/geoFence.js`, `server/src/routes/scrape.js`, `client/src/v2/CommandMap.jsx`, `master/src/v2/CommandMap.jsx` |
| Scraper throughput | `server/src/routes/scrape.js`, `server/src/scrapers/concurrencyManager.js`, `server/src/scrapers/browserFactory.js`, engine modules |
| Search refinements | `client/src/v2/SearchConsole.jsx`, `master/src/v2/MasterCommandCenter.jsx` |
| Mascot | new `packages/mascot/*`, `client/src/v2/ScreenMascotCompanion.jsx`, `master/src/v2/ScreenMascotCompanion.jsx` |

---

## 7. Acceptance matrix (must pass before calling v2 done)

| # | Test | Expected |
|---|---|---|
| 1 | Learning tab open during an active sweep | renders <1 s, no timeout |
| 2 | Run “computer delears in guntur” | learned as **Computer Dealers**, visible in tab within 2 s |
| 3 | Type `computr` | suggests Computer Dealers / Computer Shop |
| 4 | Type `guntur` | asks “Which Guntur?” with city, district, mandal, village |
| 5 | Run Guntur city | all leads inside 16.20–16.42 / 80.30–80.56 |
| 6 | Map after Guntur run | framed on Guntur, no Vijayawada/Macherla pins |
| 7 | Start a second search | previous place/leads cleared, new run independent |
| 8 | Suggestion latency (warm) | p95 ≤120 ms |
| 9 | Guntur throughput | ≥2.5 leads/s, 0 duplicate phones |
| 10 | Engine failure | engine board red within 30 s, run continues where possible |
| 11 | Mascot during run | “scanning” state, 60 fps, no layout shift |
| 12 | Low-end fallback | CSS mascot renders, no WebGL errors |

---

## 8. Sequence and time

| Week | Deliverable |
|---|---|
| 1 (days 1–2) | Learning snapshot + canonicalisation + UI resilience (P0.1) |
| 1 (days 3–5) | Place intelligence + geofence + one-run-one-view (P0.2, P0.3) |
| 2 (days 1–3) | Suggestion speed + autocorrect + scope chips (P0.4, P1.1–1.2) |
| 2 (days 3–5) | Scraper throughput (P0.5) with before/after numbers |
| 3 | 3D mascot + feedback loop + confidence scoring |
| 4 | Saved searches, alerts, coverage heatmap, packaging |

Risks: Playwright memory on 8 GB machines (mitigate with LOD/browser reuse and `machineBudget`), upstream anti-bot changes (keep HTTP-first and per-engine timeouts), and mascot bundle size (lazy-load + LOD).

---

## 9. Immediate first commit (before the rest of P0)

1. Snapshot cache + `ETag` for `/api/search/learned`; UI timeout 8 s + retry.
2. Canonicalise learned products/services through `fixSpelling` before storing.
3. Clear previous vendors/place when a new run starts; stop folder-open from rewriting the search bar.
4. City-first zone resolution so `Guntur` means Guntur city until the operator picks the district.
