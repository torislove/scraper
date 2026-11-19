# Deployment Plan — Serverless Docker + Kubernetes

**Status:** proposal, awaiting approval
**Scope:** how Scraper.co.in goes from one Windows dev box to a serverless, multi-tenant
Kubernetes deployment where every client scrape is its own container with its own job ID,
and the Master workspace can both read every client's leads and run its own
district / mandal / state sweeps.
**Constraint that shapes everything:** the product stays keyless. No paid APIs, no keys,
no per-request vendor contracts. That is a *product* promise, so the plan never introduces
a paid data source — it only moves the existing keyless engines into containers.

---

## 0. TL;DR

| Today | After |
|---|---|
| One Node process, port 5002 | `api` Deployment (3+ pods) behind an Ingress |
| Scrapes run in-process (`activeSessions`) | one **Kubernetes Job per scrape**, created by a controller |
| Leads in `scraped_vendors.json` (17.6 MB, single writer, `.store.lock`) | Postgres `leads` + `session_leads` |
| Queue in `data/jobs.json` | Postgres `jobs` table + Redis wake-up |
| SSE hub in one process | Redis pub/sub fan-out, any api pod can serve the stream |
| `x-user-id` header is the identity | JWT access + refresh, role `client` / `master` |
| No sign-in screen (`/login` redirects) | cream/glass `/login` on both hosts, Google-ready |
| Folders = JSON files | Postgres `folders` + `session_leads` |
| Credits = `data/credits.json` | Postgres ledger with row-level locking |
| Master = separate Vite app, same process | `master.` host, separate image, `master` role + RLS bypass |
| Dockerfile is single-stage, root, no healthcheck | 3 images: `api`, `worker`, `web` (client/master builds) |

The scheduler does the work the user asked for: the controller **creates a Kubernetes Job
object per scrape**, and `kube-scheduler` places that pod on the browser node pool. Nothing
in the app picks a machine.

---

## 1. What we have today, and exactly why it cannot run as more than one pod

Everything below is a real file in this repo, not a guess.

| State | Where | Why it breaks with 2+ replicas |
|---|---|---|
| Active scrapes | `activeSessions` object in `server/src/routes/scrape.js` | A request that lands on pod B cannot see or abort a run on pod A. |
| Abort signals | `sessionAbortSignals` Map | Stop only reaches the pod that owns the run. |
| Job queue | `server/src/utils/queue.js` → `data/jobs.json` | Two pods write the same file; last writer wins. |
| Leads | `server/src/config/vendorStore.js` → `data/scraped_vendors.json` | Single-writer `.store.lock`, whole-file snapshot + journal. N pods = N writers. |
| Session vaults | `server/src/services/sessionVaultService.js` → `db/user_sessions/<clientId>/<sessionId>.json` | Needs a shared RWX volume; `fs.renameSync` across pods is not coordinated. |
| Folders / exports | same JSON files, read in `sessionRoutes.js` | Card count, folder view and CSV are already three code paths; they must become one SQL query. |
| Credits | `server/src/services/credits.js` → `data/credits.json` | Two pods can both spend the same credit. |
| Master client registry | `server/src/services/masterStore.js` → `data/master/clients.json` | Same problem, plus it gates scraping (`clientGate`). |
| SSE | `server/src/services/liveStreams.js` | Events only exist in the process that emitted them. |
| Identity | `x-user-id` / `x-workspace-scope: master` headers | Anyone can claim to be any client or the master. |
| Gazetteer | `server/db/india_villages.json` (16.9 MB) | Read-only — this one is fine, it should be baked into the image. |
| Browser | Playwright Chromium in-process, `PLAYWRIGHT_CONCURRENCY=5` | CPU/RAM per pod, `/dev/shm`, cold start, and a 45-min job ceiling. |

**Conclusion:** the blocker is not Docker. It is that *run state, lead state and identity all
live in one process's memory or on one disk*. The plan fixes that first, then containerises.

---

## 2. Target architecture

```
                        ┌──────────────────────────────┐
   app.scraper.co.in ──▶│ web-client (nginx, 2 pods)   │  client SPA only
                        └──────────────┬───────────────┘
                                       │ /api  (same origin via Ingress)
                        ┌──────────────▼───────────────┐
   master.scraper.co.in ▶│ web-master (nginx, 2 pods)  │  master SPA only
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │ api (Node, 3+ pods)          │
                        │ auth · REST · SSE · exports  │
                        └───┬───────────┬──────────┬───┘
                            │           │          │
              ┌─────────────▼──┐  ┌─────▼─────┐  ┌─▼──────────────┐
              │ Postgres       │  │ Redis     │  │ Object storage │
              │ jobs, leads,   │  │ queue,    │  │ exports,       │
              │ sessions, RLS  │  │ pub/sub,  │  │ backups        │
              └─────┬──────────┘  │ locks     │  └────────────────┘
                    │             └─────┬─────┘
                    │                   │
              ┌─────▼───────────────────▼───────┐
              │ job-controller (1–2 pods)        │  watches queued jobs,
              │ creates/aborts/collects K8s Jobs │  owns sweep sharding
              └──────────────┬──────────────────┘
                             │ create Job (1 pod per scrape / shard)
        ┌────────────────────▼─────────────────────────────┐
        │ browser node pool (tainted, autoscaled)          │
        │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
        │  │ Job      │ │ Job      │ │ Job      │  …       │
        │  │ client A │ │ client B │ │ master   │          │
        │  │ job_…    │ │ job_…    │ │ shard 3  │          │
        │  └──────────┘ └──────────┘ └──────────┘          │
        └────────────────────┬─────────────────────────────┘
                             │ all outbound HTTP
                    ┌────────▼─────────┐
                    │ egress-gateway   │  one shared token bucket for
                    │ (1–2 pods)       │  Nominatim / Overpass / Bing
                    └────────┬─────────┘
                             ▼  public web (keyless sources)
```

