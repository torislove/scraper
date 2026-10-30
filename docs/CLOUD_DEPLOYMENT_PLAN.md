# Cloud Deployment Plan — Firebase + GitHub Actions + Playwright

Status: **plan only, nothing in this document is deployed yet.**
Scope: let paying clients trigger a scrape from the browser, run Playwright in a
cloud worker, and receive verified mobile numbers in the existing
`scraper.co.in` command center.

---

## 1. Verdict

Yes, the architecture you described is technically buildable:

- Firebase hosts the React app, stores jobs/leads, authenticates clients and
  provides the API surface.
- A Firebase Function receives the client request and asks GitHub to start a
  workflow.
- The GitHub Actions runner installs Playwright, runs the scraper, and writes the
  results back to Firebase.
- The client watches Firestore in real time and the lead table/map update.

It works, but **GitHub Actions is the weakest part of the design** for a paid,
on-demand product. It is a CI system, not an application server:

| Constraint | GitHub-hosted runner | Impact |
|---|---|---|
| Cold start | 10–60 s before Playwright starts | Client sees "queued" for a long time |
| Max job time | 6 hours per job | Long district-wide scans must be chunked |
| Concurrency | 20 jobs (Free), 40–500 on paid plans | 21st client waits |
| Minutes | 2,000/month private repo (Free) | ~150–350 scrapes/month before overage |
| Network | Datacenter IPs, widely flagged | More CAPTCHAs than a residential IP |
| Inbound | No public port | Results must be pushed, never pulled |
| Durability | VM deleted after the job | All state must live in Firebase/Storage |
| Terms | Actions is for CI/CD, not general hosting | High-volume commercial use is a gray area |

**Recommendation (best results):**

1. **Primary:** Cloud Run Job (or Cloud Run service) in the same Google Cloud
   project as Firebase. Same container, same Playwright code, no 6-hour cap,
   no GitHub queue, supports concurrency and cancellation, ~$0 when idle.
2. **Fallback / budget mode:** GitHub Actions exactly as described here, for
   scheduled batch jobs and low-volume async requests.
3. **Never:** run Playwright inside a Firebase Function. The Chromium binary,
   cold starts and 1-minute default timeout make it unreliable.

The rest of this plan describes the GitHub Actions version you asked for, with
the Cloud Run swap kept as a one-line trigger change.

---

## 2. Target architecture

```
┌────────────────────────────┐
│  Client (React/Vite)       │
│  Firebase Hosting          │
│  Firebase Auth             │
└─────────────┬──────────────┘
              │ callable / HTTPS
┌─────────────▼──────────────┐
│  Firebase Functions (API)  │
│  - createScrapeJob         │
│  - cancelScrapeJob         │
│  - quota / tenant checks   │
│  - GitHub App token        │
└──────┬───────────────┬─────┘
       │ write job     │ POST workflow_dispatch { jobId }
┌──────▼──────┐   ┌────▼─────────────────────┐
│  Firestore  │   │  GitHub Actions runner   │
│  jobs       │◄──│  - node worker/run-job   │
│  vendors    │   │  - playwright chromium   │
│  folders    │   │  - existing scrapers     │
│  tenants    │   └────┬─────────────────────┘
└──────▲──────┘        │ upload CSV/JSON, raw profiles
       │               ▼
       │        ┌──────────────┐
       └────────│ Cloud Storage│
                └──────────────┘
       ▲
       │ onSnapshot (replaces SSE)
┌──────┴─────────────────────┐
│  Command Center UI         │
│  cockpit / leads / map     │
└────────────────────────────┘
```

Key rule: **the workflow receives only a `jobId`**. All query details, tenant
and limits live in Firestore, so secrets and payload size never leak into
workflow inputs (GitHub caps `workflow_dispatch` at 10 inputs and ~64 KB).

---

## 3. What must change in this repository

Today the engine is one Express process with in-memory state and local JSON.
The scrapers themselves are reusable; the orchestration around them is not.

### 3.1 Split the orchestrator from Express

Current coupling:

- `server/src/routes/scrape.js` contains HTTP handlers **and** the whole
  orchestration (`/auto`, `/omni`, sessions, SSE logging, vault persistence).
