---
name: sovereign-lead-harvester
description: Authoritative operational guide and architecture contract for the Zero-Chromium Sovereign Lead Harvesting & Contact Enrichment System across 5 High-Revenue Sovereign Nations (IN, US, GB, AU, AE). Covers Frontend-to-Backend Search & City Auto-Correction, 23 Generic Umbrellas vs. Particular Niches, Progressive Zone Streaming, Multi-Engine Harvesting, Async Contact Enrichment, and Hierarchical Folders.
---

# Sovereign Lead Harvester & Contact Enrichment Engine

The Sovereign Lead Harvester is an ultra-fast, zero-Chromium lead extraction and contact enrichment system built to sweep every municipal zone and specialty sub-category across **5 Active Revenue Markets (`IN` Main, `US`, `GB`, `AU`, `AE`)** without memory bloat, stalls, or cross-category pollution.

---

## 1. Core Architectural Principles & Strict Contracts

1. **Unified Frontend <-> Backend Canonical Search & City Auto-Correction Contract**:
   - Every search submitted in `OmniSearchBar.jsx` (`shared/data/searchNormalize.js`) or received by `/api/scrape/auto`, `/api/scrape/start`, `/api/omni`, and `/api/search/suggest` (`server/src/services/queryNormalizer.js`) MUST normalize through deterministic rules:
     - Split natural-language prefixes (`find`, `all`, `top`, `best`), delimiters (`in`, `near`, `at`, `,`, `around`), merged prepositions (`hospiotalsin hyderbad`), and bare city suffixes (`restraunts banglore`).
     - Correct misspellings in **both Category and City** across all 11 countries via Damerau-Levenshtein + alias maps (`hospiotals -> hospitals`, `hyderbad -> Hyderabad`, `vijaywada -> Vijayawada`, `pharmcy -> pharmacies`, `implnts -> dental implants`, `lndn -> London`).
     - Recognize compound sector queries joined by `&`, `/`, or `and` (e.g., `Dentists & Dental Hospitals` -> `dental` umbrella; JustDial splits `&` segments when resolving `ncatid`).

2. **The Exact Semantic Integrity & Exemplar Mandate ("What You Search Is What You Get")**:
   - **What we search MUST BE what we get** across ALL categories, industries, and 11 sovereign nations.
   - **The Universal Exemplar Principle**: Every domain purity rule applies systematically to **ALL** categories, not only the specific example sector named.
   - **Universal Purity Gate (`passesUniversalPurityGate` in `server/src/taxonomy/classifier.js`) & Web-Only Spam Guard**:
     - Strips trailing/inline landmark phrases (`opp. X Hospital`, `near Y Restaurant`, `beside Z School`) from `lead.name` before matching.
     - Keeps spam/adult/Bing `ck/a` filtering **strictly inside web/social pagination (`serp/index.js`, `socialDork/index.js`, `tls_engine.py` Bing SafeSearch `&adlt=strict` / `&kp=1` / `&safe=active`)** — NEVER applies broad safe walls to Google Maps (`gosom`, `gmapDirect`), JustDial, YellowPages, or OSM, and preserves valid structured container-category leads (`Hospital`, `Clinic`, `Doctor`) so high-yield specialty clinics without exact keywords in their brand name are never depreciated.
     - NEVER echoes search query into `lead.category` across engines (`category` stays strictly authentic; query lives in `matchedSubcategory`), rejects dummy repeating digits (`phoneUtils.js`), keys dedupe by `name + phone` (`store.js`), and propagates head nouns across compound queries (`expandCompoundSearchPhrases`, `/api/search/classify`).
   - **Implants Safeguard**: Bare `implants` or `implant center` resolves strictly to `dental implants` and rejects hair, breast, or cochlear implants.

