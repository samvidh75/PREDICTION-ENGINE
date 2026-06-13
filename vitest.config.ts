import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx,js,jsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['src/__tests__/integration/**/*.test.ts', 'node_modules/**', 'dist/**'],
  },
});
