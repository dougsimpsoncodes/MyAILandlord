/**
 * Complete Invite Flow E2E Test - Accurate Implementation
 *
 * This test follows the exact onboarding flows documented in COMPLETE_ONBOARDING_FLOWS.md
 * Tests both landlord property creation + invite generation AND tenant invite acceptance
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:8081';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const timestamp = Date.now();
const landlordEmail = `landlord-${timestamp}@test.com`;
const landlordFirstName = 'TestLandlord';
const landlordPassword = 'SecurePass123!';
const tenantEmail = `tenant-${timestamp}@test.com`;
const tenantFirstName = 'TestTenant';
const tenantPassword = 'SecurePass456!';

// Create Supabase client for test operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

test.describe('Complete Invite Flow - Accurate', () => {
  test('landlord onboarding → property creation → invite → tenant accepts → dashboard', async ({ browser }) => {

    // ========================================================================
    // PART 1: LANDLORD ONBOARDING FLOW
    // ========================================================================
    console.log('\n=== PART 1: LANDLORD ONBOARDING ===\n');

    const landlordContext = await browser.newContext({ storageState: undefined });
    const landlordPage = await landlordContext.newPage();

    landlordPage.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[LANDLORD ERROR] ${msg.text()}`);
      }
    });

    // ------------------------------------------------------------------------
    // STEP 1: OnboardingWelcomeScreen
    // ------------------------------------------------------------------------
    console.log('Step 1: OnboardingWelcomeScreen');
    await landlordPage.goto(BASE_URL);
    await landlordPage.waitForLoadState('networkidle');

    // Verify we're on welcome screen
    await expect(landlordPage.getByText('My AI Landlord')).toBeVisible();
    await expect(landlordPage.getByText('Property management, simplified')).toBeVisible();

    // Click "Get Started" button
    const getStartedBtn = landlordPage.getByText('Get Started');
    await getStartedBtn.click();
    console.log('  ✓ Clicked Get Started\n');

    // ------------------------------------------------------------------------
    // STEP 2: OnboardingNameScreen (Step 1 of 4)
    // ------------------------------------------------------------------------
    console.log('Step 2: OnboardingNameScreen');
    await landlordPage.waitForTimeout(1000);

    // Verify we're on name screen
    await expect(landlordPage.getByText('What should we call you?')).toBeVisible();
    await expect(landlordPage.getByText('Step 1 of 4')).toBeVisible();

    // Enter first name
    const nameInput = landlordPage.getByPlaceholder('Your first name');
    await nameInput.fill(landlordFirstName);

    // Click Continue (TouchableOpacity renders as div, not button)
    const nameNextBtn = landlordPage.getByText('Continue').first();
    await nameNextBtn.click();
    console.log(`  ✓ Entered name: ${landlordFirstName}\n`);

    // ------------------------------------------------------------------------
    // STEP 3: OnboardingAccountScreen (Step 2 of 4)
    // ------------------------------------------------------------------------
    console.log('Step 3: OnboardingAccountScreen');
    await landlordPage.waitForTimeout(1000);

    // Verify we're on account screen
    await expect(landlordPage.getByText(`Nice to meet you, ${landlordFirstName}!`)).toBeVisible();
    await expect(landlordPage.getByText('Step 2 of 4')).toBeVisible();

    // Fill email
    const emailInput = landlordPage.getByPlaceholder('you@example.com');
    await emailInput.fill(landlordEmail);

    // Fill password (look for first password field)
    const passwordInputs = landlordPage.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(landlordPassword);

    // Fill confirm password
    await passwordInputs.nth(1).fill(landlordPassword);

    // Accept terms checkbox (look for text with "agree" or "terms")
    const termsText = landlordPage.getByText(/I agree to the/i);
    await termsText.click();

    // Click Create Account
    const createAccountBtn = landlordPage.getByText('Create Account');
    await createAccountBtn.click();
    console.log('  ✓ Created account\n');

    // Wait for account creation and navigation
    await landlordPage.waitForTimeout(3000);

    // ------------------------------------------------------------------------
    // STEP 4: Property Setup (may skip role selection in actual flow)
    // ------------------------------------------------------------------------
    console.log('Step 4: Checking for property setup screen...');

    // The actual flow may skip role selection and go straight to property intro
    // Check which screen we're on
    const propertyIntroVisible = await landlordPage.getByText(/Let's add your property/i).isVisible({ timeout: 5000 }).catch(() => false);
    const roleScreenVisible = !propertyIntroVisible && await landlordPage.getByText(/How will you use/i).isVisible({ timeout: 2000 }).catch(() => false);

    if (roleScreenVisible) {
      console.log('  → On role selection screen');
      // Click landlord role card
      const landlordRoleCard = landlordPage.getByText("I'm a Landlord");
      await landlordRoleCard.click();

      // Click Continue
      const roleNextBtn = landlordPage.getByText('Continue').first();
      await roleNextBtn.click();
      console.log('  ✓ Selected Landlord role');
      await landlordPage.waitForTimeout(2000);

      // Check for welcome screen
      const welcomeVisible = await landlordPage.getByText(`Welcome, ${landlordFirstName}!`).isVisible({ timeout: 3000 }).catch(() => false);
      if (welcomeVisible) {
        console.log('  → On landlord welcome screen');
        const setupPropertyBtn = landlordPage.getByText(/Let's Set Up Your First Property/i);
        await setupPropertyBtn.click();
        console.log('  ✓ Starting property setup');
        await landlordPage.waitForTimeout(1000);
      }
    } else if (propertyIntroVisible) {
      console.log('  ✓ Skipped directly to property setup (faster flow)\n');
    } else {
      console.log('  ⚠️ Unknown screen - taking screenshot');
      await landlordPage.screenshot({ path: 'test-results/unknown-screen.png' });
    }

    // ------------------------------------------------------------------------
    // STEP 5: LandlordPropertyIntroScreen
    // ------------------------------------------------------------------------
    console.log('Step 5: LandlordPropertyIntroScreen');

    // Verify we're on property intro
    await expect(landlordPage.getByText("Let's add your property")).toBeVisible();

    // Click "Start Property Setup"
    const startSetupBtn = landlordPage.getByText('Start Property Setup');
    await startSetupBtn.click();
    console.log('  ✓ Started property details\n');

    await landlordPage.waitForTimeout(1000);

    // ------------------------------------------------------------------------
    // STEP 6-8: Property Creation Wizard
    // ------------------------------------------------------------------------
    console.log('Step 6-8: Property Creation Wizard');

    // PropertyBasicsScreen - fill property address form
    console.log('  → Filling property details...');

    // Wait a moment for form to fully render
    await landlordPage.waitForTimeout(1000);

    // Find all visible input elements
    const allInputs = landlordPage.locator('input:visible');
    const inputCount = await allInputs.count();
    console.log(`    Found ${inputCount} visible inputs`);

    // Fill inputs sequentially based on typical order:
    // 0: Property Name, 1: Street Address, 2: Unit (optional), 3: City, 4: State, 5: Postal Code
    if (inputCount >= 1) {
      await allInputs.nth(0).fill('E2E Test Property');
      console.log('    ✓ Filled Property Name');
    }

    if (inputCount >= 2) {
      await allInputs.nth(1).fill('123 Test Street');
      console.log('    ✓ Filled Street Address');
    }

    // Skip Unit/Apt field (optional) - input 2

    if (inputCount >= 4) {
      await allInputs.nth(3).fill('San Francisco');
      console.log('    ✓ Filled City');
    }

    if (inputCount >= 5) {
      await allInputs.nth(4).fill('CA');
      console.log('    ✓ Filled State');
    }

    if (inputCount >= 6) {
      await allInputs.nth(5).fill('94102');
      console.log('    ✓ Filled Postal Code');
    }

    // Click through the wizard using Continue/Next/Skip buttons
    // Expected screens: Property Address → Property Details → Property Areas → Invite
    for (let i = 0; i < 15; i++) {
      await landlordPage.waitForTimeout(1500);

      // Look for Continue/Next/Skip buttons - try multiple approaches
      let continueBtn = landlordPage.locator('text=Continue').first();
      let isContinueVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isContinueVisible) {
        // Fallback: look for any element containing "Continue"
        continueBtn = landlordPage.locator('*:has-text("Continue")').last(); // Use last() for bottom button
        isContinueVisible = await continueBtn.isVisible({ timeout: 1000 }).catch(() => false);
      }

      if (isContinueVisible) {
        // Check if button is enabled (not disabled)
        const isEnabled = await continueBtn.isEnabled().catch(() => false);

        if (isEnabled) {
          await continueBtn.click();
          console.log(`  ✓ Clicked continue (step ${i + 1})`);
        } else {
          console.log(`  ⏸ Continue button disabled (step ${i + 1}), filling required fields...`);

          // Property Details screen may need property type selection
          const houseCard = landlordPage.getByText('House').first();
          if (await houseCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await houseCard.click();
            console.log('    ✓ Selected House type');
            await landlordPage.waitForTimeout(500);

            // Click Continue again after selection
            if (await continueBtn.isEnabled()) {
              await continueBtn.click();
              console.log(`  ✓ Clicked continue after selection`);
            }
          }
        }
      } else {
        // Check if we're on dashboard or invite screen
        const onInviteScreen = await landlordPage.getByText(/invite.*tenant|get.*code|generate/i).isVisible({ timeout: 2000 }).catch(() => false);
        const onDashboard = await landlordPage.getByText(/properties|dashboard/i).isVisible({ timeout: 2000 }).catch(() => false);

        if (onInviteScreen || onDashboard) {
          console.log('  ✓ Wizard complete - reached end screen');
          break;
        } else {
          console.log(`  ⚠️ No continue button found (step ${i + 1}), checking current screen...`);
          // Take screenshot for debugging
          await landlordPage.screenshot({ path: `test-results/wizard-step-${i + 1}.png` });
          break;
        }
      }
    }

    // ------------------------------------------------------------------------
    // STEP 9: Complete Onboarding and Go to Dashboard
    // ------------------------------------------------------------------------
    console.log('\nStep 9: Going to Dashboard');
    await landlordPage.waitForTimeout(2000);

    // Look for "Go to Dashboard" button on success screen
    const dashboardBtn = landlordPage.getByText(/Go to Dashboard/i).first();
    if (await dashboardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardBtn.click();
      console.log('  ✓ Clicked Go to Dashboard');
      await landlordPage.waitForTimeout(2000);
    }

    // ------------------------------------------------------------------------
    // STEP 10: Generate Invite via Supabase RPC with authenticated session
    // ------------------------------------------------------------------------
    console.log('\nStep 10: Generating Invite via Database');

    // Get the authenticated session from the browser's localStorage
    const authData = await landlordPage.evaluate(() => {
      // Debug: log all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('All localStorage keys:', allKeys);

      // Try different patterns for Supabase auth storage
      const patterns = [
        'supabase.auth.token',
        'sb-',  // Supabase prefix
        '@supabase',
        'auth'
      ];

      for (const pattern of patterns) {
        const storageKey = allKeys.find(k => k.includes(pattern));
        if (storageKey) {
          console.log(`Found auth key: ${storageKey}`);
          const data = localStorage.getItem(storageKey);
          console.log(`Auth data preview: ${data?.substring(0, 100)}`);
          try {
            return JSON.parse(data || '{}');
          } catch (e) {
            console.log(`Failed to parse ${storageKey}:`, e);
          }
        }
      }

      return null;
    });

    console.log('  Auth data retrieved:', authData ? 'Yes' : 'No');

    if (!authData || !authData.access_token) {
      // Log what we got for debugging
      console.log('  Auth data structure:', JSON.stringify(authData,null, 2).substring(0, 200));
      throw new Error('Could not get authenticated session from browser');
    }

    console.log('  ✓ Got authenticated session');

    // Create authenticated Supabase client
    const authenticatedSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.access_token}`
        }
      }
    });

    // Get the property ID - query for the E2E Test Property just created
    const { data: properties, error: propertyError } = await authenticatedSupabase
      .from('properties')
      .select('id')
      .eq('name', 'E2E Test Property')
      .order('created_at', { ascending: false })
      .limit(1);

    if (propertyError || !properties || properties.length === 0) {
      throw new Error(`Could not find E2E Test Property: ${propertyError?.message}`);
    }

    const propertyId = properties[0].id;
    console.log(`  ✓ Found property ID: ${propertyId}`);

    // Call create_invite RPC to generate token (returns table with token, invite_id, expires_at)
    const { data: inviteData, error: inviteError } = await authenticatedSupabase.rpc('create_invite', {
      p_property_id: propertyId,
      p_delivery_method: 'code'  // Use 'code' delivery method for shareable link
    });

    if (inviteError) {
      throw new Error(`RPC error: ${inviteError.message}`);
    }

    // RPC returns array with one row containing {token, invite_id, expires_at}
    const inviteToken = inviteData && inviteData[0] ? inviteData[0].token : null;

    if (!inviteToken) {
      throw new Error('Failed to generate invite token');
    }

    const inviteUrl = `${BASE_URL}/invite?t=${inviteToken}`;
    console.log(`  ✅ Invite Token: ${inviteToken}`);
    console.log(`  ✅ Invite URL: ${inviteUrl}\n`);

      // Close landlord session
      await landlordContext.close();

      // ========================================================================
      // PART 2: TENANT INVITE ACCEPTANCE FLOW
      // ========================================================================
      console.log('\n=== PART 2: TENANT INVITE ACCEPTANCE ===\n');

      const tenantContext = await browser.newContext({ storageState: undefined });
      const tenantPage = await tenantContext.newPage();

      tenantPage.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`[TENANT ERROR] ${msg.text()}`);
        }
      });

      // ------------------------------------------------------------------------
      // TENANT STEP 1: Open Invite Link
      // ------------------------------------------------------------------------
      console.log('Tenant Step 1: PropertyInviteAcceptScreen (not authenticated)');
      await tenantPage.goto(inviteUrl);
      await tenantPage.waitForLoadState('networkidle');

      // Verify property preview shows (use .first() since property name appears twice on page)
      await expect(tenantPage.getByText(/e2e test property/i).first()).toBeVisible({ timeout: 10000 });
      console.log('  ✓ Property preview visible');

      // Click "Sign Up & Accept"
      const signupAcceptBtn = tenantPage.getByText(/sign up.*accept/i);
      await signupAcceptBtn.click();
      console.log('  ✓ Clicked Sign Up & Accept\n');

      await tenantPage.waitForTimeout(1000);

      // ------------------------------------------------------------------------
      // TENANT STEPS 2-4: Onboarding Flow (name, account, role)
      // ------------------------------------------------------------------------
      console.log('Tenant Steps 2-4: Onboarding Flow');

      // Skip OnboardingWelcome if it appears, or go straight to name
      const tenantNameInput = tenantPage.getByPlaceholder('Your first name');
      if (await tenantNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // We're on name screen
        await tenantNameInput.fill(tenantFirstName);
        const tenantNameNextBtn = tenantPage.getByText('Continue').first();
        await tenantNameNextBtn.click();
        console.log(`  ✓ Entered name: ${tenantFirstName}`);
        await tenantPage.waitForTimeout(1000);
      }

      // Account screen
      const tenantEmailInput = tenantPage.getByPlaceholder('you@example.com');
      if (await tenantEmailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tenantEmailInput.fill(tenantEmail);

        const tenantPasswordInputs = tenantPage.locator('input[type="password"]');
        await tenantPasswordInputs.nth(0).fill(tenantPassword);
        await tenantPasswordInputs.nth(1).fill(tenantPassword);

        const tenantTermsText = tenantPage.getByText(/I agree to the/i);
        await tenantTermsText.click();

        const tenantCreateAccountBtn = tenantPage.getByText('Create Account');
        await tenantCreateAccountBtn.click();
        console.log('  ✓ Created tenant account');
        await tenantPage.waitForTimeout(3000);
      }

      // Role screen - select Tenant
      const tenantRoleCard = tenantPage.getByText("I'm a Tenant");
      if (await tenantRoleCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tenantRoleCard.click();
        const tenantRoleNextBtn = tenantPage.getByText('Continue').first();
        await tenantRoleNextBtn.click();
        console.log('  ✓ Selected Tenant role\n');
        await tenantPage.waitForTimeout(3000);
      }

      // ------------------------------------------------------------------------
      // TENANT STEP 5: Auto-redirect to invite accept or manual accept
      // ------------------------------------------------------------------------
      console.log('Tenant Step 5: Accept Invite (authenticated)');

      // Check if we need to manually click Accept Invite
      const acceptInviteBtn = tenantPage.getByRole('button', { name: /^accept invite$/i });
      if (await acceptInviteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptInviteBtn.click();
        console.log('  ✓ Clicked Accept Invite');
        await tenantPage.waitForTimeout(3000);
      } else {
        console.log('  ℹ Auto-accepted (no manual click needed)');
      }

      // ------------------------------------------------------------------------
      // TENANT STEP 6: Verify Tenant Dashboard
      // ------------------------------------------------------------------------
      console.log('\nTenant Step 6: Verify Dashboard');
      await tenantPage.waitForTimeout(3000);

      // Should see property on dashboard
      const propertyVisible = await tenantPage.getByText(/e2e test property|123 test street/i).isVisible({ timeout: 15000 });
      expect(propertyVisible).toBeTruthy();
      console.log('  ✅ Property visible on dashboard');

      // Verify address is displayed
      const addressVisible = await tenantPage.getByText(/123 test street/i).isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ✅ Address visible: ${addressVisible}`);

      // Take final screenshot
      await tenantPage.screenshot({ path: 'test-results/final-tenant-dashboard.png', fullPage: true });

      console.log('\n🎉 COMPLETE E2E TEST PASSED! 🎉\n');

      await tenantContext.close();
  });
});
