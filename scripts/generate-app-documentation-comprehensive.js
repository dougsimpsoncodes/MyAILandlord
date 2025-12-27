#!/usr/bin/env node
/**
 * Comprehensive App Documentation - Screenshot Automation
 *
 * Captures ALL screens including:
 * - Complete landlord property setup flow (10+ screens)
 * - Landlord management screens
 * - Complete tenant flows
 * - Shared screens
 * - Edge cases and empty states
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  headless: process.env.HEADLESS !== 'false',
  viewport: { width: 1280, height: 720 },
  timeout: 15000,
  screenshotsDir: path.join(__dirname, '../docs/screenshots'),
  metadataDir: path.join(__dirname, '../docs/metadata'),
  authDir: path.join(__dirname, '../.auth'),
  debug: process.env.DEBUG === 'true'
};

const BASE_URL = 'http://localhost:8081';
const LANDLORD_EMAIL = 'landlord-doc@myailandlord.com';
const LANDLORD_PASSWORD = 'TestDoc2025!';
const TENANT_EMAIL = 'tenant-doc@myailandlord.com';
const TENANT_PASSWORD = 'TestDoc2025!';

// Sample images for uploads (1x1 transparent PNG)
const SAMPLE_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Capture screenshot with metadata
 */
async function captureScreen(page, screenName, metadata = {}) {
  try {
    const screenshotPath = path.join(CONFIG.screenshotsDir, `${screenName}.png`);
    await page.screenshot({ path: screenshotPath });

    const metadataPath = path.join(CONFIG.metadataDir, `${screenName}.json`);
    const data = {
      screenName,
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title(),
      ...metadata
    };
    await fs.writeFile(metadataPath, JSON.stringify(data, null, 2));

    console.log(`  📸 ${screenName}`);
    console.log(`    ✓ Captured`);
    return data;
  } catch (error) {
    console.error(`  ❌ Failed to capture ${screenName}: ${error.message}`);
    return null;
  }
}

/**
 * Wait for navigation or timeout
 */
async function waitForNavigation(page, timeout = 2000) {
  try {
    await page.waitForTimeout(timeout);
  } catch (e) {
    // Ignore timeout errors
  }
}

/**
 * Debug helper - capture screenshot and log visible elements
 */
async function debugPage(page, debugName) {
  if (!CONFIG.debug) return;

  try {
    // Capture debug screenshot
    const debugPath = path.join(CONFIG.screenshotsDir, `DEBUG_${debugName}.png`);
    await page.screenshot({ path: debugPath });
    console.log(`    🔍 Debug screenshot: DEBUG_${debugName}.png`);

    // Log all visible text elements
    const textElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const text = el.textContent?.trim();
          const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
          return text && text.length < 100 && isVisible;
        })
        .map(el => ({
          tag: el.tagName,
          text: el.textContent.trim(),
          role: el.getAttribute('role'),
          testId: el.getAttribute('data-testid')
        }))
        .filter((v, i, a) => a.findIndex(t => t.text === v.text) === i) // unique
        .slice(0, 50); // limit
    });

    console.log(`    🔍 Visible elements (first 50 unique):`);
    textElements.forEach(el => {
      console.log(`       - ${el.tag}: "${el.text}" ${el.testId ? `[data-testid="${el.testId}"]` : ''} ${el.role ? `[role="${el.role}"]` : ''}`);
    });
  } catch (error) {
    console.error(`    ❌ Debug failed: ${error.message}`);
  }
}

/**
 * Click element with multiple selector fallbacks
 */
