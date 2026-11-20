# Extension · Connectivity · White UI — Implementation Plan

**Status:** proposal, awaiting approval
**Date:** 2026-11-20
**Scope:** browser extension, client ↔ master ↔ server wiring, automatic
extension operation, landing page rebuild, and a true white UI across every
dashboard, command center and folder view.

Read alongside:
- `extension-only-zero-knowledge-deployment-plan.md` (the original promise)
- `docs/scraper.co.in guide.md` (architecture + operations manual)
- `docs/DEPLOYMENT-PLAN.md` (cloud, queues, capacity)
- `docs/COST-MODEL.md` (what the server costs)

---

## 0. What actually exists today

I read every file involved. This is the honest state, not the marketing state.

### 0.1 The extension (`extension/`, 5 files, ~9.6 KB total)

| File | Lines | What it really does |
|---|---|---|
| `manifest.json` | 33 | MV3. Permissions: `storage` only. `host_permissions: <all_urls>`. Content script on `scraper.co.in`, `*.scraper.co.in`, `localhost`, `127.0.0.1`. |
| `background.js` | 84 | Two message handlers: `SCRAPER_EXT_PING` → `{ok, version}`, and `SCRAPER_EXT_EXECUTE_TICKET` → `fetch(targetUrl)` → return `{ok, status, contentType, rawBody}` capped at 750 KB. |
| `contentBridge.js` | 65 | Sets `document.documentElement.dataset.scraperExtension`, answers pings, forwards tickets page → worker → page. |
| `popup.html` / `popup.js` | — | Status panel, RAM tier, "open Command Center". |

It contains **zero selectors, zero parsers, zero geo data** — the zero-knowledge
claim holds. It is also **completely passive**: it never contacts the server on
its own, never polls, and dies when the service worker is evicted.

### 0.2 The server hub (`server/src/services/extensionRelayHub.js`, 304 lines)

Real and reasonably well built:

- `registerHeartbeat()` / `hasActiveExtension()` with a **90 s** TTL
- `requestBlindRelayFetch()` → HMAC-SHA256 ticket, **30 s** TTL, queued per user
- `resolveTicketResult()` → timing-safe signature check, resolves the in-flight promise
- `buildExtensionZipBuffer()` → dependency-free PKZIP of the 5 extension files
- `isExtensionOnlyMode()` → reads `SCRAPER_EXTENSION_ONLY`

Routes in `server/src/routes/scrape.js`:

| Route | Line | Behaviour |
|---|---|---|
| `GET /api/scrape/extension-status` | 2120 | stats + `downloadUrl` |
| `POST /api/scrape/extension-heartbeat` | 2129 | registers, returns up to 4 queued tickets |
| `POST /api/scrape/relay-result` | 2151 | resolves a ticket |
| `GET /api/scrape/extension-download` | 2163 | streams the ZIP |

### 0.3 The client wiring (`client/src/v2/`)

- `utils/deviceRamEngine.js`
  - `detectRamExtension()` (line 390) — ping via `postMessage`, fallback to `dataset`
  - `executeBlindTicketInExtension()` (line 426) — page → worker → result
  - `startBrowserRamAssist()` (line 236) — a **Web Worker that only queries
    Nominatim/OSM**, then posts leads to `/api/scrape/client-ingest`
  - relay poll loop (lines 338–380) — heartbeat every 2.5 s, executes returned
    tickets, posts results back
- `CommandCenter.jsx` (lines 212–245) — detects the extension, polls
  `/extension-status`, sends a heartbeat every 3 s (popup open) or 25 s
- `api.js` (lines 22–23) — attaches `x-scraper-extension` to every request
- `api.js` also has `EXTENSION_DOWNLOAD_URL`

### 0.4 The master app

`master/src/v2/utils/deviceRamEngine.js` **only detects** the extension
(lines 347–372). It never sends a heartbeat, never pulls tickets, never executes
one. Master cannot use the relay at all.

### 0.5 The gap list — ranked by damage

