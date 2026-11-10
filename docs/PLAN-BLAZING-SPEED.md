# PLAN — BLAZING SPEED (v2, measured)
### Faster searches, same leads, parallel engines intact

**Status:** approved. Phase 7 (folder lifecycle + truthful run state) is **implemented and verified**. Phases 1 (two-pass coverage), 2 (one shared browser budget), 3 (per-zone latency), 4 (store/SSE batching), 5 (honest ETA + live instrument panel) and 6 (carry-forward, repeat-zone ordering, HTTP cache) are **implemented and measured**.
**Date:** 2026-11-08 (v2 measured; Phase 1-5 results appended)
**Supersedes:** the first draft of this document (which was written from code reading before the test runs). Every claim below is now backed by a real run on this machine.
**Companion docs:** `FIX-PLAN-GODLEVEL.md` (data integrity), `PLAN-3D-EXPERIENCE.md` (visual system), `MASTER_SWEEP_INTELLIGENCE.md` (sweep semantics).

---

## 0. The decision, in one screen

The first draft said *"the HTTP tier is throttled, unlock it and the run gets 4× faster."* **The tests prove that is wrong.** The HTTP tier is dead — it returned **0 leads on 17 of 17 queries**. Local Finder is *slower* than Maps, not faster. The old plan would have made runs slower.

What the tests actually show:

1. **Time-to-first-value is already excellent.** Tenali: 16 leads in **2.8 s**, 25 by **33 s**. Vijayawada hospitals: **158 leads in 2.4 s** from the directory engines.
2. **The long tail is the problem.** Tenali's last 9 leads take **190 s**. The grid (60 of 88 zones) produced **1 lead out of 34**. Vijayawada: 65 grid zones produced **18 of 476 leads (3.8%)**.
3. **The scheduler gives 2 browser slots on an 8-core machine.** The RAM heuristic reads Windows' "free" memory, which is chronically low, so it throttles to 2. A direct test shows **8 concurrent Maps contexts work** and raise lead throughput from **1.82 to 13.83 leads/s** (7.6×).
4. **The grid is 68% of the runtime for 3% of the leads.**
5. **The run is oversubscribed.** The orchestrator starts **8 Playwright enrichment workers outside the queue** (`omniSearchOrchestrator.js:161`, `phoneBackfillService.js:650`) while the zone swarm runs. A client run therefore drives **~10 Chromium page loads on 8 cores**, not 2. That is why a real zone costs 5.5 s while the same zone in isolation costs 1.5 s. The two-session test confirmed it: the queue advertised `maxWorkers: 3` while **11 workers were active**.

**Decision: ship the search in two passes.** A fast pass over the named localities (28 zones, ~97% of leads, **~35 s**), then an optional/background grid pass for the long tail. Put discovery and enrichment under **one browser budget** instead of two competing ones. Delete the dead HTTP tier. Do **not** reorder engines toward Local Finder.

Honest headline: **the same 88-zone result drops from 223 s to ~100–110 s (≈2×)**, and the **97%-of-leads result drops from 223 s to ~35 s (≈6×)**. Throughput in leads/s will *not* jump to 10 for a small town, because a small town does not contain more businesses — what improves is how fast you get the leads that exist.

**Correctness addendum (ships in the same release):** two reported defects are not speed issues but are included here — folders that come back after delete, and a false **"SWARM PAUSED / STOPPED"** banner on a finished run. Both are reproduced and root-caused in **Phase 7**.

---

## 1. Test rig (reproducible)

Four probes, all read-only with respect to scraping logic. They start real searches or call the same engine functions the orchestrator calls.

| Script | What it measures |
|---|---|
| `scratch/speed-bench.js` | End-to-end omni search: first lead, 10th/25th/50th/100th, zones, wall clock, real queue concurrency, engine task counts, source mix, mobile % |
| `scratch/concurrency-scaling.js` | Wall time and lead throughput for N simultaneous Maps zones (N = 1, 3, 5, 8) |
| `scratch/http-tier-probe.js` | The Tier-1 Google HTTP path: latency, yield, gate pass rate |
| `scratch/engine-compare.js` | Local Finder vs Maps on the same zone: latency and yield |
| `scratch/parallel-sessions.js` | Two searches started in the same tick: both complete, no cross-session rows |

Commands:

```powershell
node scratch/speed-bench.js "dentists in tenali" --radius 5 --seconds 600 --label clean-tenali
node scratch/concurrency-scaling.js "dentists in tenali" --n 1,3,5,8
node scratch/http-tier-probe.js "dentists in tenali" --n 12
node scratch/engine-compare.js "dentists in tenali" --zones 2
node scratch/parallel-sessions.js
```

Machine: **8 cores, 16.3 GB RAM**, Windows. Live engine: pid 9488, store owner verified, credits unenforced (1,000 free).

---

## 2. Measured results

### 2.1 End-to-end runs

| Run | Zones | Wall | s/zone (wall) | Browser slots | Leads | Mobile % | First lead | 100th lead |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dentists · Tenali (run 1) | 88 | **215.6 s** | 2.45 | 2–3 | 39 | 82% | 4.6 s¹ | — |
| Dentists · Tenali (clean run) | 88 | **222.8 s** | 2.53 | **2** | 34 | 85% | **2.8 s** | — (34 total) |
| Hospitals · Vijayawada | 105 | **410.3 s** | 3.91 | **2** | **476** | 83% | **2.4 s** | **2.4 s** |

¹ run 1 was attached after the first burst, so its first-lead figure is not comparable. The clean run is the baseline.

**Zone completion is perfectly linear:** ~0.4 zones/s (Tenali) and ~0.26 zones/s (Vijayawada) from start to finish, no stalls. There is no hidden deadlock — just a fixed rate set by `zones × per-zone time ÷ slots`. Vijayawada is slower per zone because every zone inserts ~4.5 leads instead of ~0.4, and each insert costs storage work.

### 2.2 Where the leads actually come from

| Zone kind | Tenali zones | Tenali leads | Vijayawada zones | Vijayawada leads |
|---|---:|---:|---:|---:|
| Locality + vector (named places) | 28 | **33 (97%)** | 39 | **300 (63%)** |
| Grid (2.6 km cells, "near lat,lng") | 60 | **1 (3%)** | 65 | **18 (3.8%)** |
| City-level directory engines (untagged) | — | 0² | — | **158 (33%)** |

² In Tenali the directory engines' rows carry the base-location tag, so they appear inside the named total. In Vijayawada the split is visible.

Source mix — Tenali: **Google Maps 17 · JustDial 17**. Vijayawada: **Google Maps 294 · OpenStreetMap 99 · JustDial 83**.

Time-to-value curve:
- **Tenali:** 16 leads at 2.8 s → 25 at 33.1 s → 34 at 222.8 s. 73% of leads in the first 15% of the runtime.
- **Vijayawada:** **158 leads at 2.4 s** (directory engines) → 476 at 410.3 s. 33% of leads in the first 0.6% of the runtime.

The grid is consistently ~3–4% of leads for ~60–65% of the zones. That is the single clearest scheduling signal in the data.

### 2.3 Concurrency scaling (same engine, same zones, N at once)

