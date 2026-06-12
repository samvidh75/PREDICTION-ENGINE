import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: 'AIzaSy012345678901234567890123456789012',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
      VITE_FIREBASE_APP_ID: '1:123456789012:web:0123456789abcdef012345',
    },
  },
});
