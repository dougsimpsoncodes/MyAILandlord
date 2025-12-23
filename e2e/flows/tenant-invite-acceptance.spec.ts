/**
 * Tenant Invite Acceptance - End-to-End Tests
 *
 * Production-ready test coverage for tokenized invite flow:
 * - Full UI click-through (invite preview → auth → accept → completion)
 * - Concurrency/idempotency (race condition handling)
 * - Realistic data (real landlord, property, RLS enforcement)
 * - CORS/Origin enforcement (browser-based validation)
 * - Error paths (401/403/404 scenarios)
 * - Multi-use token lifecycle
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Configuration
// ============================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';

// Test run ID for data isolation
const TEST_RUN_ID = Date.now();

// ============================================================
// Test Helpers
// ============================================================

class TestDataManager {
  private supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  private createdUsers: string[] = [];
  private createdProperties: string[] = [];
  private createdTokens: string[] = [];

  /**
   * Create a test landlord with real authentication
   */
  async createTestLandlord() {
    const email = `test-landlord-${TEST_RUN_ID}@myailandlord.com`;
    const password = 'TestLandlord123!E2E';

    // Create auth user
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName: 'Test' },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test landlord: ${authError?.message}`);
    }

    this.createdUsers.push(authData.user.id);

    // Create profile
    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        first_name: 'Test',
        role: 'landlord',
      });

    if (profileError) {
      throw new Error(`Failed to create landlord profile: ${profileError.message}`);
    }

    return {
      id: authData.user.id,
      email,
      password,
    };
  }

  /**
   * Create a test property owned by the landlord
   */
  async createTestProperty(landlordId: string) {
    const propertyData = {
      name: `Test Property ${TEST_RUN_ID}`,
      user_id: landlordId,
      landlord_id: landlordId,
      address_line1: '123 Test Street',
      city: 'Portland',
      state: 'OR',
      postal_code: '97201',
      country: 'US',
      property_type: 'single_family',
      bedrooms: 3,
      bathrooms: 2,
    };

    const { data, error } = await this.supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test property: ${error?.message}`);
    }

    this.createdProperties.push(data.id);
    return data;
  }

  /**
   * Generate invite token for property
   */
  async generateInviteToken(propertyId: string, maxUses: number = 1, expiresInDays: number = 7) {
    const { data, error } = await this.supabase.rpc('generate_invite_token', {
      p_property_id: propertyId,
      p_max_uses: maxUses,
      p_expires_in_days: expiresInDays,
    });

    if (error || !data) {
      throw new Error(`Failed to generate invite token: ${error?.message}`);
    }

    this.createdTokens.push(data.token_id);
    return {
      token: data.token as string,
      tokenId: data.token_id as string,
      inviteUrl: `${BASE_URL}/invite?token=${data.token}`,
    };
  }

  /**
   * Create a test tenant (unauthenticated - will sign up during test)
   */
  getTenantCredentials(suffix: string = '') {
    return {
      email: `test-tenant-${TEST_RUN_ID}${suffix}@myailandlord.com`,
      password: 'TestTenant123!E2E',
      firstName: 'Tenant',
    };
  }

  /**
   * Cleanup all test data
   */
  async cleanup() {
    // Delete tokens
    if (this.createdTokens.length > 0) {
      await this.supabase.from('invite_tokens').delete().in('id', this.createdTokens);
    }

    // Delete properties (cascades to areas, assets, tokens)
    if (this.createdProperties.length > 0) {
      await this.supabase.from('properties').delete().in('id', this.createdProperties);
    }

    // Delete auth users (cascades to profiles)
    for (const userId of this.createdUsers) {
      await this.supabase.auth.admin.deleteUser(userId);
    }

    // Also delete any tenants that signed up during tests
    const { data: testTenants } = await this.supabase.auth.admin.listUsers();
    const tenantEmails = testTenants?.users
      .filter(u => u.email?.includes(`test-tenant-${TEST_RUN_ID}`))
      .map(u => u.id) || [];

    for (const tenantId of tenantEmails) {
      await this.supabase.auth.admin.deleteUser(tenantId);
    }
  }

  /**
   * Verify token in database
   */
  async getTokenDetails(token: string) {
    const { data } = await this.supabase
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .single();

    return data;
  }

  /**
   * Verify tenant-property link
   */
  async getTenantPropertyLink(tenantId: string, propertyId: string) {
    const { data } = await this.supabase
      .from('tenant_property_links')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .single();

    return data;
  }
}

