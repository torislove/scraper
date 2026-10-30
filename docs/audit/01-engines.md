# 01 — Scraping Engines & Orchestration Audit

**Auditor:** engine-auditor (parallel teammate; task-1)
**Repo:** `gomandap-scraper` (no git). **Scope:** all 24 files in `server/src/scrapers/`, `server/src/routes/scrape.js` (1302 lines), `server/index.js`, `server/src/utils/queue.js` + the dispatch/adjacent contracts the engines depend on (`dbAdapter`, `localDb`, `fastWebsiteExtractor`, `geoAI`, `olaMaps`, `universalGeoCluster`, `automations.js`, `sessionRoutes.js`, `publicUsers.js` dispatch sites, client-side engine copies).
**Method:** full read of every file listed (big ones in chunks); no source file modified; no server started; no scraper or network request executed. All claims carry `file:line` evidence. Line numbers are as-read on 2026‑10‑25.
**Environment observed (read-only):** Node v24.20.0, Playwright pkg 1.64.1 with `%LOCALAPPDATA%\ms-playwright\chromium-1223` + `firefox-1522` installed; Chrome and Edge installed; **Brave not installed**; **`puppeteer`/`puppeteer-core` NOT installed**; 8 logical cores, 15.9 GB RAM, 3.7 GB free (23 %); `python.exe` resolves to the Windows-Store shim; **no `requirements.txt` anywhere**; no `TODO`/`FIXME`/`HACK` markers in `server/src` or `client/src` (grep, zero hits).

---

## 0. Executive summary

| Metric | Value |
|---|---|
| Scraper source files in `server/src/scrapers/` | 24 (23 code + `actions.md`) |
| Distinct Node engine entry points | 14 (`engine-*.js`) |
| Python engine entry points | 6 (`engine-python.py`, 4 orphan `engine-python-*.py`, `scrapy_spider.py`) + 1 helper |
| Infra modules | 3 (`browserFactory`, `concurrencyManager`, `proxyManager`) |
| Engines reachable from an HTTP route **and** able to write leads | **4** (`scrapeGooglePlaces`, `scrapeGoogleLocalFinder`, `scrapeDeepseekAI`, `scrapeDuckDuckGoDork` snippet-only) |
| Engines producing acceptable-quality leads end-to-end | **2** (Google Places / Google Local Finder) |
| Engines registered but never enqueued by any route | **8** (JustDial, WeddingBazaar, WeddingWire, Mandap, BraveDork, IndiaMart, Scrapy, GoogleSerp) |
| Engine that is a guaranteed no-op | **1** (`engine-crawlee-deep.js` — "Deep scan disabled") |
| Engines that would crash on persistence API | **2** (`engine-justdial` calls `dbAdapter.addVendor`; `engine-google-serp` calls `localDb.addVendor`; neither exists) |
| Python engines with no caller at all | **4** (`engine-python-justdial/social/weddingbazaar/weddingwire.py`) |
| Client-side duplicate engine ports | **5 (+2 helpers)** — all orphaned and non-functional |

**Bottom line:** the codebase contains 14 advertised scraper engines, but the *live* product is essentially **two Google extraction paths plus a DeepSeek Python bridge**; the directory/social/vertical engines are dead code or unreachable, and the Google paths return a narrow, noisy field set (measured on the live dataset: 1/31 emails, 8/31 websites, 0/31 images, 0/31 review texts, 9/10 stored pincodes are phone-digit false positives, 31/31 logos are `ui-avatars.com` placeholders).

---

## 1. Engine inventory

Transport legend: **PW** = Playwright (Chromium via `browserFactory`), **PUP** = Puppeteer (missing dependency), **HTTP** = axios/Cheerio, **PY** = Python subprocess, **API** = third-party HTTP API, **—** = no transport (no-op).