- `server/src/utils/queue.js` keeps `activeJobs` in a `Map` and `jobs.json`.
- `server/src/config/dbAdapter.js` and `localDb.js` write JSON files that
  disappear when a runner shuts down.
- `server/index.js` owns the SSE hub and log buffer.

Required refactor:

```
server/src/services/scrapeOrchestrator.js   ← framework-free runScrape(options)
server/src/services/jobStore.js             ← interface: create/update/append/finish
server/src/services/localJobStore.js        ← current JSON behaviour (dev)
server/src/services/firestoreJobStore.js    ← cloud behaviour (prod)
server/src/services/emitter.js              ← interface: log/progress/vendor
server/src/services/sseEmitter.js           ← current SSE (dev)
server/src/services/firestoreEmitter.js     ← batched Firestore writes (prod)
```

`runScrape({ jobId, category, location, strategy, targetLeads, store, emit })`
must not import `express`, `res`, or read `process.env.PORT`. The current
engines (`engine-google-places`, `engine-justdial`, `engine-google-serp-local`,
`engine-mandap`, etc.) already accept deps through `setDeps()`; keep that
pattern and inject the store/emitter.

### 3.2 Add the worker entrypoint

```
worker/run-job.js          # reads JOB_ID, fetches config, calls runScrape
worker/heartbeat.js        # 30 s heartbeat + cancel polling
worker/upload.js           # CSV/JSON + profiles to Cloud Storage
worker/package.json        # can reuse server deps; keep separate lockfile
```

The worker starts with `JOB_ID` from the workflow environment, not from argv,
so the command line never contains client data.

### 3.3 Client changes

- `client/src/v2/api.js`: add a cloud mode (`VITE_API_MODE=cloud`) that calls
  Firebase Functions instead of `axios` to `127.0.0.1:5002`.
- `streamUrl` / SSE in `server/index.js`: keep for local dev; in cloud mode use
  `onSnapshot(doc(db, 'jobs', jobId))` and
  `onSnapshot(query(collection(db,'tenants',tid,'vendors'), ...))`.
- `client/src/apiConfig.js`: stop hardcoding hosts; use
  `VITE_FUNCTIONS_REGION` + `VITE_FIREBASE_*` values.
- **Remove the hardcoded OLA Maps key from `client/vite.config.js`** and proxy
  that call through a Function. A key baked into `import.meta.env` is public.

---

## 4. Job contract

### 4.1 Create

`POST /createScrapeJob` (callable, authenticated):

```json
{
  "category": "wedding photographers",
  "location": "Vijayawada",
  "strategy": "smart",
  "targetLeads": 100,
  "clientRequestId": "uuid-from-browser"
}
```

Function validates category/location, checks the tenant quota, writes
`jobs/{jobId}` with `status: "queued"`, then dispatches the workflow. It
returns `{ jobId }` immediately.

### 4.2 Job document

```js
jobs/{jobId} = {
  tenantId, createdBy, clientRequestId,
  query: { category, location, strategy, targetLeads },
  status: 'queued' | 'dispatching' | 'running' | 'completed'
        | 'failed' | 'cancelled' | 'stale',
  phase: 'resolve' | 'scrape' | 'deep' | 'persist' | 'done',
  progress: { zonesDone, zonesTotal, leads, phones, deepDone, deepTotal },
  workflowRunId, workflowUrl,
  cancelRequested: false,
  error: null,
  createdAt, startedAt, heartbeatAt, finishedAt
}
```

### 4.3 Vendors and folders

```
tenants/{tenantId}/vendors/{vendorId}   // one doc per lead, deterministic id
tenants/{tenantId}/folders/{sessionId}  // folder header + counts + export paths
exports/{tenantId}/{sessionId}/leads.csv
exports/{tenantId}/{sessionId}/leads.json
profiles/{tenantId}/{sessionId}/{vendorId}.json   // large deep profile
```

`vendorId` = stable hash of `tenantId + normalisedPhone || fingerprint`, so a
retried job never duplicates a lead. Keep the rich fields exactly as today
(`server/src/services/deepProfileService.js` already guards names).

Firestore limits to design around: 1 MiB per document, 500 writes per batch.
Write vendors in chunks of 400; put reviews/raw HTML in Storage and keep a
reference in the doc.

---