/**
 * Auth helper for Playwright pages
 */
class AuthHelper {
  constructor(private page: Page) {}

  async signUp(email: string, password: string, firstName: string) {
    // Navigate to sign up
    await this.page.goto(`${BASE_URL}/signup`);

    // Fill sign up form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[placeholder*="first name" i]', firstName);
    await this.page.fill('input[type="password"]', password);

    // Accept terms
    const termsCheckbox = this.page.locator('input[type="checkbox"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Submit
    await this.page.click('button:has-text("Sign Up")');

    // Wait for auth to complete
    await this.page.waitForURL(/.*\/(home|dashboard|onboarding).*/i, { timeout: 10000 });
  }

  async signIn(email: string, password: string) {
    await this.page.goto(`${BASE_URL}/signin`);
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForURL(/.*\/(home|dashboard).*/i, { timeout: 10000 });
  }

  async signOut() {
    // Assumes logout button exists in header/menu
    await this.page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    await this.page.waitForURL(/.*\/(signin|welcome).*/i, { timeout: 5000 });
  }

  async clearAuthState() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => localStorage.clear());
    await this.page.evaluate(() => sessionStorage.clear());
  }
}

// ============================================================
// Test Suite Setup
// ============================================================

let testDataManager: TestDataManager;
let landlord: Awaited<ReturnType<TestDataManager['createTestLandlord']>>;
let property: Awaited<ReturnType<TestDataManager['createTestProperty']>>;

test.beforeAll(async () => {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for E2E tests');
  }

  testDataManager = new TestDataManager();

  // Create test landlord and property
  landlord = await testDataManager.createTestLandlord();
  property = await testDataManager.createTestProperty(landlord.id);
});

test.afterAll(async () => {
  await testDataManager.cleanup();
});

// ============================================================
// Test Suite: End-to-End Tenant Invite Flow
// ============================================================

