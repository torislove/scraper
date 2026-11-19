# What this costs to run

List-price estimates for the architecture in `docs/DEPLOYMENT-PLAN.md`, in
**us-central1**, checked **2026-11-20**. Everything is USD. Google changes prices;
re-check the billing console before you sign anything.

The short version:

| You run | Fixed / month | Per scrape | Typical monthly bill |
|---|---|---|---|
| **Launch** — up to 10 scrapes at once, ~500/month | **$229** | ~$0.018 | **≈ $238** |
| **Growth** — up to 50 at once, ~5,000/month | **$508** | ~$0.018 | **≈ $598** |
| **Scale** — up to 200 at once, ~50,000/month | **$1,305** | ~$0.018 | **≈ $2,205** |
| **10,000 scrapes literally at the same moment** | — | — | **≈ $325/hour** (Spot) |

There are **no data-source fees**. Every engine is keyless (OSM, Nominatim, Photon,
public Maps, Bing, DuckDuckGo, direct directory reads). You pay for compute, database,
cache, storage and egress — not for API calls.

---

## 1. The one number that matters

**A normal client scrape costs about 1–2 cents.**

| Piece | Cost |
|---|---|
| Browser pod time (Spot, 2 vCPU / 4 GiB, ~9 min for a 108-zone run) | $0.005 |
| Egress for the pages the worker reads (~100 MB) | $0.013 |
| Database writes, Redis, logging | < $0.001 |
| **Total** | **≈ $0.018** |

Sweeps scale with zones, not with users:

| Run | Zones | Worker hours | Compute | Egress | Total |
|---|---|---|---|---|---|
| Small town, one category | ~20 | 0.03 | $0.001 | $0.002 | **~$0.003** |
| District sweep | ~100 | 0.15 | $0.005 | $0.012 | **~$0.02** |
| State sweep | ~1,200 | 10 | $0.33 | $0.70 | **~$1.50–2.50** |

The egress line is the one people forget. Scraping *reads* the public web, and
that traffic leaves the VPC, so it is billed: **$0.12/GiB** internet egress plus
**$0.045/GiB** Cloud NAT processing. Inbound responses are free; the request and
connection traffic is what is metered.

---

## 2. Rates used

| Resource | Rate (us-central1, list) |
|---|---|
| GKE Autopilot, general purpose | $0.0445 / vCPU-hour |
| GKE Autopilot, memory | $0.0049225 / GiB-hour |
| GKE Autopilot, Spot | $0.0133 / vCPU-hour + $0.0014767 / GiB-hour |
| GKE cluster management | $0.10 / hour, offset by a **$74.40 / month credit** |
| Cloud SQL Enterprise, vCPU | $0.0413 / hour |
| Cloud SQL Enterprise, memory | $0.0070 / GiB-hour |
| Cloud SQL SSD | $0.000232877 / GiB-hour (≈ $0.17 / GiB-month) |
| Cloud SQL HA (regional) | doubles the vCPU + memory line |
| Memorystore Redis, Basic M1 (1–4 GiB) | $0.049 / GiB-hour |
| Memorystore Redis, Standard M1 | $0.064 / GiB-hour |
| Load balancer, first 5 forwarding rules | $0.025 / hour combined |
| Load balancer data processing | $0.008 / GiB in + out |
| Cloud NAT gateway | $0.0448 / hour (32-VM cap) + $0.045 / GiB |
| Internet egress | $0.12 / GiB (first 10 TiB) |
| GCS Standard | $0.020 / GiB-month |
| Artifact Registry | $0.10 / GiB-month |
| Cloud Logging | 50 GiB free, then $0.50 / GiB |

Because Autopilot bills **requests, not nodes**, the way to cut the bill is to
right-size the pod requests, not to buy smaller machines. A pod that asks for
4 vCPU when it uses 1.2 costs 3.3× too much.

---

## 3. Tier A — Launch

