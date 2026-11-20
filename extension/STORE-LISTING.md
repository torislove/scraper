# Chrome Web Store submission pack

Everything below is written to be pasted straight into the Chrome Web Store
Developer Dashboard. It is the replacement for the old "download a ZIP and use
Developer mode" flow, which is not a distribution channel.

---

## 1. Single purpose statement

> **RAM Turbo lets Scraper.co.in read public business-directory and map pages
> through the user's own browser instead of a shared datacenter.** It fetches
> the exact page the server asks for, returns the raw HTML, and does nothing
> else.

This must be one sentence. The store rejects listings whose purpose spans
several unrelated features.

---

## 2. Permission justifications

| Permission | Why it is needed | What it does **not** do |
|---|---|---|
| `storage` | Remembers the server address, the user id, the relay counter and the last error, so the extension stays paired after a browser restart. | Does not store page content, history, or personal data. |
| `alarms` | Keeps a 30-second heartbeat alive so the server knows the extension is connected even when no Scraper tab is open. MV3 service workers are evicted after ~30 s idle, so a timer would not survive. | Does not wake the browser for advertising or analytics. |
| `scripting` | Reads `document.documentElement.outerHTML` from the **single background tab the extension itself created** for a render ticket. | Cannot touch a tab the user is looking at. Cannot inject into existing tabs. |
| `host_permissions` (search, maps, directories, geo) | These are the exact sites the server's engines read. The extension must be allowed to request them so the fetch happens from the user's IP. | No access to banking, email, social feeds, or any site outside the list. |

### Host permission list (as shipped)

Search: `bing.com`, `duckduckgo.com`, `search.brave.com`
Maps: `google.com`, `google.co.in`, `google.co.uk`, `google.ca`,
`google.com.au`, `google.ae`, `google.com.sg`, `google.co.nz`,
`google.co.za`, `google.ie`, `google.de`
Directories: `justdial.com`, `indiamart.com`, `yelp.com`, `yelp.ca`,
`yelp.com.au`, `yellowpages.*` (US/CA/AU/ZA/AE/SG), `yellow.co.nz`, `yell.com`,
`cylex.*`, `freeindex.co.uk`, `goldenpages.ie`, `trustpilot.com`,
`weddingwire.com`, `weddingwire.in`, `weddingbazaar.com`, `mandap.com`
Geo: `openstreetmap.org`, `overpass-api.de`, `wikidata.org`
Own origin: `scraper.co.in`

`optional_host_permissions: https://*/*` exists only for the opt-in
"also read business websites it finds" switch in the popup. It is never
requested automatically.

---

## 3. Remote code declaration

> **No remote code.** All JavaScript is bundled in the uploaded package. The
> extension never loads scripts from a server, never uses `eval`, and never
> injects a remote bundle. The server sends only URLs and signed ticket ids;
> the extension returns raw response bytes.

This is the single most common rejection reason for scraper-adjacent
extensions, so it is stated explicitly in the listing too.

---

## 4. Data usage disclosure (dashboard checkboxes)

| Category | Answer | Note |
|---|---|---|
| Personally identifiable information | **No** | The extension never reads names, emails or accounts. |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | No | It never reads cookies for third-party sites (`credentials: 'omit'`). |
| Personal communications | No | |
| Location | No | The user's IP is used by the remote site, as with any browser request; the extension does not collect or transmit geolocation. |
| Web history | **No** | It does not read the user's tab list, URLs or history. |
| User activity | No | |
| Website content | **Yes — limited** | It returns the raw HTML of pages the server requests, which is the extension's entire purpose. This is disclosed. |

Certify all three required statements: not sold to third parties, not used for
unrelated purposes, not used for creditworthiness.

---

## 5. Store listing copy

**Name (45 char max):**
`Scraper.co.in — RAM Turbo`

**Short description (132 char max):**
`Find local business leads faster. Scraper.co.in reads public directory pages through your own connection. No passwords, no history.`

