import { defineConfig } from "vitest/config";

/**
 * Integration config for the heavy calendar specs:
 *  - calendar-action.integration.test.ts pulls the full CALENDAR handler graph
 *    (@elizaos/agent -> ... -> native modules), expensive to source-transform.
 *  - calendar-service.integration.test.ts boots an in-process PGlite and drives
 *    real CalendarService CRUD.
 *
 * Each spec runs in its own forked process, one at a time, with generous
 * timeouts so source-mode collection/setup doesn't trip the defaults. Run with
 * a raised Node heap via `bun run test:integration`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.integration.test.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**"],
    pool: "forks",
    isolate: true,
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    passWithNoTests: true,
  },
});