Why a separate `egress-gateway`: Nominatim's usage policy is ~1 request/second per
application, Bing throttles by IP, and Overpass rate-limits by IP. Forty worker pods hitting
them directly from forty NAT addresses gets all forty blocked. Routing those three hosts
through one pod with one Redis token bucket keeps the keyless sources usable and makes
throttling honest and measurable (`docs/blocked-sources.md`).

---

## 3. The job model

### 3.1 Job kinds

| Kind | Created by | Runs | Writes |
|---|---|---|---|
| `scrape` | client UI (`/omni`, `/auto`) | 1 pod | one `session_id`, one client |
| `sweep` | master UI (`/master-sweep`) | controller only | zone plan, no leads |
| `sweep-shard` | controller | 1 pod per shard | same `session_id` as parent, N zones |
| `enrich` | phone backfill / deep profile | 1 pod | updates existing leads |
| `export` | folder CSV/XLSX/VCF | 1 short pod (or inline if <5k rows) | object storage key |

`sweep` is a parent record, not a container. That is what lets a state sweep be 300 zones
without one pod living for six hours.

### 3.2 Job IDs

The existing session IDs (`cmd_*`, `omni_*`, `live-*`, `master_sweep_*`) stay the public job
ID — every URL, folder and export already uses them, and changing them breaks saved data.

```ts
jobId      = sessionId                      // e.g. cmd_mwjxs6jo
k8sName    = "scrape-" + slug(jobId) + "-" + hash6(jobId)   // DNS-1123, <=63 chars
```

Kubernetes object names may not contain `_`, so `cmd_mwjxs6jo` becomes
`scrape-cmd-mwjxs6jo-4f2a91`. The real ID lives in labels and annotations:

```yaml
metadata:
  name: scrape-cmd-mwjxs6jo-4f2a91
  labels:
    scraper.co.in/job-id:     cmd_mwjxs6jo        # label values allow "_"
    scraper.co.in/client-id:  usr_0lm8mpu_mvuz54gl
    scraper.co.in/kind:       scrape
    scraper.co.in/scope:      city                # city|mandal|district|state
    scraper.co.in/country:    IN
  annotations:
    scraper.co.in/parent-job: ""
    scraper.co.in/zones:      "1"
    scraper.co.in/requested-by: "usr_0lm8mpu_mvuz54gl"
```

Consequences, all good:

* `kubectl get jobs -l scraper.co.in/client-id=usr_…` is the per-client view.
* A client's containers are labelled, quota-able and killable without touching anyone else.
* The pod's `JOB_ID` env var is the session ID, so `sessionVaultService`, exports and SSE
  need no rewrite of their identifiers.
* `kubectl delete job -l scraper.co.in/job-id=cmd_x` is the hard Stop; the soft Stop is
  `POST /api/scrape/stop` → set `jobs.status='aborting'` + Redis `job:{id}:abort` → worker
  sees it on its next zone boundary (same contract as `sessionAbortSignals` today).

### 3.3 Lifecycle

```
queued ──▶ scheduling ──▶ running ──▶ completing ──▶ completed
   │            │            │            │
   │            │            └──▶ aborting ──▶ aborted
   │            └──▶ failed (image pull, quota, node pressure)
   └──▶ cancelled (client deleted job before a pod existed)
```

Every transition is one `UPDATE jobs SET status=…` plus one `job_events` row. The
`jobs.status` column — not the pod phase — is authoritative, exactly as
`finished: true` is authoritative for releasing Stop today.

Resume already exists (`completedZoneIndices` / `completedZoneNames` in the orchestrator).
It becomes: controller re-creates a Job with `RESUME_ZONES=<json>` and the worker skips
those zones.

---

## 4. Multi-client isolation

Three options, one recommendation.

| Option | Isolation | Ops cost | Verdict |
|---|---|---|---|
| **A. Shared DB, `client_id` on every row, Postgres RLS** | Logical | Low | **Recommended for v1** |
| B. One namespace + one schema per client | Logical + resource | Medium | Phase 5 for enterprise clients |
| C. One database (or cluster) per client | Physical | High | Only on contract |

Recommended model:

1. `client_id` is a non-null column on `jobs`, `leads`, `sessions`, `session_leads`,
   `folders`, `credits_ledger`, `exports`, `users`.
2. Every api request sets `SET LOCAL app.client_id = '<id>'` on its transaction.
3. RLS policy on every tenant table:
   ```sql
   USING (client_id = current_setting('app.client_id', true))
   ```
4. The `scraper_master` role has `BYPASSRLS`; the `scraper_app` role does not.
5. Object storage keys are prefixed `clients/<client_id>/…`; exports are served through a
   short-lived signed URL generated by the api, never a public bucket path.
6. Kubernetes: `ResourceQuota` + `LimitRange` in the worker namespace, and a per-client cap
   enforced in the controller (`max_concurrent_jobs` column on `clients`) so one client
   cannot occupy the whole browser pool.
7. A client's Stop/Delete only touches Jobs labelled with its own `client-id`; the
   controller refuses cross-tenant deletes even if the API is compromised.

The client SPA never ships the master bundle: separate images, separate hostnames.

---

## 5. Master: reading client leads and running territory sweeps

### 5.1 Getting leads *from* clients

Master does not copy client data on every scrape. It reads the same tables through a
master-only view:

```sql
CREATE VIEW v_master_leads AS
SELECT l.*, c.name AS client_name, s.category, s.location
FROM leads l
JOIN clients c ON c.id = l.client_id
LEFT JOIN sessions s ON s.id = l.session_id;
```

* `GET /api/master/leads` — filter by client, category, country, state, district, phone
  presence, date. Backed by `v_master_leads` (RLS bypass).
* `GET /api/master/clients/:id/folders` — that client's folders, read-only.
* `master_lead_index` — a materialized view refreshed every 5 minutes (`CONCURRENTLY`) for
  the dashboard's headline counts, so the master cockpit never scans 500k rows on load.
