import { jest } from "@jest/globals";

describe("config env parsing", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test("uses defaults when env vars are not set", async () => {
    process.env = { ...originalEnv };
    delete process.env.PORT;
    delete process.env.FETCH_TIMEOUT_MS;
    delete process.env.MAX_BYTES;
    delete process.env.CACHE_TTL_SECONDS;
    delete process.env.REDIS_URL;

    const mod = await import(`../src/config.js?case=defaults-${Date.now()}`);

    expect(mod.PORT).toBe(3000);
    expect(mod.FETCH_TIMEOUT_MS).toBe(12_000);
    expect(mod.MAX_BYTES).toBe(1_500_000);
    expect(mod.CACHE_TTL_SECONDS).toBe(300);
  });

  test("parses numeric env vars", async () => {
    process.env = {
      ...originalEnv,
      PORT: "1234",
      FETCH_TIMEOUT_MS: "250",
      MAX_BYTES: "42",
      CACHE_TTL_SECONDS: "9",
      REDIS_URL: "redis://example:6379",
    };

    const mod = await import(`../src/config.js?case=custom-${Date.now()}`);

    expect(mod.PORT).toBe(1234);
    expect(mod.FETCH_TIMEOUT_MS).toBe(250);
    expect(mod.MAX_BYTES).toBe(42);
    expect(mod.CACHE_TTL_SECONDS).toBe(9);
    expect(mod.REDIS_URL).toBe("redis://example:6379");
  });
});
