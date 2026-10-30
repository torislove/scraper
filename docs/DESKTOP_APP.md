# Scraper for Windows — desktop edition

The desktop app is a **separate product from the website**. It ships the same
engine and the same cockpit, but:

- it boots **straight into `/command`** — there is no landing page, no pricing
  page, no sign-in screen;
- every lead, folder and CRM record lives on the customer's PC;
- scraping runs on the customer's own IP with their own Edge/Chrome;
- access is governed by a signed subscription licence.

The web app is unaffected: `client/dist` keeps the marketing site at `/`.

---

## 1. Architecture

```
Scraper.exe  (Electron)
├── main process
│   ├── licence manager      desktop/src/license/*      Ed25519 tokens
│   ├── engine supervisor    desktop/src/serverManager  spawn + health + kill
│   ├── updater              desktop/src/updater        electron-updater
│   └── windows              splash → cockpit, activation window
│
└── child process: resources/server/index.js
    spawned as:  Scraper.exe <server/index.js>   (ELECTRON_RUN_AS_NODE=1)
    binds:       127.0.0.1:<ephemeral>   announces `[ready] {"port":N}`
    serves:      /api/*  +  resources/client-dist  (same origin, no CORS)

user data:  %APPDATA%\Scraper\
            ├── data\      vendors.json, deep profiles, caches
            ├── db\        session folders, village index
            ├── logs\      desktop.log, engine output
            └── license.json   DPAPI-encrypted activation
```

**Why the engine is a child process.** Playwright must launch a real browser and
the engine holds ~50–100 MB of indexes. Keeping it out of the Electron main
process means the window stays responsive, a crashed scrape never freezes the
UI, and "Engine → Restart" is a real restart.

**Why the SPA is served by the engine.** Same-origin requests mean no CORS
preflight, no `file://` restrictions, and the desktop and web builds share one
API client. The window loads `http://127.0.0.1:<port>/command`.

**No bundled Chromium.** `server/src/scrapers/browserFactory.js` uses the
customer's installed Edge (`channel: 'msedge'`, falling back to Chrome) so the
installer stays ~150 MB smaller and the browser looks and behaves like a normal
user's. Windows 10/11 always has Edge.

---

## 2. Layout

```
desktop/
├── electron-builder.yml     packaging + GitHub publish config
├── package.json             scripts, electron-builder deps
├── build/
│   ├── icon.png             512px source used by electron-builder
│   ├── icon.ico             generated multi-resolution icon
│   └── make-icon.ps1        regenerates both from vector drawing
├── renderer/
│   ├── splash.html          shown while the engine boots
│   ├── license.html/.js     activation window
│   └── license-preload.js   IPC bridge for that window only
├── src/
│   ├── main.js              lifecycle, windows, IPC
│   ├── preload.js           window.scraperDesktop bridge
│   ├── config.js            plans, public key, free credits
│   ├── paths.js             every writable location
│   ├── serverManager.js     spawn / health / kill-tree
│   ├── updater.js           auto-update state machine
│   ├── menu.js              File / Edit / View / Engine / Help
│   └── license/
│       ├── index.js         credits + activation state machine
│       ├── credits.js       ledgers, free grant, spend/release
│       ├── token.js         Ed25519 verification
│       ├── store.js         DPAPI-encrypted cache
│       └── machine.js       stable device id
└── license-server/          separate Node service (not shipped)
    ├── index.js             activate / validate / admin / webhook
    ├── mint.js              offline keys and .scraperlic files
    └── .keys/               Ed25519 key pair  (NEVER commit)
```

---

## 3. Development

Prerequisites: Node 20+, Windows, Edge installed.

```powershell
cd client   ; npm install
cd ..\server; npm install
cd ..\desktop; npm install

# if npm skipped the Electron binary download (npm 11 blocks postinstall):
node node_modules\electron\install.js
```

Run it:

```powershell
cd desktop
npm run dev
```

`npm run dev` rebuilds `client/dist-desktop` and launches Electron with
`ELECTRON_DEV=1`, which opens DevTools detached and allows devtools toggling in
the View menu.

Expected sequence on a clean profile: splash (~25–40 s while the village index
and geo engine load) → cockpit at `/command` with a **FREE / OUT OF CREDITS**
pill in the top bar. There is no trial window and no expiry: the app opens every
time, and only new searches stop when the credits run out.

The activation window is only shown when the free credits are exhausted (or a
key is already installed and needs attention).

Note: Electron cannot render in a headless/sandboxed CI session — `BrowserWindow`
creation aborts the process with `0xC0000005`. Verify the shell on a real
desktop.

### Build both bundles

```powershell
cd client
npm run build            # web   → client/dist          (landing page at /)
npm run build:desktop    # shell → client/dist-desktop  (redirects / → /command)
```

`build:desktop` runs Vite in `--mode desktop`, which loads `client/.env.desktop`
(`VITE_DESKTOP=1`). `client/src/desktop.js` reads that flag, and `App.jsx`
redirects `/` to `/command` when it is set.

