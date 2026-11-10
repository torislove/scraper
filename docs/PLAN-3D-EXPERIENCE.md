# Master Plan — 3D Experience Overhaul

**Scope:** landing page · client dashboard · master dashboard
**Status:** proposed — no app code has been changed
**Author:** engineering
**Date:** 2026-11-06

---

## 0. One-paragraph summary

We keep every byte of business logic exactly as it is today (search, sweeps, credits,
Phase 3 carry-forward, export, CRM, WhatsApp links, Arabic/Hindi labelling, offline
behaviour) and replace the **visual shell** with a single, shared, physically-lit 3D
design system. The result should feel like a ₹1-crore product site: real depth, real
materials, pointer-reactive surfaces, a live WebGL scene in the hero, and a cockpit
that looks engineered rather than decorated. The work is delivered in 8 gated phases;
each phase ends with a production build of **both** apps and a feature regression pass,
so the product is never half-broken.

---

## 1. Non-negotiables (the contract for this project)

| # | Rule | Why |
|---|------|-----|
| 1 | **Zero business-logic changes.** No edits to `server/src/**`, no changes to fetching, dedupe, containment, credits, carry-forward, or export columns. | The feature work of the last phases must not regress. |
| 2 | **Offline-first.** No CDN, no Google Fonts, no Unsplash, no remote textures. All art is local SVG/CSS/procedural geometry. | The Windows desktop build has no guaranteed internet on first paint. |
| 3 | **Tiered rendering.** WebGL is an enhancement, never a requirement. Tier `off` must still look premium (CSS-3D only). | Old Intel iGPUs, RDP sessions, and reduced-motion users. |
| 4 | **Desktop build stays fast.** Dashboards ship no WebGL by default; the landing page is web-only. | The desktop app opens straight into the cockpit. |
| 5 | **60 fps target, 30 fps floor** on a 4-core / 8 GB machine at 1080p. | "Interactive and fun" that stutters is worse than flat. |
| 6 | **Accessibility.** Visible focus, ≥4.5:1 body contrast, full keyboard paths, `prefers-reduced-motion` respected. | Legal + usability. |
| 7 | **No scroll-jacking, no 3D text, no auto-playing sound.** | These read as amateur and break trackpads. |
| 8 | **Nothing is removed.** Every existing tab, filter, drawer, badge and button survives. | "All features work properly." |

---

## 2. Current-state audit (measured)

### 2.1 What already exists

| Asset | Reality | Verdict |
|---|---|---|
| `three@0.180` | Installed in **both** apps, previously used only by the mascot rig | **Kept for the Phase 5 scene layer.** Mascots are removed entirely. |
| `framer-motion@12` | Used for reveals/stagger in `LandingV2.jsx` | Keep for orchestration, not for surfaces. |
| `client/src/v2/ui3d.css` | 10.3 KB CSS-only depth system (tokens, bevel, press, specular) | **Good bones, barely used.** Imported by `client/src/App.jsx` only. |
| `master/src/v2/ui3d.css` | **Does not exist.** `master/src/App.jsx` imports only `v2.css` | Master is visually one generation behind. |
| `v2.css` | 239 KB (client) / 251 KB (master), ~thousands of one-off rules | The main source of flatness and the main regression risk. |
| `landing.css` | 55 KB, `lp-*` namespace, 15 sections | Cleaner than `v2.css`; safe to extend. |

### 2.2 What is actually wrong (not just "not 3D enough")

1. **Depth is faked with glow, not light.** Cards use `border + rgba background + box-shadow(0 0 20px color)`. That is "neon", not 3D — it reads flat because there is no consistent light direction, no ambient occlusion, and no specular response.
2. **Buttons move 1 px on press.** No bevel, no rim, no inner shadow, no magnetic hover. `ui3d.css` already solves this but is orphaned.
3. **Master has no design tokens at all.** Two apps, two visual dialects.
4. **Four Unsplash URLs** (`LandingV2.jsx` ×3, `CommandCenter.jsx` ×1) → broken boxes offline, and a privacy leak online.
5. **The hero's strongest asset (`Mascot3D`) is buried** behind a flat text column and a 2D queue.
6. **No capability tiering.** `useDeviceCapability` detects cores/RAM/network but never asks "can this GPU do WebGL2, and should we?".
7. **Dashboards are one giant scroll of same-weight panels.** No hierarchy of elevation → the eye has nowhere to land.

