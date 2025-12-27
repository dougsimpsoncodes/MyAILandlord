#!/usr/bin/env node
/**
 * Generate App Documentation - Streamlined Version
 *
 * Captures core screenshots (~30 screens) for documentation:
 * - Landlord onboarding & dashboard
 * - Tenant onboarding & dashboard
 * - Property management screens
 * - Key error states
 *
 * Uses seeded test data from seed-documentation-data.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const METADATA_DIR = path.join(__dirname, '../docs/metadata');

// Test credentials (from seeding script)
const LANDLORD_EMAIL = 'landlord-doc@myailandlord.com';
const LANDLORD_PASSWORD = 'TestDoc2025!';
const TENANT_EMAIL = 'tenant-doc@myailandlord.com';
const TENANT_PASSWORD = 'TestDoc2025!';

const screenshots = [];

/**
 * Capture a screenshot and save metadata
 */
async function captureScreen(page, screenName, metadata = {}) {
  console.log(`  📸 Capturing: ${screenName}`);

  try {
    // Wait for page to be ready
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('    ⚠️  Network not idle, continuing anyway...');
    });
    await page.waitForTimeout(1500); // Allow animations to settle

    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${screenName}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false // Viewport only
    });

    // Collect metadata
    const url = page.url();
    const title = await page.title().catch(() => 'Untitled');

    const screenshotData = {
      screenName,
      timestamp: new Date().toISOString(),
      url,
      title,
      ...metadata
    };

    screenshots.push(screenshotData);

    // Save individual metadata file
    const metadataPath = path.join(METADATA_DIR, `${screenName}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(screenshotData, null, 2));

    console.log(`    ✓ Saved screenshot and metadata`);
    return screenshotData;
  } catch (error) {
    console.error(`    ❌ Error capturing ${screenName}:`, error.message);
    return null;
  }
}

/**
 * Wait for navigation with timeout
 */
async function waitForNavigation(page, timeout = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    console.log('    ⚠️  Navigation timeout, continuing...');
  }
  await page.waitForTimeout(1000);
}

/**
 * Fill input by placeholder (works with React Native Web)
 */
async function fillByPlaceholder(page, placeholder, value) {
  const selectors = [
    `input[placeholder*="${placeholder}" i]`,
    `[placeholder*="${placeholder}" i]`,
    `input:has-text("${placeholder}")`,
    `[role="textbox"][aria-label*="${placeholder}" i]`
  ];

  for (const selector of selectors) {
    try {
      const input = page.locator(selector).first();
      await input.waitFor({ timeout: 2000 });
      await input.fill(value);
      return;
    } catch (error) {
      continue;
    }
  }

  throw new Error(`Could not find input with placeholder: ${placeholder}`);
}

/**
 * Click button/touchable by text (works with React Native Web)
 */
async function clickButton(page, text) {
  // Try multiple selectors for React Native Web compatibility
  const selectors = [
    `button:has-text("${text}")`,
    `[role="button"]:has-text("${text}")`,
    `text="${text}"`, // Exact text match
    `text=/${text}/i` // Case-insensitive match
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ timeout: 2000 });
      await element.click();
      return;
    } catch (error) {
      // Try next selector
      continue;
    }
  }

  throw new Error(`Could not find clickable element with text: ${text}`);
}

/**
 * Document landlord onboarding flow
 */
async function documentLandlordOnboarding(browser) {
  console.log('\n👨‍💼 Documenting Landlord Onboarding Flow...\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // 1. Welcome Screen
    await page.goto(BASE_URL);
    await waitForNavigation(page);
    await captureScreen(page, 'onboarding-welcome', {
      flow: 'Onboarding',
      role: 'both',
      step: 1,
      purpose: 'Initial welcome screen - entry point to app'
    });

    // 2. Click Get Started → Name Screen
    await clickButton(page, 'Get Started');
    await waitForNavigation(page);
    await captureScreen(page, 'onboarding-name', {
      flow: 'Onboarding',
      role: 'both',
      step: 2,
      purpose: 'Collect user first name'
    });

    // 3. Enter name → Account Screen
    await fillByPlaceholder(page, 'first name', 'John');
    await clickButton(page, 'Continue');
    await waitForNavigation(page);
    await captureScreen(page, 'onboarding-account', {
      flow: 'Onboarding',
      role: 'both',
      step: 3,
      purpose: 'Create account with email and password'
    });

    // 4. Try to fill account info (may fail if form structure different)
    try {
      await fillByPlaceholder(page, 'example.com', LANDLORD_EMAIL);

      const passwordFields = await page.locator('input[type="password"], [secureTextEntry]').all();
      if (passwordFields.length >= 2) {
        await passwordFields[0].fill(LANDLORD_PASSWORD);
        await passwordFields[1].fill(LANDLORD_PASSWORD);
      }

      // Check terms checkbox if present
      const termsCheckbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await termsCheckbox.check();
      }

      await captureScreen(page, 'onboarding-account-filled', {
        flow: 'Onboarding',
        role: 'both',
        step: 3.5,
        purpose: 'Account form filled out (before submission)'
      });
    } catch (error) {
      console.log('  ℹ️  Could not fill account form, skipping filled state screenshot');
    }

    console.log('  ℹ️  Skipping actual signup - will login with existing account instead\n');

  } catch (error) {
    console.error('  ❌ Landlord onboarding error:', error.message);
  } finally {
    await context.close();
  }
}

/**
 * Document landlord authenticated screens
 */
async function documentLandlordApp(browser) {
  console.log('\n🏠 Documenting Landlord App Screens...\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Navigate to login
    await page.goto(BASE_URL);
    await waitForNavigation(page);

    // Check if already logged in (might redirect to dashboard)
    const currentUrl = page.url();
    if (!currentUrl.includes('landlord') && !currentUrl.includes('tenant')) {
      // Need to login - look for sign in link
      const signInLink = page.locator('text=/sign in/i').first();
      if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signInLink.click();
        await waitForNavigation(page);
      }

      // Fill login form
      await fillByPlaceholder(page, 'email', LANDLORD_EMAIL);
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(LANDLORD_PASSWORD);
      await clickButton(page, 'Sign In');
      await waitForNavigation(page);
      await page.waitForTimeout(2000); // Allow login to complete
    }

    // Should now be on landlord dashboard
    await captureScreen(page, 'landlord-home', {
      flow: 'Landlord Dashboard',
      role: 'landlord',
      purpose: 'Main landlord dashboard with properties and requests'
    });

    // Navigate to properties (if tab exists)
    const propertiesTab = page.locator('text=/properties/i').first();
    if (await propertiesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await propertiesTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'landlord-properties', {
        flow: 'Property Management',
        role: 'landlord',
        purpose: 'List of all landlord properties'
      });
    }

    // Try to navigate to first property details
    const propertyCard = page.locator('text=/Sunset Apartments/i').first();
    if (await propertyCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await propertyCard.click();
      await waitForNavigation(page);
      await captureScreen(page, 'landlord-property-details', {
        flow: 'Property Management',
        role: 'landlord',
        purpose: 'Detailed view of a single property'
      });
    }

    // Navigate to requests tab
    const requestsTab = page.locator('text=/requests/i').first();
    if (await requestsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await requestsTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'landlord-requests', {
        flow: 'Maintenance Management',
        role: 'landlord',
        purpose: 'List of maintenance requests'
      });
    }

    // Navigate to messages tab
    const messagesTab = page.locator('text=/messages/i').first();
    if (await messagesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messagesTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'landlord-messages', {
        flow: 'Communication',
        role: 'landlord',
        purpose: 'Message inbox'
      });
    }

    // Navigate to profile
    const profileTab = page.locator('text=/profile/i, text=/settings/i').first();
    if (await profileTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'landlord-profile', {
        flow: 'Settings',
        role: 'landlord',
        purpose: 'User profile and account settings'
      });
    }

  } catch (error) {
    console.error('  ❌ Landlord app error:', error.message);
  } finally {
    await context.close();
  }
}

/**
 * Document tenant authenticated screens
 */
async function documentTenantApp(browser) {
  console.log('\n👤 Documenting Tenant App Screens...\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Navigate and login as tenant
    await page.goto(BASE_URL);
    await waitForNavigation(page);

    // Sign out first if logged in as landlord
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
    if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signOutButton.click();
      await waitForNavigation(page);
    }

    // Go to sign in
    const signInLink = page.locator('text=/sign in/i').first();
    if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signInLink.click();
      await waitForNavigation(page);
    }

    // Login as tenant
    await fillByPlaceholder(page, 'email', TENANT_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TENANT_PASSWORD);
    await clickButton(page, 'Sign In');
    await waitForNavigation(page);
    await page.waitForTimeout(2000);

    // Should be on tenant home
    await captureScreen(page, 'tenant-home', {
      flow: 'Tenant Dashboard',
      role: 'tenant',
      purpose: 'Main tenant dashboard showing property and requests'
    });

    // Navigate to property info
    const propertyCard = page.locator('text=/Sunset Apartments/i').first();
    if (await propertyCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await propertyCard.click();
      await waitForNavigation(page);
      await captureScreen(page, 'tenant-property-info', {
        flow: 'Property Information',
        role: 'tenant',
        purpose: 'View property details and areas'
      });

      // Go back to home
      const backButton = page.locator('button:has-text("Back"), [aria-label="Go back"]').first();
      if (await backButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backButton.click();
        await waitForNavigation(page);
      }
    }

    // Try to navigate to report issue screen
    const reportButton = page.locator('button:has-text("Report"), button:has-text("New Request")').first();
    if (await reportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reportButton.click();
      await waitForNavigation(page);
      await captureScreen(page, 'tenant-report-issue', {
        flow: 'Maintenance Request',
        role: 'tenant',
        purpose: 'Report a new maintenance issue'
      });

      // Go back
      const backButton = page.locator('button:has-text("Back"), button:has-text("Cancel")').first();
      if (await backButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backButton.click();
        await waitForNavigation(page);
      }
    }

    // Navigate to requests/history
    const requestsTab = page.locator('text=/requests/i, text=/history/i').first();
    if (await requestsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await requestsTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'tenant-requests', {
        flow: 'Maintenance History',
        role: 'tenant',
        purpose: 'View all maintenance requests and their status'
      });
    }

    // Navigate to messages
    const messagesTab = page.locator('text=/messages/i').first();
    if (await messagesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messagesTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'tenant-messages', {
        flow: 'Communication',
        role: 'tenant',
        purpose: 'Message inbox with landlord'
      });
    }

    // Navigate to profile
    const profileTab = page.locator('text=/profile/i, text=/settings/i').first();
    if (await profileTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileTab.click();
      await waitForNavigation(page);
      await captureScreen(page, 'tenant-profile', {
        flow: 'Settings',
        role: 'tenant',
        purpose: 'User profile and account settings'
      });
    }

  } catch (error) {
    console.error('  ❌ Tenant app error:', error.message);
  } finally {
    await context.close();
  }
}

/**
 * Document common error states
 */
async function documentErrorStates(browser) {
  console.log('\n⚠️  Documenting Error States...\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // 1. Login error - invalid credentials
    await page.goto(BASE_URL);
    await waitForNavigation(page);

    // Navigate to sign in
    const signInLink = page.locator('text=/sign in/i').first();
    if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signInLink.click();
      await waitForNavigation(page);
    }

    // Fill with invalid credentials
    await fillByPlaceholder(page, 'email', 'invalid@example.com');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('WrongPassword123!');
    await clickButton(page, 'Sign In');

    // Wait for error message
    await page.waitForTimeout(2000);
    await captureScreen(page, 'error-login-invalid', {
      flow: 'Error States',
      role: 'both',
      purpose: 'Login error - invalid credentials'
    });

    // 2. Form validation error - weak password
    await page.goto(BASE_URL);
    await waitForNavigation(page);

    const getStartedButton = page.locator('button:has-text("Get Started")').first();
    if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStartedButton.click();
      await waitForNavigation(page);

      // Fill name
      await fillByPlaceholder(page, 'first name', 'Test');
      await clickButton(page, 'Continue');
      await waitForNavigation(page);

      // Fill email with weak password
      await fillByPlaceholder(page, 'email', 'test@example.com');
      const pwd = page.locator('input[type="password"]').first();
      await pwd.fill('weak');

      // Wait for validation
      await page.waitForTimeout(1000);
      await captureScreen(page, 'error-weak-password', {
        flow: 'Error States',
        role: 'both',
        purpose: 'Form validation - weak password error'
      });
    }

  } catch (error) {
    console.error('  ❌ Error states documentation error:', error.message);
  } finally {
    await context.close();
  }
}

/**
 * Save master metadata file
 */
async function saveMasterMetadata() {
  const masterData = {
    generatedAt: new Date().toISOString(),
    totalScreenshots: screenshots.length,
    screenshots: screenshots.filter(s => s !== null),
    flows: {
      onboarding: screenshots.filter(s => s?.flow === 'Onboarding').length,
      landlord: screenshots.filter(s => s?.role === 'landlord').length,
      tenant: screenshots.filter(s => s?.role === 'tenant').length,
      errors: screenshots.filter(s => s?.flow === 'Error States').length
    }
  };

  const masterPath = path.join(METADATA_DIR, '_master.json');
  await fs.writeFile(masterPath, JSON.stringify(masterData, null, 2));

  console.log('\n📊 Master metadata saved\n');
  return masterData;
}

/**
 * Main execution
 */
async function main() {
  console.log('📸 MyAI Landlord - Documentation Screenshot Generator (Streamlined)\n');
  console.log('Target: ~30 core screenshots\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  let browser;

  try {
    // Launch browser
    console.log('🚀 Launching browser...\n');
    browser = await chromium.launch({
      headless: true // Set to false to watch automation
    });

    // Run documentation flows
    await documentLandlordOnboarding(browser);
    await documentLandlordApp(browser);
    await documentTenantApp(browser);
    await documentErrorStates(browser);

    // Save master metadata
    const masterData = await saveMasterMetadata();

    // Summary
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ Screenshot generation complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total screenshots: ${masterData.totalScreenshots}`);
    console.log(`   Onboarding: ${masterData.flows.onboarding}`);
    console.log(`   Landlord screens: ${masterData.flows.landlord}`);
    console.log(`   Tenant screens: ${masterData.flows.tenant}`);
    console.log(`   Error states: ${masterData.flows.errors}`);
    console.log('\n📁 Output:');
    console.log(`   Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`   Metadata: ${METADATA_DIR}`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { captureScreen, main };
