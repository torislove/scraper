# ColourBoy, Engine Depth and Bug Closure — Implementation Plan

**Status:** awaiting approval
**Scope:** both apps (Client + Master), 11 markets, every command-center control
**Non-negotiables:** keyless, India is Home, no zone caps, no fabricated rows

---

## 1. What I audited

I did not plan from memory. I ran the live engine, opened both command centers in a
real browser, clicked every tab, switched country, opened the tools menu, and read
the engine health endpoint.

### 1.1 Engine reality (live `/api/scrape/engines/status`)

| Engine | Status | Last run | Verdict |
|---|---|---|---|
| Google Maps | online | 44 rows | **Working** |
| Google Local Finder | online | 40 rows | **Working** |
| JustDial | online | 49 rows | **Working** (India) |
| Business Websites (`web-contact`) | online | 9 rows | **Working** |
| Free Geocoder | online | 1 row | Working |
| OpenStreetMap | **empty** | 0 rows | Overpass blocked from this network |
| WeddingBazaar | **empty** | 0 rows in **12 ms** | Not actually running |
| Mandap | **empty** | 0 rows in **2 ms** | Not actually running |
| WeddingWire | **empty** | 0 rows in 81 s | Runs, finds nothing |
| Social / Web Dork | **empty** | 0 rows | Query path returns nothing |
| Brave | empty | 0 rows | HTTP 429, optional |
| Google SERP | paused | — | Consent wall, correctly off |
| IndiaMART | paused | — | Bot page, correctly off |

**Summary: 5 online, 6 empty, 2 paused.** Only four engines reliably produce
leads today. That is the real gap behind "scrape a good amount of leads from all
the engines".

The ten international engines (`yellowpages`, `yelp`, `tripadvisor`, `cylex`,
`trustpilot`, `bing-places`, `wikidata-businesses`, `social-dork-intl`,
`freeindex-uk`, `goldenpages-ie`) are **not in the health table at all**, so
there is no yield data for them. We are shipping them blind.

### 1.2 Theme gaps (measured from computed styles, not by eye)

The retro layer covers the cockpit shell, but **5 control families still render
with the old white theme**:

| Control | Current look | Why |
|---|---|---|
| Workspace tabs (Leads / Map / CRM / Folders) | white pill, soft shadow | `.v2-cmd-tabs button.is-active` outranks the retro rule |
| Filter toggles (Prime / Phone / Website / Deep / Conflicts) | white pill | `.v2-filter-toggles button.is-active` not covered |
| Prime Leads button | orange fill | `.v2-btn-prime-filter` not covered |
| Tools menu | plain white dropdown, tiny rows | menu is portalled outside `.v2-root` |
| Focus-table view (metrics + wide table) | flat white, blue links | separate view styles, never themed |

Also found: the search input carried inline `color:#0F172A`, which silently
overrode the theme; business names in the wide table render in link blue.

### 1.3 Functional bugs found

| # | Bug | Impact |
|---|---|---|
| B1 | Switching country leaves the previous country's folder and rows on screen | A US selection can show `+91` Vijayawada rows |
| B2 | WeddingBazaar and Mandap return in 2–12 ms | They are counted as engines but do no work |
| B3 | WeddingWire runs 81 s and returns 0 | Wasted time on every wedding query |
| B4 | OpenStreetMap always 0 on this network | A headline engine contributes nothing |
| B5 | Social dork returns 0 | Instagram/Facebook discovery is dead weight |
| B6 | International engines have no health record | Cannot tell a block from a bug |
| B7 | Search examples were India-only for every market | US/GB/DE users saw Vijayawada prompts |
| B8 | Some counters say "245 countries" in secondary screens | Contradicts the 11-market product |

B7 is already fixed (this pass). B8 is a sweep.

---

## 2. The ColourBoy theme

"ColourBoy" = the Game Boy **Color** era: translucent coloured plastic, a lit
screen, chunky moulded controls — not a grey DMG.