| N parallel zones | Wall | Per-zone wall | Leads | Lead throughput | vs N=1 |
|---:|---:|---:|---:|---:|---:|
| 1 | 4.93 s | 4.93 s | 9 | 1.82 /s | 1.00× |
| 3 | 4.47 s | 1.49 s | 27 | 6.04 /s | 3.32× |
| 5 | 6.29 s | 1.26 s | 56 | 8.90 /s | 4.89× |
| 8 | 9.69 s | 1.21 s | 134 | **13.83 /s** | **7.60×** |

**This is the proof that parallel scraping works and that the cap is self-imposed.** Eight Chromium contexts fit comfortably: free RAM moved only 2,321 → 2,213 MB. Per-zone cost rises from 4.9 s to 9.7 s under full load (CPU contention), but total throughput still rises 7.6×. The sweet spot on this 8-core box is **5–6 slots**; beyond that, contention eats the gain.

### 2.4 The two Google engines, head to head

| Engine | Mean time / zone | Leads (2 zones) | Notes |
|---|---:|---:|---|
| Local Finder (`scrapeGoogleLocalFinder`) | **5.12 s** | 20 | HTTP tier returned 0; fell through to browser pagination |
| Maps (`scrapeGooglePlaces`) | **3.17 s** | **28** | Feed cards already contain phones |

**Maps is both faster and higher-yield.** The orchestrator already prefers Maps; that preference is correct and must stay.

### 2.5 HTTP tier probe (the old plan's "big win")

| Metric | Result |
|---|---|
| Queries tested | 17 (12 zone variants + 5 plain city queries) |
| Requests that returned ≥ 6 leads | **0 / 17 (0%)** |
| Median latency | 318 ms |
| Failure reason | `no_cards_in_http` on every request |
| What Google returns | 200 OK, ~94 KB, but the local-pack cards (`VkpGBb`, `rl_item`, `e6hkjf`) are **absent**; page contains `enablejs` |

Google serves a JavaScript shell to plain HTTP. **The HTTP tier cannot work without executing JavaScript.** It is not a speed lever; it is 300–450 ms of pure waste per Local Finder zone.

### 2.6 Two searches at once (parallel integrity)

| Session | Query | Wall | Zones | Leads | Mobiles | Foreign rows |
|---|---|---:|---:|---:|---:|---:|
| `par_a` | electricians · Tenali | **191.4 s** | 97/97 | 83 | 64 (77%) | **0** |
| `par_b` | photo studios · Tenali | **335.1 s** | 97/97 | 35 | 30 (86%) | **0** |
| Both | started in the same 243 ms tick | **338.2 s total** | — | 118 | 94 | **0** |

Both sessions completed, every zone resolved, and **no lead was tagged with the other session** (`foreign: 0` for both). Parallel scraping is intact.

Two caveats the run exposes:

- The slower session pays **1.75×** (335 s vs 191 s) because both searches share the same zone slots and the same enrichers. That is the cost of true concurrency on this machine, not a bug.
- The queue reported **`maxWorkers: 3` but peaked at `11` active workers** with **191 pending jobs**. The extra 8 are enrichment workers running outside the queue — direct confirmation of F9. The published cap is not the real browser count.

---

## 3. What the data proves

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| **F1** | Time-to-first-lead is already good | 16 leads at 2.8 s | Do not touch the directory-engine path |
| **F2** | The grid is the tail | 60 grid zones → 1 lead; 28 named zones → 33 | Run named zones first; grid second/optional |
| **F3** | Browser concurrency is the biggest safe lever | 2 slots today; 8 slots = 7.6× throughput | Replace the RAM heuristic |
| **F4** | The HTTP tier is dead | 0/17 queries, `no_cards_in_http` | Delete it from the hot path |
| **F5** | Local Finder is not the fast path | 5.12 s vs 3.17 s; 20 vs 28 leads | Keep Maps as the primary zone engine |
| **F6** | Directory engines are the fast layer | 17 JustDial + 17 Maps leads within seconds | Keep priority 12, keep them parallel |
| **F7** | Lead rate is supply-bound, not speed-bound | 34 leads in Tenali vs 248+ in Vijayawada hospitals | Measure time-to-Nth-lead, not raw leads/s |
| **F8** | Per-zone cost is stable | ~5.5 s/zone at 2 slots, linear completion | ETA can be honest: `remaining × measured ÷ slots` |
| **F9** | Discovery and enrichment compete for the same browser | 8 enrichment workers outside the queue (`omniSearchOrchestrator.js:161`) + 2 zone slots = ~10 page loads on 8 cores | One shared browser budget, or defer enrichment until discovery drains |
| **F10** | Completed folders are left marked `running` | Vijayawada folder: `status:"running"`, `104/104`, **no `completedAt`**; Tenali folders identical | Final vault write is skipped by the never-shrink guard; fix in Phase 7 |
| **F11** | Folder delete is not list-symmetric and does not purge leads | list scans all non-master dirs; single delete checks two; batch delete stops at the first copy; response shape mismatches the client | One shared resolver + store purge; fix in Phase 7 |
| **F12** | The advertised worker cap is fiction | two concurrent runs: `maxWorkers: 3`, peak **11 active**, 191 pending | Phase 2 must budget **all** browser work, not just the queue |

---

## 4. What the first draft got wrong (and is now corrected)

| First-draft claim | Measured reality | Correction |
|---|---|---|
| "HTTP-first is throttled as a browser; unlocking it saves ~120 s of 183 s" | HTTP tier returns 0 leads on every query | **Drop this phase.** Remove the dead call instead |
| "Local Finder is the fast HTTP engine" | Local Finder is slower than Maps | **Do not route zones to Local Finder** |
| "Only 3 browser slots" | It is **2** on this machine (`freeRamPct < 20`) | The floor is worse than believed |
| "78-zone run in 25–35 s" | Physics: 78 × 5.5 ÷ 5 ≈ 86 s | **Target ~90 s** for the full grid, ~35 s for named zones |
| "Phase 4 pruning may reduce coverage" | Grid pruning is measurable: 3% of leads | Make it a **visible second pass**, not a silent skip |
| Carry-forward is implemented | **No backend code existed at audit time** (only UI badges and docs) | Rebuilt and shipped in Phase 6 |

---

## 5. Revised bottleneck ledger (measured cost)

Costs are for the clean Tenali run (88 zones, 222.8 s, 2 slots).

