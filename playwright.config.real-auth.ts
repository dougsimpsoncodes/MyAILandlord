import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Playwright configuration for REAL AUTHENTICATION testing
 *
 * This config:
 * - Disables mock auth (EXPO_PUBLIC_AUTH_DISABLED=0 or unset)
 * - Loads .env.test for test credentials
 * - Runs tests that require real Clerk authentication
 * - Tests RLS policies and data isolation
 *
 * Usage:
 *   npx playwright test --config=playwright.config.real-auth.ts
 */

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: false, // Disable parallel for auth tests to avoid conflicts

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Sequential execution for auth tests */
  workers: 1, // Force sequential to avoid auth conflicts

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report-real-auth' }],
    ['list']
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:8082',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Longer timeout for auth flows */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* Global timeout for each test */
  timeout: 120000, // 2 minutes per test (auth flows can be slow)

  /* Configure projects for testing */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // CRITICAL: No EXPO_PUBLIC_AUTH_DISABLED flag - use real Supabase authentication
    command: 'npx expo start --web --port 8082',
    url: 'http://localhost:8082',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 3 minutes for Expo to start with real auth
    env: {
      // Supabase configuration
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      EXPO_PUBLIC_TEST_MODE: '1',
    },
  },
});