## 5. GitHub Actions workflow

`.github/workflows/scrape.yml`:

```yaml
name: scrape-job
on:
  workflow_dispatch:
    inputs:
      jobId:
        description: Firestore job id
        required: true
        type: string

concurrency:
  group: scrape-${{ inputs.jobId }}
  cancel-in-progress: false

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 350
    permissions:
      contents: read
      id-token: write          # for Google WIF, no JSON key
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: npm ci --prefix server
      - run: npx --prefix server playwright install --with-deps chromium
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - run: node worker/run-job.js
        env:
          JOB_ID: ${{ inputs.jobId }}
          GOOGLE_CLOUD_PROJECT: ${{ secrets.GCP_PROJECT }}
          NODE_ENV: production
```

Notes:

- `timeout-minutes: 350` leaves a 10-minute buffer under the 6-hour hard cap.
- `concurrency` prevents duplicate retries of the same job.
- Workload Identity Federation avoids storing a long-lived service-account key
  in GitHub Secrets. If WIF is too much setup, a service-account JSON secret is
  acceptable for the pilot, then migrate.
- The workflow file must be on the default branch before dispatch works.
- `workflow_dispatch` requires a token with `Actions: write`; a fine-grained PAT
  or a GitHub App installation token. Prefer a GitHub App: the private key lives
  in Secret Manager and installation tokens expire in 1 hour.

---

## 6. Firebase setup

| Service | Use | Notes |
|---|---|---|
| Hosting | Serve `client/dist` | Add SPA rewrite to `/index.html` |
| Auth | Client login | Email/password + Google; custom claim `tenantId` |
| Functions (gen2) | API only | Node 20, 256–512 MiB, 60 s timeout |
| Firestore | Jobs, vendors, folders, users | Native mode, `asia-south1` if available |
| Storage | CSV/JSON, profiles | Lifecycle rule: delete after 90 days |
| App Check | Protect callables | reCAPTCHA Enterprise for web |
| Secret Manager | GitHub App key, API keys | Never in `.env` committed to git |
| Cloud Scheduler | Stale-job reaper | Every 5 minutes |

### 6.1 Trigger function (Node, gen2)

```js
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getGitHubInstallationToken } = require('./github');
const { checkQuota } = require('./quota');

exports.createScrapeJob = onCall({ region: 'asia-south1', enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
    const tenantId = request.auth.token.tenantId;
    const { category, location, strategy = 'smart', targetLeads = 100 } = request.data || {};
    if (!category || !location) throw new HttpsError('invalid-argument', 'Category and location are required.');
    await checkQuota(tenantId);

    const db = getFirestore();
    const ref = db.collection('jobs').doc();
    await ref.set({
      tenantId, createdBy: uid,
      query: { category, location, strategy, targetLeads: Math.min(Number(targetLeads) || 100, 500) },
      status: 'dispatching',
      cancelRequested: false,
      createdAt: FieldValue.serverTimestamp()
    });

    const token = await getGitHubInstallationToken();
    const res = await fetch(
      `https://api.github.com/repos/${process.env.GH_OWNER}/${process.env.GH_REPO}/actions/workflows/scrape.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ ref: 'main', inputs: { jobId: ref.id } })
      }
    );
    if (!res.ok) {
      await ref.update({ status: 'failed', error: `dispatch ${res.status}` });
      throw new HttpsError('internal', 'Could not start the scrape worker.');
    }
    await ref.update({ status: 'queued', dispatchedAt: FieldValue.serverTimestamp() });
    return { jobId: ref.id };
  });
```

The client receives `jobId` in < 1 s. The worker may take another 10–60 s to
start; show an honest "Queued — starting worker" state, not a fake progress bar.

---

## 7. Live updates without SSE

Current UI depends on `EventSource` (`/api/logs/stream`, `/logs/stream`). In
cloud mode replace it with listeners:

```js
// client/src/v2/cloudJobs.js
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';

export function watchJob(jobId, cb) {
  return onSnapshot(doc(db, 'jobs', jobId), snap => cb(snap.data()));
}

