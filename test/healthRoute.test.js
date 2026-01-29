import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  test("returns ok and redis status", async () => {
    const app = createApp();

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("redis");
    expect(res.body.redis).toHaveProperty("enabled");
    expect(res.body.redis).toHaveProperty("ready");
  });
});