| # | Bottleneck | Evidence | Measured cost | Fix |
|---|---|---|---:|---|
| **1** | **Grid zones dominate runtime** | `universalGeoCluster.js:1012` builds 60 cells; 1 lead | **~145 s** | Two-pass ordering: named → grid |
| **2** | **Discovery + enrichment oversubscribe the browser** | `omniSearchOrchestrator.js:161` starts 8 enricher workers; `phoneBackfillService.js:650`; swarm adds 2–3 | **~3× per-zone slowdown** | One shared browser budget; defer enrichment |
| **3** | **Browser slots throttled to 2** | `queue.js:87-114`; `freeRamPct < 20` → `maxPlaywright = 2` | **~2.5–3× ceiling** | Cores-based budget, floor 3, ceiling 6 |
| **4** | **Dead HTTP tier per Local Finder zone** | `fastGoogleHttp.js:22-50`; `engine-google-serp-local.js:521-529` | 0.3–0.45 s/zone | Remove from hot path |
| **5** | **Fixed 1 s consent sleep** | `engine-google-places.js:637-643` | up to 1 s/zone | Condition wait, 400 ms cap |
| **6** | **Fixed 700 ms scroll tick** | `engine-google-places.js:1010` | 3.5 s/zone when scrollable | Wait for card-count change, 250 ms cap |
| **7** | **New browser context per zone** | `engine-google-places.js:610` | ~0.2–0.4 s/zone | Reuse 4 contexts, recycle every 25 zones |
| **8** | **Full-store snapshot every 300 ms** | `vendorStore.js:404-445` (`JSON.stringify` 3 MB + write + rename) | 20–50 ms per burst, blocks event loop | Debounce 2 s; snapshot on completion |
| **9** | **Synchronous journal append per lead** | `vendorStore.js:391-402` | 2–5 ms/lead | Batch every 50 leads / 100 ms |
| **10** | **SSE sends the full vendor to every client** | `index.js:91-105` | grows with clients | Batch + project + session filter |
| **11** | **Fake/pre-flight ETA** | `scrape.js:975` (`zones × 3`); `runEstimator.js:24` says Maps = 24 s/zone | lies by 3–4× | Use measured per-zone time |
| **12** | **`gridDensity` is ignored** | passed at `scrape.js:738`, never read in `omniSearchOrchestrator.js` | 0 s, but the UI cannot ask for fast mode | Wire it or delete it |

Rows 8–10 do not dominate a 34-lead run, but they stall the Node event loop and become dominant above ~1,000 leads — visible already in the Vijayawada hospitals run (377 leads in 136 s, 11.3 s/zone vs 5.5 s/zone in Tenali).

---

## 6. The plan — seven phases

Each speed phase ships alone, is measured before/after with `scratch/speed-bench.js`, and has a single env flag to disable it. **Phase 7 is a correctness phase** and is verified by its own gates in §7, not by a speed number.

### Phase 0 — Freeze the baseline (half a day, zero behaviour change)

1. Commit the current working tree as `pre-speed` (220 files, 25,788 insertions vs `b816981`).
2. Add the four probes from §1 to the repo (they are already written in `scratch/`).
3. Record the two baseline numbers: **Tenali 222.8 s / 34 leads**, **Vijayawada hospitals** (see §2.5).
4. Freeze the invariant list in §7 as a script.

**Output:** a repeatable number. No code path changes.

---

### Phase 1 — Two-pass zone order (the biggest win, low risk)

**Change:** in `omniSearchOrchestrator.js`, split `zones` into two ordered lists before dispatch:

```
pass 1: coverageKind === 'locality' || 'vector'   (28 zones, 97% of leads)
pass 2: coverageKind === 'grid'                    (60 zones, 3% of leads)
```

Dispatch pass 1 at priority 10, pass 2 at priority **4** (below directory engines and below every named zone). Pass 2 is automatically skipped if the user presses Stop.

Expose it in the search console as a real control:

```
Coverage:  ● Fast   ○ Deep
           Fast  = every named locality in Tenali   (~35 s)
           Deep  = fast + 60 grid cells              (~110 s)
```

Wire the existing-but-unused `gridDensity` parameter (`scrape.js:619`, `omniSearchOrchestrator.js:58`) to this choice instead of adding a new one.

**Why safe:** every zone is still queued. Nothing is dropped. The only change is the order, and the user can see both passes in the zone board. If pass 2 never runs (Stop, crash), it is recorded as `deferred`, not as `empty`.

**Projected:** 97% of leads in **~35 s** (6.4× faster to that point); full grid **~110 s** (2×).

**Risk:** Low. No lead can be lost; ordering is not filtering.

**Shipped (2026-11-08).** `omniSearchOrchestrator.js` now derives `coverageMode` from `gridDensity`, splits named vs grid zones, dispatches named first (priority 10) and grid later (priority 4), and records deferred grid cells in folder metadata. Resume keeps the folder's original mode. The search console exposes **⚡ Fast · named areas** / **🗺️ Deep · full grid**, default Fast.

Measured on Tenali dentists (`scratch/speed-bench.js`):

| Mode | Active zones | Duration | Leads | Mobiles | First lead | 25th lead | Job count shown |
|---|---|---|---|---|---|---|---|
| Fast | 28 named (60 deferred) | **73.5 s** | 40 | 80% | 6.3 s | 12.6 s | 28/28 |
| Deep | 88 (28 named + 60 grid) | **186 s** | 38 | 79% | 6.2 s | 12.8 s | 88/88 |

The fast pass keeps the same lead set (40 vs 38; both above the 34-lead baseline) and finishes **2.5× sooner** than the old 223 s single-pass run. Deferred cells are visible in the folder as `deferredZones`, never counted as empty or complete.

---

### Phase 2 — One browser budget for discovery + enrichment

The run is not short of browser capacity; it is **oversubscribed**. `omniSearchOrchestrator.js:161` starts the real-time enricher with `concurrency: 8` (client) / `10` (master), and those workers open Maps detail pages outside the queue. Add the 2 zone slots and a client run is driving ~10 page loads on 8 cores.

**Change A — unify the budget.** Replace `getDynamicConcurrency()` (`queue.js:87-114`) with one deterministic budget that both the queue and the enricher read:

```js
browserBudget = clamp(3, Math.floor(cores / 1.5), 6)   // 8 cores -> 5
discoverySlots = browserBudget - enrichmentReserve      // reserve 2 while discovering
enrichmentSlots = enrichmentReserve
httpSlots      = clamp(8, cores * 2, 16)
```

**Change B — phase the reserve.** While the zone queue is non-empty: discovery gets `browserBudget - 2`, enrichment gets 2. When the queue drains: discovery 0, enrichment gets the whole budget. This keeps phones flowing without starving discovery.

**Change C — emergency brake.** Keep the RAM check only as a hard floor: if free memory drops below the floor, shed one enrichment worker (never a discovery slot, never below 2). Re-read every 5 s, never mid-job. Add a 90 s per-page watchdog that returns the slot.

**Why safe:** the floor is 3, so a low-RAM laptop behaves like today. The measured test shows 8 contexts fit (free RAM moved only 108 MB). Five is deliberately conservative. Final mobile % is unchanged because enrichment still runs — it just stops competing with discovery.

**Projected:** 2 → 5 discovery slots **and** removal of the ~3× enrichment contention: full grid **~90–100 s**, fast pass **~25–30 s**.

**Risk:** Medium-low. More concurrency can trigger Google throttling; the existing `serpBreaker` and per-engine health breaker already react. Mitigation: `SCRAPER_SPEED_P2=0` restores today's heuristic and today's enricher concurrency.

**Shipped (2026-11-08), with one deliberate change to the design above.** The reserve is **opportunistic, not a permanent tax**. A fixed 5−2 split would have left two slots idle whenever the enricher had nothing to do, which is most of a fast run. The shipped rule is:

```js
totalSlots      = 5        // SCRAPER_BROWSER_SLOTS
enrichReserve   = 2        // SCRAPER_ENRICH_RESERVE
discoveryLimit  = totalSlots - enrichmentActive
enrichmentLimit = min(enrichReserve, totalSlots - discoveryActive - enrichmentActive)
```

