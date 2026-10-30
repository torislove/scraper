# 02 — Data Pipeline, Geo Intelligence, Queue & Persistence Audit

**Auditor:** pipeline-auditor (read-only audit; only file written is this report)
**Repo:** `C:\Users\manoj\Desktop\gomandap-scraper` (no git, Windows, Node/Express + Python sidecars + React)
**Scope:** `server/src/utils/*`, `server/src/config/*`, `server/src/models/*`, `server/db/*`, `server/data/*`, all routers except the orchestration deep-dive in `scrape.js` (engine-auditor owns that; `scrape.js` was read only for lead writes, folder persistence and its own endpoint surface, plus the endpoints it registers).
**Method:** full read of 13 utility modules, 5 config modules, 3 models, 12 routers, entrypoint `server/index.js`, plus the vendor-writing paths in the scraper engines; JSON stores were parsed and counted programmatically (Node) to derive field unions, node counts and payload sizes. No installs, no server started, no network calls.

---

## 0. Executive verdict

| Area | Verdict | One-line reason |
|---|---|---|
| Persisted data model | **Weak** — a flat "scraped row" schema, not a vendor CRM/identity model | 39 observed fields, 4 competing scoring formulas, no per-field provenance, no contact-point model, no enrichment/verification state machine (`§1`) |
| Deduplication | **Ad-hoc and untested** — the reusable dedupe module is dead code; each engine re-implements exact-match rules | `deduplicator.js` is imported but never called (`scrape.js:32`); live keys are `mapsLink`/`name` string equality (`engine-google-places.js:635,987`) (`§2`) |
| Geo / location intelligence | **Best asset in the repo, but disconnected from the live scrape path** | 27.4 MB `india_villages.json` (36 states / 633 districts / 5,920 mandals / 619,290 villages) is indexed, but the omni scraper ignores radius/grid and uses 13 hard-coded metro zone lists; the golden-angle grid is dead code (`§3`) |
| Extraction & enrichment | **Heuristic only; the "AI" layers are dead or mislabelled** | Website extraction is a 5 s regex scrape of the homepage; `verifyWithAI` never called; `@xenova/transformers` not installed; NVIDIA comment says "DeepSeek-V4-Pro" but calls `meta/llama-3.3-70b-instruct`; two engines call a non-existent `addVendor()` and silently drop leads (`§4`) |
| Queue | **In-memory with a lossy debounced JSON snapshot** | No job IDs/status/attempts, no retries, no dead-letter, running jobs are not persisted, 10-min timeout rejects but does not cancel work, a single omni session aborts the global signal and clears the queue (`§5`) |
| API surface | **~85 route definitions, ~140 URL forms, zero authentication/authorization, no versioning** | `server/index.js:39–162` mounts no auth middleware after `POST /api/auth/login`, which returns a user object but no token (`auth.js:12–27`) (`§6`) |
| Persistence | **Single-process, whole-file JSON store; not safe for production or scale** | Non-atomic `fs.writeFile`/`writeFileSync` of the entire array; corrupted file silently becomes `[]`; no backups; Mongo layer is entirely dead (`§7`) |
| Overall pipeline readiness for a "world-class rewrite" | **Not shippable as-is** | Data model, dedupe and persistence need replacement, not patching; geo assets can be salvaged (`§8`, `§9`) |

---

## 1. Actual persisted data model

### 1.1 Stores on disk (measured)

| Store | Size / records | Written by | Shape |
|---|---|---|---|
| `server/data/scraped_vendors.json` | 46 KB / **31 leads** (current) | `dbAdapter.saveVendors` (every engine) | one flat JSON array of lead rows |
| `server/data/out_of_bounds.json` | 3.8 KB / **5 leads** | `dbAdapter.saveOutOfBoundsVendor` | flat array, 13 fields |
| `server/db/user_sessions/<userId>/*.json` | **27 files in 14 dirs, 3.36 MB, 1,960 lead copies** | `scrape.js:924`, `scrape.js:1221`, `sessionRoutes.js:50` | `{id,userId,category,location,timestamp,leadCount,phoneCount,metadata,leads[]}` |
| `server/data/jobs.json` | 2 B = `[]` | `queue.js:35` | pending jobs only |
| `server/data/public_users.json` | 2 B = `[]` | `dbAdapter.savePublicUsers` | SaaS users with credits |
| `server/data/employees.json` | 121 B / 1 record | `employees.js`, `dbAdapter` | **plaintext password** |
| `server/data/users.json`, `server/data/admin.json` | 150 B / 48 B | `dbAdapter.js:32–41`, `auth.js:36` | **plaintext admin password** |
| `server/data/forwardGeocodeCache.json` | 174 KB / 786 keys | `olaMaps.js:19–29` | geocode cache (no TTL) |
| `server/data/locationCache.json` | 847 KB / 4,448 keys | `geoAI.js:8–16` | reverse-geocode cache at 0.01° grid |
| `server/data/resolved_hierarchies.json` | 82 KB / 106 keys | `intelligentExtractor.js:24–30` | AI/hierarchy cache |
| `server/db/locations_memory.json` | 148 KB / 372 keys | `locations.js:33–42`, `scrape.js:542–550` | mandal → village list |
| `server/db/india_villages.json` | **27.4 MB** | static asset | see `§3` |

**There is no per-lead index, no stable identity field, and no schema version.**

### 1.2 Observed lead record (field union)

Derived from all 1,960 persisted session leads plus the write paths of every engine (39 fields observed; ~52 possible incl. code-only paths).

| Field | Type / example | Written by (evidence) | Provenance quality |
|---|---|---|---|
| `id` | `place_1792582559571cprt48` | `engine-google-places.js:628,875`; `engine-google-serp-local.js:328` | **Bad**: `Date.now()+random`, not the Google place ID; new ID on every re-scrape |
| `name` | business name | all engines | raw page text; often polluted with SEO title (`"Making Memories by Madhu I Best Wedding Photography in Chilakaluripet"`) |
| `category` | query string, e.g. `Event Photographers` | all engines, passed through from request | **Not a taxonomy**; observed values include `"Narasaraopet, Andhra Pradesh"` and `"rental cars"` (session store scan) |
| `city` | `"Narasaraopet Wedding Photography"` (sample) | `engine-google-places.js:643,903,995` | **Polluted**: orchestrator passes zone name as `location` (`scrape.js:816–817`), so `city` becomes a query vector |
| `address` | one free-text string | all engines | no components; often only street fragment (sample: `"1st floor, Bommarillu Apartments, 103"`) |
| `pincode` | `"522008"` or `""` | extracted by regex from address (`engine-google-places.js:630–631,956–957`) | not validated against state/district |
| `latitude`,`longitude` | numbers | parsed from Maps URL (`extractCoords`) or engine data | no accuracy/precision/source field; OOB guard uses them |
| `village`,`mandal`,`district`,`state` | strings (`"Polireddy Palem"`, `"Chilakaluripet Mandal"`, `"Palnadu District"`) | `geoAI.reverseGeocode` (`engine-google-places.js:1012–1023`) | cache-rounded to ~1.1 km; values include `"District"`/`"Mandal"` suffixes that do not match the hierarchy DB |
| `phone` | `"+91 97050 00555"` or `"Requires Manual Lookup"` | engines; enrichment callbacks | **sentinel strings used as data** (`Requires Manual Lookup`, `Requires Manual Reveal`, `Obfuscated`) |
| `emails` | `string[]` | serp-local `:379`, deep-enrich `scrape.js:1066` | regex only, no MX/ownership check |
| `email` | first email | same | unverified |
| `secondaryPhone` | `+91 …` | only `engine-google-serp.js:165` (whose persistence path is broken, `§4.6`) | effectively dead |
| `whatsappLink`,`whatsappAvailable` | `https://wa.me/91…`, bool | `engine-google-places.js:669–672`, serp-local `:353–356` | derived (any 10-digit mobile ⇒ "available"); **no opt-in/verification** |
| `website` | URL | engines | no tech-stack/crawl metadata |
| `rating` | 5 (number) or `""` | engines | string/number inconsistency; `engine-deepseek.js:96` **fabricates rating** from an AI score |
| `reviewsCount` | 12 | places/local-finder | no distribution, no review text; `topReviews` is always `[]` in live path |
| `operatingHours` | `"Open 24 hours"` truncated to 150 chars | `engine-google-places.js:885` | unstructured string, no per-day/weekday model |
| `topReviews` | `[]` (always, except deepseek puts a summary here) | — | dead field |
| `logo`,`photo`,`avatar`,`images[]` | URLs | `engine-google-places.js:661–664,892–895` | placeholder `ui-avatars.com` used as "logo" when none found; no attribution/dimensions/licence |
| `instagram`,`facebook`,`instagramFollowers`,`facebookFollowers` | URLs / follower string | places + social engines | followers only from dork snippets; no handle/verified flag |
| `pinterest`,`youtube`,`linkedin` | URLs | only `engine-social-dork.js:116–118` | not populated by main path |
| `matchedKeywords` | `[]` (always) | places/local-finder | dead field |
| `qualityScore` | 0–100 int | 4 different formulas (`§1.4`) | not comparable across engines |
| `tier` | `Diamond`/`Gold`/`Silver`/`Bronze` vs `Premium`/`Standard`/`Basic` | different writers | **inconsistent vocabulary in the same dataset** |
| `verified`,`aiVerified` | booleans | see `§1.5` | conflated semantics; not trustworthy |
| `source` | free text `"Autonomous Cyber Intelligence Matrix"`, `"JustDial"`, `"DeepSeek Python Engine"` | engines | only provenance field; not machine-parseable |
| `strategy` | `deep`/`mandal`/`strict` | places engine | not validated |
| `scrapedAt` | ISO string | engines | no `updatedAt`, no per-field timestamps, no `lastSeenAt` |
| `sessionId` | string | all engines | soft link to folder; overwritten on duplicate match (`engine-google-places.js:1044`) |
| `emails[]`, `pushed`, `pushedAt`, `assignedTo`, `assignedAt`, `crmStatus`, `crmNotes`, `crmLastUpdated`, `allPhones`, `outOfBoundsDistance` | various | `vendors.js:157–158,176–178,197–198`; `engine-social-dork.js`; OOB guard | CRM/assignment fields **not in the main read schema**, only patchable through routes; not typed |