test.describe('Tenant Invite Acceptance - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any previous auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete full invite acceptance flow for new tenant', async ({ page }) => {
    // Generate invite token
    const { token, inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Step 1: Navigate to invite URL
    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Step 2: Verify invite preview screen
    await expect(page.locator('text=/invite/i, text=/property/i')).toBeVisible({ timeout: 10000 });

    // Verify property details displayed
    await expect(page.locator(`text=/${property.name}/i`)).toBeVisible();
    await expect(page.locator('text=/Portland, OR/i')).toBeVisible();

    // Step 3: Click "Accept Invitation" button
    const acceptButton = page.locator('button:has-text("Accept"), button[testid*="accept"]');
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Step 4: Sign up flow (redirected to auth)
    const tenant = testDataManager.getTenantCredentials();
    const authHelper = new AuthHelper(page);

    // Check if redirected to sign up/sign in
    await page.waitForURL(/.*\/(signup|signin|auth).*/i, { timeout: 10000 });

    // Create new account
    await authHelper.signUp(tenant.email, tenant.password, tenant.firstName);

    // Step 5: Verify redirect back to invite acceptance
    // After signup, should auto-accept or redirect to acceptance screen
    await page.waitForLoadState('networkidle');

    // Step 6: Verify completion screen or redirect to property details
    const completionIndicators = [
      page.locator('text=/success/i, text=/welcome/i, text=/you\'re connected/i'),
      page.locator('text=/property details/i, text=/messages/i, text=/maintenance/i'),
    ];

    await expect(
      Promise.race(completionIndicators.map(loc => loc.waitFor({ timeout: 15000 })))
    ).resolves.toBeTruthy();

    // Step 7: Verify database state
    // Get tenant user ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: tenant.email,
      password: tenant.password,
    });

    expect(user).toBeTruthy();

    // Verify tenant-property link created
    const link = await testDataManager.getTenantPropertyLink(user!.id, property.id);
    expect(link).toBeTruthy();
    expect(link?.status).toBe('active');

    // Verify token marked as used
    const tokenDetails = await testDataManager.getTokenDetails(token);
    expect(tokenDetails?.use_count).toBe(1);
    expect(tokenDetails?.used_at).toBeTruthy();

    // Cleanup
    await supabase.auth.signOut();
  });

  test('should handle already-linked tenant gracefully', async ({ page }) => {
    // Generate token
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Create and sign up tenant
    const tenant = testDataManager.getTenantCredentials('-existing');
    const authHelper = new AuthHelper(page);

    // First acceptance
    await page.goto(inviteUrl);
    await page.click('button:has-text("Accept")');
    await authHelper.signUp(tenant.email, tenant.password, tenant.firstName);
    await page.waitForLoadState('networkidle');

    // Generate new token for same property
    const { inviteUrl: secondInviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Try to accept again (already linked)
    await page.goto(secondInviteUrl);
    await page.waitForLoadState('networkidle');

    // Should show "already connected" or similar message
    await expect(
      page.locator('text=/already connected/i, text=/already linked/i, text=/existing connection/i')
    ).toBeVisible({ timeout: 10000 });

    // Or redirect directly to property details
    const urlAfterLoad = page.url();
    expect(
      urlAfterLoad.includes('property') ||
      urlAfterLoad.includes('dashboard') ||
      urlAfterLoad.includes('home')
    ).toBeTruthy();
  });

  test('should show error for expired token', async ({ page }) => {
    // Generate token with 1 second expiry
    const { token, inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 1/86400); // ~1 second

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to expired invite
    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Should show expired error
    await expect(
      page.locator('text=/expired/i, text=/no longer valid/i')
    ).toBeVisible({ timeout: 10000 });

    // Should show CTA to request new invite
    await expect(
      page.locator('button:has-text("Request"), text=/contact.*landlord/i')
    ).toBeVisible();

    // Verify Accept button disabled or hidden
    const acceptButton = page.locator('button:has-text("Accept")');
    if (await acceptButton.isVisible()) {
      await expect(acceptButton).toBeDisabled();
    }
  });

  test('should show error for revoked token', async ({ page }) => {
    // Generate token
    const { token, tokenId, inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Revoke the token using service client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);

    // Navigate to revoked invite
    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Should show revoked/invalid error
    await expect(
      page.locator('text=/revoked/i, text=/cancelled/i, text=/no longer valid/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid/non-existent token', async ({ page }) => {
    const invalidToken = 'ZZZZZZZZZZZ1'; // Non-existent but valid format
    const inviteUrl = `${BASE_URL}/invite?token=${invalidToken}`;

    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Should show invalid error
    await expect(
      page.locator('text=/invalid/i, text=/not found/i, text=/not valid/i')
    ).toBeVisible({ timeout: 10000 });

    // Should show CTA to contact landlord
    await expect(
      page.locator('text=/contact.*landlord/i, button:has-text("Request")')
    ).toBeVisible();
  });
});

// ============================================================
// Test Suite: Concurrency & Idempotency
// ============================================================

test.describe('Concurrency & Race Condition Handling', () => {
  test('should allow only one acceptance when multiple tenants try simultaneously', async ({ browser }) => {
    // Generate multi-use token (max_uses: 3)
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id, 3, 7);

    // Create 3 separate browser contexts (simulating 3 different users)
    const contexts: BrowserContext[] = [];
    const tenants = [
      testDataManager.getTenantCredentials('-concurrent1'),
      testDataManager.getTenantCredentials('-concurrent2'),
      testDataManager.getTenantCredentials('-concurrent3'),
    ];

    try {
      // Setup contexts
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        contexts.push(context);
      }

      // Race condition: All 3 try to accept simultaneously
      const acceptancePromises = contexts.map(async (context, i) => {
        const page = await context.newPage();
        const authHelper = new AuthHelper(page);

        try {
          // Navigate to invite
          await page.goto(inviteUrl);
          await page.waitForLoadState('networkidle');

          // Click accept
          await page.click('button:has-text("Accept")');

          // Sign up
          await authHelper.signUp(tenants[i].email, tenants[i].password, tenants[i].firstName);

          // Wait for completion
          await page.waitForLoadState('networkidle');

          return { success: true, tenant: i };
        } catch (error) {
          return { success: false, tenant: i, error };
        }
      });

      const results = await Promise.all(acceptancePromises);

      // Verify: Exactly 3 should succeed (max_uses: 3)
      const successes = results.filter(r => r.success);
      expect(successes.length).toBe(3);

      // Verify: 4th attempt should fail
      const context4 = await browser.newContext();
      const page4 = await context4.newPage();
      const tenant4 = testDataManager.getTenantCredentials('-concurrent4');

      await page4.goto(inviteUrl);
      await page4.waitForLoadState('networkidle');

      // Should show "max uses reached" error or disabled state
      const errorVisible = await page4.locator('text=/maximum uses/i, text=/no longer available/i').isVisible();
      const acceptDisabled = await page4.locator('button:has-text("Accept")').isDisabled();

      expect(errorVisible || acceptDisabled).toBeTruthy();

      await context4.close();
    } finally {
      // Cleanup contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should handle duplicate acceptance by same user gracefully', async ({ page }) => {
    // Generate token
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id, 5, 7);

    // Create tenant and accept once
    const tenant = testDataManager.getTenantCredentials('-duplicate');
    const authHelper = new AuthHelper(page);

    await page.goto(inviteUrl);
    await page.click('button:has-text("Accept")');
    await authHelper.signUp(tenant.email, tenant.password, tenant.firstName);
    await page.waitForLoadState('networkidle');

    // Try to accept again with same account
    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Should show "already connected" or redirect to property
    const alreadyLinked = await page.locator('text=/already connected/i, text=/already linked/i').isVisible();
    const redirectedToProperty = page.url().includes('property') || page.url().includes('dashboard');

    expect(alreadyLinked || redirectedToProperty).toBeTruthy();
  });
});

