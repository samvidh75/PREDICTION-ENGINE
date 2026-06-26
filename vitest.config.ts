import { defineConfig } from "vitest/config";

const isIntegration = process.env.VITEST_MODE === "integration";

export default defineConfig({
  test: {
    environment: isIntegration ? "node" : "jsdom",
    globals: true,
    include: isIntegration
      ? ["src/__tests__/integration/**/*.test.ts"]
      : ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: isIntegration
      ? ["node_modules/**", "dist/**", "coverage/**"]
      : ["src/__tests__/integration/**", "node_modules/**", "dist/**"],
    fileParallelism: isIntegration ? false : undefined,
    testTimeout: isIntegration ? 30_000 : undefined,
    setupFiles: [],
  },
});