| # | Gap | Consequence | Severity |
|---|---|---|---|
| **G1** | **No engine ever calls `requestBlindRelayFetch()`.** Grep across `server/src` finds only the definition, the export, and the `hasActiveExtension` guard. | Extension-only mode blocks every scrape with `428` and then has **no way to fetch anything**. The feature is currently a locked door with no room behind it. | **Blocker** |
| **G2** | `background.js` uses plain `fetch()`. | Google Maps, JustDial, Local Finder and any JS-rendered page return an empty shell. The relay can never replace the Playwright engines it claims to replace. | **Blocker** |
| **G3** | `CommandCenter.jsx` heartbeat ignores the returned `tickets[]`. | Tickets queue up during idle and expire after 30 s. Wasteful, and makes the connection look broken. | High |
| **G4** | Master has no heartbeat and no ticket loop. | Master sweeps can never be extension-accelerated. | High |
| **G5** | Extension has no self-driven heartbeat (`chrome.alarms`), so it is only "alive" while a Command Center tab is open and polling. | 90 s after the tab closes the server forgets the user; a scrape started in another tab sees `extension_not_connected`. | High |
| **G6** | Identity is the spoofable `x-user-id` header (auth is off in Preview). | A ticket issued to user A can be resolved by a client claiming to be A. No data leak across users, but quota and fairness are unenforceable. | Medium |
| **G7** | No rate/size limit on `/relay-result`; no per-user ticket cap. | A single client can flood the hub. | Medium |
| **G8** | The extension ZIP is built from a server directory that must be baked into the image. | Works locally; in a slim image `EXTENSION_DIR` may not exist and `/extension-download` throws. | Medium |
| **G9** | `landingExecutive.css` is imported by `LandingV2.jsx`, but `landingRetro.css` / `landingWhite.css` still exist. | CSS drift: three landing themes, one imported. | Low |
| **G10** | 125 dark `background:` declarations across the v2 CSS set. | "White UI" is currently `#f8fafc` canvas with many dark slabs left over. | Medium |

The plan below closes all ten.

---

## 1. Target architecture

One sentence: **the server decides what to fetch, the user's browser fetches
it, the server parses it, and every surface knows the connection state in real
time.**

```
                 ┌──────────────────────────────────────────────┐
                 │  server/  (private brain — never shipped)    │
                 │  engines · selectors · 619k gazetteer · AI    │
                 │                                              │
                 │  extensionRelayHub                           │
                 │   ├ ticket queue   (per user)                │
                 │   ├ inflight map   (per ticket)              │
                 │   └ capability router  ← NEW                 │
                 └───────▲───────────────────────┬──────────────┘
                         │ relay-result          │ ticket (HMAC, 30s)
                         │ raw bytes             │ + mode: fetch|render
        ┌────────────────┴───────────┐           │
        │  client / master SPA       │           │
        │  relay agent (shared lib)  │◄──────────┘
        │   ├ heartbeat 10s          │
        │   ├ pull tickets           │
        │   └ postMessage → extension│
        └────────────────┬───────────┘
                         │ window.postMessage
        ┌────────────────▼───────────┐
        │  extension (MV3)           │
        │   ├ fetch mode  (cheap)    │──► OSM, Bing, DDG, directories,
        │   └ render mode (new)      │    websites, Wikidata
        │       hidden tab + settle  │──► Google Maps, JustDial, Local Finder
        └────────────────────────────┘
```

### 1.1 The capability router (closes G1)

New file: `server/src/services/fetchRouter.js`

```js
// One decision point. Every engine asks "can I fetch this?" and gets back a
// function. Nothing else in the codebase knows the extension exists.
async function fetchPage(url, { userId, mode, headers, timeoutMs }) {
  const cap = await resolveCapability(userId);
  // 'relay-render' → extension render mode
  // 'relay-fetch'  → extension fetch mode
  // 'server-browser' → Playwright (only if allowed)
  // 'server-http'    → axios/undici
}
```

Rules:

1. If the user has an active extension and `mode === 'render'` is supported →
   relay render.
2. Else if the user has an active extension and the URL is not JS-gated →
   relay fetch.
