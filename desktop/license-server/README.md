# Licence server

Small Express service that mints and validates subscription licences for the
Windows app. It only needs Node and one file of state — deploy it anywhere
(Render, Fly, Oracle Always Free, a ₹300 VPS, Cloud Run).

## Why a separate service

The desktop app embeds only the **public** key. Tokens are signed here with the
**private** key, so a cracked installer still cannot generate working licences.
Validation also has to happen somewhere the customer cannot edit.

## Files

```
.keys/private.pem   signing key (NEVER commit this)
.keys/public.pem    matches desktop/src/config.js
data/licenses.json  minted keys, bindings, expiry
index.js            HTTP API
mint.js             offline key / .scraperlic generator
```

A key pair is already generated in `.keys/` and the public half is embedded in
`desktop/src/config.js`. **Back both files up.** If you rotate the pair, rebuild
and reship the app.

## Run locally

```bash
cd desktop/license-server
npm install
$env:ADMIN_TOKEN="change-me"
node index.js                     # http://127.0.0.1:8790
```

Mint a key:

```bash
node mint.js --plan pro --days 30 --email client@agency.com
node mint.js --plan starter --days 365 --device DEV-XXXX --out client.scraperlic
```

Or over HTTP:

```bash
curl -X POST http://127.0.0.1:8790/admin/keys ^
  -H "content-type: application/json" ^
  -H "x-admin-token: change-me" ^
  -d "{\"plan\":\"pro\",\"days\":30,\"email\":\"client@agency.com\"}"
```

## Enable online activation in the app

Build the desktop app with the API URL baked in:

```powershell
$env:SCRAPER_LICENSE_API = "https://licenses.yourdomain.com"
npm run dist
```

Without that variable the app is offline-only: customers import a
`.scraperlic` file.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/plans` | public plan catalogue |
| POST | `/activate` | `{licenseKey, deviceId, deviceName, email}` → `{token}` |
| POST | `/validate` | `{token, deviceId}` → refreshed `{token}` |
| POST | `/deactivate` | `{licenseKey, deviceId}` → releases a seat |
| POST | `/admin/keys` | mint (`x-admin-token`) |
| POST | `/admin/revoke` | revoke (`x-admin-token`) |
| POST | `/admin/extend` | add days (`x-admin-token`) |
| POST | `/webhooks/payment` | Razorpay/Stripe hook (HMAC verified) |

## Production checklist

1. Set `ADMIN_TOKEN` to a long random value.
2. Put HTTPS in front (Caddy/NGINX or the platform's TLS).
3. Persist `data/licenses.json` on a volume — losing it invalidates every key.
4. Back up `.keys/private.pem` offline. Losing it means every customer must
   re-activate with a new build.
5. Wire `/webhooks/payment` to your Razorpay subscription events before taking
   live payments, so renewals extend `expiresAt` automatically.

## Renewals

`expiresAt` is authoritative. To renew a customer, call `/admin/extend` with the
number of days purchased; their app refreshes silently on the next 6-hour check
and shows the new date.
