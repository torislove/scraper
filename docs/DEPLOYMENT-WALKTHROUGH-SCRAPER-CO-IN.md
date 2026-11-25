# Deployment & Live Operations Walkthrough — `scraper.co.in`

> [!NOTE]
> All code for **Free Firebase Auth (`scraper-37c72` Spark plan)**, **7-Day No-Payment Launch Access**, **1-Click Frictionless Scraping**, and **Automatic Multi-Site Firebase + Railway CI/CD** is configured across `client/`, `master/`, `admin/`, and `server/`. Follow **Steps 1 -> 4** below in exact order to complete or verify live domain & authentication activation.

---

## Master Link Directory (In Execution Order)

| Order | Stage | Direct Link |
| :--- | :--- | :--- |
| **1** | **GitHub Private Repo (`torislove/scraper`)** | https://github.com/torislove/scraper |
| **2** | **GitHub Collaborators** | https://github.com/torislove/scraper/settings/access |
| **3** | **GitHub Actions Secrets (`FIREBASE_TOKEN`)** | https://github.com/torislove/scraper/settings/secrets/actions |
| **4** | **GitHub Actions CI/CD Live Runs** | https://github.com/torislove/scraper/actions |
| **5** | **Firebase Hosting Sites (`scraper-37c72`)** | https://console.firebase.google.com/project/scraper-37c72/hosting/sites |
| **6** | **Firebase Auth Sign-In Providers (Email + Google)** | https://console.firebase.google.com/project/scraper-37c72/authentication/providers |
| **7** | **Firebase Auth Authorized Domains** | https://console.firebase.google.com/project/scraper-37c72/authentication/settings |
| **8** | **Railway Backend Service (`scraper`)** | https://railway.com/project/da41464c-b630-4adf-90dc-3fedf772022d/service/327dbd48-4572-4cf5-a0f3-ba314dd2ff12?environmentId=63b02a5d-01b4-432d-b46b-5cfa079fea43 |
| **9** | **GoDaddy DNS Manager (`scraper.co.in`)** | https://dcc.godaddy.com/manage/scraper.co.in/dns |
| **10** | **Live API Health (`api.scraper.co.in`)** | https://api.scraper.co.in/api/health *(Railway direct: https://kcl77j8o.up.railway.app/api/health)* |
| **11** | **Live Landing + Client (`scraper.co.in`)** | https://scraper.co.in *(Firebase direct: https://scraper-37c72.web.app)* |
| **12** | **Live Master Fleet (`master.scraper.co.in`)** | https://master.scraper.co.in/login *(Firebase direct: https://scraper-37c72-master.web.app/login)* |
| **13** | **Live Admin Console (`admin.scraper.co.in`)** | https://admin.scraper.co.in *(Firebase direct: https://scraper-37c72-admin.web.app)* |

---

## Step 1 — Run the 1-Command Firebase Multi-Site + GitHub CI/CD Setup

Open PowerShell in the project root (`c:\Users\manoj\Desktop\scraper`) and run:

```powershell
npm run setup:firebase-cicd
```

This Node.js script ([`scripts/setup-firebase-cicd.cjs`](../scripts/setup-firebase-cicd.cjs)) automatically:
1. Signs into Firebase CLI (if not signed in yet)
2. Creates **`scraper-37c72-master`** and **`scraper-37c72-admin`** alongside your default **`scraper-37c72`** Hosting site (mapped in [`.firebaserc`](../.firebaserc) and [`firebase.json`](../firebase.json))
3. Generates `FIREBASE_TOKEN` and saves it directly into https://github.com/torislove/scraper/settings/secrets/actions so every future `git push origin main` deploys all 3 sites automatically via [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml)
4. Builds and deploys Client, Master, and Admin live immediately!

---

## Step 2 — Enable Free Firebase Sign-In & Custom Domains (`scraper-37c72`)

Click these 3 links in order:

1. **Enable Sign-In Providers**: https://console.firebase.google.com/project/scraper-37c72/authentication/providers
   - Turn ON **Email/Password** -> **Save**
   - Turn ON **Google** -> **Save** *(stays 100% free up to 50,000 MAUs on the Spark plan — leave Phone Auth off so no Blaze card is needed)*
2. **Add Authorized Domains**: https://console.firebase.google.com/project/scraper-37c72/authentication/settings
   - Add: `scraper.co.in`, `www.scraper.co.in`, `master.scraper.co.in`, `admin.scraper.co.in`
