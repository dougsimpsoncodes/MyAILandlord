import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { SupabaseAuthHelper, AuthTestData } from '../helpers/auth-helper';
import { PropertyManagementPage, AddPropertyPage, PropertyPhotosPage, RoomSelectionPage } from '../pages';

/**
 * Extended Test Fixtures for MyAILandlord E2E Tests
 *
 * These fixtures provide pre-configured pages and authenticated contexts
 * for common testing scenarios. They follow Playwright's fixture pattern:
 * https://playwright.dev/docs/test-fixtures
 */

// Test data types
export interface TestProperty {
  street: string;
  city: string;
  state: string;
  zip: string;
  type: 'single-family' | 'multi-unit';
  unitCount?: number;
}

export interface TestCredentials {
  email: string;
  password: string;
}

// Extended fixture types
type TestFixtures = {
  // Authentication fixtures
  authenticatedPage: Page;
  landlordPage: Page;
  tenantPage: Page;

  // Helper instances
  authHelper: SupabaseAuthHelper;

  // Page Object instances (pre-initialized with authenticated page)
  propertyManagementPage: PropertyManagementPage;
  addPropertyPage: AddPropertyPage;
  propertyPhotosPage: PropertyPhotosPage;
  roomSelectionPage: RoomSelectionPage;

  // Test data generators
  testProperty: TestProperty;
  testCredentials: TestCredentials;

  // Multi-user context for isolation testing
  isolatedContext: BrowserContext;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Pre-authenticated page using TEST_USER credentials
   */
  authenticatedPage: async ({ page }, use) => {
    const auth = new SupabaseAuthHelper(page);
    const creds = AuthTestData.getTestUserCredentials();

    if (creds) {
      await auth.authenticateAndNavigate(creds.email, creds.password);
    } else {
      console.warn('[Fixture] No test credentials - page will be unauthenticated');
      await page.goto('/');
    }

    await use(page);
  },

  /**
   * Page authenticated as landlord
   */
  landlordPage: async ({ page }, use) => {
    const auth = new SupabaseAuthHelper(page);
    const email = process.env.LANDLORD_EMAIL || process.env.TEST_USER_EMAIL;
    const password = process.env.LANDLORD_PASSWORD || process.env.TEST_USER_PASSWORD;

    if (email && password) {
      await auth.authenticateAndNavigate(email, password);
    } else {
      test.skip('LANDLORD_EMAIL and LANDLORD_PASSWORD must be set');
      return;
    }

    await use(page);
  },

  /**
   * Page authenticated as tenant
   */
  tenantPage: async ({ page }, use) => {
    const auth = new SupabaseAuthHelper(page);
    const email = process.env.TENANT_EMAIL;
    const password = process.env.TENANT_PASSWORD;

    if (email && password) {
      await auth.authenticateAndNavigate(email, password);
    } else {
      test.skip('TENANT_EMAIL and TENANT_PASSWORD must be set');
      return;
    }

    await use(page);
  },

  /**
   * Auth helper instance for the current page
   */
  authHelper: async ({ page }, use) => {
    const auth = new SupabaseAuthHelper(page);
    await use(auth);
  },

  /**
   * Property Management page with authenticated user
   */
  propertyManagementPage: async ({ authenticatedPage }, use) => {
    const page = new PropertyManagementPage(authenticatedPage);
    await page.goto();
    await use(page);
  },

  /**
   * Add Property page with authenticated user
   */
  addPropertyPage: async ({ authenticatedPage }, use) => {
    const page = new AddPropertyPage(authenticatedPage);
    await page.goto();
    await use(page);
  },

  /**
   * Property Photos page with authenticated user
   */
  propertyPhotosPage: async ({ authenticatedPage }, use) => {
    const page = new PropertyPhotosPage(authenticatedPage);
    // Note: Usually navigated to from add property, not directly
    await use(page);
  },

  /**
   * Room Selection page with authenticated user
   */
  roomSelectionPage: async ({ authenticatedPage }, use) => {
    const page = new RoomSelectionPage(authenticatedPage);
    // Note: Usually navigated to from photos, not directly
    await use(page);
  },

  /**
   * Generate test property data
   */
  testProperty: async ({}, use) => {
    const property: TestProperty = {
      street: `${Math.floor(Math.random() * 9999)} Test Street`,
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      type: 'single-family',
    };
    await use(property);
  },

  /**
   * Get test credentials
   */
  testCredentials: async ({}, use) => {
    const creds = AuthTestData.getTestUserCredentials();
    if (!creds) {
      test.skip('No test credentials configured');
      return;
    }
    await use(creds);
  },

  /**
   * Isolated browser context for multi-user testing
   */
  isolatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
});

