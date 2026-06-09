import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/__tests__/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],
    testTimeout: 30000,
    // Run integration tests sequentially to avoid shared-state conflicts
    // with the global dbAdapter singleton and SQLite file-based databases.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
