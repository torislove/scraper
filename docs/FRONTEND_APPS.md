# Scraper.co.in — Frontend Applications Guide

## Overview
The platform includes three distinct, high-performance web applications built on **React 19, Vite, and TailwindCSS**:

1. **Client Scraper (`http://localhost:5173`)**: Domestic Indian leads command center.
2. **Master Scraper (`http://localhost:5174`)**: International lead harvester supporting 11 sovereign countries.
3. **Admin Dashboard (`http://localhost:5175`)**: Central management panel for users, data vault, metrics, and configuration.

---

## 1. Client Scraper (:5173)

### Core Features:
- **Command Center (`/command`)**:
  - Live query input, city picker, and category suggestion engine.
  - Real-time Server-Sent Events (SSE) streaming lead cards.
  - Live animated zone pulse indicator and progress ticker.
- **Leads Table & Data Vault**:
  - Full-featured data table with search, mobile filter, and WhatsApp badges.
  - Detailed Vendor Drawer showing business hours, ratings, direct WhatsApp chat, and social links.
  - Instant One-Click CSV Export.
- **Authentication**:
  - Sign in, Sign up, and Password Reset (`/login`, `/signup`).
  - Pre-seeded admin account: `admin@scraper.co.in` / `admin123`.

---

## 2. Master Scraper (:5174)

### Core Features:
- **Multi-Country Support (11 Sovereign Nations)**:
  - India (`IN`), United States (`US`), United Kingdom (`GB`), France (`FR`), Germany (`DE`), Canada (`CA`), Australia (`AU`), United Arab Emirates (`AE`), Singapore (`SG`), New Zealand (`NZ`), Ireland (`IE`).
- **Localized Subcategory Expansion**:
  - Expands broad categories into native trade subcategories (e.g. "boulangerie" in France, "solicitors" in UK, "HVAC" in US).
- **International Phone Formatting**:
  - E.164 compliant parsing for all supported countries.

---

## 3. Admin Dashboard (:5175)

### Views:
- **Overview (`/`)**:
  - Real-time statistics: total leads harvested, active sweep sessions, registered customer accounts, server RAM usage, and uptime.
- **Clients (`/clients`)**:
  - Customer account management: view registered users, allocate credits, change plans (Starter, Pro, Enterprise), and reset access tokens.
- **Data Vault (`/vault`)**:
  - Universal database inspector with full-text search, country filtering, and lead purging.
- **Country Metrics (`/metrics`)**:
  - Visual breakdown of lead distributions across nations.
- **Popup Studio (`/popups`)**:
  - Configure promotional banners and in-app announcements.

---

## 4. Unified Authentication & Credentials

All three applications authenticate against the central server (`http://localhost:5002`):

| Account | Email | Password | Role | Plan | Credits |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@scraper.co.in` | `admin123` | `admin` | Enterprise | Unlimited (999,999) |
| **Demo User** | `demo@scraper.co.in` | `demo123` | `user` | Pro | 50,000 |
