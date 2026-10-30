# Gomandap Scraper 2.0 — Implementation Plan

**Goal:** Build India's best local-first lead scraper: verified mobile numbers, complete vendor profiles, ultra-fast fresh scrapes, a folder structure that mirrors how the business actually thinks, a map that works, and a UI/UX that feels instant.

**Status of this document:** This is the execution plan for the rewrite/remediation. It is based on the three audits in `docs/audit/` and on the current code. It is intentionally concrete: file paths, schema, APIs, engine behavior, UI screens, phases, and acceptance tests.

**Guiding rule:** Never fake data. If a phone, rating, review, image, social handle, or verification status is unknown, show `Unknown` — do not invent it.

---

## 1. What "best" means here

The product must win on six things:

1. **Complete vendor intelligence — every detail the source exposes**
   - A vendor record is not a name + phone row. It is a complete business profile: identity, every contact point, full address, category taxonomy, description, services/products, specialties, amenities, payments, accessibility, languages, service areas, hours, price range, rating distribution, reviews, images, videos, socials, booking links, legal/tax details, and provenance.
   - Deep extraction is a first-class product feature, not a side effect of phone scraping. Every vendor can be expanded to its full profile, and the UI shows exactly which fields are known, unknown, or unverified.
   - Never invent a field. If a source does not expose it, store `unknown` with a reason. A sparse but honest profile beats a complete-looking fake profile.

2. **Contact coverage and correctness, led by mobile numbers**
   - Find every mobile number, landline, WhatsApp number, email, website, and social profile the source exposes.
   - Normalize and validate Indian numbers with `libphonenumber-js`.
   - Store multiple contact points per vendor, with type, label, source, confidence, verification method, and verified-at timestamp.
   - Never mistake a pincode, order ID, GSTIN fragment, or address fragment for a phone number.
   - Capture contacts from Google Maps, JustDial, IndiaMART, the vendor's website, social profiles, and structured data — then merge with provenance.

3. **Freshness**
   - Every scrape is a live scrape. No stale result is shown as fresh.
   - Every run is an immutable snapshot with its own run ID.
   - "Refresh" creates a new run and shows what changed: new, updated, gone.
   - Caches are limited to geocoding and website metadata, never to search results or leads.

4. **Speed**
   - First lead on screen in under 5 seconds.
   - 100 mobile-bearing leads from a city in under 90 seconds.
   - 1,000 leads in under 10 minutes on a normal 8-core machine.
   - Deep detail extraction runs in parallel and never blocks the first lead from appearing.
   - UI stays at 60fps with 10,000+ leads through virtualization and map clustering.

5. **Trust**
   - Every field knows where it came from and when it was last seen.
   - Place ID/CID, normalized phone, address components, pincode validity, coordinates, reviews, images, hours, socials, legal details, and provenance are stored properly.
   - No `ui-avatars.com` logo unless the user explicitly chooses a generated placeholder; no fabricated ratings; no "AI Verified" unless a real check ran.

6. **Usability**
   - Search → run → watch leads arrive → inspect the complete vendor profile → save to folder → open on map → export, all in a few clicks.
   - Folders represent geography, category, run, and CRM status — not just a flat list of session files.
   - Fully responsive and accessible.

---

## 2. Current-state problems this plan fixes

From `docs/audit/`:

- Only 2 live engines produce useful leads; several engines silently drop everything.
- The live Google path captures 1/31 emails, 0/31 images, 0/31 review texts; 9/10 stored pincodes are phone fragments.
- `city` is polluted with query-vector names; place IDs are unstable; duplicate rule is exact name/URL match.
- Sessions are duplicated in three places and the list API omits leads/name, breaking folders and CRM.
- Verify, upload, `/maps`, `/batch`, and session routes have contract bugs.
- Queue is in-memory, global abort clears everyone's jobs, and a finished run aborts other runs.
- The client polls every 3–4 seconds, has fake seeded data, fake metrics, dead client-side engines, and a map with no clustering.
- No auth, no tenant isolation, plaintext secrets and passwords, non-atomic JSON writes.

The plan below replaces the weak parts rather than patching around them.

---

## 3. Target architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ React SPA (Vite, Tailwind, TanStack Query, TanStack Table/Virtual)       │
│  Search · Run console · Vendors · Map · Folders · CRM · Settings          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ /api/v1 + SSE
┌───────────────────────────────▼──────────────────────────────────────────┐
│ API process (Express)                                                    │
│  auth · validation · runs · vendors · folders · map · exports · SSE       │
│  reads/writes SQLite through repositories only                            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ SQLite (WAL) — shared local DB
┌───────────────────────────────▼──────────────────────────────────────────┐
│ Worker process(es)                                                       │
│  job claim · run planner · engine adapters · browser pool · normalizers   │
│  website/social enrichment · dedupe · batch persistence · event log       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
  Google Maps            JustDial / IndiaMART       Wedding verticals
  Local Finder           (Playwright Firefox)      (WeddingBazaar/Wire/Mandap)
        │                       │                        │
        └───────────────────────┴────────────────────────┘
                                │
                     Website + social enrichment