3. **Generic Umbrella (`23` Sectors) vs. Particular Niche Taxonomy & Every-Zone Sweep**:
   - Both Frontend (`shared/data/taxonomyClient.js`) and Backend (`server/src/taxonomy/umbrellas.js`) maintain **exact 1:1 parity across 23 Generic Umbrellas**:
     1. `hospitals` (all 15 hospital specialties: *Multi-Speciality, Super Speciality, General/Nursing Homes, Dental Hospitals, Orthopedic, Eye/Ophthalmic, Maternity/IVF, Pediatric, Cardiac, Oncology, Neurology, ENT, Gastro, Urology, Trauma/Emergency*)
     2. `clinics` | 3. `dental` | 4. `schools` | 5. `colleges` | 6. `contractors` | 7. `lawyers` | 8. `restaurants` | 9. `hotels` | 10. `automotive` | 11. `salons` | 12. `real_estate` | 13. `financial` | 14. `manufacturing` | 15. `wholesale` | 16. `pharmacies` | 17. `diagnostics` | 18. `retail` | 19. `it_software` | 20. `logistics` | 21. `fitness` | 22. `events` | 23. `veterinary`.
   - **Generic Umbrella Mode**: Expands into ALL nation-localized specialty sub-categories and sweeps every municipal zone (`Ward 1..N`) while permitting all specialties inside that sector.
   - **Particular Niche Mode**: Single-specialty searches (`orthopedic hospital`, `dental implants`, `eye hospital`, `plumber`, `pest control`) expand only tight synonyms, split `&`/`/` clauses as `OR` terms, require meaningful stems on descriptive queries, and reject cross-specialty results.

4. **Progressive Multi-Engine Streaming & Strict Resource Protection (Zero Chromium)**:
   - Never launch Chromium/Puppeteer/Playwright browsers for scraping.
   - `HardwareSafetyEngine` monitors RAM (`os.freemem()` / `os.totalmem()`) and caps parallel zone workers (`<= 3` active Gosom processes at once so Go binaries never contend on CPU/rate limits).
   - **Disable `-email` inside Gosom (`extractEmail: false`, `-depth 8/10`, `-c 8`) + Direct `tbm=map` Paginated RPC (`:5003/scrape/gmap`)**: Each zone streams **Wave 1** (`queries[0..3]`, `depth=8, -c 8` -> `~6s`) + **Wave 2** (`queries[4..]`, `depth=10, -c 8`) alongside parallel `tbm=map` offsets (`0..80`, `gl`/`hl` per country) extracting structured phones (`tel:` + `0`-prefixed + E.164), websites, coordinates, and `place_id`.
   - Simultaneously per zone: JustDial Mobile JSON (`pn=1..20`, harvesting `row[15]` + `row[23].m/.t/.l` + `row[51].contactdial` plus TLS web fallback), paginated YellowPages TLS (`US`/`CA`), QLever OSM Commercial POIs (`contact:phone`/`contact:mobile`/`email`), paginated Deep Web SERP (`serp`), and Instagram + Facebook + LinkedIn Social Dorks (`socialDork` with active Python 3.11 `:5003/fetch`).

