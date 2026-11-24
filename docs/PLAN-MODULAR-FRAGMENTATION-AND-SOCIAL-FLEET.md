# Master Implementation Plan: Fine-Grained Modular Fragmentation & High-Yield Social Engines Fleet

> **Mission**: 
> 1. Fragment the monolithic architectures of `universalGeoCluster.js` (2,733 lines) and `indiaTradeIntelligence.js` (2,035 lines) into **fine-grained, specific, independent files** (individual country subvector files, dedicated commodity files, distinct city cluster files, and isolated coordinate indices) united by seamless facade modules that preserve 100% backward compatibility.
> 2. Detail and integrate all **live working social media engines** (Instagram, Facebook, TikTok, Twitter/X, LinkedIn) with multi-engine failover, stealth OpenGraph parsing, and dynamic country phone extraction.
> 3. Complete all remaining fleet tasks: Orchestrator multi-stage progress reporting and ETA accuracy, real-time UI surfacing in Client & Master consoles, and comprehensive verification test suites.

---

## 1. Fine-Grained File Fragmentation Architecture

- **Taxonomy Directory**: `server/src/utils/taxonomy/`
  - `commodities/` (`mandis.js`, `spices.js`, `agro.js`, `metals.js`, `index.js`)
  - `niches/` (`legal.js`, `weddings.js`, `healthcare.js`, `trades.js`, `food.js`, `index.js`)
  - `international/` (`us.js`, `gb.js`, `ca.js`, `au.js`, `ae.js`, `de.js`, `fr.js`, `sg.js`, `nz.js`, `ie.js`, `index.js`)
  - `brandIntel.js`, `dedupLogic.js`, `index.js`
- **Geo-Cluster Directory**: `server/src/utils/geo/`
  - `clusters/` (`india.js`, `international.js`)
  - `coordinates.js`, `subvectors.js`, `villageIndexer.js`, `resolvers.js`, `index.js`
- **Backward Compatibility**: `indiaTradeIntelligence.js` and `universalGeoCluster.js` re-export their respective directories as transparent facades. Zero breaking changes.

---

## 2. Working Social Media Engines Inventory

- **Instagram**: Playwright stealth modal dismissal + OpenGraph fallback + hashtag scanner (`socialMediaScraper.js` / `engine-social-dork.js`).
- **Facebook**: Public directory scanner + OpenGraph crawler (`facebookexternalhit/1.1`) + contact extraction (`socialMediaScraper.js` / `engine-social-dork.js`).
- **TikTok**: OpenGraph metadata crawler (`crawlTikTokViaOpenGraph`) with Cheerio + clean hashtag scanner. Active in US/UK/CA/AU/AE/DE/FR; strictly bypassed in India.
- **Twitter / X**: Adding `crawlTwitterOrXViaOpenGraph` for `@handle`, bio description, phone numbers, and follower metrics.
- **LinkedIn**: Dorking engine in `engine-social-dork-intl.js` parsing public company snippets.

---

## 3. Remaining Fleet Tasks

1. **Quad-Channel Social Dorking**: Fix GB case, clean TikTok tag slugs, DuckDuckGo failover, and dynamic country phone regex.
2. **Orchestrator Stage Transparency**: Multi-stage progress logging (Geo Grid $\rightarrow$ Deep Social Discovery) with accurate remaining ETA.
3. **UI Table & Drawer Surfacing**: Live badges for Instagram, Facebook, TikTok, X, and WhatsApp in `LeadsTableView.jsx` and CSV export.
4. **Verification**: Comprehensive automated test scripts and production frontend builds.
