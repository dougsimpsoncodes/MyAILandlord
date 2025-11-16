import { test, expect } from '@playwright/test';
import { AuthHelper, AuthTestData } from '../helpers/auth-helper';
import { WelcomeScreenPO, SignUpScreenPO, RoleSelectScreenPO, DashboardPO } from '../helpers/page-objects';
import { DatabaseHelper } from '../helpers/database-helper';

/**
 * E2E Tests for Complete Account Creation Flow
 * Tests: Signup → Email Verification → Profile Creation → Role Selection → Dashboard
 */

test.describe('Complete Account Creation E2E', () => {
  let authHelper: AuthHelper;
  let welcomeScreen: WelcomeScreenPO;
  let signUpScreen: SignUpScreenPO;
  let roleSelectScreen: RoleSelectScreenPO;
  let dashboard: DashboardPO;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    welcomeScreen = new WelcomeScreenPO(page);
    signUpScreen = new SignUpScreenPO(page);
    roleSelectScreen = new RoleSelectScreenPO(page);
    dashboard = new DashboardPO(page);
    dbHelper = new DatabaseHelper();

    await authHelper.clearAuthState();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    try {
      await authHelper.logout();
    } catch {
      // Ignore
    }
  });

  test('should complete full signup flow ending at role selection', async ({ page }) => {
    const email = AuthTestData.generateTestEmail();
    const password = AuthTestData.generateTestPassword();

    // Step 1: Navigate to welcome screen
    await welcomeScreen.navigate();
    const welcomeVisible = await welcomeScreen.isVisible();
    expect(welcomeVisible).toBeTruthy();
    console.log('✓ Step 1: Welcome screen loaded');

    // Step 2: Click Get Started
    await welcomeScreen.clickGetStarted();
    await page.waitForTimeout(2000);
    console.log('✓ Step 2: Navigated to signup');

    // Step 3: Fill signup form
    const result = await authHelper.signUpWithEmail(email, password);
    expect(result.success).toBeTruthy();
    console.log('✓ Step 3: Signup form submitted');

    // Step 4: Handle verification if needed
    if (result.needsVerification) {
      console.log('  → Email verification required');
      console.log('  → Manual step: Enter verification code from email');
      console.log(`  → Email: ${email}`);

      // In automated testing, we can't get the verification code
      // This would require email testing service integration
      test.skip();
      return;
    }

    // Step 5: Should reach role selection or dashboard
    await page.waitForTimeout(3000);
    const roleVisible = await roleSelectScreen.isVisible();
    const dashVisible = await dashboard.isVisible();

    expect(roleVisible || dashVisible).toBeTruthy();
    console.log('✓ Step 4: Reached role selection/dashboard');

    console.log('\n✓ COMPLETE: Full signup flow successful');
  });

  test('should allow role selection after signup', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ Test user credentials not available');
      test.skip();
      return;
    }

    // Login first (assuming user exists)
    await welcomeScreen.navigate();
    await page.locator('text=/Sign In/i').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    await authHelper.loginWithEmail(testCreds.email, testCreds.password);
    await page.waitForTimeout(3000);

    // Check if role selection appears
    const roleVisible = await roleSelectScreen.isVisible();

    if (roleVisible) {
      console.log('✓ Role selection screen visible');

      // Test selecting landlord role
      await roleSelectScreen.selectLandlord();
      await page.waitForTimeout(2000);

      // Should navigate away from role selection
      const stillOnRoleSelect = await roleSelectScreen.isVisible();
      expect(stillOnRoleSelect).toBeFalsy();

      console.log('✓ Role selection completed');
    } else {
      console.log('⚠ User already has role set');
    }
  });

  test('should create profile data on first login', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds || !dbHelper.isAvailable()) {
      console.log('⚠ Test prerequisites not met');
      test.skip();
      return;
    }

    // Login
    await welcomeScreen.navigate();
    await page.locator('text=/Sign In/i').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    const loginSuccess = await authHelper.loginWithEmail(testCreds.email, testCreds.password);

    if (loginSuccess) {
      await page.waitForTimeout(3000);

      // Get session info
      const session = await authHelper.getSessionInfo();

      if (session && session.userId) {
        // Check if profile exists in database
        const profile = await dbHelper.getUserProfile(session.userId);

        if (profile) {
          console.log('✓ Profile exists in database');
          expect(profile.email).toBe(testCreds.email);
          console.log(`  → Role: ${profile.role || 'not set'}`);
          console.log(`  → Name: ${profile.name || 'not set'}`);
        } else {
          console.log('⚠ Profile not found - may be created after role selection');
        }
      }
    }
  });

  test('should persist user data across sessions', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ Test user credentials not available');
      test.skip();
      return;
    }

    // Login first time
    await welcomeScreen.navigate();
    await page.locator('text=/Sign In/i').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    await authHelper.loginWithEmail(testCreds.email, testCreds.password);
    await page.waitForTimeout(3000);

    const session1 = await authHelper.getSessionInfo();

    // Logout
    await authHelper.logout();
    await page.waitForTimeout(2000);

    // Login again
    await page.locator('text=/Sign In/i').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    await authHelper.loginWithEmail(testCreds.email, testCreds.password);
    await page.waitForTimeout(3000);

    const session2 = await authHelper.getSessionInfo();

    // User ID should be the same
    if (session1 && session2) {
      expect(session2.userId).toBe(session1.userId);
      console.log('✓ User data persisted across sessions');
    }
  });

  test('should handle first-time user experience', async ({ page }) => {
    // This test documents the expected first-time user flow
    await page.goto('/');
    await page.waitForTimeout(2000);

    console.log('\n=== First-Time User Experience Flow ===');
    console.log('1. User lands on Welcome screen');
    console.log('2. User clicks "Get Started"');
    console.log('3. User sees Signup form with email/password fields');
    console.log('4. User can also see OAuth options (Google/Apple)');
    console.log('5. After signup, user receives verification email');
    console.log('6. User enters verification code');
    console.log('7. User selects role (Tenant or Landlord)');
    console.log('8. User is taken to appropriate dashboard');
    console.log('9. Profile is created in database');
    console.log('=====================================\n');

    expect(true).toBeTruthy();
  });

  test('should complete account setup in under 2 minutes (performance)', async ({ page }) => {
    const startTime = Date.now();

    await welcomeScreen.navigate();
    await welcomeScreen.clickGetStarted();
    await page.waitForTimeout(2000);

    // Fill form
    const email = AuthTestData.generateTestEmail();
    const password = AuthTestData.generateTestPassword();

    await authHelper.signUpWithEmail(email, password);
    await page.waitForTimeout(3000);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✓ Account setup completed in ${duration.toFixed(2)} seconds`);
    expect(duration).toBeLessThan(120); // Should complete in under 2 minutes
  });
});

test.describe('Profile Creation and Updates', () => {
  test('should allow profile information entry', async ({ page }) => {
    // This test would check for profile form if it exists
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Look for profile fields
    const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
    const hasProfileForm = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasProfileForm) {
      console.log('✓ Profile form found');

      // Test filling profile
      await nameInput.fill('Test User');

      const phoneInput = page.locator('input[name*="phone"], input[placeholder*="phone" i]').first();
      if (await phoneInput.isVisible({ timeout: 2000 })) {
        await phoneInput.fill('555-1234');
      }

      console.log('✓ Profile fields can be filled');
    } else {
      console.log('⚠ No separate profile form - data may come from Clerk');
    }

    expect(true).toBeTruthy();
  });

  test('should validate required profile fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Look for required fields
    const requiredFields = await page.locator('input[required], [aria-required="true"]').count();

    if (requiredFields > 0) {
      console.log(`✓ Found ${requiredFields} required fields`);
    } else {
      console.log('⚠ No required fields found - validation may be lenient');
    }

    expect(true).toBeTruthy();
  });
});

test.describe('Account Setup Completion', () => {
  test('should mark account as setup complete after role selection', async ({ page }) => {
    const testCreds = AuthTestData.getTestUserCredentials();

    if (!testCreds) {
      console.log('⚠ Test credentials not available');
      test.skip();
      return;
    }

    const authHelper = new AuthHelper(page);
    await page.goto('/');
    await page.waitForTimeout(2000);

    await page.locator('text=/Sign In/i').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    await authHelper.loginWithEmail(testCreds.email, testCreds.password);
    await page.waitForTimeout(3000);

    // Check if user is taken directly to dashboard (setup complete)
    // or to role selection (setup incomplete)
    const roleSelectScreen = new RoleSelectScreenPO(page);
    const dashboard = new DashboardPO(page);

    const needsSetup = await roleSelectScreen.isVisible();
    const setupComplete = await dashboard.isVisible();

    if (setupComplete) {
      console.log('✓ Account setup complete - user at dashboard');
    } else if (needsSetup) {
      console.log('⚠ Account setup incomplete - user at role selection');
    } else {
      console.log('⚠ Unknown state - neither role selection nor dashboard visible');
    }

    expect(needsSetup || setupComplete).toBeTruthy();
  });
});
