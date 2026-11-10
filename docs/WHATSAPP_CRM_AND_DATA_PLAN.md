# Master Plan v3 — WhatsApp CRM, Pure Scraped Data, All Engines, Ultra-Fast Leads

Status: **awaiting your approval** · Owner: engineering · Scope: client + master + engine + WhatsApp layer
Prepared: 2026-11-01

---

## 0. What you asked for (verbatim requirements → deliverables)

| # | Requirement | Deliverable in this plan |
|---|---|---|
| 1 | WhatsApp button in the dashboard header | §4.1 header control + deep links |
| 2 | WhatsApp opens as a **full page with all features** | §4.2 full-page workspace, §4.3 message composer, §4.4 products |
| 3 | Customers choose **what** to send and **when** to send it | §4.5 free-form composer + user-built templates + scheduling, no forced copy |
| 4 | Customers can make **all kinds of products**; we do not decide | §4.6 unlimited user-defined catalog |
| 5 | Plan how WhatsApp works **after a lead is scraped** | §4.7 lead → conversation flow, §4.8 automation |
| 6 | Clicking a scraped contact shows **only scraped information** | §5 pure-lead drawer with per-field provenance |
| 7 | Suggest **all scraping engines and all features** | §6 engine matrix + §7 feature catalogue |
| 8 | **Ultra blazing fast** leads | §8 speed architecture + targets |
| 9 | One implementation plan to approve | §11 phases, §12 acceptance, §13 approval checklist |

---

## 1. Decision summary (what will be built) — revised for “send from the customer’s own WhatsApp”

1. **WhatsApp is a first-class module**, not a popup: header button → `/whatsapp` full-page workspace with inbox, chat, lead profile, catalog, templates, campaigns, automations and settings.
2. **The customer sends from their own WhatsApp account** — normal WhatsApp or WhatsApp Business — through a managed browser session connected by QR. **We do not provide, store or require any Meta API key.** Two send modes: (a) automated WhatsApp Web session, (b) one-click `wa.me` hand-off.
3. **No fixed templates.** The app ships with an optional starter pack, but every message, product, price, image and schedule is created by the customer. We never hard-code business copy.
4. **Product catalog is user-owned.** Any product/service, any currency, any variants, unlimited items, CSV import/export, per-product images and payment links.
5. **Scraped contact = scraped data only.** The drawer shows exactly the fields the engines returned, each tagged with its source; unknown fields say `Unknown`. No AI-invented values, no “recommended” filler.
6. **Engines**: every engine runs under one auto-planner with health + extraction telemetry. Existing 13 engines are kept and corrected; 8 new sources are proposed in three priority tiers.
7. **Speed**: HTTP-first, browser-pooled, streaming ingestion. Targets: first lead < 5 s, ≥ 8 leads/s, 500 leads in under 70 s for a tier-2 city, no duplicate engine passes.
8. **UI/UX**: one design system with real depth (3D buttons), purposeful motion, plain-language labels, and a guided first-run. Professional enough for a paying customer, simple enough for a first-time computer user.

---

## 2. Current baseline (measured, not assumed)

| Item | Today | Evidence |
|---|---|---|
| City zones | 10 named localities + **54 grid cells covering the city and a 5 km ring** = **64 zones** | `universalGeoCluster.js`, `/api/search/parse` returns `zonesCount: 64`, `gridCells: 54` |
| Leads per city run | 170 (before grid) | `cmd_mvwj2ys5.json` |
| Phone rate | 56 % from feed cards | same |
| Phone source | Feed card only; place panel never opened | `engine-google-places.js` |
| Phone backfill | **Implemented now**: opens place panels for leads missing a mobile, merges all numbers + website/address/hours | `phoneBackfillService.js` |
| Vault write | After swarm **and** after backfill | `scrape.js` |
| Engines in auto plan | Local Finder, Maps, JustDial + directory set | `categoryRouter.js`, `scrape.js` |
| WhatsApp | Not present | — |

---

## 3. Architecture at a glance

