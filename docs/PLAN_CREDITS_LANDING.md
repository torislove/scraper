# Implementation plan — credits model + new landing page

**Project:** scraper.co.in desktop app (Windows) + marketing site
**Author:** Manoj
**Date:** 2026-10-30
**Status legend:** `[x]` done · `[~]` in progress · `[ ]` not started

---

## 0. The three decisions behind this plan

1. **No free trial.** A computer gets **1,000 credits once**, 1 credit = 1 lead. No expiry,
   no login, no second grant on the same machine.
2. **The product sweeps a whole region.** Not "20 results for one keyword in one city".
   This is the single claim the site is built on, because no other tool in India does it.
3. **Never say "scraping".** The only place the word appears is the brand — "Scraper" in the
   header and footer. Everywhere else we say *find, collect, gather, pull, sweep, build a
   list, live search.* Customers do not buy "scraping"; they buy a list they can sell from.

---

## 1. Copy rules (apply to every screen)

| Rule | Why |
| --- | --- |
| No "scrape", "scraping", "scraper" as a common noun | The brand is Scraper. The activity is "finding businesses" / "building a list". |
| Class 8 English, short sentences | The buyer is a shop owner, a distributor, a 2-person agency. |
| Rupees, Indian cities, Indian examples | Guntur, Vijayawada, Warangal, Palnadu, Narasaraopet. |
| Never invent a number | If a field is unknown, the app and the site say **Unknown**. |
| Every claim checkable | "You can test this in the first 10 minutes" beats "revolutionary AI". |
| Sell the outcome, not the tech | "200 shop numbers before lunch" not "Playwright orchestration". |

---

## 2. What the customer is actually buying

The site must answer one question in the first screen: **"how does this make me money?"**

Five ways customers use it — all of these become a section on the landing page:

### A. Agency selling websites / ads / SEO to local shops
Find every dentist, gym, banquet hall in a district → WhatsApp the owner → close 3–4
clients a month at ₹15,000–₹40,000 each. The list costs ₹1,999.

### B. Distributor / wholesaler selling products
List every retailer, hardware shop, medical store in 3 districts → field team visits with a
route plan instead of guessing. One new stockist pays for the year.

### C. B2B SaaS, insurance, loans, EdTech
Owner mobiles (not switchboards) mean the person who can sign up answers the phone.
Reply rate 14.5% on WhatsApp vs 1.8% cold calling.

### D. Freelancer / solo consultant
No data team, no ₹40,000/month database. Build a 500-lead pipeline for one niche in one
afternoon and start calling the same day.

### E. Agency reselling the lists themselves
Export a clean city list per client, white-label the columns, charge for "market research".
Every new city is a new deliverable without a new tool.

---

## 3. Product changes — credits

### 3.1 Rules `[x]`

- `FREE_CREDITS = 1000`, granted once per machine fingerprint (`DEV-…`).
- 1 credit = 1 **new** lead written to the local database. Dedupe by vendor id.
- Editing a lead, re-opening a folder, exporting, or expanding an existing lead: free.
- Paid plans add a **monthly allowance**, consumed before the free grant (use-it-or-lose-it
  first, so nothing paid is wasted).
- Credits never expire. Saved folders stay readable and exportable when credits hit zero.

### 3.2 Where it is enforced `[x]`

```
scrape request ──► licenseGate ──► credits.canStart()  ──► 402 credits_exhausted
                                        │
lead written  ──► dbAdapter.admitLeads ─┘ credits.spend(1)   (trims batch if exhausted)
```

- `licenseGate` (run gate) blocks a new search when the balance is zero.
- `dbAdapter` (write gate) charges each new lead and silently drops leads it cannot afford,
  so the ledger can never go negative mid-sweep.
- `LICENSE_ENFORCE=1` is now always set in the desktop build.

### 3.3 Storage `[x]`

| Layer | File | Purpose |
| --- | --- | --- |
| Ledger | `<userData>/data/credits.json` | fast local counter, debounced writes |
| Anchor | `HKCU\Software\Scraper` | stops a re-grant when the ledger is deleted |
| Server | `/credits/claim` (optional) | survives a Windows reinstall |

### 3.4 Status surface `[x]`

- `GET /api/credits` → `{ left, granted, used, plan, exhausted }`
- `GET /api/app/info` and `/api/license/status` include `credits`
- Desktop polls the ledger every few seconds and updates the badge + menu.

### 3.5 Desktop shell `[x]`

- `[x]` `config.js` — `FREE_CREDITS`, plan `credits`, no `TRIAL_DAYS`
- `[x]` `license/credits.js` — read-only ledger + anchor view
- `[x]` `license/index.js` — state machine: `credits | active | grace | expired`
- `[x]` `main.js` — always enforce, pass device id / file paths, credit watcher
- `[x]` licence window copy — "1,000 free credits", no trial wording
- `[ ]` engine restart when a licence is activated (so `SCRAPER_MAX_LEADS` updates;
  credits themselves are read live from the ledger, so only the per-search cap
  waits for the next restart)

### 3.6 Licence server `[ ]`

- `POST /credits/claim` — idempotent per `deviceId`, returns the record
- `POST /credits/status` — authoritative balance
- token payload gains `credits` + `periodEndsAt`
- `PLANS` gains `credits: 2000 / 10000 / 50000`

