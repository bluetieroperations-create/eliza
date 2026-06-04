import { defineConfig } from "vitest/config";

/**
 * Unit-test config — fast, light specs only (normalize/merge, routes, client,
 * Apple bridge). The heavy specs that pull the CALENDAR handler graph
 * (@elizaos/agent + native) or boot an in-process PGlite are `*.integration.test.*`
 * and run via `vitest.integration.config.ts` (`bun run test:integration`); they
 * are excluded here so the unit lane stays quick and memory-light.
 */
export default defineConfig({
  // Resolve @elizaos/* deps to their BUILT dist (no `eliza-source` condition).
  // Otherwise `@elizaos/shared` resolves to its source barrel and vitest
  // transpiles the entire (huge) package per worker — dominating wall-clock and
  // starving workers under memory pressure. The unit specs only need the built
  // types/values.
  resolve: {
    conditions: ["node", "import", "default"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}", "test/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "**/*.integration.test.{ts,tsx}",
      "**/*.e2e.test.{ts,tsx}",
      "**/*.real.test.{ts,tsx}",
      "**/*.live.test.{ts,tsx}",
    ],
    passWithNoTests: true,
  },
});
