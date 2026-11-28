---
name: frontend-architecture-and-dry
description: Explains the distinct roles of Client, Master, and Admin frontends, DRY deduplication rules, and hook decomposition.
---

# Frontend Architecture, Edition Roles & DRY Deduplication Standard

## 1. Frontend Editions: What is Client, Master, and Admin?

Our frontend ecosystem is partitioned into three purposeful, dedicated applications running concurrently:

### A. The Client Edition (`client` on Port `5173`)
- **Target Audience**: Growth teams, sales development reps (SDRs), digital marketing agencies, and local business owners.
- **Purpose**: Rapid, high-velocity targeted lead harvesting and instant outreach.
- **Key Capabilities**:
  - Direct category and city search bar with real-time query suggestions.
  - Live Server-Sent Events (SSE) telemetry ribbon showing leads streaming in real-time.
  - Interactive Leads Table with instant filters: **Mobile Only**, **WhatsApp Ready**, **Has Website**, **Rating**, and keyword search.
  - 1-Click WhatsApp click-to-chat integration (`https://wa.me/...`) and instant click-to-call (`tel:...`).
  - Single-click CSV and VCF contact catalog downloads.
  - Session Manager to load and resume past scrape sweeps.

### B. The Master Edition (`master` on Port `5174`)
- **Target Audience**: Global enterprises, multinational sales organizations, and institutional growth leaders operating across sovereign borders.
- **Purpose**: Sovereign cross-border multi-country intelligence and localized taxonomy sweeps.
- **Key Capabilities**:
  - **11 Sovereign Market Coverage**: Interactive 3D Country Flag Strip for instant switching across India (`IN`), United States (`US`), United Kingdom (`GB`), Canada (`CA`), Australia (`AU`), UAE (`AE`), Singapore (`SG`), New Zealand (`NZ`), South Africa (`ZA`), Ireland (`IE`), and Germany (`DE`).
  - **100% DRY Re-Export Architecture**: Rather than maintaining a divergent 20,000-line codebase, `master` directly re-exports shared components, hooks, and utilities from `client` (`CommandCenter.jsx`, `VendorDrawer.jsx`, `FilterBar.jsx`, `countries.js`).
  - Zero duplicate maintenance overhead — fixes to client instantly benefit Master.

### C. The Admin Console (`admin` on Port `5175`)
- **Target Audience**: System administrators, platform operators, and superusers.
- **Purpose**: Centralized operational observability, user licensing, and lead database management.
- **Key Capabilities**:
  - **Real-Time Operational Overview**: Live server RAM usage, uptime, total registered clients, active SSE connections, and total database leads.
  - **Client Licensing & Management**: View registered enterprise accounts, reset license keys, create new client credentials, and adjust subscription plans.
  - **Data Vault Manager**: Search, filter, inspect, and export all leads stored in the central journal.

---

## 2. Zero Monolithic Components Rule

- **Max Lines per File**: Coordinator components must remain strictly under **150–250 lines**.
- Complex dashboards must be decomposed into 3 clean layers:
  1. **Custom Hook**: Encapsulates state, event streams, and background timers (`useSweepStream.js`, `useLeadsVault.js`).
  2. **Presentational Subcomponents**: Focused UI pieces under 150 lines (`CommandBar.jsx`, `MetricCard.jsx`, `FilterBar.jsx`).
  3. **Coordinator View**: Binds hooks and presentational subcomponents without inline business logic (`CommandCenter.jsx`).

---

## 3. DRY Deduplication Standard

- **Never duplicate code between `client` and `master`.**
- When Master needs a component that exists in Client:
  ```javascript
  // Correct DRY re-export pattern in master
  export { default } from '../../../client/src/v2/CommandCenter.jsx';
  export * from '../../../client/src/v2/CommandCenter.jsx';
  ```
- Keep all country datasets, phone classifiers, and API client methods in a single source of truth.

---

## 4. Universal Authentication & Communication

- Both Client (`:5173`) and Master (`:5174`) connect to the central Express backend (`:5002`).
- Communication channels:
  - **REST API**: `/api/scrape/start`, `/api/scrape/stop`, `/api/vendors`, `/api/sessions`.
  - **Live SSE Stream**: `/api/logs/stream` delivering `vendor`, `progress`, `activePoint`, and `status` frames.
  - **Auth**: Token-based authentication via `server/src/auth.js` (`/api/auth/login`, `/api/auth/me`).
