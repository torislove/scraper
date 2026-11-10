# Master Implementation Plan — Whole-City Coverage, All Leads, All Mobile Numbers

Status: **approved, in execution** · Owner: engineering · Scope: engine + client + master
Last updated: 2026-10-31

---

## 0. The three complaints, restated as engineering targets

| # | User report | What it actually means |
|---|---|---|
| 1 | "Restaurants in Guntur does not give all the places" | The city is split into 10 hardcoded localities. Every run can only see what those 10 phrases surface. A famous place such as *Naidu Gari Military Hotel* never enters the result set even though Google shows it. |
| 2 | "Not giving all the leads with mobile numbers" | Google Maps **feed cards** do not render the phone. The phone (`Phone: 091826 63268`) exists only on the **place detail panel**, which the run never opens. We also discard `allPhones` after picking one number. |
| 3 | "City location parsing in the client" | The client receives `location` from the parser but does not show/confirm the resolved city scope or how many zones will be covered. Some inputs resolve to a locality instead of the city. |

**Definition of done**

- A city search covers the entire urban footprint, not a hand-picked list.
- Every place Google/JustDial can return for that city is eligible; no truncation, no silent drops.
- Every lead that has a phone anywhere on its source page ends up with that phone.
- All phones per business are stored, exported and visible.
- The client shows exactly what will be searched: `City · Guntur · 64 zones · whole city + 5 km ring`.

---

## 1. Root causes and evidence

| Root cause | Evidence (repo) |
|---|---|
| City coverage is a fixed list | `server/src/utils/universalGeoCluster.js:107` — `guntur: ['Brodipet', 'Arundelpet', …]` (10 entries). Run `cmd_mvwj2ys5` searched exactly those 10 zones → 170 leads. |
| Coordinates are never used to partition Google results | `engine-google-places.js:574` builds `maps/search/<query>` **without** `@lat,lng,zoom`. `centerLat/centerLng` are used only for the containment guard. Every zone with the same text returns the same feed. |
| Feed cards have no phone | `engine-google-places.js:803` scans card text; cards omit phone. The detail selector `[data-item-id^="phone:tel:"]` exists in `googlePlaceDeepExtractor.js:143` but is only used by the **website/deep-profile** job. |
| Extracted phones discarded | `engine-google-places.js:876` emits `allPhones`, the saved `place` object stores only `phone` (`:970`). |
| Folder saved before enrichment | `scrape.js:1304` persists the vault; deep enrichment is queued afterwards (`:1362`). The folder, CSV and Excel therefore show fewer phones than the engine actually has. |
| Auto plan is narrow | `categoryRouter.js` FAMILY_DEFINITIONS = `google-local-finder + maps + justdial`. `google-serp` exists but is never queued. |
| Local Finder cannot be area-biased | `engine-google-serp-local.js:124` uses `tbm=lcl&start=N` with no viewport. All its value comes from the locality text in the query. |

---

## 2. Target architecture

```
                        ┌──────────────────────────────┐
  "restaurants in       │  Intent + place resolution   │  -> category = Restaurants
   Guntur"              │  (city / mandal / village)   │  -> location = Guntur (city)
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │  WHOLE-CITY COVERAGE PLAN    │
                        │  named localities            │
                        │  + geographic grid cells     │
                        │  + category vectors          │
                        │  dedupe by distance, cap     │
                        └──────────────┬───────────────┘
                                       │  zones (each with lat/lng)
                        ┌──────────────▼───────────────┐
                        │  ENGINE SWARM                │
                        │  Maps   (viewport-biased)    │
                        │  Local Finder (text zones)   │
                        │  JustDial (city + area)      │
                        │  IndiaMART / SERP (B2B)      │
                        └──────────────┬───────────────┘
                                       │  raw leads (phone if visible)
                        ┌──────────────▼───────────────┐
                        │  PHONE COMPLETENESS PASS     │
                        │  1 place detail  (phone:tel) │
                        │  2 website crawl (tel:, text)│
                        │  3 directory phones          │
                        │  merge into phones[]         │
                        └──────────────┬───────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │ vault save (immediate)                  │
                  │ vault re-save after backfill + events   │
                  └────────────────────┬────────────────────┘
                                       │
              map · folders · CSV/Excel · master coverage ledger
```

### 2.1 Whole-city coverage plan