```
┌──────────────────────────── CLIENT (Electron / web) ────────────────────────────┐
│  Dashboard header:  [Search] [Folders] [Map] [WhatsApp ●3] [Master]              │
│                                                                                 │
│  /whatsapp  ── full-page workspace                                              │
│   ┌────────────┬──────────────────────────────┬──────────────────────────────┐  │
│   │ Inbox      │  Conversation                 │  Scraped lead profile        │  │
│   │ filters    │  messages + composer          │  (only scraped fields)       │  │
│   │ search     │  products / templates / media │  stages, notes, tasks        │  │
│   └────────────┴──────────────────────────────┴──────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │ HTTPS (local engine)
┌───────────────────────────────────▼─────────────────────────────────────────────┐
│  ENGINE (Express, local)                                                        │
│  ├─ Scraper orchestrator (zones → engines → dedupe → phone/profile pass)        │
│  ├─ waSession       ── Playwright + persistent profile, QR connect, warm keep   │
│  ├─ waSender        ── own-account send queue, pacing, retries, daily caps      │
│  ├─ waReader        ── MutationObserver: inbound messages + delivery ticks      │
│  ├─ waScheduler     ── scheduled sends, sequences, quiet hours                  │
│  ├─ catalogService  ── user products, media, payment links                      │
│  └─ data stores     ── leads, conversations, messages, snippets, products       │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │ drives a private browser profile
                          ┌─────────▼──────────────────┐
                          │ web.whatsapp.com           │
                          │ customer's own account     │  ← QR scan, no API key
                          │ (normal or Business)       │
                          └────────────────────────────┘
```

**No API key, no template approval, no third-party message relay.** The app is
a careful operator sitting in front of the customer's own WhatsApp Web session.

---

## 4. WhatsApp CRM module

### 4.1 Entry points

| Entry point | Behaviour |
|---|---|
| Dashboard header button `WhatsApp` with unread badge | Opens `/whatsapp` full page, last active conversation |
| Lead drawer button `Message on WhatsApp` | Opens `/whatsapp?lead=<id>` with that conversation selected |
| After a run completes | Summary card: “Send this list to WhatsApp” → bulk composer with segment filters |
| Folder page row action | Same deep link, preserves folder context |
| Master app | Read-only conversation monitor + client-level stats (no sending from master unless enabled) |

The header button is always visible, works with keyboard (`Alt+W`), and shows a red dot when an inbound message is waiting.

### 4.2 Full-page workspace (`/whatsapp`)

**Left rail — Inbox**
- Tabs: `All`, `Unread`, `Needs reply`, `Scheduled`, `Failed`.
- Filters: city, category, pipeline stage, tag, owner, last message date, has phone.
- Search by business name, phone, message text.
- Bulk select → tag, assign, stage change, schedule message, export.

**Center — Conversation**
- Header: business name, verified phone, city, stage pill, “Open in Maps”, “Call”, “Scraped profile”.
- Thread: inbound (left) / outbound (right), timestamps, delivery ticks (sent/delivered/read/failed), media previews, product cards, template labels, system events (“stage changed to Interested”).
- Day separators, unread divider, jump-to-latest.
- Composer (see §4.3), attachment tray, emoji, quick replies, product picker, template picker, schedule button, send button.
- Reply window banner: shows how long since the customer last wrote; free-form messages always work because we send from the customer’s own account, but the banner still warns that unsolicited high-volume sending can get the number restricted.

**Right rail — Scraped lead profile**
- Every field the engines returned, grouped: Identity, Contact, Location, Web & social, Hours, Ratings, Source.
- Each field shows a small source chip (`Google Maps`, `JustDial`, `Website`, `IndiaMART`) and timestamp.
- Missing field = `Unknown` (never blank, never invented).
- Actions: add note, create task, set stage, set deal value, assign owner, add tag, opt-out.
- “Data sources” section lists the exact URLs used, each clickable.

### 4.3 Message composer — the customer decides

Supported message types (all user-authored):

| Type | Details |
|---|---|
| Text | Free-form; variables `{{business}}`, `{{city}}`, `{{phone}}`, `{{my_name}}` resolved at send time |
| Image / video / document / audio | Upload from disk or drag-drop; caption; size/type validation |
| Location | Pin from the scraped address or pick on map |
| Contact card | vCard built from the scraped phone/email |
| Product card | Pick from the customer catalogue; sends image + name + price + description + link |
| Multi-product | Up to 10 catalog items in one message |
| Quick reply buttons | Up to 3 buttons, labels and actions authored by the customer |
| List message | Up to 10 rows, sections authored by the customer |
| Payment link | Any URL (Razorpay/UPI/Stripe/etc.); optional amount and note |
| Voice note | Record in-app, send as audio |
| Schedule | Send now, send at a chosen time, or send when the lead replies |
| Saved replies | Customer-created snippets, searchable, editable |

**Template builder (customer’s own snippets)**
- Name, language, header (text/image/document), body with variables, footer, buttons.
- Live phone preview.
- No Meta approval is needed because the message is sent from the customer’s own WhatsApp account.
- Snippets are searchable in the composer and reusable in automations; edits keep a version history.
- We ship **zero pre-written marketing copy**; only an empty starter structure and examples the user can edit.

### 4.4 Sending rules the app enforces (so accounts stay healthy)

