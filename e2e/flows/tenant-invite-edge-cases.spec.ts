/**
 * Comprehensive Edge Case Testing for Tokenized Invite Flow
 *
 * Tests all critical failure modes and resilience features:
 * - Wrong account detection
 * - Already linked handling
 * - Capacity reached
 * - Mid-session revocation
 * - Offline state
 * - Double-click protection
 * - Mobile viewports
 */

import { test, expect, devices } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = 'http://localhost:8082';

// Test helpers
class TestDataManager {
  private supabase;
  private createdUsers: string[] = [];
  private createdTokens: string[] = [];
  private createdProperties: string[] = [];

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  async createLandlord(email: string, password: string) {
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    this.createdUsers.push(authData.user.id);

    // Create profile
    await this.supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      first_name: 'Test',
      role: 'landlord'
    });

    return { id: authData.user.id, email, password };
  }

  async createTenant(email: string, password: string) {
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    this.createdUsers.push(authData.user.id);

    await this.supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      first_name: 'Test',
      role: 'tenant'
    });

    return { id: authData.user.id, email, password };
  }

  async createProperty(landlordId: string, name: string = 'Test Property') {
    const { data, error } = await this.supabase
      .from('properties')
      .insert({
        name,
        landlord_id: landlordId,
        address: '123 Test St, Portland, OR 97201',
        address_jsonb: {
          line1: '123 Test St',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          country: 'US'
        }
      })
      .select()
      .single();

    if (error) throw error;

    this.createdProperties.push(data.id);
    return data;
  }

  async generateToken(propertyId: string, options: { max_uses?: number; expires_in_days?: number; intended_email?: string } = {}) {
    const { data, error } = await this.supabase.rpc('generate_invite_token', {
      p_property_id: propertyId,
      p_max_uses: options.max_uses || 1,
      p_expires_in_days: options.expires_in_days || 7,
      p_intended_email: options.intended_email || null
    });

    if (error) throw error;

    this.createdTokens.push(data.token_id);
    return { token: data.token, token_id: data.token_id };
  }

  async revokeToken(tokenId: string) {
    await this.supabase
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);
  }

  async linkTenantToProperty(tenantId: string, propertyId: string) {
    await this.supabase
      .from('tenant_property_links')
      .insert({
        tenant_id: tenantId,
        property_id: propertyId
      });
  }

  async cleanup() {
    // Delete in dependency order
    if (this.createdTokens.length > 0) {
      await this.supabase.from('invite_tokens').delete().in('id', this.createdTokens);
    }
    if (this.createdProperties.length > 0) {
      await this.supabase.from('tenant_property_links').delete().in('property_id', this.createdProperties);
      await this.supabase.from('properties').delete().in('id', this.createdProperties);
    }
    for (const userId of this.createdUsers) {
      await this.supabase.auth.admin.deleteUser(userId);
    }
  }
}

class AuthHelper {
  constructor(private page: any) {}

  async signIn(email: string, password: string) {
    await this.page.goto(`${APP_URL}/login`);
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/(tenant|landlord)/);
  }

  async signOut() {
    // Navigate to profile and sign out
    await this.page.goto(`${APP_URL}/profile`);
    await this.page.click('button:has-text("Sign Out")');
    await this.page.waitForURL(/\/welcome/);
  }
}