### 2.1 Palette (recommended: Atomic Purple)

| Token | Value | Use |
|---|---|---|
| `--cb-shell` | `#f7f4ff` | main body |
| `--cb-shell-2` | `#ece6ff` | recessed areas |
| `--cb-purple` | `#7b5ea7` | bezel, active states |
| `--cb-purple-deep` | `#4b3670` | borders, hard shadow |
| `--cb-screen` | `#c9f2c0` | the lit screen |
| `--cb-screen-deep` | `#8fd98a` | screen gradient end |
| `--cb-ink` | `#241c33` | text |
| `--cb-magenta` | `#d64f8f` | A/B buttons, alerts |
| `--cb-cyan` | `#3fb8c4` | secondary accent |
| `--cb-amber` | `#e0a53a` | power LED, warnings |

Alternative palettes, same tokens: **Berry** (`#d64f8f` shell, teal screen) and
**Kiwi** (`#a8c93a` shell, amber screen). Switching is one variable block, so we
can ship all three behind a setting later.

### 2.2 Glass 3D recipe

Every surface gets the same five layers, so the whole app reads as one moulded
device:

1. **Glass fill** — `linear-gradient(160deg, rgba(255,255,255,.85), rgba(255,255,255,0) 45%)`
   over a translucent tint, with `backdrop-filter: blur(14px) saturate(1.25)`.
2. **Bezel** — 2px solid `--cb-purple-deep`.
3. **Top lip** — `inset 0 2px 0 #fff`.
4. **Bottom shade** — `inset 0 -3px 0 rgba(75,54,112,.45)`.
5. **Hard wall + drop** — `0 4px 0 var(--cb-purple-deep), 0 12px 24px rgba(36,28,51,.18)`.

Buttons press *into* the shell (`translate(2px,2px)` + inset shadow). Screens are
recessed (`inset 0 4px 12px rgba(...)`). No blur on the hard edges — blur is what
makes current panels look flat.

### 2.3 Coverage: every control in the command center

This is the "all the options" requirement, written as a checklist:

| Area | Controls to theme |
|---|---|
| Top bar | brand, breadcrumb, status pills, Tools trigger, Tools menu (portal) |
| Country strip | strip shell, pills, active pill, Home badge, **All 11** pill, picker drawer, search slot, country cards, feature card |
| Workspace tabs | all four tabs, active tab, counters |
| Search console | screen bar, input, clear, Find Leads (enabled + disabled), examples strip, suggestion dropdown, HUD chips |
| Stats | metric cards, icons, labels, deltas |
| Filters | source chips, Prime/Phone/Website/Deep/Conflicts toggles, rating select, sort select, count |
| Table | header, rows, zebra, hover, selected, checkbox, avatar, name, address, distance badge, phone cell, WhatsApp button, stage select, row action |
| Folder rail | folder rows, active, hover, tools, trash, empty state |
| Map | HUD pills, zoom/3D buttons, expand, legend |
| CRM | pipeline columns, board cards, stage pills |
| Modals | vendor drawer, trash modal, confirm dialogs, toasts |
| Inputs | every text/select/textarea, focus ring, placeholder |
| Scrollbars | track, thumb, hover |
| Motion | press, hover lift, tab switch, reduced-motion |

### 2.4 How we stop the CSS war

Current file uses `!important` everywhere because `whiteTheme.css` does. That is
fragile and is exactly why 5 families were missed. New approach:

- One token block (`colourboy.css`) that **re-points every `--w-*` token** the
  old themes read, so most components change without a selector.
- A short, explicit override list only for the ~12 components that hardcode
  colours (tabs, toggles, tools menu, table links).
- Delete `retroEmboss.css` and `landingRetro.css` once parity is proven, so there
  is one theme file, not five.
- Keep the import order: `whiteTheme.css` → `colourboy.css` last.

---

## 3. Engine workstream

Goal: every market runs engines that **actually return rows**, and the UI says
honestly when one is blocked.

