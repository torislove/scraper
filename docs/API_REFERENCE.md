# Scraper.co.in — Complete API Reference

The backend runs on `http://localhost:5002` and exposes standard REST and Server-Sent Events (SSE) endpoints.

---

## 1. System & Health

### `GET /api/health`
Returns server operational status, memory usage, and polyglot engine availability.
```json
{
  "ok": true,
  "status": "online",
  "ramMb": 74,
  "heapUsedMb": 11,
  "engines": {
    "gosom": "ready (native go binary)",
    "tlsSidecar": "ready (primp + curl_cffi)",
    "lightpanda": "ready (zig cdp)"
  }
}
```

---

## 2. Authentication

### `GET /api/auth/config`
Returns frontend authentication capability flags.
```json
{
  "authRequired": true,
  "allowSelfSignup": true,
  "firebaseAuthEnabled": true,
  "freeTrialDays": 7
}
```

### `POST /api/auth/login`
Authenticates user by email/username and password.
- **Request Body**: `{ "email": "admin@scraper.co.in", "password": "admin123", "remember": true }`
- **Response**: `{ "token": "...", "expiresAt": "...", "user": { "id": "...", "email": "...", "role": "admin", "credits": 999999 } }`

### `POST /api/auth/register`
Creates a new customer account.
- **Request Body**: `{ "name": "John Doe", "email": "john@example.com", "password": "secretpassword", "plan": "starter" }`
- **Response**: `{ "token": "...", "expiresAt": "...", "user": { "id": "...", "email": "...", "credits": 10000 } }`

### `GET /api/auth/me`
Validates `Authorization: Bearer <token>` header and returns authenticated user profile and credit balance.

---

## 3. Scrape Operations

### `POST /api/scrape/start` (Aliases: `/api/scrape/omni`, `/api/scrape/auto`)
Starts a new sweep session across localized zones.
- **Request Body**:
  ```json
  {
    "query": "Bakeries",
    "location": "Guntur",
    "country": "IN",
    "targetLeads": 100,
    "depth": 1,
    "extractEmails": true
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "sessionId": "sweep_1795771144230_hlqeq",
    "status": "running",
    "cityName": "Guntur",
    "totalZones": 15,
    "subcategories": ["Fresh Bread & Pastry Bakeries", "Custom Birthday Cake Bakeries"]
  }
  ```

### `POST /api/scrape/jobs/stop-all` (Alias: `/api/scrape/stop`)
Aborts the active sweep session.
- **Request Body**: `{ "sessionId": "sweep_..." }`

---

## 4. Real-Time Streaming (SSE)

### `GET /api/logs/stream` (Aliases: `/api/live/stream`, `/api/scrape/stream`)
Server-Sent Events endpoint streaming live events:
- **`vendor`**: Live lead card arrival.
- **`progress`**: Sweep progress, completed zones, and vendors count.
- **`activePoint`**: Current zone map pin coordinates.
- **`ping`**: Keepalive heartbeat every 15 seconds.

---

## 5. Leads & Data Vault

### `GET /api/vendors` (Alias: `/api/admin/data/leads`)
Query stored leads with optional filters (`?search=...`, `?city=...`, `?hasMobile=true`, `?sessionId=...`).

### `GET /api/export/csv` (Alias: `/api/sessions/export`)
Downloads a clean, formatted CSV export of harvested leads.

---

## 6. Taxonomy & Geo

### `GET /api/taxonomy?country=IN`
Returns all sectors, categories, and subcategories for the given country.

### `GET /api/taxonomy/countries`
Returns full manifest of all supported sovereign nations.

### `GET /api/locations/suggest?q=guntur`
Autocomplete endpoint returning verified cities and zone counts.

---

## 7. Admin Panel Endpoints

- `GET /api/admin/overview`: Overview counters (total leads, active sessions, registered users, RAM).
- `GET /api/admin/clients`: Customer accounts directory.
- `POST /api/admin/clients`: Register/create client account.
- `DELETE /api/admin/clients/:id`: Delete client account.
- `GET /api/admin/metrics/countries`: Leads distribution by country.
- `POST /api/admin/data/reset-leads`: Clear lead database.
- `GET /api/admin/popups`: Promo popup settings.