```

### Why two processes?

Playwright work is CPU- and memory-heavy and can block the event loop. Keeping it out of the API process means:

- The UI and API stay responsive while scraping.
- A crash in a browser worker does not kill the API.
- You can run 2 workers locally for more throughput.
- Jobs are durable in SQLite, so a worker restart resumes queued work.

For a single-machine local install, `dev.js` starts:

1. `server` — API on port 5002.
2. `worker` — scraper worker(s).
3. `client` — Vite dev server.

### Technology choices

| Area | Choice | Reason |
|---|---|---|
| Local DB | `node:sqlite` (`DatabaseSync`) with WAL | Built into Node 24, zero native install, fast, transactional, local-first. Fallback to `better-sqlite3` only if the built-in API is a blocker. |
| API validation | `zod` | Runtime contracts at every boundary. |
| Auth | Opaque bearer tokens in DB; `scrypt` password hashing | No plaintext passwords; works for local and LAN. |
| Queue | SQLite `jobs` table + `BEGIN IMMEDIATE` claim | Durable, observable, no Redis. |
| SSE | Native Express SSE + `run_events` replay | No polling; reconnect with `Last-Event-ID`. |
| Browser | Playwright Chromium for Google; Playwright Firefox for JustDial | The documented JustDial breakthrough is Firefox; use the right engine. |
| Phone parsing | `libphonenumber-js` | Correct E.164, mobile vs landline, India validation. |
| HTTP enrichment | `undici` Pool / native fetch | Faster than per-request axios setup; connection reuse. |
| Frontend server state | `@tanstack/react-query` | Cache, invalidation, retries, optimistic updates. |
| Tables | `@tanstack/react-table` + `@tanstack/react-virtual` | 10k+ rows without DOM blowup. |
| UI primitives | Radix UI + Tailwind design tokens | Accessible dialogs, menus, tabs, tooltips; consistent design system. |
| Maps | Leaflet + `react-leaflet` + `leaflet.markercluster` (existing) | Proven, already installed; clustering handles 10k+ pins. Revisit MapLibre only if >50k points. |
| Tests | `node:test`, `supertest`, Playwright fixtures | Unit, API, and E2E without heavy setup. |
| Logging | `pino` structured logs | Run-scoped logs, timings, engine health. |

---

## 4. Data model (SQLite)

All timestamps are ISO-8601 UTC strings. All IDs are UUIDs unless noted.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'owner',   -- owner | admin | agent
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE runs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  query        TEXT NOT NULL,
  query_key    TEXT,                             -- normalized query+scope for diffing refreshes
  previous_run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
  category     TEXT,
  location     TEXT,
  scope_kind   TEXT NOT NULL,                    -- city | district | state | mandal | radius | bbox | all_india
  scope_json   TEXT NOT NULL DEFAULT '{}',
  plan_json    TEXT NOT NULL DEFAULT '{}',       -- zones, estimated counts, engine assignment
  progress_json TEXT NOT NULL DEFAULT '{}',      -- zones done/running/failed, leads/sec
  engines_json TEXT NOT NULL DEFAULT '[]',
  mode         TEXT NOT NULL DEFAULT 'fast',     -- fast | deep
  status       TEXT NOT NULL DEFAULT 'queued',   -- queued | planning | running | completed | failed | cancelled
  fresh        INTEGER NOT NULL DEFAULT 1,
  started_at   TEXT,
  finished_at  TEXT,
  cancel_requested_at TEXT,
  worker_id    TEXT,
  heartbeat_at TEXT,
  stats_json   TEXT NOT NULL DEFAULT '{}',
  error        TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX runs_created_idx ON runs(created_at DESC);
CREATE INDEX runs_status_idx  ON runs(status);
CREATE INDEX runs_query_idx   ON runs(query_key, created_at DESC);

CREATE TABLE vendors (
  id                 TEXT PRIMARY KEY,
  canonical_key      TEXT NOT NULL UNIQUE,        -- e.g. google_place:<place_id> | phone:<e164> | name_geo:<hash>
  google_place_id    TEXT UNIQUE,
  google_cid         TEXT,
  branch_of          TEXT,                       -- parent vendor id for multi-branch businesses
  parent_company     TEXT,
  name               TEXT NOT NULL,
  normalized_name    TEXT NOT NULL,
  primary_category   TEXT,
  category_path_json TEXT NOT NULL DEFAULT '[]',
  address_text       TEXT,
  address_json       TEXT NOT NULL DEFAULT '{}', -- house, street, locality, landmark, city, district, state, pincode, country, plus_code
  city               TEXT,
  mandal             TEXT,
  district           TEXT,
  state              TEXT,
  pincode            TEXT,
  pincode_valid      INTEGER NOT NULL DEFAULT 0,
  village            TEXT,
  latitude           REAL,
  longitude          REAL,
  geo_accuracy_m     REAL,
  geo_source         TEXT,
  plus_code          TEXT,
  phone_primary      TEXT,                       -- E.164
  mobile_count       INTEGER NOT NULL DEFAULT 0,
  email_primary      TEXT,
  website            TEXT,
  booking_url        TEXT,
  contact_url        TEXT,
  description        TEXT,
  tagline            TEXT,
  legal_name         TEXT,
  owner_name         TEXT,
  established_year   INTEGER,
  employee_count     INTEGER,
  contact_person     TEXT,
  service_options_json TEXT NOT NULL DEFAULT '[]',  -- delivery, takeaway, online booking, etc.
  parking_json       TEXT NOT NULL DEFAULT '[]',
  packages_json      TEXT NOT NULL DEFAULT '[]',
  menu_json          TEXT NOT NULL DEFAULT '[]',
  brochures_json     TEXT NOT NULL DEFAULT '[]',
  price_list_json    TEXT NOT NULL DEFAULT '[]',
  brands_json        TEXT NOT NULL DEFAULT '[]',
  affiliations_json  TEXT NOT NULL DEFAULT '[]',
  services_json      TEXT NOT NULL DEFAULT '[]',
  products_json      TEXT NOT NULL DEFAULT '[]',
  specialties_json   TEXT NOT NULL DEFAULT '[]',
  tags_json          TEXT NOT NULL DEFAULT '[]',
  amenities_json     TEXT NOT NULL DEFAULT '[]',
  payments_json      TEXT NOT NULL DEFAULT '[]',
  accessibility_json TEXT NOT NULL DEFAULT '[]',
  languages_json     TEXT NOT NULL DEFAULT '[]',
  service_areas_json TEXT NOT NULL DEFAULT '[]',
  faq_json           TEXT NOT NULL DEFAULT '[]',
  offers_json        TEXT NOT NULL DEFAULT '[]',
  certifications_json TEXT NOT NULL DEFAULT '[]',
  awards_json        TEXT NOT NULL DEFAULT '[]',
  catalog_json       TEXT NOT NULL DEFAULT '[]',
  videos_json        TEXT NOT NULL DEFAULT '[]',
  popular_times_json TEXT NOT NULL DEFAULT '{}',
  holiday_hours_json TEXT NOT NULL DEFAULT '{}',
  legal_json         TEXT NOT NULL DEFAULT '{}', -- gstin, pan, cin, registration, legal_entity
  logo_url           TEXT,
  hero_image_url     TEXT,
  geohash            TEXT,
  boundaries_json    TEXT NOT NULL DEFAULT '{}', -- state/district/mandal/city membership + boundary ids
  map_url            TEXT,
  rating             REAL,
  rating_distribution_json TEXT NOT NULL DEFAULT '{}', -- 1★..5★ counts
  reviews_count      INTEGER,
  reviews_json       TEXT NOT NULL DEFAULT '[]', -- top reviews: author, rating, text, date, source
  review_meta_json   TEXT NOT NULL DEFAULT '{}', -- recent dates, owner responses, highlights, from_business
  hours_json         TEXT NOT NULL DEFAULT '{}', -- weekly hours, open_now, timezone
  price_range        TEXT,
  images_json        TEXT NOT NULL DEFAULT '[]', -- url, type, width, height, attribution
  socials_json       TEXT NOT NULL DEFAULT '[]', -- platform, url, handle, followers, verified
  business_status    TEXT,                       -- open | temporarily_closed | permanently_closed | unknown
  quality_score      INTEGER,
  quality_reasons_json TEXT NOT NULL DEFAULT '[]',
  completeness       REAL,
  field_status_json  TEXT NOT NULL DEFAULT '{}', -- per-field: known | unknown | pending | failed | conflict
  confidence_json    TEXT NOT NULL DEFAULT '{}', -- per-field confidence + provenance summary
  deep_status        TEXT NOT NULL DEFAULT 'pending', -- pending | running | complete | partial | failed
  deep_completed_at  TEXT,
  deleted_at         TEXT,
  first_seen_at      TEXT NOT NULL,
  last_seen_at       TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX vendors_name_norm_idx ON vendors(normalized_name);
CREATE INDEX vendors_phone_idx     ON vendors(phone_primary);
CREATE INDEX vendors_geo_idx       ON vendors(latitude, longitude);
CREATE INDEX vendors_place_idx     ON vendors(state, district, city);
CREATE INDEX vendors_quality_idx   ON vendors(quality_score DESC);

CREATE VIRTUAL TABLE vendors_fts USING fts5(
  name, address_text, primary_category,
  content='vendors', content_rowid='rowid'
);

CREATE TRIGGER vendors_ai AFTER INSERT ON vendors BEGIN
  INSERT INTO vendors_fts(rowid, name, address_text, primary_category)
  VALUES (new.rowid, new.name, new.address_text, new.primary_category);
END;
CREATE TRIGGER vendors_ad AFTER DELETE ON vendors BEGIN
  INSERT INTO vendors_fts(vendors_fts, rowid, name, address_text, primary_category)
  VALUES ('delete', old.rowid, old.name, old.address_text, old.primary_category);
END;
CREATE TRIGGER vendors_au AFTER UPDATE ON vendors BEGIN
  INSERT INTO vendors_fts(vendors_fts, rowid, name, address_text, primary_category)
  VALUES ('delete', old.rowid, old.name, old.address_text, old.primary_category);
  INSERT INTO vendors_fts(rowid, name, address_text, primary_category)
  VALUES (new.rowid, new.name, new.address_text, new.primary_category);
END;

CREATE TABLE vendor_sources (
  id         TEXT PRIMARY KEY,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,                      -- google_maps | justdial | indiamart | website | social
  source_id  TEXT,                               -- place id / listing id / profile handle
  source_url TEXT,
  raw_json   TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT,
  fetched_at TEXT NOT NULL,
  run_id     TEXT REFERENCES runs(id) ON DELETE SET NULL,
  UNIQUE(source, source_id, run_id)
);

CREATE TABLE contacts (
  id                  TEXT PRIMARY KEY,
  vendor_id           TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,             -- mobile | landline | whatsapp | email | instagram | facebook | youtube | linkedin | website
  value               TEXT NOT NULL,
  normalized          TEXT,
  label               TEXT,                      -- primary | owner | sales | support | booking
  is_primary          INTEGER NOT NULL DEFAULT 0,
  verified            INTEGER NOT NULL DEFAULT 0,
  verification_method TEXT,                      -- source_claim | format_valid | mx_check | manual
  verified_at         TEXT,
  source              TEXT,
  source_url          TEXT,
  confidence          REAL,
  created_at          TEXT NOT NULL,
  UNIQUE(vendor_id, type, normalized)
);
CREATE INDEX contacts_vendor_idx ON contacts(vendor_id);
CREATE INDEX contacts_value_idx  ON contacts(normalized);

CREATE TABLE run_leads (
  run_id         TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  rank           INTEGER,
  snapshot_json  TEXT NOT NULL,                  -- what this run actually saw
  quality_score  INTEGER,
  has_mobile     INTEGER NOT NULL DEFAULT 0,
  has_whatsapp   INTEGER NOT NULL DEFAULT 0,
  completeness   REAL,
  first_seen_at  TEXT NOT NULL,
  PRIMARY KEY (run_id, vendor_id)
);
CREATE INDEX run_leads_run_quality_idx ON run_leads(run_id, quality_score DESC);

CREATE TABLE jobs (
  id           TEXT PRIMARY KEY,
  run_id       TEXT REFERENCES runs(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,                    -- plan_zones | google_maps_search | enrich_vendor | place_details | reviews | photos | about | website_enrich | social_profiles | export
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json  TEXT NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'queued',   -- queued | running | done | failed | cancelled | dead
  priority     INTEGER NOT NULL DEFAULT 10,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  dedupe_key   TEXT,
  scheduled_at TEXT NOT NULL,
  started_at   TEXT,
  finished_at  TEXT,
  locked_at    TEXT,
  heartbeat_at TEXT,
  worker_id    TEXT,
  error        TEXT,
  last_error   TEXT,
  dead_lettered_at TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX jobs_claim_idx ON jobs(status, scheduled_at, priority DESC);
CREATE INDEX jobs_run_idx   ON jobs(run_id, status);
CREATE UNIQUE INDEX jobs_dedupe_idx ON jobs(dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE run_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,                    -- run.progress | lead.partial | lead.updated | run.completed | run.error | log
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL
);
CREATE INDEX run_events_run_idx ON run_events(run_id, id);

CREATE TABLE saved_views (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,                     -- folder | filter | map
  definition  TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL
);

CREATE TABLE crm (
  vendor_id  TEXT PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  stage      TEXT NOT NULL DEFAULT 'new',        -- new | contacted | qualified | proposal | won | lost | archived
  owner_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  tags_json  TEXT NOT NULL DEFAULT '[]',
  notes_json TEXT NOT NULL DEFAULT '[]',
  tasks_json TEXT NOT NULL DEFAULT '[]',
  last_contact_at   TEXT,
  next_follow_up_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE crm_activity (
  id         TEXT PRIMARY KEY,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,                     -- note | call | whatsapp | email | stage_change | task | verification
  body       TEXT,
  meta_json  TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX crm_activity_vendor_idx ON crm_activity(vendor_id, created_at DESC);

CREATE TABLE reviews (
  id               TEXT PRIMARY KEY,
  vendor_id        TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  source           TEXT NOT NULL,                -- google_maps | justdial | indiamart | website
  source_review_id TEXT,
  author           TEXT,
  author_url       TEXT,
  rating           REAL,
  text             TEXT,
  language         TEXT,
  published_at     TEXT,
  relative_date    TEXT,
  owner_response   TEXT,
  owner_response_at TEXT,
  raw_json         TEXT NOT NULL DEFAULT '{}',
  fetched_at       TEXT NOT NULL,
  UNIQUE(vendor_id, source, source_review_id)
);
CREATE INDEX reviews_vendor_idx ON reviews(vendor_id, published_at DESC);

CREATE TABLE vendor_media (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                     -- logo | hero | gallery | video | 360
  url         TEXT NOT NULL,
  width       INTEGER,
  height      INTEGER,
  attribution TEXT,
  licence     TEXT,
  source      TEXT NOT NULL,
  source_url  TEXT,
  fetched_at  TEXT NOT NULL,
  UNIQUE(vendor_id, url)
);
CREATE INDEX vendor_media_vendor_idx ON vendor_media(vendor_id, type);

CREATE TABLE vendor_socials (
  id            TEXT PRIMARY KEY,
  vendor_id     TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,                   -- instagram | facebook | linkedin | youtube | pinterest | x | whatsapp
  url           TEXT NOT NULL,
  handle        TEXT,
  followers     INTEGER,
  verified      INTEGER NOT NULL DEFAULT 0,
  bio           TEXT,
  last_post_at  TEXT,
  requires_login INTEGER NOT NULL DEFAULT 0,
  source        TEXT,
  fetched_at    TEXT,
  UNIQUE(vendor_id, platform, url)
);

CREATE TABLE field_provenance (
  id           TEXT PRIMARY KEY,
  vendor_id    TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  value_json   TEXT,
  source       TEXT NOT NULL,
  source_url   TEXT,
  method       TEXT,                             -- json_ld | dom | text | api | manual
  confidence   REAL,
  run_id       TEXT REFERENCES runs(id) ON DELETE SET NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  verified      INTEGER NOT NULL DEFAULT 0,
  verification_method TEXT,
  verified_at   TEXT,
  UNIQUE(vendor_id, field, source, source_url)
);
CREATE INDEX field_provenance_vendor_idx ON field_provenance(vendor_id, field);
CREATE INDEX field_provenance_run_idx    ON field_provenance(run_id);

CREATE TABLE field_conflicts (
  id           TEXT PRIMARY KEY,
  vendor_id    TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  values_json  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',     -- open | resolved | ignored
  created_at   TEXT NOT NULL,
  resolved_at  TEXT
);
CREATE INDEX field_conflicts_vendor_idx ON field_conflicts(vendor_id, status);

CREATE TABLE vendor_enrichment (
  vendor_id   TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  node        TEXT NOT NULL,                     -- place_details | reviews | photos | about | website | socials | structured_data | legal | verification
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | failed | skipped
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  started_at  TEXT,
  finished_at TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (vendor_id, node)
);

CREATE TABLE folder_counts (
  folder_key   TEXT PRIMARY KEY,                 -- e.g. loc:ap:palnadu:narasaraopet | run:<id> | crm:new
  lead_count   INTEGER NOT NULL DEFAULT 0,
  mobile_count INTEGER NOT NULL DEFAULT 0,
  full_count   INTEGER NOT NULL DEFAULT 0,
  last_run_id  TEXT REFERENCES runs(id) ON DELETE SET NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE export_jobs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL,                    -- csv | xlsx | json
  filters_json TEXT NOT NULL DEFAULT '{}',
  fields_json  TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'queued',   -- queued | running | done | failed
  file_path    TEXT,
  rows         INTEGER,
  error        TEXT,
  created_at   TEXT NOT NULL,
  finished_at  TEXT
);
```

