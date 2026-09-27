import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client.ts";

// Runs on container startup before the API boots. Applies any pending
// migrations from the drizzle/ folder using the lightweight runtime migrator
// (no drizzle-kit dev dependency needed in the image).
async function main() {
  await migrate(db, { migrationsFolder: "drizzle" });
  // eslint-disable-next-line no-console
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", error);
  process.exit(1);
});