3. Else if `SCRAPER_EXTENSION_ONLY` is **not** set → server browser / HTTP.
4. Else → fail fast with a structured `capability_unavailable` error that the
   UI turns into an install card.

This makes `SCRAPER_EXTENSION_ONLY` a **routing preference**, not a hard gate.
The current 428 guard stays, but only fires when the extension is genuinely
required *and* the URL needs rendering.

### 1.2 Engine integration (closes G1, G2)

The engines already funnel through a small number of helpers. Instead of
rewriting 23 parsers, patch the two places every engine uses:

- `server/src/scrapers/browserFactory.js` — add `fetchViaRelay` as an
  alternative transport. When `fetchRouter` returns a relay capability, the
  factory returns a shim that exposes `.goto(url)`, `.content()`, `.text()`
  from the relayed payload instead of launching Chromium.
- `server/src/utils/httpClient.js` (or the axios instance the HTTP engines use)
  — same shim for plain fetches.

Result: **zero parser changes.** `engine-google-places.js` keeps its selectors;
it just receives HTML from a different pipe.

### 1.3 Ticket protocol v2

```jsonc
{
  "ticketId": "tkt_<16 hex>",
  "userId": "usr_...",
  "sessionId": "cmd_...",
  "mode": "fetch" | "render",
  "targetUrl": "https://...",
  "method": "GET",
  "headers": { "accept-language": "en-IN" },
  "timeoutMs": 12000,
  "settleMs": 1500,        // render mode: wait after load
  "maxBytes": 750000,
  "expiresAt": 1795131509953,
  "signature": "<hmac-sha256 hex>"
}
```

Signature covers `ticketId|userId|sessionId|mode|targetUrl|method|expiresAt`.
Binding `sessionId` means a ticket can only be used for the run that asked for
it (closes G6 partially).

`POST /relay-result` gains:

- `Content-Length` cap (1 MB) and `rawBody` length cap
- per-user token bucket: 30 tickets/min, 4 in flight
- reject unknown/expired ticket IDs with `410` (not silently `{matched:false}`)

### 1.4 Relay agent — one shared implementation (closes G3, G4)

New file, copied to both apps: `v2/utils/relayAgent.js`

```js
startRelayAgent({ apiBase, headers, onTicket })
  ├ detect()                 // ping + dataset, 0 ms if present
  ├ heartbeat()              // POST /extension-heartbeat, every 10 s
  ├ execute(tickets[])       // postMessage → extension → POST /relay-result
  ├ backoff                  // 2 s → 4 s → 8 s → 30 s on failure
  └ stop()
```

`CommandCenter.jsx` drops its bespoke loop and calls `startRelayAgent()`.
Master does the same, which fixes G4. The agent is a **singleton per tab** so
two views never double-execute the same ticket.

Tickets returned from heartbeat are always executed — that closes G3.

### 1.5 Extension self-registration (closes G5)

`background.js` gains:

```js
chrome.alarms.create('scraper-heartbeat', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'scraper-heartbeat') return;
  const cfg = await chrome.storage.local.get(['serverBase', 'token']);
  if (!cfg.serverBase) return;
  const res = await fetch(`${cfg.serverBase}/api/scrape/extension-heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ installed: true, version: EXTENSION_VERSION,
                           ramGb, cpuCores, standalone: true })
  });
  const { tickets = [] } = await res.json().catch(() => ({}));
  for (const t of tickets) runTicket(t);
});
```

`serverBase` and `token` are written by the content bridge the first time the
user visits the Command Center, so install → visit → **the extension keeps
itself alive even with no tab open**. `chrome.alarms` survives service-worker
eviction; `setInterval` does not.

> Requires adding `"alarms"` to `permissions`. No new host permission.

### 1.6 Render mode (closes G2 — the important one)

Manifest additions:

```json
"permissions": ["storage", "alarms", "tabs", "scripting"],
"background": { "service_worker": "background.js", "type": "module" }
```

`renderTicket()`:

```js
const tab = await chrome.tabs.create({ url, active: false });
await waitForComplete(tab.id);                  // chrome.tabs.onUpdated
await sleep(ticket.settleMs ?? 1500);           // let the feed paint
const [{ result }] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => document.documentElement.outerHTML
});
await chrome.tabs.remove(tab.id);
return { ok: true, ticketId, status: 200, contentType: 'text/html', rawBody: cap(result) };
```

This is still **zero-knowledge**: the extension returns `outerHTML`, not
parsed records. All selectors stay on the server. It is the only way to get
Google Maps, JustDial and Local Finder through a user's residential IP.

Safety valves:

- hidden tab (`active: false`), closed in a `finally`
- hard timeout 20 s → close tab, return `{ok:false, error:'render_timeout'}`
- one render at a time per tab; `MAX_RENDER_LANES` from RAM tier
  (4 GB → 1, 8 GB → 2, 16 GB+ → 3)
- never render a URL outside `http(s)`

### 1.7 Install and pairing UX

Three states the UI must render honestly:

| State | What the user sees |
|---|---|
| **Not installed** | Card: "Add the RAM Turbo extension (30 s)" → `GET /api/scrape/extension-download`, plus 3-step GIF. |
| **Installed, not paired** | "Extension found — click Connect" → bridge writes `serverBase` + token. |
| **Connected** | Green pill: `RAM TURBO v1.1 · 8 GB · 5 LANES · 12,431 pages relayed`. |

Auto-detect with no refresh: `contentBridge.js` already runs at
`document_start`; the SPA listens for `SCRAPER_EXT_PONG` and flips state.

### 1.8 Security hardening (closes G6, G7, G8)

- Bind tickets to `sessionId` and verify it matches the resolving request.
- Require a real token when `AUTH_REQUIRED=1`; until then, mark relay tickets
  as `preview: true` in stats so the UI can say so.
- Token bucket per user (see 1.3).
- `EXTENSION_DIR` resolution: try `server/../extension`, then
  `process.env.EXTENSION_DIR`, then a baked `/app/extension`. If none exist,
  return `503` with a clear message instead of throwing.
- Add `extension/**` to the Docker build context (see Phase 5).

---

## 2. "Automatic extension" — what that means concretely

Automatic is five separate promises. Each needs its own mechanism.

| Promise | Mechanism | Where |
|---|---|---|
| **Auto-detect** — no refresh after install | content script at `document_start` + `postMessage` handshake | already works |
| **Auto-pair** — no copy-pasting a token | bridge reads `serverBase` from `location.origin`, POSTs `/extension-pair` once, stores token | new |
| **Auto-connect** — survives tab close | `chrome.alarms` 30 s heartbeat, `standalone: true` | new (1.5) |
| **Auto-execute** — no user click per page | heartbeat returns tickets, worker runs them, results posted | partly exists |
| **Auto-recover** — after crash, sleep, network loss | exponential backoff, `chrome.runtime.onStartup`, re-pair on `401` | new |

Explicit non-goals (so nobody is surprised):

- The extension will **not** auto-install. Chrome forbids silent install outside
  enterprise policy. Best case is one click from the Web Store, or "Load
  unpacked" for the ZIP.
- It will **not** read other tabs, passwords, or browsing history. `tabs` is
  used only for the tab it creates itself; that constraint goes in the privacy
  text and the popup.

Optional later (needs a Chrome Web Store listing): `externally_connectable` +
`chrome.webstore.install()` for true one-click from the landing page.

---

## 3. Landing page — rebuild

### 3.1 What's there now

`client/src/v2/LandingV2.jsx` is **69 KB** and imports `landingExecutive.css`.
It is a Game Boy Color console metaphor: `lx-gba-console`, cartridge slot,
screen bezel, D-pad, satellite mini-map, demo pills. Clever, but it reads as a
toy and it buries the two things that actually sell: *11 countries* and
*you get phone numbers*.

### 3.2 New structure (top to bottom)

1. **Nav** — logo once (pin + "S"), 11-flag strip, `Sign in`, primary
   `Open Command Center`.
2. **Hero** — headline **"Search all the leads in your area."** Sub:
   *"Every shop, clinic, studio and service — with phone numbers you can call
   today. 11 countries. No API keys. No per-lead fees."*
   One primary button. One ghost link: *"See how it works"*.
   Right side: a **live lead card stack** (3 real rows, phone badges, quality
   ring) that cycles. No console chrome.
3. **Proof bar** — `619,287 villages · 23 engines · 11 countries · 52 fields
   per lead · Excel in one click`. Plain numbers, monospace.
4. **Three pillars** (replaces the GBC section):
   - *Server brain* — 23 engines, gazetteer, dedup, phone validation. "Runs on
     our servers. Nothing to install."
   - *Your RAM* — RAM tiers 3 / 5 / 8 lanes. "Optional 30-second extension.
     Faster, and your IP does the fetching."
   - *Your data* — Excel, CSV, VCF, folders, CRM. "Your leads leave with you."
5. **Country grid** — 11 cards with flags, admin vocabulary per country
   (State → District → Mandal vs County → City), and one example query each.
6. **How it works** — 3 numbered steps, no animation longer than 400 ms.
7. **Extension section** — honest: what it does, what it never touches, install
   button, connection state.
8. **Pricing / credits** — one line: *1 credit = 1 new lead*. No table unless
   asked.
9. **FAQ** — 6 questions, including "Do you use my IP?", "Is my data shared?",
   "What if the extension is blocked?"
10. **Footer** — brand, legal, status.

### 3.3 Rules

- **White canvas** `#ffffff`, sections separated by `#f8fafc` bands and 1 px
  `#e5e7eb` hairlines. No dark hero.
- One accent: emerald `#059669` → teal `#0d9488` gradient on the wordmark and
  primary buttons only.
- Type: Inter for UI, Outfit for headlines, JetBrains Mono for numbers.
- Max content width 1160 px, 8 px spacing scale, radius 14/20/28.
- Every section must read at 360 px wide with no horizontal scroll.
- Motion: `prefers-reduced-motion` respected; nothing auto-plays longer than 4 s.
- Lighthouse targets: performance ≥ 90, accessibility ≥ 95, CLS < 0.05.

### 3.4 File plan

- New `client/src/v2/landing/LandingV3.jsx` (+ section components in
  `landing/sections/`)
- New `client/src/v2/landing/landingV3.css`
- Keep `LandingV2.jsx` behind a `?landing=v2` flag for one release, then delete
- Copy the whole folder to `master/` and swap the brand accent (emerald → slate-blue)
- Delete `landingRetro.css`, `landingWhite.css`, `landingExecutive.css` after cutover

---

## 4. White UI — every dashboard, command center and folder

### 4.1 Current state

- Canvas is `--w-bg: #f8fafc` (whiteTheme) and `--lx-canvas: #f4f7fb` (designSystem).
  Two competing token sets, both applied, order decides the winner.
- **125 dark `background:` declarations** across `v2.css` (58),
  `landingExecutive.css` (21), `whiteTheme.css` (16), `designSystem.css` (14),
  `login.css` (9), `revamp.css` (4), `glass3d.css` (2), `retroEmboss.css` (1).
  Some are legitimate (map overlay, GBC screen, badges). Most are slabs.

### 4.2 Approach — one token layer, then sweep

**Step 1: collapse to one palette.** New `client/src/v2/theme/tokens.css`,
imported first:

```css
:root {
  /* canvas */
  --ui-canvas: #ffffff;
  --ui-band: #f8fafc;
  --ui-sunken: #f1f5f9;
  /* surfaces */
  --ui-surface: #ffffff;
  --ui-surface-hover: #f8fafc;
  --ui-surface-active: #f1f5f9;
  /* lines */
  --ui-border: #e5e7eb;
  --ui-border-strong: #d1d5db;
  /* text */
  --ui-text: #0f172a;
  --ui-text-muted: #64748b;
  --ui-text-faint: #94a3b8;
  /* accent */
  --ui-accent: #059669;
  --ui-accent-soft: #ecfdf5;
  /* the only places dark is allowed */
  --ui-inverse: #0f172a;   /* map chrome, code blocks, GBC screen */
  /* elevation */
  --ui-shadow-sm: 0 1px 2px rgb(15 23 42 / .06);
  --ui-shadow-md: 0 4px 16px rgb(15 23 42 / .08);
  --ui-shadow-lg: 0 12px 32px rgb(15 23 42 / .10);
}
```

**Step 2: mechanical sweep.** A codemod script
(`scripts/theme/sweep-dark.cjs`) rewrites hard-coded dark backgrounds to tokens
unless the selector is on an allowlist (`map`, `overlay`, `gba-screen`,
`code`, `badge-inverse`). It prints a diff for review; it never writes without
`--apply`.

**Step 3: per-surface checklist.** For each of these, verify:
canvas white · cards white with `--ui-shadow-sm` · hairline borders · no dark
slab except map/overlay · text contrast ≥ 4.5:1.

| Surface | Files |
|---|---|
| Command Center shell | `CommandCenter.jsx`, `v2.css`, `whiteTheme.css` |
| Cockpit | `components/views/InstrumentPanel.jsx`, `ParallelEnginesStatus.jsx` |
| Leads table | `components/views/LeadsTableView.jsx`, `VendorDrawer.jsx` |
| Folders | `components/views/FoldersGridView.jsx`, `TrashModal.jsx` |
| Map | `CommandMap.jsx` (dark chrome **allowed**, panel white) |
| Search console | `SearchConsole.jsx`, `searchConsole.css` |
| Engine board | `EngineStatusBoard.jsx` |
| Login | `LoginV2.jsx`, `login.css` |
| Master sweep | `master/src/v2/...` mirrors |
| Master clients / learning | `MasterClients.jsx`, `LearningCenter.jsx` |

**Step 4: guard.** `scripts/theme/audit-white.cjs` fails CI if a non-allowlisted
selector declares a background with luminance < 0.2. Add it to the build script
so a dark slab cannot sneak back in.

### 4.3 What stays dark (deliberately)

- The satellite map tiles and their chrome
- The extension popup's GBC screen
- Code/JSON blocks in the API docs
- Inverse badges (e.g. `+91` mobile chip) — small, high contrast, intentional

Everything else goes white.

---

## 5. Phases, effort, order

Ordered so each phase is shippable and testable on its own.

| Phase | Work | Files | Effort |
|---|---|---|---|
| **P0** | Relay agent extraction + master heartbeat + execute returned tickets | `v2/utils/relayAgent.js` (new, both apps), `CommandCenter.jsx` ×2 | 1 d |
| **P1** | Extension self-heartbeat (`chrome.alarms`), pairing endpoint, `alarms` permission | `background.js`, `contentBridge.js`, `manifest.json`, `scrape.js` (`POST /extension-pair`) | 1 d |
| **P2** | Render mode (`tabs` + `scripting`, hidden tab, settle, outerHTML) | `background.js`, `manifest.json`, hub (`mode: 'render'`) | 2 d |
| **P3** | Capability router + `browserFactory` relay shim; wire 2 engines first (Google Maps, JustDial), then the rest | `fetchRouter.js` (new), `browserFactory.js`, `queue.js` | 3 d |
| **P4** | Security: session-bound tickets, token bucket, body caps, `EXTENSION_DIR` fallback, `410` semantics | `extensionRelayHub.js`, `security.js` | 1 d |
| **P5** | Landing V3 (10 sections, white, responsive) + master copy | `landing/` (new), `App.jsx` ×2 | 3 d |
| **P6** | White UI token layer + sweep + per-surface checklist | `tokens.css`, `v2.css`, `whiteTheme.css`, `designSystem.css`, views | 3 d |
| **P7** | White UI audit guard in CI | `scripts/theme/audit-white.cjs` | 0.5 d |
| **P8** | Docs: update `DEPLOYMENT-PLAN.md` §extension, `scraper.co.in guide.md` §6, screenshots | docs | 1 d |
| **P9** | Docker: bake `extension/` into the API image; `SCRAPER_EXTENSION_ONLY` documented as a preference | `Dockerfile.server`, `docker-compose.prod.yaml`, `k8s/configmap.yaml` | 0.5 d |

**Total ≈ 16 working days.** P0–P4 make the extension real. P5–P7 make it look
like a product. P8–P9 make it deployable.

### Suggested first cut (what I'd build next if you say go)

P0 + P1 + P4 in one pass — they are small, they remove the "locked door" bug,
and they make the extension honestly report its state. Then P2 + P3, because
render mode is what makes it useful.

---

## 6. Verification — how we prove each claim

| Claim | Test |
|---|---|
| Extension has zero engine logic | `grep -rE "querySelector|selector|regex|village|mandal" extension/` returns nothing meaningful; byte count of `extension/` stays < 12 KB |
| Ticket is single-use and expiring | POST the same `relay-result` twice → second returns `410`; wait 31 s → `410` |
| Signature is enforced | Flip one hex char → `403 invalid_signature` |
| Render mode works | Load unpacked, search "Computer Spas in Guntur" with `SCRAPER_EXTENSION_ONLY=1`, confirm `chrome://extensions` shows a hidden tab opening/closing and leads arrive with server Chromium idle (`SCRAPER_BROWSER_SLOTS=0`) |
| Master can relay | Open `master` with the extension installed → `/extension-status` shows `connected:true` for the master user |
| No tab needed | Close every Scraper tab, wait 60 s, `GET /extension-status` still reports `connected:true` (alarm heartbeat) |
| White UI | `audit-white.cjs` exits 0; screenshot every surface at 1440 and 390 px; no dark region outside the allowlist |
| Landing | Lighthouse ≥ 90 perf / ≥ 95 a11y; no horizontal scroll at 360 px; 11 flags visible above the fold on desktop |
| Both apps in sync | `diff -r client/src/v2/landing master/src/v2/landing` shows only the accent file differing |