### Why this model

- `vendors` is the canonical identity, not a scrape row.
- `vendor_sources` records every place/listing that produced data, with raw JSON and per-run snapshots.
- `contacts` makes phone numbers first-class: multiple numbers, labels, validation, provenance.
- `reviews`, `vendor_media`, and `vendor_socials` keep full profiles queryable instead of burying them in opaque blobs.
- `field_provenance` and `field_conflicts` record where every field came from, when it was seen, and any disagreement between sources.
- `vendor_enrichment` tracks the per-vendor deep-extraction job graph node by node.
- `run_leads` gives fresh immutable snapshots without duplicating whole lead blobs in session files.
- `folders` are virtual views over `vendors` + `run_leads`, not a third copy of the data.
- `run_events` makes the UI resumable and auditable.
- `jobs` makes scraping durable and observable.

### Complete field groups captured per vendor

The goal is not "as many fields as possible"; it is **every field the source can prove**. Each field stores value + source + confidence + last seen. Unknown is a valid, visible state.

| Group | Fields |
|---|---|
| **Identity** | Legal/common name, normalized name, Google place ID, Google CID, source-native IDs, branch/parent, business status (open/temporarily closed/permanently closed), established year, legal entity name, owner/contact person, employee count, tagline/description |
| **Categories** | Primary category, full category path, subcategories, specialties, services offered, products offered, menu/catalog, tags/keywords, price tier |
| **Contacts** | All mobile numbers, all landlines, WhatsApp numbers, emails (with role/label), website, booking URL, contact-page URL, social handles, `tel:`/`mailto:` values, contact form URL |
| **Address** | Full address text, house/building, street, locality, landmark, city/town, mandal/tehsil, district, state, pincode + validity, village, country, plus code, service area, geocode source/accuracy |
| **Geo** | Latitude, longitude, accuracy in metres, source, geohash, boundary membership, "located in" district, map URL |
| **Hours** | Weekly hours (per day), open-now state, timezone, special/holiday hours, popular times, temporarily closed notice |
| **Reputation** | Rating, review count, rating distribution (1–5 stars), top reviews (author, rating, text, date, source), recent review dates, owner responses, review highlights, "from the business" description |
| **Media** | Logo, hero image, gallery images, video URLs, 360/photos, image dimensions, attribution, licence/source |
| **Social** | Instagram, Facebook, LinkedIn, YouTube, Pinterest, X/Twitter, WhatsApp channel; handle, URL, follower count, verified flag, bio, last post date where public |
| **Operations** | Price range, packages, offers, payment methods, parking, accessibility, amenities, service options (delivery/takeaway/online), languages spoken, service areas, appointment/booking link |
| **Legal/tax** | GSTIN, PAN, CIN/registration, legal entity, tax ID; only when the source or website publishes it, otherwise unknown |
| **Marketing** | Description, tagline, FAQs, offers, certifications, awards, affiliations, brands, menu, catalog, brochures, price list |
| **Provenance** | Per-field source URL, source type, extraction method, confidence, first seen, last seen, verifying user/check, raw snapshot reference |
| **CRM** | Stage, owner, tags, notes, tasks, activity history, last contact date, next follow-up |
| **Run snapshot** | Which run saw this vendor, which query/zone, exact snapshot JSON, rank, completeness, quality score and reasons |

### Data completeness score

Each vendor gets a transparent completeness score, not a vanity grade:

- Identity 15%
- At least one mobile 20%
- Address + valid pincode 15%
- Website or social 10%
- Rating/reviews 10%
- Hours 5%
- Images 5%
- Category/services/description 10%
- Legal/business details 5%
- Verified contact 5%

The UI shows `Complete 72% · 28 fields · 3 sources` and lists exactly what is missing. Deep extraction tries to raise this score; it never pads it with fake data.

---

## 5. Scraper engine design

### 5.1 Common engine contract

Every source adapter implements:

```js
class Engine {
  static id = 'google_maps';
  static supports = { categories: '*', scopes: ['city', 'district', 'state', 'mandal', 'radius'] };
  async *search(ctx, plan) { /* yields RawListing */ }
  async enrich(ctx, listing) { /* returns Details */ }
  async health(ctx) { /* returns { ok, reason, cooldownUntil } */ }
}
```

`RawListing` is the minimum needed to show a lead immediately: source, sourceId, name, sourceUrl, phone(s), address snippet, rating, review count, coordinates, category.
`Details` adds website, full address, hours, images, reviews, socials, emails, business status, plus code.

### 5.2 Google Maps engine (primary)

This is the engine that must be excellent.

**Search phase (fast path):**

1. Build a Google Maps search URL from category + location.
2. Load with Playwright Chromium using `domcontentloaded` + wait for `div[role="feed"]` or a single place page.
3. Extract feed cards:
   - name
   - place URL (`a.hfpxzc`)
   - place ID/CID from URL
   - rating, review count
   - category/price line
   - address snippet
   - phone if present
   - coordinates from the URL (`!3d`, `!4d`) or card data
   - thumbnail URL if present
4. Emit a partial lead immediately to the API/SSE and insert into `run_leads` with `partial = 1`.
5. Continue scrolling until the end, a safety cap, or no new cards for 3 ticks.

**Detail phase (parallel):**

For each listing, open the place page in a pool of 4–8 pages:

- Prefer parsing Google's initialization state (`APP_INITIALIZATION_STATE`) for stable data, with DOM fallback.
- Extract:
  - canonical name and place ID
  - full address and address components
  - all phone numbers from `data-item-id^="phone:tel:"` and visible text
  - website
  - category/subcategory
  - rating, review count, rating distribution
  - weekly hours and open-now state
  - price range
  - plus code
  - hero and gallery images
  - top reviews (author, rating, text, relative date)
  - business status
  - coordinates
- Update the same vendor, emit `lead.updated`.
- If the detail page fails, keep the partial lead and mark `detail_status = failed`; retry later.

**Website enrichment (separate pool):**

- Fetch homepage, `/contact`, `/about`, and sitemap entries with a 6s timeout and a browser-like UA.
- Extract:
  - `mailto:` emails + text emails
  - `tel:` numbers + text numbers
  - Instagram/Facebook/LinkedIn/YouTube/Pinterest links
  - address text and GSTIN if present
  - logo/OG image
- Validate email syntax; optionally check MX in deep mode.
- Merge only if the field is empty or the new value has higher confidence.
- Record the source URL and fetched time.

**Social discovery (optional/deep mode):**

- If no Instagram/Facebook is found, run a Bing/DuckDuckGo dork for the business name + city and parse profile URLs from results.
- Do not treat snippet text as verified contact data; mark confidence low.

**Mobile normalization:**

- Every phone goes through `libphonenumber-js` with region `IN`.
- Accept only valid numbers; classify `mobile` vs `fixed_line`.
- Store E.164 as canonical, plus a display format.
- Reject numbers that:
  - are 6-digit pincodes
  - are substrings of a longer phone/order ID
  - start with invalid Indian prefixes
- Deduplicate by national significant number.
- If the source shows a mobile, `has_mobile = 1`; if multiple, store all and choose the first valid mobile as primary.

**No fake verification:**

- `verified` only becomes true after a user marks it or a real check runs.
- "WhatsApp available" is `likely` for a valid mobile unless a real check was performed. The UI says "Mobile" or "WhatsApp-ready", not "Verified".

### 5.3 JustDial engine

- Use Playwright **Firefox** (`launchFirefoxBrowser`) to work around Akamai's HTTP/2 fingerprinting.
- Search URL: `https://www.justdial.com/<city>/<category>` with pagination.
- Parse listing cards, then open detail pages for phone numbers.
- JustDial often hides numbers behind a "Show Number" action; implement the click and wait for the number, with a fallback to website enrichment.
- Store `source = justdial`, source URL, raw payload.
- If blocked, mark engine degraded and surface it in the run console; do not silently return 0.

### 5.4 IndiaMART engine

- Search `dir.indiamart.com/search.mp?ss=<query>`.
- Parse company name, address, listing URL, category.
- Open detail page and click "View Mobile Number" if available; otherwise website enrichment.
- Never store a hard-null phone as empty success; record `phone_unavailable_reason`.

### 5.5 Wedding verticals

- WeddingBazaar, WeddingWire, Mandap.
- Parse listing cards and detail pages.
- Phone is often behind login/OTP; attempt the public number first, then website enrichment, then mark `requires_login` instead of inserting a placeholder string.
- These engines are lower priority than Google/JustDial but valuable for wedding categories.

### 5.6 Browser pool and anti-bot

Create `server/src/scrapers/core/browserPool.js`:

- One Chromium instance per worker, reused across jobs.
- A fresh browser context per job (cookies/consent isolated).
- Per-context options: `locale: 'en-IN'`, `timezoneId: 'Asia/Kolkata'`, viewport 1366×900, `geolocation` only when useful.
- Proper stealth: `playwright-extra` + `playwright-extra-plugin-stealth` (not the Puppeteer plugin applied to Playwright).
- Remove `--disable-http2`; enable HTTP/2.
- Block images/media/fonts/analytics on search pages; allow CSS.
- On detail pages, block images too — image URLs come from attributes, no need to download.
- Rotate user agents per context from a realistic desktop/mobile list.
- Consent handling: click Accept/Reject once and persist the resulting cookies in the context.
- CAPTCHA detection: URL contains `/sorry/`, body contains "unusual traffic", or a recaptcha iframe exists.
  - Mark the job `blocked`.
  - Retry once with a fresh context; if a proxy pool is configured, rotate.
  - Fall back to the Local Finder/Bing path for that zone.
  - Surface a clear run warning in the UI.
- Per-domain concurrency cap and randomized 300–900ms delays.

### 5.7 Proxies

- Default: direct connection. Open public proxy lists are unreliable and slow; do not depend on them.
- Optional: `PROXY_URLS` env (comma-separated) with health checks.
- Sticky per domain/job; rotate only after a block or failure.
- Track success rate per proxy; quarantine bad proxies.
- Never log proxy credentials.

### 5.8 Ultra-fast scheduling

`server/src/services/runPlanner.js`:

