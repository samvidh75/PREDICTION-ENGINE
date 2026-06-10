import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    include: [
      'src/__tests__/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],
    testTimeout: 30000,
  },
});
