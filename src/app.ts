import cors from "cors";
import express from "express";
import type { Express } from "express";
import { createHealthRouter } from "./routes/health.js";
import { createMetadataRouter } from "./routes/metadata.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());

  app.use(createHealthRouter());
  app.use(createMetadataRouter());

  return app;
}
