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
   * Note: React Native Web renders TouchableOpacity as div with role="button", not actual button elements
   * @param email - User email
   * @param password - User password
   */
  async loginWithEmail(email: string, password: string): Promise<boolean> {
    try {
      console.log('[AuthHelper] Starting login flow...');

      // Navigate directly to login screen via URL
      await this.page.goto('/login');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000); // Wait for React to render

      console.log('[AuthHelper] Navigated to login, checking for form...');

      // Check if we're on the login screen (has Welcome Back text)
      const welcomeBack = this.page.getByText('Welcome Back');
      if (!await welcomeBack.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[AuthHelper] Login screen not detected, trying alternative navigation...');

        // Navigate to home and find login link
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        // Click "Already have an account? Sign In"
        const signInLink = this.page.getByText('Already have an account? Sign In');
        if (await signInLink.isVisible({ timeout: 5000 })) {
          console.log('[AuthHelper] Found sign in link, clicking...');
          await signInLink.click();
          await this.page.waitForTimeout(1500);
        }
      }

      // Wait for login form inputs
      await this.page.waitForSelector('input', { timeout: 10000 });
      console.log('[AuthHelper] Found input elements');

      // Fill email - find input with email placeholder
      const emailInput = this.page.locator('input[placeholder="Email address"]').first();
      if (await emailInput.isVisible({ timeout: 3000 })) {
        await emailInput.fill(email);
        console.log('[AuthHelper] Filled email');
      } else {
        // Fallback to first input
        console.log('[AuthHelper] Email input not found by placeholder, using first input');
        await this.page.locator('input').first().fill(email);
      }

      // Fill password - find input with password placeholder
      const passwordInput = this.page.locator('input[placeholder="Password"]').first();
      if (await passwordInput.isVisible({ timeout: 3000 })) {
        await passwordInput.fill(password);
        console.log('[AuthHelper] Filled password');
      } else {
        // Fallback to second input
        console.log('[AuthHelper] Password input not found by placeholder, using second input');
        await this.page.locator('input').nth(1).fill(password);
      }

      // Click sign in button - look for button-like element with "Sign In" text
      // First check within the loginButton styled container
      console.log('[AuthHelper] Looking for Sign In button...');

      // Try multiple approaches for React Native Web
      let clicked = false;

      // Approach 1: Find by exact text "Sign In" (button text, not the link)
      const signInButtons = await this.page.getByText('Sign In', { exact: true }).all();
      console.log(`[AuthHelper] Found ${signInButtons.length} "Sign In" elements`);

      // The first one is usually the button, the second is the link
      for (const button of signInButtons) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          const text = await button.textContent();
          console.log(`[AuthHelper] Checking element with text: "${text}"`);
          // Skip if it's the link (contains "Already have an account")
          if (text === 'Sign In') {
            await button.click();
            clicked = true;
            console.log('[AuthHelper] Clicked Sign In button');
            break;
          }
        }
      }

      if (!clicked) {
        // Approach 2: Find by role button containing "Sign In"
        const roleButton = this.page.locator('[role="button"]:has-text("Sign In")').first();
        if (await roleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await roleButton.click();
          clicked = true;
          console.log('[AuthHelper] Clicked Sign In via role=button');
        }
      }

      if (!clicked) {
        console.error('[AuthHelper] Could not find Sign In button');
        return false;
      }

      // Wait for redirect after successful login
      console.log('[AuthHelper] Waiting for login response...');
      await this.page.waitForTimeout(4000);

      // Check if we're logged in by looking for role selection or dashboard elements
      // The landlord home shows "Good afternoon/morning/evening, {name}!" and "Welcome to MyAILandlord"
      const isLoggedIn = await this.page.locator('text=/Select your role|Dashboard|Welcome back|Property Management|Landlord Home|Getting Started|Welcome to MyAILandlord|Quick Actions|Good morning|Good afternoon|Good evening/i').isVisible({ timeout: 15000 }).catch(() => false);

      console.log(`[AuthHelper] Login result: ${isLoggedIn ? 'SUCCESS' : 'FAILED'}`);

      // Take screenshot on failure for debugging
      if (!isLoggedIn) {
        await this.page.screenshot({ path: '/tmp/login-failed.png' });
        console.log('[AuthHelper] Screenshot saved to /tmp/login-failed.png');

        // Log current URL and page content
        console.log('[AuthHelper] Current URL:', this.page.url());
        const pageContent = await this.page.content();
        console.log('[AuthHelper] Page snippet:', pageContent.substring(0, 500));
      }

      return isLoggedIn;
    } catch (error) {
      console.error('[AuthHelper] Login failed with error:', error);
      await this.page.screenshot({ path: '/tmp/login-error.png' }).catch(() => {});
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
    // Try environment variables first
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    console.log('[AuthTestData] Checking credentials - email:', email ? 'configured' : 'not set');

    if (email && password) {
      return { email, password };
    }

    // Fall back to real user account (landlord)
    console.log('[AuthTestData] Using fallback credentials');
    return {
      email: 'goblue12@aol.com',
      password: '1234567',
    };
  }

  /**
   * Get tenant test credentials
   */
  static getTenantTestCredentials(): { email: string; password: string } {
    // Use the same landlord credentials for now until a dedicated tenant account is set up
    return {
      email: 'goblue12@aol.com',
      password: '1234567',
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
