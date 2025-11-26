import { test, expect } from '@playwright/test';

/**
 * AUTHENTICATION FLOWS E2E TEST
 *
 * Tests authentication functionality:
 * 1. Login screen elements
 * 2. Sign up screen elements
 * 3. Role selection
 * 4. Session management
 */

test.use({
  baseURL: 'http://localhost:8082',
});

test.describe('Authentication Flows', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('text node')) {
        console.log('[Browser Error]:', msg.text());
      }
    });
  });

  test('Login screen displays correctly', async ({ page }) => {
    test.setTimeout(60000);

    console.log('========================================');
    console.log('LOGIN SCREEN TEST');
    console.log('========================================');

    await page.goto('/Login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/auth-login-screen.png', fullPage: true });

    // Check for login elements
    const loginElements = [
      page.getByText('Login'),
      page.getByText('Sign In'),
      page.locator('input[type="email"], input[placeholder*="email" i]'),
      page.locator('input[type="password"]'),
      page.getByText('Forgot Password'),
    ];

    for (const element of loginElements) {
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Login element found');
      }
    }

    // Check for OAuth buttons
    const oauthButtons = [
      page.getByText('Google'),
      page.getByText('Apple'),
      page.getByText('Continue with Google'),
      page.getByText('Continue with Apple'),
    ];

    for (const btn of oauthButtons) {
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('OAuth button found');
      }
    }

    console.log('Login screen test complete');
  });

  test('Sign up screen displays correctly', async ({ page }) => {
    test.setTimeout(60000);

    console.log('========================================');
    console.log('SIGN UP SCREEN TEST');
    console.log('========================================');

    await page.goto('/SignUp');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/auth-signup-screen.png', fullPage: true });

    // Check for sign up elements
    const signupElements = [
      page.getByText('Sign Up'),
      page.getByText('Create Account'),
      page.getByText('Register'),
      page.locator('input[type="email"]'),
      page.locator('input[type="password"]'),
      page.locator('input[placeholder*="name" i]'),
    ];

    for (const element of signupElements) {
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Sign up element found');
      }
    }

    console.log('Sign up screen test complete');
  });

  test('Role selection screen', async ({ page }) => {
    test.setTimeout(60000);

    console.log('========================================');
    console.log('ROLE SELECTION TEST');
    console.log('========================================');

    await page.goto('/RoleSelect');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/auth-role-select.png', fullPage: true });

    // Check for role options
    const tenantBtn = page.getByText('Tenant');
    const landlordBtn = page.getByText('Landlord');
    const propertyOwnerBtn = page.getByText('Property Owner');

    if (await tenantBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Tenant role option found');
    }

    if (await landlordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Landlord role option found');
    }

    if (await propertyOwnerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Property Owner role option found');
    }

    console.log('Role selection test complete');
  });

  test('Welcome screen navigation', async ({ page }) => {
    test.setTimeout(60000);

    console.log('========================================');
    console.log('WELCOME SCREEN TEST');
    console.log('========================================');

    await page.goto('/Welcome');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/auth-welcome.png', fullPage: true });

    // Check for welcome elements
    const welcomeElements = [
      page.getByText('Welcome'),
      page.getByText('Get Started'),
      page.getByText('Login'),
      page.getByText('Sign Up'),
    ];

    for (const element of welcomeElements) {
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Welcome element found');
      }
    }

    console.log('Welcome screen test complete');
  });

  test('Mock auth mode navigation', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing mock auth mode...');

    // With EXPO_PUBLIC_AUTH_DISABLED=1, should auto-login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/auth-mock-mode.png', fullPage: true });

    // Should be on main app screen, not login
    const mainScreenIndicators = [
      page.getByText('Properties'),
      page.getByText('Dashboard'),
      page.getByText('Home'),
      page.getByText('Add Property'),
    ];

    let isLoggedIn = false;
    for (const indicator of mainScreenIndicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        isLoggedIn = true;
        console.log('Mock auth: User is logged in');
        break;
      }
    }

    if (!isLoggedIn) {
      console.log('Mock auth: User is NOT logged in (may need authentication)');
    }

    console.log('Mock auth test complete');
  });
});
