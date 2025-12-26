/**
 * Complete Invite Flow E2E Test
 *
 * Tests the full invite flow from scratch:
 * 1. Landlord signup and property creation
 * 2. Invite generation
 * 3. Tenant signup via invite link
 * 4. Verify tenant sees property dashboard
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8081';

// Generate unique test emails to avoid conflicts
const timestamp = Date.now();
const landlordEmail = `landlord-${timestamp}@test.com`;
const tenantEmail = `tenant-${timestamp}@test.com`;
const password = 'Test1234!';

test.describe('Complete Invite Flow E2E', () => {
  test('landlord creates property, generates invite, tenant accepts and sees dashboard', async ({ browser }) => {

    // ============================================================================
    // LANDLORD FLOW
    // ============================================================================
    console.log('\n🏠 Starting Landlord Flow...');

    // Create fresh context with no storage
    const landlordContext = await browser.newContext({
      storageState: undefined,
    });
    const landlordPage = await landlordContext.newPage();

    // Navigate to app
    await landlordPage.goto(BASE_URL);
    await landlordPage.waitForLoadState('domcontentloaded');
    await landlordPage.waitForTimeout(2000);

    // Click Get Started button (use text match as fallback)
    console.log('  → Clicking Get Started...');
    const getStartedButton = landlordPage.getByText(/get started/i).first();
    await expect(getStartedButton).toBeVisible({ timeout: 10000 });
    await getStartedButton.click();

    // Fill signup form
    console.log('  → Filling signup form...');
    await landlordPage.waitForTimeout(1000);

    const emailInput = landlordPage.getByPlaceholder(/email/i).or(landlordPage.getByLabel(/email/i));
    const passwordInput = landlordPage.getByPlaceholder(/password/i).or(landlordPage.getByLabel(/password/i)).first();

    await emailInput.fill(landlordEmail);
    await passwordInput.fill(password);

    // Select Landlord role
    console.log('  → Selecting Landlord role...');
    const landlordRole = landlordPage.getByText(/landlord/i).or(landlordPage.getByRole('button', { name: /landlord/i }));
    await landlordRole.click();

    // Submit signup
    const submitButton = landlordPage.getByRole('button', { name: /sign up|create account|continue/i });
    await submitButton.click();

    // Wait for onboarding screen
    console.log('  → Waiting for property onboarding...');
    await expect(
      landlordPage.getByText(/add your property|property details|let's add/i)
    ).toBeVisible({ timeout: 15000 });

    // Fill property details
    console.log('  → Creating property...');

    // Property name
    const propertyName = landlordPage.getByPlaceholder(/property name|name/i).or(landlordPage.getByLabel(/property name/i));
    await propertyName.fill('E2E Test Property');

    // Address
    const addressInput = landlordPage.getByPlaceholder(/address|street/i).or(landlordPage.getByLabel(/address/i)).first();
    await addressInput.fill('123 Test Street');

    // City
    const cityInput = landlordPage.getByPlaceholder(/city/i).or(landlordPage.getByLabel(/city/i));
    if (await cityInput.isVisible()) {
      await cityInput.fill('San Francisco');
    }

    // State
    const stateInput = landlordPage.getByPlaceholder(/state/i).or(landlordPage.getByLabel(/state/i));
    if (await stateInput.isVisible()) {
      await stateInput.fill('CA');
    }

    // ZIP
    const zipInput = landlordPage.getByPlaceholder(/zip|postal/i).or(landlordPage.getByLabel(/zip/i));
    if (await zipInput.isVisible()) {
      await zipInput.fill('94102');
    }

    // Continue through property wizard
    console.log('  → Submitting property...');
    const continueButton = landlordPage.getByRole('button', { name: /continue|next|save|finish/i });
    await continueButton.click();

    // Keep clicking continue until we reach the dashboard or invite screen
    for (let i = 0; i < 5; i++) {
      await landlordPage.waitForTimeout(1000);

      const nextButton = landlordPage.getByRole('button', { name: /continue|next|finish|done|skip/i });
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
      } else {
        break;
      }
    }

    // Wait for landlord dashboard or property screen
    console.log('  → Waiting for landlord dashboard...');
    await expect(
      landlordPage.getByText(/e2e test property/i).or(
        landlordPage.getByRole('heading', { name: /properties|dashboard/i })
      )
    ).toBeVisible({ timeout: 15000 });

    // Navigate to property to generate invite
    console.log('  → Opening property details...');
    const propertyCard = landlordPage.getByText(/e2e test property/i);
    await propertyCard.click();
    await landlordPage.waitForTimeout(1000);

    // Find and click Invite Tenant button
    console.log('  → Looking for Invite Tenant button...');
    const inviteButton = landlordPage.getByRole('button', { name: /invite tenant|invite|add tenant/i });
    await expect(inviteButton).toBeVisible({ timeout: 10000 });
    await inviteButton.click();

    // Generate invite code
    console.log('  → Generating invite code...');
    await landlordPage.waitForTimeout(1000);

    const generateButton = landlordPage.getByRole('button', { name: /generate|get.*code|create.*invite/i });
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click();

    // Extract invite URL/code
    console.log('  → Extracting invite link...');
    await landlordPage.waitForTimeout(2000);

    // Look for the invite code or URL in the page
    const pageText = await landlordPage.textContent('body');

    // Try to find URL pattern
    const urlMatch = pageText?.match(/http:\/\/localhost:8081\/invite\?t=([A-Z0-9]+)/);
    const codeMatch = pageText?.match(/\b([A-Z0-9]{12})\b/);

    let inviteToken = '';
    if (urlMatch) {
      inviteToken = urlMatch[1];
    } else if (codeMatch) {
      inviteToken = codeMatch[1];
    }

    expect(inviteToken).toBeTruthy();
    const inviteUrl = `${BASE_URL}/invite?t=${inviteToken}`;

    console.log(`  ✅ Invite URL: ${inviteUrl}`);

    // Close landlord session
    await landlordContext.close();

    // ============================================================================
    // TENANT FLOW
    // ============================================================================
    console.log('\n👤 Starting Tenant Flow...');

    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();

    // Tenant opens invite link
    console.log('  → Opening invite link...');
    await tenantPage.goto(inviteUrl);
    await tenantPage.waitForLoadState('networkidle');

    // Verify property preview shows
    console.log('  → Verifying property preview...');
    await expect(
      tenantPage.getByText(/e2e test property/i)
    ).toBeVisible({ timeout: 10000 });

    // Click Sign Up & Accept
    console.log('  → Clicking Sign Up & Accept...');
    const acceptButton = tenantPage.getByRole('button', { name: /sign up.*accept|accept.*sign up/i });
    await expect(acceptButton).toBeVisible({ timeout: 5000 });
    await acceptButton.click();

    // Fill tenant signup form
    console.log('  → Filling tenant signup...');
    await tenantPage.waitForTimeout(1000);

    const tenantEmailInput = tenantPage.getByPlaceholder(/email/i).or(tenantPage.getByLabel(/email/i));
    const tenantPasswordInput = tenantPage.getByPlaceholder(/password/i).or(tenantPage.getByLabel(/password/i)).first();

    await tenantEmailInput.fill(tenantEmail);
    await tenantPasswordInput.fill(password);

    // Submit signup
    const tenantSubmitButton = tenantPage.getByRole('button', { name: /sign up|create account|continue/i });
    await tenantSubmitButton.click();

    // Wait for invite accept screen or auto-redirect to dashboard
    console.log('  → Waiting for invite processing...');
    await tenantPage.waitForTimeout(3000);

    // Check if we need to manually click Accept Invite
    const manualAcceptButton = tenantPage.getByRole('button', { name: /^accept invite$/i });
    if (await manualAcceptButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  → Clicking Accept Invite...');
      await manualAcceptButton.click();
      await tenantPage.waitForTimeout(2000);
    }

    // Wait for tenant dashboard with property
    console.log('  → Verifying tenant dashboard...');

    // Should see the property on the dashboard
    await expect(
      tenantPage.getByText(/e2e test property|123 test street/i)
    ).toBeVisible({ timeout: 15000 });

    // Verify property address is displayed (from address_jsonb)
    const hasAddress = await tenantPage.getByText(/123 test street|san francisco/i).isVisible();
    console.log(`  ✅ Property address visible: ${hasAddress}`);

    // Take screenshot for verification
    await tenantPage.screenshot({ path: 'test-results/tenant-dashboard-success.png' });

    console.log('\n✅ Complete E2E test passed!\n');

    await tenantContext.close();
  });
});
