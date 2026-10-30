# Credits, one-time free grant, and the new landing page

Status: **implemented** (see bottom for verification)
Owner: Manoj
Last updated: 2026-10-30

---

## 1. Why we are changing the model

The 14-day trial was a mistake for this product:

- It rewards **waiting** rather than using. A shop owner installs on Monday, gets busy, and
  comes back on day 16 to a dead app.
- It hides the real unit of value. The customer is not buying "days", they are buying
  **leads**. Pricing should speak in the same unit the product produces.
- Support cost is open-ended: 14 days of unlimited scraping can produce tens of thousands
  of leads for ₹0.

The new model:

| Rule | Value |
| --- | --- |
| Free grant | **1,000 credits** |
| Conversion | **1 credit = 1 lead saved to your account** |
| How often | **Once per PC**, not per login, not per email |
| Expiry | None — credits do not expire |
| After the grant | Buy a plan, or keep browsing the leads you already have |

"No login" is deliberate: there is no account system in the desktop app, so there is
nothing to log into. The grant is tied to the machine fingerprint (`DEV-…`), which is a
hash of the Windows `MachineGuid`, CPU model, platform and installed RAM.

---

## 2. What a credit buys

A credit is charged **exactly once per new lead**, at the moment the lead is written to
the local database:

- Same business found twice (different engines, different searches) → charged once.
  Deduplication is by vendor `id`, which is stable per business.
- Editing a lead (CRM stage, notes, tags) → never charged.
- Re-opening an old folder → never charged.
- Deep-profile expansion of a lead you already own → never charged.
- Deep-profile expansion of a *new* lead → charged, because it is a new lead.

This is enforced in `dbAdapter.saveVendor` / `saveVendors`, the only two places a lead can
enter the database, so no scraper can bypass it.

---

## 3. Where the ledger lives

```
<userData>/credits.json          engine-owned ledger (source of truth while running)
HKCU\Software\Scraper            tamper anchor (granted / used / grantedAt)
<licence server>                 optional authoritative record per deviceId
```

### 3.1 Local ledger

```json
{
  "deviceId": "DEV-1A2B…",
  "granted": 1000,
  "used": 137,
  "grantSource": "anchor|server|local",
  "grantedAt": 1793400000000,
  "anchorAt": 1793400500000,
  "period": { "endsAt": 0, "allowance": 0, "used": 0 }
}
```

Debounced writes (400 ms) keep scraping fast; the file is flushed on exit.

### 3.2 Windows anchor

Every 25 credits the engine writes the three numbers to
`HKCU\Software\Scraper` via `reg add`. Consequences:

- Deleting `credits.json` does **not** hand out another 1,000 credits. The anchor restores
  the grant and the spend high-water mark, so the worst case is losing the last ≤24 credits.
- The anchor is per Windows user **and** per machine, which matches "one time per system".

### 3.3 Server record (optional, recommended)

When `SCRAPER_LICENSE_API` is configured, the first run calls
`POST /credits/claim { deviceId }`. The server stores the grant and returns the
authoritative `{ granted, used, grantedAt }`. Reinstalling Windows or wiping the registry
therefore does not re-grant: the server remembers the device id and answers
`already_claimed: true` with the remaining balance.

If the server is unreachable, the app keeps working from the local ledger and reconciles
on the next successful call. A paying customer is never locked out by a network blip.

---

## 4. Enforcement

Two independent gates:

1. **Run gate** — `licenseGate` returns `402 credits_exhausted` before a scrape starts when
   `left <= 0` and no licence is active. The dashboard shows "You have used your 1,000 free
   credits" with an upgrade button; saved folders stay readable and exportable.
2. **Write gate** — if credits run out mid-sweep, `dbAdapter` keeps the affordable new leads
   and drops the rest, so the ledger can never go negative. The run stops cleanly.

`LICENSE_ENFORCE=1` is now set **always** in the desktop build (previously only while a trial
or licence was active). That closes the "delete the activation screen" hole.

---

## 5. Plans and credits

The per-search cap (`maxLeads`) stays as it was. Plans now also carry a **monthly credit
allowance**, which is what the customer actually spends:

| Plan | Price | Leads per search | Credits / month | Cost per lead |
| --- | --- | --- | --- | --- |
| Starter | ₹1,999 | 500 | 2,000 | ₹1.00 |
| Pro | ₹3,999 | 2,000 | 10,000 | ₹0.40 |
| Agency | ₹7,999 | 10,000 | 50,000 | ₹0.16 |

A free grant of 1,000 is deliberately **less than one Starter month**, so a real user runs
out during a real campaign — not on day one, and not never.

The signed licence token carries `credits` and `periodEndsAt`; the engine derives the
allowance from the token, so it cannot be inflated by editing a local file.

---

## 6. Landing page

The marketing page moves to a single job: **"we sweep an entire district, nobody else
does."**

Structure:

1. Hero — "Scrape an entire district. Not just one city." + live **region sweep** panel
   (replaces the radar, which was the weakest element on the page).
2. Stat strip — 52 fields · <90 s · whole district · 100% validated mobiles.
3. **The gap** — what every other tool does (one keyword, one city, ~40 results) versus a
   mandal-by-mandal sweep (47 mandals, 1,200+ leads). Side-by-side visual.
4. Why we are indispensable — zero stale data / proprietor mobiles / lower CAC.
5. Honest comparison table.
6. How it works.
7. Dashboard explainer with a live mock window.
8. **Startups vs established agencies** — two different jobs, two different value stories.
9. **Credits** — what a credit is, how the 1,000 free works, one-time per PC.
10. Pricing with cost-per-lead.
11. FAQ.
12. Final CTA.

Motion: region sweep, count-ups, staggered reveals, sticky nav, accordion. No radar.

---

## 7. Files touched

| File | Change |
| --- | --- |
| `server/src/services/credits.js` | new — ledger, spend, status, plan period |
| `server/src/services/creditAnchor.js` | new — HKCU anchor read/write (Windows) |
| `server/src/config/dbAdapter.js` | charge new leads, trim when exhausted |
| `server/src/middleware/licenseGate.js` | `credits_exhausted` 402 |
| `server/index.js` | `GET /api/credits`, credits in `/api/app/info` |
| `desktop/src/config.js` | `FREE_CREDITS`, plan credits, no trial days |
| `desktop/src/license/index.js` | credits-aware state machine, no trial |
| `desktop/src/license/anchor.js` | new — read anchor before first run |
| `desktop/src/main.js` | always enforce, pass device id + credits file |
| `desktop/renderer/license.html/js` | "1,000 free credits" copy, no trial |
| `desktop/license-server/index.js` | `/credits/claim`, `/credits/status`, plan credits in token |
| `client/src/v2/LandingV2.jsx` + `landing.css` | full redesign |
| `client/src/index.css` | unchanged — landing now opts out via `html.lp-page` |

---

## 8. Verification

- `scripts/check-credits.js` — unit-tests the ledger: grant, spend, dedupe, exhaustion,
  anchor restore, re-grant refusal.
- `scripts/shot-landing.js` — three viewports, asserts wheel scrolling, zero overflow,
  zero console errors.
- `scripts/smoke-bundles.js` — web vs desktop bundle separation still holds.
- Manual: fresh `userData` → 1,000 shown; delete `credits.json` → 1,000 not re-granted;
  spend to 0 → 402 on scrape, folders still open.
