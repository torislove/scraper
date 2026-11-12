# Plan — Master Folder Tree, Out-of-Bound Vault, Guntur Yield, Scope Engines

Status: proposed. Two items are already partially implemented in the working tree
(see §0). Nothing in this plan deletes a lead without first archiving it.

## 0. Already done in this working tree

| Change | File | State |
|---|---|---|
| Read paths no longer rewrite folders (the bug that shrank Guntur 114 → 104) | `server/src/routes/sessionRoutes.js` | edited |
| `leadCount` / `phoneCount` / `verifiedCount` derived from actual rows, not stale headers | `server/src/routes/sessionRoutes.js` | edited |
| District → mandal → village tree built server-side (`buildLeadHierarchy`) with nearest-mandal placement for rows whose `mandal` is empty | `server/src/routes/sessionRoutes.js` | edited |
| Out-of-Bound vault service (`master_oob_<district>.json`, categorised) | `server/src/services/outOfBoundsVault.js` | new, not wired yet |

Next step is to finish wiring, then the UI.

## 1. Goal: every lead visible in a left-side district → mandal → village tree

**Server (mostly done)**
1. `readSessionHeader` and `GET /api/sessions/:id` return `hierarchy`
   `{ district, districts[], mandals[{ name, count, villages[{ name, count }] }] }`.
2. Rows with no `mandal` are placed by nearest surveyed boundary centre; if no
   coordinates exist they go to a visible `Unassigned mandal` node — never dropped.
3. `/sessions/list` and `/sessions/master/all` expose the same hierarchy.

**Master UI**
4. `master/src/v2/components/FolderView/FolderView.jsx`
   - Add a persistent left rail inside the folder view: `All leads (N)` → each
     district → each mandal → each village, with counts.
   - Selecting a node filters the table/map/telecaller views; search still works
     across the whole folder; a "clear" chip returns to all leads.
   - Collapse to a drawer under 1100 px so the table keeps its width.
5. `master/src/v2/components/views/FoldersGridView.jsx`
   - Show `N mandals · M villages` on each folder card and an
     **Out of Bound** badge where applicable.
6. Remove the old horizontal "area sub-folder" chip row once the tree exists
   (keep the analytics chips only in the Analytics tab).

**Acceptance**
- Opening `master_sweep_mwbkbnbm` shows 114 leads total, all inside the tree,
  and the sum of village counts equals 114.
- `master_sweep_mwbjwu4h` shows 137 leads, same invariant.
- No horizontal scrolling on 1280 px; no console errors.

## 2. Goal: a real Master Out-of-Bound folder, categorised

**Service (created)**
- `outOfBoundsVault.js` writes `db/user_sessions/master/master_oob_<district>.json`
  with `isMasterSweep`, `masterScope: 'out-of-bound'`, `isOutOfBound: true`,
  and per-row `oobCategory`:
  - `Neighbouring district: Palnadu`
  - `Outside Andhra Pradesh`
  - `Outside Guntur boundary`
- Deduped by id → phone → name+address. Newest first. Atomic tmp+rename write.

**Wiring**
7. `omniSearchOrchestrator.js`
   - Collect quarantined rows in a run buffer.
   - Flush once per containment batch and once on abort/final, calling
     `recordRejections({ district, state, category, sessionId, rows })`.
   - Keep the existing `out_of_bounds.json` ledger and recovery archive.
8. `POST /api/scrape/district-audit`
   - After archiving, send the same rejected rows to the OOB vault.
   - Response adds `oobFolder`, `oobAdded`.
9. Add `GET /api/scrape/out-of-bound` → list `master_oob_*` folders and their
   category counts (for a Master dashboard card).
10. Master UI
    - OOB folders appear in the Master tab with a red **Out of Bound** badge.
    - Folder view shows a category filter row (`Neighbouring district`,
      `Outside state`, `Outside boundary`).
    - A one-line banner: "Rejected by district containment. These leads are not
      part of any client folder."

**Safety**
- OOB rows keep their original data and are never sent to WhatsApp campaigns by
  default. Add an explicit "include OOB" toggle if bulk actions are used.

## 3. Goal: best-possible Guntur yield (why 151, and how to raise it)

**Diagnosis (measured)**
- 226 zones ran; Google Places was the only per-zone engine.
- One query per zone: `<category> in <village>, Guntur`.
- Most villages have no indexed plumber, so those zones return 0.
- OSM ran **once** around district HQ with an ~11 km radius, missing Tenali,
  Ponnur, Mangalagiri, Kollipara and Tadepalle.
- Global dedupe is correct, but it hides how many zones produced nothing.

**Fixes, all within the existing legal/public sources**
11. **Multi-vector queries per zone.** For each zone run 2–3 category vectors
    from the existing taxonomy (e.g. *plumber*, *plumbing contractor*,
    *sanitary ware / hardware* for the Plumbers family). Query count rises
    ~2.5×, wall-clock stays acceptable because the worker pool is shared.
12. **Mandal-anchor pass.** For district scope, in addition to village queries,
    run each of the 18 mandal HQs once with a radius that covers its villages.
    Town-level queries return the dense results that village queries miss.
13. **OSM per mandal cluster.** Call `scrapeOpenStreetMap` for each mandal centre
    (18 polite, serialised calls, cached 24 h), not once for the district.
    Tags already cover `craft=plumber` and `shop=hardware|doityourself`.