- Resolve the location to a scope using the local India hierarchy, not an LLM.
  - City/town: one or more localities.
  - District: all mandals (not just the first 12).
  - State: all districts (not just the first 12).
  - Radius: a grid of points using the existing golden-angle generator, respecting radius and density.
  - Village: target directly when the user asks for it.
- Create one job per zone with a weight (expected result volume).
- Cap zones by a configurable budget so a state run doesn't accidentally start 600 browsers.
- Show the plan in the UI before/while running: zones, estimated time, and progress.
- Use the static `india_villages.json` hierarchy as the source of truth; use AI only for fuzzy suggestions, never for critical geography.

**Concurrency:**

- Worker pool: 2 workers by default on 8 cores; configurable.
- Per worker: 1 Chromium, 6 detail pages, 16 HTTP enrichment requests.
- Global DB writes are batched in transactions every 250ms.
- SSE events are batched every 250–500ms to avoid render storms.
- Batch website enrichment separately from Google detail extraction so slow websites never block leads.

**Freshness:**

- A run never reads old search results.
- `run_leads.snapshot_json` is the exact data from that run.
- Canonical `vendors` is upserted; `last_seen_at` updates.
- The UI's default view is the selected run, not a merged global blob.
- A "Refresh" button creates a new run for the same query and shows a diff: new / updated / disappeared.

### 5.9 Dedupe and merge

`server/src/services/dedupeService.js`:

- Identity priority:
  1. Google place ID / CID.
  2. Source-native listing ID.
  3. Normalized primary mobile + country.
  4. Normalized name + geo distance (<150m) + city.
  5. Normalized name + pincode + category.
- Normalize names: lowercase, remove punctuation/SEO suffixes (`Best`, `No.1`, `in <city>`, `|`), collapse whitespace.
- Normalize phones with `libphonenumber-js`.
- Never merge on name alone.
- When merging:
  - Keep the strongest value for each field by confidence.
  - Keep all source records.
  - Keep all contact points.
  - Update `last_seen_at`.
  - Record `merged_from` in provenance.
- Expose possible duplicates in the UI only when confidence is low; do not silently hide them.

### 5.10 Quality scoring (one formula)

Replace the four score formulas with one transparent score:

- Mobile number present: 30
- Additional valid phone: 5
- Full address with pincode: 15
- Website reachable: 10
- Rating ≥ 4.0 and reviews ≥ 10: 15
- Email present: 10
- Images present: 5
- Verified by user or real check: 10
- Cap at 100; store the reasons in `quality_reasons_json`.

The UI shows the score plus the reasons, not a fake "A-Grade".

### 5.11 The complete vendor profile contract ("all data")

A vendor profile is generated by a **deep extraction pipeline**, not by a single page scrape. The pipeline captures every field group below from the best available source, then merges with provenance.

| Profile section | What must be captured | Primary source | Deep sources / fallbacks |
|---|---|---|---|
| **Identity** | Name, legal name, place ID, CID, branch/parent, business status, established year, owner/contact person, description, tagline | Google Maps place page | Website about page, IndiaMART, JustDial, social bio |
| **Category** | Primary category, full path, subcategories, specialties, services, products, tags | Google Maps category + place page | Website services/products pages, IndiaMART catalog, JustDial categories |
| **Contacts** | Every mobile, landline, WhatsApp, email, website, booking/contact link | Google Maps phone button + website | JustDial reveal, IndiaMART reveal, website `tel:`/`mailto:`/JSON-LD, social bio |
| **Address** | Full text + components + pincode + plus code + service area | Google Maps address block | Website contact page, IndiaMART address, JustDial address, GST record if public |
| **Geo** | lat/lng, accuracy, source, geohash, district/state membership | Google Maps coordinates | Geocode from address, local India hierarchy |
| **Hours** | Weekly hours, open now, timezone, holiday/special hours, popular times | Google Maps hours | Website hours/JSON-LD, Facebook page hours |
| **Reputation** | Rating, review count, rating distribution, top reviews (author/rating/text/date), recent review dates, owner responses | Google Maps reviews tab | Website testimonials/JSON-LD reviews, JustDial ratings, IndiaMART ratings |
| **Media** | Logo, hero, gallery, videos, dimensions, attribution | Google Maps photos tab | Website OG image/gallery, Instagram/Facebook public media, IndiaMART images |
| **Social** | Instagram, Facebook, LinkedIn, YouTube, Pinterest, X, WhatsApp; handle, followers, verified, bio | Website + Google Maps social links | Social dork, profile metadata, public page bio |
| **Operations** | Price range, packages, offers, payment methods, parking, accessibility, amenities, service options, languages, service areas, booking link | Google Maps "About" attributes | Website services/booking/FAQ pages, IndiaMART, JustDial |
| **Legal/tax** | GSTIN, PAN, CIN, legal entity, registration | Website footer/contact page, IndiaMART | Public business listings; unknown if not published |
| **Marketing** | Description, tagline, FAQs, certifications, awards, affiliations, brands, menu/catalog, brochures, price list | Website | Social bio, IndiaMART catalog, JustDial |
| **Provenance** | Source URL, extraction method, confidence, first seen, last seen, raw snapshot | All | — |

**Rule:** the fast path may return a partial profile, but the deep path must be able to fill every available field later. The vendor drawer always shows all sections, with `Unknown` and a `Deep extract` action where data is missing.

### 5.12 Deep extraction pipeline

Deep extraction is a per-vendor job graph. It runs after the listing appears, in parallel with other vendors, and never blocks the initial lead stream.

```
L0  Listing card            → name, place ID, phone (if shown), rating, address snippet, coords
L1  Place page               → full address, phones, website, category, hours, price, plus code, status
L2  Place tabs               → reviews, rating distribution, photos, popular times, about attributes
L3  Website crawl            → emails, phones, socials, address, GSTIN, services, products, description, hours, booking
L4  Social profiles          → handles, followers, bio, contact, address, hours, recent activity
L5  Structured data          → JSON-LD LocalBusiness/Organization/Product/Review/OpeningHours/Geo
L6  Verification (optional)  → phone/email validity, MX, manual verification
```

#### L1 — Google Maps place page

- Open the canonical place URL (`https://www.google.com/maps/place/?q=place_id:<id>` when available).
- Prefer the page's initialization state (`APP_INITIALIZATION_STATE`) over brittle DOM selectors.
- Fall back to DOM extraction for:
  - `h1` name
  - `[data-item-id="address"]`
  - `button[data-item-id^="phone:tel:"]` (all numbers)
  - `a[data-item-id="authority"]` website
  - category button, price range, plus code
  - `div.F7nice` rating/review count
  - hours table
  - business status
- Emit `lead.updated` as soon as L1 completes.

#### L2 — Place tabs

- **Reviews:** open/scroll the reviews tab; capture rating distribution, top 10–20 reviews with author, rating, text, date; capture owner responses when present.
- **Photos:** open the photos tab; capture hero + up to 20 gallery URLs, dimensions if present, attribution.
- **About:** capture attributes (service options, amenities, payments, accessibility, parking, languages, planning, from-the-business description).
- **Popular times:** capture weekly popular-times data when exposed.
- Each tab is a separate lightweight job so one missing tab does not fail the whole profile.

#### L3 — Website crawl

Create `server/src/services/websiteExtractor.js`:

- Fetch homepage, `/contact`, `/about`, `/services`, `/products`, `/menu`, `/gallery`, `/booking`, and sitemap URLs (bounded to 8 pages, 6s each).
- Parse:
  - `mailto:` and `tel:` links
  - text emails/phones (validated, never pincodes)
  - JSON-LD: `LocalBusiness`, `Organization`, `Store`, `Restaurant`, `Product`, `Offer`, `Review`, `AggregateRating`, `OpeningHoursSpecification`, `PostalAddress`, `GeoCoordinates`, `sameAs`, `telephone`, `email`, `priceRange`, `paymentAccepted`, `areaServed`, `foundingDate`, `taxID`, `vatID`
  - social links and handles
  - GSTIN/PAN/CIN patterns
  - description, services, products, FAQs, offers, certifications, awards
  - logo/OG image/gallery
  - address and hours from footer/contact page
- Respect `robots.txt` for pages beyond the homepage when the site disallows crawling; record the reason.
- Never disable TLS verification.
- Cache per domain for 7 days, but always let a forced deep extraction bypass the cache.

#### L4 — Social profiles

- From website links and Google Maps social links, fetch public profile metadata for Instagram/Facebook/LinkedIn/YouTube/Pinterest.
- Capture handle, URL, follower count, bio, category, website, contact button, address, hours, recent post date.
- If a profile requires login, store the URL and `requires_login = true`; do not fabricate followers or contact details.
- Optional social dork fallback (`site:instagram.com "<business>" "<city>"`) when no link is found.

#### L5 — Structured data

- Prefer JSON-LD over free text for every field it covers.
- Parse microdata (`itemprop`) and Open Graph as secondary sources.
- Record which structured type produced each field.

#### L6 — Verification

- Validate all phone/email formats.
- Optional MX lookup for emails; optional SMTP check only with explicit user consent.
- Never mark a contact "verified" based only on a source claim.
- Manual verification in the UI records the user, method, and timestamp.

#### Per-vendor job graph

```
listing
  ├── place_details      (must)
  ├── reviews            (parallel)
  ├── photos             (parallel)
  ├── about_attributes   (parallel)
  └── website             (parallel, if website exists)
        ├── contacts
        ├── services/products
        ├── socials
        └── legal/hours/media
  └── social_profiles     (after website links are known)
```

- Each node writes only the fields it owns.
- Merge order: structured data > official source page > website > social > search snippet.
- A failed node records `field_status` and retries independently.
- A vendor is `deep_complete` when all required nodes are done or have a terminal reason.

#### Merge policy

- Never overwrite a higher-confidence value with a lower-confidence one.
- Keep conflicting values in `field_conflicts` for review (e.g., two different addresses).
- Keep all contact points, not just the primary.
- If two phone numbers are valid, store both; mark the first mobile as primary.
- If a field is unknown, leave it null and expose `unknown_reason`.

### 5.13 What "all data" means in the UI

The vendor drawer/page is organized into these tabs/sections:

1. **Overview** — identity, status, description, category, quality/completeness, freshness.
2. **Contacts** — every phone/email/WhatsApp/social with source and confidence.
3. **Location** — address components, pincode validity, plus code, map, service area.
4. **Hours & operations** — weekly hours, open now, price range, payments, amenities, accessibility, languages, service areas.
5. **Reputation** — rating distribution, review snippets, recent activity, owner responses.
6. **Media** — logo, hero, gallery, videos, attribution.
7. **Legal** — GSTIN, PAN, CIN, legal entity, established year, owner/contact person.
8. **Sources** — every source URL, extraction method, timestamp, raw snapshot.
9. **CRM** — stage, owner, tags, notes, tasks, activity.
10. **Data quality** — completeness, missing fields, conflicts, verification status.

If a section has no data, the UI says `Not published by the source` and offers `Deep extract` / `Add manually` — never a fake value.