### 2.3 Constraints discovered

- `client` and `master` are **separate Vite apps with duplicated components**. There is no shared package. Any shared 3D kit must be introduced deliberately (see §4).
- `CommandCenter.jsx` is **200 KB / `MasterCommandCenter.jsx` 177 KB** in single files. This is why the plan upgrades the dashboard in **wrappers and class layers**, never a rewrite.
- Global CSS is the regression vector: `.v2-card`, `.v2-panel`, `.v2-btn` are used across every screen. Changes must be additive and scoped.

---

## 3. The design language: "Precision Instrument"

Three words: **engineered, calm, expensive.** Not "cyberpunk dashboard".

### 3.1 Light model (the thing that actually creates 3D)

One key light, fixed at **top-left 35°**, one cool rim light from bottom-right, one ambient fill.

```
key      #ffffff  @ 0.16   → top edge highlight, specular sweep
rim      #5eead4  @ 0.10   → bottom-right edge, "glass thickness"
ambient  #0b1220  @ 1.00   → raised surface base
occlusion rgba(0,0,0,.55)  → contact shadow, always tighter than the glow
```

Every raised surface gets **three** shadows: contact (`0 1px 2px`), body (`0 10px 24px -8px`), and ambient bloom (`0 24px 60px -24px`). This triplet is what separates "3D" from "card with a border".

### 3.2 Elevation scale

| Token | Use | Offset | Blur |
|---|---|---|---|
| `--e0` | page floor / inset wells | inset 0 1px 2px | 4 |
| `--e1` | table rows, chips | 0 1px 2px | 3 |
| `--e2` | cards, panels | 0 8px 18px -8px | 18 |
| `--e3` | hovered card, dropdown | 0 14px 30px -10px | 30 |
| `--e4` | drawer, popover | 0 24px 60px -18px | 60 |
| `--e5` | modal, command palette | 0 40px 100px -30px | 100 |

### 3.3 Materials (4 only — restraint is what makes it look expensive)

| Material | Where | Recipe |
|---|---|---|
| **Obsidian glass** | dashboard panels, drawers | `#0a1120` → `#111c31` linear + 1px top rim `rgba(255,255,255,.10)` + inner top shadow |
| **Brushed brass** | primary CTA, "popular" pricing, master accents | 3-stop diagonal amber gradient + 1px inner highlight + subtle noise at 3% |
| **Ceramic white** | landing product surfaces, pricing cards | `#f7f9fc` with cool shadow and near-black text |
| **Holographic** | scan rings, live indicators, WebGL glow | conic `cyan → violet → lime` at low alpha, only on motion |

### 3.4 Motion language

| Interaction | Spec |
|---|---|
| Reveal on scroll | y +24 → 0, opacity 0→1, 520 ms, `cubic-bezier(.16,1,.3,1)`, stagger 70 ms |
| Card hover | lift −6 px, `--e3`, tilt ≤6°, 220 ms spring (stiffness 260, damping 26) |
| Button press | translateY +2 px, shadow collapses to `--e1`, 90 ms |
| Magnetic CTA | pointer offset ×0.18, max 8 px, spring return on leave |
| Number change | 700 ms count-up, tabular numerals, no layout shift |
| Scene idle | 0.15 Hz drift, never faster |
| Reduced motion | all of the above become opacity-only fades |

**Banned:** parallax on text, scroll-jacking, rotating cards on scroll, particle counts above 400, animated gradients on large surfaces (banding + GPU cost).

### 3.5 The play layer — "fun" as a requirement, not a garnish

Fun must not mean noisy. The rule: **every playful element is a reward for doing
something real**, never decoration that competes with the work.

