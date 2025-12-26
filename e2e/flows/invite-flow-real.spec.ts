/**
 * Real Invite Flow E2E Test
 * Tests the complete flow exactly as a user would experience it
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8081';
const timestamp = Date.now();
const landlordEmail = `landlord-${timestamp}@test.com`;
const tenantEmail = `tenant-${timestamp}@test.com`;
const password = 'Test1234!';

test.describe('Real Invite Flow - Browser Testing', () => {
  test('complete invite flow from landlord signup to tenant dashboard', async ({ browser }) => {

    // ==================================================================
    // STEP 1: LANDLORD SIGNUP
    // ==================================================================
    console.log('\n📝 STEP 1: Landlord Signup');

    const landlordContext = await browser.newContext({ storageState: undefined });
    const landlordPage = await landlordContext.newPage();

    // Enable console logging
    landlordPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('ERROR')) {
        console.log(`  [LANDLORD ERROR] ${msg.text()}`);
      }
    });

    await landlordPage.goto(BASE_URL);
    await landlordPage.waitForLoadState('networkidle');
    console.log('  → Loaded welcome screen');

    // Take screenshot of welcome screen
    await landlordPage.screenshot({ path: 'test-results/01-welcome-screen.png' });

    // Click "Get Started" - it's a TouchableOpacity, not a button
    const getStarted = landlordPage.getByText('Get Started');
    await expect(getStarted).toBeVisible({ timeout: 10000 });
    await getStarted.click();
    console.log('  → Clicked Get Started');

    // Wait for Auth screen to load
    await landlordPage.waitForTimeout(1000);
    await landlordPage.screenshot({ path: 'test-results/02-auth-screen.png' });

    // The screen should default to signup mode (or we need to click Sign Up tab)
    const signupTab = landlordPage.getByText('Sign Up');
    if (await signupTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signupTab.click();
      console.log('  → Clicked Sign Up tab');
    }

    // Fill email and password using testIDs
    console.log('  → Filling signup form');
    const emailInput = landlordPage.getByTestId('auth-email');
    const passwordInput = landlordPage.getByTestId('auth-password');

    await emailInput.fill(landlordEmail);
    await passwordInput.fill(password);

    await landlordPage.screenshot({ path: 'test-results/03-signup-filled.png' });

    // Click Create Account
    const submitButton = landlordPage.getByTestId('auth-submit');
    await submitButton.click();
    console.log('  → Submitted signup');

    // Wait for successful signup and navigation
    await landlordPage.waitForTimeout(3000);
    await landlordPage.screenshot({ path: 'test-results/04-after-signup.png' });

    // User should now be at role selection or onboarding
    console.log('  → Waiting for role selection or onboarding screen');

    // ==================================================================
    // STEP 2: SELECT LANDLORD ROLE
    // ==================================================================
    console.log('\n🏠 STEP 2: Select Landlord Role');

    // Look for role selection (could be buttons or text)
    const landlordRoleButton = landlordPage.getByText(/landlord/i).first();
    if (await landlordRoleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await landlordRoleButton.click();
      console.log('  → Selected Landlord role');
      await landlordPage.waitForTimeout(1000);
      await landlordPage.screenshot({ path: 'test-results/05-role-selected.png' });
    } else {
      console.log('  → No role selection found, may have auto-selected');
    }

    // ==================================================================
    // STEP 3: CREATE PROPERTY
    // ==================================================================
    console.log('\n🏢 STEP 3: Create Property');

    // Wait for property onboarding screen
    await expect(
      landlordPage.getByText(/add your property|property details|let's add/i)
    ).toBeVisible({ timeout: 10000 });
    console.log('  → Property onboarding screen loaded');

    await landlordPage.screenshot({ path: 'test-results/06-property-onboarding.png' });

    // Fill property form - find inputs by placeholder or label
    console.log('  → Filling property details');

    // Try different selectors for property name
    const nameInput = landlordPage.locator('input').filter({ hasText: /property name|name/i }).first()
      .or(landlordPage.getByPlaceholder(/property name|name/i))
      .or(landlordPage.getByLabel(/property name/i));

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Property');
    } else {
      // Fallback: fill the first visible text input
      const firstInput = landlordPage.locator('input[type="text"]').first();
      await firstInput.fill('E2E Test Property');
    }

    await landlordPage.waitForTimeout(500);

    // Try to fill address
    const addressInputs = landlordPage.locator('input[type="text"]');
    const count = await addressInputs.count();

    if (count >= 2) {
      await addressInputs.nth(1).fill('123 Test Street');
    }

    if (count >= 3) {
      await addressInputs.nth(2).fill('San Francisco');
    }

    if (count >= 4) {
      await addressInputs.nth(3).fill('CA');
    }

    if (count >= 5) {
      await addressInputs.nth(4).fill('94102');
    }

    await landlordPage.screenshot({ path: 'test-results/07-property-filled.png' });

    // Click continue/next buttons until we reach dashboard or invite screen
    console.log('  → Navigating through property wizard');

    for (let i = 0; i < 10; i++) {
      await landlordPage.waitForTimeout(1000);

      const continueBtn = landlordPage.getByRole('button', { name: /continue|next|save|finish|done|skip/i });

      if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueBtn.click();
        console.log(`    → Clicked continue (step ${i + 1})`);
        await landlordPage.waitForTimeout(1000);
      } else {
        console.log('    → No more continue buttons, wizard complete');
        break;
      }
    }

    await landlordPage.screenshot({ path: 'test-results/08-wizard-complete.png' });

    // ==================================================================
    // STEP 4: GENERATE INVITE
    // ==================================================================
    console.log('\n✉️ STEP 4: Generate Invite');

    // Wait for dashboard or property screen
    await landlordPage.waitForTimeout(2000);

    // Look for the property we just created
    const propertyCard = landlordPage.getByText(/e2e test property/i);
    if (await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await propertyCard.click();
      console.log('  → Opened property details');
      await landlordPage.waitForTimeout(1000);
    }

    await landlordPage.screenshot({ path: 'test-results/09-property-view.png' });

    // Find Invite Tenant button
    const inviteBtn = landlordPage.getByRole('button', { name: /invite tenant|invite|add tenant/i });
    await expect(inviteBtn).toBeVisible({ timeout: 10000 });
    await inviteBtn.click();
    console.log('  → Clicked Invite Tenant');
    await landlordPage.waitForTimeout(1000);

    await landlordPage.screenshot({ path: 'test-results/10-invite-screen.png' });

    // Generate code
    const generateBtn = landlordPage.getByRole('button', { name: /generate|get.*code|create.*invite/i });
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click();
    console.log('  → Clicked Generate Code');
    await landlordPage.waitForTimeout(2000);

    await landlordPage.screenshot({ path: 'test-results/11-code-generated.png' });

    // Extract invite URL
    const pageText = await landlordPage.textContent('body');
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

    await landlordContext.close();

    // ==================================================================
    // STEP 5: TENANT ACCEPTS INVITE
    // ==================================================================
    console.log('\n👤 STEP 5: Tenant Accepts Invite');

    const tenantContext = await browser.newContext({ storageState: undefined });
    const tenantPage = await tenantContext.newPage();

    tenantPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('ERROR')) {
        console.log(`  [TENANT ERROR] ${msg.text()}`);
      }
    });

    await tenantPage.goto(inviteUrl);
    await tenantPage.waitForLoadState('networkidle');
    console.log('  → Opened invite link');

    await tenantPage.screenshot({ path: 'test-results/12-invite-preview.png' });

    // Verify property preview shows
    await expect(
      tenantPage.getByText(/e2e test property/i)
    ).toBeVisible({ timeout: 10000 });
    console.log('  → Property preview visible');

    // Click Sign Up & Accept
    const acceptBtn = tenantPage.getByText(/sign up.*accept|accept.*sign up/i);
    await expect(acceptBtn).toBeVisible({ timeout: 5000 });
    await acceptBtn.click();
    console.log('  → Clicked Sign Up & Accept');
    await tenantPage.waitForTimeout(1000);

    await tenantPage.screenshot({ path: 'test-results/13-signup-form.png' });

    // Fill tenant signup
    const tenantEmailInput = tenantPage.getByTestId('auth-email');
    const tenantPasswordInput = tenantPage.getByTestId('auth-password');

    await tenantEmailInput.fill(tenantEmail);
    await tenantPasswordInput.fill(password);

    const tenantSubmitBtn = tenantPage.getByTestId('auth-submit');
    await tenantSubmitBtn.click();
    console.log('  → Submitted tenant signup');

    // Wait for processing
    await tenantPage.waitForTimeout(5000);

    await tenantPage.screenshot({ path: 'test-results/14-after-tenant-signup.png' });

    // Check if manual Accept Invite click is needed
    const manualAcceptBtn = tenantPage.getByText(/^accept invite$/i);
    if (await manualAcceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  → Clicking Accept Invite');
      await manualAcceptBtn.click();
      await tenantPage.waitForTimeout(3000);
    }

    await tenantPage.screenshot({ path: 'test-results/15-final-state.png' });

    // ==================================================================
    // STEP 6: VERIFY TENANT DASHBOARD
    // ==================================================================
    console.log('\n✅ STEP 6: Verify Tenant Dashboard');

    // Tenant should see property on dashboard
    await expect(
      tenantPage.getByText(/e2e test property|123 test street/i)
    ).toBeVisible({ timeout: 15000 });
    console.log('  ✅ Property visible on tenant dashboard');

    // Verify address is displayed (from address_jsonb)
    const hasAddress = await tenantPage.getByText(/123 test street|san francisco/i).isVisible();
    console.log(`  ✅ Property address visible: ${hasAddress}`);

    await tenantPage.screenshot({ path: 'test-results/16-tenant-dashboard-success.png' });

    console.log('\n🎉 Complete E2E test PASSED!\n');

    await tenantContext.close();
  });
});