---

## 6. Folders — the structure the business understands

Folders are **views**, not copies of data. A vendor can appear in multiple folders without being duplicated.

### Folder tree

```
All Vendors
├── By Location
│   └── India
│       └── Andhra Pradesh
│           └── Palnadu
│               └── Narasaraopet
│                   └── Photographers
├── By Category
│   └── Wedding & Event Photographers
│       └── Wedding Photography
├── By Run
│   └── 2026-10-27 14:32 — Photographers in Hyderabad
├── By Status
│   ├── New
│   ├── Contacted
│   ├── Qualified
│   ├── Proposal
│   ├── Won
│   └── Lost
└── Saved Views
    └── Hyderabad mobile leads
```

### Rules

- A lead belongs to exactly one canonical vendor record.
- Run folders are immutable snapshots.
- Location and category folders are live views (always current).
- Status folders are live CRM views.
- Counts are computed from the DB, not from stale metadata.
- Each folder shows: lead count, mobile count, last updated, last run, top categories.
- Breadcrumbs: `All Vendors / Andhra Pradesh / Palnadu / Narasaraopet / Photographers`.
- A folder can be exported to CSV/XLSX/JSON with the current filters.
- Deleting a run deletes its snapshot, not the canonical vendors (unless orphaned).
- Saved views store filters, not data.

### Database approach

- `vendors` + `run_leads` + `crm` power the folder queries.
- A `GET /api/v1/folders/tree` endpoint returns the tree with counts in one request.
- `GET /api/v1/folders/:kind/:slug/leads` returns paginated leads with filters.
- For performance, maintain a `folder_counts` materialized summary refreshed after each run; fall back to SQL counts when needed.

---

## 7. Maps

### Requirements

- Every vendor with coordinates appears on the map.
- Every pin opens the vendor drawer.
- Clustering at low zoom; individual pins at high zoom.
- Filters sync between the table and the map.
- "Fit to results", "search this area", and "open in Google Maps".
- No fake pins, no pins at zone centers when the real coordinate is unknown.
- If coordinates are missing, show "Location unknown" in the list and exclude from the map; optionally geocode the address in the background and update the pin.

### Implementation

- Use the existing Leaflet + `react-leaflet` + `leaflet.markercluster`.
- Lazy-load the map only on map/result routes; do not ship Leaflet in the public landing bundle.
- Use OpenStreetMap raster tiles by default; optional satellite layer.
- Cluster by distance; show cluster count.
- Custom pin colors: has mobile, has website, verified, stale.
- Coverage layer: GeoJSON of districts with lead counts; clicking a district filters to it.
- Heatmap toggle for density.
- Server endpoint `GET /api/v1/map/leads?bbox=...&zoom=...&filters=...` returns clustered points when the viewport is large.
- Client-side clustering for small result sets; server-side for 5k+.
- Persist map view in the URL (`?lat=&lng=&z=&filters=`).
- Mobile: bottom sheet with the selected vendor, pinch/zoom, locate-me.

---

## 8. API v1 contract

Mount under `/api/v1`. Keep legacy `/api` routes temporarily behind a compatibility adapter during migration.

### Auth and system

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | `{email,password}` → `{token,user}` |
| POST | `/auth/logout` | revoke token |
| GET | `/me` | current user |
| GET | `/health` | DB, worker, queue, engine health |
| GET | `/settings` | non-secret settings |
| PATCH | `/settings` | update settings; secrets write-only |

### Runs

| Method | Path | Purpose |
|---|---|---|
| POST | `/runs` | `{query,category,location,scope,engines,mode,fresh}` → `{runId}` |
| GET | `/runs` | paginated run history |
| GET | `/runs/:id` | status, stats, plan, engine health |
| POST | `/runs/:id/cancel` | cancel only this run |
| POST | `/runs/:id/retry` | retry failed zones |
| GET | `/runs/:id/events` | SSE stream; supports `Last-Event-ID` |
| GET | `/runs/:id/leads` | paginated leads with filters/sort |
| GET | `/runs/:id/diff` | new/updated/gone vs previous same-query run |
| POST | `/runs/:id/deep-extract` | bulk deep-extract every vendor in the run (or only incomplete ones) |
| GET | `/runs/:id/quality` | field coverage: phones, address, hours, reviews, images, socials, legal, completeness distribution |
| GET | `/runs/:id/export` | CSV/XLSX/JSON export job; field selection supported |

### Vendors and contacts

| Method | Path | Purpose |
|---|---|---|
| GET | `/vendors` | search/filter/sort/paginate across canonical vendors; filters include mobile, completeness, source, fresh/stale, legal data |
| GET | `/vendors/:id` | complete vendor profile: every section, contacts, sources, field metadata, conflicts, CRM |
| GET | `/vendors/:id/raw` | raw source snapshots and extraction provenance |
| GET | `/vendors/:id/quality` | completeness, missing fields, field conflicts, verification status |
| POST | `/vendors/:id/deep-extract` | queue the full per-vendor deep extraction job graph; returns `{jobId}` |
| GET | `/vendors/:id/deep-extract` | per-node status: place, reviews, photos, about, website, socials, structured data, legal |
| PATCH | `/vendors/:id` | edit any profile field, tags, status, verification |
| POST | `/vendors/:id/enrich` | legacy alias for deep extraction (kept during migration) |
| POST | `/vendors/:id/verify` | mark a field/contact verified with method |
| DELETE | `/vendors/:id` | soft delete |
| GET | `/vendors/:id/reviews` | paginated reviews |
| GET | `/vendors/:id/activity` | CRM activity timeline |

### Folders, map, CRM, exports

| Method | Path | Purpose |
|---|---|---|
| GET | `/folders/tree` | full tree with counts |
| GET | `/folders/:kind/:slug/leads` | paginated leads in a folder |
| GET | `/map/leads` | points/clusters for bbox + filters |
| GET | `/map/coverage` | district coverage stats |
| GET | `/crm/board` | kanban data |
| PATCH | `/crm/:vendorId` | stage, owner, tags |
| POST | `/crm/:vendorId/notes` | add note |
| POST | `/crm/:vendorId/tasks` | add/update task |
| POST | `/exports` | create export job |
| GET | `/exports/:id` | export status/download |

### Response conventions

- Errors: `{ error: { code, message, details? } }`.
- Lists: `{ items, page, pageSize, total }`.
- IDs are strings.
- All mutations return the updated resource.
- Every request has a `requestId` for logs.

---

## 9. UI/UX plan

### Design principles

- **Dark, premium, fast.** Keep the existing dark neon identity but refine it: fewer glows, stronger contrast, consistent spacing, real data.
- **One primary action per screen.** Search → run is the hero.
- **Progressive disclosure.** Show the essential fields immediately; details in a drawer.
- **No fake numbers.** Replace every fabricated metric with a real count or `Unknown`.
- **Mobile-first.** The owner will use this on a phone in the field.
- **Accessible.** Keyboard navigation, focus traps, aria labels, contrast, reduced motion.

### App shell

- Left sidebar (desktop) / bottom nav (mobile):
  - Search
  - Runs
  - Vendors
  - Map
  - Folders
  - CRM
  - Settings
- Top bar: current run status (live dot), freshness, worker health, command palette (`Ctrl/Cmd+K`), user menu.
- Route-level code splitting; Overview/Leaflet not in the landing bundle.

### Screen 1 — Search / New Run

- Natural-language input: "wedding photographers in Narasaraopet".
- Parsed chips: category, location, scope.
- Location autocomplete from the local India hierarchy (state/district/mandal/village).
- Scope selector:
  - City / Town
  - District (all mandals)
  - State (all districts)
  - Custom radius + density
  - Full India (advanced, with a cost warning)
- Mode:
  - **Fast** — list + phones + address (default)
  - **Deep** — adds reviews, images, socials, website enrichment
- Engines: Google Maps (default), JustDial, IndiaMART, Wedding verticals, Social. Show health/availability.
- Fresh scrape toggle: on by default and not silently disabled.
- Preview panel: number of zones, estimated time, engines, expected cost/limit.
- Button: `Start fresh scrape`.

### Screen 2 — Run console

- Header: query, scope, status, elapsed, leads found, mobile count, leads/sec.
- Progress: zones planned / completed / running / failed.
- Live table (virtualized) with columns:
  - Business
  - Mobile(s)
  - Category
  - Area / City
  - Rating
  - Quality
  - Source
  - Status
- Each new lead streams in; mobile numbers are visible immediately when available.
- Filters: has mobile, has WhatsApp-ready, min rating, category, source, verified.
- Map panel on the right (desktop) / tab (mobile).
- Run log drawer with structured, human-readable events; no raw stack traces in the main UI.
- Cancel run (only this run).
- When complete: summary, export, save view, open folder, diff.

### Screen 3 — Vendors / All Leads

- Global searchable vendor table.
- Column configuration, saved views, bulk actions.
- Filters: state/district/city, category, mobile, rating, review count, website, verified, fresh/stale, source.
- Bulk: assign, stage, tag, export, enrich, delete.
- Row click → vendor drawer.

### Screen 4 — Vendor detail drawer/page

Sections:

1. Header: name, category, rating, review count, business status, quality score with reasons, freshness.
2. Contact points: every mobile/landline/email/WhatsApp/social with copy/call/WhatsApp/email actions, source, confidence, verified status.
3. Location: full address, components, pincode validity, plus code, map, "Open in Google Maps".
4. Operations: weekly hours, open now, price range.
5. Reputation: rating distribution, review snippets, source links.
6. Media: hero + gallery with attribution.
7. Sources: every source URL with fetched timestamp and raw-data button.
8. CRM: stage, owner, tags, notes, tasks, activity timeline.
9. Actions: verify, enrich, refresh this vendor, export, delete.

### Screen 5 — Map

- Full-screen map with filters.
- Cluster colors by mobile presence.
- Click cluster → zoom; click pin → drawer.
- "Search this area" creates a new run for the visible bbox.
- Coverage tab: district polygons with lead counts and freshness.
- Toggle: pins / heatmap / coverage.
- URL state.

### Screen 6 — Folders

- Tree on the left, folder contents on the right.
- Folder header: breadcrumbs, counts, last updated, top categories, actions.
- Tabs: Leads / Map / Runs / Analytics.
- Export current folder.
- Saved views.
- "New folder" only for saved views/filters; geography/category/run/status folders are automatic.

### Screen 7 — CRM

- Kanban by stage, server-persisted.
- Drag/drop with optimistic update.
- Filters by folder/run/owner/tag.
- Vendor drawer with notes/tasks/activity.
- No localStorage.

### Screen 8 — Settings

- Profile/auth.
- Scraper defaults: engines, concurrency, mode, proxies, CAPTCHA provider.
- Data: export all, import, backup, vacuum.
- API keys: write-only, masked, stored in `.env`/secrets file, never in source.
- Worker health and queue diagnostics.
- Danger zone: clear data, delete runs.

### Design system

Create `client/src/ui/`:

