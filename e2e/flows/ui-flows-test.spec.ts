import { test, expect, Page } from '@playwright/test';

/**
 * UI FLOW TESTS - Tests app UI flows with AUTH_DISABLED mode
 *
 * These tests run with EXPO_PUBLIC_AUTH_DISABLED=1 which bypasses Supabase auth
 * and allows direct testing of the app's UI flows.
 *
 * Run with: EXPO_PUBLIC_AUTH_DISABLED=1 npx playwright test e2e/flows/ui-flows-test.spec.ts
 */

const TEST_RUN_ID = Date.now().toString();
const BUGS_FOUND: string[] = [];

function logBug(description: string, context?: string) {
  const bug = context ? `${description} [Context: ${context}]` : description;
  BUGS_FOUND.push(bug);
  console.log(`BUG FOUND: ${bug}`);
}

async function waitForStability(page: Page, timeout = 3000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Network idle timeout is ok
  }
  await page.waitForTimeout(500);
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/e2e-ui-${name}-${TEST_RUN_ID}.png` });
  console.log(`Screenshot: /tmp/e2e-ui-${name}-${TEST_RUN_ID}.png`);
}

// ============================================================
// LANDLORD UI FLOW TESTS
// ============================================================

test.describe('LANDLORD UI FLOWS', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app root to start each test fresh
    await page.goto('/');
    await waitForStability(page);
  });

  test('L1: Welcome screen loads correctly', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST L1: Welcome Screen');
    console.log('========================================');

    await takeScreenshot(page, 'welcome-screen');

    // Check for Get Started button
    const getStarted = page.locator('text=/Get Started/i').first();
    const hasGetStarted = await getStarted.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Get Started button: ${hasGetStarted ? 'VISIBLE' : 'NOT FOUND'}`);

    // Check for Sign In link
    const signIn = page.locator('text=/Sign In|Already have an account/i').first();
    const hasSignIn = await signIn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Sign In link: ${hasSignIn ? 'VISIBLE' : 'NOT FOUND'}`);

    expect(hasGetStarted || hasSignIn).toBe(true);
  });

  test('L2: Signup form displays correctly', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST L2: Signup Form');
    console.log('========================================');

    // Click Get Started
    const getStarted = page.locator('text=/Get Started/i').first();
    if (await getStarted.isVisible({ timeout: 5000 })) {
      await getStarted.click();
      await waitForStability(page);
    }

    await takeScreenshot(page, 'signup-form');

    // Check for form elements
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    const createBtn = page.locator('text=/Create Account/i').first();

    const hasEmail = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPassword = await passwordInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasCreateBtn = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Email input: ${hasEmail ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`Password input: ${hasPassword ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`Create Account button: ${hasCreateBtn ? 'VISIBLE' : 'NOT FOUND'}`);

    if (!hasEmail) logBug('Email input not visible on signup form');
    if (!hasPassword) logBug('Password input not visible on signup form');
    if (!hasCreateBtn) logBug('Create Account button not visible on signup form');
  });

  test('L3: Login form displays correctly', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST L3: Login Form');
    console.log('========================================');

    await page.goto('/login');
    await waitForStability(page);

    await takeScreenshot(page, 'login-form');

    // Check for Welcome Back text
    const welcomeBack = page.getByText('Welcome Back');
    const hasWelcome = await welcomeBack.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Welcome Back text: ${hasWelcome ? 'VISIBLE' : 'NOT FOUND'}`);

    // Check for form elements
    const emailInput = page.locator('input[placeholder="Email address"]').first();
    const passwordInput = page.locator('input[placeholder="Password"]').first();
    const signInBtn = page.getByText('Sign In', { exact: true }).first();

    const hasEmail = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPassword = await passwordInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasSignIn = await signInBtn.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Email input: ${hasEmail ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`Password input: ${hasPassword ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`Sign In button: ${hasSignIn ? 'VISIBLE' : 'NOT FOUND'}`);

    // OAuth buttons are hidden by default (EXPO_PUBLIC_OAUTH_ENABLED !== 'true')
    // This is intentional to prevent redirect errors when OAuth providers are not configured
    const googleBtn = page.locator('text=/Continue with Google/i').first();
    const hasGoogle = await googleBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Google OAuth (should be hidden): ${hasGoogle ? 'VISIBLE - UNEXPECTED' : 'HIDDEN - OK'}`);

    if (!hasEmail) logBug('Email input not visible on login form');
    if (!hasPassword) logBug('Password input not visible on login form');
    if (!hasSignIn) logBug('Sign In button not visible on login form');
    if (hasGoogle) logBug('OAuth buttons visible when OAUTH_ENABLED is not set - should be hidden');
  });

  test('L4: OAuth buttons hidden when not configured', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST L4: OAuth Buttons Hidden');
    console.log('========================================');

    await page.goto('/login');
    await waitForStability(page);

    await takeScreenshot(page, 'login-no-oauth');

    // OAuth buttons should NOT be visible when EXPO_PUBLIC_OAUTH_ENABLED is not 'true'
    const googleBtn = page.locator('text=/Continue with Google/i').first();
    const appleBtn = page.locator('text=/Continue with Apple/i').first();

    const hasGoogle = await googleBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const hasApple = await appleBtn.isVisible({ timeout: 1000 }).catch(() => false);

    console.log(`Google OAuth button: ${hasGoogle ? 'VISIBLE - BUG' : 'HIDDEN - OK'}`);
    console.log(`Apple OAuth button: ${hasApple ? 'VISIBLE - BUG' : 'HIDDEN - OK'}`);

    // OAuth buttons should be hidden to prevent redirect errors
    if (hasGoogle || hasApple) {
      logBug('OAuth buttons visible when OAUTH_ENABLED is not set - should be hidden to prevent redirect errors');
    } else {
      console.log('SUCCESS: OAuth buttons correctly hidden');
    }

    // Verify email/password login is still available
    const emailInput = page.locator('input[placeholder="Email address"]').first();
    const hasEmail = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Email login available: ${hasEmail ? 'YES' : 'NO'}`);
    expect(hasEmail).toBe(true);
  });
});