* `POST /api/master/ingest` — HMAC-signed endpoint for a client that runs in a *different*
  deployment (option C) to push a finished session. Idempotent on
  `(client_id, session_id, lead_hash)`.

Master **cannot** edit or delete a client's folder. Admin actions are separate endpoints,
audited in `admin_audit`.

### 5.2 Master sweeps: district, mandal, state

Flow:

1. `POST /api/scrape/master-sweep` (already exists, gated by `x-workspace-scope: master`)
   resolves the scope with the code that already works:
   * India → `sweepScopePolicy` / `buildScopeZones` (state → districts → mandals)
   * non-India → `countrySweepPlan.buildCountrySweepPlan`
2. The route stops calling `addScrapeJob(...)` directly. It writes a `sweep` row with
   `zone_plan jsonb` (name, lat, lng, radius, admin level) and returns the job ID
   immediately — same response shape the UI already reads (`totalZones`, `capped`,
   `zoneStats`, `policy`, `zones`).
3. The **job-controller** partitions `zone_plan` into shards:
   * `shard_size` default 8 zones, `max_parallel_shards` default 10 (configurable).
   * one `sweep-shard` row + one Kubernetes Job per shard.
4. Each shard pod runs the *unchanged* `runOmniSearchOrchestrator` over its zone slice,
   writes leads with `client_id = 'master'` (or the master workspace ID) and the parent
   `session_id`, and appends `session_leads` rows.
5. Shard completion updates `jobs.completed_zone_indices`; when every shard is terminal the
   controller marks the sweep `completed`, refreshes counts and emits one SSE
   `sweep:completed`.
6. Failure of one shard does not fail the sweep: it is retried up to `backoffLimit: 1`;
   after that the sweep finishes `completed_with_gaps` and the UI shows the missing zones.
   That is the same honest reporting the stall detector gives today.
7. Resume re-creates only shards whose zones are not in `completed_zone_indices`.

Capacity math to size the pool (state sweep, 26 districts × ~46 mandals ≈ 1,200 zones):

| shard_size | shards | pods at max_parallel=10 | wall clock @ ~4 min/zone |
|---|---|---|---|
| 4 | 300 | 10 | ~2 h |
| 8 | 150 | 10 | ~2 h |
| 8 | 150 | 25 | ~48 min |
| 16 | 75 | 40 | ~30 min |

The wall clock is set by `max_parallel_shards`, not by zone count — which is exactly the
"no zone caps, ordering is the speed control" decision already made.

---

## 6. Data layer

### 6.1 Postgres schema (v1)

```sql
clients(id text pk, name text, status text, plan text, max_concurrent_jobs int default 2,
        created_at timestamptz, settings jsonb)

users(id text pk, client_id text null references clients, email citext unique,
      password_hash text, role text check (role in ('client','master','admin')),
      created_at timestamptz, last_login timestamptz)

jobs(id text pk,                      -- session id
     client_id text not null,
     kind text not null,              -- scrape|sweep|sweep-shard|enrich|export
     parent_job_id text null references jobs,
     shard_index int null,
     category text, location text, country char(2),
     scope_type text, scope_name text,
     status text not null,
     zone_plan jsonb, completed_zone_indices int[],
     k8s_namespace text, k8s_job_name text,
     progress jsonb, error text,
     created_at timestamptz, started_at timestamptz, finished_at timestamptz)

job_events(id bigserial pk, job_id text references jobs, ts timestamptz,
           level text, message text, data jsonb)

sessions(id text pk, client_id text not null, category text, location text,
         country char(2), metadata jsonb, created_at timestamptz, updated_at timestamptz)

leads(id bigserial pk, client_id text not null, session_id text,
      dedupe_key text not null,        -- normalized name|phone|city hash
      name text, phone text, phone_norm text, email text, website text,
      address text, city text, district text, state text, country char(2),
      lat double precision, lng double precision,
      category text, rating numeric, reviews int,
      sources jsonb, raw jsonb,
      first_seen timestamptz, last_seen timestamptz,
      unique (client_id, dedupe_key))

session_leads(session_id text references sessions, lead_id bigint references leads,
              primary key (session_id, lead_id))          -- folder membership

folders(id text pk, client_id text not null, name text, color text,
        session_ids text[], created_at timestamptz, updated_at timestamptz)

credits_ledger(id bigserial pk, client_id text not null, delta int, reason text,
               job_id text, balance_after int, created_at timestamptz)

exports(id text pk, client_id text not null, session_id text, format text,
        object_key text, bytes bigint, rows int, created_at timestamptz)

admin_audit(id bigserial pk, actor_id text, action text, target text,
            data jsonb, created_at timestamptz)
```

Indexes that matter for the existing screens:

```sql
create index on leads (client_id, country, state, district);
create index on leads (client_id, phone_norm) where phone_norm is not null;
create index on leads using gin (name gin_trgm_ops);
create index on session_leads (session_id);
create index on jobs (status, created_at) where status in ('queued','running');
```

`session_leads` is the SQL form of the rule already shipped in `withOwnSessionLeads`:
folder membership = rows saved in the folder + rows the run owns. One query now feeds the
sidebar count, the folder viewer and every export — which removes the class of bug fixed in
`e569eff` permanently.

### 6.2 Redis

| Key | Type | Use |
|---|---|---|
| `queue:scrape` | list | job IDs waiting for a controller |
| `queue:scrape:processing` | list | RPOPLPUSH target for crash recovery |
| `job:{id}:abort` | string TTL 1h | soft Stop |
| `job:{id}:progress` | hash | zone %, leads/min, ETA (worker → api) |
| `sse:job:{id}` | pub/sub channel | SSE fan-out to every api pod |
| `sse:master` | pub/sub channel | master cockpit events |
| `lock:lead:{client}:{hash}` | string NX | dedupe across parallel shards |
| `rl:nominatim` | token bucket | egress gateway |
| `rl:bing` | token bucket | egress gateway |
| `cache:bing:{sha1}` | string TTL 10m | reuse `bingSearch.js` results |

