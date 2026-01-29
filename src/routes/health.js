import { Router } from "express";
import { getRedisStatus } from "../redis.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      redis: getRedisStatus(),
    });
  });

  return router;
}