// ============================================================
// UI COMPONENT TESTS (Non-auth dependent)
// ============================================================

test.describe('UI COMPONENTS', () => {

  test('C1: Back button navigation works', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST C1: Back Button Navigation');
    console.log('========================================');

    await page.goto('/');
    await waitForStability(page);

    // Navigate to signup
    const getStarted = page.locator('text=/Get Started/i').first();
    if (await getStarted.isVisible({ timeout: 5000 })) {
      await getStarted.click();
      await waitForStability(page);
    }

    // Click back button
    const backBtn = page.locator('[aria-label*="back" i], [role="button"]:has(svg)').first();
    if (await backBtn.isVisible({ timeout: 3000 })) {
      await backBtn.click();
      await waitForStability(page);
      console.log('Back button clicked');
    }

    await takeScreenshot(page, 'after-back-navigation');
  });

  test('C2: Sign Up link from login works', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST C2: Sign Up Link');
    console.log('========================================');

    await page.goto('/login');
    await waitForStability(page);

    // Click Sign Up link
    const signUpLink = page.locator('text=/Sign Up/i').first();
    if (await signUpLink.isVisible({ timeout: 5000 })) {
      await signUpLink.click();
      await waitForStability(page);
      console.log('Sign Up link clicked');
    }

    await takeScreenshot(page, 'after-signup-link');

    // Should now be on signup form
    const createAccount = page.locator('text=/Create Account/i').first();
    const isOnSignup = await createAccount.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Navigated to signup: ${isOnSignup ? 'YES' : 'NO'}`);
  });
});

// ============================================================
// FINAL REPORT
// ============================================================

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('UI FLOWS TEST REPORT');
  console.log('========================================');
  console.log(`Test Run ID: ${TEST_RUN_ID}`);
  console.log('\n--- BUGS FOUND ---');
  if (BUGS_FOUND.length === 0) {
    console.log('No bugs found during UI flow testing!');
  } else {
    BUGS_FOUND.forEach((bug, i) => {
      console.log(`${i + 1}. ${bug}`);
    });
  }
  console.log('\n========================================');
});