### 3.1 Fix the dead engines (India first)

| Engine | Fix | Target |
|---|---|---|
| WeddingBazaar | 12 ms means it returns before fetching. Rebuild the city→vendor URL and parse the listing cards. | ≥ 15 rows for a wedding query in a metro |
| Mandap | 2 ms, same no-op. Implement the venue listing fetch or remove it from the bundle. | ≥ 10 rows or removed |
| WeddingWire | 81 s / 0 rows: consent wall. Detect the wall in <5 s, mark blocked, stop. | Fail fast, never 81 s |
| OpenStreetMap | Add 3 Overpass mirrors + Nominatim fallback, per-mirror timeout, honest "unavailable" state. | ≥ 10 rows in IN/US/GB or explicit "blocked" |
| Social dork | Replace the dead query with a working Bing/DDG `site:` dork and parse profile links. | ≥ 5 profiles per metro |
| Brave | Keep optional, mark 429 honestly. | No change |

### 3.2 Measure the international engines

New harness `scripts/verify/engine-yield.cjs`:

- Runs each engine for one city per market, isolated data dir, 60 s cap.
- Prints rows / phones / websites / emails per engine.
- Writes `docs/engine-yield.json` so the UI can show real numbers.

Then fix in order of yield: `yellowpages` (US/CA/AU/GB/SG/AE/NZ/ZA), `yelp`
(US/CA/AU), `cylex`, `trustpilot`, `freeindex-uk`, `goldenpages-ie`,
`wikidata-businesses`, `bing-places`, `tripadvisor`, `social-dork-intl`.

### 3.3 Add international engines to health

Extend `engineHealth.js` so every engine in `INTERNATIONAL_ENGINES` reports
runs / last count / last error, exactly like the India set. The command center
Engine tab then shows one honest table for all 11 markets.

### 3.4 Yield targets per market

Measured on a mid-size city, one category, all engines, 10-minute cap:

| Market | Engines that must return >0 | Target rows |
|---|---|---|
| IN | JustDial, Maps, Local Finder, Web Discovery, Web Contact, WeddingBazaar | 150+ |
| US | Maps, Local Finder, Web Discovery, YellowPages, Yelp, Cylex, Wikidata | 80+ |
| GB | Maps, Local Finder, Web Discovery, Yell, FreeIndex, Cylex, Trustpilot | 70+ |
| CA | Maps, Local Finder, Web Discovery, YellowPages.ca, Yelp, Cylex | 60+ |
| AU | Maps, Local Finder, Web Discovery, YellowPages.au, Yelp, Cylex | 60+ |
| AE | Maps, Local Finder, Web Discovery, YellowPages.ae, Cylex | 50+ |
| SG | Maps, Local Finder, Web Discovery, YellowPages.sg, Cylex | 50+ |
| NZ | Maps, Local Finder, Web Discovery, YellowPages.nz, Trustpilot | 40+ |
| IE | Maps, Local Finder, Web Discovery, GoldenPages, Trustpilot | 40+ |
| ZA | Maps, Local Finder, Web Discovery, YellowPages.za, Trustpilot | 40+ |
| DE | Maps, Local Finder, Web Discovery, Cylex, Wikidata | 40+ |

If an engine cannot hit its target after the fix window, it is **removed from the
bundle** rather than left in as decoration.

---

## 4. Bug closure

| # | Fix |
|---|---|
| B1 | Scope the workspace to the selected country: folders and rows filter by `countryCode`; switching country shows that country's folders or an empty state, never another country's leads. |
| B2 | Rebuild or remove WeddingBazaar and Mandap. |
| B3 | Consent-wall detection in <5 s for WeddingWire. |
| B4 | Overpass mirror rotation + Nominatim fallback. |
| B5 | Working dork for social profiles. |
| B6 | International engine health. |
| B7 | Done (market-aware examples). |
| B8 | Sweep every "245" string; replace with the 11-market wording. |

---

## 5. Phases