### Verify the bundles without Electron

Start two engines, then run the smoke test:

```powershell
# web bundle
$env:PORT=5014; $env:SCRAPER_HOST='127.0.0.1'
$env:SCRAPER_CLIENT_DIST="$PWD\client\dist"
$env:SCRAPER_PROXY='off'
Start-Process node -ArgumentList 'index.js' -WorkingDirectory .\server -WindowStyle Hidden

# desktop bundle
$env:PORT=5013; $env:SCRAPER_DESKTOP='1'
$env:SCRAPER_CLIENT_DIST="$PWD\client\dist-desktop"
Start-Process node -ArgumentList 'index.js' -WorkingDirectory .\server -WindowStyle Hidden

node scripts\smoke-bundles.js
```

It asserts four things in headless Edge: web `/` shows the landing page, web
`/command` shows the cockpit without a licence pill, desktop `/` redirects to
`/command`, and desktop `/command` shows the cockpit **with** the pill.

---

## 4. Licensing

### Key model

Ed25519, two halves:

| half | where | purpose |
|---|---|---|
| private key | `desktop/license-server/.keys/private.pem` | signs tokens, lives only on your server |
| public key | `desktop/src/config.js` | verifies tokens, shipped inside the app |

The app can therefore verify a licence but never mint one. Deleting the
activation screen or patching the UI does not help, because the engine
re-verifies the token server-side (`LICENSE_ENFORCE=1`) on every scrape POST.

**Back up `.keys/private.pem` offline.** Losing it means every customer must
re-activate with a newly built app.

### States

| state | meaning | new searches |
|---|---|---|
| `credits` | free grant still has credits (1,000 once per device) | yes |
| `active` | valid signed token with credits | yes |
| `grace` | token expired, within 7-day grace | yes, with warning |
| `expired` | credits exhausted and no token | 402 `credits_exhausted` |
| `device_mismatch` | token bound to another PC | 402 |

The credit ledger and the encrypted token live in
`%APPDATA%\Scraper\credits.json` and `license.json` (DPAPI via `safeStorage`),
so copying them to another machine does not transfer the free grant. The ledger
is anchored in `HKCU\Software\Scraper` as well.

### Credits and plans

1 credit = 1 saved lead. The free grant is **1,000 credits once per desktop**,
never expires, and is never reset by reinstalling after the anchor exists.

| plan | credits | price |
|---|---|---|
| `starter` | 2,000 | ₹1,999 / month |
| `pro` | 10,000 | ₹3,999 / month |
| `agency` | 50,000 | ₹7,999 / month |

Credits are spent when a lead is saved and released if the run fails. The engine
checks the wallet before every new search and returns `402 credits_exhausted`
when the balance is zero; saved folders, notes and exports stay available.

### Online activation

```powershell
cd desktop/license-server
npm install
$env:ADMIN_TOKEN="long-random-value"
node index.js            # :8790
```

Mint a key and build the app pointed at the service:

```powershell
node mint.js --plan pro --days 30 --email client@agency.com

cd ..
$env:SCRAPER_LICENSE_API="https://licenses.yourdomain.com"
npm run dist
```

Without `SCRAPER_LICENSE_API` the build is offline-only.

### Offline activation

```powershell
node mint.js --plan pro --days 365 --email client@agency.com --out client.scraperlic
```

The customer opens **Manage subscription → Import licence file**. The file is
a signed token, so it verifies without any network access.

See `desktop/license-server/README.md` for the full API and the production
checklist.

### Server-side enforcement

`server/src/middleware/licenseGate.js` is a no-op unless
`LICENSE_ENFORCE=1`. The desktop shell sets it **always**, so removing the
activation window does not unlock the engine, and passes `SCRAPER_CREDITS_ENFORCE=1`,
`SCRAPER_FREE_CREDITS`, `SCRAPER_DEVICE_ID` and `SCRAPER_CREDITS_FILE` to the
engine. The web deployment and local development therefore stay completely open
(credits report `enforced: false`).

---

## 5. Data, and why nothing is ever lost

