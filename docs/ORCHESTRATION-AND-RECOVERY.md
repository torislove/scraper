# Orchestration & Recovery

What survives a restart, what is resumed, and what is intentionally archived.
This is the contract behind "the engine restarted and my work is still there".

## The three work types

| Work | Owner | Durable state | After a restart |
|------|-------|---------------|-----------------|
| Search / sweep zones | `server/src/utils/queue.js` | `server/data/jobs.json` (atomic, temp+rename) | Pending zones resume automatically on boot |
| Deep-profile batches | `server/src/services/deepProfileService.js` | `server/data/deep-profile-jobs.json` | Job appears as `interrupted` with a **Resume remaining** action |
| Live dashboards | `server/src/services/liveStreams.js` | none (stateless) | Clients reconnect on their own (see `CONNECTIVITY-AND-RECONNECT.md`) |

## Queue (city search, master sweeps)

- `initQueue()` is idempotent: double-loading the module cannot start two resume
  timers or replay `jobs.json` twice.
- Every write goes to `jobs.json.tmp` and is renamed over `jobs.json`, so a
  crash can never leave a half-written file.
- A corrupt queue file is quarantined (`jobs.corrupt-<timestamp>.json`) instead
  of silently dropping the run.
- Zone results are written through `vendorStore`, so the sweep can be killed at
  any point without losing the leads it already found.
- `GET /api/scrape/engines/status` → `queue.pendingJobs` / `queue.activeWorkers`
  is the truth about whether work is still in flight.

## Deep-profile jobs

Previously these lived only in memory: a restart erased the ledger and the
queued batch, and the customer had to queue it again.

- A compact job record is written after creation, on every few completions
  (400 ms debounce), and on every terminal transition.
- `pendingIds` is the exact remainder. A vendor that was mid-extraction when the
  engine died stays pending, so a resume cannot silently drop it.
- On boot every `queued` / `running` / `stopping` record becomes `interrupted`
  with `stopReason: "engine_restart"`, and `resumable: true` when work remains.
- `POST /api/deep-profile/jobs/:id/resume` starts a **new** job over the
  remaining vendors and links it with `resumedFrom`. Returns `202` when a new
  attempt was queued, `200` when there was nothing left to do.
- The UI (both apps) shows "stopped by an engine restart" and a
  **Resume remaining** button in the job ledger.
- Per-vendor profiles were already file-backed under
  `server/data/deep_profiles/`, so completed work is never repeated by a resume.

## Ownership, archives and deletion

- Only the process holding `server/data/.store.lock` may write the lead store.
- Destructive paths take a backup first: rolling
  `scraped_vendors.backup-*.json`, `vendors.journal.jsonl` replay, and the
  reset archive (`server/data/reset-archive-*`) are recovery sources.
- Deleting a folder removes a lead only when no other session owns it and the
  CRM has not engaged it; rejected / out-of-bound rows are archived
  (`server/data/deleted_leads.jsonl`, Out-of-Bound vault), never silently
  dropped.

## Verifying a change

Start the engine and the two dev servers, then:

```powershell
# 1. queue + orchestration health
curl http://127.0.0.1:5002/api/scrape/engines/status

# 2. deep jobs survive a kill/restart and can be resumed (real kill/restart)
node scripts\verify\deep-jobs-durability.cjs

# 3. dashboard reconnects on its own (real Chromium, real restart)
node scripts\verify\browser-connectivity.cjs http://127.0.0.1:5174/command
node scripts\verify\browser-connectivity.cjs http://127.0.0.1:5173/command
```

`browser-connectivity.cjs` needs Playwright's Chromium (installed with the
engine's WhatsApp browser); it writes screenshots next to the script.