**Approved order: engines first.** Phases are numbered by dependency, not by
execution order; execution runs P3 → P4 → P5 → P6 → P0 → P1 → P2 → P7.

| Phase | Work | Estimate |
|---|---|---|
| **P3 — Engine yield harness** | `engine-yield.cjs`, `engine-yield.json`, health extension | 1 day |
| **P4 — India engine fixes** | WeddingBazaar, Mandap, WeddingWire, OSM, social | 2 days |
| **P5 — International engine fixes** | Ten engines, in yield order | 3 days |
| **P6 — Bug closure** | B1, B8, consent walls, empty states | 1 day |
| **P0 — ColourBoy tokens** | Palette, glass recipe, token re-point, delete retro layer | 1.5 days (three palettes) |
| **P1 — Full coverage** | Tabs, toggles, prime filter, tools menu (portal), focus table, links, inline styles | 1 day |
| **P2 — Landing parity** | Same palette on both landings, device screen, country grid | 0.5 day |
| **P7 — Verification** | Gates, live matrix for 11 markets, screenshots, docs | 1 day |

Total: **~11 working days**. Engine yield lands first; the ColourBoy look follows
once the data is trustworthy.

---

## 6. Acceptance criteria

A phase is only done when:

1. **Theme** — a script walks every interactive element in both command centers
   and fails if any lacks the ColourBoy signature (bezel + inset lip + hard
   wall). No visual exceptions.
2. **Engines** — for each of the 11 markets, the recorded live run meets the
   row target in §3.4, or the engine is removed from the bundle.
3. **Purity** — zero foreign-prefix numbers in every market run; zero Indian
   admin terms outside India.
4. **Honesty** — a blocked engine shows "blocked", never 0 rows presented as
   success.
5. **No regressions** — existing gates stay green: `engines-world`,
   `admin-divisions`, `scope-engines`, `carry-forward-quality`,
   `web-discovery-relevance`, `local-brain`, `country-sweep-plan`,
   `csv-export-rule`.
6. **Builds** — `client` and `master` both build.

---

## 7. Risks and honest limits

- **Overpass may stay unreachable from this network.** Mirror rotation is the
  fix; if all mirrors fail, OSM is reported blocked, not faked.
- **YellowPages / Yelp / TripAdvisor actively block.** They may not be
  recoverable without a browser session that the sites accept. If they stay
  blocked, they are removed from the bundle and the market still has Maps, Local
  Finder and Web Discovery.
- **"Good amount of leads" is a target, not a guarantee.** Public sites throttle.
  The plan measures and reports, and never invents rows to hit a number.
- **ColourBoy is a visual change with no layout change.** If a control needs new
  markup (tools menu portal), that is called out per phase.

---

## 8. Decisions — approved

Recorded 2026-11-18. These are settled; the phases above already reflect them.

1. **Palette — ship all three.** Atomic Purple, Berry and Kiwi as three token
   blocks behind one switcher in both command centers. Adds ~0.5 day to P0.
2. **Dead India engines — rebuild both.** WeddingBazaar and Mandap get real
   listing-card parsing and a live yield target of ≥15 / ≥10 rows on a metro
   venue query. Neither is removed.
3. **Blocked international engines — remove from the bundle and document.**
   After the fix window, an engine that still returns nothing is dropped from
   `INTERNATIONAL_ENGINES` and recorded in `docs/engine-yield.json` plus a
   "blocked sources" section, so the command center never lists a dead switch.
4. **Order — engines first.** P3 → P4 → P5 → P6, then the ColourBoy theme
   (P0 → P1 → P2), then verification (P7).

### Addendum found during execution

The 2 ms / 12 ms WeddingBazaar and Mandap timings were **not** broken engines.
Both short-circuit when the category is not a venue category
(`fidelity.isVenueCategory`), which is correct scoping — a caterer search must
not return banquet halls. The health board reported `0 rows` without saying
why, which is what made them look dead. The fix is to record the skip reason in
the health note, not to remove the guard.
