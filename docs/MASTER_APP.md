# Master Command Center

> Planning the intelligence layer (geo resolution, zone scoring, engine matrix, swarm
> control): see `docs/MASTER_SWEEP_INTELLIGENCE.md`.

The master app is the operator's side of Scraper. It is a **separate Vite app**
in `master/` (default port `5174`) and talks to the same local engine on `:5002`.
Clients never see it, and client builds never include it.

```
client/    customer app + website   → :5173, builds to client/dist*, becomes the desktop shell
master/    operator app             → :5174, builds to master/dist (not shipped to clients)
server/    one local engine         → :5002, serves both
```

## Run it

```powershell
# terminal 1 — engine
cd server ; node index.js

# terminal 2 — master app
cd master ; npm run dev      # http://localhost:5174
```

Routes:

| URL | screen |
|---|---|
| `/` or `/command` | sweep map, live leads, CRM, folders |
| `/clients` | client desk: plans, pause/resume, folders, import, messages |
| `/landing` | marketing page (preview only) |

## What the master can do

### 1. Client registry (`/clients`)

Every workspace directory under `server/db/user_sessions/<id>` is a client.
The desk lists workspaces that actually have data, and hides empty test
visitors behind **Show empty**.

- set display name, email/phone, plan and credits
- **Pause** a client: new searches return `403 account_suspended`; saved folders,
  CRM notes and exports keep working
- open **Their folders** and inspect every saved search
- **Import** folders into the master workspace:
  - *separate* → one master folder per client folder
  - *consolidate* → one master folder per client, deduped by lead id
- add a client manually with the device id from their app

A client is identified by the same id the client app stores in
`localStorage.gomandap_user_uuid` and sends as `x-user-id`. There are no
passwords: the boundary is the local machine.

### 2. Messages (`/clients → Messages`)

Compose a title, body and tone (`info | success | warning`) for one client or
all clients. The client app polls `/api/notifications` and shows them in the
bell beside the credits pill. A suspended workspace also sees a red notice
there.

Messages live in `<DATA_DIR>/master/notifications.json`; the client can only
mark its own copy read.

### 3. Sweeps (`/command → Master Folders`)

The master may search far wider than a client:

| scope | resolves to |
|---|---|
| `city` | the classifier's localities for that city (Vijayawada → 15 zones) |
| `mandal` | every village in that mandal (Tenali → 9) |
| `district` | every mandal in the district (Guntur → 56, capped at 80) |
| `state` | every district in the state (Andhra Pradesh → 13, capped at 80) |

Location resolution uses the indexed gazetteer
(`server/src/utils/universalGeoCluster.js`: 36 states, 627 districts, 5,618
mandals), with the classifier as a fallback for names that are not indexed.

Filters are applied to the **saved** folder after the sweep, so every zone is
still searched:

| filter | effect |
|---|---|
| `minRating` | drop leads below the star rating |
| `mobileOnly` | keep only valid 10-digit Indian mobiles (`^[6-9]\d{9}$`) |
| `hasWebsite` | keep only leads with a website |
| `verifiedOnly` | `verified` or profile quality score ≥ 70 |

Filters are recorded in the folder metadata (`metadata.filters`,
`metadata.harvestedBeforeFilters`), so the operator can see what was removed.

Client searches are deliberately narrower: a client may search one city, town
or village at a time. Asking a client build for a district, mandal or state
returns `403` with a message pointing at the master. Wide-area runs are a
custom service the operator performs.

## API

All master routes require `x-workspace-scope: master`. If `MASTER_KEY` is set on
the engine, they also require `x-master-key`. The master UI stores the key in
`localStorage.scraper_master_key` when one is needed.

| method | path | purpose |
|---|---|---|
| GET | `/api/master/overview` | headline counts |
| GET | `/api/master/clients` | registry + folder/lead totals + plans |
| POST | `/api/master/clients` | add a client |
| PATCH | `/api/master/clients/:id` | rename, plan, credits, pause/resume |
| DELETE | `/api/master/clients/:id` | remove the record (folders stay) |
| GET | `/api/master/clients/:id/sessions` | that client's folders |
| POST | `/api/master/clients/:id/import` | copy folders into the master workspace |
| GET/POST | `/api/master/notifications` | history / send |
| DELETE | `/api/master/notifications/:id` | delete a message |
| POST | `/api/scrape/master-sweep` | city / mandal / district / state sweep |

Client-side notification routes:

| method | path | purpose |
|---|---|---|
| GET | `/api/notifications` | this client's inbox + unread count |
| GET | `/api/notifications/status` | this client's plan/status/credits |
| POST | `/api/notifications/:id/read` | mark read |

`/api/master/*` and `/api/notifications/*` send `Cache-Control: no-store`;
without it a browser can serve a 304 and hide a folder that was just imported.

## Storage

```
<DATA_DIR>/master/clients.json          operator metadata per workspace
<DATA_DIR>/master/notifications.json    messages (max 500)
<DB_DIR>/user_sessions/<clientId>/      the client's own folders
<DB_DIR>/user_sessions/master/          imported / consolidated folders
```

Nothing in the client vault is rewritten by the desk. Import copies data and
records `metadata.importedFrom`; the original folder stays where it is.

## Security notes

- This is a **single-machine** trust model. The scope header is the boundary;
  do not expose `:5002` to a network without setting `MASTER_KEY` and putting
  the engine behind a reverse proxy.
- Suspension is enforced by `server/src/middleware/clientGate.js` before every
  `/api/scrape` call. It is not a licence revocation; the client can still read
  and export what they already own.
- Credits shown in the desk are bookkeeping. The device-side wallet
  (`desktop/src/license/credits.js` + the registry anchor) remains the thing
  that actually stops a client's searches.