- Default mode is **assisted**: the app prepares the message, the customer presses send in their own WhatsApp.
- Auto-send is opt-in, paced (25–45 s), capped (default 120/day), quiet hours 21:00–09:00 IST.
- Opt-out keywords (`STOP`, `UNSUBSCRIBE`, `REMOVE`) auto-tag and suppress.
- Duplicate-send guard (same lead + same message + same day).
- All failures retried with backoff; permanent failures surfaced in the `Failed` tab with the reason.
- Full audit log: who sent what, when, to whom, and in which mode (assisted / auto / manual).

### 4.5 After a lead is scraped — exact flow

```
Run finishes
  → leads stream into the map/table
  → phone backfill adds mobiles + profile data
  → vault saved
  → “New leads ready” card (count, city, category, phone rate)
      ├─ [Open list]        → existing leads view
      ├─ [Message on WhatsApp] → bulk composer
      └─ [Save as segment]  → reusable audience for campaigns
```

Bulk composer steps:
1. Choose audience (all new leads / only with mobile / stage / city / category / rating / tag).
2. Preview the recipient count and the deduplicated phone list.
3. Choose message (free-form inside window, template outside), product, schedule.
4. Optional throttle (e.g. 30 messages/minute).
5. Send → progress with per-recipient status → retry failures.

### 4.6 Product catalogue — user-owned, unlimited

Fields per product: name, type (product/service), description, price, compare-at price, currency, SKU, image(s), video, link, availability, variants (size/colour/plan), category/collection, tax note, payment link, WhatsApp catalog visibility.

- Create/edit/delete/duplicate in a table + form, plus CSV import/export.
- Bulk price update, archive, reorder.
- Collections/tags for quick filtering in the composer.
- Product cards inside chat use the stored data; nothing is generated by us.
- Optional product export/import (CSV, JSON) so the catalogue can be reused elsewhere.

### 4.7 WhatsApp CRM pipeline

- Stages: `New → Contacted → Interested → Quote sent → Negotiating → Won → Lost` (renamable, reorderable).
- Per-lead: owner, deal value, probability, expected close, tags, notes, tasks with due dates, reminders.
- Activity timeline merges scraped events, messages, stage changes and notes.
- Saved views: “Hot Guntur restaurants”, “No reply 48h”, “Won this month”.
- Dashboard widgets: messages sent, reply rate, leads contacted, deals won, response time.

### 4.8 Automations (customer-authored)

| Trigger | Example action |
|---|---|
| Lead added to a segment | Send template T1 after 5 minutes |
| No reply for 48 h | Send follow-up T2 |
| Reply received | Move to `Interested`, notify owner |
| Stage changed | Send quote/product card |
| Keyword in reply (`price`, `demo`) | Tag + assign + send catalog |
| Deal won | Send thank-you + payment link |

Each automation: on/off, audience, delay, quiet hours, daily cap, stop conditions, version history, test-send to self.

### 4.9 Backend design — own-account browser sending (no API key)

**Provider:** the customer’s own WhatsApp, driven through a dedicated browser profile on their PC.

```
┌──────────────────────────────┐
│  waBrowser (Playwright)      │  persistent profile: server/data/wa-profile
│  1. open web.whatsapp.com    │  QR shown in-app → customer scans with phone
│  2. keep session warm        │  session survives restarts (profile on disk)
│  3. open chat by phone       │  search box + contact resolution
│  4. type + attach + send     │  human-like pacing (configurable)
│  5. read new messages        │  MutationObserver → local conversation store
└──────────────┬───────────────┘
               │
     ┌─────────▼─────────┐        fallback (no automation):
     │  waSender queue   │  ───►  wa.me/<phone>?text=...  → opens the chat
     │  retries, pacing  │        in the customer's own WhatsApp app/browser
     └───────────────────┘
```

**Connection flow**
1. Customer clicks `Connect WhatsApp` → a QR appears inside the app.
2. They scan it with their phone (WhatsApp or WhatsApp Business).
3. The app confirms the number and keeps the session in a private browser profile.
4. `Disconnect` wipes the profile; nothing is sent without an active session.

**Sending modes**

| Mode | How it works | Best for |
|---|---|---|
| **Assisted (default, safest)** | App prepares the exact message/product and opens `wa.me` in the customer’s own WhatsApp; the customer presses send | Normal users, low volume, zero ban risk |
| **Auto-send (opt-in)** | App types and sends through the connected WhatsApp Web session at a human pace | Repeat follow-ups, medium volume |
| **Bulk (guarded)** | Queue of messages with 20–60 s randomised spacing, daily caps, quiet hours, duplicate guard; the app stays open | Campaigns to opted-in leads |
| **Manual** | Copy message / open chat / log as sent | Full control |

