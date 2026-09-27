import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/client.ts";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  await db.execute(sql`SELECT 1`);
  res.json({ status: "ok", time: new Date().toISOString() });
});
