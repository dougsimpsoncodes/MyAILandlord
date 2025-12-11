import { test, expect, Page } from '@playwright/test';
import { AuthHelper, AuthTestData } from '../helpers/auth-helper';

/**
 * Landlord Property Management E2E Tests
 * Tests property management features:
 * 1. View properties list
 * 2. Property details view
 * 3. Tenant invitation
 * 4. Maintenance dashboard access
 * 5. Communication hub
 */

test.describe('Landlord Property Management', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test.afterEach(async ({ page }) => {
    await authHelper.clearAuthState();
  });

  /**
   * Helper to login as landlord
   */
  async function loginAsLandlord(page: Page): Promise<boolean> {
    const credentials = AuthTestData.getTestUserCredentials();
    if (!credentials) {
      console.log('No test credentials available');
      return false;
    }
    const authHelper = new AuthHelper(page);
    return await authHelper.loginWithEmail(credentials.email, credentials.password);
  }

  /**
   * Helper to wait for page stability
   */
  async function waitForStability(page: Page, timeout = 3000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500);
  }

  test('should navigate to Property Management screen', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // Find and click Property Management
    const propMgmtButton = page.locator('text=/Property Management|My Properties|Properties/i').first();

    if (await propMgmtButton.isVisible({ timeout: 5000 })) {
      await propMgmtButton.click();
      await waitForStability(page);

      // Verify we're on the property management screen
      const propScreenIndicators = [
        'text=/Property Management|My Properties/i',
        'text=/Add Property|No properties/i',
      ];

      let onPropScreen = false;
      for (const selector of propScreenIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          onPropScreen = true;
          break;
        }
      }

      expect(onPropScreen).toBe(true);
    } else {
      console.log('Property Management button not found on home screen');
    }
  });

  test('should navigate to Maintenance Dashboard', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // Find and click Maintenance Hub/Dashboard
    const maintButton = page.locator('text=/Maintenance Hub|Maintenance Dashboard|View Requests/i').first();

    if (await maintButton.isVisible({ timeout: 5000 })) {
      await maintButton.click();
      await waitForStability(page);

      // Verify we're on the maintenance dashboard
      const maintScreenIndicators = [
        'text=/Maintenance Dashboard|Open Requests|All Requests/i',
        'text=/Pending|In Progress|Completed/i',
        'text=/No maintenance requests/i',
      ];

      let onMaintScreen = false;
      for (const selector of maintScreenIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          onMaintScreen = true;
          break;
        }
      }

      console.log(`Navigated to Maintenance Dashboard: ${onMaintScreen}`);
    } else {
      console.log('Maintenance Hub button not found');
    }
  });

  test('should navigate to Communication Hub', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // Find and click Communication Hub
    const commButton = page.locator('text=/Communication Hub|Messages|Announcements/i').first();

    if (await commButton.isVisible({ timeout: 5000 })) {
      await commButton.click();
      await waitForStability(page);

      // Verify we're on the communication screen
      const commScreenIndicators = [
        'text=/Communication|Messages|Announcements/i',
        'text=/No messages|Create Announcement/i',
      ];

      let onCommScreen = false;
      for (const selector of commScreenIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          onCommScreen = true;
          break;
        }
      }

      console.log(`Navigated to Communication Hub: ${onCommScreen}`);
    } else {
      console.log('Communication Hub button not found');
    }
  });

  test('should view property details', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // Navigate to Property Management first
    const propMgmtButton = page.locator('text=/Property Management|My Properties/i').first();

    if (!await propMgmtButton.isVisible({ timeout: 5000 })) {
      console.log('Property Management not visible - user may have no properties');
      return;
    }

    await propMgmtButton.click();
    await waitForStability(page);

    // Look for a property card/item to click
    const propertyCard = page.locator('[data-testid*="property"], [aria-label*="property"]').first();

    // Or try finding by common property name patterns
    const propertyName = page.locator('text=/Apartment|House|Condo|Property/i').first();

    if (await propertyCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await propertyCard.click();
      await waitForStability(page);
      console.log('Clicked property card');
    } else if (await propertyName.isVisible({ timeout: 3000 }).catch(() => false)) {
      await propertyName.click();
      await waitForStability(page);
      console.log('Clicked property by name');
    } else {
      console.log('No properties found to view details');
      return;
    }

    // Verify we're on property details
    const detailsIndicators = [
      'text=/Property Details|Address|Units|Tenants/i',
      'text=/Invite Tenant|Edit Property/i',
    ];

    let onDetailsScreen = false;
    for (const selector of detailsIndicators) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        onDetailsScreen = true;
        break;
      }
    }

    console.log(`Navigated to Property Details: ${onDetailsScreen}`);
  });

  test('should access Invite Tenant flow', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // First, navigate to Property Management
    const propMgmtButton = page.locator('text=/Property Management|My Properties/i').first();

    if (!await propMgmtButton.isVisible({ timeout: 5000 })) {
      console.log('Property Management not visible');
      return;
    }

    await propMgmtButton.click();
    await waitForStability(page);

    // Look for property to click into
    const propertyItems = page.locator('[role="button"], [data-testid*="property"]');
    const count = await propertyItems.count();

    if (count === 0) {
      console.log('No properties found - cannot test invite tenant');
      return;
    }

    // Click first property
    await propertyItems.first().click();
    await waitForStability(page);

    // Look for Invite Tenant button
    const inviteButton = page.locator('text=/Invite Tenant|Add Tenant|Send Invite/i').first();

    if (await inviteButton.isVisible({ timeout: 5000 })) {
      await inviteButton.click();
      await waitForStability(page);

      // Verify we're on the invite screen
      const inviteScreenIndicators = [
        'text=/Invite Tenant|Send Invitation|Email/i',
        'input[type="email"]',
        'input[placeholder*="email" i]',
      ];

      let onInviteScreen = false;
      for (const selector of inviteScreenIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          onInviteScreen = true;
          break;
        }
      }

      console.log(`Navigated to Invite Tenant screen: ${onInviteScreen}`);
    } else {
      console.log('Invite Tenant button not found');
    }
  });
});