**Honest limits (shown in the UI, not hidden)**
- There are no official delivery webhooks for an own-account session; status is read from the page when the app is connected (`sent`, `delivered`, `read` when visible) and otherwise shown as `queued/manual`.
- Auto-send requires the desktop app to stay open; scheduled sends run when the app reopens (with a clear “missed schedule” report).
- WhatsApp may restrict accounts that send high volumes of unsolicited messages. The app therefore defaults to assisted mode, requires consent confirmation, and enforces caps.
- We never ask for the customer’s password; the QR session is the only credential, and it can be revoked from their phone at any time.

**Capture of replies**
- A `MutationObserver` on the open chat list records inbound messages, timestamps and unread badges into `wa_conversations` / `wa_messages`.
- The CRM updates the stage and shows the reply in the inbox; nothing leaves the machine.

**New data stores** (`server/data/`)

| Store | Purpose |
|---|---|
| `wa_session.json` | Connected number, profile path, connected-at, mode, caps |
| `wa_snippets.json` | Customer’s own message snippets (no approval needed) |
| `wa_products.json` | Catalogue items, collections, media refs |
| `wa_conversations.json` | Per-lead thread, unread, stage, window/last-inbound |
| `wa_messages.json` | Outbound + inbound messages, status, errors, media |
| `wa_events.json` | Audit log (sends, replies, stage changes) |
| `wa_optouts.json` | Suppression list |

**API surface**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/wa/status` | Session state, connected number, queue depth |
| POST | `/api/wa/connect` | Start QR session, return QR image |
| POST | `/api/wa/disconnect` | Close + wipe session |
| GET/POST/PATCH/DELETE | `/api/wa/templates` | Snippet CRUD |
| GET/POST/PATCH/DELETE | `/api/wa/products` | Catalogue CRUD |
| POST | `/api/wa/products/import` | CSV import |
| GET | `/api/wa/conversations` | Inbox with filters |
| GET | `/api/wa/conversations/:leadId` | Thread + lead snapshot |
| POST | `/api/wa/messages` | Send text/media/product/location via session or wa.me |
| POST | `/api/wa/messages/schedule` | Schedule send |
| POST | `/api/wa/bulk` | Segmented bulk send with pacing |
| GET/POST/PATCH/DELETE | `/api/wa/automations` | Automation CRUD |
| GET | `/api/wa/analytics` | Sent, replied, converted |
| POST | `/api/wa/optout` | Manual suppression |

### 4.10 WhatsApp security, consent and account safety

- Consent is recorded per lead with source and timestamp; bulk sending requires the customer to confirm it, and the confirmation is logged.
- STOP/UNSUBSCRIBE keywords auto-suppress the number permanently until manual re-opt-in.
- Default pacing: 1 message every 25–45 s, max 120/day (configurable), quiet hours 21:00–09:00 IST.
- Duplicate-send guard: same lead + same message + same day is blocked.
- No passwords stored; the QR session can be revoked from the phone at any time.
- The private browser profile lives under the app data folder and is excluded from exports.
- All message content stays on the machine; no third-party analytics.
- The UI clearly marks assisted vs auto-send, so the operator always knows who pressed “send”.

---

## 5. Pure scraped-data drawer (no invented content)

**Rule:** if an engine did not return it, it is not shown as a value.

| Field group | Shown | Source chip |
|---|---|---|
| Identity | Name, category, subcategory, business status | Google Maps / JustDial / IndiaMART |
| Contact | Primary phone, all phones, WhatsApp flag, email(s), website | per field |
| Location | Full address, locality, mandal, district, state, PIN, lat/lng, Maps link | Google Maps / geocoder |
| Hours | Open/closed, day-wise hours | Google Maps |
| Ratings | Rating, review count, recent review snippets | Google Maps |
| Web & social | Website, Instagram, Facebook, LinkedIn, YouTube, X | Website / Maps / dork |
| Media | Logo, photos (URLs) | Google Maps |
| Source | Engine, source URL, first seen, last seen, run id | system |

- Unknown → `Unknown` with a subtle “not returned by any engine” tooltip.
- AI enrichment (if ever enabled) is **opt-in** and shown in a separate “AI suggestions” area, never mixed into scraped fields.
- Each value is traceable: click a source chip → opens the exact page or run log.
- Export (CSV/Excel) uses the same rules: one column per field, all phones joined, provenance columns included.

**Files:** `client/src/v2/LeadDrawer.jsx` (new), `server/src/routes/vendors.js` (provenance payload), export builders.

---

## 6. Scraper and engine plan

### 6.1 Existing engines (keep, correct, measure)

| Engine | What it returns | Auto role | Health signal |
|---|---|---|---|
| Google Maps feed | Name, address, category, rating, reviews, hours, website, coords, sometimes phone | Primary discovery | rows/run, boundary rejects |
| Maps place detail (new pass) | Phone(s), website, address, hours, rating | Phone/profile completeness | phones filled |
| Google Local Finder | 20-result local packs × 5 pages per zone | Secondary discovery | rows/page, CAPTCHA strikes |
| JustDial | City + area listings, phones, ratings, addresses | Phone-rich discovery | rows, captcha |
| IndiaMART | B2B suppliers, products, phones | Product/B2B intents | rows |
| Google SERP | Organic sites + emails/phones from pages | Contact discovery (fix attribution first) | rows |
| Social / DuckDuckGo dork | Instagram/Facebook pages, handles | Social enrichment | rows |
| Brave | Independent index fallback | Optional | rows |
| WeddingBazaar / WeddingWire / Mandap | Wedding vendors | Wedding family only | rows |
| DeepSeek AI | Extraction assist | Optional | rows, key present |
| Scrapy spider | Deep site crawl | Optional | rows |
| OLA Maps geocoder | Coordinates, district/state | Geo accuracy | geocode success |

### 6.2 Proposed new engines (priority order)

**Tier 1 — direct coverage gains**
1. **Google Maps official Places API** (paid key, optional): guaranteed completeness + phone for `nearbysearch`/`details`; used when the user adds a key.
2. **OpenStreetMap Overpass + Nominatim**: free, unlimited locality/venue names for the grid; improves every city and village, no API cost.
3. **Sulekha**: services (plumbers, packers, tutors, astrologers), phone-rich.
4. **Zomato / Swiggy**: restaurants, menus, ratings, phones where public.
5. **Practo**: clinics, doctors, specialties, phones.

**Tier 2 — vertical depth**
6. **99acres / MagicBricks**: real estate agents and projects.
7. **CarDekho / BikeDekho**: auto dealers and service centres.
8. **UrbanPro**: tutors, coaching, hobby classes.
9. **WedMeGood**: wedding vendors (replaces weaker wedding sources).
10. **TradeIndia / ExportersIndia**: B2B suppliers for product searches.

**Tier 3 — enrichment**
11. **Facebook Pages / Instagram business discovery** (respecting robots and rate limits): handles, follower counts, contact buttons.
12. **GST/MCA public directories**: legal name, GSTIN, status for B2B leads.
13. **Yellow Pages India**: legacy businesses with landlines.
14. **Website contact-page crawler** (already present, promote to first-class): emails, phones, address, socials from every lead’s site.

Each new engine ships with: adapter, rate limit, health entry, extraction schema, fixture test, kill switch. Nothing is enabled by default until its health check passes three real runs.

### 6.3 Auto engine planner (revised)

```
intent → family → { discovery[], phone[], enrichment[] }
run:
  discovery  = Maps + Local Finder + family directories
  phone      = JustDial + place-detail pass + website crawler
  enrichment = social dork + SERP (attributed) + vertical source