| # | File (LOC) | Platform / source | Transport | Exported entry | Concrete inputs | Concrete outputs / side effects | Reachable from HTTP? | DB write? |
|---|---|---|---|---|---|---|---|---|
| 1 | `server/src/scrapers/engine-google-places.js` (1077) | Google Maps (feed cards; single-place page when redirected) | PW (shared browser, **no proxy**) + axios/Cheerio for website enrichment + Nominatim via `geoAI` | `scrapeGooglePlaces(exactQuery, category, location, sessionId="legacy", centerLat, centerLng, radiusKm, strategy='broad', district, stateName, boundingbox)` | query string or full Maps URL; category; locality; session id; center lat/lng; radius; strategy `strict|broad|deep`; district/state; bbox `[s,w,n,e]`-style 4-array | `Promise<Array<place>>` (inserted in-boundary leads) + side effects: `dbAdapter.saveVendors`, `dbAdapter.saveOutOfBoundsVendor`, `emitVendorEvent(…, 'inserted'|'updated'|'out-of-bounds')`, logs | **YES** — `/scrape/maps`, `/scrape/batch`, `/scrape/upload`, `/api/automations/bulk-csv`, `/api/public/demo-scrape`, scheduler `/scrape/jobs/update` | YES |
| 2 | `engine-google-serp-local.js` (429) | Google Search **Local Finder** (`tbm=lcl`, paginated `start=N`) | PW (shared browser, no proxy) + axios website enrichment | `scrapeGoogleLocalFinder(query, category, location, sessionId='legacy', maxPages=10, district=null, stateName=null, centerCoords=null)` | search query; category; zone/locality; session; max pages (20 cards/page); district; state; center coords `{lat,lng}` | `Promise<Array<lead>>`; inserts vendors, saves out-of-bounds, async website enrichment, `emitVendorEvent('inserted'/'updated'/'out-of-bounds')` | **YES** — primary engine of `/scrape/omni` (queued per zone, `scrape.js:815-820`) | YES |
| 3 | `engine-google-serp.js` (213) | Google organic SERP → visit result homepages | PW (single page) + axios/Cheerio fan-out | `scrapeGoogleSerp(query, category, location)` | query; category; location | Extracted `vendorObj` (name from `<title>`, phone/email regex, homepage) — **but persistence throws**; no return value | Registered task only (`scrape.js:193-198`); only enqueue site is dead `queueMandalJob` (`scrape.js:694`) | **NO — broken** (`db.addVendor` undefined) |
| 4 | `engine-brave-dork.js` (100) | Brave Search `site:<domain> "cat" "loc"` | PW (`launchBraveBrowser`, proxy, Brave binary if present else Chromium) | `scrapeBraveDork(domain, query, category, location)` | domain (e.g. `weddingwire.in`), query, category, location | New vendor records with snippet-derived phone/email/pricing/social link; writes DB | **NO** — no route enqueues it | YES |
| 5 | `engine-social-dork.js` (136) | **Bing** dork `site:<platform domain> <query>` (named "DuckDuckGoDork"; actually Bing) | PW (own browser launch, proxy) | `scrapeDuckDuckGoDork(platformDomain, exactQuery, category, location, globalAbortSignal)` | platform domain (`instagram.com`, `facebook.com`, …), query, category, location | Social profile leads: name, phone-from-snippet, profile URL per platform, follower string; writes DB | **YES** — `/api/automations/find-social` (`automations.js:59-77`) | YES |
| 6 | `engine-justdial.js` (169) | JustDial listing search | PUP — CDP `connect('http://localhost:9222')` then **headful** `puppeteer.launch` | `scrapeJustDial(category, location)` | category (or URL), location | Intended vendor records; **cannot run** (puppeteer not installed) and `dbAdapter.addVendor` does not exist → nothing inserted | **NO** — no route enqueues it | **NO — broken** |
| 7 | `engine-puppeteer-indiamart.js` (119) | IndiaMART `dir.indiamart.com/search.mp` | PUP — CDP then headful fallback | `scrapePuppeteerIndiaMart(category, location)` | category, location | name / address / listing link; phone and email hard-null; writes DB via `saveVendors` | **NO** | Would write, but cannot run |
| 8 | `engine-weddingbazaar.js` (104) | WeddingBazaar listing `${cat}-in-${city}` | PW (own browser, proxy) | `scrapeWeddingBazaar(category, location)` | category, location | name/address/rating/profile link; phone is the literal string `'Requires Manual Lookup / Login'`; writes DB | **NO** | YES (if called) |
| 9 | `engine-weddingwire.js` (102) | WeddingWire `/wedding-vendors/<city>` | PW (own browser, proxy) | `scrapeWeddingWire(category, location)` | category, location | Same shape as #8; phone placeholder string; writes DB | **NO** | YES (if called) |
| 10 | `engine-mandap.js` (254) | Mandap.com venue/banquet/marriage-hall pages | PW (own browser, proxy) + **HTTP/Cheerio fallback** | `scrapeMandap(category, location)` (+ internal `scrapeMandapHttpFallback`) | category, location | `{ totalScraped, newInserted }`; venues with name/address/rating/profile link/phone/single image; writes DB; also saves out-of-bounds? no | **NO** | YES (if called) |
| 11 | `engine-deepseek.js` (148) | Bridge: spawns `engine-python.py` (Google Maps automation) and parses `stdout` JSON-lines | **PY subprocess** (`spawn('python', …)`) | `scrapeDeepseekAI(query, category, location)` | query, category, location; NVIDIA key from settings/env | `Promise<Array<newLead>>`; inserts via `dbAdapter.saveVendors`, emits vendor events; returns [] if no key / python error | **YES** — `/scrape/batch`, `/scrape/upload`, `/scrape/omni` when `deepseek-ai` in `enabledEngines` | YES |
| 12 | `engine-python.py` (174) | Google Maps (same surface as #1, no proxy/no stealth libs) | PY Playwright (sync) | CLI `--query --category --location --apikey`; emits JSON lines `{type:"log"}` / `{type:"lead"}` | query/category/location/apikey | JSON-lines on stdout: businessName, category, city, address, phones[], emails[] (always []), website (feed path), mapsLink, qualityScore, source | Called only by #11 | Indirect (through #11) |
| 13 | `engine-python-justdial.py` (133) | JustDial | PY Playwright | CLI | query/category/location | JSON-lines lead objects (businessName, address, phones, emails[], website "", mapsLink=search page, qualityScore) | **NO caller anywhere** | None |
| 14 | `engine-python-weddingbazaar.py` (127) | WeddingBazaar `/vendors/<loc>/<query>` | PY Playwright | CLI | query/category/location | JSON-lines lead objects | **NO caller** | None |
| 15 | `engine-python-weddingwire.py` (120) | WeddingWire `/wedding-venues/<loc>` | PY Playwright | CLI | query/category/location | JSON-lines lead objects (category/query ignored in URL) | **NO caller** | None |
| 16 | `engine-python-social.py` (153) | Google dork → Instagram/Facebook/LinkedIn profiles via `undetected-chromedriver` + NVIDIA DeepSeek AI extraction (`deepseek_helper.py`) | PY Selenium/UC + **API** | CLI `--query --category --location --apikey` | google dork string, category, location, NVIDIA key | JSON-lines lead objects with AI-parsed name/phones/emails/address | **NO caller** | None |
| 17 | `engine-scrapy.js` (65) + `scrapy_spider.py` (73) | DuckDuckGo HTML search → crawl result sites | **PY subprocess** (`child_process.exec`) + Scrapy | `scrapeScrapySpider(category, location)` | category, location (shell-interpolated) | Parses `SCRAPY_LEAD: {json}` lines; pushes into DB; returns void | Registered task only — **no enqueue site** | Would write, unreachable |
| 18 | `engine-crawlee-deep.js` (18) | "Deep scan" | **none** | `scrapeCrawleeDeep(url, vendorName, category, location)` | url, name, category, location | **`return;` immediately** — logs "Deep scan disabled to conserve server resources" | Enqueued by `index.js:75` (auto deep-crawl on every insert lacking phone/email) and `/api/automations/extract-urls`; does nothing | **NO (no-op)** |
| — | `browserFactory.js` (207) | Browser/proxy/stealth factory | — | `launchStealthBrowser`, `launchBraveBrowser`, `launchFirefoxBrowser` (throws), `getBrowser` (shared, no proxy), `applyAdvancedStealth`, `optimizePageForSpeed`, `closeAllBrowsers`, `getOptimalLaunchConfig`, `chromium` | flags | browser handles | infra | — |
| — | `concurrencyManager.js` (117) | Auto-tuned task pool | — | `ConcurrencyPool`, `defaultPool` | `maxConcurrent` | — | only dead `/scrape/batch` copy at `scrape.js:1270` | — |
| — | `proxyManager.js` (96) | Open-proxy fetcher/rotator | HTTP | `fetchProxies`, `axiosWithProxy`, `getRandomIP`, `getProxyList`, `removeProxy` | — | `proxyList: string[]` refreshed every 30 min | infra | — |
| — | `actions.md` | "Self-training memory" doc | — | — | — | **Never read or written by any code** (grep: zero `actions.md` references) | — | — |

`server/src/routes/scrape.js` imports 13 engine modules (`scrape.js:7-19`); **every imported file exists** — no missing JS engine module. What is *missing* is: the `puppeteer` package, Python deps (`playwright`, `scrapy`, `undetected-chromedriver`, declared nowhere), the `addVendor` functions two engines call, the `server/models/StagingLead` module referenced by root scripts, and any route for `/scrape/cheerio`, `/scrape/social`, `/scrape/truecaller` that clients/scanners still call.

---

## 2. Exact data-field matrix

Legend: **✓** captured natively; **~** partial / derived / async / sometimes absent; **P** present but a hard-coded placeholder/fake value; **✗ MISSING**.
Field semantics checked: *name* (business name), *phone(s)* (primary + secondary), *email(s)*, *website*, *full address*, *area/locality* (separate field), *city*, *district*, *state*, *pincode*, *lat/lng*, *source URL* (canonical listing/profile), *source platform*, *confidence/quality score*; second table: *rating*, *review count*, *review text*, *category*, *subcategory*, *hours*, *images*, *price range*, *social URLs*, *GST/legal*, *WhatsApp link*, *verified flag*.

### 2.A Identity / contact / geography

| Engine | Name | Phone(s) | Email(s) | Website | Full address | Area/loc | City | District | State | PIN | Lat/Lng | Source URL | Platform | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Google Places (feed path) | ✓ `engine-google-places.js:734` | ~ primary only; `allPhones` collected then dropped (`:749-755, :794-804, :819`) | ~ only async website scrape (`:843-871`) | ✓ `:757-764` | ~ heuristic line scan, often hours/phone contaminated (`:772-787`) | ~ inside address text | ✓ = query param always (`:903`) | ~ only via geoAI reverse-geocode if coords (`:1013-1023`) | ~ same | ~ regex; **wrong** (matches phone digits; see §2.E) | ~ decoded from Maps URL (`:468-475, :825`) | ✓ `mapsLink` `:881` | ✓ literal source string `:904` | ~ heuristics `qualityScore`/`tier` (`:11-64, :990-993`) |
| 1b Places (single-place page) | ✓ `:561-562` | ✓ `:571-576` | ~ website deep scrape (`:597-600`) | ✓ `:586-591` | ✓ aria-label `:564-569` | ~ | ✓ param | ~ geoAI | ~ | ✓ regex `:630-631` | ✓ from URL `:606` | ✓ `:627` | ✓ | ~ |
| 2 Google Local Finder | ✓ `:133-134` | ~ first only; tel/text regex (`:180-192`) | ~ async website scrape only (`:371-398`) | ✓ `:195-202` | ~ first detail line, unreliable (`:155-177`) | ✗ (not a field) | ✓ = zone param (`:334`) | ✓ = district param (`:335`) | ✓ = state param (`:337`) | **✗ not stored at all** | ~ card `data-lat/lng` rare, else **falls back to search centre** (`:217-222, :344-345`) | ✓ `mapsLink` or synthesized maps search URL (`:343`) | ✓ `:349` | ✓ `qualityScore`/`tier` (`:327, :350-351`) |
| 3 Google SERP "Cyber Matrix" | ~ page `<title>` not business name (`:160`) | ✓ first + second via regex (`:157-165`) | ✓ first (`:166`) | ✓ homepage (`:167`) | ~ = SERP snippet (`:163`) | ✗ | ~ = location param (`:162`) | ✗ | ✗ | ✗ | ✗ | ~ homepage only | ✓ `:168` | ✓ fixed 85/60 (`:171`) |
| 4 Brave dork | ~ title prefix (`:58`) | ~ snippet regex via `intelligentExtractor` (`:62, :73`) | ~ same (`:74`) | ✗ | ✗ — fake `"Discovered via <domain> in <loc>"` (`:72`) | ✗ | ✓ param (`:71`) | ✗ | ✗ | ✗ | ✗ | ✓ `socialLink=v.link` (`:76`) | ✓ `:77` | ~ `extracted.score`/`aiVerified` (`:78-79`) |
| 5 Bing social dork | ~ cleaned profile title (`:76-79`) | ~ snippet regex (`:84-85`) | ✗ | ✗ | ✗ | ✗ | ✓ param (`:106`) | ✗ | ✗ | ✗ | ✗ | ✓ profile URL stored in platform field (`:112-118`) | ✓ via platform fields | ~ 25/15/8 fixed (`:110`) |
| 6 JustDial (JS) | ✓ `:82-83` | ~ raw `.callcontent`; `'Requires Manual Reveal'` placeholder (`:104-108, :117`) | ✗ | ✗ | ✓ `:90-91` | ✗ | ✓ param (`:115`) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ `:119` | ✗ |
| 7 IndiaMART (PUP) | ✓ `:69-70` | ✗ hard-null (`:96`) | ✗ hard-null (`:97`) | ~ listing anchor (`:75-76`) | ✓ `.clg/.desc_loc`, fallback `'India'` (`:72-74`) | ✗ | ✓ param (`:94`) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ `:99` | ✗ |
| 8 WeddingBazaar | ✓ `:46-48` | **P** literal `'Requires Manual Lookup / Login'` (`:80`) | ✗ | ✗ | ~ / fallback `"Located in …"` (`:78`) | ✗ | ✓ param (`:77`) | ✗ | ✗ | ✓ regex from address (`:79`) | ✗ | ~ `mapsLink`=profile link (`:82`) | ✓ `:83` | ✗ |
| 9 WeddingWire | ✓ `:44-46` | **P** literal placeholder (`:78`) | ✗ | ✗ | ~ / fallback `"Located in …"` (`:76`) | ✗ | ✓ param (`:75`) | ✗ | ✗ | ✓ regex (`:77`) | ✗ | ~ `mapsLink`=profile (`:80`) | ✓ `:81` | ✗ |
| 10 Mandap (PW+HTTP) | ✓ `:143-146` | ~ only if `tel:`/regex (`:160-163`) | ✗ | ~ profile link (`:230`) | ~ partial (`:148-149`) | ✗ | ✓ param (`:224`) | ✗ | ✗ | ✓ regex (`:217-226`) | ✗ | ~ `website`/`mapsLink`=profile (`:230-231`) | ✓ `:232` | ~ `verified=!!phone` (`:233`) |
| 11 DeepSeek bridge (+py maps) | ✓ `:81-82` | ✓ first (`:95`) | ✗ (python always emits `[]`) `engine-python.py:88, :158` | ✗ bridge discards `vendor.website` (`:107`) | ✓ `engine-python.py:131-134` | ~ village via geoAI only if coords (never) | ✓ param (`:92`) | ✗ | ✗ | ✗ | ✗ | ✓ `mapsLink` (`:97`) | ✓ `:98` | ~ fabricated `verified:true, aiVerified:true` (`:99-100`) |
| 12 python maps (direct CLI) | ✓ | ✓ | ✗ (`[]`) | ~ feed path (`:142-145`) | ✓ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✓ `mapsLink` (`:160`) | ✓ `:162` | ~ heuristic score |
| 13 python JustDial (orphan) | ✓ `:71-74` | ~ (`:85-105`) | ✗ `[]` (`:117`) | ✗ `""` (`:118`) | ✓ `:80-83` | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ~ `mapsLink`=search page (`:119`) | ✓ `:121` | ~ score |
| 14 python WeddingBazaar (orphan) | ✓ | ~ | ✗ `[]` | ✗ `""` (`:112`) | ✓ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ~ search page (`:113`) | ✓ | ~ score |
| 15 python WeddingWire (orphan) | ✓ | ~ | ✗ `[]` | ✗ `""` (`:105`) | ✓ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ~ search page (`:106`) | ✓ | ~ score |
| 16 python social (orphan) | ✓ AI `:106` | ✓ AI `:107` | ✓ AI `:108` | ~ profile URL (`:133`) | ~ AI `:109` | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✓ `mapsLink`=profile (`:134`) | ✓ `:136` | ~ score (`:121-124`) |
| 17 Scrapy spider | ~ page `<title>` (`scrapy_spider.py:44`) | ~ first (`:48`) | ~ first (`:49`) | ✓ page URL (`:50`) | ✗ hard-coded `"Unknown"` (`:47`) | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✓ page URL | ✓ `:51` | ✗ |
| 18 Crawlee deep | — no-op | — | — | — | — | — | — | — | — | — | — | — | — | — |

### 2.B Reputation / enrichment / compliance

| Engine | Rating | Review count | Review text | Category | Subcategory | Hours | Images | Price range | Social URLs | GST/legal | WhatsApp | Verified flag |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Google Places feed | ✓ `:767-769` | ✓ `:768-770` | **✗** `topReviews: []` (`:886`) | ✓ = param only (`:902`) | **✗** | ~ one status string, truncated 150 (`:790-792, :885`) | **✗** `[]` (`:895`) | ✗ | ~ async website scrape only (`:842-872`) | ✗ | ✓ constructed (`:828-839, :1002-1010`) | ✓ `Boolean(phone)` (`:905`) |
| 1b Places single page | ✓ `:578-584` | ✗ stored? (no `reviewsCount` field) | ✗ | ✓ | ✗ | ✗ `''` (`:667`) | ✓ hero + ≤6 store photos (`:199-322`) | ✗ | ✗ **bug: finds IG/FB then returns `''`** (`:129-131` vs `:176-177`) | ✗ | ✓ (`:669-672`) | ~ |
| 2 Local Finder | ✓ `:140-145` | ✓ `:147-152` | ✗ | ~ detail-line split or param (`:167-171`) | ✗ | ✗ (`:158, :246, :352`) | ~ single thumbnail only, no `images[]` (`:225-232, :346`) | ✗ | ~ async website scrape (`:371-398`) | ✗ | ✓ (`:353-356`) | ✗ (no field) |
| 3 Google SERP | ✗ | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (`:172-173`) | `verified:false` fixed (`:169`) |
| 4 Brave dork | ✗ | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ~ `pricing` string from snippet (`:75`) | ✓ `socialLink` only (`:76`) | ✗ | ✗ | ~ `aiVerified` (`:78`) |
| 5 Bing social dork | ✗ | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✓ IG/FB/YT/LI/Pinterest URL + follower string (`:112-118`) | ✗ | ✗ | `verified:false` (`:108`) |
| 6 JustDial | ~ raw string (`:87-88, :118`) | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `verified:false` (`:120`) |
| 7 IndiaMART | ✗ | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `verified:false` |
| 8 WeddingBazaar | ~ (`:51-52, :81`) | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 9 WeddingWire | ~ (`:49-50, :79`) | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 10 Mandap | ~ (`:151-153, :211-215`) | ✗ | ✗ | ✓ param | ✗ | ✗ | ✓ one image (`:157-158, :229`) | ~ parsed in HTTP fallback but **not persisted** (`:74-77` vs `:220-235`) | ✗ | ✗ | ✗ | `verified=!!phone` (`:233`) |
| 11 DeepSeek bridge | ~ **fabricated** `qualityScore/20` (`:96`) | ✗ | ~ maps `businessSummary`→`topReviews`, python never emits | ✓ param (`:91`) | ✗ | ✗ `''` (`:110`) | ✗ (python never emits) | ✗ | ✗ empty strings (`:103-107`) | ✗ | ✗ | **fabricated true** (`:99-100`) |
| 12–17 Python engines | ✗ | ✗ | ✗ | ✓ param | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ~ some `score` only |
| 18 Crawlee | — | — | — | — | — | — | — | — | — | — | — | — |

### 2.C Cross-cutting field gaps (true for **all** engines)

| Field | Status | Evidence |
|---|---|---|
| **Review text** | Captured by **zero** engines. `topReviews` literal `[]` in places (`engine-google-places.js:668, :886`); nothing populates it. | `grep topReviews` → only initialisation |
| **Subcategory** | Captured by **zero** engines. Only the caller's single `category` string is stored. | all `created`/`lead` builders |
| **GST / legal entity** | Captured by **zero** engines. | no GSTIN/legal regex anywhere in `server/src` |
| **Area/locality as its own field** | Only `village/mandal/district/state` reverse-geocode fields on Places (`:1013-1023`); Local Finder stores `mandal=district` (misleading, `:335`). | see matrix |
| **Full address fidelity** | Places feed address heuristic frequently returns hours/phone, e.g. live data `"Photography service\nOpen 24 hours · 098482 44543"`; local finder uses one detail line. | `server/data/scraped_vendors.json` |
| **Pincode correctness** | Places: `address.match(/\b\d{6}\b/)` (`:956-957`, `:630-631`) matches **phone digits**. Live dataset: pincode filled 10/31, valid `^[1-9]\d{5}$` 1/10 — other 9 are `099590, 080744, 087907, 098667, 073488, 096760, 091822, 087905, 098482` (all substrings of phone numbers). | computed from `server/data/scraped_vendors.json` |
| **Lat/Lng realism** | Local Finder defaults to search-centre when card lacks coords (`:344-345`) → leads plotted at zone centre; Places relies on `!8m2!3d..!4d..` decode (`:468-475`) which works for canonical place URLs (live dataset 31/31 coords). | code + data |
| **Emails** | No listing-level email extraction anywhere; only async `fastWebsiteExtract` of a website (`utils/fastWebsiteExtractor.js:54-79`) or SERP body text (#3, broken). Live dataset: 1/31. | data |
| **Secondary phones** | Only Google SERP (#3) stores `secondaryPhone` (`:165`) — and it never persists. | matrix |
| **Images** | Only Places single-page path (`engine-google-places.js:199-322`) and Mandap (`:157-158, :229`). Live dataset: 0/31. | data |
| **Origin/provenance of each field** | No per-field provenance/confidence; a single coarse `qualityScore` heuristic (`:11-64`) and `source` string. | — |

### 2.E Live-data completeness evidence (measured, 2026‑10‑25)

`server/data/scraped_vendors.json` — 31 records, all from one session (`nsp_photographers_live`), all source `"Autonomous Cyber Intelligence Matrix"` (Google Places path); `server/data/out_of_bounds.json` — 5 rejects.

| Field | Present | Notes |
|---|---|---|
| name | 31/31 | SEO-suffixed strings exported as names (e.g. `"Making Memories by Madhu I Best Wedding Photography in Chilakaluripet"`) |
| phone | 25/31 | 0 placeholder strings in this run; normalised `+91 XXXXX XXXXX` |
| email | **1/31** | only via website enrichment |
| website | **8/31** | |
| address | 31/31 | quality poor: hours/phone embedded, partial |
| pincode | 10/31 filled, **1/10 valid** | 9 are phone fragments |
| lat/lng | 31/31 | from Maps URL |
| rating / reviewsCount | 29/31 | |
| village/mandal/district/state | 31/31 | via Nominatim reverse-geocode; **district inconsistent** (`Palnadu` vs `Palnadu District`) |
| city | 31/31 | **contaminated** by query fragments: `Narasaraopet Photo Studios`, `Narasaraopet Event Photographers`, `Narasaraopet Wedding Photography` |
| operatingHours | 26/31 | one crude status string |
| images | **0/31** | |
| topReviews | **0/31** | |
| instagram / facebook | **1/31 / 0/31** | |
| logo | 31/31 | **all 31 are `ui-avatars.com` placeholders** |
| verified / aiVerified | 0/31 true / 25/31 true | `aiVerified` is set without any AI verification in this path |

---

## 3. Anti-bot & reliability

### 3.1 Stealth / browser arguments

| Item | Where | Notes |
|---|---|---|
| Browser stack | `browserFactory.js:1-11` | `playwright-extra` chromium + **`puppeteer-extra-plugin-stealth`** applied to Playwright (`chromium.use(stealth)`). This is the wrong plugin family for playwright-extra (its own `playwright-extra-plugin-stealth` is not installed); coverage is partial at best. |
| Launch args | `browserFactory.js:43-55` | `--no-sandbox`, `--disable-setuid-sandbox`, **`--disable-http2`**, `--disable-blink-features=AutomationControlled`, `--disable-infobars`, static `--user-agent`, `--enable-gpu`, `--ignore-gpu-blocklist`, `--enable-webgl`, `--enable-accelerated-2d-canvas` |
| Executable fallback | `browserFactory.js:66-81` | hard-coded Windows chrome/edge paths |
| Brave | `browserFactory.js:93-101` | hard-coded `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`; not installed on this host → silent Chromium fallback (so "Brave dork" runs in Chromium) |
| Firefox | `browserFactory.js:103-105` | `throw new Error('Firefox not available…')` — **dead path**, despite `justdial_cracking_writeup.md:59-67` claiming Playwright **Firefox** is the JustDial breakthrough. Documentation and code disagree; the Firefox fix is not in the codebase. |
| Per-page init script | `browserFactory.js:115-130` | `navigator.webdriver`, languages, plugins, WebGL vendor spoof. **Only called by Places (`engine-google-places.js:527`) and Local Finder (`engine-google-serp-local.js:67`)** — NOT by JustDial/IndiaMART/Wedding*/Mandap/Brave/Bing engines. |
| Resource blocking | `browserFactory.js:132-158` | aborts image/media/font/**stylesheet**/other + analytics/ad domains ("<400ms loads"). Called by Places/Local Finder only. Aborting `other`/CSS can break consent/rendering on some sites. |
| Shared browser | `browserFactory.js:107-113` | one global Chromium, **`launchStealthBrowser(false)` → proxy disabled**; all Places + Local Finder jobs share it, new context per job. |
| Profile reuse | `browserFactory.js:57-58` | `userDataDir` computed but **never passed to `launch`** (`:60-64`) — the "isolated profile" comment is dead code; no persistent cookies. |
| Manual login UI | `utils/manualIntervention.js:20-33`; imported-but-unused in `engine-justdial.js:6`, `engine-puppeteer-indiamart.js:6` | `injectManualLoginUI` is **never called**; therefore `POST /scrape/resolve-intervention` always 404s and the captcha/login "YES/NO" workflow advertised in the UI cannot trigger. |

### 3.2 Proxy handling

| Fact | Evidence |
|---|---|
| Fetches free public proxies from 3 raw GitHub lists on startup and every 30 min | `proxyManager.js:11-15, :43-44` |
| No health-check/validation; proxies added as-is; dead list capped at 5000 then cleared | `proxyManager.js:21-35` |
| `axiosWithProxy`: 80 % chance to use a random proxy, 3 attempts, removes failed proxy, final direct fallback; 10 s timeout | `proxyManager.js:53-84` |
| Playwright: random proxy picked only when `useProxy=true`; invalid URL silently ignored (`try/catch` empty) | `browserFactory.js:33-41` |
| **Places & Local Finder (the live engines) run with NO proxy** | `browserFactory.js:107-113` (`getBrowser()` passes `false`) |
| Proxy-using engines: Brave dork, Bing dork, JustDial-ish (no; puppeteer has none), WeddingBazaar, WeddingWire, Mandap (with fallback direct), SERP axios fan-out (random proxy per result) | `engine-brave-dork.js:25`, `engine-social-dork.js:22`, `engine-weddingbazaar.js:25`, `engine-weddingwire.js:24`, `engine-mandap.js:106-111`, `engine-google-serp.js:144-149` |
| No proxy stickiness per session/domain, no rotation policy, no bandwidth/error budget. `SCRAPER_FIXES_COMPLETE.md:77` claims "3091 open-source proxies loaded" (unverifiable in code; count is whatever the lists return). | — |

### 3.3 User-agent rotation

- Shared list of 3 desktop UAs in `browserFactory.js:18-22`; random per browser launch (`:30`).
- SERP fan-out rotates 3 UAs per request plus hard-coded `Sec-Ch-Ua` v124 headers (`engine-google-serp.js:123-141`).
- All Python engines and Puppeteer engines hard-code one UA string (Chrome/120): `engine-python.py:49`, `engine-python-justdial.py:45`, `engine-python-weddingbazaar.py:44`, `engine-python-weddingwire.py:44`, `engine-justdial.js:53`, `engine-puppeteer-indiamart.js:46`.
- Places/Local Finder set a **fixed** Chrome/120 UA in `newContext` (`engine-google-places.js:523`, `engine-google-serp-local.js:55`) — no rotation at all on the engines that matter.

### 3.4 Retries / timeouts

| Engine | Timeouts | Retries |
|---|---|---|
| Queue wrapper | hard 600 s `Promise.race` per job (`queue.js:213-221`); **does not cancel the job** — it keeps running and the slot is released | none |
| Places | goto 30 s, awaited once (`:537`); feed wait race 10 s (`:548-551`) | none |
| Local Finder | goto 15 s (`:87`), selector wait 3.5 s (`:122`) | none |
| Google SERP | axios 15 s per result (`:130-131`) | axios-retry 3× exponential on 429/5xx (`:10-16`) |
| Brave | goto 30 s (`:33`), fixed 3 s wait | none |
| Bing dork | goto 30 s (`:27`) | none |
| JustDial | goto 30 s, 15-loop scroll ×2 s (`:139-154`) | none |
| IndiaMART | goto 30 s, 3 s wait | none |
| WeddingBazaar/Wire | goto 45 s, 6 s wait, 6×1.5 s scroll (`:32-41`) | none |
| Mandap | per-nav 35 s, 3 s wait, 4×1 s scroll (`:121-136`); HTTP fallback 3 URLs × 12 s (`:46-56`) | none |
| DeepSeek bridge | **no child-process timeout at all** (`:52-58`); queue's 600 s race only | none |
| Scrapy | `exec` **no timeout**, default `maxBuffer` (`engine-scrapy.js:23`) | none |
| Proxy manager | 10 s (`proxyManager.js:53-84`) | 3 |
| Backend enrichment | `fastWebsiteExtract` 5 s (`fastWebsiteExtractor.js:39`); `geoAI.reverseGeocode` axios default (no timeout set, `geoAI.js:107-109`) | — |

### 3.5 Rate limiting

- **None** at engine level. Only mitigations: Local Finder inter-page pause `300 + random(250)` ms (`engine-google-serp-local.js:412`); Python Maps 0.5 s/card (`engine-python.py:103, :128`); Scrapy `CLOSESPIDER_PAGECOUNT: 50` (`scrapy_spider.py:69`).
- Nominatim reverse geocoding is called **per lead** with no 1 req/s throttle (`engine-google-places.js:1013-1023` → `geoAI.js:92-132`), violating Nominatim usage policy and likely to 429; failures silently swallowed (returns `null`).
- No per-domain concurrency cap; single global queue only.

### 3.6 Sessions / cookies

- No cookie/session persistence anywhere: Playwright contexts are fresh per job, closed at end (`engine-google-places.js:1070-1075`, `engine-google-serp-local.js:416-420`); `storageState` never used.
- Puppeteer engines point `userDataDir` at the **live Chrome profile** (`engine-puppeteer-indiamart.js:23-24, :35-39`) or a fallback dir (`engine-justdial.js:42-47`) — profile lock/consent-state hazards; irrelevant today because puppeteer is absent.
- No login automation for JustDial/IndiaMART/Instagram/Facebook; no credential store.

### 3.7 CAPTCHA / consent / manual intervention

- Google consent: best-effort click of Accept/Reject buttons — `engine-google-serp-local.js:113-119`, `engine-google-places.js:539-545`, `engine-google-serp.js:73-77`, `engine-python.py:61-64`. Selector-based, no verification that it worked.
- Google `/sorry` CAPTCHA: detected only in Local Finder; **pivots to Places** and returns its result directly (`engine-google-serp-local.js:92-110`). Places itself has **no CAPTCHA detection** (it would just extract 0 cards and return empty).
- Bing CAPTCHA: detect and bail (`engine-social-dork.js:29-33`).
- JustDial/IndiaMART: no CAPTCHA handling; manual-intervention UI never wired (see 3.1).
- Instagram/Facebook login wall: no handling — Bing-dork path never opens profiles (snippet only); orphan `engine-python-social.py` would hit the login wall with `undetected-chromedriver` and rely on body text (`:90-114`).
- No solver service (2captcha/capsolver) integration.

### 3.8 Known failure modes (platform → cause → evidence)

| Platform | Failure mode | Evidence |
|---|---|---|
| JustDial | Akamai Bot Manager drops Chromium HTTP/2 handshake; category paths return empty HTML to non-browser clients; current code has no Firefox path (the documented fix), and its Puppeteer CDP/headful strategy cannot work in a packaged/headless deployment | `justdial_cracking_writeup.md:16-32, :41-43, :59-67`; `engine-justdial.js:33-48`; `browserFactory.js:103-105` |
| Google Maps | DOM selector drift + consent/CAPTCHA absence of detection; address/hours heuristics mis-parse cards; `--disable-http2` and aborted CSS may alter rendering | `engine-google-places.js:730-804`, `:791`, `:749` |
| Google Local Finder | `/sorry` redirect; fallback pivot doubles work; card structure changes (`.VkpGBb`, `.rl_item`) | `engine-google-serp-local.js:93-110, :128-133` |
| Bing | CAPTCHA/anti-bot on datacentre IPs | `engine-social-dork.js:30-33` |
| Instagram/Facebook/LinkedIn | login walls; Bing snippets stale; followers only | matrix #5; `engine-python-social.py:86-119` |
| WeddingWire/WeddingBazaar | phone behind login/Otp → hard-coded placeholder inserted as if data | `engine-weddingwire.js:78`, `engine-weddingbazaar.js:80` |
| IndiaMART | "View Number" requires click/login → phones hard-nulled; browser dead | `engine-puppeteer-indiamart.js:96` |
| Mandap | 3 URL shapes guessed; no pagination; phone mostly hidden | `engine-mandap.js:36-41, :91-95` |
| Python engines | `python` may be the Windows Store shim; `playwright`/`scrapy`/`undetected-chromedriver` not declared/installed; NVIDIA model name `deepseek-ai/deepseek-v4-pro` is unverified; no requirements.txt | `engine-deepseek.js:51-58`; `engine-python.py:8-11, :38-40`; `engine-scrapy.js:18-23`; `engine-python-social.py:8-14`; `deepseek_helper.py:34-41` |
| Puppeteer engines | `puppeteer` not installed (peer dep of `puppeteer-extra` only); require launches fail at runtime; connect expects a manually started Chrome on `localhost:9222` | `server/package.json:30-33`; `server/node_modules` check; `engine-justdial.js:35`, `engine-puppeteer-indiamart.js:30` |
| All | silent `catch` converts every failure into "0 results / success" | §4.4 |

---

## 4. Fragility register

### 4.1 Hard-coded DOM selectors (change on every site release)

| Engine | Selectors | File:line |
|---|---|---|
| Google Places | `div.Nv2PK`, `div.fontHeadlineSmall`, `.qBF1Pd`, `.W4Efsd`, `a.hfpxzc`, `span.MW4etd`, `span.UY7F9`, `div[role="feed"]`, `h1.DUwDvf`, `[data-item-id="address"]`, `a[data-item-id="authority"]`, `div.F7nice` | `engine-google-places.js:732-805, :561-591` |
| Places media | `button[jsaction*="heroHeader"] img`, `div.lMbq3e img`, `div.Z6G0Re button img`, `button.aoRNLd img`, `button[aria-label^="Photo of"] img`, `img[src*="googleusercontent.com/p/"]` | `engine-google-places.js:244-279` |
| Local Finder | `div.VkpGBb`, `div.rl_item`, `div[jscontroller="e6hkjf"]`, `div.dbg0pd`, `.OSrXXb`, `span.LrzXr`, `span.yi40Hd`, `span.z3HNkc`, `span.RDApEe`, `.rllt__details`, `a.yY1duf` | `engine-google-serp-local.js:122-232` |
| Google SERP | `#search div.g`, `#rso div.g`, `div.MjjYud`, `div.VwiC3b` | `engine-google-serp.js:89-94` |
| JustDial | `.resultbox_info`, `.resultbox_title_anchor`, `.callcontent`, `.resultbox_totalrating`, `.resultbox_address`, `.jdicon-close`, `.login-close` | `engine-justdial.js:78-98, :64` |
| IndiaMART | `.ls_co_nm`, `.mng_title`, `.clg`, `.desc_loc`, `.lst_nd` | `engine-puppeteer-indiamart.js:69-76` |
| WeddingWire | `.vendorTile`, `.storefront-list-item`, `.directory-item`, `.vendorTile__title`, `.rating__count` | `engine-weddingwire.js:44-53` |
| WeddingBazaar | `.vendor-card`, `.listing-card`, `article`, `.vendor-location` | `engine-weddingbazaar.js:46-56` |
| Mandap | `.venue-card, .mandap-card, .listing-card, [data-testid*="venue"], .card-venue, .venue-box, article, .listingItem` | `engine-mandap.js:139-140, :59-65` |
| Brave | `.snippet`, `.title`, `.snippet-description` | `engine-brave-dork.js:38-50` |
| Bing | `li.b_algo`, `h2 a`, `.b_caption p`, `.b_algoSlug` | `engine-social-dork.js:37-50` |
| Python Maps | `div[role="feed"]`, `a.hfpxzc`, `h1.DUwDvf`, `[data-item-id="address"]`, `button[data-item-id^="phone:tel:"]`, `a[data-item-id="authority"]` | `engine-python.py:69-145` |

No selector fallback sets, no schema-based extraction (JSON-LD/microdata) except *client-side* Mandap/WeddingWire copies, no visual/DOM-diff monitoring, no selector regression tests (`server/package.json:11` → `"test": "echo \"Error: no test specified\" && exit 1"`).

### 4.2 Hard-coded geography / categories / values

| Hard-coded data | Where | Risk |
|---|---|---|
| India-state list (29 names) used for containment filtering | `engine-google-places.js:335-341` | substring match yields **false positives**: live OOB record rejected because address contains **"Karnataka Bank"** → `"Belongs to foreign state karnataka instead of andhra pradesh"` (`server/data/out_of_bounds.json`) |
| Metro hub list (24 cities) | `engine-google-places.js:370-375` | listing (non-extensible) |
| Guntur urban localities + `520–523` pincode ranges + Narasaraopet/Palnadu special cases + 22 km clamp | `engine-google-places.js:391-421, :436-441` | product is effectively tuned to one AP market; any other market gets wrong containment |
| `AP_OVERRIDES` (10 mandals) | `universalGeoCluster.js:115-125` | only AP 2022 reorg fixed |
| `AUTHORITATIVE_CLUSTERS` (13 metros only) + `ZONE_COORDINATES` | `universalGeoCluster.js:5-63, :143+` | hard-coded zone lists; other cities fall to "6 generic vectors" |
| Region "vectors" (`Best …`, `near Market`, `near Railway Station…`) | `universalGeoCluster.js:398-406` | fabricated query variants, not real neighbourhoods |
| 6-state list in `geoAI.parseSearchQuery` | `geoAI.js:43` | fake AI parser (regex + tiny dictionary) |
| Telangana/AP district lists duplicated in two warm scripts | `warm_all_districts.js:63-80`, `write_state_hierarchies.js:19-36` | duplication/drift |
| NVIDIA API key committed in source | `config/settingsManager.js:7` | **secret leak** |
| Ola Maps fallback API key committed in source | `utils/olaMaps.js:44` | **secret leak**; settings UI claims Nominatim only (`scrape.js:271-280`) |
| Default admin `password123` | `config/dbAdapter.js:33-40` | hard-coded credential |
| Default strategy/radius/pages: `'mandal'`, 10 pages, radius 10/15 km, 22 km clamp | `scrape.js:1006`, `:692`, `:815-820`, `engine-google-places.js:437` | business logic buried in code |
| Window paths (`Chrome`, `Brave`, `AppData`) | `browserFactory.js:70-74`, `engine-justdial.js:29`, `engine-puppeteer-indiamart.js:24`, `engine-brave-dork.js:17` | Windows-only; breaks container/Linux deploy |

### 4.3 Silent catch blocks that return `[]` / hide failure

| Location | Behaviour |
|---|---|
| `engine-google-places.js:1067-1069` | any outer error → `return []` (logs one line) |
| `engine-google-serp-local.js:414-415` | any error → returns partial results, no error signal |
| `engine-google-serp.js:183-185` | **empty catch** swallows the `db.addVendor` TypeError → engine "works" but stores nothing |
| `engine-justdial.js:128-130` | per-loop catch swallows `dbAdapter.addVendor` TypeError → 0 inserts, logs "Error in Extractor", returns |
| `engine-weddingbazaar.js:93-95`, `engine-weddingwire.js:91-93` | catch → log only, return undefined |
| `engine-mandap.js:81-83, :193-195` | empty/one-line catch — HTTP fallback failures invisible |
| `engine-brave-dork.js:89-90`, `engine-social-dork.js:128-130` | catch → log only |
| `engine-deepseek.js:63-129` | JSON parse errors silently ignored; Python stderr only logged; `spawn` error resolved as success (`:141-144`) |
| `engine-scrapy.js:54-56` | stderr entirely ignored |
| `engine-crawlee-deep.js:13-16` | logs "disabled", returns |
| `geoAI.js:127-129`; `olaMaps.js:185-193`; `fastWebsiteExtractor.js:128-130`; `dbAdapter` writers | enrichment/geocode failures swallowed |
| `scrape.js:47-54` | `safeExecute` converts any engine throw into `null`; queue then logs **"Job … completed successfully"** (`queue.js:222`) |
| `dbAdapter.js:44-46, :114-121, :164-170` | corrupt JSON file → silently `[]` |

### 4.4 Fake / placeholder / mock data

- Phone placeholders: `'Requires Manual Lookup'` (`engine-google-places.js:646`, `engine-google-serp-local.js:339`), `'Requires Manual Reveal'` (`engine-justdial.js:117`), `'Requires Manual Lookup / Login'` (`engine-weddingbazaar.js:80`, `engine-weddingwire.js:78`); `vendors.js:41` additionally masks phones as `'Requires 1 Credit'`.
- Address placeholders: `Located in <loc>` (`engine-mandap.js:225`, `engine-weddingbazaar.js:78`, `engine-weddingwire.js:76`), `Discovered via <domain> in <loc>` (`engine-brave-dork.js:72`), `'Unknown'` (`scrapy_spider.py:47`), `'India'` fallback (`engine-puppeteer-indiamart.js:74`).
- Logo/avatar: `ui-avatars.com` generators (`engine-google-places.js:306, :316, :892-894`) — 31/31 live leads.
- DeepSeek bridge fabricates `verified: true` and `aiVerified: true` for every lead (`engine-deepseek.js:99-100`) and **invents rating = qualityScore/20** (`:96`).
- `topReviews`, `images`, `operatingHours` initialised to `[]`/`[]`/`''` and never filled in most paths.
- Stub endpoints: `POST /firebase` returns success, does nothing (`scrape.js:435-439`); `GET /batch/progress` always returns the never-updated `batchProgress` object (`scrape.js:56, :1156-1159`); `GET /stream/:sessionId` SSE sends only `connected` + heartbeats, never engine events (`scrape.js:1253-1267`).
- `resolve-intervention` can never resolve (no caller of `injectManualLoginUI`).
- `actions.md` "self-training memory" is never read/written (grep: no reference).
- `SCRAPER_FIXES_COMPLETE.md` documents endpoints (`/scrape/social`, `/scrape/truecaller`), 8 engines and MongoDB as live — none exist in current code (`server/index.js:6` Mongo commented out via `dbAdapter.js:5-12`). `justdial_cracking_writeup.md` documents a Firefox fix absent from code.
- No `TODO`/`FIXME` markers at all — fragility is undocumented rather than flagged.

---

## 5. Orchestration (`server/src/routes/scrape.js` + `utils/queue.js` + `server/index.js`)

### 5.1 Queue dispatch contract (as used by engines)

- `initQueue(deps)` loads `server/data/jobs.json` and calls `processQueue()` after 2 s (`queue.js:48-53`). Note `initQueue` is called **twice** at boot: `server/index.js:131` then again via `scrape.js:246` (`setDeps` → `initQueue`); harmless due to `isProcessing`, but duplicate loaders/resume timers.
- `registerTask(name, fn)` (`queue.js:58-60`) — 14 task names registered in `scrape.js:181-221`; all wrap engine calls in `safeExecute`.
- `addScrapeJob(taskName, args, priority=10, meta=null)` (`queue.js:228-234`) — push, sort by priority desc, debounce-save 500 ms, kick `processQueue()`.
- `processQueue()` (`queue.js:115-169`): single `isProcessing` loop; picks the first job with a free slot. **Playwright classification is `taskName === 'scrapeGooglePlaces' || 'scrapeGoogleSerp'` only** (`queue.js:138`). Local Finder (Playwright), DeepSeek (spawns Python Playwright), JustDial/IndiaMART (Puppeteer), Weddings/Mandap/Brave/Bing (own browsers) are all counted as "HTTP" and limited by `maxHttpConcurrency`.
- Dynamic limits from free RAM (`queue.js:73-101`): `>40 %` free → `maxHttp=16, maxPlaywright=12`; `<20 %` → `4/3`; else `8/6`. On this audit host (23 % free): **6 Playwright slots, 8 "HTTP" slots**.
- Per-job hard timeout 600 s via `Promise.race` (`queue.js:213-221`) — **no cancellation**; after the race the job keeps running while the slot is freed and the queue reports success (`queue.js:222`).
- Abort: `globalDeps.abortSignal.aborted` → queue is emptied and persisted (`queue.js:121-126`); running jobs are not signalled. Notification to UI: `emitActivePointEvent({instanceId, completed:true})` (`queue.js:186-188`).
- Resume: pending jobs survive restart (`queue.js:20-31, :48-53`); **in-flight jobs do not** (removed from the array at start, `queue.js:157`). `server/data/jobs.json` is currently `[]`.
- `getActiveJobs`, `getPersistentQueue`, `getConcurrencyMetrics` are read by `/scrape/jobs`, `/scrape/active`, orchestrator monitor.

### 5.2 Every endpoint in `scrape.js`

`server/index.js:145` mounts the router at `/api/scrape` (also alias `/api/api/scrape`, `:161`).

| Method | Path | Body (required) | Response | Notes |
|---|---|---|---|---|
| POST | `/resolve-intervention` `:252` | `{platform, action:'yes'|'no'}` | `{success,message}` / 404 | Dead: nothing ever registers an intervention |
| GET | `/settings` `:266` | — | settings with masked keys; `mapsProvider`/`geocodingProvider` are hard-coded strings | leaks Ola key presence, not value |
| POST | `/settings` `:283` | `{nvidiaApiKey?, olaMapsApiKey?}` | `{success, settings}` | ignores masked values |
| GET | `/jobs` `:300` | — | array of omni sessions + cron + first queue job | in-memory only |
| GET | `/active` `:346` | — | `{isScraping, session, queueCount, category, location, …}` | |
| POST | `/jobs/update` `:369` | `{category, action:create|stop|start|update_interval, intervalMs, location}` | `{success,message}` | `create` requires `location` (client omits it at `ScraperDashboard.jsx:806`); cron jobs in memory only |
| POST | `/firebase` `:435` | `{query?, category?, location?}` | `{success:true}` | **stub**, does nothing |
| POST | `/python` `:444` | `{query, location}` | `{success:true}` immediately | `exec`s `engine-python.py` raw, stdout only logged → **data dropped**; shell-injection risk (only `"` escaped) |
| POST | `/maps` `:473` | `{query, category, location, radius?}` | `{success:true}` | **arg-mismatch bug**: enqueues 8 args but `scrapeGooglePlaces` expects `(q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, bbox)` → `sessionId=[]`, `centerLat='manual-maps'`, `strategy=radius` (number) |
| GET | `/keywords` `:484` | query `category`, `location` | synonyms array | Datamuse API + hard-coded wedding terms (`utils/aiParser.js:29-83`) |
| POST | `/parse-location` `:497` | `{query}` | `{original, category, village, mandal, district, state}` | fake AI = regex + 6-state list (`geoAI.js:29-87`) |
| POST | `/preflight` `:504` | `{location}` | scope data `{type,…}` / `{type:'specific'}` on error | `intelligentExtractor.analyzeGeographicScope` |
| POST | `/omni` `:966` | `{query?|category+location, radius?, gridDensity?, enabledEngines?, strategy?, sessionId?, userId?}` | **`{message, sessionId}` immediately** (fire-and-forget) | credit deduction (5) when `userId`; orchestrator queued as `scrapeOmniOrchestrator`; message says "BullMQ" but no BullMQ exists |
| POST | `/deep-enrich` `:1030` | `{leadIds?[], sessionId?}` | `{success,message,targetCount}` then background loop | unbounded serial `fastWebsiteExtract` over every lead; no concurrency limit; process-local |
| POST | `/batch` `:1107` | `{tasks:[{category,location,engines?}]}` | `{success,message}` | geocodes each task serially (`:1115`) **before** responding; always queues DeepSeek regardless of `engines` (`:1120`); queues Places only if `engines` includes `maps`; **shadowed** (see next row) |
| POST | `/upload` `:1131` | `{tasks:[{category,location,engines?}]}` | `{success,message}` | serial geocode; DeepSeek if `deepseek-ai`; Places if `maps`/`google` |
| GET | `/batch/progress` `:1156` | — | static `batchProgress` (`:56` never updated) | dead metric |
| POST | `/jobs/stop-all` `:1249` and POST `/stop` `:1250` | — | `{success,status,preservedCount,message}` | same handler: set abort flag, `closeAllBrowsers()`, clear queue, `flushSync`, write session vaults for all `activeSessions`, emit progress |
| GET | `/stream/:sessionId` `:1253` | — | SSE: `connected` + heartbeat every 15 s | **not wired to any emitter** — engines emit through `index.js` `/api/logs/stream` instead |
| POST | `/batch` `:1270` | `{queries:[], engines?, sessionId?}` | `{success,sessionId,queriesCount,status}` | **dead code** — Express matches the earlier `/batch` at `:1107`; `defaultPool.runBatch` never exercised |

Other dispatch sites outside `scrape.js`: `automations.js:28` (Google Places), `:51` (Crawlee no-op), `:72` (Bing dork); `publicUsers.js:222` (Google Places demo). `server/index.js:75` enqueues a Crawlee no-op for every inserted vendor lacking phone/email.

### 5.3 End-to-end flow: `POST /api/scrape/omni`

1. **HTTP handler** (`scrape.js:966-1024`): validate query (or build `category in location`); if `userId` → load public users, reject <5 credits, deduct 5 and save (`:975-994`); typo-correct location via Fuse geo index (`:1000-1004`); `strategy = body.strategy || 'mandal'`; **reset `globalAbortSignal.aborted = false`** (`:1009`); `dbAdapter.flushSync()`; `sessionId = body.sessionId || 'session_'+Date.now()`.
2. Respond immediately (`:1018`) and enqueue `scrapeOmniOrchestrator` with `(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId)` (`:1023`). Note the queue will treat this job as non-Playwright.
3. **Queue** (`queue.js:115-169, :198-226`) picks it immediately (single job); `processJob` runs `runOmniSearchOrchestrator` under a 10-min `Promise.race`.
4. **Orchestrator** (`runOmniSearchOrchestrator`, `scrape.js:698-962`):
   - `clearQueue()` unconditionally (`:704`) — **destroys every other pending job in the process**, including other users' searches and scheduled jobs.
   - `flushSync()` DB (`:708-710`).
   - `resolveUniversalZones(baseLocation, category)` (`:714`; `utils/universalGeoCluster.js:410-506`): returns 6 category/landmark vectors for a mandal, up to 12 mandals for a district, up to 12 districts for a state, 8–15 hard-coded neighbourhoods for 13 metros, or 6 generic vectors.
   - Geocode base location (`geocodeLocation`, Ola->Nominatim with disk cache) and emit `dispatch_targets` + one `grid_points` event (`:717-743`).
   - Create in-memory session record (`:749-769`): counts, ETA guess 6 s/zone, `completedTargetsMap`, one-district `fullHierarchy`.
   - Loop zones (`:790-826`): build `zoneQuery` (prepend category unless vector), resolve zone coords from `ZONE_COORDINATES`/geocode cache/baseGeo, build `meta`, mark `completedTargetsMap[zone]='queued'`, `addScrapeJob('scrapeGoogleLocalFinder', [query, category, zoneName, sessionId, 10, district, state, zoneGeo], 10, meta)`; if `deepseek-ai` in `enabledEngines` also `addScrapeJob('scrapeDeepseekAI', …, 5, meta)`.
   - Monitor loop every 1 s (`:830-884`): counts `getPersistentQueue()`/`getActiveJobs()` filtered by `job.args[3] === sessionId`; computes completed = total − (pending+running); emits `progress`; breaks when none. **Engines that fail instantly still count as completed** (no success tracking). DeepSeek jobs have 3 args → invisible to the count yet they keep running.
   - Finalise (`:886-950`): collect vendors with `v.sessionId === sessionId`; write vault JSON to `server/db/user_sessions/anonymous/<session>.json` (+ user dir if `userId`); `leadCount`, `phoneCount`, metadata zones/elapsed/status; emit 100 % progress; **set `globalAbortSignal.aborted = true`**; `clearQueue()`. The abort flag stays `true` for the rest of the process until another `/omni` resets it — any scheduled/maps/batch job will be discarded at next `processQueue` (`queue.js:121-126`).
5. **Engines** per zone (`scrapeGoogleLocalFinder`) write to the shared in-memory vendors array via `dbAdapter.saveVendors` and push `vendor` SSE events (through `setDeps` → `index.js:62`).
6. **SSE** (`server/index.js:48-60` log stream + `:62-125` event emitters): `vendor`, `grid_points`, `progress`, `dispatch_targets`, `active_point`, `intervention` all fan out on `/api/logs/stream`; the per-session `/api/scrape/stream/:id` endpoint is not used.
7. **UI polling**: `GET /scrape/jobs`, `/scrape/active`, plus `/api/vendors?since=…` + EventSource on `/api/logs/stream`.

**Concurrent sessions:** there is exactly one global abort flag (`index.js:134`), one global browser (`browserFactory.js:24-25`), one queue (`queue.js:17`), and one in-memory DB array (`dbAdapter.js:50`). A second `/omni` resets the abort flag while the first is still running and calls `clearQueue()`; both orchestrators then run concurrently and write into each other's session view (first one's `completedZones` math can go negative and clamp to 0, `:841-842`). There is no per-session isolation, cancellation token, or orchestration state persistence.

### 5.4 Dedupe

- **No global dedupe.** Each engine scans the full `dbAdapter.getVendors()` array in memory:
  - Places: `findIndex(v => v.mapsLink === place.mapsLink || v.name === place.name)` (`engine-google-places.js:986-987`) — name-only collisions merge different businesses; O(n) per lead.
  - Local Finder: `vendors.some(name or phone)` + current-run set (`engine-google-serp-local.js:320-324`) — O(n) per lead.
  - JustDial/IndiaMART/Wedding*/Mandap: ad-hoc name/phone/link `find` (`engine-justdial.js:110`, `engine-puppeteer-indiamart.js:104`, `engine-mandap.js:203-208`, …).
  - Bing dork compares social URLs (`engine-social-dork.js:92-99`).
- `utils/deduplicator.js` (SHA1 fingerprint + phone/name normalisation + merge) is **imported but never used** (`scrape.js:32`, zero call sites) — dead code.
- Cross-engine and cross-session dedupe does not exist; the same business can appear once per source string (`source` is stored, not used as a key).

### 5.5 Abort signal handling

- One global `{aborted}` object created in `index.js:134`, injected into all engines via `setDeps` (`scrape.js:223-247`).
- Engines check the flag at loop boundaries only: Places `:696, :813`; Local Finder `:75-78`; JustDial `:103, :139`; Mandap `:47, :124, :132, :206`; Wedding* `:38, :43, :64`; Brave `:36`; Python map loop does not check at all; DeepSeek kills child only when stdout data arrives (`engine-deepseek.js:64-67`); Scrapy kills on stdout data (`engine-scrapy.js:26-29`).
- `closeAllBrowsers()` on master stop kills **all** browsers (`browserFactory.js:160-177`) including those of unrelated running jobs; a new `getBrowser()` relaunches (`:107-113`).
- `POST /stop` and `/jobs/stop-all` make an **aborted vault copy** keyed by `activeSessions` (`scrape.js:1184-1226`) but `session.userId` is never stored on the session object, so everything goes to `anonymous/`; multiple concurrent sessions with the same category can mix because of the fallback `v.category === session.category` clause (`:1193`).

### 5.6 Persistence (job vs folder)

- **Queue:** `server/data/jobs.json` (pending-only, debounced 500 ms; currently `[]`).
- **Search vaults:** one JSON per session per user dir under `server/db/user_sessions/<user>/<session>.json`, written by `/omni` completion (`scrape.js:890-929`), master stop (`:1184-1226`) and `POST /api/sessions/save` (`sessionRoutes.js:28-56`); listed/exported by `sessionRoutes.js:59-238`. There is **no write-ahead persistence of orchestrator state** — server restart loses all running sessions and their pending zone list.
- **Lead DB:** single `server/data/scraped_vendors.json` (in-memory cached, full-array rewrite; `dbAdapter.js:49-64, :114-121, :158-161`) + `out_of_bounds.json`. A **second, independent file-I/O adapter** (`config/localDb.js:14-24`) points at the same `scraped_vendors.json` with synchronous read/write and no shared cache — split-brain risk if ever used (only `engine-google-serp` uses it, and it calls a non-existent `addVendor`).
- **Sessions in memory:** `activeSessions` (`scrape.js:76`) never garbage-collected; `/scrape/jobs` filters by counters.
- **Cron jobs:** `activeCronJobs` (`scrape.js:298`) in-memory only; lost on restart.

### 5.7 Error paths

| Failure | Handling |
|---|---|
| Engine throws | `safeExecute` → `null` (`scrape.js:47-54`); queue logs success (`queue.js:222`) |
| Engine returns `[]` | indistinguishable from "nothing found" |
| Queue task not registered | logged, silently dropped (`queue.js:202-205`) |
| Queue timeout | `Promise.race` rejects; underlying work continues; slot freed (`queue.js:213-225`) |
| Missing `puppeteer`/Python | runtime error caught by engine try/catch → 0 results; `/python` returns success regardless |
| Broken `addVendor`/`localDb.addVendor` | TypeError swallowed → 0 results, no alert |
| `/omni` orchestrator throw | catch → emit progress `{sessionActive:false,error}`, `aborted=true`, `clearQueue()` (`scrape.js:951-961`) |
| Credit deduction without job success | 5 credits deducted before enqueue, no refund path (`:975-994`) |
| API-level: no auth/authorisation on scrape endpoints | any caller can trigger/stop all scrapes (credit check only when `userId` supplied) |

---

## 6. Dead / duplicated / broken code

### 6.1 Node engines unreachable or broken

| Engine | Why dead | Evidence |
|---|---|---|
| `scrapeJustDial` | no enqueue site + `puppeteer` not installed + `dbAdapter.addVendor` missing | `scrape.js:199-204` (task only); `package.json:30-33`; `engine-justdial.js:122` |
| `scrapeWeddingBazaar` | no enqueue site | `scrape.js:205` |
| `scrapeWeddingWire` | no enqueue site | `scrape.js:206` |
| `scrapeMandap` | no enqueue site | `scrape.js:207` |
| `scrapeBraveDork` | no enqueue site; Brave binary absent → Chromium fallback | `scrape.js:209`; `browserFactory.js:94` |
| `scrapePuppeteerIndiaMart` | no enqueue site + puppeteer missing | `scrape.js:212-217` |
| `scrapeScrapySpider` | no enqueue site; scrapy not installed/declared | `scrape.js:218`; `engine-scrapy.js:23` |
| `scrapeGoogleSerp` | only enqueue is dead `queueMandalJob`; persistence broken | `scrape.js:193-198, :655-696`; `engine-google-serp.js:178` |
| `scrapeCrawleeDeep` | registered, enqueued, guaranteed no-op | `engine-crawlee-deep.js:13-16` |
| `scrapeDuckDuckGoDork` | reachable but snippet-only, named DDG and implemented on Bing | `engine-social-dork.js:27` |

### 6.2 Python layer

- `engine-python-justdial.py`, `engine-python-weddingbazaar.py`, `engine-python-weddingwire.py`, `engine-python-social.py` — **zero callers** (`grep` across `server/`: only self-references). No Node bridge, no route.
- `engine-python.py` — only caller is `engine-deepseek.js:51`; `/scrape/python` launches it directly but discards stdout (`scrape.js:461-468`).
- `scrapy_spider.py` — only caller `engine-scrapy.js:18`, which itself is unreachable.
- `deepseek_helper.py` — only imported by the orphan `engine-python-social.py:17`.
- No `requirements.txt`; Python deps (`playwright`, `scrapy`, `undetected-chromedriver`, `requests`) undeclared; Windows `python` is the Store shim on this host.

### 6.3 Duplicate implementations of the same site

| Site | JS server | Python server | Client-side port |
|---|---|---|---|
| JustDial | `engine-justdial.js` (Puppeteer) | `engine-python-justdial.py` (Playwright) | `client/src/utils/engines/justdial.js`, `ScraperEngine.js:18-78` |
| WeddingBazaar | `engine-weddingbazaar.js` | `engine-python-weddingbazaar.py` | `client/src/utils/engines/weddingBazaar.js` |
| WeddingWire | `engine-weddingwire.js` | `engine-python-weddingwire.py` | `client/src/utils/engines/weddingWire.js` |
| Mandap | `engine-mandap.js` | — | `client/src/utils/engines/mandap.js` |
| Google Maps | `engine-google-places.js` | `engine-python.py` | `ScraperEngine.js:83-137` (SERP) |
| Google SERP/Local | `engine-google-serp.js`, `engine-google-serp-local.js` | — | `client/src/utils/engines/googleSerp.js` |
| Social dork | `engine-social-dork.js` (Bing) | `engine-python-social.py` (Google + UC) | — |

Client copies total ~1 300 lines plus helpers (`proxyFetch.js`, `FrontendQueue.js`, `useQueue.js`, `ScraperEngine.js`) — **all orphaned**: `useQueue` is imported by nothing (grep: only its own definition); the chain would still fail because `/api/proxy` exists in `routes/proxy.js` but is **never mounted** in `server/index.js`, and `FrontendQueue.saveResultsToBackend` POSTs to `/api/vendors`, for which **no POST route exists** (`vendors.js` has GET/PUT/DELETE only). Client also still calls nonexistent `/api/scrape/cheerio` (`ScraperDashboard.jsx:959`), `/api/scrape/social` / `/api/scrape/truecaller` (`comprehensive_test.js:15, :32`), and `/api/scrape/firebase` (stub).

### 6.4 Scratch / one-off files at repo & server root

| File | Status |
|---|---|
| `temp_scrape.js` (68 KB, 2026‑10‑19) | stale copy of an older `scrape.js`; contains `/cheerio` endpoint and old engine requires; sits at repo root so `require('../scrapers/…')` cannot resolve; unreferenced |
| `temp_scrape_utf8.js` (34 KB) | second stale copy; unreferenced |
| `server/extract_places.js` | code-generation script that generated `engine-google-places.js` (references `../models/StagingLead`, old paths); obsolete |
| `server/check_acorn.js` | one-off parser check; `acorn` not in deps |
| `server/comprehensive_test.js` | calls removed endpoints; asserts stale behaviour |
| `server/test_card_extraction.js`, `test_maps_feed.js` | one-off Playwright probes for Maps selectors |
| `server/warm_all_districts.js`, `warm_geo_cache.js`, `write_state_hierarchies.js` | geographic cache warmers (hard-coded TS/AP lists); operational scripts |
| `server/clear-vendors.js` | requires missing `server/models/StagingLead` → **crashes** |
| `SCRAPER_FIXES_COMPLETE.md`, `justdial_cracking_writeup.md` | documentation describes code that no longer exists (social/TrueCaller endpoints, Firefox JustDial fix, MongoDB) |
| `client/src/utils/engines/*`, `ScraperEngine.js`, `FrontendQueue.js`, `useQueue.js`, `proxyFetch.js` | orphaned frontend scraping stack |
| `server/src/utils/deduplicator.js`, `enricher.js` | imported but unused (`scrape.js:32-33`, no call sites) |
| `server/src/config/database.js` | MongoDB connect helper; never called (Mongo disabled in `dbAdapter.js:5-12`) |
| `server/src/scrapers/actions.md` | "self-training memory" never read/written |
| `engine-google-serp-local.js` unused imports | `cheerio`, `axios`, `path` (`:1-3`); `engine-google-places.js` unused `path`, `verifyWithAI` (`:3, :8`); `engine-social-dork.js` unused `verifyWithAI` (`:3`); `engine-scrapy.js` unused `dbAdapter`? (used), etc. |
| `scraped_vendors.json` split adapters | `localDb.js` vs `dbAdapter.js` both target the same file (see §5.6) |

---

## 7. Throughput & bottleneck estimates

Environment: 8 logical cores / 15.9 GB RAM (23 % free during audit). Queue limits now: **6 Playwright slots / 8 "HTTP" slots** (`queue.js:73-101`); after RAM frees >40 % these become 12/16. Numbers below are **code-derived estimates** (timeouts, waits, loop counts), not benchmarks (no engines were run).

| Engine | Browser reuse | Dominant latency (evidence) | Est. per-job duration | Est. yield/job | Effective concurrency | Throughput class |
|---|---|---|---|---|---|---|
| Google Places | shared singleton, new context/job, no proxy | goto ≤30 s + feed-wait 10 s + scroll ≤40×650 ms ≈ 26 s + extraction <1 s + **per-lead sequential `geoAI` await** (`:1013-1023`) + fire-and-forget website scrapes (unbounded, 8 s each) | 40–90 s | 40–200 cards (cap 200 `:708`) | 6 (Playwright class) | **Medium**; 1–3 cards/s, 40–120 leads/min/worker; DB writes per lead |
| Local Finder | shared singleton, new context/job | goto ≤15 s + selector ≤3.5 s + 20-card evaluate + 0.3–0.55 s page gap (`:87, :122, :412`); typically 1–3 pages | 5–20 s/zone | 20–60 leads typical (max 200) | up to **8–16** because misclassified as HTTP | **High** in theory (2–5 leads/s/worker), but the misclassification can spawn 8–16 Chromium contexts on one browser |
| DeepSeek / python maps | **new Python process + new Chromium per job** (`:51-58`; `engine-python.py:47-49`) | process+Chromium start ≈2–4 s + 15×0.5 s scroll (`:102-105`) + per-card click + 3 s selector wait + 0.5 s (`:127-128`) ⇒ 1.5–4 s/card | **60–240 s** | 30–60 cards | up to 8 (HTTP class) ⇒ theoretically 8 Python+Chromium pairs | **Very low**; CPU/RAM amplification; 10-min queue timeout can trip mid-run |
| JustDial | new headful Chrome per job (`:43-47`) | launch 3–5 s + goto ≤30 s + up to 15×2 s scroll (`:139-154`) | 40–70 s attempted | 0 today (broken) | n/a | **0 (broken)** |
| IndiaMART | new headful Chrome | 3 s + goto ≤30 s + evaluate | 35–45 s | 0 today | n/a | **0 (broken)** |
| WeddingBazaar / WeddingWire | **new browser per job** (`:25/:24`), no reuse | launch ~1–2 s + goto ≤45 s + 6 s wait + 6×1.5 s scroll (`:34-41`) | 20–60 s | 20–40 leads | not reachable | **Low** (per-call browser cost) |
| Mandap | new browser + 3 sequential URLs | 3×(≤35 s goto + 3 s + 4×1 s scroll) worst ≈2 min (`:123-177`); HTTP fallback 3×12 s sequential (`:46-56`) | 30–120 s | 20–40 venues | not reachable | **Low** |
| Brave dork | new browser per call | goto ≤30 s + 3 s (`:33-34`) | 5–15 s typical | 10–20 snippet results | not reachable | **Low** |
| Bing social dork | new browser per platform per job | goto ≤30 s (`:27`), snippet-only | 10–20 s | 10–20 profiles | up to 8 HTTP class | **Medium-low** (5 platforms/job, no profile visits) |
| Google SERP ("Cyber Matrix") | 1 PW page + axios fan-out to 10–20 homepages **unbounded** (`:121-188`) | SERP ≤30 s + parallel site fetches ≤15 s each | 15–25 s | 0 persisted (bug) | up to 6 (Playwright class) | **0 practical** (persist broken), bursty network |
| Scrapy | subprocess | 50-page crawl cap; no timeout | 60 s+ | unknown | unreachable; scrapy absent | **0 (unrunnable)** |
| Crawlee deep | — | immediate return | 0 s | 0 | enqueued for every unenriched lead | **0 (no-op)** |

**System-level bottlenecks, ranked**

1. **Single global Chromium process** for the only high-volume engines (`browserFactory.js:107-113`): all Places/Local Finder contexts share one browser + GPU; with 8–16 Local Finder jobs misclassified as HTTP, the browser is the hard ceiling; a crash takes down all workers simultaneously (no per-job isolation).
2. **JSON-array "database" rewrites** (`dbAdapter.js:158-161` writes the whole vendor array on every save; Local Finder saves per page, Places per lead; `localDb.js:22-24` writes the same file synchronously). Cost is O(N) per insert → quadratic total I/O; plus `emitVendorEvent` JSON-serialises every lead to every SSE client (`index.js:62-79`). Also dedupe scans are O(N) per lead (`engine-google-places.js:986`, `engine-google-serp-local.js:320`).
3. **Sequential per-lead reverse geocoding** awaited in the Places hot loop (`:1013-1023`) with no timeout/rate-limit and full-file cache flush per new grid (`geoAI.js:100-131`).
4. **Browser launch per job** in 6 engines (Wedding*/Mandap/Brave/Bing/future JustDial/IndiaMART) — no pooling, ~1–5 s overhead each, RAM spikes; not covered by the Playwright concurrency budget (misclassified).
5. **Python process + Chromium per DeepSeek job**, enqueued per zone (`scrape.js:823-825`) — the orchestrator can spawn one Python/Chromium pair per zone in parallel; 10-minute queue timeout does not stop them.
6. **Orchestrator-per-search doesn't throttle**: for a district (12 zones) × radius defaults it queues 12 Local Finder (+12 DeepSeek) jobs at once, each up to 10 pages, with only the global queue limits protecting the host.
7. **No rate-limit/backoff across requests to Google** — only per-page micro-sleeps; CAPTCHA detection exists only on Local Finder and results in pivoting (doubling work) rather than backing off.

---

## 8. Rewrite implications (short)

1. **One canonical engine contract + schema**: `EngineResult { source, sourceUrl, platform, business{name, phones[], emails[], website, address{line, area, city, district, state, pincode}, lat, lng}, reputation{rating, reviewCount, reviewTexts[]}, classification{category, subcategory}, profile{hours[], images[], priceRange, socials{}, legal{}}, provenance{fieldConfidence, extractedAt}, raw }`. Current code has 18 ad-hoc output shapes (§2) and only a coarse `qualityScore`.
2. **Kill the multi-stack duplication**: pick one runtime (Node Playwright or Python) per site; delete the other copies + orphan client engines; add `requirements.txt`/`package.json` for real deps; delete `temp_scrape*.js`, root probes, `engine-crawlee-deep.js` no-op, `engine-google-serp.js` or repair it.
3. **Real orchestration service**: per-session cancellation (AbortController), durable job store, per-host rate limits/proxy sessions, bounded queues, no global `clearQueue()`/abort flag, browser pool keyed by proxy/context, and success/failure accounting per zone instead of "job left the queue = completed".
4. **Extraction hardening**: selector fallback chains + JSON-LD/microdata parsers (already present only in dead client copies), phone/pincode normalisation *before* deriving geography (the live data shows pincode derived from phones), provenance-preserving enrichment queues, and real review/legal/social extraction (currently zero review text, zero GST, 1/31 emails).
5. **Observability**: per-engine success/yield/block-rate metrics, CAPTCHA/consent counters, selector-canary tests; today failures are silent catches and "0 results" indistinguishable from "blocked".

---

### Appendix A — files read for this audit

`server/src/scrapers/`: `actions.md`, `browserFactory.js`, `concurrencyManager.js`, `deepseek_helper.py`, `engine-brave-dork.js`, `engine-crawlee-deep.js`, `engine-deepseek.js`, `engine-google-places.js`, `engine-google-serp-local.js`, `engine-google-serp.js`, `engine-justdial.js`, `engine-mandap.js`, `engine-puppeteer-indiamart.js`, `engine-python-justdial.py`, `engine-python-social.py`, `engine-python-weddingbazaar.py`, `engine-python-weddingwire.py`, `engine-python.py`, `engine-scrapy.js`, `engine-social-dork.js`, `engine-weddingbazaar.js`, `engine-weddingwire.js`, `proxyManager.js`, `scrapy_spider.py` (24/24).
Also fully read: `server/src/routes/scrape.js` (1302), `server/index.js` (221), `server/src/utils/queue.js` (250), `server/src/config/dbAdapter.js`, `localDb.js`, `settingsManager.js`, `database.js`, `server/src/utils/fastWebsiteExtractor.js`, `deduplicator.js`, `aiParser.js`, `geoAI.js`, `olaMaps.js`, `manualIntervention.js`, `server/src/routes/api.js`, `automations.js`, `sessionRoutes.js`, `publicUsers.js` (dispatch parts), `vendors.js` (route surface), `server/src/config/settings.json`, `server/package.json`, `server/data/jobs.json`, `scraped_vendors.json`, `out_of_bounds.json`, root `SCRAPER_FIXES_COMPLETE.md`, `justdial_cracking_writeup.md`, `temp_scrape.js` (structure + routes), `temp_scrape_utf8.js` (structure), `server/*.js` probe/warmer scripts, `client/src/utils/{FrontendQueue,ScraperEngine,proxyFetch}.js`, `client/src/utils/engines/*`, `client/src/ScraperDashboard.jsx` (scrape calls), target sections of `intelligentExtractor.js`, `universalGeoCluster.js`, `server/data/*` coverage stats computed read-only via `node -e` over existing JSON (no network).
