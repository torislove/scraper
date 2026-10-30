# Master Sweep Intelligence — Implementation Plan (India)

> Status: **P0 partially built** (suggestions, zone policy, engine health board).
> P1+ (intent engine, planner, swarm controller, coverage ledger) still planned.
> This document turns the master command center from
> "a text box that fires 80 zone queries" into a planner + swarm controller that knows
> *what* to search, *where* to search, *with which engines*, and *how many workers* are
> safe in Indian conditions — including arbitrary product, brand and free-text searches.

---

## 1. What exists today, and what is missing

| Piece | Today | Gap |
|---|---|---|
| Location input | one free-text box in `/command → Master Folders` | **no suggestions at all** on the Coverage Scope field |
| Category input | free text, `classifyCategory` maps it to a business family | product words ("graphic card") fall into `generic`; brands ("AMD", "RTX 4090") match nothing |
| Scope | `city · mandal · district · state` dropdown | the operator cannot see *which* zones will be searched |
| Zone resolution | `stateIndex / districtIndex / mandalIndex / classifyLocation` in `server/src/utils/universalGeoCluster.js` (36 states/UTs, 627 districts, 5,618 mandals) | no PIN, no ward, no alias, no confidence, hard caps at 80 zones |
| Suggestions | `/api/search/suggest` returns only `category` + `location` groups; client uses it, **master uses nothing** | no product group, no brand group, no "search anyway" row |
| Pre-flight | `/api/scrape/preflight` + `services/runEstimator.js` exist | master UI never calls them; no ETA/credits/engine preview |
| Execution | `POST /api/scrape/master-sweep` → `runOmniSearchOrchestrator` with one flat zone list | all zones treated equally; no priority, no per-zone state, no resume |
| Engines | `categoryRouter.pickAutoEngines` per category | `generic` never includes IndiaMART, so product searches miss the supplier index |
| Concurrency | `utils/queue.js` + `scrapers/concurrencyManager.js`, caps 1–6 per engine | static caps, no adaptive back-off, no ban detection |
| Progress | single `activeSessions[sessionId]` counter | no per-zone board, no failed-zone retry, no coverage history |
| Coverage memory | none | every sweep starts from zero; no "what is stale / missing" view |

The operator's complaint is accurate on both fronts: the master shows **no suggestions**
and it has **no idea what a product or brand query means**, so "AMD graphic card in
Hyderabad" degrades to a generic business search.

---

## 2. Design principles

1. **Nothing is ever rejected.** Every text field accepts any word, product, brand,
   typo, Hinglish phrase or PIN. Suggestions help; they never gate.
2. **Plan before swarm.** Nothing runs until a frozen `SweepPlan` exists (zones,
   engines, budget, worker count, cost).
3. **Resolve offline first.** 95% of Indian place and product names must resolve from a
   local index in <5 ms. Network calls are fallback, not default.
4. **Never one worker per zone.** A 56-mandal district is *not* 56 parallel browsers; it
   is a priority queue drained by a bounded worker pool.
5. **Zones fail independently.** A CAPTCHA in Tenali must not kill Guntur.
6. **Coverage is a ledger, not a hope.** Every completed zone is written durably so the
   next sweep can skip it, refresh it, or target the gaps.
7. **Fidelity beats volume.** A GPU query must return computer dealers, not NVIDIA's
   corporate office. Brand, product and entity role all shape the result set.

---

## 3. The Indian geo model

Indian administrative geography is not one tree — it is three overlapping trees plus a
postal grid. The plan models all four.

### 3.1 Administrative reality

| Level | State variants | Notes for the engine |
|---|---|---|
| State / UT | 28 states + 8 UTs | The landing says "28 states", the index says 36 units. Keep both: *36 units, 28 states*. |
| District | district, zilla | 627 indexed; new districts are created often (Andhra Pradesh went 13 → 26 in 2022). |
| Sub-district | **mandal** (AP/TS), **tehsil/tahsil** (UP/RJ/MP/HR), **taluk** (KA/KL/MH), **circle** (AS), **block** (dev/common) | All are the same level. "Tenali Tehsil" must resolve to the same node as "Tenali Mandal". |
| Town / city | municipal corporation, municipality, nagar panchayat, census town, notified area | Urban local body ≠ revenue village. A city sits *inside* a mandal but is searched as its own zone set. |
| Ward / locality | ward (corporation), area/colony (colloquial) | This is the real scraping unit in metros: "Benz Circle", "Kothapet". |
| Village | revenue village, gram panchayat, habitation | 5,618 mandals → ~6 lakh villages nationally. Resolve *named* villages on demand, don't preload. |

### 3.2 The postal spine (the disambiguator)

