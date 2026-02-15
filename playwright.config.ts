import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8081';
const isHeadless = process.env.PW_HEADLESS === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 4 * 60 * 1000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  outputDir: 'artifacts/playwright/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright/report', open: 'never' }],
  ],
  use: {
    baseURL,
    headless: isHeadless,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 40_000,
  },
});
