# Accuracy & Experience Master Plan

**Scope:** national + international scraping, every administrative scope
(city / district / state), in both the Client Command Center and the Master
Command Center — plus the white-theme UI/UX and landing-page redesign.

**Rule for this document:** every claim is either *verified in code* or marked
**target**. Nothing is described as working because it was intended to work.

---

## 0. How to read this

| Section | Answers |
|---|---|
| 1 | What is actually broken today, with evidence |
| 2 | What "accurate" means numerically |
| 3 | The request-to-lead pipeline |
| 4 | Location accuracy work (the core of your ask) |
| 5 | Engine fleet: making every engine genuinely work |
| 6 | Record accuracy: phones, emails, dedupe, quality |
| 7 | UI/UX: white theme, buttons, colour, motion |
| 8 | Landing page specification |
| 9 | Speed and reliability budgets |
| 10 | Verification gates and the live test matrix |
| 11 | Phased delivery, sprint by sprint |
| 12 | Honest limits |
| 13 | What was already delivered in this pass |

---

## 1. Audit findings (verified, not guessed)

These were found by reading the code and running probes. Each one is a real
accuracy defect, not a style issue.

### 1.1 Geocoder anchored sweeps on streets and buildings

`server/src/utils/olaMaps.js` requested **one** Nominatim result
(`limit: 1`) and accepted it without checking what kind of feature it was.

Probe, before the fix:

```
"Slough, Berkshire"  -> Berkshire Avenue, Slough Trading Estate  [street]
"Slough, Berkshire"  -> East Berkshire Magistrates' Court        [courthouse]
```

A UK sweep would have been centred on a trading estate. Worse, the result was
cached **forever** under the query string, and empty results were cached too, so
one rate-limited moment permanently disabled a location.

**Impact:** every country, every scope, Client and Master.

### 1.2 Master district/state sweeps did not exist outside India

`/master-sweep` and `/master-sweep/preview` called `buildScopeZones()` only.
That function is gazetteer-driven and returns `null`/generic data for foreign
places:

```
district | Oakland County, Michigan -> zones=8  resolved=city
state    | Texas                    -> zones=8  resolved=city
```

A Master operator asking for a county sweep silently received an eight-phrase
city sweep, labelled as a city sweep. There was no `buildCountrySweepPlan` in
the codebase at all, despite being referenced in earlier notes.

### 1.3 Country engine bundles over-promised

`enginesForCountry()` ignored each source's `countries` field, so the UI
advertised 17 engines for the US while the job planner only ever ran ~10:

```
US bundle (before): openstreetmap, maps, google-local-finder, weddingwire,
web-discovery, web-contact, social, yellowpages, yelp, bing-places,
tripadvisor, wikidata-businesses, social-dork-intl, cylex, trustpilot,
freeindex-uk, goldenpages-ie
```

`freeindex-uk` is UK-only, `goldenpages-ie` is Ireland-only, and `social` is
India-gated in the planner. The engine board therefore showed engines that
could never return a row.

### 1.4 Containment rings were India-tuned

`sweepReachKm()` is a fixed table:

```js
{ mandal: 22, city: 26, district: 140, state: 800 }
```

Applied to a UK district (often 15–30 km wide) that is 5× too generous; applied
to Texas it is 40 % too small. County sweeps either leaked neighbouring
counties or truncated the county they were asked to cover.

### 1.5 Bing was queried with a market hint that was ignored

`searchBing()` sent `&mkt=en-US&cc=US`. Served from an Indian edge node, Bing
answered a US query with unrelated summer-travel results. The plain URL returns
correct results. There was also no second search index when Bing returned
nothing.

### 1.6 Web Discovery relevance was too weak (fixed earlier)

`categoryStems("photographers")` produced `photographe`, matching neither
"photographer" nor "photography". Already corrected, with a regression test.

---

## 2. What "accurate" means (acceptance thresholds)

Accuracy is measured per run, not described. A run is accepted only when all of
these hold.

### 2.1 Location accuracy