Village and locality names repeat heavily — "Nagar", "Colony", "Gudem", "Palli".
The 6-digit PIN is the cheapest reliable disambiguator:

```
PIN 522001 → Guntur(district) → Guntur(mandal) → Guntur(city) → Andhra Pradesh
```

Store `pincodes[]` per district and per mandal HQ. If the operator types a PIN, resolve
everything; if two zones share a name, ask for the PIN or the district.

### 3.3 Naming and transliteration

| Reality | Example | Handling |
|---|---|---|
| Colonial → current | Bombay→Mumbai, Madras→Chennai, Bangalore→Bengaluru, Trivandrum→Thiruvananthapuram, Calcutta→Kolkata, Mysore→Mysuru | `aliases` array both ways |
| Renamed districts | Allahabad→Prayagraj, Faizabad→Ayodhya | alias + `renamedFrom` |
| Local script spelling | విజయవాడ, விஜயவாடா, বিজয়ওয়াড়া | store transliterated + one roman variant; strip diacritics |
| Joined/split spelling | Vijayawada / Vijayavada / Bezawada | fuzzy match (Levenshtein ≤ 2 on >6 chars) |
| Twin cities | Hyderabad–Secunderabad, Ahmedabad–Gandhinagar | separate zones, shared metro cluster |

### 3.4 Settlement classes (drives everything downstream)

| Class | Typical zone | Listings/zone | Engines that actually work |
|---|---|---|---|
| `metro` | Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Pune, Kolkata | 250–900 | serp, maps, justdial, indiamart |
| `tier2` | Vijayawada, Visakhapatnam, Coimbatore, Kochi, Jaipur, Indore | 120–400 | serp, maps, justdial |
| `tier3` | Tenali, Ongole, Kurnool, Warangal, Tirupati | 60–200 | serp, maps, justdial (city-level only) |
| `mandal_hq` | mandal headquarters town | 20–80 | serp, maps |
| `village` | revenue village / habitation | 0–15 | serp, maps only, low concurrency |

**Stop rule:** if a zone is `village` class and the category is
`restaurant/hotel/hospital`, expect near-zero yield — mark it `low_expected` and sort it
last (default: keep, never silently drop a named zone).

### 3.5 Zone granularity policy (what "sweep everything" actually means)

Enumerating every village for a district is wasted traffic: a mandal-headquarters query
already returns its villages' shops because Google resolves the surrounding area. The
policy layer therefore expands each scope differently:

| Scope | Zones actually scraped | Deliberately **not** scraped | Cap |
|---|---|---|---|
| **District** | **all mandals** (the administrative hubs) | individual villages — they arrive inside each mandal's results | 120 |
| **Mandal** | **every village / ward** in the mandal | nothing — mandal sweeps are exhaustive | 160 |
| **State** | **all districts** (district HQ city query) **+ up to 9 major mandals per district** | full village enumeration (that is a district sweep) | 300 |
| **City / town** | commercial localities / wards | surrounding rural mandals | 60 |

Implementation: `server/src/services/sweepScopePolicy.js` → `buildScopeZones(scope, name)`.

Rules:

- A cap is never silent. The response carries `stats { totalZones, returnedZones, capped,
  cap }`, and the UI says *"56 of 56 mandals"* or *"300 of 412 zones — cap reached"*.
- A wrong scope is auto-corrected: asking for `Tenali` as a *state* resolves it as a
  mandal and adds a warning; asking for `Guntur District` as a *district* strips the
  suffix before lookup.
- The frozen plan is passed into the orchestrator as `plan.zones`, so execution uses the
  exact policy list instead of re-resolving from a text string (which used to cap a
  district at 40 mandals and a mandal at 11 villages).
- The launcher shows the policy live: *"Guntur · district — every mandal (villages
  covered by each mandal query)"*.

---

## 4. Universal intent — anything a buyer can type

The product is not a "business category finder". A user may type **any** of these:

```
plumbers in Vijayawada
wedding photographers in Tenali
AMD graphic card in Hyderabad
RTX 4090 dealer near me
Asian Paints dealer Guntur
cotton fabric wholesalers in Surat
Dell laptop service centre Warangal
522001 computer shops
xyzzy
```

All of them must run. The planner classifies the intent, expands it, and only then
decides zones and engines.

### 4.1 Intent classes

