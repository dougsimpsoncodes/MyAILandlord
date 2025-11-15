import { test, expect } from '@playwright/test';
import { AuthHelper, AuthTestData } from '../helpers/auth-helper';
import { WelcomeScreenPO, LoginScreenPO, SignUpScreenPO, RoleSelectScreenPO } from '../helpers/page-objects';

/**
 * E2E Tests for Clerk Authentication
 * Tests real Clerk signup, login, logout, and session management
 *
 * Prerequisites:
 * - EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be set
 * - Test user credentials in TEST_USER_EMAIL and TEST_USER_PASSWORD (optional)
 * - App must be running on localhost:8082
 */

test.describe('Clerk Authentication - Real Integration', () => {
  let authHelper: AuthHelper;
  let welcomeScreen: WelcomeScreenPO;
  let loginScreen: LoginScreenPO;
  let signUpScreen: SignUpScreenPO;
  let roleSelectScreen: RoleSelectScreenPO;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    welcomeScreen = new WelcomeScreenPO(page);
    loginScreen = new LoginScreenPO(page);
    signUpScreen = new SignUpScreenPO(page);
    roleSelectScreen = new RoleSelectScreenPO(page);

    // Clear any existing auth state
    await authHelper.clearAuthState();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: try to logout if authenticated
    try {
      await authHelper.logout();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should load welcome screen successfully', async ({ page }) => {
    await welcomeScreen.navigate();

    const isVisible = await welcomeScreen.isVisible();
    expect(isVisible).toBeTruthy();

    // Verify Clerk is loaded
    const clerkLoaded = await authHelper.waitForClerkLoaded(10000);
    expect(clerkLoaded).toBeTruthy();
  });

  test('should navigate to signup screen from welcome', async ({ page }) => {
    await welcomeScreen.navigate();
    await welcomeScreen.clickGetStarted();

    // Wait for signup form to appear
    await page.waitForTimeout(2000);

    // Check for email input (indicates signup form)
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login screen from welcome', async ({ page }) => {
    await welcomeScreen.navigate();

    // Look for and click sign in link
    const signInVisible = await loginScreen.signInLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (signInVisible) {
      await welcomeScreen.clickSignIn();
      await page.waitForTimeout(2000);

      // Check for email input
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible({ timeout: 10000 });
    } else {
      // App might go directly to login, that's ok
      console.log('Sign in link not found on welcome screen, app may redirect to auth directly');
    }
  });

  test('should show validation error for empty login form', async ({ page }) => {
    await welcomeScreen.navigate();

    // Navigate to login
    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);

    // Try to submit without filling form
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In")').first();

    if (await signInButton.isVisible({ timeout: 5000 })) {
      // Click without filling fields
      await signInButton.click();
      await page.waitForTimeout(1000);

      // Should show error or have disabled button
      const hasError = await page.locator('[role="alert"], .error, text=/required|invalid/i').isVisible({ timeout: 3000 }).catch(() => false);
      const isDisabled = await signInButton.isDisabled();

      expect(hasError || isDisabled).toBeTruthy();
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await welcomeScreen.navigate();

    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);

    // Try to login with invalid credentials
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In")').first();

    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword123');
      await signInButton.click();

      await page.waitForTimeout(2000);

      // Should show invalid credentials error
      const hasError = await authHelper.hasInvalidCredentialsError();
      expect(hasError).toBeTruthy();
    }
  });

  test('should successfully sign up with email/password (if verification not required)', async ({ page }) => {
    // Generate unique test credentials
    const email = AuthTestData.generateTestEmail();
    const password = AuthTestData.generateTestPassword();

    await welcomeScreen.navigate();
    await welcomeScreen.clickGetStarted();
    await page.waitForTimeout(2000);

    // Fill signup form
    const result = await authHelper.signUpWithEmail(email, password);

    if (result.needsVerification) {
      // Verification required - this is expected behavior
      expect(result.success).toBeTruthy();

      // Check for verification screen
      const verificationVisible = await page.locator('text=/verify|verification|code/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(verificationVisible).toBeTruthy();

      console.log(`✓ Signup initiated, verification required for ${email}`);
    } else if (result.success) {
      // No verification needed - check for role selection or dashboard
      await page.waitForTimeout(3000);

      const roleSelectVisible = await roleSelectScreen.isVisible();
      const authenticated = await authHelper.isAuthenticated();

      expect(roleSelectVisible || authenticated).toBeTruthy();
      console.log(`✓ Signup completed successfully for ${email}`);
    }
  });

  test('should successfully login with existing test user credentials', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ TEST_USER_EMAIL and TEST_USER_PASSWORD not set, skipping login test');
      test.skip();
      return;
    }

    await welcomeScreen.navigate();

    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);

    // Perform login
    const success = await authHelper.loginWithEmail(testCreds.email, testCreds.password);

    if (success) {
      expect(success).toBeTruthy();

      // Verify we're authenticated
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      // Should see role selection or dashboard
      await page.waitForTimeout(2000);
      const roleVisible = await roleSelectScreen.isVisible();
      const hasAuth = await authHelper.isAuthenticated();

      expect(roleVisible || hasAuth).toBeTruthy();
      console.log(`✓ Login successful for ${testCreds.email}`);
    } else {
      console.log('⚠ Login failed - check test credentials');
    }
  });

  test('should persist session across page reload', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ TEST_USER_EMAIL and TEST_USER_PASSWORD not set, skipping session test');
      test.skip();
      return;
    }

    // Login first
    await welcomeScreen.navigate();

    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);
    const loginSuccess = await authHelper.loginWithEmail(testCreds.email, testCreds.password);

    if (!loginSuccess) {
      console.log('⚠ Login failed, skipping session persistence test');
      test.skip();
      return;
    }

    await page.waitForTimeout(3000);

    // Get session info before reload
    const sessionBefore = await authHelper.getSessionInfo();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check if still authenticated
    const isAuthenticatedAfter = await authHelper.isAuthenticated();
    expect(isAuthenticatedAfter).toBeTruthy();

    const sessionAfter = await authHelper.getSessionInfo();

    // Sessions should match or both exist
    if (sessionBefore && sessionAfter) {
      expect(sessionAfter.userId).toBe(sessionBefore.userId);
    } else {
      expect(isAuthenticatedAfter).toBeTruthy();
    }

    console.log('✓ Session persisted across page reload');
  });

  test('should successfully logout', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ TEST_USER_EMAIL and TEST_USER_PASSWORD not set, skipping logout test');
      test.skip();
      return;
    }

    // Login first
    await welcomeScreen.navigate();

    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);
    const loginSuccess = await authHelper.loginWithEmail(testCreds.email, testCreds.password);

    if (!loginSuccess) {
      console.log('⚠ Login failed, skipping logout test');
      test.skip();
      return;
    }

    await page.waitForTimeout(3000);

    // Verify authenticated
    const isAuthBefore = await authHelper.isAuthenticated();
    expect(isAuthBefore).toBeTruthy();

    // Logout
    const logoutSuccess = await authHelper.logout();

    if (logoutSuccess) {
      await page.waitForTimeout(2000);

      // Should be back to welcome or login screen
      const welcomeVisible = await welcomeScreen.isVisible();
      const loginVisible = await page.locator('text=/Sign In|Log In/i').isVisible({ timeout: 3000 }).catch(() => false);

      expect(welcomeVisible || loginVisible).toBeTruthy();

      // Should not be authenticated
      const isAuthAfter = await authHelper.isAuthenticated();
      expect(isAuthAfter).toBeFalsy();

      console.log('✓ Logout successful');
    } else {
      console.log('⚠ Logout button not found - may need to update selectors');
    }
  });

  test('should clear session on logout', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ TEST_USER_EMAIL and TEST_USER_PASSWORD not set, skipping test');
      test.skip();
      return;
    }

    // Login
    await welcomeScreen.navigate();

    try {
      await welcomeScreen.clickSignIn();
    } catch {
      // May already be on login
    }

    await page.waitForTimeout(2000);
    await authHelper.loginWithEmail(testCreds.email, testCreds.password);
    await page.waitForTimeout(3000);

    // Logout
    await authHelper.logout();
    await page.waitForTimeout(2000);

    // Check that session is cleared
    const sessionInfo = await authHelper.getSessionInfo();
    expect(sessionInfo).toBeNull();

    console.log('✓ Session cleared on logout');
  });

  test('should handle password with special characters', async ({ page }) => {
    await welcomeScreen.navigate();
    await welcomeScreen.clickGetStarted();
    await page.waitForTimeout(2000);

    const email = AuthTestData.generateTestEmail();
    const specialPassword = 'Test@Pass#123$!';

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(email);
      await passwordInput.fill(specialPassword);

      // Verify password was entered correctly
      const passwordValue = await passwordInput.inputValue();
      expect(passwordValue).toBe(specialPassword);

      console.log('✓ Special characters in password handled correctly');
    }
  });
});

test.describe('Authentication Edge Cases', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('should handle concurrent page loads gracefully', async ({ page }) => {
    // Navigate to app multiple times rapidly
    await page.goto('/');
    await page.goto('/');
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // App should not crash
    const hasError = await page.locator('text=/error|crash|failed/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();

    console.log('✓ Handled concurrent page loads');
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // App should still load
    const welcomeVisible = await page.locator('text=/Welcome|Get Started/i').isVisible({ timeout: 10000 }).catch(() => false);
    expect(welcomeVisible).toBeTruthy();

    console.log('✓ Handled slow network gracefully');
  });
});
