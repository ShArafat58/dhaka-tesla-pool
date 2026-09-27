import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
import { logger } from "./lib/logger.ts";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});
