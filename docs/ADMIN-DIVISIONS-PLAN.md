# PLAN — COUNTRY ADMIN HIERARCHY + COMPUTER-STORE SMOKE TEST
### State / Province / County / Prefecture / Mandal / Taluka — named correctly everywhere

**Status:** plan of record, then implemented in the same change.
**Date:** 2026-11-14
**Companion docs:** `INTERNATIONAL-EXPANSION-PLAN.md` (engines and country context), `MASTER_SWEEP_INTELLIGENCE.md` (sweep semantics), `VENDOR_FIELD_MATRIX.md` (lead schema).

---

## 0. The decision, in one screen

1. **Every country gets its own administrative vocabulary.** Canada shows **Province → Census division → City**, the UK shows **Nation → County → Town**, Japan shows **Prefecture → City or district → Ward**, France shows **Region → Department → Commune**, and so on. No country is forced into Indian words.
2. **India keeps the full four-level model:** State → District → **Mandal / Taluka / Tehsil / Block**, and the local word adapts to the selected state.
3. **One source of truth.** The terms live in the backend (`adminDivisions.js`) and reach Client and Master through the same API. The two dashboards never re-implement the mapping.
4. **Honest fallback.** Countries with a simple structure show only the levels they really have. Small islands and territories fall back to **Region → District → City** rather than inventing a province.
5. **Smoke test is small and real.** Three cities, one category (“computer stores”): Austin (US), London (GB), Toronto (CA). The test checks engine coverage, correct country code, local phone format and email extraction — not volume and not “unlimited speed”.

---

## 1. Why this matters

The country flag already changes which engines run. It must also change the words the operator sees:

| Country | Wrong today | Correct |
|---|---|---|
| Canada | State → District → Mandal | Province → Census division → City |
| United Kingdom | State → District → Mandal | Nation → County → Town |
| United States | State → County → City | already correct |
| France | Region → District → City | Region → Department → Commune |
| Japan | Region → District → City | Prefecture → City or district → Ward |
| UAE | Emirate → Municipality → Area | already correct |
| India | State → District → Mandal | correct, but Taluka/Tehsil states should say so |

A wrong label is not cosmetic: it changes what the user types into the scope box, and therefore which places the sweep covers.

---

## 2. Data model

New file: `server/src/services/localBrain/adminDivisions.js`

```js
{
  code: 'CA',
  top: 'Province',
  second: 'Census division',
  local: 'City',
  subdivision: 'Census divisions',
  levels: ['Province', 'Census division', 'City']
}
```

- `top` = first-level division (state, province, region, emirate, governorate, oblast…)
- `second` = second-level (county, district, department, prefecture…)
- `local` = the searchable settlement (city, town, commune, ward, suburb…)
- `subdivision` = plural used in coverage sentences (“12 of 15 counties”)
- `levels` = ordered labels for the UI breadcrumb

Fallback for countries without a curated entry: `Region → District → City`.

### 2.1 India, state-aware

`indiaSubdivisionTerm(state)`:

| State group | Word |
|---|---|
| Andhra Pradesh, Telangana | Mandal |
| Maharashtra, Gujarat, Karnataka, Goa | Taluka |
| Tamil Nadu, Kerala | Taluk |
| Uttar Pradesh, Madhya Pradesh, Rajasthan, Chhattisgarh, Uttarakhand, Himachal Pradesh, Punjab, Haryana | Tehsil |
| Bihar, Jharkhand, West Bengal, Odisha, Assam and most north-eastern states | Block |
| Default | Mandal / Taluka / Tehsil |

The UI shows the plural and the alternative words so an operator from any state recognises the box.

---

## 3. API contract

`GET /api/sources?country=CA` gains:

```json
{
  "country": "CA",
  "engines": ["openstreetmap", "maps", "google-local-finder", "web-discovery", "web-contact"],
  "admin": {
    "top": "Province",
    "second": "Census division",
    "local": "City",
    "subdivision": "Census divisions",
    "levels": ["Province", "Census division", "City"]
  }
}
```

`GET /api/sources` (all countries) includes the same `admin` block in each coverage row, so the Master coverage dashboard can render it without extra calls.

`GET /api/admin-divisions` returns the whole table (used by tests and future clients).

---

## 4. Frontend — how every country is shown

The country is not a dropdown buried in settings. It is the first thing a user
sees, and it changes the words, the engines and the examples on every screen.

