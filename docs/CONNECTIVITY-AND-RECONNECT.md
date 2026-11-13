# Connectivity & Reconnect Contract

How the desktop client, the Master app and the engine keep one live feed alive —
and what used to break it.

## The bug that made the UI say "Reconnecting … Attempt #473"

Four independent faults combined into a self-reinforcing loop. Each one alone
was survivable; together they made a healthy engine look dead.

| # | Fault | Effect |
|---|-------|--------|
| 1 | `api.js` dispatched `leadharvest:server_online` on **every** successful response | The command centre reacted by reconnecting the stream and refreshing every panel → more responses → more events |
| 2 | The stream cap answered `503` instead of evicting | Once a few stale sockets existed, every new dashboard was refused forever |
| 3 | Client app had no reconnect at all | One `error` event left the feed dead until a full reload |
| 4 | The API limiter counted `/api/health` and stream attach | The storm exhausted the 2400/min ceiling, so liveness checks themselves returned `429`, which the UI read as "engine offline" |

## Rules the code now follows

1. **Connection events are edge-triggered.** `leadharvest:server_offline` fires on
   the first genuine failure; `leadharvest:server_online` fires only on the
   transition back. A `429` is *not* offline — the engine answered.
2. **One owner per socket.** `server/src/services/liveStreams.js` tracks every
   stream, prunes on heartbeat, and closes on `close` / `aborted` / `error` from
   both `req` and `res`.
3. **Caps evict, never reject.** At the cap the *oldest* stream is dropped, so a
   live dashboard can always attach.
4. **Silence is detectable.** A named `heartbeat` event is emitted every 15 s.
   SSE comments (`:ping`) are invisible to JavaScript, which is why a half-open
   socket used to look `LIVE` forever.
5. **Single-flight reconnect.** `createLiveStream` (identical in `client/` and
   `master/`) keeps one socket, backs off 1 s → 30 s with jitter, and retries
   immediately on `online` / `focus` / `visibilitychange`.
6. **Liveness is never throttled.** `/api/health`, `/api/app/info`,
   `/api/logs/stream` and `/api/scrape/stream/*` are exempt from the API limiter.
7. **Dev only:** the Vite proxy releases the upstream socket when the browser
   response closes, so a closed tab cannot leave a ghost stream counted.

## Stream endpoints

| Endpoint | Purpose | Cap |
|----------|---------|-----|
| `GET /api/logs/stream` | Console lines, vendor rows, grid/zone/progress events | 40 |
| `GET /api/scrape/stream/:sessionId` | Vendor rows for one run only | 80 total, 10 per run |

Both send `retry: 5000`, an initial backlog/`connected` frame, and a named
`heartbeat` every 15 s. `/api/health` reports `streams: { logStreams,
logStreamCap, sessionStreams, sessionCap, droppedTotal, lastDropReason }`.

## Verification

```bash
# helper behaviour (single-flight, backoff, heartbeat, stop)
node ..\Temp\opencode\liveStream.test.mjs

# stream hub: attach, heartbeat, eviction, cleanup
node ..\Temp\opencode\sse-test.cjs
node ..\Temp\opencode\session-sse-test.cjs

# live kill/restart: stream must heal itself with no page reload
node ..\Temp\opencode\reconnect-e2e.mjs
```

Expected customer-facing sequence when the engine restarts:

1. pill shows `RECONNECTING`, banner names the truthful attempt number;
2. leads already on screen stay visible;
3. engine returns → `LIVE` returns automatically, banner disappears, no reload.
