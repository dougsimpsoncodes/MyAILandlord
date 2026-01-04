/**
 * E2E Test: Landlord Onboarding with Atomic RPC
 *
 * Tests the complete landlord onboarding flow using the signup_and_onboard_landlord() RPC.
 * This test verifies:
 * 1. Fresh landlord can sign up and create their first property
 * 2. Atomic RPC creates profile, property, areas, and sets onboarding_completed flag
 * 3. User is routed directly to LandlordHome (no intermediate screens)
 * 4. Database state is correct after onboarding
 */

import { test, expect } from '@playwright/test';
import { supabase, supabaseAdmin, cleanupTestUser } from '../utils/supabase-test-client';

const BASE_URL = 'http://localhost:8081';
const TEST_EMAIL = `test-landlord-${Date.now()}@myailandlord.com`;
const TEST_PASSWORD = 'TestLandlord123!';
const TEST_PROPERTY_NAME = 'Test Property for E2E';
const TEST_PROPERTY_ADDRESS = {
  line1: '123 Test Street',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94102',
};

test.describe('Landlord Onboarding - Atomic RPC', () => {
  let userId: string;

  test.beforeEach(async ({ page }) => {
    // Set viewport size
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for app to load
  });

  test.afterEach(async () => {
    // Cleanup: Delete test user and associated data
    if (userId) {
      await cleanupTestUser(userId);
    }
  });

  test('Fresh landlord completes onboarding via atomic RPC', async ({ page }) => {
    // Step 1: Navigate to signup
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);

    // Step 2: Sign up
    await page.fill('input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[placeholder*="password" i]', TEST_PASSWORD);
    await page.fill('input[placeholder*="name" i]', 'Test Landlord');
    await page.click('button:has-text("Sign Up as Landlord")');

    // Wait for authentication to complete
    await page.waitForTimeout(3000);

    // Step 3: Verify redirected to property onboarding
    await expect(page.locator('text=/property.*intro/i')).toBeVisible({ timeout: 10000 });

    // Step 4: Navigate to PropertyBasics
    await page.click('text=/get.*started|continue/i');
    await page.waitForTimeout(1000);

    // Step 5: Fill property basics
    await page.fill('input[placeholder*="property.*name" i]', TEST_PROPERTY_NAME);
    await page.fill('input[placeholder*="street" i]', TEST_PROPERTY_ADDRESS.line1);
    await page.fill('input[placeholder*="city" i]', TEST_PROPERTY_ADDRESS.city);
    await page.fill('input[placeholder*="state" i]', TEST_PROPERTY_ADDRESS.state);
    await page.fill('input[placeholder*="zip" i]', TEST_PROPERTY_ADDRESS.zipCode);
    await page.click('text=/next|continue/i');
    await page.waitForTimeout(1000);

    // Step 6: Skip or fill property attributes
    await page.click('text=/skip|next|continue/i');
    await page.waitForTimeout(1000);

    // Step 7: Add property areas
    await page.click('text=/add.*area|kitchen/i');
    await page.waitForTimeout(500);
    await page.click('text=/add.*area|bathroom/i');
    await page.waitForTimeout(500);
    await page.click('text=/next|continue/i');
    await page.waitForTimeout(1000);

    // Step 8: Skip assets (optional)
    await page.click('text=/skip|next|continue/i');
    await page.waitForTimeout(1000);

    // Step 9: Review and Submit (triggers atomic RPC)
    await page.click('text=/submit|finish|complete/i');

    // Wait for atomic RPC to complete and navigation
    await page.waitForTimeout(5000);

    // Step 10: Verify navigation to LandlordHome
    await expect(page).toHaveURL(/landlord.*home/i, { timeout: 10000 });

    // Step 11: Get user ID from auth
    const { data: { user } } = await supabase.auth.getUser();
    expect(user).toBeTruthy();
    userId = user!.id;

    // Step 12: Verify database state
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role, onboarding_completed')
      .eq('id', userId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.role).toBe('landlord');
    expect(profile!.onboarding_completed).toBe(true);

    // Check property created
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, landlord_id, address')
      .eq('landlord_id', userId)
      .single();

    expect(propertyError).toBeNull();
    expect(property).toBeTruthy();
    expect(property!.name).toBe(TEST_PROPERTY_NAME);
    expect(property!.address).toMatchObject({
      line1: TEST_PROPERTY_ADDRESS.line1,
      city: TEST_PROPERTY_ADDRESS.city,
      state: TEST_PROPERTY_ADDRESS.state,
      zipCode: TEST_PROPERTY_ADDRESS.zipCode,
    });

    // Check areas created
    const { data: areas, error: areasError } = await supabase
      .from('property_areas')
      .select('id, name, area_type')
      .eq('property_id', property!.id);

    expect(areasError).toBeNull();
    expect(areas).toBeTruthy();
    expect(areas!.length).toBeGreaterThan(0);
  });

  test('Existing landlord adding second property uses regular flow', async ({ page }) => {
    // Setup: Create landlord with onboarding_completed = true
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(signUpError).toBeNull();
    userId = authData.user!.id;

    // Manually set onboarding_completed to true
    await supabase
      .from('profiles')
      .update({ role: 'landlord', onboarding_completed: true })
      .eq('id', userId);

    // Step 1: Sign in
    await page.goto(BASE_URL);
    await page.click('text=Sign In');
    await page.fill('input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[placeholder*="password" i]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);

    // Step 2: Navigate to add property
    await expect(page).toHaveURL(/landlord.*home/i, { timeout: 10000 });
    await page.click('text=/add.*property/i');
    await page.waitForTimeout(1000);

    // Step 3: Fill property details (regular flow, NOT atomic RPC)
    await page.fill('input[placeholder*="property.*name" i]', 'Second Property');
    await page.fill('input[placeholder*="street" i]', '456 Second Ave');
    await page.fill('input[placeholder*="city" i]', 'Oakland');
    await page.fill('input[placeholder*="state" i]', 'CA');
    await page.fill('input[placeholder*="zip" i]', '94601');
    await page.click('text=/next|continue/i');
    await page.waitForTimeout(1000);

    // Step 4: Complete flow
    await page.click('text=/skip|next/i');
    await page.waitForTimeout(500);
    await page.click('text=/skip|next/i');
    await page.waitForTimeout(500);
    await page.click('text=/submit|finish/i');
    await page.waitForTimeout(3000);

    // Step 5: Verify navigation back to properties list
    await expect(page).toHaveURL(/properties|landlord.*home/i, { timeout: 10000 });

    // Step 6: Verify second property created
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('landlord_id', userId);

    expect(propertiesError).toBeNull();
    expect(properties).toBeTruthy();
    expect(properties!.length).toBe(2);
    expect(properties!.some(p => p.name === 'Second Property')).toBe(true);
  });
});