- `Button`, `IconButton`, `Input`, `Select`, `Combobox`, `Checkbox`, `Switch`, `Badge`, `Card`, `Dialog`, `Drawer`, `Tabs`, `Tooltip`, `Popover`, `Table`, `Pagination`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `CommandPalette`.
- Tailwind tokens for color, spacing, radius, shadow, typography.
- Dark default + light mode.
- Use Radix primitives for behavior; Tailwind for styling.
- No raw hex colors in pages.
- No emoji as functional icons.

---

## 10. Security, reliability, and local operations

### Security

- Remove all hard-coded secrets from source and `settings.json`; rotate the leaked NVIDIA and Ola keys.
- `.env` + `.env.example`; secrets are write-only through the API.
- Replace plaintext passwords with `scrypt` hashes.
- Bearer tokens in `sessions`; expire after 30 days; revoke on logout.
- Auth middleware on every route except `/health` and `/auth/login`.
- Tenant scoping on all vendor/run/folder queries.
- `helmet`, CORS allow-list, body-size limits, rate limits.
- Upload validation: image MIME, 5 MB max, random filenames, no path traversal.
- Remove `child_process.exec` with user input; use `spawn` with argument arrays.
- Remove the unmounted proxy route or guard it behind auth + allow-list.
- Validate all request bodies with `zod`.
- No stack traces in API responses.

### Reliability

- SQLite WAL + `busy_timeout`; atomic writes via transactions.
- Backups: nightly copy of the DB + `.bak` before migrations; `VACUUM` on demand.
- Jobs retry with exponential backoff; dead-letter after max attempts.
- Per-run cancellation; no global abort.
- Worker heartbeat; stale jobs are reclaimed.
- Structured logs with run ID, job ID, engine, duration, result count.
- Health endpoint reports DB, worker, queue, engine cooldowns.
- Graceful shutdown: stop claiming jobs, close browsers, flush DB.

### Local-first distribution

- `npm run setup` installs server/client, creates `.env`, runs migrations, imports legacy data.
- `npm run dev` starts API + worker + client.
- `npm run build` builds the client; the server can serve `client/dist` for a single-process local install.
- `npm run start:local` serves the built app + API + worker.
- Optional Docker Compose for a single machine.
- Backups documented in `docs/OPERATIONS.md`.

---

## 11. Migration from the current code

### Data migration

`scripts/migrate-json-to-sqlite.js`:

1. Back up `server/data/` and `server/db/user_sessions/`.
2. Import `scraped_vendors.json` into `vendors`, `vendor_sources`, `contacts`, `run_leads`.
3. Import each session file as a `runs` row + `run_leads` snapshot.
4. Normalize phones, names, addresses, pincodes.
5. Deduplicate using the new identity rules.
6. Report: imported, merged, skipped, invalid phones.
7. Keep the JSON files for 30 days as rollback.

### Code migration

- Keep `dbAdapter` as a thin facade during Phase 1, backed by the new repositories.
- Add `/api/v1` while keeping `/api` working.
- Move the client to `/api/v1` screen by screen.
- Delete legacy routes only after the UI no longer calls them.
- Remove dead client engines, fake seeds, and duplicated CRM stores in Phase 4.

### Flag

`USE_SQLITE=true` in `.env`; default false until migration passes tests, then true. `USE_V1_API=true` for the client.

---

## 12. Phased delivery plan

### Phase 0 — Safety and baseline (2–3 days)

**Outcome:** The current app stops corrupting data and stops lying about basic operations.

Tasks:

- Rotate leaked API keys; remove secrets from source; add `.env.example`.
- Atomic JSON writes with backup for the interim period.
- Fix `PUT /api/vendors/:id` to support `{ verified: boolean }` and stop forcing true.
- Fix upload URL (`/api/upload/<file>`) and add MIME/size validation.
- Fix `/api/scrape/maps` argument order.
- Remove the shadowed duplicate `/api/scrape/batch`.
- Replace `exec` with `spawn` in `/api/scrape/python`.
- Fix client sticky `loading` state after a run ends.
- Add `node:test` for phone normalization, pincode extraction, and session contracts.
- Add `docs/OPERATIONS.md` and `docs/IMPLEMENTATION_PLAN.md`.

**Acceptance:** `npm test` passes; verify/unverify works; upload URL returns 200; no command injection; no known S1 data-loss path on a normal shutdown.

### Phase 1 — Data foundation and workers (4–6 days)

**Outcome:** SQLite is the source of truth; runs, jobs, events, and folders are real.

Tasks:

- Create `server/src/db/` (connection, migrations, repositories).
- Create the schema from section 4.
- Implement run/job/event repositories and the worker claim loop.
- Create `server/src/workers/scraperWorker.js` and start it from `dev.js`.
- Replace `dbAdapter` reads/writes with repositories behind a facade.
- Implement auth (local owner account, token, scrypt).
- Implement `/api/v1/runs`, `/api/v1/vendors`, `/api/v1/folders/tree`, `/api/v1/map/leads` (basic), `/api/v1/runs/:id/events` (SSE).
- Migrate legacy JSON/session data.

---

## 13. Verification log (2026-10-29)

Backend restarted on port 5002 with all latest fixes. Client built and served on 5173.

### Verified end-to-end

**Rebrand & landing**
- Logo/title/nav/footer rebranded to `scraper.co.in` (ui.jsx Logo, client/index.html title).
- LandingV2 rewritten: plain-language 3-step flow, features, folders, CRM preview, animated background grid (`v2-land-grid` drifting grid + glows), high-contrast lime buttons (`color: #0a0e08`), radar demo with real zone pins.
- Browser-verified at `http://127.0.0.1:5173/` — premium, no choppy UI.

**Command center (unified workspace)**
- `/command` owns Leads / Map / CRM / Folders / Insights + Overview home; `/app/*` legacy dashboard retained with redirects into `/command`.
- Advanced mode has NO source/directory buttons — engines auto-selected by category router (google-local-finder + maps + justdial for Plumbers).
- Search bar: local drafts + startTransition + 150ms debounce + abortable suggestions + 300-entry/2-min LRU cache — smooth typing, no choppy dropdown.
- Activity log collapsed by default; Tools menu (Command center / Automations / Settings / Team).
- Browser-verified tabs render: Overview, Leads, Map, CRM, Folders, Insights.

**Search flow (fresh + saved)**
- `POST /api/scrape/omni` always auto-selects engines, stops deep jobs (`deepStopped`), purges stale live leads (`purge.removed=113`), returns `purge` + `deepStopped`.
- Folder opened at run start (status running, 0 leads), overwritten at completion, saved on failure. Old vaults PRESERVED (`vaultsRemoved=0`).
- New folder `omni_mvsuu1jw`: Plumbers in Vijayawada, 87 leads / 73 phones, real city preserved (not drifted to village), status completed.
- `GET /api/sessions/list` returns 5 sessions (old folders intact). `GET /api/sessions/:id` returns full folder. CSV/JSON export works with validated mobiles + WhatsApp URLs.

**CRM (persisted on vendor record in JSON store)**
- `PUT /api/vendors/:id/crm` accepts crmStage/crmStage, note, tasks, clearNotes, clearTasks. Stage normalization maps legacy uppercase stages to new model.
- `POST /crm/notes`, `POST /crm/tasks`, `GET /crm` per vendor.
- Verified: stage `in_discussion`, 1 note, 1 task, engaged=true, read-back correct.
- VendorDrawer rewritten: stage chips, note textarea, note history, save via updateVendorCrm. No stale crmStatus/CRM_STAGES references.

**Validation & guards**
- JustDial generic rows rejected via normaliseRowName/isGenericRowName (exported). "Results", "<b>Results</b>", "Results for Plumbers", "Sponsored Listing" → rejected; real names kept.
- `node --check` passes on all changed server files.
- `/api/deep-profile/health` ok=true, trackedFields=52. `/api/locations/stats` villages=619287, index ready.
- Search suggestions: "plum in vij" → Plumbers/Vijayawada ready=true no FIX; "banquet hall hyderbad" → Hyderabad corrected FIX.

**Not yet verified (follow-up)**
- Full browser-verified Advanced `plum` + `Vijayawada` run through UI (API equivalent verified).
- Build artifacts committed to `client/dist`.

- Add DB indexes and FTS search.
- Add backup/restore scripts.

**Acceptance:** restart preserves runs/jobs; no whole-file rewrites on lead insert; session list shows name, counts, and leads; cross-user session reads are blocked; 1,000 inserts complete in <2s.

### Phase 2 — Google Maps v2 and the complete profile (7–9 days)

**Outcome:** The primary engine captures mobile numbers **and the full Google Maps vendor profile** — identity, address components, phones, website, categories, hours, price, plus code, reviews, images, about attributes, and business status — reliably and fast.

Tasks:

- Build `browserPool.js`, `pageUtils.js`, `extractors/googleMaps.js`.
- Rewrite `engine-google-places.js` as the Google Maps adapter.
- Implement partial leads + L1 place details + L2 tabs (reviews, photos, about) + SSE updates.
- Extract from `APP_INITIALIZATION_STATE` with DOM fallbacks.
- Implement `phoneService.js` with `libphonenumber-js` (mobiles, landlines, multiple numbers).
- Implement `addressService.js` (components, pincode validation, city/district from local hierarchy).
- Implement `profileService.js` (field merge, confidence, completeness, conflicts).
- Implement `mediaService.js` (hero/gallery/images, dimensions, attribution).
- Implement `reviewService.js` (rating distribution, top reviews, owner responses, recent dates).
- Implement `hoursService.js` (weekly schedule, open now, timezone, special hours).
- Implement `dedupeService.js` and canonical vendor upsert.
- Implement `qualityService.js` with one transparent score and reasons.
- Add fixtures from saved Google pages and unit tests.
- Add a golden dataset of 100 businesses and measure full-profile coverage, not just phones.

**Acceptance:** first lead < 5s; 100 leads < 90s; ≥90% of Google-displayed phones captured as valid mobiles; ≥90% of Google-displayed addresses, categories, ratings, and hours captured; ≥70% of vendors have 3+ review snippets and 3+ images in deep mode; 0 pincode-as-phone errors; 0 duplicate vendors for the same place ID; every field has a source and timestamp.

### Phase 3 — Deep enrichment, multi-source, and legal/operations data (6–8 days)

**Outcome:** Every vendor can be expanded beyond Google: website crawl, social profiles, structured data, GSTIN/legal details, services/products, payments, amenities, accessibility, languages, booking links, and the other listing engines.

Tasks:

- Website extractor: homepage/contact/about/services/products/gallery/booking, JSON-LD, emails, phones, socials, GSTIN/PAN/CIN, hours, address, description, FAQs, offers, certifications, awards.
- Social profile extractor: Instagram/Facebook/LinkedIn/YouTube/Pinterest metadata, bio, followers, contact, address, hours.
- Structured data extractor: LocalBusiness, Organization, Product, Review, AggregateRating, OpeningHours, PostalAddress, GeoCoordinates, sameAs.
- Deep profile job graph with per-node retries and field-level status.
- JustDial Firefox adapter with "Show Number" and pagination.
- IndiaMART adapter with detail-page phone reveal and catalog data.
- WeddingBazaar/WeddingWire/Mandap adapters with public detail extraction.
- Engine health/circuit breaker and UI status.
- Per-source metrics: found, full-profile rate, phone rate, error rate.

