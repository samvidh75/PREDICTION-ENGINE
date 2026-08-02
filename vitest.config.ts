import { defineConfig } from "vitest/config";
import path from "path";

const isIntegration = process.env.VITEST_MODE === "integration";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/types": path.resolve(__dirname, "src/types/index.ts"),
      "@/engines": path.resolve(__dirname, "src/engines/index.ts"),
      "@/providers": path.resolve(__dirname, "src/providers/index.ts"),
      "@/services": path.resolve(__dirname, "src/services/index.ts"),
    },
  },
  test: {
    environment: isIntegration ? "node" : "jsdom",
    globals: true,
    include: isIntegration
      ? ["src/__tests__/integration/**/*.test.ts"]
      : ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "tests/**/*.test.ts", "__tests__/**/*.test.ts"],
    exclude: isIntegration
      ? ["node_modules/**", "dist/**", "coverage/**"]
      : ["src/__tests__/integration/**", "node_modules/**", "dist/**"],
    fileParallelism: isIntegration ? false : undefined,
    testTimeout: isIntegration ? 30_000 : undefined,
    setupFiles: isIntegration ? [] : ["tests/setup/vitest.setup.ts"],
  },
});