| Where | Toy | Trigger | Cost |
|---|---|---|---|
| Hero globe | Grab-and-spin India, inertial release, pins "boop" outward on hover | drag / hover | instanced, 60 fps |
| Cursor light | A soft specular highlight tracks the pointer across the hero scene | pointer move | CSS vars only |
| Primary CTA | Magnetic pull + 8-particle brass spark burst + soft press detent | hover / click | 8 DOM spans, removed after 600 ms |
| Cards | Pointer tilt + parallax between art/text layers + specular sweep that follows the cursor | hover | CSS vars only |
| Credit gauge | Drag with momentum, detent at 100-credit marks, satisfying tick | drag | 1 rAF while dragging |
| Search running | Radar sweep across the map + "zone 4 of 67" ticks + progress orb | live data | CSS |
| Search finished | Number roll-up + one short brass shimmer across the result header | data change | CSS |
| Export done | A brass check mark draws itself in the download tray | export success | SVG stroke, 400 ms |
| Master board | Click a state → it lifts out of the table, districts cascade down, mandals fan out | drill-down | instanced |
| Table | Row hover lifts 1 px with a light that follows the row | hover | CSS |
| Sound (opt-in, default **off**) | 4 synthesized blips: tick, confirm, sweep, error — generated with WebAudio, no audio files | toggle in settings | ~0 when off |
| Idle | After 45 s the hero scene slows to 0.03 Hz; any input restores full speed | idle timer | paused with page |

Rules that keep it classy:

- No confetti on every action — **one** celebration moment per flow (export, first search of the day).
- Nothing moves under the cursor while the user is reading a number.
- Every toy has a `prefers-reduced-motion` variant (opacity only) and a keyboard equivalent.
- Sound is opt-in, generated locally, and respects the mute state — no autoplay, ever.
- Particle bursts are capped at 12 elements and never spawn inside a table cell.

---

## 4. Architecture: one kit, two apps

### 4.1 The problem

`client/` and `master/` duplicate `CommandCenter`, `VendorDrawer`, `Mascot3D`, `v2.css`… Copying a new 3D kit into both would guarantee drift within a week.

### 4.2 The decision — a shared source folder, bundled at build time

```
shared/ui3d/
├── tokens.css              # depth, materials, motion, z-index, radii
├── kit.css                 # .k3-btn, .k3-card, .k3-shelf, .k3-scene, …
├── primitives.jsx          # Button3D, Card3D, Tilt3D, Shelf3D, StatTile, Segmented3D, Sheet3D
├── SceneHost.jsx           # tier gate + IntersectionObserver + DPR clamp + error boundary
├── useSceneTier.js         # 'off' | 'lite' | 'full'
├── motion.js               # springs, easings, prefersReducedMotion()
├── art/
│   ├── grain.svg           # local noise texture (replaces Unsplash grain)
│   ├── product-chat.svg    # local art replacing Unsplash #1
│   ├── product-cart.svg    # local art replacing Unsplash #2
│   ├── product-bill.svg    # local art replacing Unsplash #3
│   └── avatar-set.svg      # local avatars for WhatsApp mock
└── scenes/
    ├── HeroGlobe.jsx       # landing hero (India + pins + radar sweep)
    ├── IndiaBoard.jsx      # master sweep visualiser
    └── HoloGrid.jsx        # client run panel ambient layer
```

- Both `vite.config.js` files get a `resolve.alias` for `@ui3d` → `../shared/ui3d`, plus
  `server.fs.allow: ['..']` for dev.
- Desktop builds **bundle** the shared folder, so the packaged `.exe` needs no path juggling.
- **Fallback if the alias fights the electron-builder config:** `scripts/sync-ui3d.js`
  copies `shared/ui3d` → `client/src/ui3d` and `master/src/ui3d` on `prebuild`. One command,
  no manual copy. Decision point at Phase 1 gate.

### 4.3 Import order (critical)

```
tokens.css  →  kit.css  →  v2.css  →  landing.css
```