5. **Accurate Phone Normalization, Async Two-Tier Enrichment & Canonical 1-Folder-Per-Search**:
   - **Shared `phoneUtils.js` & `client/src/utils/phoneIndia.js`**: Correctly promote Google Maps Indian `0`-prefixed 11-digit mobiles (`098203 70428`, `072074 86771`, `083096 22358`), `+(91)-...`, and `+91` numbers to verified Mobiles (`+91 XXXXX YYYYY` + `wa.me/91...`), decode `%20` in `tel:`/`mailto:` hrefs (`contactExtractor/index.js`), and reserve `FIXED_LINE` strictly for real STD prefixes (`040`, `080 2...`, `011`, `022`, `084552`, etc.).
   - **Preserve `mapsLink`, `zone`, & `matchedSubcategory` in `contract.js` / `store.js` / `leadSource.js`**: Build fallback Maps search URLs whenever missing so `Google Maps Link` is never empty.
   - **Two-Tier Async + On-Demand Enrichment (`leadEnricher.js` + `contactExtractor/index.js`)**:
     - **Fast Website Lane (32 workers)**: Crawls homepage + up to 4 contact/doctor subpages (`/contact`, `/contact-us`, `/about`, `/doctors`, `/team`, `/branch`) for JSON-LD (`telephone`, `email`, `sameAs`), `tel:` / `mailto:`, spaced Indian mobiles (`+91 98480 12345`), WhatsApp, Instagram, Facebook, LinkedIn, YouTube, with Chrome TLS Sidecar fallback (`:5003/crawl/website`).
     - **Web/Social/Place Hunt Lane (16 workers)**: Queries `:5003/lookup/gmap-place`, `lookupBusinessInJustdial` (`row[23]`/`row[51]`), and Bing/DDG Chrome TLS for missing contacts, plus on-demand `POST /api/leads/deep-enrich-batch` (`Deep Enrich Page`) and single-vendor `Deep Enrich` (`DossierActionStrip.jsx`).
   - **Canonical 1-Folder-Per-Search Architecture (`folderStore.js` + `ScrapedFoldersModal.jsx`)**: Strictly **1 Root Folder per unique `(query, city, country)`** (`fld_<query>__<city>__<country>`), consolidating duplicate runs into `sessionIds[]` and pruning `0`-lead aborted folders. Inside each Root Folder live 4 nested sub-folder trees: `Sub-Categories`, `Wards / Zones`, `Contact Segments`, and `Sweep Runs`.

6. **Table-Only Cockpit, Code Modularity & Liquid Pearl UI Mandate**:
   - `CommandCenter.jsx` renders a full-width, Table-only Cockpit (`LeadsTableView.jsx`, no `Split` or `Map` panes) and strictly keeps every `.js` / `.jsx` file `<= 500` lines (`check-lines.mjs` + `server` check).
   - **Liquid Pearl Design Language**: `#faf9f6` pearl ivory canvas, `#d97706` / `#f59e0b` gold accent, `#0284c7` sapphire, `#10b981` emerald, `#e11d48` rose; zero indigo/violet classes (`check-parity.mjs`); zero testimonials, star-rating claims, or superlatives (`check-copy.mjs`).

---

## 2. Supported Sovereign Nations & Directory Matrix

| Code | Nation | Maps Engine | National Directory | Fallback & Enrichment |
| :--- | :--- | :--- | :--- | :--- |
| **IN** | India | Gosom Go (`depth 8/10`, `-c 8`) | JustDial Mobile JSON (`pn=1..20`) | QLever OSM POI + SERP + IG/FB/LI Social Dork + 32w Site Crawl |
| **US / CA** | USA & Canada | Gosom Go (`depth 8/10`, `-c 8`) | YellowPages TLS (`:5003`) | QLever OSM POI + SERP + IG/FB/LI Social Dork + 32w Site Crawl |
| **GB / IE** | UK & Ireland | Gosom Go (`depth 8/10`, `-c 8`) | QLever OSM Commercial POIs | 5-Subcat SERP (`:5003`) + IG/FB/LI Social Dork + 32w Site Crawl |
| **AU / NZ** | Australia & NZ | Gosom Go (`depth 8/10`, `-c 8`) | QLever OSM Commercial POIs | 5-Subcat SERP (`:5003`) + IG/FB/LI Social Dork + 32w Site Crawl |
| **DE / FR** | Germany & France | Gosom Go (`depth 8/10`, `-c 8`) | QLever OSM Commercial POIs | Native 5-Subcat SERP + IG/FB/LI Social Dork + 32w Site Crawl |
| **AE / SG** | UAE & Singapore | Gosom Go (`depth 8/10`, `-c 8`) | QLever OSM Commercial POIs | 5-Subcat SERP (`:5003`) + IG/FB/LI Social Dork + 32w Site Crawl |

---

## 3. Master Fleet Separation vs. Client City Zones (All 11 Nations)