| Metric | Threshold | How it is measured |
|---|---|---|
| Anchor correctness | 100 % | Resolved place must be the administrative/settlement unit the operator named. Street/POI anchors are flagged `precision != settlement` and shown in the run log. |
| Out-of-area leakage | **0 %** | Every kept lead with coordinates must pass containment against the run's own reach. Rejected rows go to *Out of Bounds*, never silently dropped. |
| Country purity | **100 %** | A non-India run may not contain a `+91` phone, `gl=in`, an Indian admin term, or an Indian-only engine's row. |
| Admin labelling | ≥ 95 % | Kept leads carry the correct state/province and district/county for their coordinates. |
| Zone coverage | ≥ 90 % of planned zones dispatched | `zones_dispatched / zones_planned`, visible in the run summary. |
| Duplicate share | ≤ 3 % | Same business appearing twice after the golden-record merge. |

### 2.2 Contact accuracy

| Metric | Threshold |
|---|---|
| Phone passes libphonenumber-style validity for the target country | 100 % |
| Mobile share of Indian leads | ≥ 60 % |
| Leads with at least one contact channel (phone / website / email / address) | ≥ 90 % |
| Emails that are syntactically valid and not a placeholder | ≥ 95 % of claimed emails |
| Website reachability (HTTP 200 on root) | ≥ 90 % of claimed websites |

### 2.3 Engine health

| Metric | Threshold |
|---|---|
| Engines advertised for a country == engines that can dispatch | 100 % |
| Engines returning rows without an error in a live probe | ≥ 80 % of enabled |
| Blocked sources | 100 % visible and labelled, never retried in a loop |
| Median time to first lead | ≤ 6 s |

### 2.4 Performance

| Metric | Threshold |
|---|---|
| Client city run (25–100 zones) | 60–240 s |
| Master district run (150–250 zones) | 6–15 min |
| Master state run (600–700 zones, India) | 35–70 min |
| Browser contexts alive at once | ≤ configured cap, never unbounded |

---

## 3. The pipeline (what has to be right, in order)

```
request (category, location, scope, country)
   │
   ├─ 1. Country resolution      explicit UI country wins; text is fallback only
   ├─ 2. Geocode the anchor      ranked Nominatim + relaxation + Photon fallback
   ├─ 3. Zone planning           India: gazetteer │ World: taxonomy + lattice
   ├─ 4. Engine bundle           country bundle ∩ enabled ∩ category gate
   ├─ 5. Dispatch                turbo-burst + queued workers, bounded concurrency
   ├─ 6. Extraction              per-engine parser, country-aware phone rules
   ├─ 7. Containment             reach / boundary check on every write path
   ├─ 8. Golden record           dedupe, merge, quality score, carry-forward
   └─ 9. Folder + store          one artifact, visible provenance
```

Every defect in section 1 is a break in steps 1–4 or 7. That is why the fixes
below are ordered by pipeline position, not by file.

---

## 4. Workstream A — Location accuracy

### A1. Geocoder that understands granularity — **DELIVERED**

`server/src/utils/olaMaps.js`

- Request five candidates (`limit: 5`, `addressdetails: 1`, `accept-language: en`).
- Rank them (`rankNominatimMatches`):
  - settlement / administrative boundary → +30
  - exact head-segment name match → +25
  - each administrative tail present → +8
  - `place_rank` 14–22 (city/town/village/suburb) → +12
  - country/continent (`place_rank ≤ 4`) → −14, postcode/street (`≥ 26`) → −7
- Accept a landmark (street/POI) **only** when the operator typed that exact
  landmark name *and* its address confirms the town.
- Progressive relaxation (`queryLadder`): `"Slough, Berkshire"` →
  `"Slough, Berkshire"`, `"Slough"`. A relaxed hit must be a settlement whose
  name is the head segment.
- Return `precision` (`administrative`, `city`, `street`, `none`) so the run log
  and the UI can show what the anchor really is.
- Versioned cache (`GEO_CACHE_VERSION`), old entries pruned on load, misses no
  longer cached.

Verified:

```
Slough, Berkshire   -> Slough, England, United Kingdom        [administrative]
Troy, Michigan      -> Troy, Oakland County, Michigan, US     [administrative]
Benz Circle, VJA    -> Benz Circle, MG Road, Vijayawada, IN    [street, landmark accepted]
Chebrolu, Guntur    -> Chebrolu Mandal, Guntur District, AP    [administrative]
```

**Remaining (A1b, target):** when `precision` is not a settlement, surface a
non-blocking warning in the search console: *"Anchored on a landmark inside
Vijayawada"*, with the resolved display name.

### A2. Administrative taxonomy per country

`server/src/utils/internationalAdminUnits.js` already holds curated taxonomies
for IN, US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, DE: level names, dial codes,
phone regexes, sample sweeps and curated child territories.

**Gap:** it stops at 12 countries while the app offers 245.

**Plan (target):**

1. Generate a generic taxonomy for the remaining 233 countries from the same
   ISO source that produced `countries.js`: `stateLabel`, `districtLabel`,
   `subdistrictLabel` default to *State / Province*, *District / County*,
   *City / Locality*, with dial code and currency from the ISO table.
2. Override the ~40 countries where the vocabulary is materially different
   (JP prefecture, FR département, IT provincia, ES provincia, BR estado,
   MX municipio, NG LGA, KE county, PH province, ID kabupaten, TH amphoe,
   VN huyện, PK tehsil, BD upazila, LK divisional secretariat).
3. Expose `adminForCountry()` through `/api/sources` (already wired) so the UI
   labels every scope in local vocabulary.

**Acceptance:** selecting any of the 245 countries shows a scope selector whose
labels match that country's real administrative vocabulary, and no Indian term
(“mandal”, “tehsil”) appears outside India.

### A3. Zone planning — three planners, one contract

| Country | Scope | Planner | Output |
|---|---|---|---|
| India | city / mandal / district / state | `sweepScopePolicy.buildScopeZones` | Exhaustive named zones from the gazetteer (619 k villages) |
| World | city / town | `internationalGeo.resolveInternationalZones` | Named commercial sectors + 5×5 coordinate lattice from the real bbox |
| World | district / county / state | **`countrySweepPlan.buildCountrySweepPlan`** | Curated child territories when known, else a lattice over the administrative bbox, labelled `coverage.mode` |

`buildCountrySweepPlan` — **DELIVERED** (`server/src/services/countrySweepPlan.js`):

- Geocodes the territory with the country filter (no Tamil Nadu for “Troy”).
- Uses curated children when the taxonomy knows them
  (`Orange County, CA` → Irvine, Anaheim, Santa Ana, Huntington Beach,
  Newport Beach, Fullerton; `Greater London` → its boroughs).
- Otherwise builds a centre-out lattice over the real administrative bounding
  box and **labels it `sampled`** with the spacing in kilometres.
- `deep` expands every zone into a 3×3 lattice.
- Returns `reachKm` derived from the real extent, so containment matches the
  territory instead of an India constant.
- Returns the same object shape `/master-sweep` already consumes, so no route
  rewrite is needed.

Verified:

```
district | Orange County, CA        -> 6 zones  curated   reach 20 km
district | Oakland County, Michigan -> 25 zones sampled   reach 38 km
state    | Greater London           -> 8 zones  curated   reach ~34 km
state    | Texas                    -> 36 zones sampled   reach 938 km
city     | Troy, Michigan           -> 32 zones lattice   reach 20 km
```

**Remaining (A3b, target):** enumerate real settlements for a state instead of a
sampled lattice, using the keyless Wikidata SPARQL endpoint already used by
`engine-wikidata-businesses`:

```sparql
SELECT ?place ?placeLabel ?coord WHERE {
  ?place wdt:P31/wdt:P279* wd:Q486972 .   # human settlement
  ?place wdt:P131* ?state .               # inside the state
  ?place wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

That upgrades `coverage.mode` from `sampled` to `exhaustive` for states in
every country, keyless, and is the single biggest remaining coverage win.

### A4. Containment that matches the territory — **DELIVERED**

- `isInsideSweepArea()` now accepts `reachKm`.
- The orchestrator threads `plan.reachKm` into the live write guard, the
  Master zone containment pass and the final coordinate pass.
- India keeps its boundary-based district containment unchanged.

**Acceptance:** a UK district sweep keeps rows inside that district's real
extent and rejects a Manchester business; a Texas state sweep does not truncate
at 800 km.

### A5. Admin labelling of every kept lead

**Target:** after containment, reverse-label each lead that lacks a state or
district:

1. Use the engine's own address first.
2. Else reverse-geocode with Nominatim (`/reverse`, cached by rounded
   coordinate to ~100 m) and map `address.state` / `county` / `city`.
3. Else inherit from the zone the lead was found in.
4. Never invent a label.

Budget: reverse lookups are capped per run (e.g. 150) and run in the background
after the folder is already usable.

### A6. Scope matrix (the thing you asked for, explicitly)

| Country | Client: city | Client: district | Master: district | Master: state |
|---|---|---|---|---|
| IN | Gazetteer city zones | Mandal/district zones | Full district boundary | All districts × mandals |
| US | Named sectors + 5×5 lattice | County children / lattice | Curated or lattice, `reachKm` | Sampled lattice → Wikidata upgrade |
| GB | Postal town + lattice | Borough children | Curated boroughs | County children / lattice |
| CA | City + lattice | Census division | Curated or lattice | Province lattice |
| AU | Suburb + lattice | LGA children | Curated LGA | State lattice |
| AE | Community + lattice | Municipal sector | Emirate children | Emirate lattice |
| SG | Planning area + lattice | Region children | Planning areas | Region children |
| IE | Town + lattice | County children | Curated counties | Province children |
| NZ | City + lattice | Territorial authority | Curated districts | Region lattice |
| ZA | Suburb + lattice | Metro/district | Curated metros | Province lattice |
| DE | Quarter + lattice | Kreis | Curated cities | Bundesland lattice |
| Other 233 | City + lattice | Lattice over bbox | Lattice over bbox | Sampled lattice |

Every cell must be exercised by the verification matrix in section 10.

---

## 5. Workstream B — Engine fleet

### B1. Honest country bundles — **DELIVERED**

`server/src/services/sources/registry.js`

- `enginesForCountry()` now requires an **enabled** source that actually serves
  that country (any source implementing the engine, so YellowPages.ca is not
  dropped because YellowPages.com is listed first).
- `social` removed from the international bundle (it is India-gated); the
  international stack uses `social-dork-intl`.

Result:

```
IN 10 | US 14 | GB 14 | CA 14 | AU 14 | AE 11 | SG 12 | IE 11 | NZ 11 | ZA 11 | DE 9 | JP 9
```

**Acceptance:** the engine board and the dispatch plan are the same list. A test
asserts `enginesForCountry(c)` equals the set of engines the planner queues for
a representative category.

### B2. Engine contract

Every engine must declare, in one place:

```
id, label, countries, access (open-api | public-html | blocked | untested),
categoryGate (all | wedding | hospitality | product | local-service),
expectedRowsPerZone, timeoutMs, failureMode (retry | cooldown | stop)
```

The planner reads the contract; the health board reads the contract; the UI
reads the contract. No engine-specific `if` inside the orchestrator.

### B3. Engine-by-engine status and required fix

| Engine | Countries | Access | Current behaviour | Required work |
|---|---|---|---|---|
| OpenStreetMap | all | open-api | Works; Overpass mirrors + cooldown | Keep `overpass.osm.ch` last; add per-country place filters |
| Google Maps | all | public-html | Works, country-aware `gl`, phones parsed in Node | Add reverse-label pass; keep 0,0 guard |
| Google Local Finder | all | public-html | Works; CAPTCHA surfaced honestly | Detect consent wall earlier; pivot to Maps within 2 s |
| Web Discovery | all | public-html | Bing + **DuckDuckGo fallback (new)** | Verify DDG `uddg` unwrap; add result-quality scoring |
| Web Contact | all | public-html | Reads `/contact`, `/about`, JSON-LD | Add `tel:`/`mailto:` scan before DOM text |
| JustDial | IN | public-html | Works (turbo-burst) | Keep India-only gate |
| WeddingBazaar | IN | public-html | Wedding categories only | Gate by `categoryGate` |
| WeddingWire | IN/US/CA/GB/AU | public-html | Wedding categories only | Add non-wedding no-op test |
| Mandap | IN | public-html | Wedding categories only | Gate by `categoryGate` |
| YellowPages (US/CA/AU/NZ/AE/SG/MY/ZA) | per-site | public-html | Runs; some sites challenge | Per-site cooldown; mark challenged site blocked for 24 h |
| Yelp | US/CA/AU | public-html | Frequently challenged | Keep; never retry-storm; report `blocked` |
| Bing Places | all | public-html | Works | Add country `cc` only via plain URL |
| TripAdvisor | all | public-html | Hospitality only | Add `categoryGate: hospitality` |
| Wikidata | all | open-api | Works | Also use it for state settlement enumeration (A3b) |
| Social Dork Intl | all | public-html | Works | Relevance filter by city token |
| Cylex | GB/AU/CA/AE/SG/US | public-html | Works | Country subdomain map |
| Trustpilot | 8 markets | public-html | Low yield (reviews) | `categoryGate: brand`; drop from auto for local services |
| FreeIndex | GB | public-html | Works | GB-only gate (already in planner) |
| GoldenPages | IE | public-html | Works | IE-only gate (already in planner) |
| Google SERP | all | blocked | Disabled | Keep visible and disabled |
| Brave | all | public-html | 429 | Explicit selection only |

**Acceptance:** a live probe per engine records `{ok, rows, ms, blocked}` and the
health board matches it exactly.

### B4. Dispatch and concurrency

- Turbo-burst (Tier 0) runs the direct-HTTP engines immediately: JustDial (IN),
  OpenStreetMap, Web Discovery, Wikidata, Trustpilot.
- Queued workers run the browser engines with a bounded pool; contexts are
  warmed one at a time.
- Zone fan-out is capped by `etaModel.liveBrowserSlots()`.
- Each engine has a timeout and a cooldown; a blocked engine is parked, not
  retried in a loop.

**Target:** expose `zonesPlanned`, `zonesDispatched`, `zonesCompleted`,
`rowsPerEngine` in the run summary so “all engines ran” is observable, not
assumed.

### B5. Enrichment chain

1. Engine row (name, address, phone if present).
2. Website read (`engine-web-contact`): JSON-LD → `tel:`/`mailto:` → visible text.
3. Deep profile (`deepProfileService`) for high-value leads.
4. Streaming enricher updates the card live.

**Rule:** enrichment may add contacts; it may never change the lead's country or
location identity.

---

## 6. Workstream C — Record accuracy

### C1. Phones

- Parse with the lead's own country; reject a number whose parsed country
  differs from the target market.
- India: never force `+91` on a foreign number (already fixed).
- Keep the raw string alongside E.164 for auditability.
- Mobile-first export ordering for India.

### C2. Dedupe and golden record

Merge key, in priority order:

1. Normalised phone (E.164) + country.
2. Normalised domain + business-name similarity ≥ 0.9.
3. Normalised name + 150 m coordinate proximity.

Merge policy: keep the richest field per attribute, keep every source in
`provenance[]`, never downgrade a verified phone to an unverified one.

### C3. Quality score

`quality = f(contact channels, coordinate validity, address completeness,
source trust, country match)`, 0–100. The carry-forward guard already rejects
below 35 with no contact channel; this pass adds the score to the lead card so
the operator can sort by it.

---

## 7. Workstream D — UI/UX (white theme, one button language)

### D1. Token system

One token file (`whiteTheme.css`) is the only place colours are defined:

```
surface        #ffffff      page          #f8fafc
ink            #0f172a      ink-soft      #334155      ink-muted   #64748b
line           #e2e8f0      line-strong   #cbd5e1
accent         #10b981 (emerald)   accent-ink #047857
info           #3b82f6      warn          #f59e0b      danger      #ef4444
radius         10 / 14 / 20 px
shadow-1       0 1px 2px rgba(15,23,42,.06)
shadow-2       0 8px 24px rgba(15,23,42,.08)
```

**Rule:** no hardcoded hex outside the token block. `v2.css` currently contains
~660 hardcoded colours; the white layer overrides them by selector. The target
is to *replace* those literals with tokens in `v2.css` itself so the theme is
not a patch on a patch.

### D2. Button system (one component, five variants)

| Variant | Use | Surface | Text |
|---|---|---|---|
| `primary` | the one main action per screen | emerald | white |
| `secondary` | alternative action | white + 1px line | ink |
| `ghost` | toolbar / row action | transparent | ink-muted → ink on hover |
| `danger` | destructive | white + red line | red |
| `link` | inline navigation | none | accent |

Same height (36 px), same radius (10 px), same 12.5 px/600 label, same focus
ring (2 px accent at 35 %), same disabled state (40 % opacity, no pointer).
Applied identically in Client and Master.

### D3. Layout and alignment

- 8 px spacing scale only.
- Card headers: 14 px title, 12 px muted subtitle, right-aligned actions.
- Tables: numeric columns right-aligned, text left-aligned, row height 44 px,
  sticky header.
- Every panel is white on the page canvas, 1 px `line` border, `shadow-1`.
- Empty, loading and error states are designed, not accidental.

### D4. Motion (the “smooth” requirement)

- Duration: 120 ms micro, 180 ms panel, 240 ms page.
- Easing: `cubic-bezier(.2,.8,.2,1)`.
- Only `transform` and `opacity` animate; never layout properties.
- `prefers-reduced-motion` disables all non-essential motion.
- No layout shift on data arrival: reserve space for counts and chips.

### D5. Component inventory to convert

Console · search bar · location field · suggestion dropdown · country strip ·
engine board · zone radar · lead table · lead card · folder rail · folder
header · filters · stat tiles · modals (trash, export, confirm) · toasts ·
progress/ETA · map chrome · empty states.

Each must be checked in both apps at 1280, 1440 and 1920 px.

---

## 8. Workstream E — Landing page

### E1. Specification

- **One message:** “Search all the leads in your area.”
- **One primary action:** *Open Command Center*. No search bar on the landing
  page (a search bar that does not search is worse than no search bar).
- **Plain English.** Replace jargon (“land-locked GPS clamping”, “multi-vector
  harvester”) with what the operator gets: real phone numbers, real addresses,
  real emails, in the town they chose.
- **All countries, visibly.** India first and marked *Home*, then the ten
  featured markets, then a searchable grid of all 245 countries with flags.
- **Logo once**, in the header only.
- Sections: hero → how it works (3 steps) → markets → coverage proof →
  questions → final call to action.

### E2. Acceptance

- Headline exact.
- No `<input>` in the hero.
- Every one of the 245 countries is reachable from the page.
- India is visually distinct and labelled Home.
- Lighthouse: performance ≥ 90, accessibility ≥ 95, no layout shift on load.

---

## 9. Speed and reliability budgets

| Item | Budget |
|---|---|
| Turbo-burst first lead | ≤ 2 s |
| First browser lead | ≤ 8 s |
| Nominatim calls per run | ≤ zones + 2, cached 24 h |
| Photon calls per run | ≤ 4 |
| Browser contexts | ≤ pool cap, warmed, reused |
| Reverse geocode | ≤ 150 per run, background |
| Retry policy | 1 retry with 1.5 s backoff, then cooldown |

---

## 10. Verification gates

### 10.1 Automated (must pass before any commit)

| Gate | What it proves |
|---|---|
| `scripts/verify/engines-world.test.cjs` | Country bundles, no India leakage |
| `scripts/verify/admin-divisions.test.cjs` | Admin vocabulary per country |
| `scripts/verify/scope-engines.test.cjs` | Scope → engine plan |
| `scripts/verify/carry-forward-quality.test.cjs` | Quality guard |
| `scripts/verify/web-discovery-relevance.test.cjs` | Relevance stemmer |
| **new** `geocode-ranking.test.cjs` | Settlement beats street; relaxation works |
| **new** `country-sweep-plan.test.cjs` | Curated vs sampled, `reachKm`, no null plans |
| **new** `containment-reach.test.cjs` | Reach overrides India constants |

### 10.2 Live matrix (must be run manually, results recorded)

Countries: **IN, US, GB, CA, AU** minimum; **AE, SG, IE, NZ, ZA, DE** for the
featured markets.

For each country × scope × workspace:

1. Choose a real category and a real place.
2. Record: anchor precision, zones planned/dispatched, leads kept, phones,
   mobiles, emails, websites, out-of-bounds rejections, country-purity check,
   duplicate count.
3. Pass only if section 2 thresholds hold.

### 10.3 Country-purity check (runs on every folder)

```
assert no phone starts with +91 when country != IN
assert no lead.country != selected country
assert no zone name contains mandal/tehsil/taluk when country != IN
assert no engine in the run is India-only when country != IN
```

---

## 11. Phased delivery

### Phase 0 — Correctness (in progress, mostly delivered)

| Item | State |
|---|---|
| Geocoder ranking + relaxation + versioned cache | **done** |
| Country engine bundles honest | **done** |
| Web Discovery Bing fix + DuckDuckGo fallback | **done** |
| `buildCountrySweepPlan` for international Master | **done** |
| Containment `reachKm` threaded | **done** |
| Wire the country plan into `/master-sweep` + `/preview` | **next** |
| `node --check` + gates green | **next** |

**Exit:** a US county Master sweep returns county-scoped zones and rejects
out-of-county leads.

### Phase 1 — Coverage

1. Wikidata state settlement enumeration (A3b).
2. Admin labelling pass (A5).
3. Engine contract table (B2) and category gates.
4. Per-engine live probe and health board alignment.

**Exit:** ≥ 80 % of enabled engines return rows in the live probe; state sweeps
are exhaustive for the 11 featured markets.

### Phase 2 — White theme completion

1. Replace hardcoded colours in `v2.css` with tokens (mechanical, reviewable).
2. Button system component, applied in both apps.
3. Table, card, modal, toast, empty-state alignment pass.
4. Motion pass and reduced-motion support.

**Exit:** no hardcoded hex outside the token block; both apps visually identical
in shared surfaces; screenshots at three widths reviewed.

### Phase 3 — Landing page

1. Rewrite copy and structure per section 8.
2. All-245 country grid with flags, India Home.
3. Performance and accessibility pass.

**Exit:** landing spec acceptance in section 8.2.

### Phase 4 — Verification and hardening

1. New automated gates.
2. Full live matrix.
3. Performance budget review.
4. Documentation update and commit.

---

## 12. Honest limits

- **“No rate limits” is not achievable.** Public sites rate-limit and sometimes
  block. The design maximises legal throughput with caching, concurrency and
  dedupe, and reports a block instead of bypassing it.
- **Overpass availability varies by network.** Only `overpass.osm.ch` responded
  from this machine; it returns nothing outside Switzerland, so OSM coverage is
  thin here even though the code is correct.
- **YellowPages, Yell, Yelp, BBB** actively block non-browser clients. They stay
  listed as blocked.
- **Google Local Finder** sometimes serves a CAPTCHA. The run pivots to Maps and
  says so.
- **International state sweeps** are sampled grids until the Wikidata upgrade
  lands. The UI must say “sampled”, not “complete”.
- **Playwright browser build** must match the package version (`chromium-1248`
  for Playwright 1.64.1). Until it is installed, no browser engine can launch —
  this is an environment prerequisite, not a code defect.

---

## 13. Delivered in this pass

| File | Change |
|---|---|
| `server/src/utils/olaMaps.js` | Ranked multi-candidate geocoding, query relaxation, precision reporting, versioned cache, no caching of misses |
| `server/src/services/countrySweepPlan.js` | **New.** International Master city/district/state planner with curated territories, sampled lattice, `reachKm`, honest coverage metadata |
| `server/src/services/sources/registry.js` | Country-aware `enginesForCountry`, `social` removed from the international bundle |
| `server/src/scrapers/engine-web-discovery.js` | Bing plain URL (no `cc`/`mkt`), DuckDuckGo HTML fallback with `uddg` unwrap, shared block detection |
| `server/src/services/omniSearchOrchestrator.js` | `reachKm` accepted by containment and threaded through all three write paths |

### 13.1 Delivered after the first pass

| File | Change |
|---|---|
| `server/src/services/scopeEngines/base.js` | JustDial is now a **base job in every Indian scope**, Client and Master. Client city/mandal runs get one query at the settlement; district/state plans add the town swarm on top. |
| `server/src/services/scopeEngines/district.js`, `state.js` | JustDial swarm caps removed (`Infinity`). Every resolved town is queried, excluding the base location so it is never fetched twice. |
| `server/src/services/omniSearchOrchestrator.js` | Removed the duplicate JustDial turbo-burst that would have run alongside the scope job. |
| `server/src/services/sweepScopePolicy.js` | All `CAPS` are `Infinity`. District/state/city planners no longer truncate. |
| `server/src/utils/universalGeoCluster.js` | India zone resolution returns every zone. Removed the district 120, mandal village 12/100, state 200 and city 400/250 truncations. |
| `server/src/services/countrySweepPlan.js` | No zone cap either: state 10×10, district 7×7, city 5×5 lattices, `deep` expansion. |
| `server/src/routes/scrape.js` | `/master-sweep` and `/master-sweep/preview` branch to `buildCountrySweepPlan` for non-India countries. |
| `server/src/services/sources/registry.js` | `enginesForCountry` is country-aware; `social` is India-only; `makeHasEngine` auto mode now only disables `brave`. |
| `client/src/v2/components/CountryFlagStrip.jsx` | Picker lists **all 245 countries**, not the 11 featured markets. India stays first and marked Home. Label reads “All 245”. Synced to Master. |
| `client/src/v2/LandingV2.jsx` | Rewritten: headline “Search all the leads in your area.”, no hero search bar, one button into the Command Center, simple English, all 245 countries with flags, single logo. Synced to Master. |
| `client/src/v2/landingRetro.css` | **New.** White Game Boy landing theme: CSS device with a DMG-green screen, moulded cards, pressable buttons. |
| `client/src/v2/retroEmboss.css` | **New.** White Game Boy theme for both dashboards and both command centers: hard 3D emboss, green screen search console, moulded panels, chunky controls. Imported last in both `App.jsx` files. |

### 13.2 Live evidence recorded in this pass

| Check | Result |
|---|---|
| India engine bundle | 10 engines including `justdial`, `social`, `weddingbazaar`, `weddingwire`, `mandap` |
| JustDial, Client, Tenali | **14** live Tenali photography businesses with validated phones |
| JustDial, Master, Vijayawada | **43** live caterer rows, all with source `JustDial` |
| US purity, Troy MI | **41** rows, **0** `+91` numbers, all `+1`, city reads “Troy, Michigan, United States” |
| Guntur district preview | **242** zones, `capped: false` |
| Andhra Pradesh state preview | **667** zones, `capped: false` |
| Oakland County, US preview | **49** zones, `capped: false`, `mode: sampled`, term “County” |
| Country picker | **245** countries listed with flags, India first as Home |
| Gates | `engines-world` 16/16 · `admin-divisions` 24/24 · `scope-engines` PASS · `carry-forward-quality` PASS · `web-discovery-relevance` PASS · `local-brain` 28/28 · `country-sweep-plan` PASS · `csv-export-rule` PASS on a live session |
| Builds | `client` and `master` both build clean |

### 13.3 Still open

- International state sweeps remain **sampled** until the Wikidata boundary
  upgrade lands. The UI says “sampled”, never “complete”.
- YellowPages / Yell / Yelp / BBB still block non-browser clients and stay
  marked blocked.
- The Electron shell, the credit flow and the WhatsApp QR need a real desktop
  session to verify; they cannot be exercised in this sandbox.
