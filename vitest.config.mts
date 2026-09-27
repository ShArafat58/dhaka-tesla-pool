import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    // Marks the run as tests so config/env.ts loads backend/.env.test.
    env: { NODE_ENV: "test" },
    // DB-backed tests reset the schema, so files must not run in parallel.
    fileParallelism: false,
  },
});