So discovery still gets all five slots when enrichment is idle, and enrichment takes a slot only when one is genuinely free. Enrichment waits and retries every 500 ms instead of opening a sixth page.

> **Superseded in Phase 3:** measurement showed that even an opportunistic reserve costs real time (it holds 2 slots whenever the enricher has work, which is most of a fast run). The shipped rule is now **discovery-first** — `enrichmentLimit()` returns 0 while any browser discovery job is queued. See the Phase 3 shipped block for the 55.1 s vs 41.7–47.0 s comparison. `SCRAPER_ENRICH_YIELD=0` restores the opportunistic reserve described here.

New `server/src/utils/browserBudget.js` is the single source of truth. `queue.js` reports `maxPlaywrightConcurrency = discoveryLimit()` and updates `discoveryActive` on every Playwright job start/finish; `/api/scrape/engines/status` now exposes the whole budget. `phoneBackfillService.js` caps the streaming enricher at 2, pumps only on a free slot, and unsubscribes on `stop()`. The orchestrator passes `concurrency: 2` for both client and master.

The Windows RAM heuristic no longer throttles to 2 at `freeRamPct < 20` (this machine idles at 21%, so it was throttling a healthy machine). It now sheds slots only when free memory is **truly** critical: under 1.5 GB or under 8%.

Not shipped from the sketch above: the 90 s per-page watchdog and the 5 s RAM re-read. They are folded into Phase 3, where per-zone latency is the subject.

**Measured** (Tenali dentists, `scratch/speed-bench.js`, fast coverage, two consecutive runs):

| Run | Duration | Leads | Mobiles | First lead | 25th lead | Peak browsers | Discovery / enrichment |
|---|---|---|---|---|---|---|---|
| P1 baseline | 73.5 s | 40 | 80% | 6.3 s | 12.6 s | not instrumented | 8 / 10 nominal |
| P2 run A | **69.0 s** | 37 | 81% | 14.7 s* | 14.7 s* | **5 / 5** | 5 / 2 |
| P2 run B | **68.9 s** | 39 | **85%** | 2.1 s | 12.4 s | **5 / 5** | 5 / 2 |

\*Run A's first batch was JustDial's HTTP response landing late; the bench samples vendors every 6 s, so a late batch is reported as one arrival. Run B shows the same pipeline at 2.1 s. This is network variance in the directory engine, not a budget effect.

**What this proves:** the browser budget is real and enforced — total Chromium pages never exceeded 5 in either run, while enrichment held its 2-worker reserve. Mobile % did not fall (81–85% vs 80%), so enrichment was not starved. Duration improved modestly (73.5 → 69 s), which confirms the remaining cost is **per-zone page time, not slot starvation**: 28 zones over 5 slots is 5.6 waves, and 69 s / 5.6 ≈ 12.3 s per zone. Phase 3 targets exactly that number.

**Kill switch:** `SCRAPER_BROWSER_SLOTS=2` restores the old effective concurrency without a code change; `SCRAPER_ENRICH_RESERVE=0` disables the enrichment reserve; `SCRAPER_ENRICH_YIELD=0` restores the opportunistic reserve (see Phase 3).

---

### Phase 3 — Remove self-inflicted per-zone latency

**Change:**

| Location | Today | After |
|---|---|---|
| `engine-google-serp-local.js:521-529` | HTTP tier, 300–450 ms, always fails | Delete the call; log once per run if it is ever re-enabled |
| `engine-google-places.js:637-643` | `waitForTimeout(1000)` after consent | `waitForSelector(feed, 400 ms)` |
| `engine-google-places.js:1010` | `waitForTimeout(700)` per scroll | `waitForFunction(card count changed, 250 ms)` |
| `engine-google-places.js:1019` | separate `locator(...).count()` per tick | fold into the same `evaluate` |
| `engine-google-places.js:610` | `newContext` per zone | 4-context pool, recycle every 25 zones |
| all engines | default 30 s selector timeout | `page.setDefaultTimeout(8000)` |

**Projected:** Maps zone 5.5 s → **~3.5 s**; full grid another ~30%.

**Risk:** Medium-low. Every condition wait has a cap equal to today's fixed sleep, so worst case is never slower than today. `SCRAPER_SPEED_P3=0` restores the fixed waits.

#### Shipped (2026-11-08) — and one part of the sketch that measurement rejected

Four of the five changes shipped. The fifth (`domcontentloaded`) was implemented, measured, and **reverted** because it made the zone slower, not faster.

| Change | Status | Result |
|---|---|---|
| Zone context pool | **shipped** | 6 contexts, recycled after 25 uses (`SCRAPER_CONTEXT_POOL`, `SCRAPER_CONTEXT_USES`) |
| Sequential pool warm-up before the first wave | **shipped** | 6 contexts in **108 ms** (five parallel cold contexts cost ~5 s) |
| `waitUntil: 'domcontentloaded'` | **rejected** | goto −1.3 s but feed-wait +2.5 s → **+1.2 s net per zone** |
| 1 s post-consent sleep | **shipped (removed)** | replaced by a capped `waitForSelector` |
| 700 ms per-scroll fixed wait | **shipped (removed)** | replaced by a card-count/`scrollHeight` condition capped at 700 ms |
| 30 s default selector timeout | **shipped** | `page.setDefaultTimeout(8000)` |
| Delete the dead Local Finder HTTP tier | **not shipped** | the tier still returns leads on some queries in this tree; deleting it would be a coverage change, not a latency one. Left intact. |
| Per-zone timing marks | **shipped** | `SCRAPER_TRACE_ZONE=1` emits `[Zone Timing]` context+page / goto / feed-wait / card-extract / persist |

**Enrichment policy changed again — discovery-first.** Phase 2's opportunistic reserve was measured against no reserve at all on the same code:

| Policy | Duration | Leads | Mobiles | Discovery / enrichment |
|---|---|---|---|---|
| Opportunistic reserve 2 | 55.1 s | 39 | 79% | 5 / 2 |
| No reserve (`SCRAPER_ENRICH_RESERVE=0`) | 45.7 s | 42 | 81% | 5 / 0 |
| **Discovery-first (shipped)** | **47.0 s**, **41.7 s** | **44**, **44** | **80%**, **80%** | 5 / 2 late |

Holding two slots for the enricher cost **9.4 s** and did not change final mobile coverage. The shipped rule in `browserBudget.js` is therefore:

```js
enrichmentLimit() = discoveryQueued > 0 ? 0
                  : min(enrichReserve, totalSlots - discoveryActive - enrichmentActive)
```

`queue.js` publishes `discoveryQueued` (browser jobs still waiting) on every add, start, finish and drain; `phoneBackfillService.js` already pumps on every slot change, so enrichment starts the moment the queue empties and stops competing while zones remain. `/api/scrape/engines/status` reports `enrichYields` and `discoveryQueued` alongside the rest of the budget.

**Measured ladder** (Tenali dentists, fast coverage, 28 named zones, `scratch/speed-bench.js`):

