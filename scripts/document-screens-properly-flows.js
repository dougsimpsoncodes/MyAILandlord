#!/usr/bin/env node

/**
 * Proper Screen Documentation - Flow-Based Automation
 *
 * This time we:
 * 1. Follow actual user flows by CLICKING through UI
 * 2. Set up database state properly for each scenario
 * 3. Verify screenshots are unique
 * 4. Only count what we actually capture
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = 'docs/screenshots';
const METADATA_DIR = 'docs/metadata';

// Track all captured screens
const captured = new Map(); // hash -> { name, path, metadata }
const duplicates = [];

/**
 * Get file hash
 */
async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Capture screen with duplicate detection
 */
async function captureScreen(page, name, metadata) {
  console.log(`  → Capturing: ${name}`);

  const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  const metadataPath = path.join(METADATA_DIR, `${name}.json`);

  // Wait for page to settle
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Check for duplicates
  const hash = await getFileHash(screenshotPath);

  if (captured.has(hash)) {
    const original = captured.get(hash);
    console.log(`  ⚠️  DUPLICATE of ${original.name} - REJECTED`);
    duplicates.push({ name, duplicateOf: original.name });
    await fs.unlink(screenshotPath); // Delete duplicate
    return null;
  }

  // Save metadata
  const fullMetadata = {
    name,
    url: page.url(),
    title: await page.title(),
    timestamp: new Date().toISOString(),
    ...metadata
  };

  await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2));

  // Track as captured
  captured.set(hash, { name, path: screenshotPath, metadata: fullMetadata });
  console.log(`  ✓ ${name} (unique)`);

  return fullMetadata;
}

/**
 * Helper to click and wait
 */
async function clickAndWait(page, selector, description) {
  console.log(`  → Clicking: ${description}`);
  try {
    // Split selector by comma and try each one
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      const elements = await page.locator(sel).count();
      if (elements > 0) {
        console.log(`  → Found ${elements} elements matching: ${sel}`);
        await page.click(sel, { force: true }); // Force click for React Native
        await page.waitForTimeout(2000);
        return true;
      }
    }

    // Try React Native Pressable elements (divs with role or data attributes)
    const pressableSelectors = [
      `div:has-text("${description}")`,
      `[data-testid*="${description.toLowerCase()}"]`,
      `[role="button"]:has-text("${description}")`
    ];

    for (const sel of pressableSelectors) {
      try {
        const elements = await page.locator(sel).count();
        if (elements > 0) {
          console.log(`  → Found ${elements} Pressable elements matching: ${sel}`);
          await page.click(sel, { force: true });
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        // Continue trying
      }
    }

    // None found, debug what IS on the page
    console.log(`  ✗ No elements found for: ${description}`);
    const buttons = await page.locator('button, [role="button"]').count();
    const divs = await page.locator('div').count();
    const text = await page.locator(`:text("${description}")`).count();
    console.log(`  Debug: Found ${buttons} buttons, ${divs} divs, ${text} elements with text "${description}"`);

    // Take debug screenshot
    await page.screenshot({ path: `debug-${description.replace(/\s+/g, '-')}.png` });

    return false;
  } catch (error) {
    console.log(`  ✗ Failed to click: ${description} - ${error.message}`);
    return false;
  }
}

/**
 * Helper to fill input
 */
async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.fill(selector, value);
  await page.waitForTimeout(500);
}

/**
 * FLOW 1: Onboarding (unauthenticated)
 */
