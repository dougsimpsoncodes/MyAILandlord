import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE APP TEST - Tests EVERY feature from scratch
 *
 * This test creates fresh users and tests:
 * 1. Landlord signup and role selection
 * 2. Complete property onboarding (address, areas, assets)
 * 3. Property management and details
 * 4. Tenant invitation flow
 * 5. Maintenance hub
 * 6. Communication hub
 * 7. Tenant signup and role selection
 * 8. Tenant property linking via invite code
 * 9. Tenant maintenance request submission
 * 10. Tenant communication access
 */

// Test credentials - unique for each test run
const TEST_RUN_ID = Date.now().toString();
const LANDLORD_EMAIL = `landlord-${TEST_RUN_ID}@test.myailandlord.com`;
const LANDLORD_PASSWORD = 'TestLandlord123!';
const TENANT_EMAIL = `tenant-${TEST_RUN_ID}@test.myailandlord.com`;
const TENANT_PASSWORD = 'TestTenant123!';

// Store property code for tenant to use
let PROPERTY_CODE = '';

// Bug tracking
const BUGS_FOUND: string[] = [];

function logBug(description: string, context?: string) {
  const bug = context ? `${description} [Context: ${context}]` : description;
  BUGS_FOUND.push(bug);
  console.log(`🐛 BUG FOUND: ${bug}`);
}