---

## 7. Risks and how we handle them

| Risk | Why it matters | Mitigation |
|---|---|---|
| Chrome kills the service worker | Heartbeat stops silently | `chrome.alarms` (survives eviction), plus a 2-tick miss detector in the SPA |
| Render tabs annoy users | Visible tab flash | `active:false`, close in `finally`, cap lanes by RAM tier, never more than 3 |
| Sites detect headless-like behaviour | Maps may still throttle | Residential IP + real Chrome profile is exactly what helps; keep server Playwright as fallback |
| `tabs`/`scripting` looks scary at install | Trust | Permissions text says: "Creates its own hidden tab only when you press Search." Privacy section on the landing page |
| Web Store review | `tabs` + `<all_urls>` triggers manual review | Ship ZIP (Load unpacked) first; submit to the Store in parallel; document the review answers |
| Two relay loops run at once (client + master tabs) | Double execution | Singleton per tab + ticket idempotency (single-use) |
| White sweep breaks contrast | Readability | Tokens enforce `#0f172a` on white; audit checks luminance, not aesthetics |
| Extension-only mode ships before P3 | Users get blocked | Ship the gate **off** by default (`SCRAPER_EXTENSION_ONLY` unset) until P3 lands |

---

## 8. Decisions I need from you

1. **Render mode** — approve `tabs` + `scripting` permissions? Without it the
   extension cannot replace Playwright for Google Maps/JustDial, and
   "extension-only" can never be the default. **Recommended: yes.**
2. **Landing page** — replace the Game Boy console with the 10-section page, or
   keep the console as a *secondary* "How it works" illustration further down?
   **Recommended: replace the hero, keep a small console illustration in section 6.**
3. **White UI** — pure `#ffffff` canvas, or `#ffffff` canvas with `#f8fafc`
   section bands? **Recommended: both — white canvas, faint bands.**
4. **Scope of first build** — P0+P1+P4 only, or push through P0–P4 so the
   extension actually fetches Maps?
5. **Extension distribution** — ZIP only for now, or start the Chrome Web Store
   submission in parallel?

Answer these and I will start with P0.