- **Named localities** stay (they give Google locality-specific ranking).
- **Grid cells** are generated over the city's true bounding box **plus a 5 km ring**:
  - box = bounding box of the city's known locality coordinates, expanded to at least 11 × 11 km;
  - **ring = 5 km on every side** (highway restaurants, resorts, function halls and out-of-town showrooms live there);
  - fallback = city centre ± (`cityRadiusKm` + 5 km); tier-1 metro 20 km, tier-2 8 km, default 6 km;
  - cell size ≈ 2.6 km, up to 9 cells per axis; Guntur = 54 grid cells + 10 localities;
  - a cell is dropped if it is within 1.2 km of a named locality (avoid duplicate work);
  - when the zone cap applies, cells are sampled **evenly by distance** so the outer ring is kept;
  - cells are **Maps-only** (Local Finder cannot be viewport-biased).
- **Category sub-vectors** are generated from real sub-categories of the requested
  service (restaurants → biryani, veg, dhaba, bakery, cafe, military hotel, …).
  This matters because Google caps a Maps list at ~20 places ("You're seeing a
  limited view of Google Maps") — coordinate cells alone keep returning the same
  top-20, while each genuine sub-category exposes a different top-20.
- Client cap: **64 zones** per city run (all localities + 18 sub-vectors + evenly
  sampled grid, ring included); master cap: **200** zones.
- Every zone carries `lat/lng`, `engines`, `coverageKind` (`locality` | `grid` | `vector`).

### 2.2 Engine changes

- **Maps**: `https://www.google.com/maps/search/<q>/@<lat>,<lng>,<zoom>z`, zoom derived from radius (5 km → 13z). This is what makes each grid cell return a different slice of the city.
- **Maps cards**: keep `allPhones` (normalized, deduped, mobile-first). Never throw away a number.
- **Local Finder**: unchanged text behaviour, but skipped for grid cells.
- **JustDial**: keep the city-indexed sweep and area sweep; it is the second independent mobile source.
- **B2B**: IndiaMART stays for industrial/product intents; `google-serp` is queued when a family asks for website/contact discovery (P1).

### 2.3 Phone completeness pass (new service)

`server/src/services/phoneBackfillService.js`

1. Candidates = leads of the current session **without a valid Indian mobile** and with a `mapsLink`.
2. Open the place detail page (shared browser, bounded context pool, concurrency 4, 12 s per page).
3. Extract: `[data-item-id^="phone:tel:"]` aria-label, `a[href^="tel:"]`, visible text next to `Phone:`.
4. Normalize with `phoneUtils.normalizePhone`; validate Indian mobile (`^[6-9]\d{9}$`).
5. Merge: `phone` (mobile preferred), `phones[]` (all), `whatsappAvailable`, `phoneSource = 'google-place'`, `verified`.
6. Emit `vendor updated` events so the map and table update live.
7. Budget 90 s (client) / 240 s (master); pages that time out are left untouched and retried on the next run.
8. After the pass: **re-save the same vault file** with updated leads and `phoneBackfill` metadata.

Website crawl stays as the third layer (`fastWebsiteExtractor` / `deepProfileService`) and now only needs to fill what the detail pass missed.

### 2.4 City location parsing (client + server contract)

Server (`/api/search/suggest`, `/api/search/parse`) returns:

```json
{
  "location": "Guntur",
  "locationClassification": {
    "type": "city",
    "name": "Guntur",
    "zoneCount": 28,
    "coverageKind": "whole-city",
    "badge": "CITY"
  }
}
```

- Bare ambiguous names (`guntur`) return the existing disambiguation question: **City / Mandal / Village**.
- Client hides district/state (correct) and renders the resolved city as a locked chip: `📍 Guntur city · 64 zones · +5 km ring`.
- Typing a locality (`brodipet`) keeps the locality but pins its parent city for containment and display: `Brodipet, Guntur city`.
- The omnibox value is never overwritten while the user is typing; the parser only proposes.

### 2.5 "All leads" guarantees

- No global lead cap in the orchestrator (confirmed: only per-engine caps).
- Dedupe key = normalized name + rounded coordinates; a phone-less lead is never dropped in favour of a phone-bearing duplicate unless the name matches.
- Directory engines run once per session alongside zones.
- Master filters are applied after the harvest and counted (`harvestedBeforeFilters`).

### 2.6 Master app

- `POST /api/scrape/master-sweep/preview` → zone count, per-engine estimate, phone expectation, coverage kind.
- Coverage ledger: `zone + category + lastRun + leadCount + phoneCount` (P1).
- Survives restarts: zone state machine `pending → running → done | failed | skipped` (P1).
- Learning and engine board unchanged.

---

## 3. File-level work breakdown

| Area | File | Change |
|---|---|---|
| City grid | `server/src/utils/universalGeoCluster.js` | `buildCityGridZones()`, merge with localities, export coverage metadata |
| Engine viewport | `server/src/scrapers/engine-google-places.js` | viewport URL, keep `allPhones`, mobile-first phone |
| Phone pass | `server/src/services/phoneBackfillService.js` (new) | detail-page phone extraction, bounded pool, DB merge |
| Orchestrator | `server/src/routes/scrape.js` | skip LF on grid cells, run backfill, re-save vault, emit updates |
| Parse/scope API | `server/src/routes/search.js` | `coverageKind`, real `zoneCount`, city canonicalisation |
| Client console | `client/src/v2/SearchConsole.jsx` | locked city chip with zone count, scope confirmation |
| Client API | `client/src/v2/CommandCenter.jsx` | pass canonical location + scope |
| Master | `master/src/v2/*` | preview + coverage display (P1) |
| Export | `server/src/routes/sessionRoutes.js`, client export | include all phones per lead |

---

## 4. Acceptance matrix

| # | Test | Expected |
|---|---|---|
| 1 | `restaurants in guntur` | ≥ 300 unique leads (currently 170) |
| 2 | Same run, phone rate | ≥ 75 % leads with a valid +91 mobile (currently 56 %) |
| 3 | *Naidu Gari Military Hotel* | present, with its Google phone |
| 4 | Zones shown in client | `Guntur city · 64 zones · whole city + 5 km ring` |
| 5 | Duplicate phones | 0 |
| 6 | Folder immediately after run | phone count equals table count |
| 7 | Folder 2 min after run | phone count never decreases (backfill re-save) |
| 8 | Bare `guntur` | asks City / Mandal / Village |
| 9 | `brodipet` | resolves `Brodipet, Guntur city`, containment holds |
| 10 | Master `restaurants · Guntur district` | every mandal zone, no duplicate phones |
| 11 | Lead outside city bounds | rejected by containment |
| 12 | Engine board during backfill | Maps green, no breaker trip |

---

## 5. Execution order

**Now (P0)**
1. City grid + viewport-biased Maps (coverage).
2. Phone backfill service + vault re-save (mobiles).
3. Client city scope chip + parse contract (parsing).
4. Measure Guntur restaurants before/after; commit.

**Next (P1)**
5. `google-serp` in auto plan for contact discovery; all-phones export.
6. Master sweep preview + coverage ledger.
7. Category-vector expansion per family (cuisines for food, specialties for health, etc.).

**Later (P2)**
8. Resume-safe master sweeps, role-based master users, data-quality dashboard.

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| More zones → longer runs | Grid cells are Maps-only; cap 64 (client) / 200 (master); dedupe cells near localities; ring cells sampled evenly, never dropped |
| Google rate-limit / CAPTCHA | Existing `serpBreaker`; Maps is the primary surface; backfill is sequential-ish (4 pages) |
| Backfill opens too many pages | One browser, max 4 concurrent pages, hard budget, per-page 12 s timeout |
| Duplicate leads across grid cells | Name + coordinate dedupe already in ingest; phone dedupe on export |
| Approximate coordinates | `isApproximate` flagged and surfaced in master, never presented as surveyed |
| User timing expectations | Vault is saved immediately; phones stream in via `updated` events and a re-save |

---

## 7. Measurement protocol

```bash
node scripts/measure-run.js "restaurants in guntur" --seconds 600
```

Record: first lead, total leads, phones, zones, elapsed, engine breakdown. Store the result in §8 below.

## 8. Measured results

| Date | Query | Leads | Phones | Zones | Elapsed | Notes |
|---|---|---|---|---|---|---|
| 2026-10-31 | restaurants in guntur | 170 | 96 (56 %) | 10 | 46 s | baseline |
| 2026-10-31 | _(after P0)_ | — | — | — | — | pending |
