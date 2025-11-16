import { Page, expect } from '@playwright/test';

/**
 * Authentication helper for Playwright E2E tests
 * Provides utilities for real Clerk authentication testing
 */

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Complete signup flow with email/password via Clerk
   * @param email - User email address
   * @param password - User password
   * @param verificationCode - Optional verification code if already obtained
   */
  async signUpWithEmail(email: string, password: string): Promise<{ success: boolean; needsVerification: boolean }> {
    try {
      // Navigate to welcome screen
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');

      // Click "Get Started" or similar button to initiate signup
      const getStartedButton = this.page.locator('text=/Get Started|Sign Up|Create Account/i').first();
      await getStartedButton.click();

      // Wait for signup form
      await this.page.waitForSelector('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });

      // Fill email
      const emailInput = this.page.locator('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]').first();
      await emailInput.fill(email);

      // Fill password
      const passwordInput = this.page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();
      await passwordInput.fill(password);

      // Click sign up button
      const signUpButton = this.page.locator('button:has-text("Create Account"), button:has-text("Sign Up")').first();
      await signUpButton.click();

      // Check if verification is needed
      await this.page.waitForTimeout(2000);
      const needsVerification = await this.page.locator('text=/verify|verification code|enter code/i').isVisible().catch(() => false);

      return { success: true, needsVerification };
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, needsVerification: false };
    }
  }

  /**
   * Complete email verification
   * @param code - 6-digit verification code
   */
  async verifyEmail(code: string): Promise<boolean> {
    try {
      // Find verification code input
      const codeInput = this.page.locator('input[name="code"], input[placeholder*="code" i], input[placeholder*="verification" i]').first();
      await codeInput.fill(code);

      // Click verify button
      const verifyButton = this.page.locator('button:has-text("Verify"), button:has-text("Continue")').first();
      await verifyButton.click();

      // Wait for successful verification
      await this.page.waitForTimeout(2000);
      return true;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  /**
   * Login with email/password via Clerk
   * @param email - User email
   * @param password - User password
   */
  async loginWithEmail(email: string, password: string): Promise<boolean> {
    try {
      // Navigate to welcome or login screen
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');

      // Look for login button or link
      const loginLink = this.page.locator('text=/Sign In|Log In|Login|Already have an account/i').first();
      if (await loginLink.isVisible()) {
        await loginLink.click();
      }

      // Wait for login form
      await this.page.waitForSelector('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });

      // Fill email
      const emailInput = this.page.locator('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]').first();
      await emailInput.fill(email);

      // Fill password
      const passwordInput = this.page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();
      await passwordInput.fill(password);

      // Click sign in button
      const signInButton = this.page.locator('button:has-text("Sign In"), button:has-text("Log In")').first();
      await signInButton.click();

      // Wait for redirect after successful login
      await this.page.waitForTimeout(3000);

      // Check if we're logged in by looking for role selection or dashboard
      const isLoggedIn = await this.page.locator('text=/Select your role|Dashboard|Welcome,/i').isVisible({ timeout: 5000 }).catch(() => false);

      return isLoggedIn;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<boolean> {
    try {
      // Look for logout button/link (using proper selector syntax)
      const logoutButton = this.page.locator('text=/Log Out|Sign Out|Logout/i').first();

      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click();
        await this.page.waitForTimeout(2000);
        return true;
      }

      // Also try button with aria-label
      const logoutButtonAria = this.page.locator('button[aria-label*="logout" i]').first();
      if (await logoutButtonAria.isVisible({ timeout: 2000 })) {
        await logoutButtonAria.click();
        await this.page.waitForTimeout(2000);
        return true;
      }

      // Try settings/profile menu
      const menuButton = this.page.locator('[aria-label*="menu" i], [aria-label*="profile" i]').first();
      if (await menuButton.isVisible({ timeout: 3000 })) {
        await menuButton.click();
        await this.page.waitForTimeout(500);

        const logoutInMenu = this.page.locator('text=/Log Out|Sign Out/i').first();
        if (await logoutInMenu.isVisible()) {
          await logoutInMenu.click();
          await this.page.waitForTimeout(2000);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for elements that indicate authentication
      const authIndicators = [
        'text=/Dashboard|Welcome|Select your role/i',
        '[aria-label*="profile" i]',
        '[aria-label*="menu" i]'
      ];

      for (const selector of authIndicators) {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session info from Clerk
   */
  async getSessionInfo(): Promise<{ userId?: string; email?: string } | null> {
    try {
      return await this.page.evaluate(() => {
        // Try to get Clerk session from window object
        const clerk = (window as any).__clerk_frontend_api;
        if (clerk && clerk.session) {
          return {
            userId: clerk.session.user?.id,
            email: clerk.session.user?.emailAddresses?.[0]?.emailAddress
          };
        }
        return null;
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all authentication state (for test cleanup)
   */
  async clearAuthState(): Promise<void> {
    try {
      // First, ensure we're on a page where localStorage is accessible
      const currentUrl = this.page.url();
      if (!currentUrl || currentUrl === 'about:blank') {
        await this.page.goto('/');
        await this.page.waitForLoadState('domcontentloaded');
      }

      // Clear localStorage, sessionStorage, and cookies
      await this.page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          // Storage might not be accessible, that's ok
        }
      });

      await this.page.context().clearCookies();
    } catch (error) {
      // Silently ignore - test cleanup should not fail tests
      console.log('Failed to clear auth state:', error);
    }
  }

  /**
   * Wait for Clerk to be loaded and ready
   */
  async waitForClerkLoaded(timeout = 10000): Promise<boolean> {
    try {
      return await this.page.waitForFunction(
        () => {
          return (window as any).__clerk_loaded === true ||
                 (window as any).__clerk_frontend_api !== undefined;
        },
        { timeout }
      ).then(() => true).catch(() => false);
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle invalid credentials error
   */
  async hasInvalidCredentialsError(): Promise<boolean> {
    try {
      const errorSelectors = [
        'text=/invalid|incorrect|wrong/i',
        '[role="alert"]',
        '.error-message',
        '[data-testid*="error"]'
      ];

      for (const selector of errorSelectors) {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}

/**
 * OAuth helper for testing OAuth flows
 */
export class OAuthHelper {
  constructor(private page: Page) {}

  /**
   * Attempt to initiate OAuth flow (may be blocked without production credentials)
   * @param provider - OAuth provider ('google' or 'apple')
   */
  async initiateOAuth(provider: 'google' | 'apple'): Promise<{ initiated: boolean; blocked: boolean; reason?: string }> {
    try {
      // Look for OAuth button
      const oauthButton = this.page.locator(`button:has-text("${provider}"), button[aria-label*="${provider}" i]`).first();

      if (!await oauthButton.isVisible({ timeout: 5000 })) {
        return { initiated: false, blocked: true, reason: `${provider} OAuth button not found` };
      }

      // Click OAuth button
      await oauthButton.click();

      // Wait for redirect or popup
      await this.page.waitForTimeout(2000);

      // Check if we got redirected to OAuth provider
      const currentUrl = this.page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('appleid.apple.com')) {
        return { initiated: true, blocked: false };
      }

      // Check for error messages
      const hasError = await this.page.locator('text=/error|failed|unavailable/i').isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        return { initiated: false, blocked: true, reason: 'OAuth error displayed' };
      }

      return { initiated: false, blocked: true, reason: 'OAuth redirect did not occur' };
    } catch (error) {
      return { initiated: false, blocked: true, reason: String(error) };
    }
  }

  /**
   * Check if OAuth is configured
   */
  async isOAuthAvailable(provider: 'google' | 'apple'): Promise<boolean> {
    try {
      const oauthButton = this.page.locator(`button:has-text("${provider}"), button[aria-label*="${provider}" i]`).first();
      return await oauthButton.isVisible({ timeout: 3000 }).catch(() => false);
    } catch (error) {
      return false;
    }
  }
}

/**
 * Test data generators for authentication tests
 */
export class AuthTestData {
  private static counter = 0;

  /**
   * Generate unique test email
   */
  static generateTestEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    this.counter++;
    return `test-user-${timestamp}-${random}-${this.counter}@example.com`;
  }

  /**
   * Generate secure test password
   */
  static generateTestPassword(): string {
    return `TestPassword123!${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get pre-configured test user credentials (if available)
   */
  static getTestUserCredentials(): { email: string; password: string } | null {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (email && password) {
      return { email, password };
    }

    return null;
  }
}