Tokens first so the legacy sheets can consume them; `kit.css` before `v2.css` so
`v2.css` can still win on the few places it must. Every kit class is namespaced `k3-`
so it can never collide with `v2-` / `lp-`.

---

## 5. Capability tiering

`useSceneTier()` returns:

| Tier | Condition | Behaviour |
|---|---|---|
| `full` | WebGL2 + ≥4 cores + DPR ≤2 + no reduced-motion | Hero globe + master board + ambient scenes, DPR ≤1.5 capped at 1.75 |
| `lite` | WebGL2 but weak CPU/RAM, or saveData | Static rendered frame + CSS depth, no RAF loop |
| `off` | no WebGL, context loss, battery-saver, reduced-motion | CSS-only depth system (still fully 3D-looking via `ui3d`) |

Hard rules:
- One `requestAnimationFrame` loop **per page**, owned by `SceneHost`.
- Scenes pause when the tab is hidden or the canvas is off-screen (proven pattern in `Mascot3D`).
- `webglcontextlost` → downgrade to `lite` + toast-less silent fallback.
- No scene allocates per frame; geometry built once, instanced where possible.

---

## 6. Phase plan

Each phase is independently shippable. **I stop at every gate for your go-ahead.**

---

### Phase 0 — Guardrails & baseline (½ day)

**Goal:** make regressions impossible to miss, and remove the offline violations.

- Capture full-page screenshots of: landing, client cockpit (all 4 tabs), master cockpit, drawer open, modal open, empty state, 402 state. Store in `docs/shots/before/`.
- Freeze a **feature checklist** (§10) as a markdown file I tick after every phase.
- Delete the 4 Unsplash URLs; replace with local SVG art in `shared/ui3d/art/` (temporary flat art is fine here — it is replaced by real 3D later).
- Add a dev-only `/lab` route in `client` (not linked in nav, not in desktop build) showing every primitive in every state. This is how we QA 40 hover states without clicking through the app.
- Add a network guard in dev: any request to a non-localhost host logs a loud console error.

**Acceptance:** both apps build; `/lab` renders; network tab shows **zero** external requests.

---

### Phase 1 — Foundations: tokens, materials, primitives (1.5 days)

**Goal:** the 3D vocabulary exists and is testable in isolation.

Deliver `shared/ui3d/` with:

- `tokens.css` — elevation §3.2, materials §3.3, motion §3.4, plus radii, z-index, focus ring, `--k3-mx/--k3-my` pointer vars.
- `kit.css` — `.k3-btn` (bevel: outer rim, inner highlight, press depth, 6 variants), `.k3-card` (3-shadow stack, rim light, optional glass), `.k3-shelf` (raised container with inset well), `.k3-field`, `.k3-chip`, `.k3-tabs` (segmented with sliding thumb), `.k3-scene`.
- `primitives.jsx`:
  - `Button3D` — `variant` (brass/glass/ghost/danger), `size`, `loading`, `icon`, magnetic pull, press detent, optional spark burst, full keyboard support.
  - `Card3D` — `tilt` (0–8°), `glow` (holographic), `material`, inner parallax layers.
  - `Tilt3D` — pointer→CSS-var spring, `will-change` only while hovering.
  - `Magnetic` — wraps any control, pointer offset ×0.18, spring return.
  - `SparkBurst` — ≤12 brass particles on a successful primary action.
  - `Shelf3D` — the "screwed into the dashboard" container used by every panel.
  - `StatTile` — count-up + sparkline slot + status orb.
  - `Segmented3D` — replaces existing tab buttons without changing handlers.
  - `Sheet3D` — drawer/modal shell with backdrop blur + depth.
  - `Gauge3D` — draggable credit gauge with momentum and detents.
- `sound.js` — opt-in WebAudio blips (tick / confirm / sweep / error), synthesised, no files.
- `motion.js` — shared springs; `useReducedMotion`.
- Wire `@ui3d` into **both** `vite.config.js` files.
- Import `tokens.css` + `kit.css` in both `App.jsx`.
- Migrate `ui3d.css` tokens into `tokens.css` (one source of truth), keep the old file as a thin re-export so nothing breaks mid-phase.

