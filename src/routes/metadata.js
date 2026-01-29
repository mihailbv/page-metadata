import { Router } from "express";
import { CACHE_TTL_SECONDS, FETCH_TIMEOUT_MS, MAX_BYTES } from "../config.js";
import { redisClient, getRedisReady } from "../redis.js";
import { extractMetadata, parseAndValidateUrl, readBodyWithLimit } from "../metadataUtils.js";

export function createMetadataRouter() {
  const router = Router();

  router.get("/metadata", async (req, res) => {
    try {
      const url = parseAndValidateUrl(req.query.url);
      const cacheKey = `page-metadata:v1:${url.toString()}`;

      if (redisClient && getRedisReady()) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            res.set("x-cache", "HIT");
            res.type("application/json").send(cached);
            return;
          }
          res.set("x-cache", "MISS");
        } catch {
          res.set("x-cache", "BYPASS");
        }
      } else {
        res.set("x-cache", "BYPASS");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "page-metadata-service/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        res.status(502).json({
          error: "Upstream returned non-2xx",
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          finalUrl: response.url,
        });
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        res.status(415).json({
          error: "Upstream content-type is not text/html",
          contentType,
          url: url.toString(),
          finalUrl: response.url,
        });
        return;
      }

      const html = await readBodyWithLimit(response, MAX_BYTES);
      const metadata = extractMetadata(html, response.url);

      const payload = {
        url: url.toString(),
        finalUrl: response.url,
        metadata,
      };

      if (redisClient && getRedisReady() && Number.isFinite(CACHE_TTL_SECONDS) && CACHE_TTL_SECONDS > 0) {
        try {
          const cachedPayload = {
            ...payload,
            cache: {
              cachedAt: new Date().toISOString(),
            },
          };
          await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(cachedPayload));
        } catch {
          // ignore
        }
      }

      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      const isAbort =
        err &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "AbortError";

      res.status(isAbort ? 504 : 400).json({
        error: message,
      });
    }
  });

  return router;
}
