import { Page, expect } from '@playwright/test';

/**
 * Authentication helper for Playwright E2E tests
 * Provides utilities for Supabase authentication testing
 */

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Complete signup flow with email/password via Supabase Auth
   * @param email - User email address
   * @param password - User password
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
      await this.page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });

      // Fill email
      const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]').first();
      await emailInput.fill(email);

      // Fill password
      const passwordInput = this.page.locator('input[type="password"], input[placeholder*="password" i]').first();
      await passwordInput.fill(password);

      // Click sign up button
      const signUpButton = this.page.locator('button:has-text("Create Account"), button:has-text("Sign Up")').first();
      await signUpButton.click();

      // Check if verification is needed
      await this.page.waitForTimeout(2000);
      const needsVerification = await this.page.locator('text=/verify|verification|confirm your email/i').isVisible().catch(() => false);

      return { success: true, needsVerification };
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, needsVerification: false };
    }
  }

  /**
   * Complete email verification
   * @param code - Verification code or link token
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
   * Login with email/password via Supabase Auth
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
      await this.page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });

      // Fill email
      const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]').first();
      await emailInput.fill(email);

      // Fill password
      const passwordInput = this.page.locator('input[type="password"], input[placeholder*="password" i]').first();
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
      // Look for logout button/link
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
   * Get current session info from Supabase
   */
  async getSessionInfo(): Promise<{ userId?: string; email?: string } | null> {
    try {
      return await this.page.evaluate(() => {
        // Try to get Supabase session from localStorage
        const supabaseKeys = Object.keys(localStorage).filter(key =>
          key.includes('supabase') && key.includes('auth')
        );

        for (const key of supabaseKeys) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.user) {
              return {
                userId: data.user.id,
                email: data.user.email
              };
            }
          } catch {
            continue;
          }
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
   * Wait for Supabase Auth to be loaded and ready
   */
  async waitForAuthLoaded(timeout = 10000): Promise<boolean> {
    try {
      // Wait for the app to finish loading auth state
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000); // Give auth a moment to initialize
      return true;
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
   * Attempt to initiate OAuth flow
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
   * Get pre-configured test user credentials
   * Checks TEST_USER_EMAIL/TEST_USER_PASSWORD env vars first,
   * then falls back to known test users
   */
  static getTestUserCredentials(): { email: string; password: string } | null {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (email && password) {
      return { email, password };
    }

    // Fall back to known test landlord user
    return {
      email: 'test-landlord@myailandlord.com',
      password: 'MyAI2025!Landlord#Test',
    };
  }

  /**
   * Get tenant test credentials
   */
  static getTenantTestCredentials(): { email: string; password: string } {
    return {
      email: 'test-tenant@myailandlord.com',
      password: 'MyAI2025!Tenant#Test',
    };
  }
}

/**
 * Supabase API authentication helper with rate limit retry
 * This is for API-based tests (not UI tests)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache for authenticated clients to reduce auth calls
const clientCache: Map<string, { client: SupabaseClient; userId: string; profileId: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface AuthenticatedClient {
  client: SupabaseClient;
  userId: string;
  profileId: string;
}

/**
 * Sleep helper for rate limit backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticate user with exponential backoff retry for rate limits
 * @param email - User email
 * @param password - User password
 * @param maxRetries - Maximum number of retries (default: 5)
 */
export async function authenticateWithRetry(
  email: string,
  password: string,
  maxRetries: number = 5
): Promise<AuthenticatedClient | null> {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase not configured');
    return null;
  }

  // Check cache first
  const cacheKey = `${email}:${SUPABASE_URL}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { client: cached.client, userId: cached.userId, profileId: cached.profileId };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Check if it's a rate limit error
        if (authError.message.includes('rate limit') || authError.status === 429) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
          console.log(`Rate limited for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }

        // Other auth errors - don't retry
        console.error(`Auth failed for ${email}:`, authError.message);
        return null;
      }

      if (!authData.user) {
        console.error(`No user returned for ${email}`);
        return null;
      }

      const result = {
        client,
        userId: authData.user.id,
        profileId: authData.user.id,
        timestamp: Date.now(),
      };

      // Cache the result
      clientCache.set(cacheKey, result);

      return { client: result.client, userId: result.userId, profileId: result.profileId };
    } catch (error) {
      lastError = error as Error;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Auth error for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  console.error(`All ${maxRetries} auth attempts failed for ${email}:`, lastError?.message);
  return null;
}

/**
 * Clear the authentication cache (useful between test files)
 */
export function clearAuthCache(): void {
  clientCache.clear();
}