| Step | Duration | Leads | Mobiles |
|---|---|---|---|
| P2 baseline (reserve 2) | 68.9–69.0 s | 37–39 | 81–85% |
| P3 pool, `domcontentloaded`, reserve 0 | 50.2 s | 38 | 82% |
| P3 pool, `load`, warm pool, reserve 0 | 45.7 s | 42 | 81% |
| **P3 final (discovery-first)** | **47.0 s / 41.7 s** | **44 / 44** | **80% / 80%** |

**What this proves:** per-zone context creation was a real self-inflicted cost (5.5 s → 0.3–1.2 s) and the warm pool removed the cold-start spike. The remaining floor is Google-side: `goto(load)` 0.75–3.5 s plus feed-wait 0.75–2.0 s ≈ **2.5–4 s per zone**. Further gains need **fewer or overlapping navigations** (Phase 4/6), not more wait removal. The vault for the final run confirms nothing was dropped: `coverageMode: fast`, `totalZones: 28`, `completedZones: 28`, `deferredZones: 60`.

**Kill switches:** `SCRAPER_CONTEXT_POOL`, `SCRAPER_CONTEXT_USES`, `SCRAPER_ENRICH_YIELD=0` (restores the Phase 2 reserve), `SCRAPER_TRACE_ZONE=1` (timing only).

---

### Phase 4 — Stop the event loop from stalling

**Change (`vendorStore.js`, `index.js`):**

- Batch journal appends: flush every 50 leads or 100 ms, still `appendFileSync` as the primitive.
- Snapshot debounce 300 ms → 2,000 ms; force a snapshot on run completion, Stop, and `SIGINT`.
- Snapshot only when the lead count or an `updatedAt` changed.
- SSE: batch vendor events every 100 ms, send a compact projection (`id, name, phone, city, zone, source`), filter by `sessionId`.
- Implement `/api/scrape/stream/:sessionId` (`scrape.js:1536`) instead of the heartbeat stub.

**Projected:** 10–20% at current volume; removes the cliff at 1,000+ leads.

**Risk:** Low. Crash safety is unchanged: the journal is still append-only and replayed on boot.

#### Shipped (2026-11-08)

| Change | Where | Result |
|---|---|---|
| Journal appends batched (50 entries or 100 ms) | `vendorStore.js` | one `appendFileSync` per burst instead of one per lead |
| Snapshot debounce 300 ms → 2,000 ms | `vendorStore.js` | far fewer full-store serialise + rename cycles during a run |
| Snapshot skipped when nothing changed (`dirty` flag) | `vendorStore.js` | idle engine never rewrites the store |
| Forced flush on completion, Stop, `SIGINT`, `SIGTERM`, `exit` | `index.js`, existing `flushSync()` call sites | final state always on disk |
| Vendor SSE batched every 100 ms, one write per client | `index.js` | a 5-zone burst no longer does hundreds of socket writes in one tick |
| Session-filtered stream implemented | `index.js` → `/api/scrape/stream/:sessionId` | replaces the heartbeat-only stub; verified 11 frames, **0** wrong-session frames |

The vendor wire format is unchanged (`event: vendor`), so no client or master change was needed. The batching is a coalescing layer, not a new protocol.

**Crash-safety test (deliberate):** started a Vijayawada run, force-killed the engine after 12 s with `Stop-Process -Force`. At kill time the snapshot held 46 rows and the journal held **130 lines**. On restart the store loaded **98 leads** (46 + 52 recovered), the queue resumed the 20 pending zone jobs, and the next snapshot settled at 134 rows. Nothing older than the 100 ms flush window was lost.

**Measured:** P4 run = **45.1 s**, 39 leads, 79% mobile — inside the P3 range (41.7–47.0 s). At ~40 leads the store was never the bottleneck, exactly as the plan predicted; the win is the removal of the per-lead blocking write and the 1,000+ lead cliff. The honest claim is "no regression, structurally cheaper", not "10–20% faster at this volume".

**Kill switches:** none needed; the batching window is a constant. `flushJournal()` is exported for tests and shutdown paths.

---

### Phase 5 — Honest ETA and the live instrument panel

**Change (server):**

- Replace `scrape.js:975` (`zones × 3`) and `omniSearchOrchestrator.js:600` (`zones × 12000`) with the measured model: `remaining × measured_per_zone ÷ live_slots`.
- Fix `runEstimator.js` Maps budget from **24 s/zone to 5.5 s/zone** (measured), and Local Finder from 7 s to 5.2 s.
- Expose `queue.browserSlots`, `httpSlots`, `activeWorkers`, `pendingJobs` on `/api/scrape/engines/status` (already partly there).

**Change (client + master, using the existing `src/ui3d` kit, no new dependency, no mascots):**

| Element | Behaviour |
|---|---|
| **Throughput gauge** | Rolling 10 s leads/s, brass needle, 500 ms updates |
| **Zone board** | One row per zone: `queued / running / done / deferred / failed`, elapsed, engine, leads. Virtualised for 700+ rows |
| **Two-pass indicator** | "Named areas 28/28 ✓ · Grid 12/60 running · 48 deferred" |
| **Honest ETA** | Replaced model above, recomputed every 2 s |
| **Engine split** | "Maps 80 · JustDial 17 · SERP 2" — explains where the leads came from |
| **SignalOrb** | cyan idle, mint live, brass complete, red failed |

Every number gets a one-line `Hint` (per `PLAN-3D-EXPERIENCE.md` §3.6).

**Risk:** Low. Read-only server changes plus UI.

#### Shipped (2026-11-08)

**One model, three call sites.** New `server/src/utils/etaModel.js` is the only place a per-zone budget lives:

| Constant | Value | Basis |
|---|---|---|
| `MAPS_SECONDS_PER_ZONE` | **6 s** | 28 zones in 41.7–47.0 s at 5 slots (P3/P4), i.e. ~1.3 s wall clock per zone × 5 slots |
| `LOCAL_FINDER_SECONDS_PER_ZONE` | **5.2 s** | local-finder path skips the Maps feed |
| `modelEtaMs(remaining, slots, perZone)` | `remaining × perZone × 1000 ÷ slots` | wall-clock estimate, concurrency-aware |
| `liveBrowserSlots(metrics)` | budget `discoveryLimit` → `totalSlots` → `maxWorkers` → 5 | a 2-slot machine now gets a ~2.5× longer ETA instead of a number that assumes 5 |
| `safetyWindowMs(zones, slots, perZone)` | `max(120 s, model × 4 + 60 s)` | a wedged-run guard, never a healthy-run trim (96 zones @5 = 521 s) |

Replaced estimates:

| Surface | Before | After |
|---|---|---|
| Orchestrator start | `zones × 6000` (28 → 2 m 48 s) | `modelEtaMs` (28 @5 → **34 s**) |
| Orchestrator initial SSE | `zones × 6000` | same model |
| Orchestrator live loop | measured `elapsed / completedZones` from the **first** completion, else `max(5000, zones × 6000)` | measured after **≥3** completions, else the model (one early completion can no longer produce a 2-minute ETA) |
| Scrape safety window | `zones × 12000` (28 → 5.6 min) | `safetyWindowMs` |
| Master-sweep preview | `zones × 3 s` | model; now returns `estimatedSeconds` and an `etaModel` block (`secondsPerZone`, `liveSlots`, note) |
| `runEstimator.js` | Maps 24 s, local finder 7 s, first lead 11 s / 4 s | Maps **6 s**, local finder **5.2 s**, first lead **3 s** |

