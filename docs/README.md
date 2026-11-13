# Gomandap Scraper & Territorial Lead Intelligence

A keyless, ultra-fast, multi-engine commercial lead scraping and enrichment platform tailored for Indian local business intelligence.

---

## 🏛️ 4-Pillar Root Architecture

The codebase strictly adheres to a self-contained 4-pillar root structure:

```
gomandap-scraper/
├── client/     # Client Command Center (Port 5173) - User Workspace, WhatsApp CRM, Maps, Folders
├── master/     # Master Command Center (Port 5174) - Territorial Geo-Sweeps, AI Taxonomy Memory
├── server/     # Express API & Scraping Engines (Port 5002) - 9 Active Harvesters, Orchestrator
└── docs/       # Architecture, API specifications, and operational manuals
```

Each pillar is self-contained:
- Both `client` and `master` include their bundled `@ui3d` visual design system inside `src/ui3d`.
- `server` houses all writable data under `server/data/` and `server/db/`.
- No root bloat, obsolete scripts, or stray logs.

---

## ⚡ Active Scraping Engines

All 9 engines operate with zero API keys and 100% free scraping adapters:

| Engine | File | Description | Target Data |
|---|---|---|---|
| **Google Places** | `server/src/scrapers/engine-google-places.js` | Direct Google Maps place extraction | Name, Phone, Address, Coordinates, Reviews |
| **Local Finder** | `server/src/scrapers/engine-google-serp-local.js` | High-speed SERP local pack harvest | Quick business listings with phone numbers |
| **OpenStreetMap** | `server/src/scrapers/engine-openstreetmap.js` | Keyless Overpass & Nominatim geocoder | Verified commercial POIs and boundary coordinates |
| **JustDial** | `server/src/scrapers/engine-justdial.js` | High-yield Indian directory scraper | Landlines, verified mobiles, categories |
| **SERP Dork** | `server/src/scrapers/engine-google-serp.js` | Google search result crawler | Organic listings, direct contact URLs |
| **Web Contact** | `server/src/scrapers/engine-web-contact.js` | Multi-page crawl (Home, About, Contact) | Verified emails, social media profiles, phones |
| **IndiaMART** | `server/src/scrapers/engine-puppeteer-indiamart.js` | B2B wholesale supplier harvester | Products, catalogs, GST, verified contacts |
| **Weddings** | `engine-weddingbazaar.js`, `engine-weddingwire.js` | Event & venue marketplace scrapers | Banquet halls, decorators, photographers |
| **Social Dork** | `server/src/scrapers/engine-social-dork.js` | DuckDuckGo / Brave dorking crawler | Instagram, Facebook, LinkedIn social intelligence |

---

## 📞 Phone Classification & Rules

Every number is classified by libphonenumber (`libphonenumber-js/max`) through
`server/src/utils/phoneUtils.js` and `client/src/utils/phoneClassify.js`. There is no
`^[6-9]\d{9}$` shortcut: that pattern rejects valid new mobile series and mislabels
fixed-line series that happen to start with 6–9.

1. **STD Landlines**:
   - Preserve the leading `0` (e.g. `0863 223 4444` for Guntur, `040 6677 8899` for Hyderabad).
   - **NEVER** prefix with `+91`.
   - Labelled **Call Only**; WhatsApp links are not generated.
2. **Mobile Numbers**:
   - Only when the parser reports a mobile/fixed-line-or-mobile number that is valid for India.
   - Formatted with the `+91` dialling prefix for calling and WhatsApp (`wa.me/91XXXXXXXXXX`).
   - `isMobile` / `isLandline` / `phoneType` / `whatsappLink` are all derived from that one
     parse by `syncPhoneFlags()`, so an old row cannot disagree with itself.

Exports follow the same rule: **Primary Phone is a validated mobile only**; extra
numbers and landlines go to **Secondary Phone**.
See [DATA-CORRECTNESS.md](./DATA-CORRECTNESS.md) for the rules, the repair script and the
verification commands.

---

## 🚀 Running the Platform

To start the unified development environment:

```bash
# Start Server (5002) and Client (5173)
npm run dev

# Start All (Server 5002, Client 5173, and Master 5174)
npm run dev -- --all
```

To build production bundles:
```bash
npm run build:client   # Builds client/dist
npm run build:master   # Builds master/dist
```