| Intent | Examples | Detection signals | Effect on the plan |
|---|---|---|---|
| `local_service` | plumber, salon, dentist, banquet hall | family keywords, service nouns | current behaviour: zone × family engines |
| `product` | graphic card, water pump, cotton fabric, LED bulb | product nouns, plural goods, "wholesale/dealer/supplier" | adds **IndiaMART** + dealer-oriented SERP variants |
| `brand` | AMD, NVIDIA, Asian Paints, Royal Enfield, Havells | brand dictionary match (any position) | adds brand-dealer expansion + `entityRole` filter |
| `brand_product` | "AMD graphic card", "RTX 4090", "Ryzen 5 7600" | brand + product/model token | product engines + model-specific SERP |
| `place_only` | "Hyderabad" | location resolves, no category token | master sweep of every category in the plan's category list (or the operator's saved list) |
| `unknown` | "xyzzy" | no dictionary hit, no family hit | run as `generic` with a visible warning: "we will search this word literally" |

Rules:

- A brand token **never replaces** the category — "AMD" alone means "AMD dealers /
  authorised stores / service centres", not "AMD office".
- A product token **always** spawns dealer synonyms (see 4.3). A shop that sells GPUs is
  usually listed as "computer hardware dealer", not "graphic card shop".
- `unknown` still executes. The only hard stop is an empty query.

### 4.2 Brand & model dictionary (v1 scope)

`server/data/taxonomy/brands.json` — India-relevant, alias-aware, with `categoryHints`:

| Sector | Brands (v1) |
|---|---|
| PC / IT | AMD, NVIDIA, Intel, ASUS, MSI, Gigabyte, Zotac, Corsair, Logitech, HP, Dell, Lenovo, Acer, BenQ, Seagate, WD |
| Mobile / consumer | Apple, Samsung, Xiaomi, Realme, OnePlus, Vivo, Oppo, iQOO, Nothing, boAt, Noise |
| Home / electrical | Voltas, Blue Star, Daikin, Havells, Crompton, Bajaj, Anchor, Legrand, Asian Paints, Berger, Nerolac |
| Auto | Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Royal Enfield, Hero, Bajaj Auto, TVS, Honda, Yamaha |
| Industrial | Tata Steel, JSW, Hindalco, BOSCH, Kirloskar, Cummins, Havells Industrial, Godrej |
| Retail chains | Reliance Digital, Croma, Vijay Sales, Poorvika, Sangeetha Mobiles, DMart |

Each record:

```json
{
  "brand": "AMD",
  "aliases": ["advanced micro devices", "radeon", "ryzen", "threadripper", "amd gpu"],
  "models": ["RX 7900", "RX 7800", "RX 7600", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Threadripper"],
  "categoryHints": ["computer hardware dealer", "IT peripherals", "graphic card dealer"],
  "entityRoles": ["authorised_dealer", "multi_brand_dealer", "service_centre"],
  "excludeRoles": ["brand_office", "corporate_hq"]
}
```

Model tokens are matched as whole tokens ("rtx 4090", "i5 12400", "rx 7800 xt") so
"4090" alone does not drag in unrelated results.

### 4.3 Query expansion (this is where the leads come from)

Expansion is deterministic and offline (no LLM required at query time):

```
"graphic card"
  → graphic card dealer
  → computer hardware shop
  → computer peripherals dealer
  → GPU supplier / distributor
  → computer sales and service
  → IT shop

"AMD graphic card"
  → + AMD Radeon dealer
  → + authorised AMD distributor
  → + gaming PC builder

"Asian Paints dealer"
  → + paint shop
  → + hardware and paint store
  → + authorised paint dealer
```

Store expansions in `server/data/taxonomy/expansions.json` (keyword → variants), with a
generic fallback rule: `<product> dealer`, `<product> shop`, `<product> supplier`,
`<product> distributor`, `<product> wholesale`. This works for products nobody has
curated yet — which matters, because Indian retail categories are effectively unbounded.

Commodity nouns (tamarind, turmeric, chilli, rice, cotton, coconut …) expand to
**wholesaler / trader / market / supplier** instead of showroom dealers. Repair intent
("old TV repair", "AC service") expands to **repair service / service centre / spare
parts** and suppresses shop-style expansions.

### 4.3.1 Auto-learning (the dictionary grows with use)

`server/src/services/taxonomyLearner.js` records every **finished run that returned
leads** into `server/data/taxonomy/learned.json`:

| Learned field | Source | Effect |
|---|---|---|
| query phrase | operator's query + lead count | remembered as a proven search |
| product base | detected product, or the generic product phrase | becomes a first-class suggestion |
| expansions | the phrases that actually returned leads | replace generic guesses next time |
| vendor categories | `category` / `services` of returned vendors | feeds category suggestions |
| brands | a known brand appearing in **2+** vendor names | strengthens brand detection |

Hard rules:

- **Nothing is invented.** A zero-lead run never becomes a dictionary entry.
- Learning is capped (4,000 queries · 1,500 products · 2,500 categories · 2,500 services · 800 brands, oldest evicted first) so the file cannot grow without bound.
- **Services learn too.** Repair and local-service runs ("tv repair shops", "lawyers") are stored in the services bucket, tagged with the directory labels that actually came back, and resurface as `LEARNED` rows on the next keystroke.
- Operators can still override anything by editing `brands.json` / `expansions.json`;
  file entries win over built-ins.