14. **Run Google Local Finder and Maps together** for named zones instead of
    `if maps … else local finder`. Different surfaces, same public data.
15. **Yield ledger.** Persist per-zone `{ zone, queries, raw, kept, rejected }`
    in folder metadata and expose it in the run summary, so "which villages
    produced nothing" is visible instead of guessed.
16. **No new access technique.** No proxy rotation, CAPTCHA solving, identity
    switching or hidden endpoints. Only more relevant public queries, pacing and
    the existing cooldowns.

**Acceptance**
- Live Guntur district Plumbers run yields materially more than 151 raw rows
  (target ≥ 350 unique raw; report the real number, do not inflate).
- 0 rows outside the Guntur boundary; every retained phone is a validated mobile.
- Run time and ETA remain honest in the preview.

## 4. Goal: separate district / mandal / state / city engines

New folder `server/src/services/scopeEngines/`:

```
index.js            resolveScopeEngine(scope), listScopeEngines()
districtEngine.js   every mandal + every village + boundary + containment
mandalEngine.js     HQ + every revenue village / ward
stateEngine.js      every district HQ + every sub-district HQ
cityEngine.js       localities + street grid + 5 km ring
```

Shared interface:
```js
{
  id, label, unitTerm,
  buildPlan(name, options),      // zones + coverage + warnings + caps
  queryVectors(category),        // search phrases for this scope
  anchors(plan),                 // surveyed centres used for containment
  containment(plan),             // predicate factory
  estimate(plan)                 // honest ETA inputs
}
```
17. `sweepScopePolicy.js` stays the geometry/gazetteer source; each engine wraps
    it with scope-specific vectors, anchors and guard.
18. Wire `POST /master-sweep` and `/master-sweep/preview` through
    `resolveScopeEngine(scope).buildPlan(...)`.
19. Add `GET /api/scrape/scope-engines` returning the four engines, their caps
    and their coverage sentences (used by the launchpad).
20. Orchestrator reads `plan.engineId` so query vectors and guard come from the
    engine, not from `if (scope === …)` branches.

**Acceptance**
- Preview for district/state/mandal/city returns the right unit terms and caps.
- A Tenali mandal sweep uses Tenali anchors, never district HQ.
- A Guntur district sweep still returns 18/18 mandals, 219/219 villages.

## 5. Goal: client and Master have different scraping code

21. New `server/src/services/masterSweepService.js`
    - Build plan via scope engine.
    - Enforce boundary, own the OOB flush and the post-run audit.
    - Call the shared engine workers through the orchestrator.
22. New `server/src/services/clientSearchService.js`
    - One city / town / village per search; rejects district/state requests.
    - Client containment, credits check, client folder naming.
23. Route split:
    - `POST /api/scrape/omni|auto` → `clientSearchService` only.
    - `POST /api/scrape/master-sweep|resume` → `masterSweepService` only.
    - Remove the `isMaster` flags from request bodies as the source of truth;
      workspace scope is decided by route + header.
24. Shared code is limited to low-level engine callers (`server/src/scrapers/*`),
    phone parsing, dedupe and persistence — no master-only branches in the
    client path and no client-only branches in the master path.

**Acceptance**
- Client cannot start a district/state sweep (403).
- Master sweeps cannot be opened in the client workspace (403).
- Both paths still stream, save folders and respect credits.

## 6. Goal: bug audit of both apps

25. Master
    - Folder list refresh: retry once after reconnect, render API sessions even
      while SSE is `CONNECTING`, remove stale `effectiveRuns` suppression.
    - Verify counts for every Guntur folder against disk.
    - Route smoke: `/command?tab=terminal|engines|clients|whatsapp|learning|theater`.
    - Console + failed-request check on each route.
26. Client
    - One-place search, credit 402 path, export phone rules, WhatsApp guard,
      folder open/delete/restore.
    - Same console + failed-request check.
27. Cross-cutting
    - No read path writes a folder.
    - Delete/purge paths archive first; restore works.
    - No `^[6-9]\d{9}$` mobile checks; parser only.
    - No out-of-bounds row in a client folder.

**Acceptance**
- A written smoke report with route, expected, observed.
- `npm run build` clean in both apps; no three.js in production bundles.

## 7. Order of work and verification

| Step | Work | Verify |
|---|---|---|
| 1 | Finish tree wiring + Master FolderView rail | 114/137 leads fully grouped |
| 2 | Wire OOB vault (orchestrator + audit) | dry-run audit writes `master_oob_guntur.json` |
| 3 | Scope engines + route wiring | preview returns 18/18 · 219/219 |
| 4 | Split master/client services | client district request → 403 |
| 5 | Yield work (vectors, mandal pass, OSM clusters, local finder) | live Guntur run > 151 raw, 0 outside |
| 6 | Bug audit + builds + smoke | report + clean builds |
| 7 | Docs + commit on `main` | one commit over `85c05b9` |

Backups: every rewrite still archives rejected rows to
`server/data/deleted_leads.jsonl` and `_guard_backup/` before touching a folder.

## 8. Explicitly out of scope

- No CAPTCHA bypass, proxy/identity rotation, or unauthorized endpoints.
- No invented leads or filled-in fields; unknown stays `Unknown`.
- No paid API requirement, no NVIDIA or external AI keys.
- No deletion of existing folders or of the pre-audit backups.