**A truthfulness bug found while verifying.** `/api/scrape/active` returned `completedMandals: 0/28` for the entire run (the progress SSE was correct). The orchestrator wrote the session snapshot once at start and never updated it, so anything that reconnected saw a frozen run. The live loop now writes `completedMandals`, `overallCompletedMandals`, `completedZones`, `activeMandal`, `eta` and `etaText` on every tick.

A second leak in the same route: the old selector picked the first session with `completed < total` regardless of `finished`/`status`, so a stale in-memory session could be returned while a different run was live — and its frozen ETA appeared in the panel. The route now prefers the newest `sessionActive && !finished` session and only falls back to the newest session when idle.

**Instrument panel (client + master, identical files, MD5-verified).** `src/v2/components/InstrumentPanel.jsx` + `instrument.css`, mounted after the live run strip in both `CommandCenter.jsx`:

| Element | Shipped behaviour |
|---|---|
| Throughput gauge | brass needle, rolling 10 s leads/min, 500 ms tick, data poll 2 s |
| Two-pass coverage | named / grid / deferred counts + completed-zone progress bar |
| Engine split | live browser slots, HTTP slots, queued jobs, enrichment active |
| Zone board | one row per zone, virtualised 9-row window, `queued / running / completed / deferred / failed` dots, NAMED/GRID tag |
| Honest ETA | server model, shown in the header |
| SignalOrb | mint while live; the panel returns `null` when the run ends |

**Measured:**

| Check | Result |
|---|---|
| Model arithmetic | 28 zones @5 = **34 s**, 96 @5 = 115 s, 28 @2 = 84 s, safety 96@5 = 521 s |
| Live ETA, 28-zone fast run | **34 s at 1 s** (model 33.6 s), then follows completions; final run **39 s** |
| Live zone snapshot | `0 → 2 → 4 → 5 → 8 → 10 → 11 / 28` on `/api/scrape/active` (was `0/28` for the whole run) |
| Master preview, Guntur district | 19 zones → `estimatedSeconds: 23`, `estimatedMinutes: 1`, `liveSlots: 5` |
| `/api/scrape/engines/status` | `browserSlots: 5`, `httpSlots: 8`, `browserActive: 0`, `httpActive: 0` at idle |
| Builds | client and master `npm run build` both pass |
| Dev-gallery render | `/lab` shows the panel with 4 cards and a 12-row virtual window; **0 console errors**. This check found and fixed a real crash: `zone.engines` is an array on some plans, and the row renderer called `.split()` on it, taking the dashboard down through the error boundary. `engineLabel()` now accepts a string or an array. The zone-row grid was also widened so `LOCAL_FINDER` and `COMPLETED` cannot collide. |

**Not shipped from the sketch above:** the panel does not show a per-source lead split (Maps / JustDial / SERP counts) or per-zone elapsed/lead counts — those need an extra aggregation surface, and the engine split currently reports browser vs HTTP capacity, which is the number that explains speed. The zone board shows status, pass and engine only.

**Kill switches:** none needed. The model is read-only; the panel is display-only and absent when no run is live.

---

### Phase 6 — Cache and repeat-search pre-fill

**Change:**

- Before queueing a named zone, check the store for verified leads in the same zone + category from the last 24 h. If the zone has ≥ 3, queue it at the lowest priority.
- Add an in-memory LRU for the (currently dead) HTTP fetch, so if Google ever restores server-rendered local packs we get it free.
- **Rebuild carry-forward properly.** It does not exist in the current tree: `omniSearchOrchestrator.js:892` declares `let carriedForward = null` and never assigns it, while both UIs still render `CarriedBadge`. Re-implement it exactly as specified in `FIX-PLAN-GODLEVEL.md` §13: `carriedForward: true`, `carriedFrom` provenance, strict containment + fidelity, no re-charging, `metadata.carriedForward` summary.

**Projected:** repeat searches in a covered area return in **2–5 s**.

**Risk:** Low. Provenance and credit rules are untouched.

#### Shipped (2026-11-09)

All three parts shipped, plus one correctness fix the measurement exposed.

| Change | File | Behaviour |
|---|---|---|
| Carry-forward service | `server/src/services/carryForwardService.js` | Reads the append-only live store; keeps only same-city rows with a strong category signal (`hasStrongCategorySignal`), client containment (`isListingRelevantToQuery`, `scope: 'city'`) and the run's final radius. Dedupes by id, Maps identity, validated mobile and name+city. Clones rows with `carriedForward: true` and `carriedFrom { sessionId, sessionIds, scrapedAt, addedAt, reason }`. Never upserts, never charges, never rewrites session ids. Master sweeps and aborted runs are skipped. |
| Insertion point | `omniSearchOrchestrator.js` | After contact filtering, before quality scoring and folder persistence. `metadata.carriedForward = { count, fromSessions }`. Carried rows are excluded from taxonomy learning and deep enrichment. |
| Repeat-zone ordering | `carryForwardService.findRepeatCoveredZones()` | Named zones that produced ≥3 validated-mobile leads for the same category in the last 24 h queue at priority 2 (named 10, grid 4). Coverage is unchanged; the zone still runs. |
| HTTP LRU/TTL | `server/src/utils/fastGoogleHttp.js` | 200 entries / 10 minutes, key = query + page index. Only successful, non-empty, non-fallback payloads are cached. Stats exposed as `httpCache` on `/api/scrape/engines/status`. |
| Folder guard | `sessionVaultService.js` | The "never shrink" final write now unions the previous snapshot with the final list instead of keeping only the larger one. Without this, a live snapshot taken before carry-forward discarded every carried row. |

**Measured repeat run (Vijayawada dentists, Fast):** 53 s, 175 folder leads (163 phones), **17 carried** from 2 earlier sessions, 15 of 31 named zones queued last, 65 grid zones deferred, coverage unchanged. Provenance check: 0 carried rows had their session id rewritten, 0 were outside Vijayawada, and the folder had 175 unique ids. The run still performs the live sweep, so the old **2–5 s repeat-search projection was not achieved and is withdrawn**: skipping the sweep would break coverage-first and freshness. Carry-forward is additive (it pre-fills leads the sweep missed), and repeat-zone ordering moves fresh ground ahead of already-covered zones.

**Honest limits:**
- Carry-forward reads the live store only. Historical folder-only rows (for example the older Tenali bench folders) are not scanned, so a repeat search only benefits from rows still present in the store.
- A carried row is a folder row. It is not emitted as a live vendor event and it does not appear in `/api/vendors?sessionId=...`; the folder (which the Cockpit loads) is the source of truth.

#### Recovery note (2026-11-09)

The live store held **596 ids** while the session folders held **640**; **44 Tenali dentist ids** existed only in the ten `bench_mw*` folders. No store backup existed, so those rows could not be replayed from the journal. With the engine stopped (the recovery process must own `data/.store.lock`), a one-off script read every folder under `server/db/user_sessions/**`, kept rows whose `id` was absent from `vendorStore.all()`, and called `vendorStore.upsertMany()` + `flushNow()`. It deliberately bypassed `dbAdapter.saveVendor`, so no credits were charged and no session ids were rewritten.