- `GET /api/search/taxonomy` exposes the learned counts, shown in the master engine
  board as **“🧠 Learned N products · M categories · K brands”**.
- `GET /api/search/learned` returns the full catalogue, rendered in the master
  **Learning** tab (`/command?tab=learning`): totals for products, categories,
  services, brands and searches, with run counts, evidence and last-seen time.
- The client console uses the same suggestion endpoint, so the same learned rows
  appear there grouped under Brands / Products / Learned / Services, plus a
  **“Search … literally”** row for any wording the dictionaries have not seen.
- Common intent misspellings are repaired before detection (`repeir`, `repiar`,
  `servise`, `moblie`, `laptp` …), so a typo still produces repair/service intent.

### 4.4 Engine selection for product / brand intent

| Intent | serp | maps | justdial | indiamart | telco |
|---|---|---|---|---|---|
| `local_service` | ✔ | ✔ | ✔ | — | ✔ |
| `product` | ✔ (dealer variants) | ✔ | ✔ (retail) | **✔ (must)** | — |
| `brand` | ✔ (dealer variants) | ✔ | ✔ | ✔ | — |
| `brand_product` | ✔ | ✔ | ✔ | ✔ | — |
| `unknown` | ✔ | ✔ | ✔ | — | — |

This is the concrete bug behind "graphic card returns nothing useful": `generic` currently
has no IndiaMART, so the one index full of Indian computer dealers is never queried.

### 4.5 Entity role (brand fidelity)

Every lead gets an `entityRole`, inferred from name + website + listing text:

| Role | Signals |
|---|---|
| `brand_store` | name is exactly the brand ("AMD Store", "Samsung") |
| `authorised_dealer` | "authorised", "authorized", "official dealer" |
| `multi_brand_dealer` | two or more brands in the name, or a generic shop name |
| `distributor` | "distributor", "wholesale", "bulk", "supplier" |
| `service_centre` | "service", "repair", "care" |
| `brand_office` | "corporate", "head office", "registered office" |

Advanced filter **"exclude brand-owned stores"** keeps only dealers/distributors — the
people you can actually sell to. Default: on for `brand` intents.

### 4.6 Suggestions for every field, in both apps

Field-level behaviour (master **and** client):

| Field | Suggestion groups | Free typing |
|---|---|---|
| Category / product / brand | `Products` · `Brands` · `Services` · `Categories` | always allowed |
| Location / coverage scope | `States` · `Districts` · `Mandals (Tehsils/Taluks)` · `Cities & Towns` · `Villages` · `PIN codes` | always allowed |

Rules:

- 120 ms debounce; local index answers first paint; network only fills ranking.
- Every suggestion row shows its type badge and size: `Guntur · District · 56 mandals`.
- Always render a last row: **`Search "graphic card" literally`** — so the operator never
  feels blocked by a dictionary they disagree with.
- Empty state is a hint, never an error: `No match — press Enter to search this word.`
- The scope field in the master launcher gets the **same** place suggestions as the client
  search bar. This is the specific gap reported: "Coverage Scope is not showing
  suggestions."

### 4.7 Advanced filters available to clients and master

| Filter | Client | Master | Notes |
|---|---|---|---|
| Mobile numbers only | ✔ | ✔ | `^[6-9]\d{9}$` after +91 normalisation |
| Minimum rating | ✔ | ✔ | 0 / 3 / 3.5 / 4 / 4.5 |
| Minimum reviews | ✔ | ✔ | filters single-review shells |
| Has website | ✔ | ✔ | useful for web-design and SEO pitches |
| Verified / claimed profile | ✔ | ✔ | |
| Opened since | ✔ | ✔ | "new businesses" list |
| Entity role | ✔ | ✔ | dealer / distributor / service centre / brand store |
| Exclude brand-owned stores | ✔ | ✔ | brand campaigns |
| Chain vs independent | ✔ | ✔ | independent shops convert better for SMB tools |
| B2B / wholesale only | ✔ | ✔ | IndiaMART-heavy |
| Radius (km) | ✔ | ✔ | city searches |
| Hide already-contacted | ✔ | ✔ | reads the CRM stage |
| New since last export | ✔ | ✔ | incremental lists |

Filters are applied **after** the zone merge (already true for `minRating`, `mobileOnly`,
`hasWebsite`, `verifiedOnly`), and the counts removed are recorded in
`metadata.filters` so the client can see exactly what was excluded.

### 4.8 Worked example — "AMD graphic card in Hyderabad"