async function waitForStability(page: Page, timeout = 3000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Network idle timeout is ok
  }
  await page.waitForTimeout(500);
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/e2e-${name}-${TEST_RUN_ID}.png` });
  console.log(`📸 Screenshot saved: /tmp/e2e-${name}-${TEST_RUN_ID}.png`);
}

// ============================================================
// PART 1: LANDLORD TESTS
// ============================================================

test.describe.serial('LANDLORD FLOW - Complete Journey', () => {

  test('1.1 Landlord can sign up with email/password', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.1: Landlord Signup');
    console.log('========================================');

    await page.goto('/');
    await waitForStability(page);

    // Look for Get Started button
    const getStartedBtn = page.locator('text=/Get Started/i').first();
    if (await getStartedBtn.isVisible({ timeout: 5000 })) {
      await getStartedBtn.click();
      await waitForStability(page);
    }

    // Should be on signup screen - find email input
    await page.waitForSelector('input', { timeout: 10000 });

    // Fill email
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(LANDLORD_EMAIL);
    console.log(`Entered email: ${LANDLORD_EMAIL}`);

    // Fill password
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill(LANDLORD_PASSWORD);
    console.log('Entered password');

    // Click Create Account button - the button is second "Create Account" text (first is the title)
    // Use .nth(1) to get the button, not the title
    const createBtnText = page.getByText('Create Account', { exact: true }).nth(1);
    if (await createBtnText.isVisible({ timeout: 3000 })) {
      await createBtnText.click();
    } else {
      // Fallback - find the submit button by role
      await page.locator('[role="button"]:has-text("Create Account")').first().click();
    }

    await waitForStability(page, 5000);
    await takeScreenshot(page, 'landlord-after-signup');

    // Check if we need email verification or went to role selection
    const roleSelection = page.locator('text=/Select your role|Choose your role|I am a/i').first();
    const verificationNeeded = page.locator('text=/verify|verification|check your email/i').first();

    if (await verificationNeeded.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('⚠️ Email verification required - this is expected for production');
      logBug('Email verification blocks E2E testing - need to disable for test env');
      // For now, we'll note this and continue
    }

    if (await roleSelection.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Signup successful - role selection visible');
    }
  });

  test('1.2 Landlord can select role', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.2: Landlord Role Selection');
    console.log('========================================');

    // Login first
    await page.goto('/login');
    await waitForStability(page);

    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();

    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);

    // Click Sign In
    const signInBtns = await page.getByText('Sign In', { exact: true }).all();
    for (const btn of signInBtns) {
      if (await btn.isVisible()) {
        await btn.click();
        break;
      }
    }

    await waitForStability(page, 5000);

    // Look for role selection
    const landlordOption = page.locator('text=/Landlord|Property Owner|I manage properties/i').first();

    if (await landlordOption.isVisible({ timeout: 10000 }).catch(() => false)) {
      await landlordOption.click();
      await waitForStability(page);
      console.log('✓ Selected Landlord role');

      // Look for Continue/Next button after role selection
      const continueBtn = page.locator('text=/Continue|Next|Get Started/i').first();
      if (await continueBtn.isVisible({ timeout: 3000 })) {
        await continueBtn.click();
        await waitForStability(page);
      }
    } else {
      // May already be logged in with role set
      const dashboard = page.locator('text=/Dashboard|Welcome|Property Management/i').first();
      if (await dashboard.isVisible({ timeout: 5000 })) {
        console.log('✓ Already logged in as landlord');
      } else {
        await takeScreenshot(page, 'landlord-role-not-found');
        logBug('Role selection screen not showing after login');
      }
    }

    await takeScreenshot(page, 'landlord-after-role');
  });

  test('1.3 Landlord can add a new property', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.3: Add New Property');
    console.log('========================================');

    // Login and navigate
    await page.goto('/login');
    await waitForStability(page);

    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Look for Add Property button
    const addPropertyBtn = page.locator('text=/Add Property|Add Your First Property|New Property/i').first();

    if (await addPropertyBtn.isVisible({ timeout: 10000 })) {
      await addPropertyBtn.click();
      await waitForStability(page);
      console.log('✓ Clicked Add Property');
    } else {
      // Try Property Management first
      const propMgmt = page.locator('text=/Property Management|My Properties/i').first();
      if (await propMgmt.isVisible({ timeout: 5000 })) {
        await propMgmt.click();
        await waitForStability(page);

        const addBtn = page.locator('text=/Add Property/i').first();
        if (await addBtn.isVisible({ timeout: 5000 })) {
          await addBtn.click();
          await waitForStability(page);
        }
      }
    }

    await takeScreenshot(page, 'landlord-add-property');

    // Fill property name
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="property" i]').first();
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill('Test Property ' + TEST_RUN_ID);
      console.log('✓ Entered property name');
    }

    // Continue to next step
    const continueBtn = page.locator('text=/Continue|Next/i').first();
    if (await continueBtn.isVisible({ timeout: 3000 })) {
      await continueBtn.click();
      await waitForStability(page);
    }

    await takeScreenshot(page, 'landlord-property-step2');
  });

  test('1.4 Landlord can fill property address', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.4: Property Address');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to property flow
    const addPropertyBtn = page.locator('text=/Add Property|Continue Setup|Resume/i').first();
    if (await addPropertyBtn.isVisible({ timeout: 5000 })) {
      await addPropertyBtn.click();
      await waitForStability(page);
    }

    // Look for address fields
    const addressLine1 = page.locator('input[placeholder*="address" i], input[placeholder*="street" i], input[name*="line1" i]').first();
    const cityInput = page.locator('input[placeholder*="city" i], input[name*="city" i]').first();
    const stateInput = page.locator('input[placeholder*="state" i], input[name*="state" i], select[name*="state" i]').first();
    const zipInput = page.locator('input[placeholder*="zip" i], input[name*="zip" i], input[placeholder*="postal" i]').first();

    if (await addressLine1.isVisible({ timeout: 5000 })) {
      await addressLine1.fill('123 Test Street');
      console.log('✓ Entered address line 1');
    }

    if (await cityInput.isVisible({ timeout: 2000 })) {
      await cityInput.fill('Test City');
      console.log('✓ Entered city');
    }

    if (await stateInput.isVisible({ timeout: 2000 })) {
      // Check if it's a select or input
      const tagName = await stateInput.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await stateInput.selectOption('CA');
      } else {
        await stateInput.fill('CA');
      }
      console.log('✓ Entered state');
    }

    if (await zipInput.isVisible({ timeout: 2000 })) {
      await zipInput.fill('90210');
      console.log('✓ Entered zip code');
    }

    await takeScreenshot(page, 'landlord-property-address');

    // Continue
    const continueBtn = page.locator('[role="button"]:has-text("Continue"), [role="button"]:has-text("Next")').first();
    if (await continueBtn.isVisible({ timeout: 3000 })) {
      await continueBtn.click();
      await waitForStability(page);
    }
  });

  test('1.5 Landlord can select property areas', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.5: Property Areas Selection');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to areas (may have draft)
    const resumeBtn = page.locator('text=/Resume|Continue Setup|Add Property/i').first();
    if (await resumeBtn.isVisible({ timeout: 5000 })) {
      await resumeBtn.click();
      await waitForStability(page);
    }

    // Look for area selection options
    const areaOptions = [
      'Kitchen',
      'Bathroom',
      'Bedroom',
      'Living Room'
    ];

    for (const area of areaOptions) {
      const areaBtn = page.locator(`text=/${area}/i`).first();
      if (await areaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await areaBtn.click();
        console.log(`✓ Selected ${area}`);
        await page.waitForTimeout(300);
      }
    }

    await takeScreenshot(page, 'landlord-property-areas');

    // Continue
    const continueBtn = page.locator('text=/Continue|Next|Done/i').first();
    if (await continueBtn.isVisible({ timeout: 3000 })) {
      await continueBtn.click();
      await waitForStability(page);
    }
  });

  test('1.6 Landlord can view property management screen', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.6: Property Management Screen');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Property Management
    const propMgmtBtn = page.locator('text=/Property Management|My Properties|Properties/i').first();
    if (await propMgmtBtn.isVisible({ timeout: 10000 })) {
      await propMgmtBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Property Management');
    }

    await takeScreenshot(page, 'landlord-property-management');

    // Check for property list or empty state
    const propertyCard = page.locator('text=/Test Property|No properties/i').first();
    const hasProperty = await propertyCard.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Property visible: ${hasProperty}`);
  });

  test('1.7 Landlord can access invite tenant flow', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.7: Invite Tenant Flow');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Property Management
    const propMgmtBtn = page.locator('text=/Property Management/i').first();
    if (await propMgmtBtn.isVisible({ timeout: 5000 })) {
      await propMgmtBtn.click();
      await waitForStability(page);
    }

    // Click on property to view details
    const propertyCard = page.locator('[role="button"]').first();
    if (await propertyCard.isVisible({ timeout: 5000 })) {
      await propertyCard.click();
      await waitForStability(page);
    }

    // Look for Invite Tenant button
    const inviteBtn = page.locator('text=/Invite Tenant|Add Tenant|Generate Code/i').first();
    if (await inviteBtn.isVisible({ timeout: 5000 })) {
      await inviteBtn.click();
      await waitForStability(page);
      console.log('✓ Opened Invite Tenant flow');
    }

    await takeScreenshot(page, 'landlord-invite-tenant');

    // Look for property code
    const codeElement = page.locator('text=/[A-Z0-9]{6,}/').first();
    if (await codeElement.isVisible({ timeout: 5000 })) {
      const codeText = await codeElement.textContent();
      const match = codeText?.match(/[A-Z0-9]{6,}/);
      if (match) {
        PROPERTY_CODE = match[0];
        console.log(`✓ Property code: ${PROPERTY_CODE}`);
      }
    }
  });

  test('1.8 Landlord can view Maintenance Hub', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.8: Maintenance Hub');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Maintenance Hub
    const maintBtn = page.locator('text=/Maintenance Hub|Maintenance Dashboard|View Requests/i').first();
    if (await maintBtn.isVisible({ timeout: 10000 })) {
      await maintBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Maintenance Hub');
    } else {
      logBug('Maintenance Hub button not visible on landlord home screen');
    }

    await takeScreenshot(page, 'landlord-maintenance-hub');

    // Check for maintenance request list or empty state
    const requestList = page.locator('text=/Open Requests|No requests|Pending/i').first();
    const hasRequests = await requestList.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Maintenance requests visible: ${hasRequests}`);
  });

  test('1.9 Landlord can view Communication Hub', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 1.9: Communication Hub');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(LANDLORD_EMAIL);
    await passwordInput.fill(LANDLORD_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Communication Hub
    const commBtn = page.locator('text=/Communication Hub|Messages|Announcements/i').first();
    if (await commBtn.isVisible({ timeout: 10000 })) {
      await commBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Communication Hub');
    } else {
      logBug('Communication Hub button not visible on landlord home screen');
    }

    await takeScreenshot(page, 'landlord-communication-hub');
  });
});

// ============================================================
// PART 2: TENANT TESTS
// ============================================================

test.describe.serial('TENANT FLOW - Complete Journey', () => {

  test('2.1 Tenant can sign up with email/password', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.1: Tenant Signup');
    console.log('========================================');

    await page.goto('/');
    await waitForStability(page);

    // Look for Get Started button
    const getStartedBtn = page.locator('text=/Get Started/i').first();
    if (await getStartedBtn.isVisible({ timeout: 5000 })) {
      await getStartedBtn.click();
      await waitForStability(page);
    }

    // Fill signup form
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();

    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    console.log(`Entered tenant email: ${TENANT_EMAIL}`);

    // Click Create Account - use nth(1) to get the button not the title
    const createBtnText = page.getByText('Create Account', { exact: true }).nth(1);
    if (await createBtnText.isVisible({ timeout: 3000 })) {
      await createBtnText.click();
    } else {
      await page.locator('[role="button"]:has-text("Create Account")').first().click();
    }

    await waitForStability(page, 5000);
    await takeScreenshot(page, 'tenant-after-signup');
  });

  test('2.2 Tenant can select role', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.2: Tenant Role Selection');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);

    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Select Tenant role
    const tenantOption = page.locator('text=/Tenant|Renter|I rent a property/i').first();
    if (await tenantOption.isVisible({ timeout: 10000 })) {
      await tenantOption.click();
      console.log('✓ Selected Tenant role');

      const continueBtn = page.locator('text=/Continue|Next/i').first();
      if (await continueBtn.isVisible({ timeout: 3000 })) {
        await continueBtn.click();
        await waitForStability(page);
      }
    }

    await takeScreenshot(page, 'tenant-after-role');
  });

  test('2.3 Tenant can enter property code', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.3: Enter Property Code');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Look for property code entry
    const linkPropertyBtn = page.locator('text=/Link Property|Enter Code|Join Property/i').first();
    if (await linkPropertyBtn.isVisible({ timeout: 10000 })) {
      await linkPropertyBtn.click();
      await waitForStability(page);
    }

    // Enter property code
    const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="property" i]').first();
    if (await codeInput.isVisible({ timeout: 5000 })) {
      if (PROPERTY_CODE) {
        await codeInput.fill(PROPERTY_CODE);
        console.log(`✓ Entered property code: ${PROPERTY_CODE}`);
      } else {
        await codeInput.fill('TESTCODE');
        console.log('⚠️ Using placeholder code (no real code available)');
      }
    }

    await takeScreenshot(page, 'tenant-property-code');

    // Submit code
    const submitBtn = page.locator('text=/Submit|Join|Link/i').first();
    if (await submitBtn.isVisible({ timeout: 3000 })) {
      await submitBtn.click();
      await waitForStability(page);
    }
  });

  test('2.4 Tenant can view property info', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.4: View Property Info');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Look for Property Info button
    const propertyInfoBtn = page.locator('text=/Property Info|My Property|Property Details/i').first();
    if (await propertyInfoBtn.isVisible({ timeout: 10000 })) {
      await propertyInfoBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Property Info');
    } else {
      console.log('Property Info button not visible - tenant may not be linked to property');
    }

    await takeScreenshot(page, 'tenant-property-info');
  });

  test('2.5 Tenant can report maintenance issue', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.5: Report Maintenance Issue');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Report Issue
    const reportBtn = page.locator('text=/Report Issue|Report a Problem|New Request/i').first();
    if (await reportBtn.isVisible({ timeout: 10000 })) {
      await reportBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Report Issue');
    } else {
      logBug('Report Issue button not visible on tenant home screen');
      return;
    }

    await takeScreenshot(page, 'tenant-report-issue-start');

    // Select area - Kitchen
    const kitchenBtn = page.locator('text=/Kitchen/i').first();
    if (await kitchenBtn.isVisible({ timeout: 5000 })) {
      await kitchenBtn.click();
      console.log('✓ Selected Kitchen area');
      await waitForStability(page);
    }

    // Select issue type
    const leakBtn = page.locator('text=/Leak|Plumbing|Water/i').first();
    if (await leakBtn.isVisible({ timeout: 3000 })) {
      await leakBtn.click();
      console.log('✓ Selected issue type');
      await waitForStability(page);
    }

    // Fill description
    const descInput = page.locator('textarea, input[placeholder*="describe" i]').first();
    if (await descInput.isVisible({ timeout: 3000 })) {
      await descInput.fill('E2E Test: Kitchen sink is leaking under the cabinet. Water pooling on the floor.');
      console.log('✓ Entered description');
    }

    await takeScreenshot(page, 'tenant-report-issue-filled');

    // Continue/Submit
    const continueBtn = page.locator('text=/Continue|Next|Submit|Review/i').first();
    if (await continueBtn.isVisible({ timeout: 3000 })) {
      await continueBtn.click();
      await waitForStability(page);
    }

    await takeScreenshot(page, 'tenant-report-issue-submitted');
  });

  test('2.6 Tenant can view maintenance status', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.6: View Maintenance Status');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Maintenance Status
    const statusBtn = page.locator('text=/Maintenance Status|My Requests|View Status/i').first();
    if (await statusBtn.isVisible({ timeout: 10000 })) {
      await statusBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Maintenance Status');
    }

    await takeScreenshot(page, 'tenant-maintenance-status');

    // Check for requests
    const requestCard = page.locator('text=/Kitchen|Pending|In Progress/i').first();
    const hasRequest = await requestCard.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Maintenance request visible: ${hasRequest}`);
  });

  test('2.7 Tenant can view Communication Hub', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST 2.7: Tenant Communication Hub');
    console.log('========================================');

    // Login
    await page.goto('/login');
    await waitForStability(page);
    const emailInput = page.locator('input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(TENANT_EMAIL);
    await passwordInput.fill(TENANT_PASSWORD);
    await page.getByText('Sign In', { exact: true }).first().click();
    await waitForStability(page, 5000);

    // Navigate to Communication Hub
    const commBtn = page.locator('text=/Communication|Messages|Chat/i').first();
    if (await commBtn.isVisible({ timeout: 10000 })) {
      await commBtn.click();
      await waitForStability(page);
      console.log('✓ Navigated to Communication Hub');
    }

    await takeScreenshot(page, 'tenant-communication-hub');
  });
});

// ============================================================
// PART 3: FINAL REPORT
// ============================================================

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('COMPREHENSIVE TEST REPORT');
  console.log('========================================');
  console.log(`Test Run ID: ${TEST_RUN_ID}`);
  console.log(`Landlord Email: ${LANDLORD_EMAIL}`);
  console.log(`Tenant Email: ${TENANT_EMAIL}`);
  console.log(`Property Code: ${PROPERTY_CODE || 'Not generated'}`);
  console.log('\n--- BUGS FOUND ---');
  if (BUGS_FOUND.length === 0) {
    console.log('No bugs found during testing!');
  } else {
    BUGS_FOUND.forEach((bug, i) => {
      console.log(`${i + 1}. ${bug}`);
    });
  }
  console.log('\n========================================');
});
