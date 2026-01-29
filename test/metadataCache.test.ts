import request from "supertest";
import { jest } from "@jest/globals";
import { createApp } from "../src/app.js";

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

  test("sets x-cache BYPASS when redis is disabled", async () => {
    jest.unstable_mockModule("../src/config.js", () => ({
      CACHE_TTL_SECONDS: 300,
      FETCH_TIMEOUT_MS: 12_000,
      MAX_BYTES: 1_500_000,
      REDIS_URL: "",
    }));

    const { createApp: createAppWithNoRedis } = await import("../src/app.js");

    jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse("<html></html>", { url: "https://example.com/" }));

    const app = createAppWithNoRedis();
    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBe("BYPASS");
  });
});
