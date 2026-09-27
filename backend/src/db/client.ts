// Single database connection for the whole API.
// Loads DATABASE_URL from backend/.env and exposes one Drizzle client.
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
}

// One postgres-js connection pool. `max: 10` is plenty for local development.
const queryClient = postgres(databaseUrl, { max: 10 });

// The Drizzle client every service and query in the API imports.
export const db = drizzle(queryClient);