```

- Manual override chips remain.
- Per-engine budget: max 25 % of the run time; an engine that returns 0 rows twice is demoted to “advisory” for that family.
- Engine board shows: status, last rows, last duration, phone yield, error, and a `Test` button that runs one real query and reports rows.

### 6.4 Coverage policy (all places)

| Scope | Zones |
|---|---|
| City / town | All known localities + real sub-category vectors (biryani, veg, dhaba, …) + coordinate grid over the city **plus a 5 km ring** (2.6 km cells) |
| Village | Village hub + neighbouring villages + mandal centre |
| Mandal | All villages/wards |
| District | All mandals |
| State | All districts + HQ cities + major mandals |
| Unknown place | Geocode → grid + generic sectors (already live) |

Caps: client 32 zones/run, master 120; district/state sweeps chunked and resumable.

---

## 7. Full feature catalogue (scraping side)

**Search**
- Natural-language omnibox with autocorrect, grouped suggestions (brands, products, services, categories; state, district, mandal, city, village, PIN), literal-search row.
- Scope chips: Category × Place × Radius × Engines, all editable.
- Disambiguation for ambiguous names (`Guntur city` vs `Guntur district`).
- Saved searches, scheduled re-runs, alerts on new leads.

**Results**
- Live streaming table + map, confidence badges, phone-valid indicator, duplicate merge.
- Filters: has mobile, has email, has website, rating, reviews, category, source, city, radius.
- Bulk actions: tag, assign, export, push to WhatsApp, delete.
- Folder per run, never overwritten, export CSV/Excel/JSON with provenance.

**Quality**
- Phone validation (libphonenumber), mobile vs landline, WhatsApp readiness.
- Category fidelity guard, containment guard, approximate-coordinate flag.
- Duplicate detection (name + coords + phone), merge with “keep best”.
- Data-quality dashboard: phone rate, email rate, geo-verified rate, duplicates.

**Operations**
- Engine health board, breaker state, queue metrics, memory budget.
- Master: users, notifications, client data import, coverage ledger, sweep preview, learning centre.

---

## 8. Ultra-fast leads plan

| Lever | Change | Expected effect |
|---|---|---|
| Remove duplicate passes | Never run Local Finder + Maps fallback for the same zone (already fixed); grid cells Maps-only | −20 % time |
| HTTP-first | JustDial/IndiaMART/SERP via HTTP where possible; browser only for Maps/LF | −15 % |
| Browser pool | One browser, N contexts, reuse warm pages; pre-warm on app start | −1–2 s engine start |
| Coordinated concurrency | Dynamic 8–12 workers (RAM-based), per-engine token buckets | +2× |
| Stream not batch | Emit leads to UI as each card is parsed (already) | first lead < 5 s |
| Incremental vault | Write JSON every 5 s during the run, not only at the end | crash-safe, perceived speed |
| Zone prioritisation | Dense commercial cells first, then residential; early-stop when a cell returns 0 twice | −10 % |
| Phone pass overlap | Start backfill for finished zones while later zones still run | phones sooner |
| Cache | 7-day cache for unchanged zones; ETag for suggestions; prefetch next city | repeat runs 3× faster |
| Compression | Gzip SSE/API, virtualise long lists | UI stays 60 fps |
| Targets | first lead < 5 s · ≥ 8 leads/s · 500 city leads < 70 s · 0 duplicate phones | measured per release |

---

## 9. UI/UX design system — 3D, motion, plain language

**Goal:** a paying customer who has never used a scraper should understand every
screen in under five seconds, and the app should still feel premium.

### 9.1 Principles

1. **One primary action per screen.** Secondary actions are quieter and grouped.
2. **Plain words first.** “Find leads”, “Send on WhatsApp”, “Products”, “Customers”, “Follow-ups” — technical terms live in tooltips.
3. **Show, don’t tell.** Every state has a visible result: counts, ticks, progress, a row appearing, a phone lighting up.
4. **Never a dead end.** Empty states explain the next step and give the button that does it.
5. **Honest data.** Missing values read `Unknown`, with a quiet “not returned by any engine” note.
6. **Speed is a feature.** Skeletons instead of spinners, rows stream in, no full-page reloads.

### 9.2 Visual language

| Token | Value | Used for |
|---|---|---|
| Surface 0/1/2/3 | `#080b12 / #0d1220 / #121a2b / #17213a` | page, panel, card, raised card |
| Accent | `#38bdf8` cyan | primary action, links |
| Success / warning / danger | `#22c55e / #f59e0b / #ef4444` | health, empty, error |
| Depth shadow | `0 1px 0 rgba(255,255,255,.12) inset, 0 10px 24px -12px rgba(0,0,0,.8)` | cards |
| Press shadow | `0 1px 0 rgba(255,255,255,.08) inset, 0 2px 6px rgba(0,0,0,.5)` | pressed 3D button |
| Radius | 10 / 14 / 20 px | control / card / sheet |
| Motion | 120 ms micro, 180 ms hover, 260 ms panel, 420 ms page | consistent feel |