async function clickElement(page, selectors, description) {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        console.log(`    ✓ Clicked: ${description}`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  console.log(`    ⚠️  Could not click: ${description}`);
  return false;
}

/**
 * Fill form field with multiple selector fallbacks
 */
async function fillField(page, selectors, value, description) {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.fill(value);
        console.log(`    ✓ Filled: ${description} = "${value}"`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  console.log(`    ⚠️  Could not fill: ${description}`);
  return false;
}

/**
 * Setup directories
 */
async function setupDirectories() {
  await fs.mkdir(CONFIG.screenshotsDir, { recursive: true });
  await fs.mkdir(CONFIG.metadataDir, { recursive: true });
  await fs.mkdir(CONFIG.authDir, { recursive: true });
}

/**
 * Authenticate and save state
 */
async function authenticateAndSaveState(page, email, password, statePath) {
  console.log(`  🔐 Authenticating as ${email}...`);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click "Sign In" link
  const signInLink = page.locator('text=/sign in/i').first();
  if (await signInLink.isVisible({ timeout: 5000 })) {
    await signInLink.click();
    await page.waitForTimeout(1500);
  }

  // Fill credentials
  const emailInput = page.getByTestId('auth-email');
  await emailInput.waitFor({ state: 'visible', timeout: CONFIG.timeout });
  await emailInput.fill(email);

  const passwordInput = page.getByTestId('auth-password');
  await passwordInput.fill(password);

  const submitButton = page.getByTestId('auth-submit');
  await submitButton.click();

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Save auth state
  await page.context().storageState({ path: statePath });
  console.log(`    ✓ Logged in (URL: ${page.url()})`);
  console.log(`    ✓ Saved auth state to ${statePath}\n`);
}

/**
 * Document onboarding flow
 */
async function documentOnboardingFlow(browser) {
  console.log('\n📱 Onboarding Flow (Unauthenticated)\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Welcome screen
    screenshots.push(await captureScreen(page, 'onboarding-welcome', {
      flow: 'Onboarding',
      step: 1,
      role: 'both',
      purpose: 'Initial welcome screen with Get Started CTA'
    }));

    // Click Get Started
    await clickElement(page, ['text=/get started/i', 'text=/continue/i'], 'Get Started');
    await waitForNavigation(page);

    // Name entry
    screenshots.push(await captureScreen(page, 'onboarding-name', {
      flow: 'Onboarding',
      step: 2,
      role: 'both',
      purpose: 'Collect user first name'
    }));

    // Click Continue
    await clickElement(page, ['text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page);

    // Account creation
    screenshots.push(await captureScreen(page, 'onboarding-account', {
      flow: 'Onboarding',
      step: 3,
      role: 'both',
      purpose: 'Create account with email and password'
    }));

    console.log(`  ✅ Onboarding flow captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Onboarding error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document COMPLETE landlord property setup flow
 */
async function documentLandlordPropertyFlow(browser, authStatePath) {
  console.log('\n🏠 Landlord Property Setup Flow (COMPLETE)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];
  let completedAuthPath = authStatePath; // declare before try block

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Property Intro Screen
    screenshots.push(await captureScreen(page, 'landlord-property-intro', {
      flow: 'Property Setup',
      step: 1,
      role: 'landlord',
      purpose: 'Introduction to property setup wizard'
    }));

    // Click "Add Property" or "Get Started"
    const startButton = await clickElement(
      page,
      ['text=/add property/i', 'text=/get started/i', 'text=/create property/i', 'text=/continue/i'],
      'Start Property Setup'
    );
    await waitForNavigation(page, 2000);

    // 2. Property Basics - Address, Name, Type
    screenshots.push(await captureScreen(page, 'landlord-property-basics', {
      flow: 'Property Setup',
      step: 2,
      role: 'landlord',
      purpose: 'Enter property address, name, and type'
    }));

    // Fill in property basics
    await fillField(page, ['[placeholder*="address" i]', '[name="address"]', 'input[type="text"]'], '123 Main St, San Francisco, CA 94102', 'Address');
    await waitForNavigation(page, 1000);
    await fillField(page, ['[placeholder*="name" i]', '[name="name"]'], 'Test Property', 'Property Name');

    // Continue to next step
    await clickElement(page, ['text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page, 2000);

    // 3. Property Attributes - Bedrooms, Bathrooms, SqFt
    screenshots.push(await captureScreen(page, 'landlord-property-attributes', {
      flow: 'Property Setup',
      step: 3,
      role: 'landlord',
      purpose: 'Property details: bedrooms, bathrooms, square footage'
    }));

    // Continue
    await clickElement(page, ['text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page, 2000);

    // 4. Property Areas - Select rooms
    screenshots.push(await captureScreen(page, 'landlord-property-areas', {
      flow: 'Property Setup',
      step: 4,
      role: 'landlord',
      purpose: 'Select property areas/rooms (Kitchen, Living Room, etc.)'
    }));

    // Select a few areas
    await clickElement(page, ['text=/kitchen/i'], 'Select Kitchen');
    await waitForNavigation(page, 500);
    await clickElement(page, ['text=/living room/i', 'text=/living/i'], 'Select Living Room');
    await waitForNavigation(page, 500);
    await clickElement(page, ['text=/bedroom/i'], 'Select Bedroom');
    await waitForNavigation(page, 500);

    // Continue
    await clickElement(page, ['text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page, 2000);

    // 5. Room Photography - Add photos to rooms
    screenshots.push(await captureScreen(page, 'landlord-room-photography', {
      flow: 'Property Setup',
      step: 5,
      role: 'landlord',
      purpose: 'Add photos to each selected room/area'
    }));

    // Try to add a photo (might not work in headless, but capture the screen)
    await clickElement(page, ['text=/add photo/i', 'text=/take photo/i', 'text=/upload/i'], 'Add Photo Button');
    await waitForNavigation(page, 1000);

    // Skip or continue
    await clickElement(page, ['text=/skip/i', 'text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page, 2000);

    // 6. Property Assets List
    screenshots.push(await captureScreen(page, 'landlord-property-assets-list', {
      flow: 'Property Setup',
      step: 6,
      role: 'landlord',
      purpose: 'List of assets detected or manually added'
    }));

    // Try to add asset
    const addAssetClicked = await clickElement(page, ['text=/add asset/i', 'text=/new asset/i'], 'Add Asset');
    if (addAssetClicked) {
      await waitForNavigation(page, 2000);

      // 7. Add Asset Screen
      screenshots.push(await captureScreen(page, 'landlord-add-asset', {
        flow: 'Property Setup',
        step: 7,
        role: 'landlord',
        purpose: 'Add individual asset (appliance, fixture, etc.)'
      }));

      // Cancel or go back
      await clickElement(page, ['text=/cancel/i', 'text=/back/i'], 'Cancel');
      await waitForNavigation(page, 1000);
    }

    // Continue to review
    await clickElement(page, ['text=/continue/i', 'text=/next/i', 'text=/review/i'], 'Continue to Review');
    await waitForNavigation(page, 2000);

    // 8. Property Review - Final review before submission
    screenshots.push(await captureScreen(page, 'landlord-property-review', {
      flow: 'Property Setup',
      step: 8,
      role: 'landlord',
      purpose: 'Review all property details before submission'
    }));

    // IMPORTANT: Submit the property to complete setup
    const submitClicked = await clickElement(
      page,
      ['text=/submit/i', 'text=/complete/i', 'text=/finish/i', 'text=/create property/i'],
      'Submit Property'
    );

    if (submitClicked) {
      await waitForNavigation(page, 3000);
      console.log('    ✓ Property submitted - landlord should now be on dashboard');

      // Save the completed auth state for use by other functions
      completedAuthPath = path.join(CONFIG.authDir, 'landlord-completed.json');
      await page.context().storageState({ path: completedAuthPath });
      console.log(`    ✓ Saved completed auth state to ${completedAuthPath}`);
    } else {
      console.log('    ⚠️  Property not submitted - continuing with basic auth state');
    }

    console.log(`  ✅ Property setup flow captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Property setup error: ${error.message}`);
  } finally {
    await context.close();
  }

  return { screenshots: screenshots.filter(s => s), completedAuthPath };
}

/**
 * Document landlord management screens
 */
async function documentLandlordManagementScreens(browser, authStatePath) {
  console.log('\n📊 Landlord Management Screens\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Landlord Home/Dashboard
    screenshots.push(await captureScreen(page, 'landlord-dashboard', {
      flow: 'Landlord Dashboard',
      role: 'landlord',
      purpose: 'Main landlord dashboard with properties overview'
    }));

    // 2. Properties List
    await clickElement(page, ['text=/properties/i', '[href*="properties"]'], 'Properties');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'landlord-properties-list', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'List of all properties'
    }));

    // 3. Property Details
    const propertyCard = await clickElement(page, ['text=/sunset/i', 'text=/property/i'], 'Property Card');
    if (propertyCard) {
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'landlord-property-details', {
        flow: 'Property Management',
        role: 'landlord',
        purpose: 'Detailed view of single property'
      }));

      // 4. Invite Tenant Screen
      await clickElement(page, ['text=/invite/i', 'text=/add tenant/i'], 'Invite Tenant');
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'landlord-invite-tenant', {
        flow: 'Tenant Management',
        role: 'landlord',
        purpose: 'Send tenant invitation via email or code'
      }));

      await page.goBack();
      await waitForNavigation(page);
    }

    // Go back to home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNavigation(page);

    // 5. Maintenance Requests
    await clickElement(page, ['text=/requests/i', 'text=/maintenance/i', '[href*="requests"]'], 'Requests');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'landlord-requests-list', {
      flow: 'Maintenance',
      role: 'landlord',
      purpose: 'List of maintenance requests from tenants'
    }));

    // 6. Request Details
    const requestCard = await clickElement(page, ['text=/leaking/i', 'text=/request/i'], 'Request Card');
    if (requestCard) {
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'landlord-request-details', {
        flow: 'Maintenance',
        role: 'landlord',
        purpose: 'Detailed view of maintenance request'
      }));
      await page.goBack();
      await waitForNavigation(page);
    }

    // Go back to home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNavigation(page);

    // 7. Messages
    await clickElement(page, ['text=/messages/i', 'text=/chat/i', '[href*="messages"]'], 'Messages');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'landlord-messages', {
      flow: 'Communication',
      role: 'landlord',
      purpose: 'Message inbox for landlord-tenant communication'
    }));

    // 8. Individual Chat
    const chatThread = await clickElement(page, ['text=/sarah/i', 'text=/tenant/i'], 'Chat Thread');
    if (chatThread) {
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'landlord-chat', {
        flow: 'Communication',
        role: 'landlord',
        purpose: 'Individual chat conversation with tenant'
      }));
      await page.goBack();
      await waitForNavigation(page);
    }

    // Go back to home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNavigation(page);

    // 9. Profile
    await clickElement(page, ['text=/profile/i', 'text=/settings/i', '[href*="profile"]'], 'Profile');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'landlord-profile', {
      flow: 'Settings',
      role: 'landlord',
      purpose: 'User profile and account settings'
    }));

    console.log(`  ✅ Management screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Management screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document landlord asset management flow
 */
async function documentLandlordAssetFlow(browser, authStatePath) {
  console.log('\n🔧 Landlord Asset Management Flow\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Navigate to properties
    await clickElement(page, ['text=/properties/i', '[href*="properties"]'], 'Properties');
    await waitForNavigation(page);

    // Click on property
    const propertyCard = await clickElement(page, ['text=/sunset/i', 'text=/property/i'], 'Property Card');
    if (!propertyCard) {
      console.log('  ⚠️  Could not find property card, skipping asset flow');
      return screenshots;
    }
    await waitForNavigation(page);

    // Look for "Rooms & Inventory" button (that's what it's called in PropertyDetails)
    const assetsClicked = await clickElement(
      page,
      ['text=/rooms.*inventory/i', 'text=/inventory/i', 'text=/rooms/i', 'text=/assets/i'],
      'Rooms & Inventory'
    );

    if (assetsClicked) {
      await waitForNavigation(page);

      // 1. Property Assets Screen (list view)
      screenshots.push(await captureScreen(page, 'landlord-property-assets', {
        flow: 'Asset Management',
        step: 1,
        role: 'landlord',
        purpose: 'View all assets for a property'
      }));

      // 2. Click on existing asset to view details
      const assetCard = await clickElement(
        page,
        ['text=/refrigerator/i', 'text=/hvac/i', 'text=/dishwasher/i', '[data-testid*="asset"]'],
        'Asset Card'
      );

      if (assetCard) {
        await waitForNavigation(page);
        screenshots.push(await captureScreen(page, 'landlord-asset-details', {
          flow: 'Asset Management',
          step: 2,
          role: 'landlord',
          purpose: 'View and edit asset details'
        }));

        // 3. Asset Photos
        const photosClicked = await clickElement(
          page,
          ['text=/photos/i', 'text=/add photo/i', 'text=/images/i'],
          'Asset Photos'
        );

        if (photosClicked) {
          await waitForNavigation(page);
          screenshots.push(await captureScreen(page, 'landlord-asset-photos', {
            flow: 'Asset Management',
            step: 3,
            role: 'landlord',
            purpose: 'Add or view photos of individual asset'
          }));
          await page.goBack();
          await waitForNavigation(page);
        }

        await page.goBack();
        await waitForNavigation(page);
      }

      // 4. Add New Asset
      const addAssetClicked = await clickElement(
        page,
        ['text=/add asset/i', 'text=/new asset/i', 'text=/\+/'],
        'Add Asset'
      );

      if (addAssetClicked) {
        await waitForNavigation(page);
        screenshots.push(await captureScreen(page, 'landlord-add-asset', {
          flow: 'Asset Management',
          step: 4,
          role: 'landlord',
          purpose: 'Add new asset manually - form entry'
        }));

        // Fill some fields
        await fillField(page, ['[placeholder*="name" i]', '[name="name"]'], 'New Appliance', 'Asset Name');
        await fillField(page, ['[placeholder*="model" i]', '[name="model"]'], 'Samsung RF28', 'Model Number');
        await fillField(page, ['[placeholder*="serial" i]', '[name="serial"]'], 'SN123456', 'Serial Number');

        // Try to get to scanning screen
        const scanClicked = await clickElement(
          page,
          ['text=/scan/i', 'text=/ai scan/i', 'text=/detect/i'],
          'Scan Asset'
        );

        if (scanClicked) {
          await waitForNavigation(page);
          screenshots.push(await captureScreen(page, 'landlord-asset-scanning', {
            flow: 'Asset Management',
            step: 5,
            role: 'landlord',
            purpose: 'AI-powered asset scanning from photo'
          }));
        }
      }
    }

    console.log(`  ✅ Asset flow captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Asset flow error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document COMPLETE tenant report issue flow
 */
async function documentTenantReportFlow(browser, authStatePath) {
  console.log('\n🔧 Tenant Report Issue Flow (COMPLETE)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Tenant Home
    screenshots.push(await captureScreen(page, 'tenant-home', {
      flow: 'Tenant Dashboard',
      role: 'tenant',
      purpose: 'Main tenant dashboard with property and requests'
    }));

    // 2. Click Report Issue
    await clickElement(page, ['text=/report/i', 'text=/new request/i', 'text=/issue/i'], 'Report Issue');
    await waitForNavigation(page);

    // 3. Report Issue Screen
    screenshots.push(await captureScreen(page, 'tenant-report-issue', {
      flow: 'Report Issue',
      step: 1,
      role: 'tenant',
      purpose: 'Create new maintenance request - select area and describe issue'
    }));

    // Fill in some details
    await fillField(page, ['[placeholder*="describe" i]', 'textarea'], 'The kitchen faucet is leaking', 'Issue Description');

    // Continue
    await clickElement(page, ['text=/continue/i', 'text=/next/i'], 'Continue');
    await waitForNavigation(page);

    // 4. Review Issue
    screenshots.push(await captureScreen(page, 'tenant-review-issue', {
      flow: 'Report Issue',
      step: 2,
      role: 'tenant',
      purpose: 'Review maintenance request before submission'
    }));

    // Submit
    await clickElement(page, ['text=/submit/i', 'text=/send/i'], 'Submit');
    await waitForNavigation(page);

    // 5. Submission Success
    screenshots.push(await captureScreen(page, 'tenant-submission-success', {
      flow: 'Report Issue',
      step: 3,
      role: 'tenant',
      purpose: 'Confirmation that request was submitted successfully'
    }));

    // Done - go back to home
    await clickElement(page, ['text=/done/i', 'text=/home/i'], 'Done');
    await waitForNavigation(page);

    console.log(`  ✅ Report flow captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Report flow error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document tenant other screens
 */
async function documentTenantOtherScreens(browser, authStatePath) {
  console.log('\n👤 Tenant Other Screens\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Property Info
    const propertyCard = await clickElement(page, ['text=/sunset/i', 'text=/property/i'], 'Property Card');
    if (propertyCard) {
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'tenant-property-info', {
        flow: 'Property Information',
        role: 'tenant',
        purpose: 'View property details and areas'
      }));
      await page.goBack();
      await waitForNavigation(page);
    }

    // 2. Requests List
    await clickElement(page, ['text=/requests/i', 'text=/history/i'], 'Requests');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'tenant-requests-list', {
      flow: 'Maintenance',
      role: 'tenant',
      purpose: 'List of all maintenance requests'
    }));

    // 3. Request Status
    const requestCard = await clickElement(page, ['text=/leaking/i', 'text=/request/i'], 'Request Card');
    if (requestCard) {
      await waitForNavigation(page);
      screenshots.push(await captureScreen(page, 'tenant-request-status', {
        flow: 'Maintenance',
        role: 'tenant',
        purpose: 'View maintenance request status and updates'
      }));
      await page.goBack();
      await waitForNavigation(page);
    }

    // Go back to home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForNavigation(page);

    // 4. Messages
    await clickElement(page, ['text=/messages/i', 'text=/chat/i'], 'Messages');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'tenant-messages', {
      flow: 'Communication',
      role: 'tenant',
      purpose: 'Message inbox for tenant-landlord communication'
    }));

    // 5. Profile
    await clickElement(page, ['text=/profile/i', 'text=/settings/i'], 'Profile');
    await waitForNavigation(page);
    screenshots.push(await captureScreen(page, 'tenant-profile', {
      flow: 'Settings',
      role: 'tenant',
      purpose: 'User profile and account settings'
    }));

    console.log(`  ✅ Tenant screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Tenant screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document asset detail screens (Add, Details, Photos, Scanning)
 */
async function documentAssetDetailScreens(browser, authStatePath) {
  console.log('\n🔧 Asset Detail Screens\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  // Known IDs from database for landlord-doc
  const propertyId = '2a17b6c7-5f4f-4cdb-a707-d5b24d364fc7';
  const areaId = '12bae404-1e9f-4d77-964e-a57a122ec78d';

  try {
    // 1. Add Asset Screen
    await page.goto(`${BASE_URL}/AddAsset?areaId=${areaId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-add-asset', {
      flow: 'Asset Management',
      role: 'landlord',
      purpose: 'Add new asset manually (appliance, fixture, system)'
    }));

    // 2. Asset Scanning Screen
    await page.goto(`${BASE_URL}/AssetScanning`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-asset-scanning', {
      flow: 'Asset Management',
      role: 'landlord',
      purpose: 'AI-powered asset scanning from photos'
    }));

    // 3. Asset Details Screen - navigate directly with asset ID
    const assetId = 'a1111111-1111-1111-1111-111111111111'; // Refrigerator
    await page.goto(`${BASE_URL}/AssetDetails?assetId=${assetId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-asset-details', {
      flow: 'Asset Management',
      role: 'landlord',
      purpose: 'View and edit individual asset details'
    }));

    // 4. Asset Photos Screen - navigate directly
    await page.goto(`${BASE_URL}/AssetPhotos?assetId=${assetId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-asset-photos', {
      flow: 'Asset Management',
      role: 'landlord',
      purpose: 'Add photos to document asset condition'
    }));

    console.log(`  ✅ Asset detail screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Asset detail screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document tenant follow-up and status screens
 */
async function documentTenantFollowUpScreens(browser, authStatePath) {
  console.log('\n📋 Tenant Follow-Up & Status Screens\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // 1. Maintenance Status Screen (main requests view)
    await page.goto(`${BASE_URL}/TenantRequestsMain`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-maintenance-status', {
      flow: 'Maintenance',
      role: 'tenant',
      purpose: 'Main maintenance requests status view'
    }));

    // 2. Follow-Up Screen
    await page.goto(`${BASE_URL}/FollowUp`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-follow-up', {
      flow: 'Maintenance',
      role: 'tenant',
      purpose: 'Follow up on maintenance request with additional details'
    }));

    // 3. Confirm Submission Screen
    await page.goto(`${BASE_URL}/ConfirmSubmission`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-confirm-submission', {
      flow: 'Maintenance',
      role: 'tenant',
      purpose: 'Confirm maintenance request before final submission'
    }));

    // 4. Property Welcome Screen
    await page.goto(`${BASE_URL}/PropertyWelcome`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-property-welcome', {
      flow: 'Onboarding',
      role: 'tenant',
      purpose: 'Welcome message after property connection'
    }));

    console.log(`  ✅ Tenant follow-up screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Tenant follow-up screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document onboarding variation screens
 */
async function documentOnboardingVariations(browser) {
  console.log('\n🎓 Onboarding Variation Screens\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // 1. Landlord Onboarding Welcome
    await page.goto(`${BASE_URL}/LandlordOnboardingWelcome`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-onboarding-welcome', {
      flow: 'Landlord Onboarding',
      role: 'landlord',
      purpose: 'Landlord-specific welcome screen'
    }));

    // 2. Landlord Onboarding Success
    await page.goto(`${BASE_URL}/LandlordOnboardingSuccess`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-onboarding-success', {
      flow: 'Landlord Onboarding',
      role: 'landlord',
      purpose: 'Completion screen after landlord onboarding'
    }));

    // 3. Landlord Tenant Invite (onboarding flow)
    await page.goto(`${BASE_URL}/LandlordTenantInvite`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-tenant-invite-onboarding', {
      flow: 'Landlord Onboarding',
      role: 'landlord',
      purpose: 'Invite first tenant during onboarding'
    }));

    // 4. Tenant Onboarding Welcome
    await page.goto(`${BASE_URL}/TenantOnboardingWelcome`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-onboarding-welcome', {
      flow: 'Tenant Onboarding',
      role: 'tenant',
      purpose: 'Tenant-specific welcome screen'
    }));

    // 5. Tenant Onboarding Success
    await page.goto(`${BASE_URL}/TenantOnboardingSuccess`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-onboarding-success', {
      flow: 'Tenant Onboarding',
      role: 'tenant',
      purpose: 'Completion screen after tenant onboarding'
    }));

    // 6. Tenant Invite Roommate
    await page.goto(`${BASE_URL}/TenantInviteRoommate`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-invite-roommate', {
      flow: 'Tenant Onboarding',
      role: 'tenant',
      purpose: 'Invite roommate to join property'
    }));

    console.log(`  ✅ Onboarding variations captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Onboarding variations error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document property management and alternative views
 */
async function documentPropertyManagementScreens(browser, authStatePath) {
  console.log('\n🏢 Property Management & Alternative Views\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // 1. Property Management Screen
    await page.goto(`${BASE_URL}/PropertyManagement`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-property-management', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'Manage existing property settings and details'
    }));

    // 2. Property Photos Screen
    await page.goto(`${BASE_URL}/PropertyPhotos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-property-photos', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'Add/manage overall property photos'
    }));

    // 3. Add Property Screen (alternative to wizard)
    await page.goto(`${BASE_URL}/AddProperty`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-add-property', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'Add new property (alternative flow)'
    }));

    // 4. Dashboard Screen (alternative view)
    await page.goto(`${BASE_URL}/Dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-dashboard-alt', {
      flow: 'Landlord Management',
      role: 'landlord',
      purpose: 'Alternative dashboard view for landlord'
    }));

    // 5. Case Detail Screen (maintenance case details)
    await page.goto(`${BASE_URL}/CaseDetail`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'landlord-case-detail', {
      flow: 'Maintenance',
      role: 'landlord',
      purpose: 'Detailed view of maintenance case/request'
    }));

    // 6. Communication Hub (tenant)
    await page.goto(`${BASE_URL}/CommunicationHub`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'tenant-communication-hub', {
      flow: 'Communication',
      role: 'tenant',
      purpose: 'Alternative messages/communication view'
    }));

    console.log(`  ✅ Property management screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Property management screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document utility and developer screens
 */
async function documentUtilityScreens(browser) {
  console.log('\n🛠️  Utility & Developer Screens\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // 1. Auth Callback Screen
    await page.goto(`${BASE_URL}/AuthCallback`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'utility-auth-callback', {
      flow: 'Utility',
      role: 'both',
      purpose: 'OAuth/SSO authentication callback handler'
    }));

    // Note: QuickRoleSwitch and RoleSelectScreen might require special access
    // They may not have routes or might be dev-only screens

    console.log(`  ✅ Utility screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Utility screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document legacy/deprecated screens for completeness
 */
async function documentLegacyScreens(browser) {
  console.log('\n⚠️  Legacy/Deprecated Screens\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // 1. Property Code Entry (old 6-char code system)
    await page.goto(`${BASE_URL}/PropertyCodeEntry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'legacy-property-code-entry', {
      flow: 'Legacy',
      role: 'tenant',
      purpose: '[DEPRECATED] Old 6-character property code entry'
    }));

    // 2. Invite Accept (old invite system)
    await page.goto(`${BASE_URL}/InviteAccept`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'legacy-invite-accept', {
      flow: 'Legacy',
      role: 'tenant',
      purpose: '[DEPRECATED] Old invite acceptance flow'
    }));

    // 3. Property Invite Accept
    await page.goto(`${BASE_URL}/PropertyInviteAccept`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'legacy-property-invite-accept', {
      flow: 'Legacy',
      role: 'tenant',
      purpose: '[DEPRECATED] Old property invite acceptance'
    }));

    console.log(`  ✅ Legacy screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Legacy screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document shared screens (Settings, Help, etc.) - ENHANCED
 */
async function documentSharedScreens(browser, authStatePath) {
  console.log('\n⚙️  Shared Screens (Settings, Help, Support)\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // ALTERNATIVE APPROACH: Navigate directly via URL instead of clicking tabs
    // This bypasses any onboarding checks or tab navigation issues

    // 1. Go directly to Profile screen
    await page.goto(`${BASE_URL}/LandlordProfile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    screenshots.push(await captureScreen(page, 'shared-landlord-profile', {
      flow: 'Settings',
      role: 'landlord',
      purpose: 'Landlord profile and settings page'
    }));

    // 2. Navigate directly to Edit Profile
    await page.goto(`${BASE_URL}/EditProfile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'shared-edit-profile', {
      flow: 'Settings',
      role: 'both',
      purpose: 'Edit user profile information (name, avatar, etc.)'
    }));

    // 3. Navigate directly to Security Settings
    await page.goto(`${BASE_URL}/Security`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'shared-security', {
      flow: 'Settings',
      role: 'both',
      purpose: 'Security settings - change password, 2FA'
    }));

    // 4. Navigate directly to Notifications Settings
    await page.goto(`${BASE_URL}/Notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'shared-notifications', {
      flow: 'Settings',
      role: 'both',
      purpose: 'Notification preferences - email, push, SMS settings'
    }));

    // 5. Navigate directly to Help Center
    await page.goto(`${BASE_URL}/HelpCenter`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'shared-help-center', {
      flow: 'Help & Support',
      role: 'both',
      purpose: 'Help center with FAQs, guides, and troubleshooting'
    }));

    // 6. Navigate directly to Contact Support
    await page.goto(`${BASE_URL}/ContactSupport`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'shared-contact-support', {
      flow: 'Help & Support',
      role: 'both',
      purpose: 'Contact support form - submit tickets or questions'
    }));

    console.log(`  ✅ Shared screens captured (${screenshots.filter(s => s).length} screens)\n`);
  } catch (error) {
    console.error(`  ❌ Shared screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document onboarding role selection
 */
async function documentOnboardingRoleScreen(browser) {
  console.log('\n🎯 Onboarding Role Selection\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Navigate through onboarding to role screen
    await clickElement(page, ['text=/get started/i'], 'Get Started');
    await waitForNavigation(page);
    await clickElement(page, ['text=/continue/i'], 'Continue');
    await waitForNavigation(page);

    // Fill name
    await fillField(page, ['[placeholder*="name" i]', 'input[type="text"]'], 'Test User', 'Name');
    await clickElement(page, ['text=/continue/i'], 'Continue');
    await waitForNavigation(page);

    // Should be at account creation - skip to role
    await clickElement(page, ['text=/continue/i', 'text=/skip/i'], 'Continue');
    await waitForNavigation(page, 3000);

    // Might be at role selection now
    screenshots.push(await captureScreen(page, 'onboarding-role-selection', {
      flow: 'Onboarding',
      step: 4,
      role: 'both',
      purpose: 'Choose between Landlord and Tenant role'
    }));

    console.log(`  ✅ Role screen captured\n`);
  } catch (error) {
    console.error(`  ❌ Role screen error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Document error states
 */
async function documentErrorStates(browser) {
  console.log('\n⚠️  Error States\n');

  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Click sign in
    await clickElement(page, ['text=/sign in/i'], 'Sign In');
    await waitForNavigation(page);

    // Invalid login
    await fillField(page, ['[data-testid="auth-email"]'], 'invalid@test.com', 'Email');
    await fillField(page, ['[data-testid="auth-password"]'], 'wrongpassword', 'Password');
    await clickElement(page, ['[data-testid="auth-submit"]'], 'Submit');
    await waitForNavigation(page, 2000);

    screenshots.push(await captureScreen(page, 'error-login-invalid', {
      flow: 'Error States',
      role: 'both',
      purpose: 'Error message for invalid login credentials'
    }));

    console.log(`  ✅ Error states captured\n`);
  } catch (error) {
    console.error(`  ❌ Error states error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📸 COMPREHENSIVE App Documentation - All Screens');
  console.log('   Complete Property Setup Flow + All Major Screens');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Mode: ${CONFIG.headless ? 'Headless' : 'Headful'}`);
  console.log(`Viewport: ${CONFIG.viewport.width}x${CONFIG.viewport.height}`);
  console.log(`Timeout: ${CONFIG.timeout}ms\n`);
  console.log('🚀 Launching browser...\n');

  await setupDirectories();

  const browser = await chromium.launch({ headless: CONFIG.headless });
  const allScreenshots = [];

  try {
    // 1. Onboarding flow
    const onboarding = await documentOnboardingFlow(browser);
    allScreenshots.push(...onboarding);

    // 2. Landlord Authentication
    console.log('\n🔐 Landlord Authentication\n');
    const landlordAuthPath = path.join(CONFIG.authDir, 'landlord.json');
    const landlordContext = await browser.newContext({ viewport: CONFIG.viewport });
    const landlordPage = await landlordContext.newPage();
    await authenticateAndSaveState(landlordPage, LANDLORD_EMAIL, LANDLORD_PASSWORD, landlordAuthPath);
    await landlordContext.close();

    // 3. COMPLETE Landlord Property Setup Flow
    const propertyFlowResult = await documentLandlordPropertyFlow(browser, landlordAuthPath);
    allScreenshots.push(...propertyFlowResult.screenshots);

    // Use completed auth state (with property) for subsequent landlord flows
    const landlordCompletedAuthPath = propertyFlowResult.completedAuthPath;

    // 4. Landlord Management Screens (use completed auth state)
    const landlordMgmt = await documentLandlordManagementScreens(browser, landlordCompletedAuthPath);
    allScreenshots.push(...landlordMgmt);

    // 5. Landlord Asset Management Flow (use completed auth state)
    const assetFlow = await documentLandlordAssetFlow(browser, landlordCompletedAuthPath);
    allScreenshots.push(...assetFlow);

    // 5b. Asset Detail Screens (Add, Details, Photos, Scanning)
    const assetDetails = await documentAssetDetailScreens(browser, landlordCompletedAuthPath);
    allScreenshots.push(...assetDetails);

    // 6. Tenant Authentication
    console.log('\n🔐 Tenant Authentication\n');
    const tenantAuthPath = path.join(CONFIG.authDir, 'tenant.json');
    const tenantContext = await browser.newContext({ viewport: CONFIG.viewport });
    const tenantPage = await tenantContext.newPage();
    await authenticateAndSaveState(tenantPage, TENANT_EMAIL, TENANT_PASSWORD, tenantAuthPath);
    await tenantContext.close();

    // 7. COMPLETE Tenant Report Issue Flow
    const reportFlow = await documentTenantReportFlow(browser, tenantAuthPath);
    allScreenshots.push(...reportFlow);

    // 8. Tenant Other Screens
    const tenantOther = await documentTenantOtherScreens(browser, tenantAuthPath);
    allScreenshots.push(...tenantOther);

    // 8b. Tenant Follow-Up & Status Screens
    const tenantFollowUp = await documentTenantFollowUpScreens(browser, tenantAuthPath);
    allScreenshots.push(...tenantFollowUp);

    // 9. Shared Screens (Settings, Help, etc.) - use completed auth state
    const sharedScreens = await documentSharedScreens(browser, landlordCompletedAuthPath);
    allScreenshots.push(...sharedScreens);

    // 10. Onboarding Role Selection
    const roleScreen = await documentOnboardingRoleScreen(browser);
    allScreenshots.push(...roleScreen);

    // 10b. Onboarding Variations
    const onboardingVariations = await documentOnboardingVariations(browser);
    allScreenshots.push(...onboardingVariations);

    // 10c. Property Management & Alternative Views
    const propertyMgmt = await documentPropertyManagementScreens(browser, landlordCompletedAuthPath);
    allScreenshots.push(...propertyMgmt);

    // 10d. Utility Screens
    const utilityScreens = await documentUtilityScreens(browser);
    allScreenshots.push(...utilityScreens);

    // 11. Error States
    const errors = await documentErrorStates(browser);
    allScreenshots.push(...errors);

    // 12. Legacy/Deprecated Screens
    const legacyScreens = await documentLegacyScreens(browser);
    allScreenshots.push(...legacyScreens);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Screenshot Generation Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total screenshots: ${allScreenshots.length}`);
    console.log(`   Onboarding Core: ${onboarding.length + roleScreen.length}`);
    console.log(`   Onboarding Variations: ${onboardingVariations.length}`);
    console.log(`   Property Setup Flow: ${propertyFlowResult.screenshots.length}`);
    console.log(`   Landlord Management: ${landlordMgmt.length}`);
    console.log(`   Property Management: ${propertyMgmt.length}`);
    console.log(`   Asset Management List: ${assetFlow.length}`);
    console.log(`   Asset Detail Screens: ${assetDetails.length}`);
    console.log(`   Tenant Report Flow: ${reportFlow.length}`);
    console.log(`   Tenant Other: ${tenantOther.length}`);
    console.log(`   Tenant Follow-Up: ${tenantFollowUp.length}`);
    console.log(`   Shared Screens: ${sharedScreens.length}`);
    console.log(`   Utility Screens: ${utilityScreens.length}`);
    console.log(`   Error states: ${errors.length}`);
    console.log(`   Legacy/Deprecated: ${legacyScreens.length}\n`);
    console.log(`📁 Output:`);
    console.log(`   Screenshots: ${CONFIG.screenshotsDir}`);
    console.log(`   Metadata: ${CONFIG.metadataDir}`);
    console.log(`   Auth states: ${CONFIG.authDir}\n`);
    console.log(`💡 Next step:`);
    console.log(`   node scripts/build-documentation-html.js`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
