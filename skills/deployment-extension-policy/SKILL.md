---
name: deployment-extension-policy
description: Strict governance for pre-deployment local server testing vs. post-deployment browser-extension-only execution.
---

# Deployment & Compute Mode Governance Policy

## 1. Pre-Deployment Phase (Active Development & Local Testing)
- **Status:** CURRENT STATE
- **Policy:** The application MUST allow running on the **local server engine** so the user and team can freely test all 22 engines, scraping pipelines, UI components, and API relays on `http://localhost:*` without being blocked.
- **Extension Integration:** The browser extension auto-pairs if loaded, but if not loaded, the application must NEVER block the user—it allows seamless testing on the local backend engine.
- **Do NOT Force Extension-Only Mode:** Never restrict local testing to extension-only until the explicit deployment trigger is received.

---

## 2. Production Deployment Trigger (User Explicit Announcement)
- **Trigger:** ONLY when the user explicitly informs:
  > *"I have deployed"* / *"We are deployed"* / *"Deployed to production"*
- **Action upon trigger:**
  1. Lock compute mode strictly to `COMPUTE_MODE=extension_only`.
  2. Disable cloud server Chromium and Playwright scraping instances.
  3. Enforce 100% client-hardware driven residential scraping via the installed browser extension (Edge, Chrome, Firefox).
  4. The cloud server acts strictly as a lightweight JSON coordinate relay (< 50MB RAM).

---

## 3. Core Mandate
Never assume production deployment has occurred until the user explicitly states it. Keep local server execution fully functional for testing at all times.