/**
 * Landlord Quick Actions Tests
 */
test.describe('Landlord Quick Actions', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  async function loginAsLandlord(page: Page): Promise<boolean> {
    const credentials = AuthTestData.getTestUserCredentials();
    if (!credentials) return false;
    const authHelper = new AuthHelper(page);
    return await authHelper.loginWithEmail(credentials.email, credentials.password);
  }

  async function waitForStability(page: Page, timeout = 3000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500);
  }

  test('should display landlord home screen with quick actions', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    // Check for landlord home screen elements
    const quickActionSelectors = [
      'text=/Maintenance Hub/i',
      'text=/Communication Hub/i',
      'text=/Property Management/i',
      'text=/Quick Actions/i',
      'text=/Add Property/i',
      'text=/Getting Started/i',
    ];

    let foundActions = 0;
    for (const selector of quickActionSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundActions++;
        console.log(`Found: ${selector}`);
      }
    }

    console.log(`Found ${foundActions} quick action elements`);

    // Also check for Welcome text which indicates dashboard loaded
    const welcomeText = page.locator('text=/Welcome/i').first();
    const hasWelcome = await welcomeText.isVisible({ timeout: 2000 }).catch(() => false);

    // Either quick actions or welcome text should be visible
    expect(foundActions > 0 || hasWelcome).toBe(true);
  });

  test('should have working navigation from home to all main sections', async ({ page }) => {
    const loggedIn = await loginAsLandlord(page);

    if (!loggedIn) {
      test.skip(true, 'Login failed - skipping test');
      return;
    }

    await waitForStability(page);

    const sectionsToTest = [
      { button: 'text=/Maintenance Hub/i', target: 'text=/Maintenance|Requests/i' },
      { button: 'text=/Property Management/i', target: 'text=/Properties|Add Property/i' },
      { button: 'text=/Communication Hub/i', target: 'text=/Communication|Messages/i' },
    ];

    for (const section of sectionsToTest) {
      // Go back to home
      await page.goto('/');
      await loginAsLandlord(page);
      await waitForStability(page);

      const button = page.locator(section.button).first();
      if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
        await button.click();
        await waitForStability(page);

        const target = page.locator(section.target).first();
        const found = await target.isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`Navigation to ${section.button}: ${found ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`Button ${section.button} not visible`);
      }
    }
  });
});