No `_v`, `createdAt`, `updatedAt`, `schemaVersion`, `ownerId` (tenant), `canonicalId`, `duplicateOf`, `enrichmentStatus`, `verificationStatus` is written by the scrapers.

### 1.3 Session / folder model

- **Single source of truth for scraping** is the flat `scraped_vendors.json` array; `sessionId` is the only grouping key.
- At the end of an omni run the orchestrator writes a **full copy of that session's leads** to `server/db/user_sessions/<userId>/<sessionId>.json` (`scrape.js:892–926`, `status: completed`), and does it again on master stop (`scrape.js:1184–1226`, `status: aborted`).
- `POST /api/sessions/save` (`sessionRoutes.js:28–56`) lets the client write an arbitrary session document (again containing full lead payloads).
- Consequence: every lead can exist in 2–3 places (global store + session vault copy + client-saved copy). There is no `folderId` on persisted leads — `folderId` exists only in the dead Mongo `Vendor` schema (`models/Vendor.js:49`) and as an `enrichLead` default (`enricher.js:64`) that is never called. **"Folders" in the UI are just session files/directories.**
- Out-of-bounds leads live in a separate file with a reduced schema (`out_of_bounds.json`, 13 fields) and are deduped by `name` (`dbAdapter.js:179–183`), so unrelated same-name businesses collapse.

### 1.4 Quality / confidence scoring — four incompatible implementations

| Location | Formula | Tier vocabulary | Used? |
|---|---|---|---|
| `engine-google-places.js:11–64` | phone 35 + whatsapp 15 + address 10 + website 15 + rating 15/8 + reviews 5 + email/social 5, floor 10 | Diamond ≥85 / Gold ≥70 / Silver ≥50 / Bronze | **Yes** — main writer (also imported by local-finder `:19`) |
| `engine-deepseek.js:17–32` | phone 30 + address 10 + website 20 + rating>4.2 15 + reviews>50 5 + email 10 | Premium ≥80 / Standard ≥50 / Basic | Yes (DeepSeek engine) |
| `utils/enricher.js:6–42` | phone 30 + "WhatsApp compatible" 15 + website 15 + rating 15/10 + reviews 10/5 + photos 5 + verified 5, base 15 | n/a | **Dead code** — `enrichLead` imported at `scrape.js:33`, never called |
| `scrape.js:1076–1082` (deep-enrich endpoint) | phone 35 + website 20 + emails 15 + rating≥4 10, base 20 | Premium ≥80 / Standard ≥55 / Basic | Yes, on-demand |

There is **no per-field confidence** and no calibration. Sample evidence: stored lead with `qualityScore: 95`, `tier: "Diamond"`, `verified: false`, placeholder avatar as "logo".

### 1.5 Verification flags are not verification

- `engine-google-places.js:896` — `aiVerified: Boolean(phone && whatsappAvailable)`; `:997` — `verified: false` always at insert; `:905` sets `verified` only in the detail-page path.
- `engine-deepseek.js:99–100` — `verified: true, aiVerified: true` **unconditionally**.
- `vendors.js:79` — `PUT /api/vendors/:id` sets `verified: true` on any client edit (unauthenticated).
- `aiParser.verifyWithAI` — the only real "AI verification" function — **has zero call sites** (only imported at `engine-google-places.js:8`; grep finds no invocation).

### 1.6 Gap vs a world-class vendor schema

| Capability (world-class) | Current state | Gap |
|---|---|---|
| **Identity**: stable provider ID (Google `place_id`/CID), canonical UUID, source-native IDs, parent/branch relationship | random `place_<epoch><rand>`; Maps URL in `mapsLink` contains the CID (`0x…:0x…`) but is never parsed out | **Missing** canonical identity, branch/parent, `duplicateOf`, `canonicalId` |
| **Contact points** with type (phone/email/whatsapp/website), label (sales/support/owner), value, verified flag, verification method/date, source | one `phone` (sentinel strings), one `email`, `whatsappLink` derived, no labels/methods | **Missing** normalized contact-point array and verification provenance |
| **Address components** + geocode | single `address` string, regex `pincode`, flat lat/lng, reverse-geocoded village/mandal/district/state | **Missing** house/street/locality/landmark/plus-code/country, geocode accuracy + source, validated pincode |
| **Geo** | lat/lng; no coordinates for many verification paths, no accuracy, no boundary membership artifact | Missing geo confidence/accuracy/boundary id |
| **Category taxonomy** | free-text query string copied into `category`; `aiCategory`/`subcategory` exist only in dead Mongo models | **Missing** canonical taxonomy, services/tags/products |
| **Ratings & reviews** | `rating`, `reviewsCount`; `topReviews` always empty; no review volume/text captured in live path | **Missing** rating distribution, review text corpus/volume/last-review date |
| **Hours** | truncated free-text `operatingHours`; no weekly structure/open-now | **Missing** structured hours, timezone, holidays/special hours |
| **Media** | `photo`, `logo` (often `ui-avatars.com` placeholder), `images[]` (usually empty) | **Missing** real logo, image type/dimensions/attribution/licence/gallery |
| **Socials** | instagram/facebook URLs (partial, no handles/followers verified); pinterest/youtube/linkedin only in one dork engine | **Missing** normalized social profiles with handle/verified/follower counts |
| **Website tech** | only `website` URL | **Missing** CMS/tech stack, SSL, mobile-friendly, analytics/pixel, booking URL |
| **Pricing** | `pricingInfo` only in dead Mongo `StagingLead`; no price persisted | **Missing** price range, packages, currency, offers |
| **GST / legal** | none | **Missing** GSTIN, PAN, CIN/legal entity, registration, owner/contact person, established date, employee count |
| **Source & provenance per field** | one free-text `source`, one `scrapedAt`, `sessionId`, `strategy` | **Missing** per-field source URL/method/confidence/timestamp, engine version, extraction chain |
| **Enrichment status** | none; enrichment is fire-and-forget `.then()` | **Missing** `raw → website_enriched → ai_verified → human_verified` state machine, attempts, errors, last attempt |
| **Verification status** | overloaded `verified`/`aiVerified` booleans | **Missing** per-attribute verification (phone/email/GST), verifier identity, method, timestamp |
| **Business status** | none | **Missing** open/closed/permanently closed, temporarily closed, relocated |
| **CRM / ownership** | CRM patch fields exist ad-hoc; no tenant `ownerId` on leads; `userId` in Mongo schema only | **Missing** first-class tenant ownership, assignment history, activity log persisted locally |

**Explicit missing-field list (world-class minimum):** `google_place_id`/`cid`, `canonical_id`, `parent_id`/`branch_of`, `contact_points[]` (type,label,value,normalized,verified,verified_at,verified_by,source,confidence), `emails[]` with role/verified, `whatsapp_opt_in`, `address_components` (house, building, street, locality, sublocality, landmark, city, district, state, pincode_validated, country, plus_code), `geo` (lat,lng,accuracy,source,geohash), `category_taxonomy` (id,path,primary/secondary,confidence), `services[]`, `tags[]`, `rating_distribution`, `review_text_volume`, `last_review_at`, `reviews[]` (snippets), `hours_weekly[]`, `open_now`, `timezone`, `holiday_hours[]`, `logo` (real), `images[]` with metadata, `socials[]` (platform, url, handle, followers, verified), `website_tech[]`, `price_range`, `packages[]`, `currency`, `gstin`, `pan`, `cin`, `legal_entity`, `owner_name`, `established_year`, `employee_count`, `payments[]`, `amenities[]`, `accessibility[]`, `languages[]`, `service_areas[]`, `business_status`, `provenance[]` per field, `enrichment` {status,last_attempt,attempts,errors}, `verification` {status,attributes,verified_by,verified_at}, `dedupe_key`, `duplicate_of`, `tenant_owner_id`, `created_at`, `updated_at`, `schema_version`.

---

## 2. Deduplication

### 2.1 What actually runs

The intended dedupe module is **dead code**: `deduplicator.js` exports `normalizePhone`, `normalizeName`, `generateFingerprint`, `mergeLeadRecords`, `deduplicateBatch` (`deduplicator.js:106–112`), and `scrape.js:32` imports it — but no call site exists anywhere (`grep` over `server/src` finds only the definitions and the import). `enricher.enrichLead` is likewise imported at `scrape.js:33` and never called. Every engine re-implements duplicate checks inline:

| Engine | Dedupe key | Evidence |
|---|---|---|
| Google Places (detail page) | `v.mapsLink === mapsLink \|\| v.name === name` (exact, case-sensitive) | `engine-google-places.js:635` |
| Google Places (feed) | same rule | `engine-google-places.js:987` |
| Google Local Finder (SERP) | existing `name.toLowerCase()` **or** phone digits equality; plus in-run `scrapedResults` name check | `engine-google-serp-local.js:317–324` |
| Places update path | same index; then always re-writes `sessionId`/`scrapedAt` | `engine-google-places.js:1031–1052` |
| DeepSeek bridge | `v.mapsLink === vendor.mapsLink \|\| v.name === businessName` | `engine-deepseek.js:85` |
| Social dork | `v.instagram/facebook/pinterest/youtube/linkedin === profileUrl \|\| v.name === cleanName` | `engine-social-dork.js:91–99` |
| Brave dork / Mandap / Wedding bazaar / WeddingWire / IndiaMart / Scrapy / JustDial | each own `vendors.find(...)` exact name/phone/mapsLink | `engine-brave-dork.js:64–83`, `engine-mandap.js:202`, `engine-justdial.js:110` etc. |
| Out-of-bounds | `id` OR `mapsLink` OR `name` (name ⇒ merges unrelated OOB rows) | `dbAdapter.js:177–190` |
| Staging/vendor "fingerprint" | `fingerprint` field exists in Mongo schema only (`models/Vendor.js:51`); never written | — |

