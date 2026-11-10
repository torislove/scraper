# Security, Ban-Avoidance & Data Durability

This document describes the protections added to the Scraper engine. It is
written for two readers: whoever operates the app, and whoever maintains the
code later.

Everything here works **locally**. The engine is a service on the customer's
own machine. No third-party service, no account, no API key, no cloud.

---

## 1. Who can talk to the engine

The desktop build serves the app and the API from one loopback address. The
only correct behaviour is to answer that machine and nothing else.

| Guard | Behaviour |
| --- | --- |
| Host guard | A request whose `Host` header is not `localhost`, `127.x`, `::1`, a private LAN range, or a `.local` name is rejected with **421**. This blocks DNS-rebinding pages. |
| Origin guard | A request with a public `Origin` is rejected with **403**. A random website the customer visits cannot read their leads. Loopback and private origins are allowed. |
| CORS | Allow-list only. Credentials are never echoed. |
| `SCRAPER_ALLOW_REMOTE=1` | Explicit opt-out for a deliberate LAN/share deployment. Off by default. |

Implementation: `server/src/middleware/security.js`.

---

## 2. Headers and transport

Every response carries:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` with camera, microphone and payment disabled
- `Cross-Origin-Resource-Policy: same-origin`
- A Content-Security-Policy that only allows the bundled app (`script-src 'self'`,
  no `eval`, no external asset host)

`X-Powered-By` is disabled. The HTTP server has bounded header time, request
time, keep-alive, and header count, plus a clean `clientError` handler. A stuck
local client cannot hold a socket forever.

---

## 3. Abuse limits

| Limiter | Window | Cap |
| --- | --- | --- |
| API ceiling | 60 s | 2,400 calls |
| Write calls | 60 s | 240 |
| Search start (`/omni`, `/master-sweep`, `/batch`, …) | 60 s | 30 |
| Log streams | — | 25 concurrent; 50 session streams; 10 viewers per run |

Requests over a limit get **429** with `Retry-After`. This is about protecting
the process from a runaway tab, not about limiting the customer.

---

## 4. Input hygiene

- Control bytes are stripped from request strings.
- Strings are capped at 200,000 characters; arrays at 500 items; objects at 500
  keys; nesting at 8 levels.
- JSON bodies are capped at **10 MB**, form bodies at **2 MB**. Older builds
  allowed 100 MB, which is enough to exhaust a laptop.
- Malformed JSON returns **400**, oversized bodies **413**. Neither is logged as
  a server crash any more.

---

## 5. Uploads

`server/src/routes/upload.js`:

- Random server-side filename (`<timestamp>-<16 hex><ext>`). The client's
  original name is never used, so `../../evil.png` cannot escape the folder.
- MIME allow-list: PNG, JPEG, WebP, GIF. Everything else gets **415**.
- 8 MB file cap, one file, ten fields.
- Static serving has no directory index and denies dotfiles.
- Both `/api/upload` and `/api/uploads` are mounted, so older saved avatars keep
  working.

Verified:

```
origin=evil.example      → 403
host=evil.example        → 421
11 MB JSON body          → 413
text/plain upload        → 415
filename ../../evil.png  → stored as 1794324740657-0bfb64092629af74.png
/api/uploads/<file>      → 200
/api/upload/<file>       → 200
```

---

## 6. Route-gate parity

`/api/api/scrape` is a legacy alias. It used to skip the licence gate and the
suspended-client gate, which made the alias a bypass. It now carries the exact
same middleware as `/api/scrape`.

---

## 7. Ban avoidance without evasion

`server/src/utils/requestGuard.js` controls **when** a planned job may start. It
never changes what is requested, never rotates identity, never solves a
challenge.

| Mechanism | Behaviour |
| --- | --- |
| Pacing | Minimum start-to-start gap per engine, plus random jitter so five browser slots never fire in lockstep. |
| Cooldown | A CAPTCHA, `/sorry`, 403, 429, "unusual traffic" or rate-limit answer puts that engine to sleep. Each repeat block doubles the rest, capped per engine (10–30 min). |
| Defer | A short cooldown delays the job (`notBefore`), using one timer rather than a busy loop. |
| Skip | A cooldown longer than 45 s skips that job for this run, logs the reason, and lets every other engine finish the zone. |
| Reset | A clean run clears strikes and cooldown. |
| Transparency | `/api/scrape/engines/status` returns `resilience` with per-engine cooldown state. The live log explains every rest. |

The guard is called only after a worker slot is free, so pacing is never
consumed by a job that could not run anyway.

**What this is not:** no proxy rotation, no user-agent spoofing, no CAPTCHA
solving, no unauthorised access. If a service says stop, the engine stops
calling it for a while and uses the other sources.

---

## 8. Data can not silently disappear

The lead store is the most valuable thing the app owns. Five independent layers
protect it:

1. **Atomic snapshot.** `scraped_vendors.json` is written to a temp file and
   renamed over the old one. A crash leaves either the old file or the new one,
   never half of each.
2. **Journal.** New rows are appended to `vendors.journal.jsonl` before the
   snapshot. A crash replays the journal on the next boot.
3. **Empty-write guard.** A loaded store with rows can never be replaced by an
   empty array unless the caller explicitly forces it.
4. **Corrupt-file rescue.** Unparseable JSON is copied to
   `scraped_vendors.corrupt-<ts>.json`, then the store heals from search folders
   and backups.
5. **Rolling backups.** A full copy is written at boot and then at most hourly:
   `scraped_vendors.backup-<timestamp>.json`, twelve kept. Backups are now
   actually created; previously the heal code could read them but nothing wrote
   them.

### 8.1 Folder delete no longer destroys shared leads

Search results are shared. A repeat search appends the new session id to a row
that already belonged to earlier runs. The old delete rule removed every row
whose `sessionIds` contained the deleted folder — including rows other folders
still owned.

The rule is now:

| Situation | Result |
| --- | --- |
| Row is owned by the deleted folder **and** others | Folder id is removed, row is kept (`sharedKept`) |
| Row is owned only by the deleted folder, CRM-engaged | Row is kept, dead folder pointer cleared (`engagedKept`) |
| Row is owned only by the deleted folder, untouched | Row is removed — but archived first |

### 8.2 Recovery bin

Every removed row is appended to `deleted_leads.jsonl` (rotated at 8 MB) with
its reason and the folder it came from. This happens on **every** path that can
drop a lead: single delete, folder delete, clear-all and prune. It can be
restored individually.

```
GET  /api/sessions/trash?limit=50
POST /api/sessions/trash/restore
     { "ids": ["vendor-id", ...], "sessionId": "optional-folder" }
```

The pre-delete full backup is written before the store changes, so a bad merge
can also be rolled back at the file level.

### 8.3 Verified end-to-end

Two identical searches, then delete the second folder:

```
store before          601
after run 1           635   (28/28 zones)
after run 2           641
delete folder 2       removed 6, sharedKept 38
store after delete    635   ← run 1's leads intact
archive               6 rows
restore 6 rows        641
```

Before the fix the same delete removed 44 rows and dropped the store to 597.

---

## 9. Failures are visible, not fatal

- `uncaughtException` and `unhandledRejection` are written to a bounded
  `server/error_crash.log` (kept under 1 MB). The process keeps serving.
- 4xx responses are no longer recorded as 500s.
- The queue logs a skipped/rescheduled job with its reason.
- `/api/health` reports store ownership (`readOnly`, `ownerPid`), so a second
  engine believing it owns the same file is immediately visible.

---

## 10. Operational notes

- Only the process named in `server/data/.store.lock` may write the store.
  A second engine runs read-only instead of corrupting data.
- `node index.js` inside `server/` is the single way to start the engine. Never
  run two.
- If the app is ever exposed beyond the machine on purpose, set
  `SCRAPER_ALLOW_REMOTE=1` and understand that the guards above are then the
  only boundary.