**Acceptance:** `/lab` shows every primitive in rest/hover/active/focus/disabled/loading; 60 fps tilt with 30 cards on screen; both builds pass; `/lab` excluded from `dist-desktop`.

---

### Phase 2 — Landing page, section by section (2.5 days)

Every section keeps its copy, anchors (`#agency-power`, `#pricing`, …) and CTA
handlers. Only the chrome changes. Order of work = order of scroll.

| # | Section | 3D upgrade |
|---|---|---|
| 1 | `lp-hero` | `HeroGlobe` scene behind the headline (India landmass from a low-poly path, 120 instanced pins that light up in a radar sweep, floating "lead card" planes). Headline gets layered text-shadow depth, CTA becomes magnetic brass. `PlaceQueue` becomes a floating, tilted stack of glass cards. |
| 2 | `agency-power` | "Power stack" — 3 cards on separate z-planes, tilt on hover, drop shadows that deepen with z. |
| 3 | `difference` | Split panel: left flat/"old way" (deliberately 2D, desaturated), right "our way" (raised glass, rim light). The contrast *is* the message. |
| 4 | `why` | Stat plinths — numbers on ceramic blocks with contact shadows and count-up. |
| 5 | `compare` | Table gains row hover lift + sticky header shelf; no 3D text. |
| 6 | `simulator` | Interactive credit simulator: real drag on a brass rail, leads counter counts up, cost updates. Pure client-side math. |
| 7 | `how` | 3-step conveyor with scroll-linked progress line; each step is a raised slab that assembles as it enters. |
| 8 | `dashboard` | `DashboardMock` gets real depth: window chrome, glass panels, one live sparkline (CSS only). |
| 9 | `whatsapp` | Phone mock in 3D perspective, chat bubbles float in/out on scroll, local avatar art, QR block with animated scanner line. |
| 10 | `money` | ROI calculator: slider → leads → revenue, with a 3D bar stack that grows. |
| 11 | `who` | Persona cards with tilt + local icon art. |
| 12 | `credits` | `CreditMeter` becomes a physical gauge: brass ring, liquid fill, tick marks, needle with inertia. |
| 13 | `pricing` | Ceramic cards; the recommended tier is physically lifted (`--e5`) and slightly larger; brass CTA. |
| 14 | `faq` | Accordion with depth: panel slides out of a well, chevron rotates. |
| 15 | `lp-final` | Horizon shot: globe arc at the bottom, pin burst on CTA hover. |

Also: sticky nav becomes a floating glass bar that condenses on scroll; scroll progress line; section-entry reveals unified through `motion.js`.

**Acceptance:** Lighthouse desktop ≥90 performance / 100 a11y; no layout shift >0.05; all 15 anchors reachable; every CTA still calls `go()`; zero external requests; works at 360 px, 768 px, 1440 px, 2560 px.

---

### Phase 3 — Client cockpit (3 days)

Approach: **wrapper surgery**. For each surface, wrap the existing JSX in `Shelf3D`/`Card3D`
and swap class names — never rewrite the logic inside.

| Surface | Change |
|---|---|
| App shell | `v2-cmd-rail` → floating glass rail with active-item pill (sliding thumb, no layout shift); top bar → condensing glass header. |
| KPI row | `.v2-metric-card` → `StatTile` with contact shadow, tone orb, count-up on data change. |
| Run panel | `HoloGrid` ambient scene **only while scraping**, tier-gated; otherwise a static depth plate. |
| Search console | `SearchConsole.jsx`: the 3D mascot gets a proper stage (floor shadow, rim light, reflection), field gets inset well + focus glow, scope pills → `Segmented3D`. **All suggestion logic untouched.** |
| Leads table | Row hover lift 1 px + left rail accent; sticky header on a shelf; zebra via elevation, not colour. |
| Map | Container becomes a recessed well with an inner shadow so the map looks embedded, not pasted. |
| Drawer (`VendorDrawer`) | `Sheet3D` with edge light, staggered field reveal, carried-forward notice gets a brass "verified earlier" seal. |
| Modals / folder leads | `Sheet3D` + backdrop depth blur. |
| CRM board | Columns as vertical shelves; cards tilt; drag state gets a real shadow lift. |
| Empty states / 402 | Mascot + a proper raised panel; 402 uses the calm "out of credits" material (no red alarm). |
| Toasts | Floating glass with depth, stacking offset. |