Dark theme is the default; a light theme uses the same tokens with inverted
surfaces. Contrast is checked to WCAG AA on every text style.

### 9.3 Real 3D buttons (not a flat shadow)

`Button3D` is CSS-only, so it stays crisp at any DPI and costs nothing:

- three stacked layers: **top highlight**, **body gradient**, **bottom edge**;
- `transform: translateY(0)` idle → `-1px` hover → `+2px` press, with the bottom edge shrinking so the button physically “goes down”;
- a soft specular sweep on hover (a moving linear-gradient highlight, transform-only);
- keyboard focus shows a 2 px accent ring plus the same press animation;
- variants: `primary` (cyan), `success` (green), `danger` (red), `ghost`, `icon`;
- loading state swaps the label for a three-dot pulse but keeps the button width, so nothing jumps.

Cards, chips, tabs and toggles share the same elevation tokens, so the whole app
feels like one physical surface instead of mixed styles.

### 9.4 Motion that means something

| Moment | Motion |
|---|---|
| Search accepted | the search bar compresses, the HUD chips lock with a tiny tick |
| Leads arriving | rows slide in 8 px and fade, newest on top, number counts up |
| Phone found by backfill | the phone field flashes lime once and settles |
| Zone complete | its map dot fills, progress bar advances |
| WhatsApp send | bubble rises into the thread, tick moves sent → delivered → read |
| Error | a short horizontal shake (120 ms) and a plain-language message |
| Mascot | reacts to real events only (search, lead found, error) — never loops in the way |