- **43 rows added** (store 596 → 639); **1 row merged** by validated mobile into an existing Tenali Partha Dental row, so no lead was lost.
- A repeat Tenali dentists run afterwards carried rows from `bench_mw74rg6u` and `bench_mw73gj5t`, proving carry-forward now reads the recovered data.
- Rows whose name marks a different role (homeopathy, ENT, speech/hearing, eye clinic) or a generic name are still refused by `hasStrongCategorySignal`; recovery restores the stored row, it does not make a non-dentist carry into a dentist search.

---

### Phase 7 — Folder lifecycle + truthful run state (correctness; independent of speed)

**Why it is in this plan:** you reported two visible defects — folder delete does not stick, and a completed run shows **"SWARM PAUSED / STOPPED"**. Both are reproduced in the current tree and both are self-inflicted state bugs, not scraper behaviour. They can ship before any speed phase.

**Evidence read from this machine:**

| Observation | Value |
|---|---|
| Completed Vijayawada folder | `metadata.status: "running"`, `completedZones: 104/104`, **no `completedAt`**, no `zoneYield`, no `phoneBackfill` |
| Completed Tenali folders | same: `running 88/88`, no `completedAt` |
| Same session id on disk | `anonymous/cmd_mw6w5kiu.json` **and** `usr_awr6zku_mvwhmz02/cmd_mw6w5kiu.json` |
| Client list scope | scans **every** non-master subdirectory (`sessionRoutes.js:638-646`) |
| Single delete scope | only `getUserDir(userId)` + `getUserDir('anonymous')` (`sessionRoutes.js:1111-1114`) |
| Batch delete scope | every directory, but `break`s after the first copy (`sessionRoutes.js:936-945`) |
| Batch delete response | server returns `{success, count}` (`:948`); client reads `res.deleted` (`CommandCenter.jsx:1220`) → UI never updates |

#### Root cause A — completed folders keep `status: "running"`

`persistSessionVault` writes a live snapshot with `status:'running'` every few zones (`omniSearchOrchestrator.js:674-698`). The final write sets `status:'completed'` (`:1033-1062`), but `sessionVaultService.js:118-125` refuses to overwrite a folder when the previous count is higher ("never shrink"). Final dedupe usually removes a few duplicates, so `previousCount > finalCount` and the **entire terminal write is skipped** — including `status`, `completedAt`, `zoneYield` and `phoneBackfill`. The folder therefore looks permanently mid-run.

**Fix:**

- Add `final: true` to the completion and abort writes.
- When the never-shrink guard trips on a final write, **keep the larger lead list but merge the terminal metadata** into the existing file (`status`, `completedAt`/`abortedAt`, `completedZones`, `completedZoneIndices/Names`, `zoneYield`, `phoneBackfill`, `elapsedTimeSec`).
- Never let a later `status:'running'` write downgrade a folder already marked `completed`/`aborted`/`failed`.
- One-off repair for existing folders: if `completedZones === totalZones && status === 'running'`, finalize to `completed` with `completedAt` from file mtime.

#### Root cause B — delete is not list-symmetric

The list shows a folder from any non-master directory, but single delete only looks in two. Every vault is dual-written to `anonymous` **and** the user directory, so deleting one copy leaves the other and the next refresh re-shows the folder. Batch delete stops at the first copy, and its success shape does not match what the client reads.

**Fix:**

- One shared `resolveSessionFiles(sessionId, { scope })` helper used by **list, get, single delete and batch delete**. It returns every existing copy in exactly the directories the caller is allowed to see (master: all; client: own + anonymous + the non-master dirs the list already exposes).
- Delete **all** copies, clear `sessionHeaderCache` for each path, and return `{ success, deleted: [ids], missing: [ids], leadsRemoved, engagedKept }`.
- Single and batch delete call the same helper, so they cannot drift again.
- Client uses `res.deleted` (not `count`) and re-fetches the list from the server instead of only filtering local state. If nothing was deleted, show "Folder was already removed" and refresh — never a false success toast.

#### Root cause B2 — rename, merge and batch delete have the same copy/scope bugs

| Operation | Bug |
|---|---|
| Rename (`sessionRoutes.js:773-789`) | updates only the **first** copy and returns; the duplicate keeps the old name, so the folder can revert after refresh |
| Merge (`:818-830`) | writes the merged folder only to `anonymous`, and its directory scan includes `master` even for a client request |
| Batch delete (`:924-933`) | scans **all** directories including `master`, so a client request can remove a master sweep folder |
| Merge dedupe (`:845-849`) | identifies a lead by "last 10 digits" instead of the phone parser; a shared landline or an id collision can merge two different businesses |

**Fix:** the shared `resolveSessionFiles` helper also powers rename and merge. Rename updates **every** copy. Client-scope operations exclude `master`. Merge dedupe uses `normalizePhone`/`parseIndianPhone` identity with an id fallback.

#### Root cause C — deleting a folder does not delete its leads

The vault file is only a snapshot; the live store (`data/scraped_vendors.json`) still holds every row tagged with that `sessionId`, so the vendor table keeps showing them and the folder looks "not deleted".

**Fix (respecting the existing retention policy):**

- On folder delete, remove rows where `sessionId`, `lastSessionId` or `sessionIds[]` match, **except CRM-engaged rows** (`leadRetention.isEngaged`), which are kept and reported as `engagedKept`.
- Remove the matching deep-profile artifacts (`leadRetention.removeDeepProfile`), then `dbAdapter.flushSync()`.
- Return `leadsRemoved` and `engagedKept` so the toast is exact: *"Folder deleted · 476 leads removed · 3 engaged leads kept."*

#### Root cause D — deleting a running folder orphans the run

`activeSessions` is not checked. Deleting a live folder removes the file, but the orchestrator writes it back at the next sync.

**Fix:** if the session is `running`/`stopping` in `activeSessions`, return **409** with *"Stop the swarm before deleting this folder."* Cancel queued jobs and deep jobs for that session before removal.

#### Root cause E — the false pause banner

Three independent bugs combine:

1. `refresh()` marks **the newest folder** as interrupted whenever `completedZones < totalZones` (`CommandCenter.jsx:365-386`), without checking whether that session is actually live. Opening the app mid-run, or while an old partial folder is newest, sets `run.status = 'aborted'`.
2. The `progress` SSE handler marks the current run aborted on **any** `sessionActive:false` event with `completedMandals < totalMandals` (`:636-650`) **without checking `data.sessionId`**. SSE is broadcast to every client (`index.js:95-97`), so another session's completion can abort the run on screen.
3. The banner mixes the stale `run` object with live `progress` and a frozen `runLeadCount` (`:2073-2084`), which is why it said **280 leads across 104/104 zones** while the folder actually held **476**.

**Fix:**

- Every progress branch ignores events whose `sessionId` is not the current run's id.
- Only mark `aborted` when the server explicitly says `aborted`/`failed`, or when the session is **not** active and `completedZones < totalZones`.
- `refresh()` consults `/api/scrape/active` (or `/jobs`) first; it never guesses "interrupted" for a live session.
- Banner renders only when `!scanning` **and** the run is terminal-abnormal **and** `runDone < runTotal`. A completed folder (104/104) can never show it.
- Use the folder's authoritative `leadCount` after the run; `runLeadCount` is only a live counter.
- After `finishRun`, hydrate the run from the refreshed folder so status, counts and zones match disk.

