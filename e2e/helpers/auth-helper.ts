import { Page, BrowserContext } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Authentication Helper for Playwright E2E Tests
 *
 * This helper provides utilities for real Supabase authentication testing.
 * Unlike the Clerk-based AuthHelper, this works with the actual Supabase Auth
 * implementation used in the application.
 *
 * Usage:
 *   const helper = new SupabaseAuthHelper(page);
 *   await helper.signInWithPassword(email, password);
 *   await helper.waitForAuthentication();
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
  sessionToken?: string;
}

export class SupabaseAuthHelper {
  private supabase: SupabaseClient;

  constructor(
    private page: Page,
    supabaseUrl?: string,
    supabaseAnonKey?: string
  ) {
    // Use environment variables if not provided
    const url = supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const key = supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    if (!url || !key) {
      throw new Error('Supabase URL and Anon Key must be provided or set in environment variables');
    }

    this.supabase = createClient(url, key, {
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000), // 30 second timeout instead of default 10s
          });
        },
      },
    });
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
          console.log(`[SupabaseAuthHelper] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Sign in with email and password using Supabase Auth
   * Sets the session in the browser's localStorage for the app to pick up
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    try {
      console.log(`[SupabaseAuthHelper] Signing in: ${email}`);

      // Sign in via Supabase API with retry logic
      const result = await this.retryWithBackoff(async () => {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.session) {
          throw new Error('No session returned from sign in');
        }

        return { data, error };
      });

      const { data, error } = result;

      if (error || !data.session) {
        console.error('[SupabaseAuthHelper] Sign in error:', error?.message);
        return {
          success: false,
          error: error?.message || 'No session returned',
        };
      }

      console.log('[SupabaseAuthHelper] Sign in successful, user ID:', data.user.id);

      // Inject the session into the browser's storage
      await this.injectSession(data.session);

      return {
        success: true,
        userId: data.user.id,
        sessionToken: data.session.access_token,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SupabaseAuthHelper] Sign in exception:', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string, options?: {
    emailRedirectTo?: string;
    data?: Record<string, any>;
  }): Promise<AuthResult> {
    try {
      console.log(`[SupabaseAuthHelper] Signing up: ${email}`);

      const result = await this.retryWithBackoff(async () => {
        const { data, error } = await this.supabase.auth.signUp({
          email,
          password,
          options,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('No user returned from sign up');
        }

        return { data, error };
      });

      const { data, error } = result;

      if (error || !data.user) {
        console.error('[SupabaseAuthHelper] Sign up error:', error?.message);
        return {
          success: false,
          error: error?.message || 'No user returned',
        };
      }

      console.log('[SupabaseAuthHelper] Sign up successful, user ID:', data.user.id);

      // If session exists, inject it into browser
      if (data.session) {
        await this.injectSession(data.session);
      }

      return {
        success: true,
        userId: data.user.id,
        sessionToken: data.session?.access_token,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SupabaseAuthHelper] Sign up exception:', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('[SupabaseAuthHelper] Sign out error:', error.message);
        return false;
      }

      // Clear browser storage
      await this.clearAuthState();

      return true;
    } catch (error) {
      console.error('[SupabaseAuthHelper] Sign out exception:', error);
      return false;
    }
  }

  /**
   * Inject a Supabase session into the browser's localStorage
   * This allows the app to pick up the authenticated session
   */
  private async injectSession(session: any): Promise<void> {
    const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;

    await this.page.evaluate(
      ({ key, sessionData }) => {
        localStorage.setItem(key, JSON.stringify(sessionData));
      },
      { key: storageKey, sessionData: session }
    );

    console.log('[SupabaseAuthHelper] Session injected into localStorage');
  }

  /**
   * Wait for the app to recognize authentication
   * Checks for common authenticated state indicators
   */
  async waitForAuthentication(timeout: number = 10000): Promise<boolean> {
    try {
      // Wait for app to load and show authenticated state
      await this.page.waitForFunction(
        () => {
          // Check for auth indicators (adjust selectors based on your app)
          const indicators = [
            document.querySelector('[class*="dashboard"]'),
            document.querySelector('[class*="properties"]'),
            document.querySelector('text=/Welcome|Dashboard|Properties/i'),
          ];
          return indicators.some(el => el !== null);
        },
        { timeout }
      );

      console.log('[SupabaseAuthHelper] Authentication confirmed');
      return true;
    } catch (error) {
      console.error('[SupabaseAuthHelper] Wait for authentication timeout');
      return false;
    }
  }

  /**
   * Check if user is authenticated by checking localStorage
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;

      const hasSession = await this.page.evaluate((key) => {
        const data = localStorage.getItem(key);
        if (!data) return false;

        try {
          const session = JSON.parse(data);
          return !!session.access_token;
        } catch {
          return false;
        }
      }, storageKey);

      return hasSession;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current session token from browser storage
   */
  async getSessionToken(): Promise<string | null> {
    try {
      const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;

      const token = await this.page.evaluate((key) => {
        const data = localStorage.getItem(key);
        if (!data) return null;

        try {
          const session = JSON.parse(data);
          return session.access_token || null;
        } catch {
          return null;
        }
      }, storageKey);

      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all authentication state from browser
   */
  async clearAuthState(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          // Storage might not be accessible
        }
      });

      await this.page.context().clearCookies();
      console.log('[SupabaseAuthHelper] Auth state cleared');
    } catch (error) {
      console.error('[SupabaseAuthHelper] Failed to clear auth state:', error);
    }
  }

  /**
   * Navigate to the app and wait for it to load
   */
  async navigateToApp(path: string = '/'): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Give React time to hydrate
  }

  /**
   * Complete sign in flow: authenticate + navigate + wait
   */
  async authenticateAndNavigate(
    email: string,
    password: string,
    navigateTo: string = '/'
  ): Promise<AuthResult> {
    // First navigate to the app
    await this.navigateToApp('/');

    // Sign in
    const result = await this.signInWithPassword(email, password);

    if (!result.success) {
      return result;
    }

    // Navigate to desired page
    if (navigateTo !== '/') {
      await this.navigateToApp(navigateTo);
    } else {
      // Reload current page to pick up auth state
      await this.page.reload({ waitUntil: 'networkidle' });
    }

    // Wait for authentication to be recognized
    const authenticated = await this.waitForAuthentication();

    if (!authenticated) {
      return {
        success: false,
        error: 'Authentication successful but app did not recognize auth state',
      };
    }

    return result;
  }
}

/**
 * Helper to create test users in Supabase (requires service role key)
 * This should only be used in test setup, not in individual tests
 */
export class SupabaseTestUserManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create a test user (requires service role key)
   */
  async createTestUser(email: string, password: string, metadata?: Record<string, any>): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for test users
        user_metadata: metadata || {},
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        userId: data.user.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Delete a test user
   */
  async deleteTestUser(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all users (for cleanup)
   */
  async listUsers(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers();
      return error ? [] : data.users;
    } catch (error) {
      return [];
    }
  }
}

// ==============================================================================
// Backward Compatibility Exports
// ==============================================================================

/**
 * AuthHelper - Backward compatible alias for SupabaseAuthHelper
 * This maintains compatibility with existing tests that use the old Clerk-based AuthHelper name.
 *
 * New code should use SupabaseAuthHelper directly for clarity.
 */
export class AuthHelper extends SupabaseAuthHelper {
  /**
   * loginWithEmail - Backward compatible method name (alias for signInWithPassword)
   */
  async loginWithEmail(email: string, password: string): Promise<AuthResult> {
    return this.authenticateAndNavigate(email, password);
  }

  /**
   * signUpWithEmail - Backward compatible method name (alias for signUp)
   */
  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    return this.signUp(email, password);
  }

  /**
   * logout - Backward compatible method name (alias for signOut)
   */
  async logout(): Promise<boolean> {
    return this.signOut();
  }
}

/**
 * AuthTestData - Backward compatible class for generating test data
 */
export class AuthTestData {
  private static counter = 0;

  static generateTestEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    this.counter++;
    return `test-user-${timestamp}-${random}-${this.counter}@example.com`;
  }

  static generateTestPassword(): string {
    return `TestPassword123!${Math.random().toString(36).substring(7)}`;
  }

  static getTestUserCredentials(): { email: string; password: string } | null {
    const email = process.env.LANDLORD_EMAIL || process.env.TEST_USER_EMAIL;
    const password = process.env.LANDLORD_PASSWORD || process.env.TEST_USER_PASSWORD;

    if (email && password) {
      return { email, password };
    }

    return null;
  }
}

/**
 * OAuthHelper - Stub for backward compatibility
 * OAuth functionality is not currently implemented with Supabase Auth in E2E tests.
 * This stub prevents import errors in existing tests.
 */
export class OAuthHelper {
  constructor(private page: Page) {}

  async initiateOAuth(provider: 'google' | 'apple'): Promise<{ initiated: boolean; blocked: boolean; reason?: string }> {
    console.warn('[OAuthHelper] OAuth testing not yet implemented with Supabase Auth');
    return {
      initiated: false,
      blocked: true,
      reason: 'OAuth testing not implemented - use Supabase signInWithOAuth in application code',
    };
  }

  async isOAuthAvailable(provider: 'google' | 'apple'): Promise<boolean> {
    return false;
  }
}