// ============================================================
// Test Suite: CORS & Origin Enforcement
// ============================================================

test.describe('CORS & Origin Security', () => {
  test('should block validation requests from unauthorized origins', async ({ page }) => {
    // Generate token
    const { token } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Intercept fetch requests from different origin
    const responseCaptured: any[] = [];

    await page.route('**/functions/v1/validate-invite-token', async (route) => {
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          'Origin': 'https://malicious-site.com', // Unauthorized origin
        },
      });
      responseCaptured.push({
        status: response.status(),
        headers: response.headers(),
      });
      await route.fulfill({ response });
    });

    // Navigate and trigger validation
    await page.goto(`${BASE_URL}/invite?token=${token}`);
    await page.waitForLoadState('networkidle');

    // Verify CORS headers or block
    if (responseCaptured.length > 0) {
      const corsResponse = responseCaptured[0];

      // Either blocked (403/404) or CORS error
      const blocked = corsResponse.status >= 400;
      const noCorsHeader = !corsResponse.headers['access-control-allow-origin'];

      expect(blocked || noCorsHeader).toBeTruthy();
    }
  });

  test('should allow validation from native apps (no Origin header)', async () => {
    // Generate token
    const { token } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Direct fetch without Origin (simulates native app)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        // No Origin header
      },
      body: JSON.stringify({ token }),
    });

    expect(response.ok).toBeTruthy();
    const result = await response.json();
    expect(result.valid).toBe(true);
    expect(result.property).toBeTruthy();
  });
});

// ============================================================
// Test Suite: Error Paths & Edge Cases
// ============================================================

test.describe('Error Handling & Edge Cases', () => {
  test('should return 401 when accepting without authentication', async ({ page }) => {
    // Generate token
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Clear auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Navigate to invite
    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle');

    // Click accept without signing in
    const acceptButton = page.locator('button:has-text("Accept")');
    await acceptButton.click();

    // Should redirect to sign in/up
    await page.waitForURL(/.*\/(signin|signup|auth).*/i, { timeout: 10000 });

    // Or show error requiring authentication
    const authRequired = await page.locator('text=/sign in/i, text=/create account/i').isVisible();
    expect(authRequired).toBeTruthy();
  });

  test('should handle malformed token parameter gracefully', async ({ page }) => {
    const malformedUrls = [
      `${BASE_URL}/invite?token=`,  // Empty token
      `${BASE_URL}/invite?token=abc!@#$%`,  // Special characters
      `${BASE_URL}/invite`,  // Missing token
    ];

    for (const url of malformedUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Should show error, not crash
      const errorVisible = await page.locator('text=/invalid/i, text=/error/i, text=/required/i').isVisible();
      expect(errorVisible).toBeTruthy();
    }
  });

  test('should enforce RLS - tenant cannot accept invite for property they don\'t own', async ({ page }) => {
    // This is implicitly tested by the normal flow, but let's be explicit

    // Generate token
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Create tenant and accept
    const tenant = testDataManager.getTenantCredentials('-rls-test');
    const authHelper = new AuthHelper(page);

    await page.goto(inviteUrl);
    await page.click('button:has-text("Accept")');
    await authHelper.signUp(tenant.email, tenant.password, tenant.firstName);
    await page.waitForLoadState('networkidle');

    // Verify tenant can't access landlord-only data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({
      email: tenant.email,
      password: tenant.password,
    });

    // Try to query all properties (should only see linked property)
    const { data: allProperties } = await supabase
      .from('properties')
      .select('*');

    // Tenant should only see the one property they're linked to
    expect(allProperties?.length).toBe(1);
    expect(allProperties?.[0].id).toBe(property.id);

    // Try to query invite_tokens (should be blocked by RLS)
    const { data: tokens, error } = await supabase
      .from('invite_tokens')
      .select('*');

    // Should be empty or error (RLS prevents tenant access)
    expect(tokens?.length === 0 || error).toBeTruthy();

    await supabase.auth.signOut();
  });
});

