import request from "supertest";
import { jest } from "@jest/globals";

function makeHtmlResponse(html, { url, status = 200, contentType = "text/html" } = {}) {
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

describe("GET /metadata redis cache behavior", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("returns cached payload when redis has HIT", async () => {
    const cached = JSON.stringify({ url: "https://example.com/", finalUrl: "https://example.com/", metadata: { title: "Cached" } });

    jest.unstable_mockModule("../src/redis.js", () => {
      const fakeClient = {
        get: jest.fn().mockResolvedValue(cached),
        setEx: jest.fn(),
      };

      return {
        redisClient: fakeClient,
        getRedisReady: () => true,
        getRedisStatus: () => ({ enabled: true, ready: true, isOpen: false, isReady: false, url: "redis://fake" }),
      };
    });

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("HIT");
    expect(res.body.metadata.title).toBe("Cached");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("cache MISS calls fetch and stores via setEx", async () => {
    const html = "<html><head><title>T</title></head><body></body></html>";

    const get = jest.fn().mockResolvedValue(null);
    const setEx = jest.fn().mockResolvedValue("OK");

    jest.unstable_mockModule("../src/redis.js", () => {
      const fakeClient = { get, setEx };
      return {
        redisClient: fakeClient,
        getRedisReady: () => true,
        getRedisStatus: () => ({ enabled: true, ready: true, isOpen: false, isReady: false, url: "redis://fake" }),
      };
    });

    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse(html, { url: "https://example.com/final" }));

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("MISS");
    expect(fetchSpy).toHaveBeenCalled();
    expect(setEx).toHaveBeenCalled();
  });

  test("redis error bypasses cache (x-cache=BYPASS)", async () => {
    const html = "<html><head><title>T</title></head><body></body></html>";

    jest.unstable_mockModule("../src/redis.js", () => {
      const fakeClient = {
        get: jest.fn().mockRejectedValue(new Error("redis down")),
        setEx: jest.fn(),
      };

      return {
        redisClient: fakeClient,
        getRedisReady: () => true,
        getRedisStatus: () => ({ enabled: true, ready: true, isOpen: false, isReady: false, url: "redis://fake" }),
      };
    });

    jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse(html, { url: "https://example.com/final" }));

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("BYPASS");
  });
});
