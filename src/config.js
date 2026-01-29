export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

export const FETCH_TIMEOUT_MS = process.env.FETCH_TIMEOUT_MS
  ? Number(process.env.FETCH_TIMEOUT_MS)
  : 12_000;

export const MAX_BYTES = process.env.MAX_BYTES ? Number(process.env.MAX_BYTES) : 1_500_000;

export const CACHE_TTL_SECONDS = process.env.CACHE_TTL_SECONDS
  ? Number(process.env.CACHE_TTL_SECONDS)
  : 300;

export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
