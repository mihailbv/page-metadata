import type { Request, Response } from "express";
import { Router } from "express";
import { getRedisStatus } from "../redis.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      redis: getRedisStatus(),
    });
  });

  return router;
}
