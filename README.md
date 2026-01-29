# page-metadata-service

Small HTTP service that fetches a web page and extracts common preview metadata (OpenGraph/Twitter/HTML) such as title, description, image, canonical URL, and favicon.

It exposes a single `/metadata` endpoint intended for link-preview style use-cases. Results can be cached in Redis (optional).

## Features

- **Metadata extraction**
  - `og:*` (OpenGraph)
  - `twitter:*`
  - HTML `<title>` and `<meta name="description">`
  - Canonical URL (`<link rel="canonical">`)
  - Favicon (`<link rel="icon">`, `shortcut icon`, `apple-touch-icon`)
- **Fetch safety**
  - Timeout via `FETCH_TIMEOUT_MS`
  - Response size limit via `MAX_BYTES`
  - Only `http:`/`https:` URLs
  - Requires upstream `content-type` to include `text/html`
- **Caching (optional)**
  - Redis caching keyed by URL with TTL (`CACHE_TTL_SECONDS`)
  - Response header `x-cache` indicates `HIT`, `MISS`, or `BYPASS`

## Requirements

- Node.js `>= 18`
- (Optional) Redis if you want caching enabled

## Install

```bash
yarn install
```

## Running

### Production

```bash
yarn build
yarn start
```

By default the server listens on port `3000`.

### Development (watch mode)

`dev` sets a default port and Redis URL and runs Node in watch mode:

```bash
yarn dev
```

This uses:

- `PORT=3005`
- `REDIS_URL=redis://127.0.0.1:6379`

If you want different values, set environment variables yourself and run `yarn start`.

## Configuration

The service is configured via environment variables:

- `PORT`
  - Default: `3000`
- `REDIS_URL`
  - Default: `redis://127.0.0.1:6379`
  - If Redis is unavailable at runtime, requests still work but cache will be bypassed.
- `CACHE_TTL_SECONDS`
  - Default: `300`
  - If `<= 0`, caching is effectively disabled.
- `FETCH_TIMEOUT_MS`
  - Default: `12000`
- `MAX_BYTES`
  - Default: `1500000` (1.5MB)

## API

### `GET /health`

Basic health endpoint.

Response includes Redis status:

```json
{
  "ok": true,
  "redis": {
    "enabled": true,
    "ready": true,
    "isOpen": true,
    "isReady": true,
    "url": "redis://127.0.0.1:6379"
  }
}
```

### `GET /metadata?url=...`

Fetches the given URL and returns extracted metadata.

- The `url` query parameter is required.
- Only `http`/`https` URLs are accepted.

Example:

```bash
curl -s "http://localhost:3000/metadata?url=https://example.com" | jq
```

Success response:

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com/",
  "metadata": {
    "title": "Example Domain",
    "description": "...",
    "image": null,
    "siteName": null,
    "type": null,
    "locale": null,
    "canonicalUrl": "https://example.com/",
    "favicon": "https://example.com/favicon.ico"
  }
}
```

Caching behavior:

- `x-cache: HIT` means the JSON response was served from Redis.
- `x-cache: MISS` means Redis was checked but no cached value existed.
- `x-cache: BYPASS` means Redis was disabled/unavailable or an error occurred while checking.

Error responses:

- `400` for validation errors (e.g., missing/invalid URL)
- `504` when the upstream fetch times out
- `502` when upstream returns non-2xx
- `415` when upstream is not `text/html`

## Testing

Run the test suite:

```bash
yarn test
```

Notes:

- Tests use Jest.
- Coverage thresholds are enforced (global 90% for lines/functions/branches/statements).

### Coverage

```bash
yarn coverage
```

This will write an HTML report to `coverage/`.

## Project structure

- `server.ts`
  - Starts the HTTP server.
- `src/app.ts`
  - Express app wiring (CORS + routes).
- `src/routes/health.ts`
  - `/health` endpoint.
- `src/routes/metadata.ts`
  - `/metadata` endpoint.
- `src/metadataUtils.ts`
  - URL validation, response size limiting, and metadata extraction.
- `src/redis.ts`
  - Redis client + readiness tracking.

Build output:

- `dist/`
  - Compiled JavaScript output from `tsc` (used by `yarn start`).