The only canonical-key implementation (`normalizePhone`, `normalizeName`, SHA-1 `fingerprint = sha1(phone:city)` or `sha1(name:city)`) exists in `deduplicator.js:7–45` but is **never used**.

### 2.2 Normalization actually present

- `normalizePhone` (`deduplicator.js:7–16`) strips non-digits, removes `91` prefix on 12-digit and leading `0` on 11-digit; otherwise returns cleaned string unchanged (11-digit landlines are not canonicalized). Used only inside `deduplicator.js`/`enricher.js` dead paths.
- `normalizeName` (`deduplicator.js:21–28`) lowercases, strips non-word chars, collapses whitespace. Not used by live writers.
- Live writers compare `v.name === place.name` (case-sensitive, punctuation-sensitive) and `v.mapsLink === ...` (full URL string). Places `mapsLink` includes volatile query params (`authuser=0&hl=en&g_ep=…&rclk=1`) — see stored sample in `scraped_vendors.json` — so the same place re-scraped in a later session can produce a different URL and evade dedupe.

### 2.3 Fuzzy matching

- **Dedupe has no fuzzy matching at all.** Similarity code exists only for location/typo correction: Fuse.js over 5,876 geo nodes with threshold `0.3` (`intelligentExtractor.js:452–466,479–511`) and a Levenshtein ≤ 3 locality search (`intelligentExtractor.js:133–154,207–231`). `aiParser.verifyWithAI` has a Levenshtein ≤ 1 word match (`aiParser.js:85–103,123–145`) but the function is never called.
- No phonetic (Soundex/Metaphone) matching, no token-set similarity, no address/geo-distance disambiguation, no merge-review workflow.

### 2.4 False-positive / false-negative scenarios (concrete)

| Type | Scenario | Cause |
|---|---|---|
| FP | `"Sai Baba Temple"`, `"SBI"`, `"Barbeque Nation"` across branches/outlets in the same city | `v.name === name` merges distinct businesses (`engine-google-places.js:987`), especially common pan-India brands |
| FP | Two different vendors with the same `mapsLink` after Google serves a generic listing | URL-only key |
| FP | OOB dedupe by name merges unrelated out-of-bounds businesses (`dbAdapter.js:182`) |
| FN | Same business found by Places and by Local Finder/dork with slightly different titles (`"Sri Lakshmi Banquet Hall"` vs `"Srilakshmi Banquet Hall"`) | no normalization/fuzzy, no cross-engine key |
| FN | Same business with different phone formatting (`+91 97050 00555` vs `9705000555`) | exact string compare in most engines (only serp-local compares digits) |
| FN | Same business re-scraped later with changed Maps URL params / renamed listing | full-URL key, no place-ID extraction |
| FN | Lead written by DeepSeek bridge has no `city/mandal/…` and `mapsLink` may be empty | no phone/city fallback key |
| FN | Two engines writing concurrently both pass `findIndex` before either pushes (read-modify-write on the shared cached array) | no lock/unique constraint (`dbAdapter.js:114–161`) |

### 2.5 Determinism & tests

- The live rule set is deterministic **per invocation order** but not stable across runs (URL params, engine order, `scrapedAt`), and results depend on which engine wrote first.
- **No tests.** `server/package.json` `"test": "echo \"Error: no test specified\" && exit 1"`. `server/comprehensive_test.js` is a manual HTTP script that calls endpoints that do not exist (`/api/scrape/social`, `/api/scrape/truecaller`) — stale. No unit/integration tests for dedupe, normalization or fingerprints.

**Verdict:** dedupe is the weakest part of the pipeline relative to its importance; a rewrite should introduce deterministic, geo/phone/name-similarity keys with a merge/review queue and a golden test corpus.

---

## 3. Geo / location intelligence

### 3.1 Data assets (measured)

| Asset | Size | Contents | Shape |
|---|---|---|---|
| `server/db/india_villages.json` | **27.4 MB** | **36 states/UTs, 633 districts (627 unique names), 5,920 sub-districts (5,617 unique names = mandals/tehsils), 619,290 villages** | `[{state, districts:[{district, subDistricts:[{subDistrict, villages:[string]}]}]}]` |
| `server/db/locations_memory.json` | 148 KB / 372 keys | mandal → village arrays learned/curated at runtime | `{"guntur": ["Guntur East", …]}` |
| `server/data/locationCache.json` | 847 KB / 4,448 keys | reverse geocode at 0.01° grid | `{"16.31,80.44": {village,mandal,district,state,country,postcode}}` |
| `server/data/forwardGeocodeCache.json` | 174 KB / 786 keys | forward geocode + bounding box | `{"adilabad, adilabad, telangana": {formattedLocation,lat,lng,boundingbox[],source}}` |
| `server/data/resolved_hierarchies.json` | 82 KB / 106 keys | cached state/district hierarchy (AI + DB) | `{"telangana": {level,stateName,hierarchy:[{districtName,mandals[]}]}}` |
| `server/data/regions.json` | 2.4 KB | legacy AP-only district→mandal map | 26 districts / 139 mandals |
| `utils/universalGeoCluster.js` | 29.4 KB | **13 hard-coded metro cluster lists** (`AUTHORITATIVE_CLUSTERS`, `:5–63`) + **52 zone coordinates** (`ZONE_COORDINATES`, `:142–205`) + 17 category-vector families + universal fallback (`:209–407`) | in-memory |
| `utils/indiaGeoIndex.js` | 15.8 KB | **60 `KNOWN_COORDS`** (`:6–72`), **5 authoritative district→mandal lists (~114 mandals)** (`:75–106`); grows index from `india_villages.json` at runtime (`:116–168`) | in-memory maps: states/districts/subDistricts |
| `utils/gridGenerator.js` | 2.9 KB | golden-angle (phyllotaxis) grid generator | **DEAD CODE** — no call site |
| Live Fuse.js locality index | — | **6,589 nodes total / 5,876 unique** (states + districts + mandals; villages excluded) (`intelligentExtractor.js:412–466`) | Fuse index threshold 0.3 |

### 3.2 Actual administrative hierarchy

```
Country: India
  └─ State / UT ......................... 36
       └─ District ...................... 633 (627 unique names)
            └─ SubDistrict (Mandal/Tehsil) 5,920 (5,617 unique names)
                 └─ Village ............ 619,290
```
There is **no separate city/town node** in the dataset. The app's `city` is either a query token, a mandal name, or (bug) a zone-vector name; `KNOWN_COORDS` maps city → `{district, mandal}` by hand. So the code hierarchy is effectively **state → district → mandal → village**, with "city" being a UI-level alias for mandal/district (`indiaGeoIndex.js:187–200,220–267`).

### 3.3 How a query becomes search points (live path)

1. `POST /api/scrape/omni` (`scrape.js:966–1024`) accepts `query|category|location|radius|gridDensity|enabledEngines|sessionId|userId`, deducts 5 credits if `userId`, and replies immediately; orchestration is queued as `scrapeOmniOrchestrator`.
2. `runOmniSearchOrchestrator` (`scrape.js:698`) **calls `await clearQueue()` first** (`:704`) — flushing other users' pending jobs — then `resolveUniversalZones(baseLocation, category)` (`:714`) and `geocodeLocation(baseLocation)` (`:720`).
3. `resolveUniversalZones` (`universalGeoCluster.js:410–506`):
   - if location matches one of 13 metro clusters (fuzzy `includes` both directions) → returns that cluster's **8–15 fixed neighbourhood zones**;
   - else if it is a **mandal** in `mandalIndex` → returns **5–6 category/landmark query vectors** for that town (e.g. `"Function Halls in X"`, `"Kalyana Mandapam in X"`);
   - else if a **district** → first **12 mandals** only;
   - else if a **state** → first **12 districts** only;
   - else universal fallback → **5–6 vectors** around the raw string.
4. For each zone, the orchestrator uses zone coordinates if present (`ZONE_COORDINATES`, 52 entries) or the forward-geocode cache/`baseGeo` (`scrape.js:796–798`), then queues `scrapeGoogleLocalFinder` with up to **10 pages** (`scrape.js:814–820`).
5. `radius` and `gridDensity` are accepted and logged but **never used** — `generateGridCoordinates` exists twice (`utils/gridGenerator.js:18` and a duplicate in `scrape.js:589`) and has **zero call sites**. `queueMandalJob` (`scrape.js:655`) and `getSubLocations` (`scrape.js:552`), which would implement village-level targeting, are also dead.
6. The district/state hierarchy from `india_villages.json` is used by **other endpoints only**: `/api/location/detect-intent` (`locations.js:240–298`), `/api/scrape/preflight` (`scrape.js:504–519`), `/api/locations/warm-state` (`locations.js:69–176`) and geocoding. `indiaGeoIndex` is loaded/invoked there; `universalGeoCluster` is the only thing the actual scrape uses.

So the advertised "golden-angle zero-blind-spot grid" and "district → all mandals" coverage are **not wired into the scraper**. Coverage is a fixed, small zone list.

### 3.4 Coverage math