### 4.1 Design direction (minimal, professional, advanced)

- **One accent colour per state**: India uses saffron/green; the rest of the UI
  uses a single cool accent. No rainbow gradients on data surfaces.
- **Calm density**: 12-column grid, 8px spacing scale, 14–15px body text,
  numbers in a tabular font. Fewer borders, more whitespace.
- **One hero metric per screen**, then supporting rows. Operators scan, not read.
- **Country context is always visible** in a compact chip: flag · country ·
  phone code · hierarchy.
- **Motion only for state changes** (panel open, result arrive), never looping
  decoration.
- **Dark and light both first-class**; no pure black, no pure white.

### 4.2 Landing page

| Block | Content |
|---|---|
| Hero | “Find any business, in any country. No API keys.” Sub-line: mobiles, emails, addresses and Maps from 245 countries. India-first. |
| Country ribbon | A slow, hover-pausable row of flags. India is larger and labelled HOME. Clicking opens the full 245-country grid. |
| Coverage strip | `245 countries · 5 global engines · 9 in India · 0 keys · 0 accounts` |
| Country cards | Six featured markets (IN, US, GB, CA, AU, AE) each showing its real hierarchy and one live example city. |
| Engine matrix | India bundle vs global bundle, blocked sources shown as blocked. |
| Honest note | “Sites set their own rate limits. We cache, dedupe and run independent sources in parallel.” |
| CTA | “Search India” (primary) and “Choose another country” (secondary). |

Copy rules:
- Never say “unlimited”, “bypass” or “scrape anything”.
- Say “245 countries”, not “worldwide” alone — the number is the proof.
- Every country card shows the hierarchy so the promise is concrete.

### 4.3 Client dashboard

| Area | Change |
|---|---|
| Header | Compact country chip: flag, name, ISO code, phone code, hierarchy. Click opens the country grid. |
| Country flag strip | Under the selected country, show the hierarchy, e.g. `Province → Census division → City`. Featured India card shows `State → District → Mandal / Taluka / Tehsil`. |
| Scope picker | Labels come from `admin`; India swaps Mandal/Taluka/Taluk/Tehsil/Block by state. |
| Placeholder | Follows country + scope (`e.g. Ontario`, `e.g. Greater London`, `e.g. Guntur District`). |
| KPI row | Leads, mobiles, emails, websites, blocked sources — five numbers, no more. |
| Source panel | Running vs blocked, with the honest rate-limit note. |
| Results | Country-correct phone format, currency and map centre; address breadcrumb uses the local words. |
| Empty states | “No leads yet in Ontario” not “No leads yet in this district”. |
| Export | Includes country, ISO code, E.164 phone and currency. |

Client rule: if the API has not answered yet, fall back to the current labels
rather than showing an empty box.

### 4.4 Dashboard visual system

- **Layout**: sticky country/context bar → KPI row → map + results split →
  source status rail. On mobile the rail collapses under the map.
- **Cards**: 1px low-contrast border, 12–16px radius, no drop shadow on every
  card. Shadow only for overlays.
- **Tables**: zebra-free, 44px rows, sticky header, right-aligned numerics.
- **Country drawer**: searchable 245-country grid with flag, name, ISO code,
  phone code and hierarchy. India pinned first with a HOME badge.
- **Coverage view**: one row per country, `adminPath` under the name,
  running/blocked counts as two honest numbers.
- **Status colours**: green running, amber throttled, grey untested, red
  blocked. Never green for a blocked source.
- **Accessibility**: focus ring on every interactive element, 4.5:1 contrast,
  keyboard-navigable country grid, `aria-label` on flags.

---

## 5. Master changes

| Area | Change |
|---|---|
| Launchpad heading | `State · District · Mandal · City` becomes the country's own chain |
| Scope buttons | Labels and hints come from `admin` (e.g. `Province`, `Census division`, `City`) |
| Place label / placeholder | Follows the selected scope and country |
| Coverage sentence | Uses `subdivision` (“12 of 15 census divisions”) |
| Sweep plan | Scope ids stay stable (`state`, `district`, `mandal`, `city`); only the display words change, so saved runs keep working |

Master rule: scope **ids** are internal and never localised. Only labels are.

---

## 6. Test matrix

### 6.1 Unit / contract tests (no network)

