import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/__tests__/integration/**/*.test.ts'],
    exclude: ['src/**/*.test.{ts,tsx,js,jsx}'],
    testTimeout: 30000,
  },
});