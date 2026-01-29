import { createClient } from "redis";
import { REDIS_URL } from "./config.js";

let redisReady = false;

export const redisClient = REDIS_URL ? createClient({ url: REDIS_URL }) : null;

if (redisClient) {
  redisClient.on("error", (err) => console.log("Redis Client Error", err));
  redisClient.on("ready", () => {
    redisReady = true;
  });
  redisClient.on("end", () => {
    redisReady = false;
  });
  redisClient.on("error", () => {
    redisReady = false;
  });
  const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === "test";
  if (!isTestEnv) {
    redisClient.connect().catch(() => {
      redisReady = false;
    });
  }
}

export function getRedisReady() {
  return redisReady;
}

export function getRedisStatus() {
  return {
    enabled: Boolean(redisClient),
    ready: redisReady,
    isOpen: redisClient ? redisClient.isOpen : false,
    isReady: redisClient ? redisClient.isReady : false,
    url: REDIS_URL,
  };
}
