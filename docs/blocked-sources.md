# Blocked and removed sources

This file is the honest record of sources that **cannot** be used without an API
key, an account, or bypassing a protection. They are removed from the country
bundle so the command center never lists a switch that does nothing.

Policy (approved 2026-11-18): after a fix window, an engine that still returns
nothing is removed from `INTERNATIONAL_ENGINES` in
`server/src/services/sources/registry.js` and recorded here. The engine file may
remain in the tree; it simply is not dispatched.

Verification method: a plain HTTP request with a desktop browser User-Agent, no
cookie jar, no JavaScript. If the source answers that with a challenge or 403,
it is not keyless-accessible and is not attempted.

---

## Removed

### Trustpilot — removed 2026-11-18

| Check | Result |
|---|---|
| `api.trustpilot.com/v1/business-units/search` | **403 Forbidden** (API key required) |
| `www.trustpilot.com/search?query=…` | **403 Forbidden** (bot protection) |

Trustpilot's search API is a keyed product. The public site blocks non-browser
clients. Both paths fail, so the engine could only ever return zero rows.

- Bundle: removed from `INTERNATIONAL_ENGINES`.
- Health board: listed as **paused** with this reason, so an operator who asks
  why it is missing gets an answer instead of silence.
- File: `server/src/scrapers/engine-trustpilot.js` is kept but not dispatched.

---

## Platform quirk: Bing requires the search-box path (fixed 2026-11-18)

Bing is not blocked, but it cannot be read with a forged URL from this network.
A plain `GET https://www.bing.com/search?q=…` is answered with an unrelated
cached page — a quote-of-the-day list, Hindi nursery-rhyme videos, or Indian
pizza chains — and Bing ignores `cc=` and `mkt=` because the edge node is Indian.
That silently poisoned every engine built on top of Bing:

| Engine | Symptom before the fix |
|---|---|
| Web Discovery | saved junk hosts as leads |
| TripAdvisor | found no `tripadvisor.*` URLs, so always returned 0 rows |
| Bing Places | discarded its Maps cards and fell back to the same junk |
| Social Dork (intl) | extracted phones from unrelated snippets |
| SERP phone enrichment | dorked the wrong page |

Typing the query into Bing's own search box and pressing Enter works: Bing sets
`form=QBLH`, a `cvid` and session cookies, and returns real local results.

- Fix: `server/src/scrapers/bingSearch.js` — one shared helper, driven through
  `browserFactory`, with a serialised queue (1.8 s minimum gap), a 5-minute cache
  and one polite retry. A second challenge is reported as `blocked: true`.
- Consumers: Web Discovery, TripAdvisor, Bing Places, Social Dork (intl),
  Social Dork (India). All of them now call `searchBingHtml()`.
- Removed: every forged `bing.com/search?q=` URL, including the one in the
  per-vendor SERP phone enrichment (that pass is DuckDuckGo-only now — the
  browser path is too heavy to run once per vendor inside a sweep).
- Measured: US · Troy, Michigan · "Photographers" → **17 rows in 3.3 s** across
  two pages, with real results (`speaklifephotography.com/troy/`, Yelp,
  Thumbtack).

---

## Verified alive (measured, not assumed)

`scripts/verify/engine-yield.cjs` runs every engine directly, outside the queue,
on one query. These were measured on 2026-11-18:

| Engine | Market | Query | Rows | Time |
|---|---|---|---|---|
| WeddingBazaar | IN | Vijayawada · Wedding Venues | **24** | 11.7 s |
| Mandap | IN | Vijayawada · Wedding Venues | **36** | 8.7 s |

Both engines short-circuit when the category is not a venue category
(`fidelity.isVenueCategory`). That is correct scoping, not a dead engine — a
caterer search must not return banquet halls. The health board now records the
skip reason as the run note, so `0 rows` is explained instead of looking broken.

---

## Under observation (still in the bundle, measured every run)

These are dispatched, but a block is reported honestly rather than hidden.

### Yelp — US, CA, AU

Plain HTTP request to `yelp.com/search` returns **403**. The engine uses a real
Playwright browser, which Yelp sometimes accepts. Verdict comes from
`scripts/verify/engine-yield.cjs`, not from guessing. If the measured yield is
zero after the fix window, it is removed here too.

### WeddingWire — IN, US, CA, GB, AU

The site serves a consent wall to automated sessions. The engine now detects the
wall (`WALL_PATTERNS` + `detectWall`) and aborts after two attempts instead of
the previous three, returning `skipped: 'blocked'` with a note. A wedding search
is therefore no longer delayed by an engine that will not answer.

### OpenStreetMap — all markets

The public Overpass instances (`overpass-api.de`, `overpass.kumi.systems`,
`overpass.private.coffee`) all time out from this network; only
`overpass.osm.ch` answers, and it holds Swiss data only. Nominatim fallback is
attempted and also times out. Reported as unavailable, never as zero leads.

### Brave Search

HTTP 429 rate limit from this network. Only runs when explicitly selected, never
in auto mode.

---

## Never attempted by design

| Source | Why |
|---|---|
| Google SERP (organic) | Consent/verify wall; Maps and Local Finder already cover the same places |
| IndiaMART | Bot page; bypassing it is against their terms |
| BBB (US/CA) | Blocked |
| Manta (US) | Untested, no verified access path |
| Canada411 | Untested, no verified access path |
| Thomson Local (UK) | Untested, no verified access path |

These remain listed in the registry with `access: 'blocked'` or
`access: 'untested'`, which excludes them from `enginesForCountry()` and
therefore from dispatch.
