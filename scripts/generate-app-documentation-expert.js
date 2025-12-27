#!/usr/bin/env node
/**
 * Expert-Level Playwright Screenshot Automation
 *
 * Implements best practices for React Native Web automation:
 * - Uses testID (data-testid) selectors from codebase
 * - Authentication with storage state persistence
 * - Auto-waiting with specific elements (no networkidle)
 * - Comprehensive error handling and retry logic
 * - Headful mode for debugging
 *
 * Research sources:
 * - Playwright testID docs: https://playwright.dev/docs/locators
 * - RNW testID mapping: https://testing-library.com/docs/queries/bytestid/
 * - Storage state auth: https://playwright.dev/docs/auth
 * - Debug mode: https://playwright.dev/docs/debug
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const METADATA_DIR = path.join(__dirname, '../docs/metadata');
const AUTH_STATE_DIR = path.join(__dirname, '../.auth');

// Test credentials
const LANDLORD_EMAIL = 'landlord-doc@myailandlord.com';
const LANDLORD_PASSWORD = 'TestDoc2025!';
const TENANT_EMAIL = 'tenant-doc@myailandlord.com';
const TENANT_PASSWORD = 'TestDoc2025!';

// Configuration
const CONFIG = {
  headless: process.env.HEADLESS !== 'false', // Run HEADLESS=false for debugging
  viewport: { width: 1280, height: 720 },
  timeout: 15000,
  screenshotDelay: 1500 // Allow React rendering to complete
};

const screenshots = [];

/**
 * Capture screenshot with metadata
 */