---

## 4. Landing page — information architecture

### 4.1 Sections, in order

| # | Section | Job | Motion |
| --- | --- | --- | --- |
| 1 | Nav | brand, anchors, "1,000 free credits" pill | sticky, blur on scroll |
| 2 | Hero | "Find every business in a district, not forty in one city" | headline rise, **region sweep** panel |
| 3 | Stat strip | 52 fields · <90 s · whole district · 100% mobiles | count-up on view |
| 4 | **The gap** | what everyone else does vs a mandal-by-mandal sweep | side-by-side fill bars |
| 5 | Why indispensable | fresh data / owner mobiles / lower CAC | staggered cards |
| 6 | Comparison | 6 honest rows | rows slide in |
| 7 | How it works | 3 steps, no training | staggered |
| 8 | Dashboard | what the screen does, 5 areas | animated mock window |
| 9 | **Make money with it** | 5 playbooks from §2 | tabbed cards with a money figure |
| 10 | Startups vs agencies | two different jobs | two big panels |
| 11 | **Credits** | what a credit is, 1,000 once per PC | meter draining 1000 → 0 |
| 12 | Pricing | 3 plans + cost per lead | cards lift |
| 13 | FAQ | 6 questions incl. "is this legal" | accordion |
| 14 | Final CTA + footer | one action | reveal |

### 4.2 The region sweep panel (replaces the radar)

The radar was the weakest element: decorative, and it said nothing. The replacement is the
product's actual differentiator, animated:

- A district grid of ~40 mandal cells.
- A sweep travels cell to cell (staggered ~90 ms), each cell flipping from `—` to a lead
  count.
- A live total climbs to **1,284 leads**, alongside `47 mandals · 90 sec`.
- Then it settles and replays every ~9 s. Reduced-motion users see the finished state only.

### 4.3 The gap section

Two columns, same axis:

```
Other tools            1 keyword · 1 city       ▓░░░░░░░░░   ~40 leads
Scraper                every mandal · district  ▓▓▓▓▓▓▓▓▓▓   1,284 leads
```

Copy: *"A normal tool searches one word in one city and stops. We split the district into
every mandal, village and pincode, search each one, then remove the duplicates."*

### 4.4 Credits section

- A single 1,000-credit meter that drains while leads appear.
- Three plain lines: **1 credit = 1 lead**, **1,000 free, once per computer**, **they never expire**.
- A comparison: "1,000 leads for ₹0. The same list from a data broker costs ₹15,000–₹30,000."

### 4.5 Tone examples

| Instead of | Write |
| --- | --- |
| "Live scraping engine with proxy rotation" | "A fresh list every time you search" |
| "52-field vendor enrichment pipeline" | "Owner, GSTIN, hours, reviews, Instagram — all in one place" |
| "Start your free trial" | "Get 1,000 leads free" |
| "Scrape an entire district" | "Find every business in a district" |

---

## 5. Design system

- Navy `#070b14` base, `#0d1526` panels, blue `#2563eb` → cyan `#22d3ee` accents.
- One type scale, three weights. Body 15–16px, never below 12px except mono labels.
- 8px spacing grid, radius 14–18px, hairline borders `rgba(148,163,184,.14)`.
- Motion: `cubic-bezier(.16,1,.3,1)`, 0.4–0.7 s, 60–90 ms stagger, all in-view reveals
  fire once. `prefers-reduced-motion` disables every loop.
- No lime, no neon, no radar.

---

## 6. Execution order

| Step | Work | Status |
| --- | --- | --- |
| 1 | Fix body scroll lock (`html.lp-page` opt-out) | `[x]` |
| 2 | Credits ledger + anchor + write gate + run gate | `[x]` |
| 3 | Desktop shell config / state machine / env | `[~]` |
| 4 | Licence window copy | `[ ]` |
| 5 | Licence server endpoints + token credits | `[ ]` |
| 6 | Landing page rewrite (all 14 sections) | `[ ]` |
| 7 | Screenshot + scroll + overflow audit at 3 widths | `[ ]` |
| 8 | Credit simulation test (grant → spend → exhaust → anchor) | `[ ]` |
| 9 | Docs, commit, push | `[ ]` |
| 10 | User verifies the Electron shell on their PC, then tag `v1.0.0` | `[ ]` |

---

## 7. Acceptance criteria

**Credits**
- Fresh profile shows exactly **1,000** credits.
- The 1,001st new lead is refused; the 1,000th is stored.
- Deleting `credits.json` restores ≈ the same balance (anchor), never 1,000 again.
- Re-running an identical search charges 0 credits for leads already owned.
- Export, CRM edit, folder re-open: 0 credits.
- Zero credits → searching shows a clear upgrade message; folders still open.

**Landing page**
- Wheel scrolls on desktop, tablet and mobile (`window.scrollY > 2000`).
- Zero horizontal overflow at 1440 / 900 / 390 px.
- Zero console errors.
- The word "scraping" appears nowhere except the brand "Scraper".
- Every number on the page is either a product fact or a labelled example.

**Build**
- `npm run build` (web) and `vite build --mode desktop` both pass.
- `scripts/smoke-bundles.js` still passes 4/4.
- Desktop bundle has no landing page; web bundle has no cockpit badge.