**Acceptance:** every enabled engine either produces leads or reports a clear, visible error; no silent 0-result success; each source has at least one fixture test; deep mode adds website/social/legal/operations fields where published; ≥50% of deep-mode vendors have a description and services/products; ≥40% have at least one social profile; no fabricated legal or tax values.

### Phase 4 — UI/UX rebuild (6–8 days)

**Outcome:** The product looks and feels like a finished product, not a demo.

Tasks:

- New app shell, design tokens, Radix primitives.
- Search/New Run screen with scope/engine/mode controls.
- Run console with live table, progress, map, logs.
- Vendors table with virtualization, filters, saved views, bulk actions.
- Vendor detail drawer with all profile sections: overview, contacts, location, hours/operations, reputation, media, legal, sources, CRM, data quality.
- Deep extract action per vendor and bulk deep extract for a run/folder; show per-node progress.
- Data completeness panel with missing fields and conflicts.
- Map screen with clusters, heatmap, coverage, URL state.
- Folders tree and folder detail.
- Remove fake seeds, fake metrics, and placeholder badges.
- Mobile bottom nav, responsive layouts, accessibility pass.
- Route-level code splitting; Leaflet lazy-loaded.

**Acceptance:** every P0 workflow works on desktop and mobile; every vendor profile shows all sections with real values or `Unknown`; deep extract visibly fills fields; no screen shows fabricated data; Lighthouse accessibility ≥ 90; initial route JS < 250KB gzip; 10k-row table scrolls smoothly.

### Phase 5 — CRM, exports, analytics (3–4 days)

**Outcome:** A lead can be worked, not just scraped.

Tasks:

- Server-persisted CRM stages, owners, tags, notes, tasks, activity.
- Kanban with drag/drop and optimistic updates.
- CSV/XLSX/JSON exports with field selection and current filters.
- Saved views and folder exports.
- Analytics: leads by source, mobile rate, completeness, freshness, coverage, run duration.
- No localStorage for business data.

**Acceptance:** stage/notes survive reload and another browser; export matches the visible filtered set; analytics match SQL counts.

### Phase 6 — Performance and hardening (3–4 days)

**Outcome:** It holds up at real volume.

Tasks:

- Load test 10k vendors / 100k run leads.
- Add missing indexes; profile slow queries.
- Tune worker concurrency, browser memory, and DB batch sizes.
- Add backpressure and queue bounds.
- Add retry/dead-letter dashboards.
- Add error boundaries and user-safe error states.
- Security review: auth, upload, CORS, rate limits, secrets.

**Acceptance:** p95 API list latency < 200ms at 100k leads; 10k-pin map clusters render in < 1s; memory stable over a 30-minute run; worker crash resumes queued jobs.

### Phase 7 — Cutover (1–2 days)

**Outcome:** The new stack is the default.

Tasks:

- Run migration on a copy; verify counts and spot-check 100 vendors.
- Flip `USE_SQLITE`/`USE_V1_API`.
- Keep legacy JSON export and a rollback flag.
- Write runbook: start, stop, backup, restore, rotate keys, add engine.
- Final acceptance run on a real city/category.

**Acceptance:** fresh install from zero works with `npm run setup && npm run dev`; upgrade from legacy works; rollback tested.

---

## 13. Acceptance metrics

| Metric | Target |
|---|---|
| First lead visible | < 5s |
| 100 mobile leads, city | < 90s |
| 1,000 leads, city | < 10 min |
| Valid Indian mobile rate (where source shows a number) | ≥ 95% |
| Mobile capture vs source | ≥ 90% |
| Pincode-as-phone errors | 0 |
| Duplicate vendors by place ID | 0 |
| Duplicate vendors by normalized mobile | < 1% |
| Leads with source URL + timestamp | 100% |
| Leads with full address | ≥ 80% |
| Leads with pincode valid | ≥ 70% |
| Leads with website (where available) | ≥ 60% |
| Leads with rating/reviews | ≥ 80% |
| Leads with at least one image (deep mode) | ≥ 50% |
| Median populated profile fields per vendor (fast mode) | ≥ 25 |
| Median populated profile fields per vendor (deep mode) | ≥ 45 |
| Vendors with category path | ≥ 90% |
| Vendors with weekly hours | ≥ 70% |
| Vendors with 3+ review snippets (deep mode) | ≥ 70% |
| Vendors with 3+ images (deep mode) | ≥ 60% |
| Vendors with description/services (deep mode) | ≥ 50% |
| Vendors with at least one social profile (deep mode) | ≥ 40% |
| Vendors with legal/tax details where published | 100% of published values |
| Fields with source + timestamps | 100% of non-null fields |
| Fabricated fields | 0 |
| Run success rate (no crash) | ≥ 98% |
| UI table with 10k rows | 60fps scroll |
| API list p95 at 100k leads | < 200ms |
| Freshness display | every lead shows last seen |
| Fake data | 0 |

---

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Google anti-bot / CAPTCHA | No leads for a zone | Detect, rotate context/proxy, fall back to Local Finder/Bing, show warning |
| JustDial Akamai | 0 results | Firefox engine, residential proxy option, detail-page fallback, explicit engine status |
| Source markup changes | Extraction breaks | Fixtures + selector fallbacks + initialization-state parsing + health checks |
| Scraping ToS/legal exposure | Product risk | Use responsibly, respect rate limits, prefer public data, allow user-provided proxies/keys, document usage policy |
| SQLite write contention | Slow/failed writes | WAL, short transactions, batch writes, single writer per table, busy timeout |
| Large state/memory | Crashes | Streaming inserts, pagination, virtualization, bounded queue, worker isolation |
| Secret leakage | Account compromise | Rotate keys, `.env`, no source fallbacks, secret scan in CI |
| Data quality regressions | Trust loss | Golden dataset, field-level confidence, no fake values, review UI |
| Migration data loss | Lost leads | Backup, dry-run counts, keep JSON for 30 days, rollback flag |
| UI scope creep | Delay | Ship Phase 4 in vertical slices; design system first; no feature outside the roadmap |

---

## 15. First sprint backlog (start here)

These are the first concrete work items, in order:

1. `docs/IMPLEMENTATION_PLAN.md` (this document).
2. `server/src/utils/atomicJson.js` + tests; wire into `dbAdapter`/`queue`/`sessionRoutes`.
3. Fix `PUT /api/vendors/:id` verification contract + client callers.
4. Fix upload URL + validation.
5. Fix `/api/scrape/maps` args and remove the shadowed `/batch`.
6. Replace `exec` in `/python` with `spawn`.
7. Fix client `loading` state and stale polling.
8. Add `server/test/` with phone/pincode/session tests.
9. Add `docs/VENDOR_FIELD_MATRIX.md` defining every profile field, source, confidence rule, and UI label.
10. Add saved-page fixtures for Google Maps (feed, place, reviews, photos, about) and a fixture-based extractor test.
11. Create `server/src/db/` + migration `001_init.sql` (no route changes yet).
12. Create `scripts/migrate-json-to-sqlite.js` with a dry-run report.

Then Phase 1 begins: repositories, worker, `/api/v1/runs`, SSE, and the migrated data. Phase 2 adds the profile extractors and deep job graph.

---

## 16. Open decisions (defaults chosen)

| Decision | Default | Why |
|---|---|---|
| Local DB | SQLite | Local-first, zero infra, fast enough for 100k+ leads. |
| Auth | Local owner account + optional LAN users | Protects data without forcing a cloud service. |
| Scraper process | Separate worker | Keeps API/UI responsive and restartable. |
| Proxies | Direct by default; optional env list | Public proxies are unreliable and slow. |
| Maps | Leaflet + markercluster | Already installed, proven, handles 10k+ with clustering. |
| Phone validation | `libphonenumber-js` | Correct Indian mobile/landline classification. |
| Reviews/images | Deep mode | Keeps the fast path fast; the UI shows what is still pending. |
| Profile depth | Fast = core profile; Deep = complete profile | Every vendor can be expanded later without re-running the search. |
| Deep extraction | Per-vendor job graph, resumable, field-level status | One failed source does not lose the whole profile. |
| WhatsApp | "Mobile / WhatsApp-ready", not "verified" | No fake verification. |
| Data freshness | Always live; cached geocode/website only | Meets the "fresh every time" requirement. |
| UI theme | Dark premium default + light mode | Keeps the brand, improves accessibility. |

---

## 17. Definition of done for the whole program

The rewrite is done when:

- A new user can install locally, add keys if needed, and run a real scrape in under 5 minutes.
- A city scrape returns real mobile numbers **and a complete vendor profile**, with source and timestamp for every non-null field.
- Every vendor can be deep-extracted to fill website/social/legal/operations/review/media fields where the source publishes them.
- The UI shows the full profile with `Unknown` for missing data, a completeness score, and a deep-extract action — never a fake value.
- The same query run twice produces two fresh runs and a meaningful diff.
- Every lead can be opened on a working map.
- Folders make sense by location, category, run, and status.
- The UI has no fake data, no dead buttons, and no stuck loading states.
- The database survives restarts and crashes.
- The test suite covers phones, addresses, full-profile extraction, dedupe, runs, folders, and exports.
- The team can operate it with the runbook: start, stop, back up, restore, rotate keys, add an engine.

---

## 18. Live verification log (October 2026)

This section records what was actually executed against live sources, not what is planned. It is the reference for regression checks.

### 18.1 Category -> engine matrix

`server/src/services/categoryRouter.js` resolves a free-text query into a family, then `buildAutoPlan()` selects engines:

| Family | Example query | Discovery engines | City-wide engines |
|---|---|---|---|
| Home services | `plumbers in Vijayawada`, `electricians in Guntur` | Google Local Finder, Google Maps | JustDial |
| Wedding | `banquet halls in Hyderabad`, `wedding planners in Guntur` | Google Local Finder, Google Maps | JustDial, WeddingBazaar, WeddingWire, Mandap |
| Health | `dental clinics in Bangalore` | Google Local Finder, Google Maps | JustDial |
| Food / hospitality | `restaurants in Vijayawada` | Google Local Finder, Google Maps | JustDial |
| Retail / showrooms | `car showrooms in Guntur` | Google Local Finder, Google Maps | JustDial |
| B2B / industrial | `packaging suppliers in Hyderabad` | Google Local Finder, Google Maps | JustDial, IndiaMART |

Any category that does not match a specialty family still runs the universal Google Local Finder + Maps path, with JustDial added when the router recognizes a trade. Engines never invent category-specific sources that cannot serve that category.

### 18.2 Verified runs

