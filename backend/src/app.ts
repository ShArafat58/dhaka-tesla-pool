import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.ts";
import { logger } from "./lib/logger.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";
import { healthRouter } from "./routes/health.ts";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