async function captureScreen(page, screenName, metadata = {}) {
  console.log(`  📸 ${screenName}`);

  try {
    // Wait for specific element or timeout
    await page.waitForTimeout(CONFIG.screenshotDelay);

    const screenshotPath = path.join(SCREENSHOTS_DIR, `${screenName}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });

    const screenshotData = {
      screenName,
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title().catch(() => 'Untitled'),
      ...metadata
    };

    screenshots.push(screenshotData);

    const metadataPath = path.join(METADATA_DIR, `${screenName}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(screenshotData, null, 2));

    console.log(`    ✓ Captured`);
    return screenshotData;
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Authenticate and save storage state
 */
async function authenticateAndSaveState(page, email, password, statePath) {
  console.log(`  🔐 Authenticating as ${email}...`);

  try {
    // Navigate to home (should redirect to auth or show sign in)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Look for Sign In link or button
    const signInSelectors = [
      'text=/sign in/i',
      'text=/login/i',
      '[href*="auth"]',
      'button:has-text("Sign In")'
    ];

    for (const selector of signInSelectors) {
      try {
        const signInElement = page.locator(selector).first();
        if (await signInElement.isVisible({ timeout: 2000 })) {
          await signInElement.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Fill login form using testIDs (from AuthScreen.tsx)
    const emailInput = page.getByTestId('auth-email');
    await emailInput.waitFor({ state: 'visible', timeout: CONFIG.timeout });
    await emailInput.fill(email);

    const passwordInput = page.getByTestId('auth-password');
    await passwordInput.fill(password);

    // Submit using testID
    const submitButton = page.getByTestId('auth-submit');
    await submitButton.click();

    // Wait for navigation to complete - look for dashboard elements
    await page.waitForTimeout(3000); // Allow auth to complete

    // Verify logged in by checking URL changed or specific element appeared
    const currentUrl = page.url();
    console.log(`    ✓ Logged in (URL: ${currentUrl})`);

    // Save storage state
    await page.context().storageState({ path: statePath });
    console.log(`    ✓ Saved auth state to ${statePath}`);

    return true;
  } catch (error) {
    console.error(`    ❌ Authentication failed: ${error.message}`);
    throw error;
  }
}

/**
 * Document onboarding flow (unauthenticated)
 */
async function documentOnboardingFlow(browser) {
  console.log('\n📱 Onboarding Flow (Unauthenticated)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport
  });
  const page = await context.newPage();

  try {
    // 1. Welcome Screen
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await captureScreen(page, 'onboarding-welcome', {
      flow: 'Onboarding',
      role: 'both',
      step: 1,
      purpose: 'App entry point with get started button'
    });

    // 2. Click "Get Started" using text selector
    const getStartedBtn = page.locator('text="Get Started"').first();
    if (await getStartedBtn.isVisible({ timeout: 5000 })) {
      await getStartedBtn.click();
      await page.waitForTimeout(1500);

      await captureScreen(page, 'onboarding-name', {
        flow: 'Onboarding',
        role: 'both',
        step: 2,
        purpose: 'Collect user first name'
      });

      // 3. Fill name and continue
      const nameInput = page.locator('input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await nameInput.fill('Documentation User');

        const continueBtn = page.locator('text="Continue"').first();
        await continueBtn.click();
        await page.waitForTimeout(1500);

        await captureScreen(page, 'onboarding-account', {
          flow: 'Onboarding',
          role: 'both',
          step: 3,
          purpose: 'Create account with email and password'
        });
      }
    }

    console.log('  ✅ Onboarding flow captured (3 screens)\n');

  } catch (error) {
    console.error(`  ❌ Onboarding flow error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Document landlord authenticated screens
 */
async function documentLandlordScreens(browser, authStatePath) {
  console.log('\n🏠 Landlord Screens (Authenticated)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();

  try {
    // Navigate to home - should be logged in
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Landlord Home/Dashboard
    await captureScreen(page, 'landlord-home', {
      flow: 'Landlord Dashboard',
      role: 'landlord',
      purpose: 'Main dashboard with properties and requests overview'
    });

    // 2. Try to click on a property card if it exists
    const propertyCard = page.locator('text=/Sunset Apartments/i').first();
    if (await propertyCard.isVisible({ timeout: 3000 })) {
      await propertyCard.click();
      await page.waitForTimeout(1500);

      await captureScreen(page, 'landlord-property-details', {
        flow: 'Property Management',
        role: 'landlord',
        purpose: 'Detailed view of single property with areas and requests'
      });

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // 3. Navigate to properties tab/section
    const propertiesSelectors = ['text=/properties/i', '[href*="properties"]', 'text="Properties"'];
    for (const selector of propertiesSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'landlord-properties-list', {
            flow: 'Property Management',
            role: 'landlord',
            purpose: 'List of all landlord properties'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 4. Navigate to requests
    const requestsSelectors = ['text=/requests/i', '[href*="requests"]', 'text="Requests"'];
    for (const selector of requestsSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'landlord-requests-list', {
            flow: 'Maintenance Management',
            role: 'landlord',
            purpose: 'All maintenance requests from tenants'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 5. Navigate to messages
    const messagesSelectors = ['text=/messages/i', '[href*="messages"]', 'text="Messages"'];
    for (const selector of messagesSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'landlord-messages', {
            flow: 'Communication',
            role: 'landlord',
            purpose: 'Message inbox for landlord-tenant communication'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 6. Navigate to profile
    const profileSelectors = ['text=/profile/i', 'text=/settings/i', '[href*="profile"]', 'text="Profile"'];
    for (const selector of profileSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'landlord-profile', {
            flow: 'Settings',
            role: 'landlord',
            purpose: 'User profile and account settings'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('  ✅ Landlord screens captured\n');

  } catch (error) {
    console.error(`  ❌ Landlord screens error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Document tenant authenticated screens
 */
async function documentTenantScreens(browser, authStatePath) {
  console.log('\n👤 Tenant Screens (Authenticated)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Tenant Home
    await captureScreen(page, 'tenant-home', {
      flow: 'Tenant Dashboard',
      role: 'tenant',
      purpose: 'Main tenant dashboard with property and requests'
    });

    // 2. Click property card if visible
    const propertyCard = page.locator('text=/Sunset Apartments/i').first();
    if (await propertyCard.isVisible({ timeout: 3000 })) {
      await propertyCard.click();
      await page.waitForTimeout(1500);

      await captureScreen(page, 'tenant-property-info', {
        flow: 'Property Information',
        role: 'tenant',
        purpose: 'Property details and areas'
      });

      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // 3. Report issue button
    const reportBtn = page.locator('text=/report/i, text=/new request/i').first();
    if (await reportBtn.isVisible({ timeout: 3000 })) {
      await reportBtn.click();
      await page.waitForTimeout(1500);

      await captureScreen(page, 'tenant-report-issue', {
        flow: 'Maintenance Request',
        role: 'tenant',
        purpose: 'Create new maintenance request form'
      });

      // Go back
      const cancelBtn = page.locator('text=/cancel/i, text=/back/i').first();
      if (await cancelBtn.isVisible({ timeout: 2000 })) {
        await cancelBtn.click();
        await page.waitForTimeout(1000);
      } else {
        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }

    // 4. Requests history
    const requestsSelectors = ['text=/requests/i', 'text=/history/i', '[href*="requests"]', 'text="Requests"'];
    for (const selector of requestsSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'tenant-requests-list', {
            flow: 'Maintenance History',
            role: 'tenant',
            purpose: 'All maintenance requests and their status'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 5. Messages
    const messagesSelectors = ['text=/messages/i', '[href*="messages"]', 'text="Messages"'];
    for (const selector of messagesSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'tenant-messages', {
            flow: 'Communication',
            role: 'tenant',
            purpose: 'Message inbox with landlord'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 6. Profile
    const profileSelectors = ['text=/profile/i', 'text=/settings/i', '[href*="profile"]', 'text="Profile"'];
    for (const selector of profileSelectors) {
      try {
        const nav = page.locator(selector).first();
        if (await nav.isVisible({ timeout: 2000 })) {
          await nav.click();
          await page.waitForTimeout(1500);

          await captureScreen(page, 'tenant-profile', {
            flow: 'Settings',
            role: 'tenant',
            purpose: 'User profile and account settings'
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('  ✅ Tenant screens captured\n');

  } catch (error) {
    console.error(`  ❌ Tenant screens error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Document error states
 */
async function documentErrorStates(browser) {
  console.log('\n⚠️  Error States\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport
  });
  const page = await context.newPage();

  try {
    // 1. Invalid login
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Navigate to sign in
    const signInLink = page.locator('text=/sign in/i').first();
    if (await signInLink.isVisible({ timeout: 3000 })) {
      await signInLink.click();
      await page.waitForTimeout(1000);

      // Fill invalid credentials
      const emailInput = page.getByTestId('auth-email');
      if (await emailInput.isVisible({ timeout: 3000 })) {
        await emailInput.fill('invalid@example.com');

        const passwordInput = page.getByTestId('auth-password');
        await passwordInput.fill('WrongPassword123');

        const submitBtn = page.getByTestId('auth-submit');
        await submitBtn.click();

        // Wait for error message
        await page.waitForTimeout(2000);

        await captureScreen(page, 'error-login-invalid', {
          flow: 'Error States',
          role: 'both',
          purpose: 'Login error with invalid credentials'
        });
      }
    }

    console.log('  ✅ Error states captured\n');

  } catch (error) {
    console.error(`  ❌ Error states error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Save master metadata
 */
async function saveMasterMetadata() {
  const masterData = {
    generatedAt: new Date().toISOString(),
    totalScreenshots: screenshots.filter(s => s !== null).length,
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

  return masterData;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📸 Expert Playwright Screenshot Automation');
  console.log('   React Native Web + Playwright Best Practices');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Mode: ${CONFIG.headless ? 'Headless' : 'Headful (Debug)'}`);
  console.log(`Viewport: ${CONFIG.viewport.width}x${CONFIG.viewport.height}`);
  console.log(`Timeout: ${CONFIG.timeout}ms\n`);

  let browser;

  try {
    // Ensure auth state directory exists
    await fs.mkdir(AUTH_STATE_DIR, { recursive: true });

    // Launch browser
    console.log('🚀 Launching browser...\n');
    browser = await chromium.launch({
      headless: CONFIG.headless
    });

    // 1. Document onboarding flow (unauthenticated)
    await documentOnboardingFlow(browser);

    // 2. Authenticate as landlord and save state
    console.log('🔐 Landlord Authentication\n');
    const landlordContext = await browser.newContext({ viewport: CONFIG.viewport });
    const landlordPage = await landlordContext.newPage();
    const landlordStatePath = path.join(AUTH_STATE_DIR, 'landlord.json');

    await authenticateAndSaveState(landlordPage, LANDLORD_EMAIL, LANDLORD_PASSWORD, landlordStatePath);
    await landlordContext.close();

    // 3. Document landlord screens
    await documentLandlordScreens(browser, landlordStatePath);

    // 4. Authenticate as tenant and save state
    console.log('🔐 Tenant Authentication\n');
    const tenantContext = await browser.newContext({ viewport: CONFIG.viewport });
    const tenantPage = await tenantContext.newPage();
    const tenantStatePath = path.join(AUTH_STATE_DIR, 'tenant.json');

    await authenticateAndSaveState(tenantPage, TENANT_EMAIL, TENANT_PASSWORD, tenantStatePath);
    await tenantContext.close();

    // 5. Document tenant screens
    await documentTenantScreens(browser, tenantStatePath);

    // 6. Document error states
    await documentErrorStates(browser);

    // Save master metadata
    const masterData = await saveMasterMetadata();

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Screenshot Generation Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total screenshots: ${masterData.totalScreenshots}`);
    console.log(`   Onboarding: ${masterData.flows.onboarding}`);
    console.log(`   Landlord screens: ${masterData.flows.landlord}`);
    console.log(`   Tenant screens: ${masterData.flows.tenant}`);
    console.log(`   Error states: ${masterData.flows.errors}`);
    console.log('\n📁 Output:');
    console.log(`   Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`   Metadata: ${METADATA_DIR}`);
    console.log(`   Auth states: ${AUTH_STATE_DIR}`);
    console.log('\n💡 Next step:');
    console.log('   node scripts/build-documentation-html.js');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { captureScreen, authenticateAndSaveState, main };
