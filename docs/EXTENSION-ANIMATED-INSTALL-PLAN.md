# Scraper.co.in — RAM Turbo Extension: Architecture, Chrome Web Store Roadmap & Animated Installation Plan

**Document Version:** 1.2.0  
**Target:** Local Development (`localhost:5173` / `:5174` / `:5002`) & Production Deployment (`https://scraper.co.in`)  
**Status:** Approved & Implemented  

---

## 1. Executive Summary & Google Web Store vs Local Server Clarification

### User Question:
> *"Why shouldn't we add this to Google browser extensions and for free? And why does it say checking/detecting and freeze? And unlocking zip users gets confused what is the installation file... make it much easier and connect it to command center."*

### Key Answers:

1. **Free for Users on Chrome Web Store**:
   - **Yes, the extension is 100% free for all users to install with one click from the Chrome Web Store and Microsoft Edge Add-ons.**
   - There are zero charges for users to download or run the extension.

2. **Google Developer Registration & Domain Requirement**:
   - Google charges publishers a one-time **$5 USD verification fee** to open a Chrome Web Store developer account (Microsoft Edge Store is $0).
   - Chrome Web Store policies require a **public HTTPS production domain** (e.g., `https://scraper.co.in`), verified domain ownership via Google Search Console, and a public Privacy Policy URL.
   - During local development on `http://localhost:5173` and backend `http://localhost:5002`, Google Web Store cannot host an extension configured for private local ports without requiring a re-submission for every code change.
   - Therefore, the industry-standard workflow is:
     - **Phase 1 (Current Local Testing)**: Run seamlessly via Chrome's native **"Developer mode → Load unpacked"** (or 1-click batch launcher `scripts/launch-chrome-with-extension.bat`).
     - **Phase 2 (Production Launch)**: When you are ready for deployment, we submit the packaged extension to the Chrome Web Store using the ready-made `extension/STORE-LISTING.md`. Once published, the web app automatically switches from ZIP download to the one-click **"Add to Chrome"** Web Store button via `VITE_EXTENSION_STORE_URL`.

3. **Why It Froze on "Checking…" / "Detecting…"**:
   - In Manifest V3 service workers, `navigator.deviceMemory` is often undefined and capped at 8 GB in Chrome.
   - The background worker previously lacked the `"system.memory"` and `"system.cpu"` permissions, so it could not read exact physical RAM or CPU logical cores.
   - Furthermore, `popup.js` had no hard timeout or instant fallback, so if opened from a file (`file://`) or if the service worker was sleeping, it remained frozen on "Checking…".
   - **The Fix**: We added `"system.memory"` and `"system.cpu"` to `manifest.json`, created an instant fallback renderer in `popup.js`, added `hydrateHardware()` in `background.js`, and removed all static "Checking…" text from `popup.html`.

4. **Why Unzipping Confused Users & How We Fixed It**:
   - Previously, unzipping the archive dumped `manifest.json`, `background.js`, and icons directly into the root folder. Users opening WinRAR/Explorer saw `manifest.json` and wondered *"Which file do I double-click to install?"*.
   - **The Zero-Confusion Fix**:
     - All files in the ZIP now live inside a single root folder: `📁 Scraper-RAM-Turbo-Extension/`.
     - Right inside that folder is `HOW-TO-INSTALL.txt` with 3 plain instructions.
     - On localhost, the modal provides a **"📋 Copy Local Folder Path"** pill (`c:\Users\manoj\Desktop\gomandap-scraper\extension`) so users can literally paste the path into Chrome's folder picker dialog.
     - A 1-click Windows batch launcher `scripts/launch-chrome-with-extension.bat` is provided to launch Chrome with the extension preloaded and open `http://localhost:5173/command` automatically.
     - The web app displays an interactive animated setup wizard (`ExtensionGatewayModal.jsx`) showing the exact 3 steps with animated Developer Mode toggles and folder highlights.

---

## 2. Real Hardware Detection Architecture