```
intent        brand_product   (brand: AMD, product: graphic card)
place         Hyderabad · city · telangana
zones         14 localities (Ameerpet, Koti, Secunderabad, Madhapur, …)
expansions    graphic card dealer · computer hardware shop · GPU supplier ·
              gaming PC builder · AMD Radeon dealer
engines       serp(dealer variants) · maps · justdial(retail) · indiamart
entityRole    exclude brand_office, brand_store → keep dealers/distributors
expected      90–220 leads, 14 zones, ~4 workers, ~22 min
```

---

## 5. Architecture — six stages

```
resolve → score → compose → budget → swarm → settle
   │        │        │         │        │        │
 gazetteer  priority  engines  workers  queue   ledger
 + intent  + gaps    × class   × RAM    + backoff + gaps
```

### Stage A — Resolve (`services/geoIntelligence.js` + `services/intentEngine.js`)

Input: `{ scope, name, pincode?, parent?, query }`
Output: `ResolvedPlace` **and** `IntentProfile`:

```json
{
  "intent": {
    "kind": "brand_product",
    "brand": "AMD",
    "product": "graphic card",
    "expansions": ["graphic card dealer", "computer hardware shop", "GPU supplier"],
    "entityRoles": ["authorised_dealer", "multi_brand_dealer", "distributor"],
    "excludeRoles": ["brand_office", "brand_store"],
    "confidence": 0.87
  },
  "resolved": {
    "scope": "district", "name": "Guntur", "state": "Andhra Pradesh",
    "lgdCode": "505", "class": "tier2"
  },
  "confidence": 0.94,
  "zones": [
    { "id": "ap:guntur:tenali", "name": "Tenali", "kind": "mandal", "class": "tier3",
      "pincodes": ["522201"], "lat": 16.24, "lng": 80.64 }
  ],
  "warnings": ["District has 56 mandals; 18 are below tier3 density."]
}
```

Place resolution order (first hit wins, later stages only fill gaps):

1. exact LGD/gazetteer key → 2. normalized key → 3. alias table → 4. fuzzy key
(Levenshtein ≤ 2, len > 6) → 5. PIN → 6. classifier fallback → 7. network geocode (last
resort, cached forever).

Intent resolution order: brand dictionary → model tokens → product synonyms → family
keywords → `generic`.

### Stage B — Score (`services/sweepPlanner.js`)

```
score = 35·density + 25·commercial + 15·engineCoverage + 15·freshnessGap + 10·strategic
```

| Term | Source |
|---|---|
| `density` | class prior (metro 1.0 … village 0.1) × category's urban bias |
| `commercial` | intent fit: B2B wholesale 1.0 in mandal HQ; wedding venues 1.0 in tier2; GPU dealers 1.0 in metro/tier2 |
| `engineCoverage` | fraction of planned engines that return for this class (JustDial = 0 in villages) |
| `freshnessGap` | days since this zone+category was last swept (0 = 0, ≥90 = 1) |
| `strategic` | operator flags: highway corridor, industrial estate, district HQ, "must cover" |

Rules: never drop a named zone (low scores sort last); boost district HQ +8; penalise
zones swept in the last 7 days unless forced; `village × B2B` → ×0.5 labelled `thin`.

### Stage C — Compose (engine matrix)

| Class | serp | maps | justdial | indiamart | telco |
|---|---|---|---|---|---|
| metro | ✔ per locality | ✔ per locality | ✔ **once per city** | ✔ once per city | ✔ |
| tier2 | ✔ per locality | ✔ per locality | ✔ once per city | — | ✔ |
| tier3 | ✔ per locality | ✔ per locality | ✔ once per city | — | — |
| mandal_hq | ✔ | ✔ | — | — | — |
| village | ✔ (name + district) | ✔ (name + mandal) | — | — | — |

**India-specific rule:** JustDial and IndiaMART are city-indexed, not mandal-indexed. A
56-mandal district sweep must not fire 56 identical directory queries. Collapse them to one
per city and merge results into the district folder.

### Stage D — Budget

Reuse `services/runEstimator.js` `ENGINE_BUDGETS` (seconds/zone, leads/zone,
concurrencyCap), then:

```
workers = min(Σ engine.concurrencyCap, machineBudget, zonesRemaining)
etaSeconds = Σ(zone.seconds × engineFactor) / workers
expectedLeads = Σ(zone.class.leadsPerZone × intentFactor × DEDUPE_FACTOR)
credits = expectedLeads × 1
```

`machineBudget` — Indian desktop reality (4–8 GB i3/i5 laptops):

```
machineBudget = clamp(floor(freeRamMB / 320), 2, 6)   // one Edge tab ≈ 300 MB
```