### 6.3 Object storage

S3 / GCS / MinIO, one bucket, prefixes:

```
exports/<client_id>/<session_id>/<export_id>.csv
backups/vendor-store/<date>/scraped_vendors.json.gz
backups/postgres/<date>/...
```

The 17.6 MB vendor store snapshot stops being the source of truth and becomes a daily
archive, which also kills the `.store.lock` class of bug.

---

## 7. Containers

### 7.1 Images

| Image | Base | Contents | Size | Replicas |
|---|---|---|---|---|
| `scraper-api` | `node:22-bookworm-slim` | `server/`, no Chromium | ~280 MB | 3+ |
| `scraper-worker` | `mcr.microsoft.com/playwright:v1.4x-jammy` | `server/` + Chromium + fonts + gazetteer | ~1.6 GB | 0–40 (Jobs) |
| `scraper-web-client` | `nginx:1.27-alpine` | `client/dist` | ~30 MB | 2 |
| `scraper-web-master` | `nginx:1.27-alpine` | `master/dist` | ~30 MB | 2 |
| `scraper-controller` | `node:22-bookworm-slim` | `server/src/controller/`, k8s client | ~300 MB | 1–2 |
| `scraper-migrate` | `node:22-bookworm-slim` | migrations + seed from JSON | ~280 MB | one-shot Job |

Rules for all of them: multi-stage build, `USER node`, `NODE_ENV=production`,
`npm ci --omit=dev`, `.dockerignore` excluding `data/`, `db/user_sessions`, `node_modules`,
`dist` of the other app, `scratch/`, `*.log`. Healthcheck on `/api/health`.

`Dockerfile.server` today is single-stage, runs as root, has no healthcheck and copies the
whole repo. It gets replaced by `deploy/docker/Dockerfile.api` and `Dockerfile.worker`.

### 7.2 `docker-compose.yml` (local parity)

```yaml
services:
  postgres:   { image: postgres:16-alpine, environment: [POSTGRES_DB=scraper], volumes: [pg:/var/lib/postgresql/data] }
  redis:      { image: redis:7-alpine }
  minio:      { image: minio/minio, command: server /data --console-address ":9001" }
  migrate:    { build: { context: ., dockerfile: deploy/docker/Dockerfile.migrate }, depends_on: [postgres] }
  api:        { build: { context: ., dockerfile: deploy/docker/Dockerfile.api }, ports: ["8080:8080"], depends_on: [postgres, redis] }
  worker:     { build: { context: ., dockerfile: deploy/docker/Dockerfile.worker }, profiles: ["jobs"], environment: [JOB_ID=…] }
  web-client: { build: { context: ., dockerfile: deploy/docker/Dockerfile.web-client }, ports: ["8081:80"] }
  web-master: { build: { context: ., dockerfile: deploy/docker/Dockerfile.web-master }, ports: ["8082:80"] }
```

Locally, `WORKER_DRIVER=local` makes the api spawn a child process instead of a K8s Job, so
`docker compose up` still works on a laptop without a cluster.

---

## 8. Kubernetes

### 8.1 Helm chart layout

```
deploy/helm/scraper/
  Chart.yaml
  values.yaml
  values.staging.yaml
  values.prod.yaml
  templates/
    namespace.yaml
    serviceaccounts.yaml        # api, controller, worker
    rbac.yaml                   # controller: create/get/list/watch/delete jobs,pods; read logs
    secrets.yaml                # external-secrets refs, not plaintext
    configmap.yaml
    postgres.yaml               # only if self-hosted (see §15)
    redis.yaml
    deployments.yaml            # api, controller, web-client, web-master
    services.yaml
    ingress.yaml                # app., master., api. hosts, SSE annotations
    hpa.yaml                    # api
    pdb.yaml                    # api, controller
    networkpolicy.yaml
    resourcequota.yaml          # worker namespace
    job-template.yaml           # the shape the controller renders
    servicemonitor.yaml         # Prometheus
    backup-cronjob.yaml
```

### 8.2 Workloads

| Object | Kind | Replicas | Notes |
|---|---|---|---|
| `api` | Deployment | 3 (HPA 3–10) | `/api/health` liveness, `/api/ready` readiness (DB+Redis ping) |
| `job-controller` | Deployment | 2, leader-elected | only one leader creates Jobs; both reconcile |
| `web-client` | Deployment | 2 | nginx, immutable cache for `/assets` |
| `web-master` | Deployment | 2 | separate image |
| `postgres` | managed, or StatefulSet | 1 primary + 1 replica | see §15 |
| `redis` | managed, or StatefulSet | 1 + sentinel | queue must be durable |
| `scrape-*` | **Job** | 1 per scrape/shard | created by controller |
| `backup` | CronJob | daily | `pg_dump` → object storage |
| `migrate` | Job (Helm hook) | once per release | idempotent |

