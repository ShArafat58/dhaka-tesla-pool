import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../db/client.ts";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");

// Drops and recreates the public schema, then applies every generated migration.
// Gives each test a clean database.
export async function resetSchema(): Promise<void> {
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const statements = readFileSync(join(migrationsDir, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
  }
}