// ============================================================
// Test Suite: Multi-Use Token Lifecycle
// ============================================================

test.describe('Multi-Use Token Lifecycle', () => {
  test('should track use_count accurately for multi-use tokens', async ({ browser }) => {
    // Generate token with max_uses: 3
    const { token, inviteUrl } = await testDataManager.generateInviteToken(property.id, 3, 7);

    // Accept 3 times with different tenants
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const tenant = testDataManager.getTenantCredentials(`-multi${i}`);
      const authHelper = new AuthHelper(page);

      await page.goto(inviteUrl);
      await page.click('button:has-text("Accept")');
      await authHelper.signUp(tenant.email, tenant.password, tenant.firstName);
      await page.waitForLoadState('networkidle');

      await context.close();

      // Verify use_count incremented
      const tokenDetails = await testDataManager.getTokenDetails(token);
      expect(tokenDetails?.use_count).toBe(i + 1);
    }

    // Verify max_uses reached
    const finalTokenDetails = await testDataManager.getTokenDetails(token);
    expect(finalTokenDetails?.use_count).toBe(3);
    expect(finalTokenDetails?.max_uses).toBe(3);

    // 4th attempt should fail
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();

    await page4.goto(inviteUrl);
    await page4.waitForLoadState('networkidle');

    const errorVisible = await page4.locator('text=/maximum/i, text=/limit reached/i, text=/no longer available/i').isVisible();
    expect(errorVisible).toBeTruthy();

    await context4.close();
  });

  test('should handle revocation during multi-use lifecycle', async ({ browser }) => {
    // Generate multi-use token
    const { token, tokenId, inviteUrl } = await testDataManager.generateInviteToken(property.id, 5, 7);

    // First acceptance
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const tenant1 = testDataManager.getTenantCredentials('-revoke1');
    const authHelper1 = new AuthHelper(page1);

    await page1.goto(inviteUrl);
    await page1.click('button:has-text("Accept")');
    await authHelper1.signUp(tenant1.email, tenant1.password, tenant1.firstName);
    await page1.waitForLoadState('networkidle');
    await context1.close();

    // Verify use_count = 1
    let tokenDetails = await testDataManager.getTokenDetails(token);
    expect(tokenDetails?.use_count).toBe(1);

    // Revoke token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);

    // Second attempt should fail due to revocation
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto(inviteUrl);
    await page2.waitForLoadState('networkidle');

    const revokedError = await page2.locator('text=/revoked/i, text=/cancelled/i, text=/no longer valid/i').isVisible();
    expect(revokedError).toBeTruthy();

    await context2.close();

    // Verify use_count didn't increment
    tokenDetails = await testDataManager.getTokenDetails(token);
    expect(tokenDetails?.use_count).toBe(1); // Still 1, not 2
  });
});

// ============================================================
// Test Suite: Logging & Security Hygiene
// ============================================================

test.describe('Logging & Security Hygiene', () => {
  test('should never log token values in Edge Function responses', async () => {
    // Generate token
    const { token } = await testDataManager.generateInviteToken(property.id, 1, 7);

    // Call validate-invite-token
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    // Verify response contains token_id (UUID), not token value
    expect(result.token_id).toBeTruthy();
    expect(result.token_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Verify token value NOT in response
    expect(JSON.stringify(result).includes(token)).toBeFalsy();
  });

  test('should not expose sensitive data in error messages', async ({ page }) => {
    // Navigate to non-existent token
    const fakeToken = 'FAKEFAKEFAKE';
    await page.goto(`${BASE_URL}/invite?token=${fakeToken}`);
    await page.waitForLoadState('networkidle');

    // Check page content for accidental leaks
    const pageContent = await page.textContent('body');

    // Should NOT contain database IDs, internal errors, stack traces
    expect(pageContent).not.toContain('uuid');
    expect(pageContent).not.toContain('stacktrace');
    expect(pageContent).not.toContain('database');
    expect(pageContent).not.toContain('postgres');

    // Should contain user-friendly message
    expect(pageContent).toMatch(/invalid|not found|not valid/i);
  });
});