| Query type | Zones selected | Listings budget per zone | Max listings per session | Actual observed |
|---|---|---|---|---|
| Metro (13 hard-coded) | 8–15 neighbourhoods | Local Finder: 10 pages ("20 leads/page" per comment, `scrape.js:814`); Places fallback caps at 200 cards (`engine-google-places.js:708`) | **≈ 1,600–3,000** | session samples ≈ 31–200 leads/session (1,960 leads across 27 session files) |
| Mandal / town | 5–6 query vectors | same | ≈ 1,000–1,200 | same |
| District | **first 12 of 20–60 mandals** | each zone is a district-level text query, not per-mandal | ≈ 2,400 | large districts silently partial |
| State | **first 12 districts of 26–33** | each zone is a district-level query | ≈ 2,400 | **e.g. Andhra Pradesh: 14 of 26 districts never searched; Telangana: 21 of 33 never searched** |
| Any other string (pan-India town/locality) | 5–6 raw-string vectors | same | ≈ 1,000–1,200 | no geo anchor, no containment guarantee |
| Village (619,290 available) | **not supported** as a target | — | — | `generateLocalities` can return villages but is only used by warm-state/preflight |

`resolveUniversalZones` uses `lowerLoc.includes(key) || key.includes(lowerLoc)` (`universalGeoCluster.js:420–422`) — a short/partial input (e.g. `"elhi"`, `"d"`, `"banga"`) matches the first authoritative cluster and returns a metro's fixed zones for a wrong location. Conversely `"Guntur district"` matches `guntur` (fine) but any location whose name contains a cluster name (e.g. `"Pune City"`, `"New Delhi"`) is forced into that cluster's zones.

### 3.5 API cost / keys

- **Google Maps/Places scraping:** Playwright stealth (`browserFactory.js`), proxies optional (`proxyManager.js`); no monetary cost but ToS violation and IP-ban risk; no per-domain rate limiting.
- **Ola Maps:** key is hard-coded — `settings.json:3` (`H0NK…`) and a second hard-coded fallback in `olaMaps.js:44`; geocode + autocomplete (`olaMaps.js:60–106,203–223`). Used for forward geocoding and `/api/locations/*`.
- **NVIDIA API:** key hard-coded — `settingsManager.js:7` (`nvapi-…`) and `settings.json:2`; used only for geographic fallbacks (`intelligentExtractor.js:32–58,274–280,356–362,694–700`), model **`meta/llama-3.3-70b-instruct`** (despite comments claiming "DeepSeek-V4-Pro"), timeout 30 s × 3 retries × up to 45 s call timeout, temperature 0.1.
- **Free services:** OSM Nominatim (reverse + search + localities; no rate limiter, violates the 1 req/s policy), Photon, Datamuse (`aiParser.js:31`), DuckDuckGo HTML (`vendors.js:230`, `publicUsers.js:179`), Bing dork.
- **No quotas/cost accounting anywhere**; no request counters per provider, no circuit breakers.

### 3.6 Accuracy & failure modes (geo)

| Failure | Evidence | Impact |
|---|---|---|
| Fixed zone lists for metros; unknown towns fall back to text vectors | `universalGeoCluster.js:410–506` | under-coverage in non-metro India |
| Substring cluster matching misroutes short/partial inputs | `universalGeoCluster.js:420–422` | wrong city's zones silently searched |
| Duplicate mandal names across states: `mandalIndex` last-write-wins, no state disambiguation | `universalGeoCluster.js:102–103,143–151` | wrong district/state attribution |
| Only 60 hard-coded city coords, 5 authoritative mandal lists | `indiaGeoIndex.js:6–106` | everything else relies on network geocode or AI |
| AI fallback can hallucinate districts/mandals (Llama 70B) and is cached permanently | `intelligentExtractor.js:653–717,710–713` | wrong hierarchy persisted in `resolved_hierarchies.json` (106 entries) with no invalidation |
| Static village DB is pre/post-2022 mixed; only 12 AP overrides in cluster module, 5 district mandal lists in index | `universalGeoCluster.js:114–131`, `indiaGeoIndex.js:75–106` | reorganized AP/Telangana districts partially wrong |
| Nominatim geo code calls with no throttle, random UA; forward geocode retries 3× with 1.5 s sleep then **caches a null result forever** | `olaMaps.js:112–195`, especially `:179–183` | 429/ban risk; transient failures permanently poison a location |
| Reverse geocode cache rounded to 0.01° ≈ **1.1 km** then persisted to `locationCache.json` (4,448 keys) — wrong village/mandal near boundaries | `geoAI.js:95–98,123–124` | `village`/`mandal` fields unreliable; suffix mismatch vs hierarchy DB (`"Palnadu District"`) |
| Per-new-coordinate **synchronous** write of the whole 847 KB cache | `geoAI.js:16,124` (writeFileSync) | event-loop stalls during scrape |
| Containment guard depends on coords that may be null; `isListingRelevantToQuery` computed against a zone/`location`, and `city` label is a zone name | `engine-google-places.js:966–983,609–625`; `scrape.js:816–817` | OOB misfiling or wrong `city` grouping |
| Orphaned `geoAI.parseSearchQuery` regex parser assumes `category in village, district` ordering; `village` = first token, `district` = second comma part, no state/city handling | `geoAI.js:29–87` | wrong tokens for normal Indian query phrasing |

---

## 4. Extraction & enrichment chain

### 4.1 Effective chain (what really happens)

```
Google Maps / Local Finder (Playwright)
  → lead row written to scraped_vendors.json (dbAdapter, §7)
  → if website: fastWebsiteExtract(url) [axios+cheerio, 5s, homepage only]
        → emails[], phones[] (tel:), instagram/facebook, logo  (updated by name lookup, fire-and-forget)
  → geoAI.reverseGeocode(lat,lng) [Nominatim, 0.01° cached] on insert (places engine only)
  → SSE event to UI; optional auto-queue of scrapeCrawleeDeep when website && (!phone || !email) (index.js:70–77)
  → background jobs: DeepSeek python sidecar, social dorks, JustDial/WeddingWire/WeddingBazaar/IndiaMart/Scrapy engines
  → "AI verification": NOT RUNNING (see 4.3)
```
No stage has a quality gate that can reject or quarantine a lead; every stage writes directly into the live array. There is no enrichment state per lead, so every re-scrape re-runs extraction.

### 4.2 `fastWebsiteExtractor.js` (the only real contact extractor)

- Fetch: axios GET, 5 s timeout, max 4 redirects, browser UA, **TLS verification disabled** (`rejectUnauthorized: false`, `:6–8`) — MITM risk.
- No `/contact`, `/about`, sitemap or JS rendering — homepage HTML only; no robots.txt check.
- Emails: regex over raw HTML + `mailto:` links, small blacklist (`:55–79`); **no MX/domain validation, no role detection, no confidence**. PNG filtering works only after the regex.
- Phones: only `<a href="tel:">` (`:102–107`); misses plain-text phones and JS-embedded numbers.
- Socials: first instagram/facebook/linkedin link (`:82–108`), filters reels/shares; **no YouTube/Pinterest/WhatsApp**, no handle/follower extraction.
- Logo: `og:image` → apple-touch-icon → first `img*logo` → favicon (`:111–127`), falls back to `google.com/s2/favicons` (`:32–35`); no dimensions/attribution.
- All network failures are swallowed (`:128–130`) → callers cannot distinguish "no contact" from "blocked".
- Result is written back by **matching on `v.name`** (`engine-google-places.js:844–846`), so same-name businesses can receive each other's emails.

### 4.3 AI parser usage — claims vs reality

| Claimed AI feature | Reality | Evidence |
|---|---|---|
| Local DistilBERT zero-shot classifier for category verification | `@xenova/transformers` is **not in `server/package.json` dependencies**; `pipeline` stays `null`; `loadAIModel` never loads; **`verifyWithAI` has no call sites** | `aiParser.js:5–27,105–163`; `server/package.json` deps |
| Keyword synonyms via AI | `getKeywordSynonyms` calls the **Datamuse** public dictionary API, then appends hard-coded South/North-India wedding terms; used by `/api/scrape/keywords` and `/api/scrape/upload` | `aiParser.js:29–83`; `scrape.js:23,484–493,1137` |
| "Intelligent Agent Extractor using Nvidia's DeepSeek-V4-Pro" | `extractData` is **pure regex** for phones/emails, ignores the AI entirely; model comment is wrong | `intelligentExtractor.js:71–109` |
| NVIDIA LLM enrichment | Only used for **geography fallbacks**: `generateNearbyLocations`, `analyzeGeographicScope`, `resolveHierarchy` (model `meta/llama-3.3-70b-instruct`) | `intelligentExtractor.js:32,274–280,356–362,694–700` |
| DeepSeek Python engine ("Infinity Engine") | Sidecar `engine-python.py` is spawned with the NVIDIA key; parses JSON-lines leads; **assigns `verified:true, aiVerified:true` unconditionally and fabricates `rating` = `qualityScore/20`** | `engine-deepseek.js:52–58,85–124` (`:96,:99–100`) |
| AI-verified categories | `category` is copied from the request everywhere | all writers |
| LLM cost | Only geo-fallback calls (~3 prompt types; 30 s timeout, up to 3 retries, 45 s call timeout); no token accounting or budget cap | `intelligentExtractor.js:32–58` |

### 4.4 Dedupe/enricher modules in the chain

`deduplicator.js` and `enricher.js` are imported into `scrape.js:32–33` but **never invoked** (see `§2`). `enricher.js`'s WhatsApp URL, `crmStage`, `folderId`, `sourceEngine` defaults never reach persisted leads. The `enricher.js` scoring formula is dead; live scoring is in the engines.

### 4.5 Quality gates