Every search writes an immutable session folder under
`%APPDATA%\Scraper\db\user_sessions\`. Folders are never overwritten or pruned
by an update, and `nsis.deleteAppDataOnUninstall` is `false`, so uninstalling
and reinstalling keeps every lead and CRM entry.

The installer excludes `server/data/**` and `server/db/user_sessions/**`, so no
development data ever ships to a customer.

| path | contents |
|---|---|
| `%APPDATA%\Scraper\data\` | vendor database, deep profiles, geocode cache |
| `%APPDATA%\Scraper\db\` | session folders, village index copies |
| `%APPDATA%\Scraper\logs\desktop.log` | shell + engine output, 5 MB rotating |
| `%APPDATA%\Scraper\license.json` | DPAPI-encrypted licence state |

Users reach these from **File → Open data folder / Open logs**.

---

## 6. Auto-updates

`electron-updater` with the GitHub provider (`torislove/scraper`). The publish
config is compiled into the installer as `app-update.yml`, so the app knows
where to look without asking the user.

Flow:

1. Bump `version` in `desktop/package.json`.
2. Commit, then push a tag:
   ```powershell
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. `.github/workflows/release.yml` builds the installer on `windows-latest` and
   publishes `Scraper-Setup-1.0.1.exe`, its blockmap and `latest.yml` to a
   GitHub Release.
4. Installed apps check 12 s after launch, then every 4 hours. Downloads are
   silent; the user gets a **Restart now / Later** prompt when the download
   finishes, and the pill in the cockpit switches to **UPDATE**.
5. **Help → Check for updates…** forces a check.

Requirements for this to work:

- the repository is public, or the release assets are reachable anonymously
  (electron-updater has no token in the packaged app);
- the GitHub Release is published, not a draft;
- `latest.yml` is uploaded with the `.exe` (the workflow's artifact step keeps
  a copy for inspection).

To point a build at a different feed for testing:

```powershell
$env:SCRAPER_UPDATE_FEED="https://example.com/scraper/"
```

---

## 7. Packaging

```powershell
cd desktop
npm run pack     # unpacked app in release/win-unpacked  (fast sanity check)
npm run dist     # NSIS installer in release/
npm run release  # build + upload to GitHub Releases (needs GH_TOKEN)
```

`predist` rebuilds `client/dist-desktop` automatically, so the installer always
contains the desktop flavour of the UI.

`asar: true` with `extraResources` for `server/` and `client-dist/` — the engine
is spawned as a real Node process and reads its own `.node` binaries and
Playwright browser channel from disk.

Installer properties: per-user install (`perMachine: false`), no elevation
required (`asInvoker`), selectable directory, desktop and Start-menu shortcuts,
and app data preserved on uninstall.

### Code signing

Unsigned installers trigger SmartScreen. For a paid product, buy an **EV code
signing certificate** (or an Azure Trusted Signing subscription) and set:

```powershell
$env:CSC_LINK="C:\path\to\cert.pfx"
$env:CSC_KEY_PASSWORD="..."
npm run dist
```

In CI, store the base64 p12 as `CSC_LINK` and the password as
`CSC_KEY_PASSWORD` repository secrets. `electron-builder` picks both up
automatically.

---

## 8. Microsoft Store notes

Two viable routes:

1. **Own installer, own billing (recommended).** Publish the NSIS installer on
   scraper.co.in, take payments yourself. No Store review, no commission, full
   control of the update channel.
2. **Store listing with your own commerce.** Registration is free for
   individuals (since Sept 2025) and companies (since May 2026). With your own
   payment provider the commission is 0%; with Microsoft commerce it is 15%.

Store blockers to plan for:

- **Policy 10.5** requires permission to use third-party services. A scraper
  that automates Google Maps is the main removal risk; document lawful use and
  user responsibility, or keep the Store build to a reduced feature set.
- An individual developer account **cannot** be converted to a company account
  later — register the company account up front if that is the end state.
- Store builds must update through the Store unless you ship the installer
  outside it; `electron-updater` should be disabled for the Store flavour.

---

## 9. Troubleshooting

| symptom | cause | fix |
|---|---|---|
| Window never appears, splash stays | engine failed to boot | check `%APPDATA%\Scraper\logs\desktop.log`; **File → Open logs** |
| "Engine stopped" dialog on launch | port bind failure or crash | **Engine → Restart scraping engine** |
| Activation window keeps returning | token invalid or device mismatch | re-import the `.scraperlic`, or use **Manage subscription** |
| 402 `credits_exhausted` | free grant spent and no plan credits | add a plan/key; folders and exports still work |
| 402 `subscription_required` | `LICENSE_ENFORCE=1` with an expired token | renew, then **Refresh licence** |
| Brand-new PC has no free credits | `credits.json` or the registry anchor was copied from another machine | issue a licence; the free grant is per device |
| Update never arrives | release is a draft, or repo is private | publish the release / make the repo public |
| Scrape is slow or captcha-heavy | engine is using proxies | desktop sets `SCRAPER_PROXY=off`; verify it was not overridden |

---

## 10. Release checklist

- [ ] `client/dist` rebuilt (web) and `client/dist-desktop` rebuilt (shell)
- [ ] `scripts\smoke-bundles.js` passes
- [ ] `desktop/package.json` version bumped
- [ ] licence-server deployed, `ADMIN_TOKEN` set, `data/licenses.json` on a volume
- [ ] `.keys/private.pem` backed up offline
- [ ] `SCRAPER_LICENSE_API` and `SCRAPER_CHECKOUT_URL` set in CI variables
- [ ] code signing certificate configured
- [ ] tag pushed, release published, installer downloaded and installed on a clean VM
- [ ] free credits → exhausted → activation window → cockpit verified on that VM