All motion respects `prefers-reduced-motion`; nothing blocks input.

### 9.5 Screen-by-screen clarity

- **Dashboard header:** `Find Leads` (primary), `Folders`, `Map`, `WhatsApp` with unread badge, `Settings`. One row, never wraps at 1280 px.
- **Search:** one big input, then three chips (Service, Location, Engines) that fill in live. A `Find leads` button that is disabled with a reason, never a silent no-op.
- **Results:** table + map side by side; filters as chips with counts; the selected lead opens the pure-data drawer.
- **WhatsApp:** inbox → chat → scraped profile; a green banner says `Connected to +91 …` or an amber one says `Not connected — scan QR`.
- **Products:** a simple list with image, name, price; `Add product` opens a 4-field form first, with “more options” for variants and payment links.
- **Settings:** grouped cards with one-line explanations, no raw JSON.

### 9.6 First-run onboarding

1. **Welcome** — what the app does, in one sentence, with a 20-second silent demo.
2. **Credits** — “You have 1,000 free leads. They never expire.”
3. **Optional WhatsApp** — “Connect your own WhatsApp to message leads later” with `Skip for now`.
4. **First search** — a prefilled example the customer can edit, then `Find leads`.
5. **Coach marks** on the first run only: results, phone filter, WhatsApp button.

Every step is skippable; the app is fully usable without WhatsApp.

### 9.7 Accessibility and quality gates

- 44 × 44 px minimum hit targets; visible focus everywhere.
- Full keyboard path for search, results, drawer and composer; `Esc` closes any sheet.
- ARIA labels on icon buttons; live regions for streaming counts.
- Screen-reader labels for status pills, not colour alone.
- Design review at 1280 / 1440 / 1920 px; no horizontal scroll; 60 fps scroll on 1,000 rows.
- Lighthouse accessibility ≥ 95 on the marketing site and app shell.

### 9.8 Components to build

`client/src/v2/ui/Button3D.jsx`, `Card3D.jsx`, `Chip.jsx`, `Toggle.jsx`,
`Drawer.jsx`, `Toast.jsx`, `Skeleton.jsx`, `EmptyState.jsx`, `StatTile.jsx`,
`ProgressRing.jsx`, plus `client/src/v2/ui/tokens.css` and `motion.css`.
Every screen migrates to these components; no screen keeps its own one-off button.

---

## 10. Files and components

**New (server)**
- `server/src/services/whatsapp/waSession.js` — Playwright profile, QR connect, session health, reconnect
- `server/src/services/whatsapp/waStore.js` — session, snippets, products, conversations, messages
- `server/src/services/whatsapp/waSender.js` — queue, pacing, retries, daily caps, assisted `wa.me` mode
- `server/src/services/whatsapp/waReader.js` — inbound capture, unread badges, delivery ticks
- `server/src/services/whatsapp/waScheduler.js` — scheduled sends and automations
- `server/src/routes/whatsapp.js` — REST surface
- `server/src/services/phoneBackfillService.js` — **already added**
- `server/scripts/probe-viewport.js` — **already added** (coverage QA)

**New (client)**
- `client/src/v2/whatsapp/WhatsAppPage.jsx`
- `client/src/v2/whatsapp/ConversationList.jsx`
- `client/src/v2/whatsapp/ChatThread.jsx`
- `client/src/v2/whatsapp/Composer.jsx`
- `client/src/v2/whatsapp/ProductCatalog.jsx`
- `client/src/v2/whatsapp/TemplateBuilder.jsx`
- `client/src/v2/whatsapp/Automations.jsx`
- `client/src/v2/whatsapp/WaSettings.jsx`
- `client/src/v2/LeadDrawer.jsx` (pure scraped data)

**Modified**
- `client/src/v2/CommandCenter.jsx` — header WhatsApp button, route registration
- `client/src/App.jsx` or router — `/whatsapp`
- `server/index.js` — mount `/api/wa`
- `server/src/routes/vendors.js` — provenance fields
- `server/src/routes/sessionRoutes.js` — exports include all phones + provenance
- `master/src/v2/*` — read-only monitor + client WhatsApp stats

---

## 11. Data model additions