export function watchVendors(tenantId, jobId, cb) {
  const q = query(
    collection(db, 'tenants', tenantId, 'vendors'),
    where('sessionId', '==', jobId),
    orderBy('scrapedAt', 'desc'),
    limit(500)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
```

Cost control: subscribe to the newest 100–250 vendors, not the whole tenant.
Aggregate counts live in `jobs/{jobId}.progress`, written at most once per 2 s,
so a 1,000-lead run does not cause 1,000 listener wake-ups.

---

## 8. Security model

1. **No GitHub token in the browser.** Only the Function holds it.
2. **Tenant isolation in rules**, not only in code:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function tenant() { return request.auth.token.tenantId; }
    match /jobs/{jobId} {
      allow read: if request.auth != null && resource.data.tenantId == tenant();
      allow write: if false;                    // Functions/Admin only
    }
    match /tenants/{tenantId}/{document=**} {
      allow read: if request.auth != null && tenantId == tenant();
      allow write: if false;
    }
  }
}
```

3. **Validate inputs**: category/location length, strategy allowlist, targetLeads
   cap, no URLs, no arbitrary Playwright targets.
4. **Quota per tenant** (jobs/day, leads/month) enforced in the Function *and* by
   a Firestore transaction so parallel calls cannot race.
5. **App Check** on callables; CORS allowlist on any HTTP endpoint.
6. **Secrets**: Secret Manager + GitHub App, rotate quarterly.
7. **Audit log** per job: who requested it, what ran, which workflow run.
8. Remove the default `admin/password123` user in `server/data/users.json` and
   the hardcoded OLA key in `client/vite.config.js` before any public deploy.

---

## 9. Reliability

| Failure | Handling |
|---|---|
| Dispatch accepted, runner never starts | Reaper marks `stale` after 15 min without heartbeat |
| Runner dies mid-scrape | Heartbeat stops; reaper marks `failed`; retry reuses deterministic vendor IDs |
| Duplicate workflow | `concurrency.group = scrape-{jobId}` |
| Client closes tab | Job continues; results are already in Firestore |
| Cancel | `cancelRequested` flag + worker checks between zones; `gh run cancel` as backup |
| Partial results | Write vendors as they arrive; mark job `completed_with_errors` and keep the partial folder |
| GitHub outage | Queue remains `dispatching`; retry with exponential backoff (max 3) |
| Firestore write spike | Batch 400 docs, throttle progress to 1 write / 2 s |

Never delete the previous folder when a new run starts in cloud mode. The local
"fresh run purges live leads" policy is a local-disk convenience; in Firestore
each job is already isolated by `sessionId`.

---

## 10. Cost and limits (order of magnitude)

Assumptions: 100 leads per job, 5–12 minutes of runner time, 1 job = 1 client
search.

| Item | Free tier | Rough cost beyond free |
|---|---|---|
| GitHub Actions (private) | 2,000 min/month | ~$0.008/min Linux → 10 min ≈ $0.08/job |
| GitHub Actions (public) | unlimited | $0, but repo is public |
| Firestore | 50k reads, 20k writes/day | $0.03/100k reads, $0.09/100k writes |
| Cloud Storage | 5 GB | ~$0.02/GB/month |
| Functions | 2M invocations | negligible at this scale |
| Hosting | 10 GB transfer | negligible |
| Cloud Run Job (recommended) | 180k vCPU-s/month | ~$0.000024/vCPU-s → 10 min ≈ $0.03–0.10/job |

At 300 jobs/month the GitHub route is roughly **$15–35** in overage plus
Firestore reads; Cloud Run is comparable but with far better latency and no
6-hour ceiling. Firebase alone is not the expensive part — browser minutes are.

---

## 11. Legal and compliance guardrails

This matters more than the infrastructure. Scraping mobile numbers for
outreach in India is regulated:

- **DPDP Act 2023**: a sole proprietor's mobile can be personal data. You need a
  lawful basis, a retention limit, a deletion path and a grievance contact.
- **TRAI TCCCPR 2018**: commercial calls/SMS require consent and DND scrubbing.
  Selling a raw number list to clients shifts risk to you.
- **Platform terms**: Google Maps/JustDial/WeddingBazaar prohibit automated
  scraping. Datacenter IPs (GitHub) are the easiest to detect and block.
  Prefer official APIs (Google Places) or licensed data.
- **Do not** build CAPTCHA solving, login bypass, or anti-bot evasion into the
  commercial product.

Product safeguards to implement:

1. Store only publicly listed **business** contact numbers.
2. Add `sourceUrl`, `capturedAt`, `consentStatus`, `optOutAt` to every vendor.
3. DND scrub before export; expose an opt-out endpoint that suppresses a number
   across all tenants.
4. Retention: delete raw profiles after 90 days, keep aggregates.
5. Terms of service that make the client responsible for outreach consent.
6. A visible "data source" column in the UI so clients can audit provenance.

---

## 12. Phased implementation plan

Each phase ends with a demo and a written exit criterion. Do not start the next
phase until the current one is green.

### Phase 0 — Baseline and secrets (0.5 day)
- [ ] Freeze the current local build (`npm run build`, backend health check).
- [ ] Remove the OLA key from `client/vite.config.js`; proxy via server.
- [ ] Remove the default admin password; require env-based bootstrap.
- [ ] Confirm `.env`, `server/data/*.json`, `server/db/user_sessions/*` are
      git-ignored.

Exit: no secret appears in the client bundle or git history.

### Phase 1 — Framework-free scraper core (3–5 days)
- [ ] Extract `runScrape()` from `server/src/routes/scrape.js`.
- [ ] Define `jobStore` and `emitter` interfaces; implement local versions.
- [ ] Move `persistSessionVault` behind the store.
- [ ] Add `worker/run-job.js` and run one full scrape from the CLI with no
      Express process.
- [ ] Golden test: "wedding photographers in Vijayawada" returns ≥ 80 leads,
      ≥ 80% phones, zero venue contamination.

Exit: `JOB_ID=test node worker/run-job.js` produces the same lead count and
fidelity as the current UI run.

### Phase 2 — GitHub worker (1–2 days)
- [ ] Add `.github/workflows/scrape.yml`.
- [ ] Trigger manually with a hardcoded job id; confirm Chromium launches.
- [ ] Measure cold start and total runtime; record in this doc.
- [ ] Add 350-minute timeout, concurrency group, artifact upload.

Exit: a manually dispatched run completes and uploads CSV/JSON.

### Phase 3 — Firebase data plane (2–3 days)
- [ ] Create the project; enable Auth, Firestore, Storage, Functions.
- [ ] Implement `firestoreJobStore` and `firestoreEmitter`.
- [ ] Worker writes job progress + vendors + folder + exports.
- [ ] Add `firebase.json`, rules, indexes, Hosting rewrite.
- [ ] Deploy the client to Hosting (staging channel first).

Exit: a job started from the deployed site appears in Firestore and renders in
the cockpit.

### Phase 4 — Trigger + live UI (3 days)
- [ ] `createScrapeJob` / `cancelScrapeJob` callables with quota checks.
- [ ] GitHub App token minting in Secret Manager.
- [ ] Replace `EventSource` with `onSnapshot` behind `VITE_API_MODE=cloud`.
- [ ] Queued → running → completed states in the cockpit; no fake progress.
- [ ] Deep-profile phase writes the 52-field profile into Storage + Firestore.

Exit: two browsers signed into two tenants each see only their own leads, live.

### Phase 5 — Multi-tenant, quotas, billing (2–3 days)
- [ ] Tenant custom claims; invite flow; role `owner|member`.
- [ ] Per-tenant job/lead quotas with transactions.
- [ ] Usage dashboard (jobs this month, leads, phones).
- [ ] Stripe/Razorpay webhook → plan field (optional at pilot).

Exit: a tenant at quota is blocked with a clear message; usage is auditable.

### Phase 6 — Hardening (2–3 days)
- [ ] Stale-job reaper + retry with backoff.
- [ ] Cancel end-to-end (UI → Firestore flag → worker → `gh run cancel`).
- [ ] Error taxonomy (`captcha`, `blocked`, `timeout`, `no_results`,
      `parse_error`) shown in the UI.
- [ ] Alerting on failed-job rate and p95 runtime.
- [ ] Load test: 5 concurrent jobs, 500 leads each.
- [ ] Retention job (90-day profile purge) + opt-out suppression list.

Exit: kill a runner mid-job; the UI shows `failed`, retry succeeds, no
duplicates.

### Phase 7 — Pilot (3–5 days)
- [ ] 3–5 real clients, one category each.
- [ ] Compare GitHub vs Cloud Run on the same job (latency, block rate, cost).
- [ ] Legal review of terms + DND/opt-out flow.
- [ ] Decide the permanent compute target.

Total: **~3–4 weeks for one developer**, with Phase 1 being the real work.
Phases 2–4 are mostly wiring.

---

## 13. File map (what gets added vs changed)

Added:

```
worker/run-job.js
worker/heartbeat.js
worker/upload.js
server/src/services/scrapeOrchestrator.js
server/src/services/jobStore.js
server/src/services/localJobStore.js
server/src/services/firestoreJobStore.js
server/src/services/emitter.js
server/src/services/firestoreEmitter.js
functions/package.json
functions/index.js
functions/github.js
functions/quota.js
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
storage.rules
.github/workflows/scrape.yml
.github/workflows/deploy-firebase.yml
client/src/v2/cloudJobs.js
docs/CLOUD_DEPLOYMENT_PLAN.md   ← this file
```

Changed:

```
server/src/routes/scrape.js        → thin handlers over runScrape()
server/src/routes/deepProfile.js  → store-backed job state
server/src/config/dbAdapter.js    → pluggable store
server/src/utils/queue.js         → local-only; cloud path bypasses it
client/src/v2/api.js              → cloud mode + callables
client/src/v2/CommandCenter.jsx   → job status from Firestore in cloud mode
client/src/apiConfig.js           → env-driven base URL
client/vite.config.js             → remove hardcoded key
```

---

## 14. Test plan

1. **Fidelity regression** (must stay green): photographers → no venues;
   caterers → no photographers; plumbers → no wedding halls.
2. **Phone validation**: no pincodes, helplines, dummy sequences, UI labels.
3. **Idempotency**: dispatch the same job twice → one set of vendors.
4. **Tenant isolation**: tenant A cannot read tenant B's docs (rules test).
5. **Cancellation**: cancel at 20%, 80%, and after completion.
6. **Runner death**: kill the process → reaper marks failed within 15 min.
7. **Quota race**: 10 parallel create calls at the limit → only the allowed
   number succeed.
8. **Cold-start budget**: p95 dispatch→first lead under 90 s (GitHub) or 30 s
   (Cloud Run).
9. **Cost guard**: a 500-lead job stays under the per-job budget.
10. **Security**: no secret in `dist/`, no open Firestore writes, App Check on.

---

## 15. Rollout and rollback

- Deploy to a Firebase **preview channel** first; keep the local build working.
- Feature flag `VITE_API_MODE=local|cloud`; default `local` until Phase 4 exits.
- Rollback = flip the flag + redeploy Hosting; data stays in Firestore.
- Keep the JSON store as the dev path so the app still runs offline.

---

## 16. Open questions (answer before Phase 3)

1. **Volume**: how many client searches per day at launch? (Decides GitHub vs
   Cloud Run.)
2. **Latency**: is 30–90 s acceptable, or must the first lead appear in < 10 s?
3. **Tenancy**: one shared workspace per client, or sub-accounts per employee?
4. **Billing**: subscription, per-lead credits, or both?
5. **Data policy**: do clients own the leads (export + delete), or is it a
   shared index?
6. **Budget ceiling** per month for runner minutes and Firestore reads.
7. **Public or private repo**: public = free minutes but the workflow logs and
   code are visible; private = paid minutes, safer.

---

## 17. Bottom line

- **Can GitHub run Playwright for your clients?** Yes, asynchronously, with
  10–60 s queue latency, a 6-hour cap, a monthly minute budget and a higher
  CAPTCHA rate than a residential IP.
- **Can Firebase trigger it and receive the data?** Yes. Function → GitHub App
  token → `workflow_dispatch` → worker → Firestore/Storage → live UI.
- **Best results?** Put the same worker on Cloud Run Jobs and use GitHub only
  for scheduled batch work. You keep the Firebase front end, remove the queue
  and the 6-hour ceiling, and pay roughly the same per job.
- **Do not** put Playwright inside a Firebase Function, and do not ship the
  current hardcoded API key or default admin password.

Next action after approval: Phase 0 + Phase 1 (extract `runScrape()` and prove
the CLI worker), because every other phase depends on that split.