Up to 10 concurrent scrapes, ~500 scrapes/month, first paying clients.

| Line | Monthly |
|---|---|
| `api` × 2 (0.5 vCPU / 1 GiB) | $39.68 |
| `job-controller` × 1 (0.25 / 0.5) | $9.92 |
| `web-client` + `web-master` (0.25 / 0.5 each) | $19.84 |
| GKE cluster fee | $0.00 (credit covers it) |
| Cloud SQL Enterprise, 1 vCPU / 3.75 GiB / 50 GiB SSD, zonal | $57.81 |
| Memorystore Basic 1 GiB | $35.77 |
| External load balancer (1 rule) | $18.25 |
| Cloud NAT | $32.70 |
| Egress, 100 GiB | $12.00 |
| GCS 50 GiB + Artifact Registry 15 GiB + DNS | $3.50 |
| **Fixed** | **$229** |
| 500 scrapes × $0.018 | $9 |
| **Total** | **≈ $238 / month** |

The browser pool is Spot and scales to **zero** when idle, so it adds nothing to
the fixed line. At 500 scrapes/month the fixed cost dominates: **$0.48 per scrape
blended**. That is why the first clients are the expensive ones.

---

## 4. Tier B — Growth

Up to 50 concurrent scrapes, ~5,000/month, HA database.

| Line | Monthly |
|---|---|
| `api` × 3 (0.5 / 1) | $59.52 |
| `job-controller` × 1 | $9.92 |
| `web` × 3 | $29.76 |
| Cloud SQL Enterprise **HA**, 2 vCPU / 8 GiB / 100 GiB SSD | $219.36 |
| Memorystore Standard 1 GiB | $46.72 |
| Load balancer | $18.25 |
| Cloud NAT | $32.70 |
| Egress, 500 GiB | $60.00 |
| GCS 200 GiB + Artifact Registry 20 GiB + DNS | $7.00 |
| Logging, 50 GiB over the free tier | $25.00 |
| **Fixed** | **$508** |
| 5,000 scrapes × $0.018 | $90 |
| **Total** | **≈ $598 / month** |

**$0.12 per scrape blended.** Twenty clients sharing this tier cost about
**$30 per client per month** in infrastructure.

---

## 5. Tier C — Scale

Up to 200 concurrent scrapes, ~50,000/month.

| Line | Monthly |
|---|---|
| `api` × 5 (1 vCPU / 2 GiB) | $198.35 |
| `job-controller` × 2 | $19.84 |
| `web` × 3 | $29.76 |
| Cloud SQL Enterprise **HA**, 4 vCPU / 16 GiB / 500 GiB SSD | $489.71 |
| Memorystore Standard 5 GiB | $197.10 |
| Load balancer | $18.25 |
| Cloud NAT | $32.70 |
| Egress, 2 TiB | $245.76 |
| GCS 1 TiB + Artifact Registry 25 GiB + DNS | $23.98 |
| Logging, 100 GiB over the free tier | $50.00 |
| **Fixed** | **$1,305** |
| 50,000 scrapes × $0.018 | $900 |
| **Total** | **≈ $2,205 / month** |

**$0.044 per scrape blended.** Past this point, **egress and the keyless sources
bind before the cluster does** — more pods do not make Bing answer faster.

---

## 6. The "10,000 customers" question

10,000 **registered** users is not 10,000 **simultaneous** scrapes. The bill
follows concurrency, not headcount.

| Situation | Concurrent pods | Spot cost/hour |
|---|---|---|
| 10,000 users, 0.5% scraping at once | 50 | ~$1.63 |
| 10,000 users, 1% scraping at once | 100 | ~$3.25 |
| 10,000 users, 5% scraping at once | 500 | ~$16.25 |
| **10,000 scrapes at the same instant** | 10,000 | **~$325** (Spot), **~$1,087** (on-demand) |