**Detailed description:**

```
RAM Turbo is the optional browser companion for Scraper.co.in, a local business
lead finder covering 11 countries.

WHAT IT DOES
Scraper.co.in searches public business directories, map listings and search
results to build a clean list of local businesses with phone numbers. Most of
that work runs on our servers. RAM Turbo lets those servers read the pages
through your own internet connection instead of a shared datacenter, which
means fewer blocks and faster results for you.

WHAT IT NEVER DOES
• It does not read your other tabs, your browsing history, or your passwords.
• It does not see your logins. Every request is made with credentials omitted.
• It does not collect personal data, and it does not send anything to third
  parties.
• It does not run in the background for advertising. It wakes on a 30-second
  heartbeat and on the pages you search.

HOW IT WORKS
1. You search in Scraper.co.in.
2. Our server decides which public page to read and issues a short-lived,
   signed ticket — valid for 30 seconds and usable once.
3. The extension fetches that page from your browser.
4. Our server reads the page. All parsers, selectors and geo data stay on the
   server; the extension contains none of them.

WHY IT ASKS FOR SITE ACCESS
The permission list is the exact set of public directories and map sites our
engines read: search engines, Google Maps for 11 countries, JustDial,
IndiaMART, Yelp, Yellow Pages, Cylex, FreeIndex, Golden Pages, Trustpilot,
WeddingWire, WeddingBazaar, Mandap, OpenStreetMap and Wikidata.

You can remove the extension at any time and Scraper.co.in keeps working
through our servers.
```

**Category:** Productivity
**Language:** English

---

## 6. Screenshots to upload (1280×800)

1. Command Center with the RAM Turbo card in the **connected** state.
2. The popup showing `16 GB · 8 cores`, `CONNECTED`, and the page counter.
3. A live leads table with phone badges (redact numbers).
4. The permission dialog as Chrome renders it (blur personal details).
5. The "what it never does" card from the landing page.

Promotional tile: 440×280, emerald pin on white, wordmark "Scraper.co.in".

---

## 7. Review notes (paste into "Notes for the reviewer")

```
Test account: review@scraper.co.in / (password supplied in the reviewer field)

1. Sign in at https://app.scraper.co.in
2. Install the extension.
3. Reload the page. The header pill changes to "RAM TURBO · 0".
4. Search "Photographers in Troy" with country US.
5. The popup's "PAGES RELAYED" counter increases, and leads appear.

The extension performs plain HTTP fetches and, for JavaScript-rendered
directories, opens one hidden tab that it closes immediately. It returns
document.documentElement.outerHTML to our server, which parses it. No selectors
or parsing logic exist in the package.

Source of truth for permissions: manifest.json in the uploaded zip.
Privacy policy: https://scraper.co.in/privacy
```

---

## 8. Pre-submission checklist

- [ ] `manifest.json` version bumped (`1.1.0`)
- [ ] Icons present at 16 / 32 / 48 / 128
- [ ] `node scripts/verify/relay-hub.cjs` passes
- [ ] `npm run build` clean in `client` and `master`
- [ ] Privacy policy mentions the extension and its data handling
- [ ] Screenshots captured at 1280×800
- [ ] `VITE_EXTENSION_STORE_URL` set in the web build after approval
- [ ] `EXTENSION_STORE_URL` set on the server so `/extension-status` returns it
- [ ] `EXTENSION_RELAY_SECRET` set in production (not the dev fallback)
- [ ] ZIP endpoint demoted to developer-only; no user-facing ZIP copy remains

---

## 9. What happens after approval

1. Copy the store URL.
2. Set `VITE_EXTENSION_STORE_URL` in `client/.env` and `master/.env`, rebuild.
3. Set `EXTENSION_STORE_URL` in the server environment / `k8s/configmap.yaml`.
4. The landing page, Command Center card and 428 error all switch to
   "Add to Chrome" automatically. No code change.
