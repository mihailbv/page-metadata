import request from "supertest";
import { jest } from "@jest/globals";
import { createApp } from "#app";

type HtmlResponseOptions = {
  url?: string;
  status?: number;
  contentType?: string;
};

function makeHtmlResponse(html: string, { url, status = 200, contentType = "text/html" }: HtmlResponseOptions = {}) {
  const res = new Response(html, {
    status,
    headers: {
      "content-type": contentType,
    },
  });

  if (url) {
    Object.defineProperty(res, "url", {
      value: url,
      configurable: true,
    });
  }

  return res;
}

describe("GET /metadata cache behavior", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("sets x-cache HIT and returns cached payload when redis has a value", async () => {
    const cachedJson = JSON.stringify({ ok: true, fromCache: true });

    const fakeRedisClient = {
      get: jest.fn(() => Promise.resolve(cachedJson)),
      setEx: jest.fn(() => Promise.resolve()),
    };

    jest.unstable_mockModule("#config", () => ({
      CACHE_TTL_SECONDS: 300,
      FETCH_TIMEOUT_MS: 12_000,
      MAX_BYTES: 1_500_000,
      REDIS_URL: "redis://fake",
    }));
    jest.unstable_mockModule("#redis", () => ({
      redisClient: fakeRedisClient,
      getRedisReady: () => true,
      getRedisStatus: () => ({
        enabled: true,
        ready: true,
        isOpen: true,
        isReady: true,
        url: "redis://fake",
      }),
    }));

    const { createApp: createAppWithRedis } = await import("#app");

    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const app = createAppWithRedis();
    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("HIT");
    expect(res.body).toEqual({ ok: true, fromCache: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fakeRedisClient.get).toHaveBeenCalledWith("page-metadata:v1:https://example.com/");
  });

  test("sets x-cache MISS and writes to redis via setEx when ttl is enabled", async () => {
    const fakeRedisClient = {
      get: jest.fn(() => Promise.resolve(null)),
      setEx: jest.fn(() => Promise.resolve()),
    };

    jest.unstable_mockModule("#config", () => ({
      CACHE_TTL_SECONDS: 300,
      FETCH_TIMEOUT_MS: 12_000,
      MAX_BYTES: 1_500_000,
      REDIS_URL: "redis://fake",
    }));
    jest.unstable_mockModule("#redis", () => ({
      redisClient: fakeRedisClient,
      getRedisReady: () => true,
      getRedisStatus: () => ({
        enabled: true,
        ready: true,
        isOpen: true,
        isReady: true,
        url: "redis://fake",
      }),
    }));

    const { createApp: createAppWithRedis } = await import("#app");

    const html = "<html><head><title>Hello</title></head><body></body></html>";
    jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse(html, { url: "https://example.com/final" }));

    const app = createAppWithRedis();
    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("MISS");
    expect(fakeRedisClient.setEx).toHaveBeenCalledTimes(1);
    expect(fakeRedisClient.setEx).toHaveBeenCalledWith(
      "page-metadata:v1:https://example.com/",
      300,
      expect.stringContaining('"cache"')
    );
  });

  test("sets x-cache BYPASS when redis get throws and still serves response", async () => {
    const fakeRedisClient = {
      get: jest.fn(() => Promise.reject(new Error("boom"))),
      setEx: jest.fn(() => Promise.resolve()),
    };

    jest.unstable_mockModule("#config", () => ({
      CACHE_TTL_SECONDS: 300,
      FETCH_TIMEOUT_MS: 12_000,
      MAX_BYTES: 1_500_000,
      REDIS_URL: "redis://fake",
    }));
    jest.unstable_mockModule("#redis", () => ({
      redisClient: fakeRedisClient,
      getRedisReady: () => true,
      getRedisStatus: () => ({
        enabled: true,
        ready: true,
        isOpen: true,
        isReady: true,
        url: "redis://fake",
      }),
    }));

    const { createApp: createAppWithRedis } = await import("#app");

    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      makeHtmlResponse("<html><head><title>Hello</title></head><body></body></html>", { url: "https://example.com/final" })
    );

    const app = createAppWithRedis();
    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("BYPASS");
  });

  test("sets x-cache BYPASS when redis is disabled", async () => {
    jest.unstable_mockModule("#config", () => ({
      CACHE_TTL_SECONDS: 300,
      FETCH_TIMEOUT_MS: 12_000,
      MAX_BYTES: 1_500_000,
      REDIS_URL: "",
    }));

    const { createApp: createAppWithNoRedis } = await import("#app");

    jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse("<html></html>", { url: "https://example.com/" }));

    const app = createAppWithNoRedis();
    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("BYPASS");
  });
});
