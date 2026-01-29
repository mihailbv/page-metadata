import request from "supertest";
import { createApp } from "#app";

describe("GET /health", () => {
  test("returns ok true", async () => {
    const app = createApp();

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("redis");
  });
});
