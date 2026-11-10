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

All parsed phone numbers follow strict Indian telecom classification:
1. **STD Landlines**:
   - Must preserve the leading `0` (e.g. `08632233444` for Guntur, `04066778899` for Hyderabad).
   - **NEVER** prefix with `+91`.
   - Labeled as **Call Only**; WhatsApp buttons are disabled.
2. **Mobile Numbers**:
   - 10-digit Indian mobile numbers beginning with 6, 7, 8, or 9.
   - Formatted with `+91` international dialing prefix for calling and WhatsApp quick chat (`wa.me/91XXXXXXXXXX`).

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