export { expect };

/**
 * Test data factory functions
 */
export const TestDataFactory = {
  /**
   * Generate a unique property address
   */
  generatePropertyAddress(): TestProperty {
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streets = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Main', 'First', 'Park'];
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Lane', 'Drive'];
    const cities = ['Austin', 'Dallas', 'Houston', 'San Antonio'];
    const zips = ['78701', '75201', '77001', '78201'];

    const streetName = streets[Math.floor(Math.random() * streets.length)];
    const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
    const cityIndex = Math.floor(Math.random() * cities.length);

    return {
      street: `${streetNumber} ${streetName} ${streetType}`,
      city: cities[cityIndex],
      state: 'TX',
      zip: zips[cityIndex],
      type: 'single-family',
    };
  },

  /**
   * Generate maintenance request data
   */
  generateMaintenanceRequest() {
    const issues = ['Leaky faucet', 'Broken window', 'HVAC not working', 'Electrical issue'];
    const areas = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    return {
      issue: issues[Math.floor(Math.random() * issues.length)],
      area: areas[Math.floor(Math.random() * areas.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      description: `Test maintenance request created at ${new Date().toISOString()}`,
    };
  },

  /**
   * Generate unique email for test user
   */
  generateTestEmail(): string {
    return AuthTestData.generateTestEmail();
  },

  /**
   * Generate secure test password
   */
  generateTestPassword(): string {
    return AuthTestData.generateTestPassword();
  },
};

/**
 * Common test helpers
 */
export const TestHelpers = {
  /**
   * Wait for app to be ready after auth
   */
  async waitForAppReady(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // React hydration

    // Wait for loading to complete
    const loading = page.locator('[data-testid="loading"], [role="progressbar"]');
    if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loading.waitFor({ state: 'hidden', timeout: 10000 });
    }
  },

  /**
   * Clear all app state (localStorage, cookies)
   */
  async clearAppState(page: Page): Promise<void> {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.context().clearCookies();
  },

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(page: Page, name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `e2e/screenshots/${name}-${timestamp}.png`;
    await page.screenshot({ path, fullPage: true });
    return path;
  },

  /**
   * Log network requests for debugging
   */
  enableNetworkLogging(page: Page): void {
    page.on('request', (request) => {
      console.log(`[Network] ${request.method()} ${request.url()}`);
    });

    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[Network Error] ${status} ${response.url()}`);
      }
    });
  },
};

/**
 * Skip conditions for conditional test execution
 */
export const SkipConditions = {
  /**
   * Skip if running in CI environment
   */
  inCI: !!process.env.CI,

  /**
   * Skip if no landlord credentials configured
   */
  noLandlordCreds: !process.env.LANDLORD_EMAIL || !process.env.LANDLORD_PASSWORD,

  /**
   * Skip if no tenant credentials configured
   */
  noTenantCreds: !process.env.TENANT_EMAIL || !process.env.TENANT_PASSWORD,

  /**
   * Skip if auth is disabled
   */
  authDisabled: process.env.EXPO_PUBLIC_AUTH_DISABLED === '1',
};