// Test suite
test.describe('Tokenized Invite Edge Cases', () => {
  let dbHelper: TestDataManager;

  test.beforeEach(async () => {
    dbHelper = new TestDataManager();
  });

  test.afterEach(async () => {
    await dbHelper.cleanup();
  });

  test('should handle wrong account gracefully', async ({ page }) => {
    // Setup: Create landlord, property, and token for specific email
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id, 'Maple Avenue House');
    const { token } = await dbHelper.generateToken(property.id, {
      intended_email: 'intended-tenant@test.com'
    });

    // Create and sign in as different user
    const wrongUser = await dbHelper.createTenant('wrong-tenant@test.com', 'password123');
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(wrongUser.email, wrongUser.password);

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);

    // Should show wrong account warning
    await expect(page.getByTestId('wrong-account-warning')).toBeVisible();
    await expect(page.getByText(/This invite was sent to intended-tenant@test.com/)).toBeVisible();

    // Should have switch account button
    const switchButton = page.getByText('Switch Account');
    await expect(switchButton).toBeVisible();

    // Should have continue anyway button
    const continueButton = page.getByText('Continue Anyway');
    await expect(continueButton).toBeVisible();

    // Test switch account flow
    await switchButton.click();
    await page.waitForURL(/\/welcome/);

    // Verify signed out
    await expect(page.getByText(/Sign In/)).toBeVisible();
  });

  test('should handle already linked to same property (idempotent)', async ({ page }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const tenant = await dbHelper.createTenant('tenant@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id, 'Maple Avenue House');

    // Link tenant to property BEFORE invite
    await dbHelper.linkTenantToProperty(tenant.id, property.id);

    // Generate token
    const { token } = await dbHelper.generateToken(property.id);

    // Sign in as tenant
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(tenant.email, tenant.password);

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);

    // Wait for validation
    await page.waitForSelector('[testID="invite-accept-button"]');

    // Try to accept
    await page.click('[testID="invite-accept-button"]');

    // Should show already connected message
    await expect(page.getByTestId('invite-error')).toBeVisible();
    await expect(page.getByText(/already connected to/i)).toBeVisible();
    await expect(page.getByText('Maple Avenue House')).toBeVisible();

    // Should have "Open Property" button
    await expect(page.getByText('Open Property')).toBeVisible();

    // NO error toast - this is a success case (idempotent)
    await expect(page.getByRole('alert')).not.toBeVisible();
  });

  test('should handle capacity reached (max_uses exhausted)', async ({ page }) => {
    // Setup: Create token with max_uses=2
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id, { max_uses: 2 });

    // Accept with first tenant
    const tenant1 = await dbHelper.createTenant('tenant1@test.com', 'password123');
    await dbHelper.linkTenantToProperty(tenant1.id, property.id);

    // Manually increment use_count to simulate 2 uses
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase
      .from('invite_tokens')
      .update({ use_count: 2 })
      .eq('token', token);

    // Third tenant tries to use token
    const tenant3 = await dbHelper.createTenant('tenant3@test.com', 'password123');
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(tenant3.email, tenant3.password);

    await page.goto(`${APP_URL}/invite?token=${token}`);

    // Should show capacity reached error
    await expect(page.getByTestId('invite-error')).toBeVisible();
    await expect(page.getByText(/invite link has been used 2 times/i)).toBeVisible();
    await expect(page.getByText(/maximum: 2/i)).toBeVisible();
    await expect(page.getByText(/Ask your landlord for a new invite/i)).toBeVisible();

    // Should have contact support button
    await expect(page.getByText('Contact Support')).toBeVisible();

    // Should NOT show retry spinner
    await expect(page.getByRole('progressbar')).not.toBeVisible();
  });

  test('should handle token revoked between validate→accept', async ({ page }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const tenant = await dbHelper.createTenant('tenant@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token, token_id } = await dbHelper.generateToken(property.id);

    // Sign in as tenant
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(tenant.email, tenant.password);

    // Navigate to invite (validate succeeds)
    await page.goto(`${APP_URL}/invite?token=${token}`);
    await expect(page.getByTestId('property-name')).toBeVisible();
    await expect(page.getByText('Maple Avenue House')).toBeVisible();

    // Revoke token server-side (simulate landlord action)
    await dbHelper.revokeToken(token_id);

    // Try to accept (should re-validate and detect revocation)
    await page.click('[testID="invite-accept-button"]');

    // Should show specific revoked error
    await expect(page.getByTestId('invite-error')).toBeVisible();
    await expect(page.getByText(/This invite was revoked/i)).toBeVisible();
    await expect(page.getByText('Request New Invite')).toBeVisible();

    // Pending invite should be cleared
    // (verify no redirect loop if user refreshes)
  });

  test('should handle offline state with cache', async ({ page, context }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id);

    // Load invite while online (caches data)
    await page.goto(`${APP_URL}/invite?token=${token}`);
    await expect(page.getByTestId('property-name')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload page (should show cached data)
    await page.reload();

    // Should show offline banner
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await expect(page.getByText(/cached data/i)).toBeVisible();

    // Should still show property details
    await expect(page.getByTestId('property-name')).toBeVisible();

    // Accept button should be disabled for tokenized invites when offline
    await expect(page.getByTestId('invite-accept-button')).toBeDisabled();

    // Go back online
    await context.setOffline(false);

    // Click retry (if visible)
    const retryButton = page.getByText('Retry Now');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }

    // Accept button should now be enabled
    await expect(page.getByTestId('invite-accept-button')).toBeEnabled();
  });

  test('should prevent double-click submission', async ({ page }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const tenant = await dbHelper.createTenant('tenant@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id);

    // Sign in
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(tenant.email, tenant.password);

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);
    await expect(page.getByTestId('invite-accept-button')).toBeVisible();

    // Listen to network requests
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('accept-invite-token')) {
        requests.push(req.url());
      }
    });

    // Rapid double-click
    const acceptButton = page.getByTestId('invite-accept-button');
    await acceptButton.click();
    await acceptButton.click(); // Second click should be blocked

    // Wait a moment for any potential second request
    await page.waitForTimeout(1000);

    // Should only have ONE accept request
    expect(requests.length).toBe(1);

    // Button should be disabled during submission
    await expect(acceptButton).toBeDisabled();
  });

  test('should work on mobile viewport (iPhone 13)', async ({ browser }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id);

    // Create iPhone 13 context
    const context = await browser.newContext({
      ...devices['iPhone 13']
    });

    const page = await context.newPage();

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);

    // Verify mobile layout
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);

    // Property name should be visible
    await expect(page.getByTestId('property-name')).toBeVisible();

    // Accept button should not be obscured by footer
    const acceptButton = page.getByTestId('invite-accept-button');
    await acceptButton.scrollIntoViewIfNeeded();
    await expect(acceptButton).toBeVisible();
    await expect(acceptButton).toBeEnabled();

    // Button should be tappable (not overlapped)
    const boundingBox = await acceptButton.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.height).toBeGreaterThan(40); // Minimum touch target

    await context.close();
  });

  test('should track analytics events correctly', async ({ page }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const tenant = await dbHelper.createTenant('tenant@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id);

    // Monitor console logs for analytics events
    const analyticsEvents: any[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('📊 Analytics:')) {
        analyticsEvents.push(text);
      }
    });

    // Sign in
    const authHelper = new AuthHelper(page);
    await authHelper.signIn(tenant.email, tenant.password);

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);

    // Wait for validation
    await page.waitForSelector('[testID="invite-accept-button"]');

    // Should have tracked invite_view
    expect(analyticsEvents.some(e => e.includes('invite_view'))).toBe(true);

    // Should have tracked validate_success
    expect(analyticsEvents.some(e => e.includes('invite_validate_success'))).toBe(true);

    // Accept invite
    await page.click('[testID="invite-accept-button"]');
    await page.waitForURL(/\/tenant/);

    // Should have tracked accept_success
    expect(analyticsEvents.some(e => e.includes('invite_accept_success'))).toBe(true);
  });

  test('should never log full token values', async ({ page }) => {
    // Setup
    const landlord = await dbHelper.createLandlord('landlord@test.com', 'password123');
    const property = await dbHelper.createProperty(landlord.id);
    const { token } = await dbHelper.generateToken(property.id);

    // Monitor console logs
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Navigate to invite
    await page.goto(`${APP_URL}/invite?token=${token}`);
    await page.waitForSelector('[testID="property-name"]');

    // Check all console messages for full token
    const hasFullToken = consoleMessages.some(msg => msg.includes(token));

    // Should NEVER log full token (only sanitized preview)
    expect(hasFullToken).toBe(false);

    // Should have sanitized token (first 4 + last 4)
    const tokenPreview = `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
    const hasSanitized = consoleMessages.some(msg => msg.includes(tokenPreview));

    expect(hasSanitized).toBe(true);
  });
});

// Helper to get invite URL
function getInviteUrl(token: string): string {
  return `${APP_URL}/invite?token=${token}`;
}