Show it in the plan sheet; operators otherwise assume "more workers = faster".

### Stage E — Swarm (`utils/swarmController.js`)

- **Priority queue** over zones (score desc), drained by a fixed worker pool.
- **Per-engine token buckets** (serp 6, maps 5, justdial 2, indiamart 1) via the existing
  `ConcurrencyPool`, plus a global browser budget.
- **Jittered delay** 700–1800 ms between page loads; longer in tier3/village.
- **Adaptive back-off**: 429/403/CAPTCHA/empty-HTML → halve that engine's rate for 60 s,
  rotate proxy, retry 2 s → 8 s → 30 s. Three strikes → zone `engine_blocked`; sweep
  continues.
- **Zone state machine**: `pending → running → done | failed | skipped | blocked`,
  persisted after every transition (crash-safe resume).
- **Idempotent dedupe**: `phone last10` → `placeId` → `normalizedName + roundedLatLng`.
- **Checkpoint/resume**: continue `running` + `pending` only; never re-scrape `done`.

### Stage F — Settle (coverage ledger + consolidation)

- Merge zones into one folder (`metadata.zones[]`, `metadata.planId`,
  `metadata.intent`).
- Apply operator filters after merge; record removed counts.
- Ledger write: `state/district/subdistrict × category → lastSweptAt, leads,
  engineFailures, class`.
- Gap report: never-swept districts, stale > 90 days, categories missing in covered
  districts.

---

## 6. Storage

```
server/data/geo/gazetteer.json        states → districts → subDistricts → towns → villages
server/data/geo/aliases.json          colonial names, renames, transliterations
server/data/geo/pincodes.json         PIN → { state, district, subDistrict, town }
server/data/taxonomy/brands.json      brand + aliases + models + categoryHints + roles
server/data/taxonomy/expansions.json  product keyword → dealer/shop/supplier variants
server/data/taxonomy/learned.json     auto-learned products, categories, brands, queries
server/db/master/plans/<planId>.json  frozen SweepPlan (immutable, what actually ran)
server/db/master/coverage.json        the ledger (per zone × category)
server/db/user_sessions/master/       the resulting folders (unchanged)
```

Gazetteer node:

```json
{
  "id": "ap:guntur:tenali",
  "state": "Andhra Pradesh",
  "district": "Guntur",
  "subDistrict": "Tenali",
  "subDistrictKind": "mandal",
  "towns": [{ "name": "Tenali", "class": "tier3", "wards": ["Morrispet", "Gandhinagar"] }],
  "villages": ["Angalakuduru", "Kollipara"],
  "pincodes": ["522201", "522202"],
  "aliases": ["Tenali Mandal", "Tenali Taluk"],
  "lat": 16.24, "lng": 80.64
}
```

Backfill from `universalGeoCluster` indexes + `indiaGeoIndex` cache +
`server/data/locations_memory.json`. No new paid data source required for v1.

---

## 7. API surface (master + shared suggest)

