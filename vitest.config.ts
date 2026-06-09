import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    exclude: [
      'src/__tests__/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],
  },
});