- Only two hard filters exist: **containment/OOB** (coordinate bounding box or radius, or string containment; misfiles to `out_of_bounds.json`, `engine-google-places.js:609–625,933–983`) and a **strict address text filter** when `strategy === 'strict'` (`:945–954`). Neither validates category or contact quality.
- No max lead age, no duplicate confidence, no minimum-completeness threshold, no human review queue, no ML/noise scoring. `verified`/`aiVerified` are write-time booleans, not gates.
- 1,960 stored session leads for 6 categories/locations pairings imply roughly hundreds of rows of over-collection (SEO-titled listings, aggregator pages); most have empty `email`, placeholder `logo`, `topReviews: []`.

### 4.6 Broken engines / dead extraction paths (pipeline-level)

| Defect | Evidence | Effect |
|---|---|---|
| `engine-google-serp.js` calls `db.addVendor(vendorObj)` — `localDb` exports no `addVendor` | `engine-google-serp.js:7,178`; `localDb.js:39–44` | TypeError swallowed by per-result catch (`:183–185`) ⇒ **every Google SERP lead silently dropped** |
| `engine-justdial.js` calls `dbAdapter.addVendor` — not exported | `engine-justdial.js:122`; `dbAdapter.js:214–230` | error caught at `:128–130`, only logged ⇒ **JustDial engine yields nothing** |
| `engine-google-serp.js` writes through `localDb` (no in-memory cache) while all other engines write through `dbAdapter` (cached array) | `localDb.js:14–24` vs `dbAdapter.js:114–121,158–161` | if ever fixed, `localDb` writes would be **overwritten by stale `dbAdapter` cache** on next flush (two writers, one file) |
| `engine-deepseek.js` python sidecar has no timeout/abort kill | `:52–58,136–144` | hung Python process holds a queue slot; queue timeout only rejects the JS promise (§5) |
| `engine-google-serp-local.js` enrichment updates by lead `id` (good) but places-engine updates by `name` (bad) | `:376` vs `engine-google-places.js:845` | inconsistent identity handling |
| Transformers-based category verification dead | `aiParser.js:105–163` no call sites | `aiVerified` cannot mean "category checked" |

---

## 5. Queue (`server/src/utils/queue.js`)

### 5.1 Job model

A job is a bare tuple pushed into an in-process array (`queue.js:228–234`):

```js
{ taskName: String, args: Array, priority: Number, meta: Object|null }
```
- **No job id, status, createdAt, startedAt, attempts, lastError, result, userId/tenant, cancel token, or idempotency key.**
- Priority is an integer, default 10; the array is re-sorted descending on every `addScrapeJob` (`:230`), i.e. O(n log n) per enqueue.
- Task registry maps names to functions (`:55–60`); 14 engines register tasks (`scrape.js:181–221`).

### 5.2 Scheduling & concurrency

- One `processQueue` loop; re-entrancy guarded by `isProcessing` (`:115–169`). It scans the queue for the first job whose class (Playwright vs HTTP) has a free slot (`:136–149`), splices it out (`:157`), and starts it without awaiting (`:172–192`). Completion re-triggers the loop via `setImmediate(processQueue)` (`:190`).
- Dynamic concurrency based on free RAM (`:73–101`): default **HTTP 8 / Playwright 6**; >40 % free RAM → **16 / 12**; <20 % → **4 / 3**. Playwright jobs are only `scrapeGooglePlaces` and `scrapeGoogleSerp` (`:138`) — notably **`scrapeOmniOrchestrator` is classified as HTTP** even though it spawns/loads the whole swarm (it mostly waits), and *all* Playwright child jobs it queues count separately.
- A second, independent concurrency mechanism exists for `/api/scrape/batch`: `ConcurrencyPool` (`concurrencyManager.js:3–112`) sized `min(max(cores*2,4),12)`, no coordination with queue slots — two throttles can multiply live browser load.
- No per-domain / per-proxy rate limiting; no global browser/tab budget.

### 5.3 Persistence across restarts

- `jobs.json` is written debounced 500 ms (`:33–46`) and read at `initQueue` (`:20–31`).
- **Only pending jobs are in the array.** Running jobs are spliced out at `:157` and held in the `activeJobs` Map (`:113,177`), which is never persisted. On restart they are lost silently — no "resume" of in-flight work, no reconciliation with partially written leads.
- Queue is initialized **twice** (`index.js:131` and `scrape.js:246` via `setDeps`), re-reading disk and scheduling two `processQueue` calls (`:52`).
- Writes are async, non-atomic (`fs.writeFile`, `:33–41`); a crash mid-write corrupts `jobs.json`, and `loadQueue` then silently sets `[]` (`:25–27`).

### 5.4 Timeout / retries / backoff

- Hard 10-minute `Promise.race` timeout per job (`:213–221`). The losing promise is **not cancelled** — the underlying engine keeps running, writing leads, consuming browser/proxy resources, and the slot is decremented anyway (`:182–191`), so concurrency accounting under-reports real load.
- **No retries and no backoff.** A failed task is caught and logged (`:222–225`); the job is gone. Individual engines have ad-hoc axios retries (`engine-google-serp.js:10–16`; NVIDIA 3 retries) but the queue itself has no retry policy, no attempt ceiling, no jitter.

### 5.5 Cancellation

- Only global: `globalDeps.abortSignal.aborted` makes `processQueue` **clear the entire queue** (`:121–125`) and engines poll the same object (e.g. `engine-google-places.js:696`). There is no per-job or per-session cancel.
- `POST /api/scrape/jobs/stop-all` and `/stop` (`scrape.js:1161–1250`) set the global abort, close all browsers, clear the queue, and dump session vaults. `POST /api/scrape/omni` resets the same global signal to false (`scrape.js:1009`).
- **Critical coupling:** when one omni session completes, it sets `globalAbortSignal.aborted = true` and calls `clearQueue()` (`scrape.js:948–949`), and when one omni run starts it also calls `clearQueue()` (`:704`). A second user's search therefore aborts the first: no multi-session isolation.

### 5.6 Failure / dead-letter / recovery

- No dead-letter store, no failure counters, no requeue, no alerting, no job history. The only trace is `addLog` text (kept in memory, last 50 entries — `index.js:45–60` — and streamed via SSE).
- `manualIntervention.injectManualLoginUI` can block a job indefinitely: `page.setDefaultTimeout(0)` and a Promise that resolves only when the admin clicks (`manualIntervention.js:20–33`); the 10-min queue timeout rejects but the browser/tab and pending Promise leak, consuming a Playwright slot.
- `scrape.js` orchestrator waits in a 1 s loop until its zones leave the queue (`:832–884`); if the job's own 10-min timeout fires, that loop keeps running detached (promise not cancelled) and later calls `clearQueue()` + global abort.

### 5.7 Memory growth

- `inMemoryQueue` is **unbounded**; `POST /api/automations/bulk-csv` can enqueue one job per CSV row with no cap (`automations.js:21–30`), and each `POST /api/scrape/upload` similarly (`scrape.js:1131–1154`).
- `activeSessions` (`scrape.js`), `activeCronJobs` (`scrape.js:298–433`), `sseClients` (`index.js:46–53`), `pendingInterventions` (`manualIntervention.js:2`), `systemLogs` (capped 50), and the `caches` (`locationCache` grows per new coordinate; `resolvedCache`/`locations_memory` grow per new location) are all in-memory and mostly unbounded.
- No backpressure between ingest (scrapers writing whole array) and persistence (`§7`).

---

## 6. API surface

### 6.1 Authentication / authorization model

**There is none.** `server/index.js:39–162` registers only `cors()`, `express.json({limit:'100mb'})`, `express.urlencoded(...)` before mounting every router; no auth middleware, no token verification, no session store. `POST /api/auth/login` checks plaintext credentials and returns `{success, user}` — no token, cookie or server session (`auth.js:12–27`). The React client merely keeps the user object client-side. Consequently **every route below is unauthenticated**, including destructive and admin routes. `server/index.js:219` binds `0.0.0.0:5002` with `cors()` open to all origins (`:40`).

### 6.2 Endpoint table (all routers; `Auth?` column: N = none anywhere)

**`/api/auth` — `auth.js`**
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| POST | `/api/auth/login` | N | body `{username,password}` → `{success,user:{role,name,…}}`; **no token** |
| PUT | `/api/auth/admin` | N | body `{username,password}` → overwrites `data/admin.json` in plaintext; **any caller can take over admin** (`:29–38`) |