**Hard rule:** no changes to `api.js`, data shapes, handlers, filters, sorting, or export.

**Acceptance:** feature checklist §10 passes 100%; 4,901-lead table scrolls at 60 fps; drawer opens <120 ms; no console errors; `dist-desktop` builds and the cockpit opens on `/command`.

---

### Phase 4 — Master cockpit (2.5 days)

Same treatment as Phase 3, plus the parts only master has:

| Surface | Change |
|---|---|
| Sweep launcher | Becomes a "mission control" console: scope segmented control, area field with inset well, live preview as a raised readout panel. |
| Coverage preview | Unit counts animate (`19 units · Mandals`), terminology phrase gets a brass rule, ETA becomes a gauge. |
| Deep toggle | Physical switch with detent and label state. |
| India board | `IndiaBoard` scene: state → district → mandal drill-down as a holo table; the preview's real unit count drives the dots. Tier-gated, `lite` shows a static SVG map. |
| Sweep progress | Live ring + per-unit ticks, driven by the existing SSE/poll data. |
| Master clients | `masterClients.css` surfaces → `Card3D`; client detail drawer → `Sheet3D`. |
| Engine status / learning center | Status orbs with real depth, not flat dots. |
| Missing tokens | Master gets `tokens.css` + `kit.css` for the first time — this closes the visual gap. |

**Acceptance:** all six measured previews still return the same numbers (Guntur 19, Tenali 10, Pollachi 121, AP 723, Coimbatore 64, Barrackpore 54); deep toggle still sends `deep:true`; `unverifiedPlace` warning still visible and still loud; sweep start/stop unchanged.

---

### Phase 5 — WebGL scenes, properly (2 days)

| Scene | Spec | Budget |
|---|---|---|
| `HeroGlobe` | Low-poly India (≈1.2k tris from a hand-simplified path), subtle rotation, 120 instanced pins with emissive pulse, one radar ring sweep, 3 floating glass cards via instanced planes + shader fresnel. | ≤45k tris, ≤8 draw calls, 0 textures, ≤4 MB JS |
| `IndiaBoard` | Flat holo table, state outlines as line geometry, district dots instanced, sweep ripple on active unit. Camera is orthographic-ish, no orbit controls. | ≤30k tris, ≤6 draw calls |
| `HoloGrid` | 40×40 line grid, single shader, scroll offset, alpha tied to scraping state. | ≤2 draw calls, ~0.3 ms/frame |
| `Mascot3D` | Removed per user instruction — no mascots anywhere in the product. | deleted |
| Cursor light | A single sampled pointer light across the hero, no per-object listeners. | ~0.05 ms/frame |

Rules: no texture files (procedural only), no post-processing (bloom is faked with additive sprites), no OrbitControls, no per-frame allocations, dispose on unmount.

**Acceptance:** hero ≥60 fps on a 2019 laptop iGPU at 1080p; scrolling past the hero drops RAF to 0 (verified in devtools Performance); context loss recovers to `lite`.

---

### Phase 6 — Motion & interaction polish (1 day)

- Single scroll observer (`IntersectionObserver`, not per-element listeners).
- Cursor spotlight in the hero only (CSS vars, `pointer: fine` only).
- Press/hover/focus states audited on **every** interactive element in `/lab` and in all three surfaces.
- Number transitions everywhere (leads, credits, units, revenue) — tabular numerals, no reflow.
- Reduced-motion pass: every animation has an opacity-only variant.
- Keyboard pass: tab order, focus trap in `Sheet3D`, Esc closes, Enter submits.

