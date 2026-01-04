/**
 * E2E Test: Tenant Invite Acceptance with Atomic RPC
 *
 * Tests the complete tenant invite flow using the signup_and_accept_invite() RPC.
 * This test verifies:
 * 1. Fresh tenant can sign up via invite link and auto-accept
 * 2. Atomic RPC creates profile, accepts invite, sets onboarding_completed flag
 * 3. User is routed directly to TenantHome (zero intermediate screens)
 * 4. Database state is correct after acceptance
 * 5. Existing users use regular accept_invite() RPC
 */

import { test, expect } from '@playwright/test';
import { supabase, supabaseAdmin, cleanupTestUser, cleanupTestProperty } from '../utils/supabase-test-client';

const BASE_URL = 'http://localhost:8081';
const TEST_LANDLORD_EMAIL = `landlord-${Date.now()}@myailandlord.com`;
const TEST_TENANT_EMAIL = `tenant-${Date.now()}@myailandlord.com`;
const TEST_PASSWORD = 'TestUser123!';
const TEST_PROPERTY_NAME = 'E2E Test Property';

test.describe('Tenant Invite Acceptance - Atomic RPC', () => {
  let landlordId: string;
  let propertyId: string;
  let tenantId: string;
  let inviteToken: string;

  test.beforeEach(async ({ page }) => {
    // Set viewport size
    await page.setViewportSize({ width: 375, height: 667 });

    // Setup: Create landlord and property
    const { data: landlordAuth } = await supabase.auth.signUp({
      email: TEST_LANDLORD_EMAIL,
      password: TEST_PASSWORD,
    });
    landlordId = landlordAuth.user!.id;

    // Set landlord profile
    await supabase
      .from('profiles')
      .update({ role: 'landlord', onboarding_completed: true })
      .eq('id', landlordId);

    // Create property
    const { data: property } = await supabase
      .from('properties')
      .insert({
        name: TEST_PROPERTY_NAME,
        landlord_id: landlordId,
        address: {
          line1: '123 Test St',
          city: 'SF',
          state: 'CA',
          zipCode: '94102',
        },
      })
      .select()
      .single();

    propertyId = property!.id;

    // Generate invite token
    const { data: tokenData } = await supabase.rpc('generate_invite_token', {
      p_property_id: propertyId,
      p_delivery_method: 'code',
    });

    inviteToken = tokenData[0].token;
  });

  test.afterEach(async () => {
    // Cleanup: Delete test data
    if (tenantId) {
      await cleanupTestUser(tenantId);
    }
    if (propertyId) {
      await cleanupTestProperty(propertyId);
    }
    if (landlordId) {
      await cleanupTestUser(landlordId);
    }
  });

  test('Fresh tenant signs up via invite and auto-accepts using atomic RPC', async ({ page }) => {
    // Step 1: Navigate to invite URL
    const inviteUrl = `${BASE_URL}/invite?t=${inviteToken}`;
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 2: Verify invite validation screen appears
    await expect(page.locator(`text=/${TEST_PROPERTY_NAME}/i`)).toBeVisible({ timeout: 10000 });

    // Step 3: Click accept (should redirect to signup since not authenticated)
    await page.click('text=/accept|continue|get.*started/i');
    await page.waitForTimeout(1000);

    // Step 4: Sign up
    await page.fill('input[placeholder*="email" i]', TEST_TENANT_EMAIL);
    await page.fill('input[placeholder*="password" i]', TEST_PASSWORD);
    await page.fill('input[placeholder*="name" i]', 'Test Tenant');
    await page.click('button:has-text("Sign Up")');

    // Wait for authentication and atomic RPC
    await page.waitForTimeout(5000);

    // Step 5: Verify navigation directly to TenantHome (zero intermediate screens)
    await expect(page).toHaveURL(/tenant.*home/i, { timeout: 10000 });

    // Step 6: Get tenant user ID
    const { data: { user } } = await supabase.auth.getUser();
    expect(user).toBeTruthy();
    tenantId = user!.id;

    // Step 7: Verify database state
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', tenantId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.role).toBe('tenant');
    expect(profile!.onboarding_completed).toBe(true);

    // Check tenant-property link created
    const { data: link, error: linkError } = await supabase
      .from('tenant_property_links')
      .select('id, tenant_id, property_id, is_active')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .single();

    expect(linkError).toBeNull();
    expect(link).toBeTruthy();
    expect(link!.is_active).toBe(true);

    // Check invite marked as used
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, used_at, used_by')
      .eq('property_id', propertyId)
      .single();

    expect(inviteError).toBeNull();
    expect(invite).toBeTruthy();
    expect(invite!.used_at).toBeTruthy();
    expect(invite!.used_by).toBe(tenantId);
  });

  test('Existing landlord accepts tenant invite using regular RPC', async ({ page }) => {
    // Setup: Create existing landlord user (already has onboarding_completed = true from beforeEach)
    const existingLandlordEmail = `existing-landlord-${Date.now()}@myailandlord.com`;
    const { data: existingAuth } = await supabase.auth.signUp({
      email: existingLandlordEmail,
      password: TEST_PASSWORD,
    });
    const existingUserId = existingAuth.user!.id;
    tenantId = existingUserId; // For cleanup

    await supabase
      .from('profiles')
      .update({ role: 'landlord', onboarding_completed: true })
      .eq('id', existingUserId);

    // Step 1: Sign in as existing user
    await page.goto(BASE_URL);
    await page.click('text=Sign In');
    await page.fill('input[placeholder*="email" i]', existingLandlordEmail);
    await page.fill('input[placeholder*="password" i]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);

    // Step 2: Navigate to invite URL
    const inviteUrl = `${BASE_URL}/invite?t=${inviteToken}`;
    await page.goto(inviteUrl);
    await page.waitForTimeout(2000);

    // Step 3: Accept invite (should use regular RPC, not atomic)
    await page.click('text=/accept|continue/i');
    await page.waitForTimeout(3000);

    // Step 4: Verify navigation to TenantHome
    await expect(page).toHaveURL(/tenant.*home/i, { timeout: 10000 });

    // Step 5: Verify role did NOT change (still landlord)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', existingUserId)
      .single();

    expect(profile!.role).toBe('landlord'); // Role should NOT change to tenant

    // Step 6: Verify property link created
    const { data: link } = await supabase
      .from('tenant_property_links')
      .select('id')
      .eq('tenant_id', existingUserId)
      .eq('property_id', propertyId)
      .single();

    expect(link).toBeTruthy();
  });

  test('Invalid token shows error message', async ({ page }) => {
    // Step 1: Navigate with invalid token
    const invalidUrl = `${BASE_URL}/invite?t=INVALIDTOKEN123`;
    await page.goto(invalidUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 2: Verify error message displayed
    await expect(page.locator('text=/invalid|expired|error/i')).toBeVisible({ timeout: 10000 });

    // Step 3: Verify NOT navigated to home
    await expect(page).not.toHaveURL(/tenant.*home|landlord.*home/i);
  });

  test('Expired token shows error message', async ({ page }) => {
    // Setup: Create expired invite
    await supabase
      .from('invites')
      .update({ expires_at: new Date(Date.now() - 86400000).toISOString() }) // 1 day ago
      .eq('property_id', propertyId);

    // Step 1: Navigate with expired token
    const expiredUrl = `${BASE_URL}/invite?t=${inviteToken}`;
    await page.goto(expiredUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 2: Verify error message
    await expect(page.locator('text=/expired|invalid/i')).toBeVisible({ timeout: 10000 });
  });
});