```
┌────────────────────────────────────────────────────────┐
│ Chrome Browser MV3 Extension                           │
│                                                        │
│  chrome.system.memory.getInfo()                        │
│    ├── capacity          → Exact Total RAM (e.g. 16 GB)│
│    └── availableCapacity → Free RAM (e.g. 9 GB free)   │
│                                                        │
│  chrome.system.cpu.getInfo()                           │
│    ├── numOfProcessors   → CPU Logical Cores (e.g. 12) │
│    └── modelName         → CPU Model Architecture      │
│                                                        │
│  Fallback: navigator.deviceMemory + hardwareConcurrency│
└──────────────────────────┬─────────────────────────────┘
                           │
             window.postMessage / Heartbeat
                           ▼
┌────────────────────────────────────────────────────────┐
│ Web Application (CommandCenter.jsx & ExtensionContext) │
│                                                        │
│  Lanes Dynamic Formula:                                │
│    RAM >= 16 GB → 8 Parallel Engine Lanes              │
│    RAM >=  8 GB → 5 Parallel Engine Lanes              │
│    RAM >=  4 GB → 3 Parallel Engine Lanes              │
│    RAM <   4 GB → 1 Conservative Lane                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Animated Setup Wizard Design (`ExtensionGatewayModal.jsx`)

The modal uses Framer Motion spring physics with Crystal Ceramic 3D glass aesthetics:

1. **Step 1: Download & Unpack**:
   - Animated folder icon bouncing into `📁 Scraper-RAM-Turbo-Extension`.
   - Clear text: *"Keep the whole folder intact. Do NOT double-click manifest.json."*
   - Direct download button + **"📋 Copy Folder Path"** button for instant Windows file picker pasting.

2. **Step 2: Open Extensions in Chrome**:
   - Animated address bar typing `chrome://extensions`.
   - 1-click **"Copy URL"** button with checkmark animation.

3. **Step 3: Toggle Developer Mode & Load Unpacked**:
   - Animated interactive toggle switch showing Developer Mode flipping ON with emerald glow.
   - Visual pointer highlighting **"Load unpacked"** and selecting the `Scraper-RAM-Turbo-Extension` folder.

4. **Real-Time Detection & Auto-Transition**:
   - Pulsing emerald radar ring actively listening for `SCRAPER_RAM_EXTENSION` event.
   - The instant the user clicks the folder in Chrome, `contentBridge.js` fires `SCRAPER_EXT_PONG`.
   - Modal transforms into a celebratory green card: `✓ RAM Turbo Active (v1.2.0)` displaying real RAM & CPU cores, and auto-forwards to the Command Center workspace.

---

## 4. Command Center Connection & Top Setup Banner

1. **Top Setup Banner in `CommandCenter.jsx`**:
   - If `!extReady`, an animated top banner appears right under the navigation bar:
     - Live pulse badge.
     - *"Connect RAM Turbo Extension (1.2.0): Route 20+ engines directly through your machine's IP & RAM with zero server queues."*
     - Button: **"⚡ Connect in 30s"** (opens the animated modal).
     - Dismiss button so it never obstructs the user.

2. **Search Pre-Check**:
   - When clicking "Find Leads" / "START RUN", if the extension is required and disconnected, it automatically opens `ensureConnected()`, guiding the user through setup.

---

## 5. Clean Crystal Ceramic Theme Migration

- Removed legacy `#050507` / `#0c0c1a` dark backgrounds and violet `rgba(124,58,237,...)` glows from `client/src/index.css` and `master/src/index.css`.
- Replaced with light Crystal Ceramic `#ffffff` / `#f8fafc` surfaces, `#0f172a` typography, and Emerald `#059669` / Teal `#0891b2` accents.

---

## 6. Verification Checklist

- [x] Extension manifest bumped to 1.2.0 with `"system.memory"`, `"system.cpu"`, and `"tabs"`.
- [x] Popup renders real hardware instantly without freezing on "Checking…" / "Detecting…".
- [x] ZIP archive packages inside single folder `Scraper-RAM-Turbo-Extension/` with `HOW-TO-INSTALL.txt`.
- [x] 1-click Windows batch launcher `scripts/launch-chrome-with-extension.bat` created.
- [x] Animated 3-step setup wizard with Developer Mode toggle animation & copy folder path implemented in `ExtensionGatewayModal.jsx`.
- [x] Top setup banner added to `CommandCenter.jsx`.
- [x] Dark `#050507` and violet rules cleaned from `index.css`.
- [x] All 3 verification test suites pass (relay-hub, search-intelligence, stream-audience).
- [x] Client and Master production builds exit with code 0.
