# Privacy Policy — Scraper.co.in & RAM Turbo Extension

**Effective Date:** November 2026  
**Product:** Scraper.co.in — RAM Turbo Browser Extension  
**Developer:** Scraper.co.in Team (`torislove`)  
**Contact:** `privacy@scraper.co.in` / `support@scraper.co.in`

---

## 1. Core Commitment: Zero-Knowledge Client Architecture
The **Scraper.co.in — RAM Turbo** browser extension is engineered from the ground up as a zero-knowledge residential edge companion. It does not track, collect, store, or sell any personal data, browsing history, user credentials, or passwords.

---

## 2. What Data the Extension Processes
The extension processes **only public web information** explicitly requested during an active user scraping session:
- **Public Business Data:** Commercial enterprise names, physical business addresses, postal codes, and geocoordinates.
- **Public Contact Details:** Publicly listed business phone numbers, WhatsApp contacts, and official corporate domains.
- **Public Ratings:** Aggregate star ratings, review counts, and public social media profile handles (Instagram, LinkedIn, X, Facebook).

**What We NEVER Process or Access:**
- We **never** access your personal tabs, browsing history, or bookmarks.
- We **never** access personal communications, emails, or messages.
- We **never** collect passwords, credit cards, or payment details.
- We **never** read third-party website cookies (`credentials: 'omit'` is enforced on all network requests).

---

## 3. Data Storage & Local Persistence
- The extension uses `chrome.storage.local` strictly on your own device to remember:
  1. The server connection base URL (`http://localhost:5002` or production app).
  2. The local workspace pairing ID.
  3. The count of public pages relayed during your session.
- No personal user identifiers or page contents are transmitted to external marketing, analytics, or advertising trackers.

---

## 4. Hardware Telemetry & Allocation
- The extension queries `chrome.system.memory` and `chrome.system.cpu` strictly to calculate safe concurrency lanes (e.g. 4 to 16 lanes based on available RAM).
- Hardware data is never stored on external databases or used for user profiling or fingerprinting.

---

## 5. Security & Remote Code Policy
- **Zero Remote Code:** All JavaScript, HTML, and assets are 100% bundled within the extension package.
- The extension never loads scripts dynamically from external servers (`eval`, `new Function`, and remote script injection are strictly prohibited).
- All network communications utilize encrypted TLS/HTTPS channels.

---

## 6. GDPR, CCPA & DPDP Compliance
- **Legitimate Interest:** Public business contact details are processed under the lawful basis of legitimate commercial interest for B2B discovery and directory indexing (Article 6(1)(f) of GDPR).
- **Opt-Out / Delisting:** Any business owner or authorized representative can request delisting or updating of their public business record by contacting `privacy@scraper.co.in`. Verified delisting requests are processed within 48 hours.

---

## 7. Contact Information
For privacy inquiries, audit requests, or delisting notices:
- **Email:** `privacy@scraper.co.in`
- **Repository:** https://github.com/torislove/scraper
