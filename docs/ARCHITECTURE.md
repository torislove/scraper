# Scraper.co.in — Core Architecture & Polyglot Fleet

## Overview
Scraper.co.in is an ultra-fast, minimalist, and memory-efficient local business lead harvesting platform. It replaces heavy, bloated Chromium-based crawlers (Playwright/Puppeteer/Crawlee) that eat 300MB–2GB+ of RAM with an ultra-low RAM (< 150MB total) **polyglot engine fleet**.

---

## 1. Zero-Chromium Polyglot Fleet

| Engine | Technology | Role & Target Sources | RAM Usage | Speed |
| :--- | :--- | :--- | :--- | :--- |
| **`gosom`** | Native Go Binary (`server/bin/google_maps_scraper.exe`) | Primary Google Maps business leads + fast-mode geo coordinate sweeps. No Google Maps API keys required. | ~50 MB | Very Fast (~120 places/min) |
| **`tlsSidecar`** | Python Microservice (`primp` + `curl_cffi` on port 5003) | Bypasses Cloudflare JA3/TLS bot checks without a browser. Targets directories: Justdial (IN), YellowPages (US), PagesJaunes (FR), Yell (UK). | ~20 MB | Blazing Fast (HTTP/2 TLS spoofing) |
| **`lightpanda`** | Zig Binary (`server/bin/lightpanda` via WSL) | Drop-in JS-rendering replacement for Chromium. Exposes standard CDP on port 9222 for dynamic client-rendered web pages. | ~50 MB | 9x faster than Chromium, 16x less RAM |
| **`contactExtractor`** | Pure Node HTTP + TLS Sidecar | In-flight deep website crawler extracting verified 10-digit Indian mobiles (`+91 9/8/7/6XXXXXXXX`), WhatsApp direct links (`wa.me/91...`), business emails, and social profiles (Instagram, Facebook, LinkedIn). | ~10 MB | Sub-second per domain |

---

## 2. Server Modules Structure

The entire backend resides in `server/`:

```text
server/
├── bin/
│   ├── google_maps_scraper.exe        # Standalone Go binary (Google Maps + Emails) [62.5MB]
│   └── lightpanda                     # Standalone Zig binary (JS headless browser) [78MB]
├── python/
│   └── tls_engine.py                  # Single Python microservice (primp + curl_cffi) [port 5003]
├── src/
│   ├── orchestrator.js                # Polyglot coordinator (Go, Python, LP, Contacts)
│   ├── auth.js                        # Production JWT, session & user registry
│   ├── geo.js                         # Ward & zone resolver with strict boundary purity
│   ├── taxonomy.js                    # Localized subcategories & query expansion
│   ├── store.js                       # In-memory journal database with CSV export
│   ├── sse.js                         # Real-time Server-Sent Events broadcaster
│   └── engines/                       # Polyglot wrappers
│       ├── gosom/index.js             # Go Google Maps binary runner
│       ├── tlsSidecar/index.js        # Python TLS microservice client
│       ├── lightpanda/index.js        # Zig headless browser runner
│       ├── contactExtractor/index.js  # Pure HTTP deep contact extractor
│       ├── socialDork/index.js        # Pure HTTP DuckDuckGo social profile dorks
│       └── contract.js                # Canonical lead schema & normalizer
├── server.js                          # Express HTTP API & SSE endpoints (~200 lines)
├── index.js                           # Root entrypoint delegating to server.js
└── package.json                       # 4 lean dependencies (express, cors, dotenv, libphonenumber-js)
```

---

## 3. Geographic Purity & Municipal Boundaries (`server/src/geo.js`)
To guarantee high-quality leads, the geo resolver enforces strict municipal boundaries:
- **Guntur City (IN)**: 15 core zones/wards (Brodipet, Arundelpet, Lakshmipuram, Kothapet, Collectorate, Gujjanagundla, Pattabhipuram, etc.).
  - Rejection terms: `mumbai`, `maharashtra`, `mangalagiri`, `tenali`, `vijayawada`, `hyderabad`.
  - Lat/Lng bounding box: 16.22°N – 16.38°N, 80.36°E – 80.52°E.
- **Other Cities**: Bangalore, Mumbai, Dallas, London, Paris, Lyon.
- Any harvested place whose address or coordinates fall outside the target municipal boundary is rejected before reaching the user.

---

## 4. In-Flight Contact Enrichment Pipeline
Every business discovered is normalized and enriched in real time:
1. **Primary Phone**: Formatted via `libphonenumber-js` into E.164 and national format.
2. **Verified Mobile**: Validated 10-digit mobile (`+91 [6-9]XXXXXXXX` for India).
3. **WhatsApp Link**: Generated direct click-to-chat URL (`https://wa.me/91...`).
4. **Digital Presence**: Website URL, verified business emails (crawled from home and contact pages), and verified Instagram, Facebook, and LinkedIn profiles.