So the honest statement is: **10,000 queued jobs is a normal day; 10,000
simultaneous Chromium pods is ~$325/hour** and needs a GKE quota increase.
The queue-first design in `DEPLOYMENT-PLAN.md` §3.4 accepts all 10,000
immediately with a job ID and runs `min(queue, MAX_PARALLEL_JOBS, source budget)`.

Raising `MAX_PARALLEL_JOBS` is the only dial that changes the bill materially.

---

## 7. What is free

| Thing | Cost |
|---|---|
| Google Sign-In (ID-token verification via `tokeninfo`) | $0 |
| OSM / Overpass / Nominatim / Photon | $0 |
| Bing, DuckDuckGo, public Maps reads | $0 |
| The local hashed-TF-IDF brain | $0 (CPU only) |
| The 619k-village gazetteer | $0 (baked into the image) |
| JWT / scrypt auth | $0 |
| Postgres row-level security | $0 |

This is the whole point of the keyless design: the marginal cost of a lead is
compute and bandwidth, not a per-record fee.

---

## 8. Cost controls that are already in the plan

1. **Spot for the browser pool.** ~70% off; a scrape is resumable via
   `RESUME_ZONES`, so an eviction is a retry, not a lost run.
2. **Scale to zero.** `min=0` on the worker compute class.
3. **Right-sized requests.** 2 vCPU / 4 GiB per worker, not 4 / 16.
4. **`MAX_PARALLEL_JOBS` as the budget dial.** 25 at launch, raise on purpose.
5. **Per-client cap** (`CLIENT_MAX_CONCURRENT_JOBS=2`) so one workspace cannot
   occupy the pool and run up the bill.
6. **Sweep share cap** (`SWEEP_POOL_SHARE=0.4`) so a state sweep never starves
   paying client work.
7. **Caching.** Bing/DuckDuckGo results and geocodes are cached in Redis; a
   repeated district sweep should cost a fraction of the first.
8. **GCS lifecycle rules.** Exports move to Nearline/Coldline after 30 days;
   scrape vaults are already the source of truth in Postgres.
9. **Committed use.** 1-year CUD ≈ 20% off, 3-year ≈ 40% off the GKE and SQL
   compute lines once the load is predictable.
10. **Budget alerts.** Set a $50 / $200 / $500 ladder in Billing before launch.

---

## 9. What could blow the budget

| Risk | Why | Guard |
|---|---|---|
| Egress at scale | 50k scrapes ≈ 5 TB of fetched pages | Cache aggressively; prefer directory reads over full-page crawls |
| Oversized pod requests | Autopilot bills the request, not the use | Keep the Job template fixed; review requests monthly |
| A stuck Job | Runs until `activeDeadlineSeconds` | 45-minute ceiling already in the plan |
| Log volume | Every engine line to Cloud Logging | Structured logs, 7-day retention, sample debug |
| Cross-region traffic | Pods in one region, DB in another | Keep everything in one region |
| NAT hairpin | Every scraped byte crosses NAT | One gateway, same region |
| Idle managed services | Cloud SQL + Memorystore bill 24/7 | Accept for production; use a small dev instance |

---

## 10. Month one

A new Google Cloud account gets **$300 in credit**. Tier A is **~$238/month**,
so month one is effectively **free**, and the credit covers roughly six weeks
of Growth-tier fixed cost.

---

## 11. How to verify these numbers

1. Export billing to BigQuery: **Billing → Billing export → BigQuery**.
2. Tag every resource: `app=scraper`, `env=prod`, `tier=worker`.
3. Build the dashboard from `cost + usage.amount` grouped by `service.description`.
4. Compare after the first 100 scrapes: the delta divided by 100 is your real
   per-scrape cost, and it should land near **$0.018**.

The rates above were read on **2026-11-20** from the GKE, Cloud SQL,
Memorystore, Cloud Load Balancing, VPC network and Cloud Storage pricing pages.
They are list prices, exclude tax and any negotiated discount, and will drift.