**`/api` — `api.js`** (mounted `index.js:144`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| GET | `/api/regions` | N | deprecated stub (`:33–35`) |
| GET | `/api/suggest?q=` | N | proxies Google suggest; returns `string[]` (`:37–49`) |
| GET | `/api/knowledge` | N | returns `{categories[29], locations[~6.6k nodes]}` (`:51–56`) |
| GET | `/api/location/search?q=` | N | local index + Nominatim → `[{name,display,type,lat,lon}]` (`:58–112`) |
| GET | `/api/logs` | N | returns in-memory system log lines (`:115–116`) |

**`/api/scrape` — `scrape.js`** (mounted `index.js:145`; orchestration deep-dive owned by engine-auditor)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| POST | `/resolve-intervention` | N | `{platform,action}` resolves a manual-login wait (`:252–264`) |
| GET | `/settings` | N | masked NVIDIA/Ola keys + provider metadata (`:266–281`) |
| POST | `/settings` | N | writes raw API keys to `settings.json` (`:283–296`) |
| GET | `/jobs` | N | live sessions + queue jobs (`:300–344`) |
| GET | `/active` | N | current scrape status snapshot (`:346–366`) |
| POST | `/jobs/update` | N | create/stop/start/update interval of in-memory cron (`:369–433`) |
| POST | `/firebase` | N | stub, returns success (`:435–439`) |
| POST | `/python` | N | **spawns `python engine-python.py --query "<user input>"` via `child_process.exec`** (`:444–471`) |
| POST | `/maps` | N | queues places job — **argument mismatch** (`:473–480, §8`) |
| GET | `/keywords?category=` | N | Datamuse synonyms (`:484–493`) |
| POST | `/parse-location` | N | geoAI regex parse (`:497–502`) |
| POST | `/preflight` | N | geographic scope + typo correction (`:504–519`) |
| POST | `/omni` | N | start background omni scrape; `{query/category/location,radius,gridDensity,enabledEngines,sessionId,userId}` → `{message,sessionId}`; deducts 5 credits if `userId` (`:966–1024`) |
| POST | `/deep-enrich` | N | `{leadIds[]? | sessionId?}` → background `fastWebsiteExtract` updates; recomputes score (`:1030–1104`) |
| POST | `/batch` | N | `{tasks[]}` → queues DeepSeek + Places jobs; returns success (`:1107–1129`) — **shadowed by the second definition** |
| POST | `/upload` | N | `{tasks[]}` CSV-style batch enqueue (`:1131–1154`) |
| GET | `/batch/progress` | N | in-memory progress object (`:1156–1159`) |
| POST | `/jobs/stop-all`, `/stop` | N | global abort, close browsers, clear queue, flush + save aborted session vaults (`:1161–1250`) |
| GET | `/stream/:sessionId` | N | SSE keep-alive channel **that never emits events** (only `connected` + heartbeat, `:1253–1267`) |
| POST | `/batch` (2nd def, dead) | N | `{queries[],engines,sessionId}` + `defaultPool.runBatch` — unreachable because Express uses the first match (`:1270–1297`) |

**`/api/public` — `publicUsers.js`** (mounted `index.js:146`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| POST | `/auth` | N | email → create/return user with 20 free credits (`:8–37`) |
| POST | `/reveal` | N | `{userId,vendorId}` deducts 1 credit, returns real phone/email (`:40–74`) |
| POST | `/checkout/dummy` | N | free tier upgrade, adds 500/3000 credits (`:77–110`) |
| GET | `/admin/list` | N | **all SaaS users incl. credits** (`:113–120`) |
| POST | `/admin/credits` | N | arbitrary credit set (`:123–139`) |
| POST | `/admin/permissions` | N | grants `deepExtractorEnabled` (`:142–158`) |
| POST | `/deep-extract` | N | DDG scrape for phones; permission skipped when `isAnonymous` (`:163–203`) |
| POST | `/demo-scrape` | N | **unauthenticated Playwright job spawn** (`:206–228`) |
| GET | `/my-leads?userId=` | N | returns full vendor rows for user's unlocks (`:248–265`) |
| POST | `/buy-credits` | N | **arbitrary free credits** (`:268–288`) |
| POST | `/reveal` (2nd def, dead) | N | returns "Already unlocked" without contact data (`:291–322`) |

**`/api/vendors` — `vendors.js`** (mounted `index.js:147`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| GET | `/` | N | all leads; optional `since`; `userId` only masks contacts using `unlockedLeads`, **does not partition tenants** (`:17–55`) |
| GET | `/out-of-bounds` | N | OOB array (`:58–70`) |
| PUT | `/:id` | N | merge body, **force `verified:true`** (`:73–89`) |
| DELETE | `/:id` | N | delete lead (`:92–106`) |
| POST | `/clear-unverified` | N | delete all unverified (`:109–118`) |
| POST | `/clear-all` | N | delete all leads + OOB (`:121–132`, duplicate at `:215–222`) |
| DELETE | `/` | N | delete all (`:134–145`) |
| POST | `/assign` | N | `{vendorIds[],employeeId}` → sets `assignedTo/assignedAt` (`:148–166`) |
| PUT | `/:id/crm` | N | `{crmStatus,notes}` → local JSON patch (`:169–187`) |
| POST | `/push` | N | marks all verified as `pushed` (`:190–212`) |
| POST | `/:id/deep-lookup` | N | live DuckDuckGo scrape for a phone; updates one lead (`:226–296`) |
| GET | `/public` | N | masked public marketplace view, `limit` unbounded parse (`:299–345`) |
| POST | `/lead` | N | stub: logs and returns success, **not stored** (`:348–357`) |

**`/api/employees` — `employees.js`** (mounted `index.js:148`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| GET | `/` | N | **returns employee objects incl. plaintext `password`** (`:21–24`) |
| POST | `/` | N | create employee from body (`:27–33`) |
| PUT | `/:id` | N | update employee (`:36–46`) |
| DELETE | `/:id` | N | delete employee (`:49–54`) |

**`/api/upload` — `upload.js`** (mounted `index.js:149`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| POST | `/` | N | multer single `image`, no type/size limits → `{url:"/api/uploads/<file>"}` (`:19–24`); **URL is wrong**: static is mounted under `/api/upload/` (`:27`), so returned URLs 404 |
| GET | `/…` | N | `express.static(UPLOADS_DIR)` (`:27`) |

**`/api/locations` + `/api/location` — `locations.js`** (mounted twice, `index.js:150–151`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| GET | `/warm-state/status` | N | in-memory warming status incl. `resolvedPoints[]` (`:59–61`) |
| POST | `/warm-state/stop` | N | sets abort flag (`:63–67`) |
| POST | `/warm-state` | N | `{stateName}` → background hierarchy warm + geocode + village learning (`:69–176`) |
| GET | `/memory` | N | full `locations_memory.json` (`:178–189`) |
| POST | `/geocode` | N | `{locations[]}` → sequential geocode (`:191–207`) |
| GET | `/search?q=` | N | autocomplete via Ola/Photon (`:210–225`) |
| GET | `/autocomplete?q=` | N | same (`:227–237`) |
| GET | `/detect-intent?q=` | N | NLP parse + `indiaGeoIndex.resolveHierarchy` → `{category,hasLocation,detectedLocation}` or suggestion list (`:240–298`) |

**`/api/automations` — `automations.js`** (mounted `index.js:152`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| POST | `/bulk-csv` | N | `{items:[{category,city}]}` → one places job per row, unbounded (`:12–33`) |
| POST | `/extract-urls` | N | `{urls[]}` → crawlee deep crawl jobs (`:36–56`) |
| POST | `/find-social` | N | `{names[]}` → DDG dork jobs (`:59–77`) |

**`/api/sessions` — `sessionRoutes.js`** (mounted `index.js:153`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| GET | `/` | N | health (`:23–25`) |
| POST | `/save` | N | `{userId,sessionId,category,location,leads[],metadata}` → writes full session JSON (`:28–56`) |
| GET | `/list` or `/list/:userId` | N | lists **all users' session directories** (`:59–118`) |
| GET | `/:sessionId` or `/:userId/:sessionId` | N | returns full session **incl. all leads**, scanning every user dir (`:121–152`) |
| DELETE | `/:sessionId` or `/:userId/:sessionId` | N | deletes session file (`:155–180`) |
| GET | `/export/:userId/:sessionId?format=csv|json` | N | CSV/JSON download; CSV has 15 columns, `qualityScore || 85` fallback (`:183–238`) |

**`/api/crm` — `crm.js`** (mounted `index.js:154`; all Mongo branches are dead, `§7.4`)
| Method | Path | Auth? | Purpose / contract |
|---|---|---|---|
| PATCH | `/leads/:vendorId/stage` | N | `{stage,note}` stage validated; JSON fallback updates stage, **note lost** (`:21–73`) |
| POST | `/leads/:vendorId/notes` | N | Mongo-only; JSON fallback does nothing (`:79–113`) |
| GET | `/leads/:vendorId/timeline` | N | Mongo-only; always `[]` (`:119–132`) |
| POST | `/bulk-stage` | N | Mongo-only; returns success count without persisting (`:138–157`) |
| GET | `/pipeline` | N | grouped by stage from JSON store or Mongo (`:163–199`) |
| GET | `/analytics` | N | counts by stage (`:205–245`) |

**App-level routes — `index.js`**
| Method | Path | Auth? | Purpose |
|---|---|---|---|
| GET | `/api/logs/stream`, `/logs/stream` | N | SSE log stream, unbounded clients (`:168–200`) |
| GET | `/downloads/*` | N | static PDF downloads (`:165`) |

**Aliases / dead surface**
- Double-mount fallbacks registered for locations, location, crm, vendors, scrape, sessions under `/api/api/*` (`index.js:156–162`) — duplicates every one of those URLs.
- `server/src/routes/proxy.js` defines a generic outbound-fetch proxy `GET /api/proxy?url=` (`:13–50`) with SSRF potential, but it is **never mounted** in `index.js` — dead code (good, but it is one require away from a vulnerability).
- No route versioning (`/v1`), no OpenAPI/schema, no consistent envelope (`success` vs raw arrays vs `{error}`), no request validation library, no rate limiting, no request IDs.

---

## 7. Persistence / storage

### 7.1 Design (local JSON "db")

`dbAdapter.js` is the de-facto database: a module-level cached array plus a debounced whole-file rewrite.

```
getVendors()   → cachedVendors (loaded once from scraped_vendors.json)          dbAdapter.js:114–121
saveVendors()  → replace cachedVendors; debounce 1000 ms; then fs.writeFile      dbAdapter.js:134–136,158–161,58–64
flushSync()    → clearTimeout + fs.writeFileSync(..., null, 2)                   dbAdapter.js:66–76
```
- Public users are a second whole-file store (`savePublicUsers`, **synchronous** write of all users on every credit change: `:212`).
- Employees/auth are yet another set of direct file read/writes (`employees.js`, `auth.js`, `dbAdapter.js:200–212`) with duplicate code paths over the same files.
- Caches (`olaMaps`, `geoAI`, `intelligentExtractor`, `locations memory`, `jobs`) each independently rewrite their own JSON files, some `writeFileSync`, some async `writeFile`.

### 7.2 Atomicity / concurrency safety

- **No atomic write pattern** (no temp file + `rename`, no fsync, no lock file, no backup). A crash or kill during `fs.writeFile` truncates the JSON; on next boot `JSON.parse` throws and `getVendors` silently returns `[]` (`:116–118`), then the next save **overwrites the file with an empty array** — total silent data loss.
- In-process read-modify-write races: engines do `getVendors() → findIndex → push → saveVendors()`; `deleteVendor` and `updateVendorsBatch` **replace** `cachedVendors` with a filtered copy (`:144–156`), so an in-flight scraper holding the old array reference can resurrect deleted leads on its next save. No mutex/queue.
- Two independent modules wrap the same file (`dbAdapter.js` cached vs `localDb.js` uncached, `localDb.js:14–24`); engines disagree about which one to use (`§4.6`). Any switch between them causes lost writes.
- Session vault writes are synchronous full-file writes on the request path (`sessionRoutes.js:50`) and in the orchestrator (`scrape.js:924,1221`) — the server blocks while serialising potentially thousands of leads.
- **No backups, no export/restore job, no WAL/event log, no schema migrations.** `data/` at repo root is empty; everything lives under `server/data` + `server/db`.

### 7.3 Scale limits (why it breaks)

- Average persisted lead = **1,712 B** (3.36 MB / 1,960 leads, pretty-printed session copies; compact vendor file ≈ 1.5 KB/lead).
- Every flush serialises the **entire array**: 1,000 leads ≈ 1.7 MB; 10,000 ≈ 17 MB; 50,000 ≈ 85 MB. `JSON.stringify` of that blocks the event loop for hundreds of ms; `flushSync` uses `null, 2` so roughly doubles output size.
- Reads are equally unbounded: `GET /api/vendors` returns the entire array (and the client polls it for the live table), so response size/time is O(total leads) — at 10–20 k leads the client receives tens of MB per refresh.
- Load is O(n): `JSON.parse` of the whole file at boot; corruption wipes everything; memory footprint ≈ 2–3× JSON size once parsed.
- Practical ceiling on this design: **a few thousand leads** (≈1–5 k) before UI/refresh/serialise costs become unacceptable; single-writer whole-file JSON is not viable beyond ~10 k leads on a Node process. A world-class store needs a real DB (SQLite/Postgres) + incremental writes/indexes.
- Multi-user SaaS is impossible on this store: no tenant column on leads, `GET /api/vendors` ignores `userId` for partitioning, and session list/read routes scan all user directories (`sessionRoutes.js:59–72,121–146`).
- Disk duplication: session vaults copy leads that also live in `scraped_vendors.json`; 3.36 MB of session data for a 46 KB global store today (ratio ~73×; reproducible once a large scrub is saved).

### 7.4 MongoDB remnants vs local JSON

Mongo is **entirely dead code**:
- `config/database.js` defines `connectDB()` (default URI `mongodb://127.0.0.1:27017/leadharvest`) but **nothing imports/calls it** (`grep` finds only its own definition); `MONGODB_URI` is read nowhere else.
- `dbAdapter.js:5–12` has the Mongo connection **commented out** ("Disabled as requested"), yet still requires `mongoose` and registers a `Vendor` model (`:15–21`) and keeps dead buffering code (`_flushMongo` `:78–103`, `pendingMongoUpdates` `:55–56,138–141`) that is never flushed when disconnected.
- `models/Vendor.js`, `models/StagingLead.js`, `models/CrmActivity.js` are Mongoose schemas with richer fields (normalized phone/name, coordinates, reviewCount, crmNotes/tasks, folder/session, fingerprint, text indexes) but **no code path ever writes or reads them** except CRM routes guarded by `mongoose.connection.readyState === 1`, which is **always false**.
- Consequence: `POST /api/crm/leads/:id/notes`, `POST /api/crm/bulk-stage`, `GET /api/crm/leads/:id/timeline` return success/empty but persist nothing; `PATCH .../stage` persists the stage to JSON but drops the note (`crm.js:41 vs :59–66`). The Mongoose schemas are the closest thing to a "world-class" model in the repo, but they are unreachable.
- `localDb.js` duplicates a subset of `dbAdapter` (vendors+employees) with no locking — a latent split-brain writer.

---

## 8. Concrete bugs / risks (severity register)

Severity: **S1** = data loss/security-critical; **S2** = high (functional corruption or exploitable); **S3** = medium; **S4** = low/hygiene.

| # | Sev | Finding | Evidence |
|---|---|---|---|
| 1 | S1 | **Zero authentication/authorization**, CORS `*`, binds `0.0.0.0`; anyone can read/delete all leads, change admin password, mint credits, upload files, spawn scrapers | `index.js:39–42,142–162,218–221`; `auth.js:12–38`; all routers |
| 2 | S1 | **Non-atomic whole-file JSON writes**, no backup; corrupted store silently resets to `[]` and is then overwritten | `dbAdapter.js:58–76,114–121`; `localDb.js:22–24` |
| 3 | S1 | **Command injection**: `POST /api/scrape/python` interpolates user `query`/`location` into `child_process.exec` (only `"` escaped) | `scrape.js:442–471` |
| 4 | S1 | **Secrets committed in plaintext**: NVIDIA key + Ola Maps key in `settings.json` and as code fallbacks; plaintext admin/employee passwords; `GET /api/employees` returns passwords; unauthenticated admin password overwrite | `settings.json:2–4`; `settingsManager.js:7`; `olaMaps.js:44`; `data/admin.json`; `employees.js:21–24`; `auth.js:29–38` |
| 5 | S1 | **Cross-user session leak**: session list/get/export scan all user dirs and return full lead payloads with no auth | `sessionRoutes.js:59–72,121–152,183–238` |
| 6 | S2 | **Two engines silently drop all leads** because they call a non-existent `addVendor()`; errors swallowed | `engine-google-serp.js:7,178,183–185`; `engine-justdial.js:122,128–130`; `localDb.js:39–44`; `dbAdapter.js:214–230` |
| 7 | S2 | **Global abort/queue flush coupling**: starting or finishing one omni session clears the queue and aborts every other running scrape | `scrape.js:704,948–949`; `queue.js:121–125` |
| 8 | S2 | **Queue jobs in flight are not durable**; restart loses running jobs; 10-min timeout rejects without cancelling (orphan work + wrong concurrency counts) | `queue.js:20–31,157,172–192,213–226` |
| 9 | S2 | **No retries/dead-letter/attempt tracking**; failures only logged and lost; unbounded queue from bulk CSV/upload | `queue.js:222–233`; `automations.js:21–30`; `scrape.js:1131–1154` |
| 10 | S2 | **Dedupe is unbounded exact-match**; canonical `deduplicator.js` unused; FP merges same-name businesses, FN duplicates via Maps URL params/social identity; OOB merges by name | `engine-google-places.js:635,987`; `engine-google-serp-local.js:317–324`; `dbAdapter.js:177–190`; `deduplicator.js` whole file |
| 11 | S2 | **Data-quality corruption**: `city` polluted with zone/query text; categories are free-text query strings; placeholder avatars stored as `logo`; `topReviews`/`matchedKeywords` always empty; `operatingHours` truncated to 150 chars | `scrape.js:816–817` → `engine-google-places.js:643,903,995`; stored sample in `scraped_vendors.json`; `:885` |
| 12 | S2 | **Four conflicting quality scores/tiers + fabricated rating** (`rating = qualityScore/20`, `verified/aiVerified=true` unconditionally in DeepSeek bridge) | `engine-google-places.js:11–64`; `engine-deepseek.js:17–32,96,99–100`; `enricher.js:6–42`; `scrape.js:1076–1082` |
| 13 | S2 | **Verification flags lie**: `PUT /api/vendors/:id` forces `verified:true`; `aiVerified` = "has phone"; `verifyWithAI` never called; Transformers dep missing | `vendors.js:79`; `engine-google-places.js:896,997`; `aiParser.js:5–27,105–163`; `engine-google-places.js:8` |
| 14 | S2 | **Geo targeting ignores user radius/density; grid code dead**; state queries cover only 12 districts (AP has 26, TS 33); district covers first 12 mandals only; villages unsupported | `scrape.js:589,655,706–820`; `universalGeoCluster.js:410–506`; `gridGenerator.js:18` (no callers) |
| 15 | S2 | **Geo mis-resolution**: substring cluster match on `includes` both ways; duplicate mandal names last-wins; only 60 known coords/5 authoritative mandal lists; AI fallback can hallucinate and is cached forever | `universalGeoCluster.js:102–103,143–151,420–422`; `indiaGeoIndex.js:6–106`; `intelligentExtractor.js:653–717` |
| 16 | S2 | **Nominatim usage without throttling** across reverse geocode per lead, geocode loops and warm-state (TOS 1 req/s), random UA; transient failures cached as permanent nulls; 0.01° reverse-geocode cache misattributes village/mandal | `olaMaps.js:112–195,179–183`; `geoAI.js:95–98,104–129`; `indiaGeoIndex.js:209–218`; `locations.js:147–164` |
| 17 | S2 | **SaaS monetization bypass**: reveal/credits/checkout/permissions endpoints unauth; `isAnonymous` skips deep-extract permission; duplicate reveal handlers | `publicUsers.js:40,77,123,142,163–175,268,291` |
| 18 | S2 | **Unauthenticated Playwright job spawn / DoS**: `/api/public/demo-scrape`, `/api/scrape/omni`, upload (100 MB body), no rate limiting | `publicUsers.js:206–228`; `scrape.js:966`; `index.js:41–42` |
| 19 | S2 | **Upload broken & unsafe**: no MIME/size limits, static served, returned URL path `/api/uploads/*` does not match mounted `/api/upload/*` | `upload.js:17–27`; `index.js:149` |
| 20 | S2 | **Four post-scrape handlers silently no-op / partial**: CRM notes, bulk stage, timeline, lead submission; Mongo never connected | `crm.js:33–56,88–113,119–132,138–157`; `database.js:3–13` (uncalled); `vendors.js:348–357` |
| 21 | S3 | **Duplicate route definitions** (Express uses first): `POST /api/scrape/batch` (two different contracts), `POST /api/public/reveal`, `POST /api/vendors/clear-all`; double-mounted `/api/api/*` aliases | `scrape.js:1107,1270`; `publicUsers.js:40,291`; `vendors.js:121,215`; `index.js:156–162` |
| 22 | S3 | **`/api/scrape/maps` argument mismatch**: passes `[]` as `sessionId` and radius where `boundingbox` expected → wrong session labelling/filters | `scrape.js:473–480` vs `:187–190` signature |
| 23 | S3 | **SSRF-adjacent / abuse**: server-side DuckDuckGo dork fetch on demand; dead but present generic proxy route; broad-scope `warm-state` triggering external calls | `vendors.js:227–296`; `proxy.js:13–50` (unmounted); `locations.js:69–176` |
| 24 | S3 | **Event-loop blocking writes**: sync full-cache/cache writes on hot paths (`geoAI.js:16,124`; `intelligentExtractor.js:26`; `locations.js:38`; `sessionRoutes.js:50`; `scrape.js:548,924,1221`) | as cited |
| 25 | S3 | **TLS verification disabled** for website enrichment (`rejectUnauthorized:false`) → MITM/injected fake contacts | `fastWebsiteExtractor.js:6–8` |
| 26 | S3 | **Enrichment updates keyed by name** can write a vendor's email/socials onto a different same-name business; fire-and-forget `.then` after DB row may target stale row | `engine-google-places.js:843–871` |
| 27 | S3 | **Manual intervention can hang a queue slot forever** (timeouts disabled, promise never rejects, no timeout) | `manualIntervention.js:20–33`; queue timeout does not cancel |
| 28 | S3 | **Memory growth**: unbounded queue, `activeSessions`/`activeCronJobs` never evicted, SSE clients unbounded, `resolvedCache`/`locationCache`/`locations_memory` unbounded, `error_crash.log` append-only | `queue.js:228–234`; `scrape.js:298–433,749`; `index.js:46–53,210`; caches |
| 29 | S3 | **Session data duplication** (global array + session vault + client-saved sessions), no canonical source; `leadCount`/`phoneCount` drift | `scrape.js:892–926,1202–1221`; `sessionRoutes.js:39–50` |
| 30 | S3 | **Stale/unmaintained test surface**: `npm test` exits 1; `comprehensive_test.js` calls non-existent endpoints; no dedupe/queue/persistence tests | `server/package.json`; `comprehensive_test.js:15,32` |
| 31 | S4 | Uncaught exception/rejection handlers swallow errors and continue in undefined state | `index.js:16–21` |
| 32 | S4 | Lead `id` can collide under load (`Date.now()` + 7 chars); no stable external ID parsed from Maps URL CID | `engine-google-places.js:628,875` |
| 33 | S4 | `reviewCount` vs `reviewsCount` vs `reviews` field-name drift; rating string/number mixed; sentinel strings (`Requires Manual Lookup`, `Requires Manual Reveal`, `Obfuscated`) treated as phone values | `engine-deepseek.js:23`; `engine-google-places.js:646,854,1040`; `models/StagingLead.js:10` |
| 34 | S4 | Field-name drift between dead Mongo schema and JSON store (`folderId`, `sessionId`, `normalizedPhone`, `whatsapp`, `priceRange`, `googleMapsUrl` vs `mapsLink`, `photos` vs `images`, `businessHours` vs `operatingHours`) | `models/Vendor.js:3–82`, `models/StagingLead.js:3–39` vs `engine-google-places.js:874–909` |
| 35 | S4 | `GET /api/vendors/public` `limit` unbounded/negative parse; `attributes`/`userId` param ignored for partition; `CrmActivity` model unused | `vendors.js:299–345`; `models/CrmActivity.js` |

---

## 9. What this means for the "world-class rewrite" master plan

**Salvage:** the `india_villages.json` asset (state→district→mandal→village, 619k villages) and the curated metro zone lists are useful seeds; `fastWebsiteExtractor` is a usable v0 fetcher; `scrape.js`'s archeology of engines shows what sources are reachable.

**Replace outright (P0):**
1. **Persistence + identity:** move leads to SQLite/Postgres with a real vendor schema (identity, contact points, address components, taxonomy, provenance, enrichment/verification state), incremental writes, indexes, migrations, WAL/backups; drop the whole-file JSON adapter (and the dead Mongo layer in favour of the chosen DB).
2. **Security boundary:** token auth + role/tenant scoping on every route; remove plaintext credentials and hard-coded API keys; rate limits, upload validation, CORS allow-list, body-size caps.
3. **Dedupe/merge service:** deterministic keys (place_id/CID, normalized phone, geo+name similarity), merge/review queue, golden test corpus, persisted `canonical_id`/`duplicate_of`.
4. **Queue:** durable job table/Redis with id/status/attempts/backoff/retries/dead-letter, per-session cancellation, persistent running-state reconciliation on restart, bounded queue + backpressure, unified concurrency budget with the pool.
5. **Geo planning:** real coverage planner that uses the full hierarchy (all districts/mandals, village targeting), respects radius/grid parameters, records search points/attempted cells per session for coverage reporting, and removes AI hallucination from the critical path (use the static hierarchy; AI only for fuzzy suggestion).
6. **Enrichment pipeline:** per-lead state machine with `raw → website_enriched → contact_verified → human_verified`, contact-point-level verification (MX/OTP/call), real category taxonomy, structured hours/reviews/pricing/GST fields, and per-field provenance/confidence.
7. **Observability:** per-provider quotas/cost counters, job metrics, pipeline funnel metrics (points planned → leads found → unique → enriched → verified → exported), and dead-letter dashboards.

---

## Appendix A — evidence excerpts

Representative persisted lead (from `server/data/scraped_vendors.json`, current store):

```json
{
  "id": "place_1792582559571cprt48",
  "name": "Making Memories by Madhu I Best Wedding Photography in Chilakaluripet",
  "address": "1st floor, Bommarillu Apartments, 103",
  "phone": "+91 97050 00555",
  "rating": 5, "reviewsCount": 12,
  "mapsLink": "https://www.google.com/maps/place/...!19sChIJd0x44PZjSjoRcjI2rP1qe7U?authuser=0&hl=en&g_ep=...&rclk=1",
  "latitude": 16.1005625, "longitude": 80.1594033,
  "website": "http://www.makingmemoriesbymadhu.in/",
  "operatingHours": "Open 24 hours",
  "topReviews": [],
  "email": "makingmemoriesbymadhu@gmail.com",
  "instagram": "https://www.instagram.com/makingmemoriesbymadhu/",
  "facebook": "", "instagramFollowers": "", "facebookFollowers": "",
  "logo": "https://ui-avatars.com/api/?name=...",
  "photo": "", "avatar": "https://ui-avatars.com/api/?name=...",
  "images": [], "aiVerified": true, "matchedKeywords": [],
  "whatsappLink": "https://wa.me/919705000555?text=...",
  "whatsappAvailable": true, "qualityScore": 95, "tier": "Diamond",
  "category": "Event Photographers",
  "city": "Narasaraopet Wedding Photography",
  "source": "Autonomous Cyber Intelligence Matrix",
  "verified": false, "scrapedAt": "2026-10-21T11:35:59.571Z",
  "sessionId": "nsp_photographers_live", "strategy": "deep",
  "pincode": "",
  "village": "Polireddy Palem", "mandal": "Chilakaluripet Mandal",
  "district": "Palnadu District", "state": "Andhra Pradesh"
}
```
Note: placeholder avatar presented as logo; `city` is a zone-vector name; `topReviews` empty; "Diamond" tier with `verified:false`; unstable ID; no place ID; contact provenance absent.

Measured store/session facts:

- Sessions: 27 files / 14 user dirs / 3.36 MB / **1,960 lead copies**; average lead blob 1,712 B; categories include polluted values (`"Narasaraopet, Andhra Pradesh"`, `"rental cars"`) and locations include `"full"`.
- Local writer count for the same vendors file: **2** (`dbAdapter.js`, `localDb.js`).
- Dedupe test coverage: **0**.

## Appendix B — files read in full

`server/src/utils/{universalGeoCluster,intelligentExtractor,indiaGeoIndex,olaMaps,queue,aiParser,queryParser,fastWebsiteExtractor,geoAI,deduplicator,gridGenerator,enricher,manualIntervention}.js`; `server/src/config/{dbAdapter,localDb,settingsManager,database}.js` + `settings.json`; `server/src/models/{StagingLead,Vendor,CrmActivity}.js`; `server/src/routes/{api,vendors,locations,crm,sessionRoutes,publicUsers,automations,employees,upload,auth,proxy}.js`; `server/index.js`; vendor-write and engine-bridge paths in `server/src/scrapers/{engine-google-places,engine-google-serp-local,engine-google-serp,engine-deepseek,engine-social-dork,engine-justdial}.js`; `server/src/scrapers/concurrencyManager.js`; `dev.js`; `server/comprehensive_test.js`; data files in `server/data/*` and `server/db/*` (parsed/counted programmatically).