```
wa_session:    { id, displayPhone, profilePath, connectedAt, lastSeenAt, mode, dailyCap, pacing, autoSend }
wa_snippet:   { id, name, language, header, body, footer, buttons, variables[], version, updatedAt }
wa_product:   { id, name, type, description, price, compareAt, currency, sku, images[], video, link,
                paymentLink, variants[], collection, availability, visibleInCatalog }
wa_conversation: { leadId, phone, name, city, stage, owner, tags[], unread, lastMessageAt,
                lastInboundAt, dealValue, notes[], tasks[], updatedAt }
wa_message:   { id, leadId, direction, type, body, media, snippetId, productIds[],
                status, errorReason, sentAt, deliveredAt, readAt, scheduledFor, mode, agent }
wa_automation:{ id, name, enabled, trigger, audience, delay, quietHours, dailyCap, actions[], stopWhen }
```

---

## 12. Delivery phases

| Phase | Scope | Effort | Ships |
|---|---|---|---|
| **P0 (now)** | City grid + 5 km ring coverage, incremental feed capture, phone/profile backfill, pure-data drawer contract | 2–3 days | more leads, more mobiles, honest data |
| **P1** | WhatsApp foundation: QR connect to the customer’s own WhatsApp, inbox, chat, composer (text/media/location), send status, lead deep link | 4–5 days | usable WhatsApp 1:1 |
| **P2** | Products, customer-authored snippets, schedule, bulk segmented send with pacing, opt-out | 4–5 days | selling at scale |
| **P3** | CRM pipeline, notes/tasks/owners, automation builder, analytics | 4–5 days | full CRM |
| **P4** | UI/UX design system, master monitor, voice notes, saved views, A/B copy | 3–4 days | polish |
| **P5** | New engines Tier 1 (Places API, OSM, Sulekha, Zomato, Practo) | 5–7 days | deeper coverage |
| **P6** | Speed pass to targets (HTTP-first, pool, cache, incremental vault) | 3–4 days | ≥ 8 leads/s |
| **P5** | New engines Tier 1 (Places API, OSM, Sulekha, Zomato, Practo) | 5–7 days | deeper coverage |
| **P6** | Speed pass to targets (HTTP-first, pool, cache, incremental vault) | 3–4 days | ≥ 8 leads/s |

Total: ~4–5 weeks for the full programme; each phase is independently shippable.

---

## 13. Acceptance tests

| # | Test | Expected |
|---|---|---|
| 1 | `restaurants in guntur` | ≥ 300 leads, ≥ 75 % with mobile, *Naidu Gari Military Hotel* present with phone |
| 2 | Same for Tenali, Vijayawada, Hyderabad, a tier-3 town | city + 5 km ring zones generated, no out-of-bounds leads |
| 3 | Click any lead | only scraped fields, every value has a source, missing = `Unknown` |
| 4 | Header WhatsApp | opens `/whatsapp` full page |
| 5 | Connect with QR and send free text | message appears in the customer’s own WhatsApp |
| 6 | Disconnect / revoke from phone | app shows “not connected”, sending blocked with a clear message |
| 7 | Create product with image + price + variant | appears in picker and sends as a product card |
| 8 | Save a snippet and reuse it | snippet inserted with variables filled from the lead |
| 9 | Bulk send 50 leads with pacing | per-recipient status, failures retryable |
| 10 | Customer replies STOP | suppressed, no further sends, audit entry |
| 11 | Restart engine mid-queue | queued messages resume, no duplicates |
| 12 | Engine board | each engine shows last rows + duration; 0-row engine turns amber |
| 13 | Speed run | first lead < 5 s, ≥ 8 leads/s on a 500-lead city |
| 14 | Every button and label | readable by a non-technical user; keyboard focus visible; 3D press animation |

---

## 14. Approval checklist (tick what you want)

- [ ] Send from the customer’s own WhatsApp via QR-connected browser session — **no API key**
- [ ] Full-page `/whatsapp` workspace with inbox + chat + scraped profile + catalog
- [ ] User-created products, unlimited, any type (no fixed catalog)
- [ ] User-authored snippets; no pre-written marketing copy
- [ ] Bulk segmented sending with pacing, consent warning + opt-out
- [ ] CRM stages, notes, tasks, owners, automation builder
- [ ] Pure scraped-data drawer (no AI/invented fields)
- [ ] City grid extended by a 5 km ring around every city
- [ ] New engines Tier 1 (Places API, OSM, Sulekha, Zomato, Practo)
- [ ] 3D UI/UX design system for normal, non-technical users
- [ ] Speed targets (first lead < 5 s, ≥ 8 leads/s)
- [ ] Master read-only WhatsApp monitor

Reply with the phases you approve (e.g. “P0–P2 now”) and any lines to remove; implementation starts immediately on the approved block.
