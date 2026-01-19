import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'PORT=3001 COPILOT_MOCK=1 npm run start',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