**Acceptance:** axe clean; keyboard-only run of search → results → drawer → export works; reduced-motion mode has zero transforms >2 px.

---

### Phase 7 — Performance hardening (1 day)

- Route-level code split: three.js only loads for `LandingV2` (web) and master when `IndiaBoard` mounts; **never** on the client cockpit route.
- `manualChunks`: `vendor-react`, `vendor-three`, `vendor-map`, `vendor-misc`.
- CSS: extract unused `v2.css` rules found by coverage (target −15%), dedupe.
- Images: all SVG, inlined under 4 KB.
- Measure: cold load, TTI, RAF frame time, memory after 10 min idle, table scroll FPS.
- Budget gates documented in the repo so future work cannot silently regress.

**Acceptance:** client cockpit JS ≤ current +10%; landing first paint ≤ current; three.js in its own lazy chunk; memory flat over 10 min.

---

### Phase 8 — Full regression + release (1 day)

- Run the complete §10 matrix on a fresh engine boot.
- Rebuild `client` (`build` + `build:desktop`) and `master` (`build` + `build:desktop`).
- Verify store ownership/read-only behaviour untouched (4,901 leads / 12.39 MB).
- Hand you a build + a 10-minute manual test script for the things I cannot test here (Electron launch, 1,000-credit first-run, WhatsApp QR).

---

## 7. What "3D" means concretely (so we agree on the look)

- **Depth is optical, not decorative.** Light comes from one place; every raised thing casts a contact shadow; every glass thing has a bright top rim.
- **Interaction is physical.** Buttons travel, cards tilt toward the pointer, gauges have inertia, sheets slide on a spring.
- **WebGL is a hero moment, not wallpaper.** One great scene at the top of the landing page and one in master. The dashboards stay crisp CSS-3D so they open instantly and never burn battery.
- **Restraint.** Four materials, one accent per screen, no rainbow gradients, no glowing text.

---

## 8. Cross-app parity

| Concern | How it stays in sync |
|---|---|
| Tokens / kit | Single `shared/ui3d` source |
| Primitives | Single source; both apps import the same components |
| Legacy CSS | Two files remain (they have genuinely diverged), but both consume `tokens.css` |
| Parity check | `npm run build` in both, plus a screenshot diff of the same surface (KPI row, drawer, search console) at the Phase 4 and Phase 8 gates |
| Drift guard | A tiny `scripts/check-ui3d-parity.js` (Phase 1) that fails if a `k3-` class is used in one app but missing in the other |

---

## 9. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Global CSS change breaks an unseen dashboard state | High | High | Additive-only `k3-` classes; no edits to `.v2-*` / `.lp-*` selectors except in a named, reviewed list per phase |
| 200 KB `CommandCenter.jsx` edit introduces a runtime error | Medium | High | Wrapper-only edits; one surface per commit; build after each; `/lab` isolation |
| WebGL stutters on office laptops | Medium | High | Tier gate, DPR clamp, pause-offscreen, static fallback; hero is the only heavy scene |
| three.js bloats the desktop bundle | Medium | Medium | Lazy chunk; never imported from cockpit routes; verify payload at Phase 7 |
| Two apps drift | High | Medium | Shared source + parity script |
| Visual work masks a logic regression | Medium | High | §10 matrix ticked at every gate; no server changes at all |
| Electron cannot be verified here | Certain | Medium | You run a 10-min script at Phase 8; I ship a rollback tag |

**Rollback:** every phase is a separate commit series; tagging `pre-3d` before Phase 1 means one command returns to today's UI.

---

## 10. Feature regression matrix (must be 100% green at every gate)

**Search & data**
- [ ] Client search returns leads; 1 city per search enforced
- [ ] Bare "guntur" asks city-or-district
- [ ] Suggestions appear, grouped, with "Search literally"; typing never blocked
- [ ] 10-digit mobile validation via `parseIndianPhone` only
- [ ] `Unknown` shown for missing fields; no invented data
- [ ] Containment: zero out-of-area leads
- [ ] Phase 3: carried-forward leads appear with badge + `carriedFrom` provenance
- [ ] Repeat search does not re-tag / re-charge