1. **Strict Architectural Isolation**:
   - **Client (`client/src/v2/` + `server/src/geo/`)**: Unchanged city/urban-ward scraping (`KNOWN_CITIES`, `dynamicZones.js`, `/api/scrape/auto`, `/api/geo/resolve`).
   - **Master Fleet (`master/src/v2/` + `server/src/master/`)**: Dedicated routes (`/api/master/geo/labels`, `/api/master/geo/suggest`, `/api/master/geo/validate`, `/api/master/geo/resolve`, `/api/master/scrape/start`), UI (`MasterOmniSearchBar.jsx`, `MasterTerritoryExplorer.jsx`, `useMasterZones.js`, `useMasterStream.js`, standalone `master/src/v2/CommandCenter.jsx`), and registry (`adminRegistry.js`, `masterGeoEngine.js`, `masterOrchestrator.js`).
2. **District & State Only Enforcement + Execution Order**:
   - Master rejects micro-localities and bare neighborhoods with parent District/State suggestions across all 11 countries (`IN`: State -> District -> HQ Wards -> Towns -> Mandals/Taluks; `US`: State -> County/Borough -> Hub Wards -> Towns -> Townships; `GB`: Region -> County -> Market Towns -> Parishes; `AU`: State/Territory -> Region/LGA -> Suburbs/Shires; `CA`: Province -> Regional Municipality -> Townships; `DE`: Bundesland -> Landkreis -> Städte/Gemeinden; `FR`: Région -> Département -> Arrondissements/Communes; `AE`: Emirate -> Region -> Sectors; `SG`: Planning Region -> Planning Areas; `NZ`: Region -> District -> Towns; `IE`: Province -> County -> Municipal Districts).
   - **District sweep**: Always executes **`[1] HQ Urban Wards` (full Client-grade depth) -> `[2] Towns & Municipalities` -> `[3] Mandals / Sub-Divisions`**, bounding leads to the full district/state `bounds` box so towns/mandals are never clipped by tight HQ bounds.
   - **State sweep**: Executes Capital/Major District first, then every District (`HQ Wards -> Towns -> Mandals`).
3. **SSE `sessionId` Isolation & Placeholder Email Guard**:
   - Both Client and Master `CommandCenter.jsx` track `activeSessionIdRef` and drop `vendor` SSE events from prior/superseded runs (`targetSid !== activeSessionIdRef.current`).
   - `contactExtractor/index.js`, `leadEnricher.js`, and `tls_engine.py` reject documentation/placeholder emails (`john@email.com`, `robert@broofa.com`, `@broofa.com`, `@email.com`, `@crazygames.com`, `@test.com`, `@yourdomain`, `@company.com`).

---

## 4. Mandatory Service vs. Product Store / Mall / B2B Differentiation Rule

Whenever ANY category, sub-category, scraper rule, or taxonomy expansion is discussed or implemented across any of the 11 sovereign countries:
1. **Explicit `intentType` Differentiation**: Every query and category MUST resolve cleanly into **`service`** (Plumbers, Electricians, Doctors, Lawyers, Cleaning, Repair Contractors), **`store`** (Product Retail Stores, Showrooms, Supply Shops, Pharmacies, Shopping Malls — including bare **Product queries** like `PVC pipes`, `bathroom fittings`, `ceramic tiles`, `laptops`, `car tyres` that auto-resolve to stores selling that product), **`venue`** (Hospitals, Schools, Colleges, Hotels, Restaurants, Labs, Gyms), or **`b2b`** (Manufacturers, Wholesale Distributors, Stockists).
2. **Zero Store Leakage Into Service Searches**: Service expansions (`tradeExpansions.js`, `classifier.js`, `index.js`) and `osmPoi/index.js` must NEVER mix retail pipe/hardware/sanitary supply stores into Service contractor searches (`Plumbers`, `Electricians`, `HVAC`). `passesUniversalPurityGate` enforces `isServiceStoreMismatch` uniformly across engines.
3. **Live Animated Header Category Atlas Sync**: Both Frontend headers (`CommandCenterHeader.jsx` and `LandingNavbar.jsx`) host the animated `CategoryAtlasDrawer` synced live to `GET /api/search/taxonomy`. Every new category or localized sub-category added anywhere MUST appear in both Backend taxonomy and Frontend `shared/data/` so the UI Atlas updates automatically.
