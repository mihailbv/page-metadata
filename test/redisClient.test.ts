import { jest } from "@jest/globals";

describe("redis client export shape", () => {
  afterEach(() => {
    jest.resetModules();
  });

  test("redisClient is null when REDIS_URL is empty", async () => {
    jest.unstable_mockModule("../src/config.js", () => ({
      REDIS_URL: "",
    }));

    const { redisClient } = await import("../src/redis.js");
    expect(redisClient).toBe(null);
  });
});