**Credits & limits**
- [ ] 1 lead = 1 credit; counter updates live
- [ ] 402 blocks only new searches; folders/list/export still 200
- [ ] Credit meter shows exhausted state calmly

**Master**
- [ ] Six previews return exact counts (19 / 10 / 121 / 723 / 64 / 54)
- [ ] Vocabulary per state (Mandal / Taluk / Taluka / Tehsil / Block) correct
- [ ] Typed suffix overrides UI scope
- [ ] Deep toggle works
- [ ] Unknown place → `unverifiedPlace` warning, still runs
- [ ] State / district / mandal / city sweeps all launch
- [ ] Master clients list + detail + assignment

**CRM & outreach**
- [ ] CRM stages drag/drop persist
- [ ] Telecaller view, table view, analytics tab
- [ ] WhatsApp links only for valid mobiles; landline shows call/disabled
- [ ] Vendor drawer "Verified earlier" notice

**Data & files**
- [ ] Export CSV columns unchanged; Primary = mobile only; landline in Secondary
- [ ] Folder save/open/rename/delete; folder leads modal
- [ ] Store ownership: single writer, read-only second instance
- [ ] STOP aborts in <3 s and preserves the folder
- [ ] Restart keeps store intact

**Platform**
- [ ] Both apps: `npm run build` green
- [ ] Both desktop builds green; `/command` opens directly
- [ ] Zero external network requests
- [ ] Reduced motion + keyboard-only paths

---

## 11. Sequencing & gates

```
P0 baseline ──► P1 kit ──► P2 landing ──► P3 client ──► P4 master ──► P5 scenes ──► P6 polish ──► P7 perf ──► P8 release
     gate          gate        gate           gate           gate          gate          gate         gate        gate
```

Rough total: **~13 working days** of focused implementation. The gates are there so you
can stop after the landing page, or after the client, and still have a coherent product.

**Recommended first milestone for a visible win:** P0 → P1 → P2. That gives you the
$1M landing page, proves the kit, and touches zero dashboard logic.

---

### 3.6 Ultra-fast + explanatory (added after review)

Speed is part of the look. A beautiful screen that waits 400 ms to respond feels cheap.

| Rule | Implementation |
|---|---|
| First paint under 1.2 s on the desktop app | cockpit route imports no scene code, no three.js, no map JS until the map tab is opened |
| Interaction feedback within 16 ms | hover/press states are CSS-only; JS never gates a visual change |
| Every number explains itself | an inline `k3-hint` under each metric: what it counts and where it came from |
| Every control explains itself | one-sentence tooltip on hover/focus, plain language, no jargon |
| Every empty state teaches | "nothing here yet" always says *what to do next* and shows the exact field to type |
| Every sweep explains its scope | "This will visit 19 mandals in Guntur district, about 6 minutes" before it runs |
| No layout shift | fixed aspect ratios, tabular numerals, skeletons with the same box size |
| Perceived speed | optimistic spinner within one frame, results stream in, numbers roll up rather than snap |

Copy style: short sentences, active voice, Indian English ("mandal", "taluk", "tehsil"),
never "scrape". Explain the *consequence* first, then the mechanism.

---

## 12. Decisions I need from you

1. **Look direction:** "Precision Instrument" (obsidian + brass, engineered, calm) — or do you want a brighter "Apple product" direction (white ceramic + soft shadows)? I recommend Precision Instrument because it suits a data product and hides imperfection better on LCDs.
2. **Shared folder:** OK to add `shared/ui3d/` at repo root (my recommendation), or do you prefer duplicated + synced copies?
3. **Sequence:** landing first (visible win), or client cockpit first (daily use)?
4. **Brass accent colour:** keep the current blue/lime, or move primary CTAs to warm brass/amber for the premium feel? I recommend brass **buttons**, blue **data**.

Once you confirm 1–4, I start at Phase 0 and show you `/lab` + the new hero before touching any dashboard.