All master routes sit under `/api/master` behind `x-workspace-scope: master`;
`Cache-Control: no-store` is already set on that router.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/suggest?q=gra&field=category` | shared: grouped `Products · Brands · Services · Categories` |
| `GET` | `/api/suggest?q=gun&field=place` | shared: grouped `State · District · Mandal · City · Village · PIN` |
| `GET` | `/master/geo/resolve?scope=district&name=Guntur` | `ResolvedPlace` + zones + warnings + confidence |
| `POST` | `/master/intent` | `IntentProfile` for a free-text query (brand/product/expansion/roles) |
| `POST` | `/master/sweep/plan` | **dry run**: zones scored, engines, workers, ETA, leads, cost |
| `POST` | `/master/sweep/start` | body `{ planId, filters }`; rejects stale plans |
| `GET` | `/master/sweep/:id` | per-zone live board |
| `POST` | `/master/sweep/:id/pause` \| `/resume` \| `/stop` | operator control |
| `POST` | `/master/sweep/:id/retry` | re-queue `failed` + `blocked` only |
| `GET` | `/master/coverage?state=AP&district=Guntur&category=plumbers` | ledger view |
| `POST` | `/master/coverage/next` | "what should I sweep next" (top 10 gaps) |

`POST /master/sweep/plan` contract (what the UI renders):

```json
{
  "planId": "plan_mabc123",
  "intent": { "kind": "brand_product", "brand": "AMD", "product": "graphic card",
              "expansions": ["graphic card dealer", "computer hardware shop"],
              "excludeRoles": ["brand_office"] },
  "resolved": { "scope": "district", "name": "Guntur", "state": "Andhra Pradesh" },
  "zones": [
    { "id": "ap:guntur:tenali", "name": "Tenali", "kind": "mandal", "class": "tier3",
      "score": 78, "expectedLeads": 41, "engines": ["serp", "maps", "justdial"],
      "freshnessDays": null }
  ],
  "summary": {
    "zones": 56, "zonesThin": 18, "workers": 4, "machineBudget": 4,
    "etaSeconds": 1740, "expectedLeads": 1280, "credits": 1280,
    "directoryQueries": 8
  },
  "warnings": [
    "18 mandals are village-class; expect under 10 leads each.",
    "JustDial will run once per city (8 cities), not once per mandal.",
    "\"graphic card\" was expanded to 5 dealer phrases."
  ]
}
```

---

## 8. UI blueprint (master app + client)

| Component | What the user sees |
|---|---|
| `IntentBar.jsx` | category/product/brand field with grouped suggestions + "search literally" row |
| `GeoIntelligenceBar.jsx` | place/coverage field with grouped State→District→Mandal→City→Village→PIN suggestions and zone counts |
| `SweepPlanSheet.jsx` | dry-run sheet: zone list by score, workers, ETA, expected leads, cost, expansion list, warnings |
| `SwarmBoard.jsx` | live zone tiles: class, leads, status colour, retry |
| `CoverageLedger.jsx` | state→district→mandal heat map of last-swept dates + "next best sweep" |
| `EngineStatusBoard.jsx` | green/red health chips for every engine and external API, worker budget, last run, last error |
| `MasterCommandCenter.jsx` | launcher becomes **3 steps**: pick place + intent → review plan → start swarm |
| Client `SearchConsole.jsx` | same `IntentBar` + advanced filter drawer (4.7) |

Interaction rules:

- **No sweep without a plan.** Start lives inside the plan sheet.
- **Every field is a combobox**, never a validator. Typing always works.
- Show what was understood: `Understood: AMD · graphic card · Hyderabad · city`.

---

## 9. Phases

### P0 — Visibility (2 days)
- Shared `/api/suggest?field=category|place` built on `searchSuggest` +
  `universalGeoCluster` + `indiaGeoIndex`.
- Master `IntentBar` + `GeoIntelligenceBar` (**fixes "Coverage Scope shows no
  suggestions"**); free typing everywhere.
- Plan sheet v0: zone list + counts + warnings.
- **Engine & API status board**: `GET /api/scrape/engines/status`, green = ready /
  rows returned, red = missing key or last run failed, amber = returned zero rows.
- **Zone granularity policy**: district = all mandals, mandal = all villages, state =
  all districts + major mandals, with explicit caps.

**Accept:** typing `gun` in Coverage Scope shows `Guntur · District · 56 mandals`;
typing `xyzzy` still shows "Search literally" and runs; a red engine chip names the
exact missing key or last error.

### P1 — Intent + planning (4–6 days)
- `intentEngine` + `brands.json` + `expansions.json`; `generic` gains `indiamart` for
  product intents.
- `sweepPlanner`: zone scoring, class priors, engine matrix, budget, `machineBudget`,
  directory collapse.
- `POST /master/sweep/plan` + `planId` snapshot; `start` consumes a plan.
- Advanced filter set (4.7) in master + client.

**Accept:** `AMD graphic card in Hyderabad` → 14 zones, 4 engines, 5 expansions, dealers
only; `Guntur district + plumbers` → 56 zones, 8 directory queries.

### P2 — Swarm control (1 week)
- `swarmController`: priority queue, tokens, jitter, adaptive back-off, 3-strike blocking,
  zone state machine, crash-safe resume.
- Per-zone persisted progress; `/master/sweep/:id`; pause/resume/stop/retry.

**Accept:** kill the engine mid-sweep → resume skips `done` zones; lead count equals the
sum of zone yields.

### P3 — Coverage memory (1 week)
- Ledger writes + `/master/coverage` + `/coverage/next`; staleness-aware scoring.

**Accept:** sweep Tenali today → planning Tenali again shows "swept today" and sorts last.

### P4 — Calibration (ongoing)
- Replace class priors with measured `leadsPerZone` per class/category/state.
- Seasonality for wedding/event categories (Nov–Feb, Apr–Jun).
- Brand/model coverage grows from real queries (log unmatched tokens monthly).

**Accept:** after 20 sweeps, tier3 estimate error under ±30%.

---

## 10. India-specific acceptance tests

| # | Test | Expected |
|---|---|---|
| 1 | Resolve `Guntur` as district | 56 mandals, Andhra Pradesh, confidence ≥ 0.9 |
| 2 | Resolve `Tenali Tehsil` | same node as `Tenali Mandal` |
| 3 | Resolve `522001` | Guntur city → mandal → district |
| 4 | `Bengaluru` vs `Bangalore` | identical zone set |
| 5 | `Trivandrum` | Thiruvananthapuram |
| 6 | `Nagar` (ambiguous) | 3+ candidates, requires district/PIN |
| 7 | `graphic card in Hyderabad` | product intent, IndiaMART included, 5 expansions |
| 8 | `AMD graphic card in Hyderabad` | brand_product, dealers only, brand office excluded |
| 9 | `RTX 4090 dealer` | model token matched, no unrelated "4090" noise |
| 10 | `Asian Paints dealer Guntur` | brand + place split, paint shops returned |
| 11 | `xyzzy` | runs as `unknown` with a literal-search warning |
| 12 | Coverage Scope field `gun` | grouped suggestion with mandal count |
| 13 | District sweep of Guntur, `plumbers` | 56 zones, **8** JustDial queries, not 56 |
| 14 | Village-class zone, `chemical suppliers` | expected ≤ 10, flagged thin, still included |
| 15 | 429 on Maps in one zone | that zone blocked after 3 strikes; sweep completes |
| 16 | State sweep of Kerala | 14 districts, ETA reflects workers |
| 17 | Same sweep twice in a week | second plan marks zones fresh, sorts last |
| 18 | Phone dedupe across 56 mandals | one row per last-10-digit mobile |
| 19 | District sweep of Guntur | 56 zones = **all mandals**, zero village rows enumerated |
| 20 | Mandal sweep of Tenali | every village in the mandal (9), not a 10-village sample |
| 21 | State sweep of Andhra Pradesh | all districts + major mandals, cap stated if reached |
| 22 | Engine board with a missing `NVIDIA_API_KEY` | DeepSeek chip is **red**, message names the key |
| 23 | Engine board after a failed Maps run | Maps chip is **red** with the last error; other chips stay green |
| 24 | `tamarind dealers` in Visakhapatnam | suggestion rows = wholesaler / trader / market / supplier |
| 25 | `old tv repair shops` in Hyderabad | repair intent → TV repair service / service centre, not showroom dealers |
| 26 | Two successful `tamarind` runs | the third keystroke shows a **LEARNED** row with the run count |
| 27 | Zero-lead query | is remembered as an attempt but never promoted into the dictionary |
| 28 | Any unknown product (`industrial valves`) | runs literally and gets generic dealer/shop/supplier expansions |

---

## 11. Risks and mitigations

| Risk | Why it matters in India | Mitigation |
|---|---|---|
| Gazetteer staleness | districts split/rename frequently | aliases + `renamedFrom` + yearly refresh; never hard-delete nodes |
| Unbounded product vocabulary | lakhs of local product names | generic expansion rule (`dealer/shop/supplier/wholesale`) + monthly unmatched-token log |
| Brand ambiguity | "Bajaj" = auto + electricals + finance | brand record carries `categoryHints`; disambiguate by product token |
| Brand offices polluting dealer lists | corporate HQs rank high on SERP | `entityRole` + default exclude for brand intents |
| Proxy cost | residential proxies are the only reliable route | per-engine budgets, adaptive back-off, cost in plan sheet |
| Ban waves | directories tighten limits without notice | 3-strike zone blocking, engine circuit breaker |
| Machine limits | client laptops are 4–8 GB | `machineBudget` from free RAM, default 4 |
| Estimate drift | priors are guesses until measured | P4 calibration, published ±error |
| Legal/ToS | public listing data | public data only, polite rate limits, no login-walled sources |

---

## 12. Immediate next three commits

1. `feat(suggest): shared grouped suggestions for category, product, brand and place`
   → `GET /api/suggest`, `IntentBar`, `GeoIntelligenceBar` (fixes the empty Coverage
   Scope dropdown).
2. `feat(intent): brand + product expansion engine`
   → `server/src/services/intentEngine.js`, `taxonomy/brands.json`,
   `taxonomy/expansions.json`, IndiaMART added for product intents.
3. `feat(sweep): plan-first master sweep`
   → `server/src/services/sweepPlanner.js`, `POST /api/master/sweep/plan`, plan snapshot,
   `SweepPlanSheet.jsx`.

Then P2 (`swarmController` + live board), then P3 (`coverageLedger`).

---

## 13. Definition of done

The master command center is "intelligent" when the operator can:

1. type three letters and see the right state/district/mandal with zone counts, or the
   right brand/product with dealer expansions;
2. type **anything** — a product, a brand, a typo, a PIN — and never be blocked;
3. press **Plan** and see every zone, score, engine, worker count, ETA and expected leads
   before spending a single request;
4. press **Start** and watch zones fill in, with failures isolated and retryable;
5. open **Coverage** and know exactly which districts are stale or never swept;
6. hand a client a district-wide folder without ever re-scraping the same shop twice.