| Run | Query | Leads | Mobile leads | Unique mobiles | First lead | Total time | Sources |
|---|---|---|---|---|---|---|---|
| CLI | `plumbers in Vijayawada` | 91 | 78 | 140 | 4.28s | 51.65s | Maps 56 / JustDial 35 |
| CLI | `electricians in Guntur` | 161 | 115 | 167 | 3.17s | 48.24s | Maps 117 / JustDial 44 |
| UI | `Plumbers in Vijayawada` | 87 | 75 | - | streamed | 57s | Maps + JustDial |
| UI | `Electricians in Guntur` | 155 | 117 | - | streamed | 55s | Maps + JustDial |

All four runs completed their scrape phase inside the 5s / 90s targets. Deep enrichment was queued by the server after each scrape phase and streamed into the Deep tab.

### 18.3 JustDial specifics

- Category IDs come from `https://www.justdial.com/webmain/ftxt.php`.
- Listings come from the mobile results API `https://m.justdial.com/verticals/hotel/searchziva`.
- One `ncatid` returns roughly 10-12 rows, so the engine resolves and fetches 4-6 related variants in parallel (`VARIANT_RULES` in `engine-justdial.js`).
- The row payload provides name, area, city, address, latitude/longitude, rating, review count, hours, category, images and CALL numbers.
- Shared helplines (appearing on three or more unrelated listings) are dropped.
- `whatsapp` / `whatsappAvailable` are always empty/false: a JustDial CALL number is a phone contact, not a confirmed WhatsApp account.
- Generic section-header rows (for example a row literally named `Results`) are rejected before they become vendors.

### 18.4 Deep phase coordination

- The orchestrator queues deep enrichment after the scrape phase closes; the client never queues a duplicate batch.
- A new fresh run calls `deepProfileService.stopAll('superseded by a fresh run')` before `leadRetention.prepareFreshRun()`.
- Jobs transition `running -> stopping -> stopped`; the worker finishes only the vendor it already holds.
- Missing vendors are counted as `skipped`, not `failed`, so a purge can no longer produce a "Vendor not found" storm.
- Verified: starting Electricians/Guntur while the Plumbers/Vijayawada deep job was running returned `deepStopped >= 1`; the old job ended `stopped` with 0 "Vendor not found" results.

### 18.5 Map and UI

- Basemap: Esri `Canvas/World_Dark_Gray_Base` + `World_Dark_Gray_Reference` (CARTO now watermarks unkeyed tiles).
- Live map: coverage zones, 2.7s pulse rings on the active zone, auto-fly to the active area, clustered vendor pins, `SCANNING` -> `COMPLETE` HUD.
- Verified in browser: 30/30 Esri tiles loaded, no watermark, 164/164 leads geo-anchored, 10-zone list, radar rings animating.
- Legacy dashboard remains available at `/app/overview` and consumes the flat `/api/scrape/jobs` array without errors.

### 18.6 Known limits

- Google Local Finder commonly hits CAPTCHA and falls back to Maps. The fallback is functional but adds latency and duplicate work.
- IndiaMART anti-bot intermittently returns zero result cards; retries mitigate but do not guarantee coverage.
- WeddingBazaar and WeddingWire phone numbers are OTP/login-gated; helplines are never stored and deep enrichment resolves real numbers later when a website is available.
- Deep enrichment is CPU/browser-bound: about 4-6 seconds per vendor with 3 workers; 1,000 vendors is a multi-minute background phase by design.

---

## 19. Exact-category fidelity + single workspace (round 6)

### 19.1 Why

Searching `wedding photographers in Vijayawada` returned banquet halls, hotels and
function halls. Root cause: venue-only directories (Mandap.com, WeddingBazaar,
WeddingWire) were queried for every wedding category, and their list pages were
saved with the requested category stamped on them.

### 19.2 Fidelity gate

`server/src/services/categoryFidelity.js` is now the single decision point:

- `detectRole(category)` maps a request to photographer / venue / caterer /
  decorator / makeup / planner / invitation / music.
- `isGenericName(name)` rejects UI chrome (`Results`, `Sponsored?`, `Featured
  listing`) including private-use icon glyphs JustDial embeds in labels.
- `isVendorRelevant(vendor, category)` rejects a vendor whose name, URL or
  source category clearly belongs to a different role. A positive signal beats a
  negative one, so `Banquet Hall Photography` is still a photographer.
- `isVenueCategory(category)` gates the venue-only directories.

Applied in: `engine-mandap`, `engine-google-places`, `engine-google-serp-local`,
`engine-justdial`, `engine-weddingbazaar`, `engine-weddingwire`,
`engine-brave-dork`, `directoryVendor` (save-time guard), `leadRetention`
(fresh-run purge), `deepProfileService` (never overwrite a real name with a
generic page title), and `categoryRouter.pickAutoEngines`.

`categoryRouter` no longer schedules `mandap`, `weddingbazaar` or `weddingwire`
for non-venue wedding categories.

### 19.3 Verification

| Run | Query | Leads | Phones | Venue-like names | Generic names | Sources |
|---|---|---|---|---|---|---|
| `cmd_fidelity2` (before directory gate) | wedding photographers in Vijayawada | 129 | 83 | 32 | 3 | Maps / JustDial / WeddingBazaar |
| `cmd_fidelity4` (all gates) | wedding photographers in Vijayawada | 91 | 83 | 0 | 0 | Maps 64 / JustDial 27 |

`node scripts/repairVendorNames.js` repairs records already polluted by the old
deep-enrichment naming bug (104 vendors, 10 renamed, 0 dropped).

### 19.4 Single workspace

- `/app/*`, `/marketplace/*`, `/login` and `/landing-legacy` all redirect to the
  command center or the landing page. The classic admin shell, its sidebar and
  its Automations/Settings/Users pages are no longer routed.
- The command center rail's "Open classic dashboard" link is replaced by an
  exact-match guard note; the Tools menu now contains only in-product actions
  (profile engine, coverage map, export CSV, refresh).
- Landing CTA now opens the scraper instead of the legacy dashboard.

### 19.5 Visual system

- Palette moved from lime/neon to professional navy + blue/cyan:
  bg `#070b14`, panels `#0d1526`/`#101a2e`, text `#e6edf7`,
  primary `#2563eb`, accent `#22d3ee`.
- Landing keeps the animated grid + glow background, now in blue/cyan.
- Folder modal verified in the browser: 12 folders listed, opening the current
  run renders 91 lead rows, CSV/JSON export buttons present, no console errors.

### 19.6 Folder integrity

Two paths could rewrite a completed folder with a partial list, which is why
some folders opened empty:

- `persistSessionVault` (start-of-run snapshot with 0 leads).
- `handleMasterStopAll` (aborted snapshot built from whatever survived a purge).

Both now refuse to overwrite a folder that already holds more leads. The abort
handler also matches leads strictly by `sessionId` / `sessionIds` instead of by
category, so a stop can no longer pull another run's leads into a folder.

Verified: opening the newest folder renders 86 lead rows, the previous run is
labelled ABORTED with 80, and CSV/JSON buttons remain available.
### 19.7 Cross-category check

`caterers in Guntur` (engines: local finder, maps, justdial) returned 83 leads / 63
phones with no venue or photographer rows, confirming the gate is role-specific
rather than a blanket "wedding only" filter. Categories without a detected role
(plumbers, dentists, showrooms) bypass the guard and keep their full result set.
### 19.8 Design polish pass

Kept the existing namespaced CSS system and tightened it instead of rewriting
markup:

- Every remaining green-dark surface literal (`rgba(10,14,16)`, `#0b1012`,
  scrollbar tints) rethemed to navy equivalents via `scripts/retheme-v2-css.js`.
- Readability: rail headings 9 -> 10.5px, tab labels 9 -> 10.5px, table headers
  7 -> 9px, run-context 8 -> 9.5px. `--v2-dim` raised to `#7c8aa0` for contrast.
- Controls: buttons 38 -> 40px with tighter tracking; tab hit area 32 -> 34px;
  filter selects 9 -> 10px.
- Added a global `:focus-visible` ring so keyboard navigation is visible on the
  dark surface.
- Verified in the browser: no horizontal overflow, no console errors, leads tab
  renders 83 rows, folders/open/CRM unchanged.

### 20. Cloud deployment plan

The Firebase + GitHub Actions + Playwright design is specified in
`docs/CLOUD_DEPLOYMENT_PLAN.md`: architecture, job contract, workflow,
Firestore schema, security rules, compliance guardrails, costs and a phased
rollout. It is a plan only; no cloud resources exist yet.

### 21. Windows desktop app (paid product)

The product is also shipped as a subscription Windows application that runs
entirely on the customer's machine. Full guide: `docs/DESKTOP_APP.md`.

**Two products, two bundles.** `client/dist` is the website and keeps the
marketing landing page at `/`. `client/dist-desktop` is built with
`npm run build:desktop` (`--mode desktop`, `VITE_DESKTOP=1`) and redirects `/`
to `/command`, so the app opens on the cockpit with no landing page and no
pricing page. `client/src/desktop.js` is the single place that decides which
world the UI is in.

**Shell.** Electron main process with `contextIsolation`, `sandbox: true` and a
narrow preload bridge (`window.scraperDesktop`). It spawns
`resources/server/index.js` with `ELECTRON_RUN_AS_NODE=1`, waits for the
`[ready] {"port":N}` handshake, health-checks `/api/app/info`, then loads
`http://127.0.0.1:<port>/command`. A frameless splash covers the 25–40 s engine
cold start. The engine runs as a real Node process so Playwright can drive the
customer's installed Edge (`channel: 'msedge'`) instead of a bundled Chromium.

**Local-first.** `SCRAPER_DATA_DIR`, `SCRAPER_DB_DIR` and `SCRAPER_CLIENT_DIST`
point at `%APPDATA%\Scraper\{data,db}` and `resources/client-dist`, so no
writable path ever lands inside `Program Files`. Every search still writes its
own immutable session folder; `deleteAppDataOnUninstall` is false, so updates
and reinstalls never lose leads.

**Licensing.** Ed25519 tokens signed by `desktop/license-server`, verified by
the app with an embedded public key. 14-day trial, 7-day grace, plans at
₹1,999 / ₹3,999 / ₹7,999 with 500 / 2,000 / 10,000 leads per search and
1 / 3 / 10 seats. Activation is online (API) or offline (`.scraperlic` import).
The token is cached with Windows DPAPI. The engine re-verifies it on every
scrape POST when `LICENSE_ENFORCE=1` (desktop only), so removing the activation
screen does not unlock scraping; the web deployment stays open.

**Updates.** `electron-updater` against `github.com/torislove/scraper`; pushing
a `v*` tag makes `.github/workflows/release.yml` build the NSIS installer and
publish it with `latest.yml`, and installed apps self-update.

**Verified headlessly** (Electron cannot create a window in a sandboxed
session): licence mint → activate → validate → verify with the app's own
verifier; tampered token rejected with `bad_signature`; the engine gate returns
200-class for a valid token and 402 `subscription_required` for a tampered one;
and `scripts/smoke-bundles.js` confirms web `/` renders the landing page while
desktop `/` redirects to the cockpit and shows the subscription pill.
