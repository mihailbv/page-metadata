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

describe("GET /metadata", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("400 when url is missing", async () => {
    const app = createApp();

    const res = await request(app).get("/metadata");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing 'url' query parameter");
  });

  test("502 when upstream is non-2xx", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      makeHtmlResponse("<html></html>", {
        url: "https://example.com/",
        status: 503,
      })
    );

    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("error", "Upstream returned non-2xx");
    expect(res.body).toHaveProperty("status", 503);
  });

  test("415 when upstream content-type is not text/html", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeHtmlResponse("{}", { url: "https://example.com/", contentType: "application/json" }));

    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(415);
    expect(res.body).toHaveProperty("error", "Upstream content-type is not text/html");
  });

  test("returns metadata payload", async () => {
    const html = `
      <html>
        <head>
          <title>Hello</title>
          <meta name="description" content="World" />
          <meta property="og:image" content="/img.png" />
        </head>
        <body></body>
      </html>
    `;

    jest.spyOn(globalThis, "fetch").mockResolvedValue(makeHtmlResponse(html, { url: "https://example.com/final" }));

    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty("x-cache");
    expect(res.body).toHaveProperty("url", "https://example.com/");
    expect(res.body).toHaveProperty("finalUrl", "https://example.com/final");
    expect(res.body).toHaveProperty("metadata");
    expect(res.body.metadata).toHaveProperty("title", "Hello");
    expect(res.body.metadata).toHaveProperty("description", "World");
    expect(res.body.metadata).toHaveProperty("image", "https://example.com/img.png");
  });

  test("504 when fetch aborts", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";

    jest.spyOn(globalThis, "fetch").mockRejectedValue(abortErr);

    const app = createApp();

    const res = await request(app).get("/metadata").query({ url: "https://example.com" });

    expect(res.status).toBe(504);
    expect(res.body).toHaveProperty("error", "aborted");
  });
});