**Files touched:** `server/src/services/sessionVaultService.js`, `server/src/services/omniSearchOrchestrator.js`, `server/src/routes/sessionRoutes.js`, `server/src/services/leadRetention.js` (reuse), `client/src/v2/CommandCenter.jsx`, `client/src/v2/api.js`, `master/src/v2/CommandCenter.jsx`, `master/src/v2/api.js`.

**Tests / gates:**

1. Complete a run → reload → folder reads `completed`; no banner.
2. Reload the app mid-run → no pause banner; live progress continues.
3. Two searches at once → completion of one never marks the other aborted.
4. Delete a folder with copies in two directories → gone after a hard refresh, in both client and master lists.
5. Rename a folder with copies in two directories → the new name survives a hard refresh.
6. Merge two folders → the merged folder survives a hard refresh; no master folder is visible to a client.
7. Delete a folder → its non-engaged leads leave the vendor table; engaged leads stay; the toast reports both counts.
8. Delete while running → 409 with a clear message; the folder remains until Stop.
9. Batch delete → the UI removes exactly the returned `deleted` ids and re-syncs from the server.

**Risk:** Low. No scraper engine or zone logic is touched. Delete is the only destructive path, and it keeps the existing engaged-lead protection.

---

## 7. Accuracy and invariant gates

A phase is accepted only if **all** of these hold on the two fixed queries:

1. Lead count ≥ baseline (no loss)
2. Mobile % within ±1 point
3. Zero containment failures (`data/out_of_bounds.json` unchanged)
4. Zero duplicate rows in the folder
5. Export row count matches folder ±2
6. Credits charged = leads found
7. Two concurrent sessions both complete (verified: 97/97 zones each, **0** foreign rows)
8. STOP clears the queue in ≤ 3 s and preserves the folder
9. A completed run reloads as `completed` with `completedAt`; no recovery banner
10. Folder delete is list-symmetric: every copy gone after refresh; non-engaged leads purged; engaged leads kept
11. Concurrent sessions never change each other's UI state
12. Folder rename/merge survive a refresh; client scope never reads or writes master folders

Run `server/src/utils/benchmarkScraperFidelity.js` after every phase. It already checks yield, telecom conversion, category fidelity, spatial mesh and quality tiers.

**Parallel-scraping invariants** (unchanged, re-tested after each phase): multi-session concurrency, per-zone isolation, no duplicate charging, containment, dedupe, abort, resume, credit gate.

---

## 8. Master sweeps

Measured preview: **Guntur district = 19 zones** (18 mandals + HQ), 219 villages available for deep mode. At the current 2 slots × 5.5 s ≈ **52 s**; at 5 slots ≈ **21 s**. Deep mode (238 zones) ≈ **4.5 min → 1.8 min**.

The same two-pass rule applies, but master sweeps keep the grid because coverage is the point. Master gets `+1` browser slot (it is the only workspace that runs 200–1,200-zone sweeps) and keeps `MASTER_SWEEP_INTELLIGENCE.md` §2 intact: **a bounded priority queue, never one worker per zone.**

---

## 9. Reconciliation with the current tree (things the old plan assumed wrongly)

| Item | Reality in the working tree | Action |
|---|---|---|
| Carry-forward backend | **Absent at audit time** — only the UI badge remained (`leadHelpers.jsx:47`) | Shipped in Phase 6 (`carryForwardService.js`) |
| `gridDensity` | Passed by the API, **never read** | Wire it to Fast/Deep in Phase 1 |
| `runEstimator` | Only used by `deepProfile.js`, not the search UI | Use it for the pre-flight card in Phase 5 |
| Maps budget | 24 s/zone in `runEstimator.js:25` | Measured 5.5 s/zone — fix |
| Store size | 919 → 926 → growing; last audit said 4,901 | **Still needs your confirmation** (see §11) |
| Local Finder | Never runs in client city runs (Maps wins the `if`) | Keep as a fallback only |
| Grid zones | New since the last baseline; old vaults have none | Two-pass in Phase 1 |

---

## 10. Sequencing

| Order | Phase | Duration | Cumulative (Tenali, 88 zones) | 97%-of-leads time |
|---|---|---|---:|---:|
| 0 | **P7 Folder lifecycle + run state** | 0.5–1 day | independent — can ship first | — |
| 1 | P0 Baseline + probes | 0.5 day | 222.8 s | 222.8 s |
| 2 | P1 Two-pass order | 1 day | ~110 s | **~35 s** |
| 3 | P2 One browser budget | 1 day | ~85 s | **~28 s** |
| 4 | P3 Remove per-zone latency | 1.5 days | ~65 s | ~22 s |
| 5 | P4 Store + SSE | 1 day | ~60 s + no stall cliff | ~22 s |
| 6 | P5 ETA + instrument panel | 2 days | — | — |
| 7 | P6 Cache + carry-forward rebuild | 1 day | repeat runs 2–5 s | 2–5 s |

**Phases 1 and 2 alone deliver the visible win and can ship in two days.** I will stop after each phase, post the before/after table, and wait for your go-ahead.

---

## 11. What I need from you

1. **Fast/Deep default.** Should the default be **Fast** (named areas, ~35 s, 97% of leads) with Deep one click away, or **Deep** by default with Fast as an option? *(I recommend Fast default — it matches how people search.)*
2. **Concurrency ceiling.** 5 browser slots on this machine (measured safe) or a conservative 4?
3. **Enrichment timing.** Keep phone enrichment running during discovery at a 2-worker reserve, or defer it entirely until the zone queue drains? *(I recommend the 2-worker reserve: phones still arrive during the run, but discovery keeps the machine.)*
4. **Grid ownership.** Keep the grid in client city runs (as pass 2) or move grid entirely to Master and make client runs named-areas only?
5. **Carry-forward.** Rebuild it in this plan (Phase 6) or leave it out until after the speed work is proven?
6. **Store count.** The live store is ~926 leads; the last audit recorded 4,901. Was the reduction intentional? This is unrelated to speed but I do not want to build on a dataset that shrank by accident.
7. **Phase 7 order.** Ship the folder-delete + false-banner fixes **before** the speed phases (0.5–1 day), or after them? *(I recommend before: they are correctness bugs you can see, and they touch no scraper engine.)*

Reply **"approve P7"**, **"approve P0"**, **"approve P0+P1"**, or **"approve all"**, and answer 1–7. I will start immediately and report a measured before/after table at the end of every phase.

---

## 12. What this plan will not do

No new access technique. No CAPTCHA bypass, no fingerprint change, no extra requests. Every change is to **our own zone order, our own slot budget, our own sleeps, our own storage, and our own UI**. The engines, the sources and the way they are called stay exactly as they are today.

The one deletion — the dead HTTP tier — removes a request that already returns zero results.

Phase 7's only destructive action is an **explicit folder delete**. It keeps CRM-engaged leads and reports exactly how many rows it removed.