| Test | Expected |
|---|---|
| Every one of the 245 countries has admin terms | no gaps |
| US | State → County → City |
| GB | Nation → County → Town |
| CA | Province → Census division → City |
| FR | Region → Department → Commune |
| JP | Prefecture → City or district → Ward |
| AE | Emirate → Municipality → Area |
| IN | State → District → Mandal / Taluka / Tehsil |
| India state words | AP → Mandal, MH → Taluka, UP → Tehsil, TN → Taluk |
| API `/api/sources?country=CA` | returns the CA hierarchy |
| No client/master file hardcodes “Mandal” as the only Indian word | fallback includes Taluka and Tehsil |

### 6.2 Live smoke test (small, one city each)

| Market | City | Query | Pass condition |
|---|---|---|---|
| US | Austin, Texas | computer stores | country `US`, phones `+1`, no `+91`, engines = 5 |
| GB | London | computer stores | country `GB`, phones `+44`, no `+91`, engines = 5 |
| CA | Toronto, Ontario | computer stores | country `CA`, phones `+1`, no `+91`, engines = 5 |

Rules:
- One page per engine, low page cap, no grid sweep.
- A consent wall or 429 is recorded as **blocked/throttled**, not as a failure of the app.
- Success is measured on **correct country context + at least one usable contact**, not on lead count.

---

## 7. Rollout order

1. Write this plan.
2. Add `adminDivisions.js` with the 245-country table and India state words.
3. Wire terms into `COUNTRIES` at load.
4. Extend `/api/sources` with the `admin` block and add `/api/admin-divisions`.
5. Update Client flag strip + scope labels.
6. Update Master launchpad + coverage wording.
7. Update the landing page: 245-country hero, country ribbon, coverage strip,
   featured country cards with their real hierarchies.
8. Apply the minimal-professional dashboard pass (header chip, KPI row,
   source rail, country drawer, coverage view).
9. Add `scripts/verify/admin-divisions.test.cjs`.
10. Run the US/UK/CA computer-store smoke test.
11. Build both apps, restart the server, run all gates, commit.

---

## 8. Definition of done

- [x] All 245 countries return admin terms.
- [x] India returns State → District → Mandal / Taluka / Tehsil, and state-specific words.
- [x] Canada, UK, US, France, Japan, UAE show their real hierarchy in the API.
- [x] Client and Master display the selected country's hierarchy.
- [x] Master scope buttons and coverage sentences use the same words.
- [x] Landing page states 245 countries, shows the country ribbon and each
      featured country's real hierarchy.
- [x] Dashboard header always shows flag, country, phone code and hierarchy.
- [x] Source status colours are honest (blocked is never green).
- [x] Admin tests pass (`admin-divisions.test.cjs`, 24/24).
- [x] US/UK/CA computer-store smoke test records country-correct phones and emails, and reports any blocked engine honestly.
- [x] Both apps build; server healthy.

### Smoke test result (2026-11-16, live)

`node scripts/verify/computer-store-smoke.cjs` — one city per country, one OSM
pass each, isolated temp data dir.

| Country | City | Admin path | Engines | Leads | Phones | +91 leaks | Wrong prefix |
|---------|------|------------|---------|-------|--------|-----------|--------------|
| US | Austin | State → County → City | 5 | 4 | 2 | 0 | 0 |
| GB | London | Nation → County → Town | 5 | 16 | 12 | 0 | 0 |
| CA | Toronto | Province → Census division → City | 5 | 21 | 21 | 0 | 0 |

What this proves: the country bundle, the country's own hierarchy, real
businesses with real contact data, and local phone parsing (`+1`, `+44`).

What it does not prove: volume, speed or "no rate limits". Those are set by the
sites themselves.

Two honest findings from this run:

1. **The whole public Overpass network was unreachable from this network**
   (`overpass-api.de` 502, the other mirrors timed out). The engine now tries
   three mirrors with a 10-minute cooldown per dead host, then falls back to
   **Nominatim** — the same OSM data behind a different keyless service — using
   the city's real bounding box. Coverage is narrower than Overpass but the
   fields are identical, and the log names which path answered.
2. **A real bug was found and fixed while testing:** `Number(null) === 0`, so
   any call without coordinates silently searched lat/lng `0,0` in the Gulf of
   Guinea and returned nothing. The centre check now rejects null/empty values
   instead of coercing them.
