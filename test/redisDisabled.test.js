import { jest } from "@jest/globals";

describe("redis disabled when REDIS_URL is empty", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test("redisClient is null and status reflects disabled", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      REDIS_URL: "",
    };

    const mod = await import(`../src/redis.js?case=disabled-${Date.now()}`);

    expect(mod.redisClient).toBeNull();

    const status = mod.getRedisStatus();
    expect(status.enabled).toBe(false);
    expect(status.ready).toBe(false);
    expect(status.isOpen).toBe(false);
    expect(status.isReady).toBe(false);
  });
});