3. **Attach Custom Domains to Your 3 Hosting Sites**: https://console.firebase.google.com/project/scraper-37c72/hosting/sites
   - Site **`scraper-37c72`** -> **Add custom domain** -> `scraper.co.in` (and `www.scraper.co.in`)
   - Site **`scraper-37c72-master`** -> **Add custom domain** -> `master.scraper.co.in`
   - Site **`scraper-37c72-admin`** -> **Add custom domain** -> `admin.scraper.co.in`

---

## Step 3 — Verify Railway Volume & Production Variables (`api.scraper.co.in`)

Open your Railway `scraper` service:
https://railway.com/project/da41464c-b630-4adf-90dc-3fedf772022d/service/327dbd48-4572-4cf5-a0f3-ba314dd2ff12?environmentId=63b02a5d-01b4-432d-b46b-5cfa079fea43

1. Ensure a **Volume** is mounted at **`/storage`**.
2. In **Variables**, confirm:

| Variable | Value |
| :--- | :--- |
| `SCRAPER_DATA_DIR` | `/storage/data` |
| `SCRAPER_DB_DIR` | `/storage/db` |
| `SESSION_SECRET` | `<48-byte-random-hex>` *(generate via `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) * |
| `ADMIN_PASSWORD` | `<your-strong-master-password>` |
| `GOOGLE_MASTER_EMAILS` | `<your-gmail-address>` |
| `ALLOWED_ORIGINS` | `scraper.co.in,www.scraper.co.in,master.scraper.co.in,admin.scraper.co.in,scraper-37c72.web.app,scraper-37c72-master.web.app,scraper-37c72-admin.web.app` |
| `AUTH_REQUIRED` | `1` |
| `ALLOW_SELF_SIGNUP` | `1` |
| `GOOGLE_OPEN_SIGNUP` | `1` |
| `FREE_TRIAL_DAYS` | `7` |
| `PAYMENT_ENFORCEMENT` | `0` |
| `COMPUTE_MODE` | `hybrid` |
| `SCRAPER_EXTENSION_ONLY` | `false` |

> [!TIP]
> After week 1, if you ever want to enforce paid plans after each user's 7-day trial ends, flip `PAYMENT_ENFORCEMENT=1` in Railway Variables (or set `LAUNCH_FREE_UNTIL` to an ISO date).

---

## Step 4 — Enter GoDaddy DNS Records (`scraper.co.in`)

Open GoDaddy DNS Manager: https://dcc.godaddy.com/manage/scraper.co.in/dns
*(Remove any default `@ -> Parked` record first, and do **not** type `.scraper.co.in` inside the `Name` field)*:

| # | Subdomain | Type | GoDaddy `Name` | GoDaddy `Value` | TTL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `api.scraper.co.in` | `CNAME` | `api` | `kcl77j8o.up.railway.app` | `600` |
| **2** | Railway SSL Verify | `TXT` | `_railway-verify.api` | *(full `railway-verify=58a318...` string from Railway)* | `600` |
| **3** | `scraper.co.in` | `A` | `@` | `199.36.158.100` *(from Firebase `scraper-37c72`)* | `600` |
| **4** | Root Verify | `TXT` | `@` | `hosting-site=scraper-37c72` *(from Firebase)* | `600` |
| **5** | `www.scraper.co.in` | `CNAME` | `www` | `scraper-37c72.web.app` | `600` |
| **6** | `master.scraper.co.in` | `A` / `CNAME` | `master` | `199.36.158.100` / `scraper-37c72-master.web.app` *(+ Firebase TXT verify)* | `600` |
| **7** | `admin.scraper.co.in` | `A` / `CNAME` | `admin` | `199.36.158.100` / `scraper-37c72-admin.web.app` *(+ Firebase TXT verify)* | `600` |

---

## Daily Git + Automatic CI/CD Commands

Whenever you make changes locally, run:

```powershell
git status -sb
git add -A
git commit -m "describe your update"
git push origin main
```

Every push to `main` automatically:
1. Runs [`verify.yml`](../.github/workflows/verify.yml) (`client-ci`, `master-ci`, `admin-ci`, `server-ci`)
2. Deploys Client (`scraper.co.in`), Master (`master.scraper.co.in`), and Admin (`admin.scraper.co.in`) to Firebase via [`deploy-web.yml`](../.github/workflows/deploy-web.yml)
3. Rebuilds and redeploys the backend server (`api.scraper.co.in`) on Railway via [`railway.json`](../railway.json) + [`Dockerfile.server`](../Dockerfile.server)
