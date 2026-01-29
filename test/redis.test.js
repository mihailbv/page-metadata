import { jest } from "@jest/globals";

function createFakeRedisClient({ isOpen = false, isReady = false } = {}) {
  const listeners = new Map();

  return {
    isOpen,
    isReady,
    on: jest.fn((event, handler) => {
      listeners.set(event, handler);
    }),
    emit: (event, ...args) => {
      const handler = listeners.get(event);
      if (handler) handler(...args);
    },
    connect: jest.fn().mockResolvedValue(undefined),
  };
}

describe("redis readiness state", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJestWorkerId = process.env.JEST_WORKER_ID;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JEST_WORKER_ID = originalJestWorkerId;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("toggles readiness via events", async () => {
    const fakeClient = createFakeRedisClient();

    jest.unstable_mockModule("redis", () => ({
      createClient: () => fakeClient,
    }));
    jest.unstable_mockModule("../src/config.js", () => ({
      REDIS_URL: "redis://fake",
    }));

    const { redisClient, getRedisReady, getRedisStatus } = await import("../src/redis.js");

    expect(redisClient).toBe(fakeClient);
    expect(getRedisReady()).toBe(false);

    redisClient.emit("ready");
    expect(getRedisReady()).toBe(true);

    redisClient.emit("end");
    expect(getRedisReady()).toBe(false);

    redisClient.emit("error", new Error("boom"));
    expect(getRedisReady()).toBe(false);

    const status = getRedisStatus();
    expect(status).toEqual({
      enabled: true,
      ready: false,
      isOpen: false,
      isReady: false,
      url: "redis://fake",
    });
  });

  test("when REDIS_URL is disabled, redisClient is null and status reflects disabled", async () => {
    jest.unstable_mockModule("redis", () => ({
      createClient: () => {
        throw new Error("should not create client when REDIS_URL is falsy");
      },
    }));
    jest.unstable_mockModule("../src/config.js", () => ({
      REDIS_URL: "",
    }));

    const { redisClient, getRedisReady, getRedisStatus } = await import("../src/redis.js");

    expect(redisClient).toBe(null);
    expect(getRedisReady()).toBe(false);
    expect(getRedisStatus()).toEqual({
      enabled: false,
      ready: false,
      isOpen: false,
      isReady: false,
      url: "",
    });
  });

  test("connect() is attempted when not running under Jest/test env", async () => {
    process.env.NODE_ENV = "development";
    process.env.JEST_WORKER_ID = "";

    const fakeClient = createFakeRedisClient();

    jest.unstable_mockModule("redis", () => ({
      createClient: () => fakeClient,
    }));
    jest.unstable_mockModule("../src/config.js", () => ({
      REDIS_URL: "redis://fake",
    }));

    await import("../src/redis.js");

    expect(fakeClient.connect).toHaveBeenCalledTimes(1);
  });

  test("connect() failure sets readiness to false", async () => {
    process.env.NODE_ENV = "development";
    process.env.JEST_WORKER_ID = "";

    const fakeClient = createFakeRedisClient();
    fakeClient.connect.mockRejectedValueOnce(new Error("nope"));

    jest.unstable_mockModule("redis", () => ({
      createClient: () => fakeClient,
    }));
    jest.unstable_mockModule("../src/config.js", () => ({
      REDIS_URL: "redis://fake",
    }));

    const { getRedisReady } = await import("../src/redis.js");

    await new Promise((r) => setTimeout(r, 0));
    expect(getRedisReady()).toBe(false);
  });
});