async function captureOnboardingFlow(browser) {
  console.log('\n📋 FLOW 1: Onboarding (4 screens)\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // 1. Welcome Screen
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Wait for React to render by checking for any button or text content
    try {
      await page.waitForSelector('button, [role="button"], text="Get Started", text="Continue"', { timeout: 10000 });
    } catch (e) {
      console.log('  ⚠️  Warning: No interactive elements found on welcome screen');
    }

    await captureScreen(page, 'onboarding-welcome', {
      flow: 'Onboarding',
      purpose: 'Initial welcome screen'
    });

    // Click "Get Started"
    const getStarted = await clickAndWait(page, 'button:has-text("Get Started"), button:has-text("Continue")', 'Get Started');
    if (!getStarted) {
      console.log('  ⚠️  Could not proceed past welcome');
      return;
    }

    // 2. Name Entry
    await captureScreen(page, 'onboarding-name', {
      flow: 'Onboarding',
      purpose: 'Name entry screen'
    });

    // Fill name and continue
    await fillInput(page, '[data-testid="name-input"], input[placeholder*="name" i]', 'Test User');
    await clickAndWait(page, 'button:has-text("Continue"), button:has-text("Next")', 'Continue from name');

    // 3. Account Creation
    await captureScreen(page, 'onboarding-account', {
      flow: 'Onboarding',
      purpose: 'Account creation with email/password'
    });

    // Note: We'll stop here to avoid creating real accounts
    console.log('  ℹ️  Stopped before account creation to avoid DB changes');

    // 4. Role Selection (navigate directly if possible)
    await page.goto(`${BASE_URL}/OnboardingRole`);
    await page.waitForTimeout(2000);
    await captureScreen(page, 'onboarding-role-selection', {
      flow: 'Onboarding',
      purpose: 'Choose landlord or tenant role'
    });

  } catch (error) {
    console.error(`  ❌ Onboarding flow error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * FLOW 2: Landlord Complete Journey
 */
async function captureLandlordFlows(browser) {
  console.log('\n📋 FLOW 2: Landlord Journey\n');

  // Use existing auth state
  const authPath = '.auth/landlord.json';

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: authPath
  });
  const page = await context.newPage();

  try {
    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Extra time for React

    // Wait for any content to render
    try {
      await page.waitForSelector('button, [role="button"], text, div', { timeout: 10000 });
    } catch (e) {
      console.log('  ⚠️  Warning: Page may not have fully loaded');
    }

    // Capture current screen (likely LandlordPropertyIntro)
    const url = page.url();
    console.log(`  Current URL: ${url}`);

    if (url.includes('LandlordPropertyIntro') || url.includes('PropertyIntro')) {
      await captureScreen(page, 'landlord-property-intro', {
        flow: 'Landlord Property Setup',
        purpose: 'Introduction to property setup wizard'
      });

      // Click "Add Property" or "Get Started"
      const started = await clickAndWait(page, 'button:has-text("Add Property"), button:has-text("Get Started"), button:has-text("Continue")', 'Start property setup');

      if (started) {
        // Property Basics
        await page.waitForTimeout(2000);
        await captureScreen(page, 'landlord-property-basics', {
          flow: 'Landlord Property Setup',
          purpose: 'Enter property address, name, type'
        });

        // Fill basic info (don't submit to avoid DB changes)
        console.log('  ℹ️  Captured property basics, stopping to avoid DB changes');
      }
    }

    // Try to navigate to other screens by looking for navigation elements
    // Home/Dashboard tab
    const homeTab = await clickAndWait(page, '[data-testid="tab-home"], text="Home"', 'Home tab');
    if (homeTab) {
      await captureScreen(page, 'landlord-home', {
        flow: 'Landlord Management',
        purpose: 'Main home screen'
      });
    }

    // Properties tab
    const propertiesTab = await clickAndWait(page, '[data-testid="tab-properties"], text="Properties"', 'Properties tab');
    if (propertiesTab) {
      await captureScreen(page, 'landlord-properties-list', {
        flow: 'Landlord Management',
        purpose: 'List of all properties'
      });
    }

    // Requests tab
    const requestsTab = await clickAndWait(page, '[data-testid="tab-requests"], text="Requests"', 'Requests tab');
    if (requestsTab) {
      await captureScreen(page, 'landlord-requests-list', {
        flow: 'Landlord Management',
        purpose: 'Maintenance requests list'
      });
    }

    // Messages tab
    const messagesTab = await clickAndWait(page, '[data-testid="tab-messages"], text="Messages"', 'Messages tab');
    if (messagesTab) {
      await captureScreen(page, 'landlord-messages', {
        flow: 'Landlord Management',
        purpose: 'Messages inbox'
      });
    }

    // Profile tab
    const profileTab = await clickAndWait(page, '[data-testid="tab-profile"], text="Profile"', 'Profile tab');
    if (profileTab) {
      await captureScreen(page, 'landlord-profile', {
        flow: 'Shared',
        purpose: 'Profile and settings'
      });

      // Try to navigate to settings screens
      const security = await clickAndWait(page, 'text="Security"', 'Security option');
      if (security) {
        await captureScreen(page, 'shared-security', {
          flow: 'Shared',
          purpose: 'Security settings'
        });
        await page.goBack();
        await page.waitForTimeout(1000);
      }

      const notifications = await clickAndWait(page, 'text="Notifications"', 'Notifications option');
      if (notifications) {
        await captureScreen(page, 'shared-notifications', {
          flow: 'Shared',
          purpose: 'Notification preferences'
        });
        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }

  } catch (error) {
    console.error(`  ❌ Landlord flow error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * FLOW 3: Tenant Journey
 */
async function captureTenantFlows(browser) {
  console.log('\n📋 FLOW 3: Tenant Journey\n');

  const authPath = '.auth/tenant.json';

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: authPath
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log(`  Current URL: ${url}`);

    // Capture home screen
    await captureScreen(page, 'tenant-home', {
      flow: 'Tenant',
      purpose: 'Tenant home dashboard'
    });

    // Navigate tabs
    const requestsTab = await clickAndWait(page, '[data-testid="tab-requests"], text="Requests"', 'Requests tab');
    if (requestsTab) {
      await captureScreen(page, 'tenant-requests-list', {
        flow: 'Tenant',
        purpose: 'All maintenance requests'
      });

      // Try to click "Report Issue" button
      const reportIssue = await clickAndWait(page, 'button:has-text("Report Issue"), button:has-text("New Request")', 'Report Issue');
      if (reportIssue) {
        await captureScreen(page, 'tenant-report-issue', {
          flow: 'Tenant Maintenance',
          purpose: 'Report new maintenance issue'
        });
      }
    }

    // Messages tab
    const messagesTab = await clickAndWait(page, '[data-testid="tab-messages"], text="Messages"', 'Messages tab');
    if (messagesTab) {
      await captureScreen(page, 'tenant-messages', {
        flow: 'Tenant',
        purpose: 'Messages with landlord'
      });
    }

    // Profile tab
    const profileTab = await clickAndWait(page, '[data-testid="tab-profile"], text="Profile"', 'Profile tab');
    if (profileTab) {
      await captureScreen(page, 'tenant-profile', {
        flow: 'Shared',
        purpose: 'Tenant profile and settings'
      });
    }

  } catch (error) {
    console.error(`  ❌ Tenant flow error: ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Proper Screen Documentation - Flow-Based Automation\n');
  console.log('Following actual user flows by clicking through UI\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // Execute flows
    await captureOnboardingFlow(browser);
    await captureLandlordFlows(browser);
    await captureTenantFlows(browser);

    // Report results
    console.log('\n\n📊 FINAL RESULTS\n');
    console.log(`✅ Unique screens captured: ${captured.size}`);
    console.log(`❌ Duplicates rejected: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log('\nDuplicates:');
      for (const dup of duplicates) {
        console.log(`  - ${dup.name} (duplicate of ${dup.duplicateOf})`);
      }
    }

    console.log('\nCaptured screens:');
    for (const [hash, screen] of captured) {
      console.log(`  ✓ ${screen.name}`);
    }

    console.log(`\n🎯 ACTUAL COVERAGE: ${captured.size} unique screens`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