### 8.3 The Job the controller renders

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scrape-cmd-mwjxs6jo-4f2a91
  namespace: scraper-workers
  labels:
    scraper.co.in/job-id: cmd_mwjxs6jo
    scraper.co.in/client-id: usr_0lm8mpu_mvuz54gl
    scraper.co.in/kind: scrape
    scraper.co.in/country: IN
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 3600          # matches the 45-min ceiling + startup
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels: { scraper.co.in/job-id: cmd_mwjxs6jo, pool: browser }
    spec:
      restartPolicy: Never
      serviceAccountName: scraper-worker
      nodeSelector: { pool: browser }
      tolerations: [{ key: browser, operator: Exists, effect: NoSchedule }]
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: ghcr.io/<org>/scraper-worker:1.0.0
          command: ["node", "src/worker/runJob.js"]
          env:
            - { name: JOB_ID,              value: cmd_mwjxs6jo }
            - { name: JOB_KIND,            value: scrape }
            - { name: CLIENT_ID,           value: usr_0lm8mpu_mvuz54gl }
            - { name: COUNTRY,             value: IN }
            - { name: PLAYWRIGHT_CONCURRENCY, value: "4" }
            - { name: EGRESS_GATEWAY_URL,  value: http://egress-gateway:8080 }
          envFrom:
            - secretRef: { name: scraper-db }
            - configMapRef: { name: scraper-config }
          resources:
            requests: { cpu: "1",   memory: "2Gi" }
            limits:   { cpu: "2",   memory: "4Gi" }
          volumeMounts:
            - { name: dshm, mountPath: /dev/shm }
          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            capabilities: { drop: ["ALL"] }
      volumes:
        - name: dshm
          emptyDir: { medium: Memory, sizeLimit: 1Gi }
```

`/dev/shm` is not optional — Chromium crashes on the default 64 MB with several pages open.

### 8.4 Node pools

| Pool | Instance | Taint | Runs |
|---|---|---|---|
| `system` | 2 vCPU / 8 GB | — | api, controller, web, metrics |
| `browser` | 4 vCPU / 16 GB, spot allowed | `browser=:NoSchedule` | scrape Jobs (4–5 pods per node) |
| `data` | managed service or 2 vCPU / 16 GB | — | Postgres/Redis if self-hosted |

Cluster autoscaler (or Karpenter) on `browser` with `min=0` gives true scale-to-zero when no
scrape is running. Spot is safe because a scrape is resumable: the controller re-creates the
Job and passes `RESUME_ZONES`.

### 8.5 Autoscaling

* **api** — HPA on CPU 65% and `http_requests_per_second` (Prometheus adapter).
* **workers** — the controller already knows the queue depth, so it is the scaler. KEDA
  `ScaledJob` is the drop-in alternative once the queue is Redis-native:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata: { name: scrape-worker }
spec:
  maxReplicaCount: 40
  scalingStrategy: { strategy: accurate }
  jobTargetRef:
    parallelism: 1
    completions: 1
    activeDeadlineSeconds: 3600
    backoffLimit: 1
    template: { spec: { /* same pod template as §8.3 */ } }
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: queue:scrape
        listLength: "1"
        enableTLS: "false"
```

With `ScaledJob` the worker does `BRPOPLPUSH queue:scrape queue:scrape:processing` itself and
must `LREM` on success — otherwise a crash loses a job. The controller path avoids that
failure mode and gives per-job Kubernetes names, so **controller first, KEDA second**.

---

## 9. What "serverless" means here, honestly

The user's word is *serverless*. Kubernetes Jobs give the important half — no idle browser
machines, pay only while a scrape runs, cluster scales to zero nodes at night. Two things do
not fit the function-as-a-service model and the plan does not pretend they do:

| Constraint | Reality | Handling |
|---|---|---|
| Runtime | A state sweep can run 45 min; Lambda caps at 15 | Jobs, not functions |
| Binary | Chromium image ~1.6 GB | pre-pulled via DaemonSet or image cache |
| Cold start | ~8–15 s to first page (image cached) | acceptable; first zone warms engines |
| SSE | Serverless HTTP often buffers | api pods + Ingress `proxy-buffering: off` |
| Egress IP | Functions rotate IPs and get throttled | sticky NAT + egress gateway |
| Local disk | Workers write temp profiles | `emptyDir`, never a PVC |

If the target cloud offers **Knative**, the api can run there (scale-to-zero, request-based)
while Jobs stay plain `batch/v1`. That is optional and phase 6.

---

## 10. Sign-in — client and master

Both command centers now have a real sign-in surface. It ships **before** Google is
configured, and it upgrades to Google without a redesign.

### 10.1 What is on screen

`/login` on `app.scraper.co.in` and `master.scraper.co.in` renders the same component with a
variant flag (`LoginV2.jsx`), so the two never drift.

| Region | Client | Master |
|---|---|---|
| Top bar | brand lockup, "Signed session" chip, Back to site | same, tagline "Master Control" |
| Left panel | "Every lead in your area. One calm room." + 3 promises + 11 market chips (IN highlighted) | "The territory control room." + read-across / sweep / container promises |
| Card badge | `SECURE SIGN-IN` | `RESTRICTED` (amber) |
| Primary action | Continue with Google (or email form) | same, blue-grey accent |
| Footer | Terms · Privacy · "Keyless lead engine" | same |

Visual rules: cream `--gb-paper` shell, 34 px grid, glass card with a hard 2 px bezel and
retro embossed buttons, emerald accent for the client and slate-blue for master. No black,
no navy, no dark slab.

`AUTH_REQUIRED` is a build switch:

* `VITE_AUTH_REQUIRED=0` (default today) — the card shows a **Preview mode** banner with
  "Open command center". Nothing is blocked while Google is being set up.
* `VITE_AUTH_REQUIRED=1` — `/command` redirects to `/login?next=…` without a session, and
  the engine rejects anonymous API calls (`AUTH_REQUIRED=1` on the server too).

### 10.2 Google Sign-In — configured later, in four steps

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID** →
   *Web application*.
2. Authorised JavaScript origins:
   `https://app.scraper.co.in`, `https://master.scraper.co.in`
   (plus `http://localhost:5173`, `http://localhost:5174` for development).
3. No redirect URI is needed: Google Identity Services returns an ID token to the page.
4. Set on the server and rebuild the web images:
   ```bash
   GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
   GOOGLE_ALLOWED_DOMAINS=yourcompany.com        # optional
   GOOGLE_MASTER_DOMAIN=yourcompany.com          # optional
   VITE_AUTH_REQUIRED=1
   AUTH_REQUIRED=1
   ```

Flow:

```
browser ── GIS button ──▶ Google ──▶ ID token (JWT, ~1 h)
   └─▶ POST /api/auth/google { credential }
          └─▶ verify via oauth2.googleapis.com/tokeninfo   (no secret, no key)
              ├─ aud must equal GOOGLE_CLIENT_ID
              ├─ email_verified must be true
              └─ map email → data/users.json (or auto-provision an allowed domain)
   ◀── scraper session token (7 days) ── stored in localStorage
```

If the email is not provisioned and auto-provision is off, the answer is
`403 not_provisioned` — a Google account alone does not grant access to someone else's
folders.

### 10.3 Email + password (works today)

* `server/scripts/create-user.js` writes `data/users.json` with a scrypt hash.
  ```bash
  node scripts/create-user.js --email owner@scraper.co.in --password "…" \
       --role master --name "Manoj"
  node scripts/create-user.js --email client@acme.in --password "…" \
       --role client --client-id usr_0lm8mpu_mvuz54gl --name "Acme"
  ```
* Legacy `data/admin.json` and `data/employees.json` still authenticate; plaintext records
  are accepted and re-hashed the next time they are changed.
* Password reset is `mailto:support@scraper.co.in` for now; Phase 6 adds a signed reset link.

### 10.4 Tokens

| Property | Value |
|---|---|
| Format | JWT wire format, HMAC-SHA256 |
| Signing key | `SESSION_SECRET`; if unset, generated once into `data/.session-secret` (0600) |
| Lifetime | 7 days (`SESSION_TTL_SECONDS`) |
| Claims | `sub`, `role`, `clientId`, `email`, `name`, `iat`, `exp` |
| Storage | `localStorage` when "Keep me signed in", otherwise `sessionStorage` |
| Transport | `Authorization: Bearer …`; `?token=` only for SSE (EventSource cannot send headers) |

`resolveIdentity` verifies the token on every `/api` request and **overwrites**
`x-user-id` and `x-workspace-scope` from the claims. A forged header therefore stops working
the moment a token exists, without rewriting the 40-odd routes that read those headers.

### 10.5 Acceptance tests

* `/login` renders on both hosts at 1440 px and 390 px with no overflow and no dark surface.
* Wrong password → inline error, form stays filled, no navigation.
* Correct password → `/command`, reload keeps the session, `localStorage` has one key.
* `curl /api/sessions/list -H 'x-user-id: someone-else'` is unaffected when
  `AUTH_REQUIRED=0`; with `AUTH_REQUIRED=1` it returns `401`.
* With `AUTH_REQUIRED=1`, a client token cannot call `/api/scrape/master-sweep` (403) and
  cannot read another client's folder (404/403 from RLS in Phase 2+).
* When `GOOGLE_CLIENT_ID` is unset, the Google button explains the setup instead of
  dead-ending; when set, the official GIS button renders and completes the flow.
* `POST /api/auth/logout` clears the session and `/logout` returns to `/login`.

---

## 11. Security

1. **Auth.** Replace `x-user-id` with:
   * `POST /api/auth/login` → bcrypt/argon2 verify → 15-min JWT access + 7-day refresh in an
     `httpOnly; Secure; SameSite=Lax` cookie.
   * Claims: `sub`, `role`, `client_id`, `jti`.
   * `requireAuth` middleware sets `req.clientId` / `req.role`; `requireMaster` gates every
     `/api/master/*` and `/api/scrape/master-sweep`.
   * The existing `clientGate` (suspended accounts) keeps working, now reading `clients`
     from Postgres.
2. **Service-to-service.** Workers get a short-lived token minted by the controller, scoped
   to `job_id`; they can write leads for that job only.
3. **Secrets.** External Secrets Operator from the cloud secret manager. Nothing in
   `values.yaml`.
4. **NetworkPolicy.** Default deny. api ↔ postgres/redis only. Workers ↔ postgres/redis +
   egress gateway only. Workers cannot reach the api admin routes.
5. **Ingress.** TLS via cert-manager, HSTS, rate limit on `/api/auth/*`, body limit 2 MB.
6. **Audit.** Every master action and every admin delete writes `admin_audit`.
7. **Keyless promise.** No provider keys in the cluster; the only credentials are DB, Redis,
   object storage and the JWT signing key.

---

## 12. Observability

| Signal | Where |
|---|---|
| `/api/health` (already exists) | liveness |
| `/api/ready` (new) | DB + Redis + migrations-current |
| `scraper_jobs_total{status,client,kind}` | controller |
| `scraper_leads_total{client,country,engine}` | worker |
| `scraper_zone_seconds` histogram | worker (feeds ETA) |
| `scraper_engine_blocked_total{engine}` | worker → `docs/blocked-sources.md` |
| Job logs | `kubectl logs`, shipped by Loki/CloudWatch |
| Traces | OpenTelemetry on api + worker, job_id as trace attribute |

Dashboards: per-client throughput, queue depth vs `max_parallel_shards`, engine yield,
blocked engines, p95 zone time, Postgres connections, Redis memory.

Alerts: api 5xx > 2%, queue depth > 50 for 10 min, no zone completion for 20 min,
Postgres connections > 80%, worker job failure rate > 10%, disk > 80%.

---

## 13. Implementation phases

Each phase ends with a demo and a test that must pass before the next starts.

### Phase 0 — Baseline and safety (½ day)
* Tag `v0.9-monolith`, export `data/`, `db/user_sessions/`, `data/master/`, `data/credits.json`
  to a dated archive.
* Record current counts for three folders (`cmd_mwjxs6jo` 757, `cmd_mwn0nybc` 139,
  `live-us-054544` 42) as the regression fixture.

**Accept:** archive restores into a scratch folder and the three counts match.

### Phase 1 — Containerise as-is (2–3 days)
* `deploy/docker/Dockerfile.api` (multi-stage, non-root, healthcheck).
* `deploy/docker/Dockerfile.worker` (Playwright base, Chromium pre-installed, gazetteer baked).
* `deploy/docker/Dockerfile.web-client`, `Dockerfile.web-master` (nginx + SPA fallback).
* `docker-compose.yml` with postgres/redis/minio, `WORKER_DRIVER=local`.
* `.dockerignore`, `deploy/docker/nginx/*.conf`, `deploy/docker/entrypoint.sh`.

**Accept:** `docker compose up` serves the client on :8081 and master on :8082, `/api/health`
green, one scrape from the container writes the same 139 leads as the host run.

### Phase 2 — Storage abstraction (4–6 days)
* New `server/src/store/` with one interface: `leads`, `sessions`, `folders`, `jobs`,
  `credits`, `clients`.
* Two drivers: `fs` (current behaviour, default) and `postgres`.
* `STORAGE_DRIVER=fs|postgres`. Every call site in `sessionRoutes.js`, `vendorStore.js`,
  `sessionVaultService.js`, `credits.js`, `masterStore.js` goes through it.
* `server/src/store/migrations/001_init.sql` + `scripts/migrate.js`.
* One-shot importer: JSON → Postgres, idempotent on `(client_id, dedupe_key)`.

**Accept:** with `STORAGE_DRIVER=postgres`, the three fixture folders return identical
counts from list, vault, CSV and JSON; two api replicas behind nginx both return them;
importing twice does not duplicate leads.

### Phase 3 — Auth and sign-in (2–3 days)

**Already shipped in the monolith (no cluster required):**
* `server/src/routes/auth.js` — `/config`, `/login`, `/google`, `/me`, `/logout`, scrypt
  hashes, HMAC session tokens, Google ID-token verification.
* `server/src/middleware/resolveIdentity.js` — verifies the token and overwrites
  `x-user-id` / `x-workspace-scope`; enforces `AUTH_REQUIRED=1` for anonymous API calls.
* `client/src/v2/LoginV2.jsx` + `login.css` — the cream/glass sign-in surface, shared by
  both apps, with the Google button that activates when `GOOGLE_CLIENT_ID` is set.
* `client/src/v2/auth.js` — session storage, `Authorization` interceptor, SSE token.
* `server/scripts/create-user.js` — provision master/client users.
* Routes: `/login`, `/logout`; `/command` is guarded when `VITE_AUTH_REQUIRED=1`.

**Remaining for the cluster:**
* Move `data/users.json` into the `users` table; keep the same claims and endpoints.
* RLS session variable per request (`SET LOCAL app.client_id`).
* `requireMaster` / `requireClient` helpers so every `/api/master/*` route is explicit
  rather than relying on a header string.
* Refresh-token rotation (7-day refresh, 15-min access) and a signed password-reset link.
* Real Google OAuth client for `app.` and `master.` hosts; set
  `GOOGLE_CLIENT_ID`, `AUTH_REQUIRED=1`, `VITE_AUTH_REQUIRED=1`.
* Keep `DEV_TRUST_HEADER=1` as the only escape hatch, and never in production values.

**Accept:** `/login` renders on both hosts at 1440 px and 390 px; wrong password shows an
inline error; correct password lands on `/command` and survives reload; with
`AUTH_REQUIRED=1` a forged `x-user-id` gets 401; client A cannot read client B's folder by
ID; master token can read both; a client token gets 403 on `/api/scrape/master-sweep`;
suspended client gets 403 with the existing message; Google button completes the flow once
`GOOGLE_CLIENT_ID` is set.

### Phase 4 — Job orchestration (5–7 days)
* `jobs` table + `job_events`.
* `server/src/controller/` — leader election, `POST /jobs` → K8s Job, watch, reconcile,
  abort, TTL cleanup.
* `server/src/worker/runJob.js` — reads `JOB_ID`, builds the same deps object
  `setDeps()` builds today, runs `runOmniSearchOrchestrator`, heartbeats to Redis,
  honours `job:{id}:abort`.
* Move `activeSessions` reads to `jobs` + Redis progress; `/api/scrape/active` and
  `/jobs` read SQL.
* SSE via Redis pub/sub in `liveStreams.js` (keep the current connection hygiene).
* `WORKER_DRIVER=local|k8s`.

**Accept:** start 3 scrapes for 3 different clients → 3 Jobs with 3 distinct job IDs and
correct labels; killing one pod mid-run resumes from `completedZoneIndices`; Stop on any pod
ends the run within one zone; the client cockpit stream survives an api pod restart.

### Phase 5 — Kubernetes + master flows (6–8 days)
* Helm chart, namespaces, RBAC, NetworkPolicy, ResourceQuota, PDB, HPA.
* `sweep` / `sweep-shard` controller logic; zone partitioning; gap reporting; resume.
* `v_master_leads`, `master_lead_index` refresh CronJob, `/api/master/leads`,
  `/api/master/clients/:id/folders`, `/api/master/ingest`.
* Separate ingress hosts; master image never mounted on the client host.

**Accept:** a 30-zone district sweep creates N shards, completes with
`completed_with_gaps` when one shard is deliberately killed, and the master dashboard shows
the client leads plus the sweep leads with correct totals. `kubectl delete pod` on the
controller leader fails over in <30 s without losing a job.

### Phase 6 — Scale, harden, observe (4–5 days)
* Egress gateway + Redis token buckets for Nominatim/Overpass/Bing.
* KEDA `ScaledJob` optional; cluster autoscaler to zero on the browser pool.
* Prometheus/Grafana/Loki, alerts, OTel traces.
* Backup/restore drill: `pg_dump` → restore → counts match.
* Load test: 40 concurrent jobs, 3 api pods, measure p95 latency and error rate.
* Runbooks: stuck job, blocked engine, DB failover, certificate renewal.

**Accept:** 40 concurrent jobs with <1% job failure, queue drains, browser pool scales to
zero after 15 min idle, restore drill passes.

### Phase 7 — Cutover (2 days)
* Freeze writes on the old box, run the importer, verify the three fixtures plus a full
  folder count.
* DNS: `app.` → web-client, `master.` → web-master, `api.` → api.
* Keep the monolith running read-only for 7 days as a fallback.

**Accept:** every saved folder, credit balance and master client exists in the new system
with identical counts; the old box can be powered off without loss.

---

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Playwright image pull on a fresh node | 2–5 min job start | DaemonSet pre-pull + image cache; keep image layers stable |
| Bing/Nominatim/Overpass IP throttling | lower yield | egress gateway, token buckets, honest `blocked` reporting, cache |
| 45-min job ceiling vs state sweeps | truncated sweep | shard by zones; `activeDeadlineSeconds` per shard, not per sweep |
| Postgres connection storm (40 pods × pool) | DB saturation | PgBouncer, `max_connections` per worker = 3, statement timeouts |
| SSE through Ingress buffering | dead dashboard | `proxy-buffering: off`, `proxy-read-timeout: 3600`, heartbeat every 20 s |
| Redis as SPOF | queue loss | managed Redis with AOF, `processing` list + reclaim |
| Duplicate leads from parallel shards | inflated counts | `unique(client_id, dedupe_key)` + Redis NX lock + upsert |
| Spot node eviction | failed shard | resume zones, `backoffLimit: 1`, sweep gap reporting |
| Cost creep (always-on DB + Redis) | bill | managed smallest tier + browser pool at 0; budget alert |
| Keyless sources change markup | engine breakage | engine health checks already exist; alert on `engine_blocked_total` |
| Legal/robots drift | source takedown | robots-aware reader stays; per-source kill switch in config |

---

## 15. Decisions needed before Phase 1

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Cloud | EKS / GKE / AKS / on-prem k3s | **GKE Autopilot or EKS** — best autoscaler + spot story |
| 2 | Postgres | managed (RDS/Cloud SQL) / in-cluster | **Managed** for v1; in-cluster only for dev |
| 3 | Redis | managed (ElastiCache/Memorystore) / in-cluster | **Managed** with AOF |
| 4 | Object storage | S3 / GCS / MinIO | **S3-compatible**; MinIO in compose |
| 5 | Auth | JWT built-in / Auth0 / Clerk | **Built-in JWT** — no new paid dependency |
| 6 | Isolation | shared DB + RLS / namespace per client / DB per client | **Shared DB + RLS** |
| 7 | Expected concurrency | 5 / 20 / 40+ jobs at once | drives pool size and `max_parallel_shards` |
| 8 | Domain layout | `app.` + `master.` + `api.` / path-based | **Subdomains** — cleanest for cookies and CSP |
| 9 | Master data access | read shared tables / signed ingest / both | **Read shared + ingest endpoint** for external installs |

Defaults assumed by the effort estimates above: 3 api pods, 40 max worker pods, managed
Postgres/Redis, shared-DB isolation, GKE or EKS.

---

## 16. Appendix — new env vars

```bash
# storage
STORAGE_DRIVER=postgres            # fs | postgres
DATABASE_URL=postgres://scraper:…@postgres:5432/scraper
DATABASE_POOL_MAX=3                # per worker pod
REDIS_URL=redis://redis:6379

# orchestration
WORKER_DRIVER=k8s                  # local | k8s
WORKER_NAMESPACE=scraper-workers
WORKER_IMAGE=ghcr.io/<org>/scraper-worker:1.0.0
MAX_PARALLEL_SHARDS=10
SWEEP_SHARD_SIZE=8
JOB_DEADLINE_SECONDS=3600

# auth — implemented, Google optional
AUTH_REQUIRED=0                    # 1 = reject anonymous API calls
SESSION_SECRET=<from secret manager>
SESSION_TTL_SECONDS=604800
GOOGLE_CLIENT_ID=                  # empty = Google button shows SETUP
GOOGLE_ALLOWED_DOMAINS=            # optional, comma separated
GOOGLE_MASTER_DOMAIN=              # optional, domain that becomes role=master
GOOGLE_AUTO_PROVISION=0            # 1 = create a user for an allowed domain
MASTER_HOST=master.scraper.co.in   # shown to the client login as the master entry

# auth — front-end build args (baked into the web image)
VITE_AUTH_REQUIRED=0               # must match AUTH_REQUIRED at cutover
VITE_GOOGLE_CLIENT_ID=             # optional; server config is authoritative

# egress
EGRESS_GATEWAY_URL=http://egress-gateway:8080
NOMINATIM_RPS=1
OVERPASS_RPS=1
BING_RPS=0.2

# storage of files
S3_ENDPOINT=
S3_BUCKET=scraper-prod
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# existing, unchanged
PLAYWRIGHT_CONCURRENCY=4
SCRAPER_DATA_DIR=/data
SCRAPER_DB_DIR=/db
```

## 17. Appendix — API surface after the migration

Unchanged (compatibility matters):

```
POST /api/scrape/omni            → 202 { sessionId, jobId, status }
POST /api/scrape/auto            → 202 { sessionId, jobId, status }
POST /api/scrape/master-sweep    → 202 { sessionId, totalZones, zones, policy }
POST /api/scrape/master-sweep/preview
GET  /api/scrape/jobs
GET  /api/scrape/active
GET  /api/scrape/stream/:id      (SSE)
GET  /api/sessions/list
GET  /api/sessions/:id
GET  /api/sessions/export/:id?format=csv|json|xlsx|vcf|txt
```

Added (auth is implemented today, the rest lands in Phases 2–5):

```
GET  /api/auth/config              public: which login methods are enabled
POST /api/auth/login               email/username + password
POST /api/auth/google              Google ID token (credential)
GET  /api/auth/me                  verify the current token
POST /api/auth/logout
GET  /api/ready
GET  /api/master/leads?client=&state=&district=&category=
GET  /api/master/clients/:id/folders
POST /api/master/ingest            (HMAC)
GET  /api/jobs/:id/events
POST /api/jobs/:id/retry
```

Nothing in the client or master SPA has to change shape for Phase 1–2; the URL contracts
stay the same, which is what makes the migration testable folder by folder.
