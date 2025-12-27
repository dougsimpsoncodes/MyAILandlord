#!/usr/bin/env node

/**
 * Proper App Documentation Script
 *
 * This time we:
 * 1. Use ACTUAL screen route names
 * 2. VERIFY we're on the right screen before capturing
 * 3. Report failures honestly
 * 4. Only count real, unique screenshots
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const BASE_URL = 'http://localhost:8081';

const CONFIG = {
  viewport: { width: 1280, height: 720 },
  screenshotsDir: 'docs/screenshots',
  metadataDir: 'docs/metadata',
  authDir: '.auth',
};

// Test credentials
const LANDLORD_EMAIL = 'landlord-doc@myailandlord.com';
const LANDLORD_PASSWORD = 'TestDoc2025!';
const TENANT_EMAIL = 'tenant-doc@myailandlord.com';
const TENANT_PASSWORD = 'TestDoc2025!';

// Complete screen definitions with routes
const SCREENS = {
  onboarding: [
    { route: 'OnboardingWelcome', name: 'onboarding-welcome', purpose: 'Initial welcome screen' },
    { route: 'OnboardingName', name: 'onboarding-name', purpose: 'Name entry' },
    { route: 'OnboardingAccount', name: 'onboarding-account', purpose: 'Account creation' },
    { route: 'OnboardingRole', name: 'onboarding-role-selection', purpose: 'Role selection' },
  ],
  landlordOnboarding: [
    { route: 'LandlordOnboardingWelcome', name: 'landlord-onboarding-welcome', purpose: 'Landlord welcome', auth: 'landlord' },
    { route: 'LandlordOnboardingSuccess', name: 'landlord-onboarding-success', purpose: 'Landlord onboarding complete', auth: 'landlord' },
    { route: 'LandlordTenantInvite', name: 'landlord-tenant-invite-onboarding', purpose: 'Invite first tenant', auth: 'landlord' },
  ],
  tenantOnboarding: [
    { route: 'TenantOnboardingWelcome', name: 'tenant-onboarding-welcome', purpose: 'Tenant welcome', auth: 'tenant' },
    { route: 'TenantOnboardingSuccess', name: 'tenant-onboarding-success', purpose: 'Tenant onboarding complete', auth: 'tenant' },
    { route: 'TenantInviteRoommate', name: 'tenant-invite-roommate', purpose: 'Invite roommate', auth: 'tenant' },
  ],
  landlordPropertySetup: [
    { route: 'PropertyBasics', name: 'landlord-property-basics', purpose: 'Address, name, type', auth: 'landlord' },
    { route: 'PropertyAttributes', name: 'landlord-property-attributes', purpose: 'Bedrooms, bathrooms, sqft', auth: 'landlord' },
    { route: 'RoomSelection', name: 'landlord-property-areas', purpose: 'Select rooms', auth: 'landlord' },
    { route: 'RoomPhotography', name: 'landlord-room-photography', purpose: 'Add photos to rooms', auth: 'landlord' },
    { route: 'PropertyAssets', name: 'landlord-property-assets-list', purpose: 'Asset list during setup', auth: 'landlord' },
    { route: 'PropertyReview', name: 'landlord-property-review', purpose: 'Final review', auth: 'landlord' },
  ],
  landlordManagement: [
    { route: 'LandlordHomeMain', name: 'landlord-home', purpose: 'Home screen', auth: 'landlord-completed' },
    { route: 'Dashboard', name: 'landlord-dashboard', purpose: 'Dashboard view', auth: 'landlord-completed' },
    { route: 'PropertyManagementMain', name: 'landlord-properties-list', purpose: 'All properties', auth: 'landlord-completed' },
    { route: 'PropertyDetails?propertyId=PROPERTY_ID', name: 'landlord-property-details', purpose: 'Single property view', auth: 'landlord-completed' },
    { route: 'InviteTenant?propertyId=PROPERTY_ID', name: 'landlord-invite-tenant', purpose: 'Send tenant invitation', auth: 'landlord-completed' },
    { route: 'LandlordRequestsMain', name: 'landlord-requests-list', purpose: 'Maintenance requests', auth: 'landlord-completed' },
    { route: 'CaseDetail?requestId=REQUEST_ID', name: 'landlord-case-detail', purpose: 'Case details', auth: 'landlord-completed' },
    { route: 'LandlordMessagesMain', name: 'landlord-messages', purpose: 'Messages', auth: 'landlord-completed' },
    { route: 'LandlordChat?recipientId=TENANT_ID', name: 'landlord-chat', purpose: 'Chat conversation', auth: 'landlord-completed' },
  ],
  landlordAssets: [
    { route: 'AddAsset?areaId=AREA_ID', name: 'landlord-add-asset', purpose: 'Add asset form', auth: 'landlord-completed' },
    { route: 'AssetDetails?assetId=ASSET_ID', name: 'landlord-asset-details', purpose: 'Asset details', auth: 'landlord-completed' },
    { route: 'AssetPhotos?assetId=ASSET_ID', name: 'landlord-asset-photos', purpose: 'Asset photos', auth: 'landlord-completed' },
    { route: 'AssetScanning', name: 'landlord-asset-scanning', purpose: 'AI asset scanning', auth: 'landlord-completed' },
  ],
  tenant: [
    { route: 'TenantHomeMain', name: 'tenant-home', purpose: 'Home dashboard', auth: 'tenant' },
    { route: 'PropertyInfo', name: 'tenant-property-info', purpose: 'Property details', auth: 'tenant' },
    { route: 'PropertyWelcome', name: 'tenant-property-welcome', purpose: 'Welcome after connection', auth: 'tenant' },
    { route: 'ReportIssue', name: 'tenant-report-issue', purpose: 'Report maintenance issue', auth: 'tenant' },
    { route: 'ReviewIssue', name: 'tenant-review-issue', purpose: 'Review before submit', auth: 'tenant' },
    { route: 'ConfirmSubmission', name: 'tenant-confirm-submission', purpose: 'Confirm submission', auth: 'tenant' },
    { route: 'SubmissionSuccess', name: 'tenant-submission-success', purpose: 'Success confirmation', auth: 'tenant' },
    { route: 'FollowUp?requestId=REQUEST_ID', name: 'tenant-follow-up', purpose: 'Follow up on request', auth: 'tenant' },
    { route: 'TenantRequestsMain', name: 'tenant-requests-list', purpose: 'All requests', auth: 'tenant' },
    { route: 'TenantMessagesMain', name: 'tenant-messages', purpose: 'Messages', auth: 'tenant' },
    { route: 'CommunicationHub', name: 'tenant-communication-hub', purpose: 'Communication hub', auth: 'tenant' },
  ],
  shared: [
    { route: 'LandlordProfileMain', name: 'shared-landlord-profile', purpose: 'Landlord profile', auth: 'landlord-completed' },
    { route: 'EditProfile', name: 'shared-edit-profile', purpose: 'Edit profile', auth: 'landlord-completed' },
    { route: 'Security', name: 'shared-security', purpose: 'Security settings', auth: 'landlord-completed' },
    { route: 'Notifications', name: 'shared-notifications', purpose: 'Notification preferences', auth: 'landlord-completed' },
    { route: 'HelpCenter', name: 'shared-help-center', purpose: 'Help center', auth: 'landlord-completed' },
    { route: 'ContactSupport', name: 'shared-contact-support', purpose: 'Contact support', auth: 'landlord-completed' },
  ],
  legacy: [
    { route: 'PropertyCodeEntry', name: 'legacy-property-code-entry', purpose: '[DEPRECATED] 6-char code entry' },
    { route: 'InviteAccept', name: 'legacy-invite-accept', purpose: '[DEPRECATED] Old invite system' },
    { route: 'PropertyInviteAccept', name: 'legacy-property-invite-accept', purpose: '[DEPRECATED] Old property invite' },
  ],
  error: [
    { route: 'Auth', name: 'error-login-invalid', purpose: 'Invalid login' },
  ],
};

// Track results
const results = {
  succeeded: [],
  failed: [],
  duplicates: new Map(), // hash -> [filenames]
};

/**
 * Authenticate and save state
 */
async function authenticateAndSaveState(browser, email, password, authStatePath) {
  console.log(`\n🔐 Authenticating as ${email}...`);
  const page = await browser.newPage();

  try {
    // Navigate to base URL which should show auth if not logged in
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Wait for React to render

    // Debug: take screenshot to see what's on screen
    await page.screenshot({ path: 'debug-auth-screen.png' });
    const url = page.url();
    const title = await page.title();
    console.log(`  Debug: URL=${url}, Title=${title}`);

    // Wait for email input to be visible
    await page.waitForSelector('[data-testid="auth-email"]', { timeout: 10000 });

    await page.fill('[data-testid="auth-email"]', email);
    await page.fill('[data-testid="auth-password"]', password);

    // Click submit button
    await page.click('[data-testid="auth-submit"]');

    // Wait for navigation away from auth screen
    await page.waitForTimeout(5000);

    await page.context().storageState({ path: authStatePath });
    console.log(`✓ Auth state saved: ${authStatePath}`);
  } catch (error) {
    console.error(`❌ Authentication failed: ${error.message}`);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Calculate file hash to detect duplicates
 */
async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Capture a screen with verification
 */
async function captureScreenVerified(page, screenDef, testData = {}) {
  const { route, name, purpose, auth } = screenDef;

  try {
    // Build URL with test data substitution
    let url = `${BASE_URL}/${route}`;
    url = url.replace('PROPERTY_ID', testData.propertyId || '');
    url = url.replace('ASSET_ID', testData.assetId || '');
    url = url.replace('AREA_ID', testData.areaId || '');
    url = url.replace('TENANT_ID', testData.tenantId || '');
    url = url.replace('REQUEST_ID', testData.requestId || '');

    // Navigate
    console.log(`  → ${name}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(3000); // Let animations settle

    // Verify we're on the right screen
    const currentUrl = page.url();
    const title = await page.title();

    // Basic verification: URL should contain the route name
    const routeBase = route.split('?')[0];
    if (!currentUrl.includes(routeBase) && !currentUrl.includes(name)) {
      throw new Error(`URL mismatch: expected route "${routeBase}", got "${currentUrl}"`);
    }

    // Take screenshot
    const screenshotPath = path.join(CONFIG.screenshotsDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Check for duplicates
    const hash = await getFileHash(screenshotPath);
    if (results.duplicates.has(hash)) {
      results.duplicates.get(hash).push(name);
      console.log(`  ⚠️  WARNING: Duplicate of ${results.duplicates.get(hash)[0]}`);
    } else {
      results.duplicates.set(hash, [name]);
    }

    // Save metadata
    const metadata = {
      screenName: name,
      route,
      url: currentUrl,
      title,
      purpose,
      timestamp: new Date().toISOString(),
    };

    const metadataPath = path.join(CONFIG.metadataDir, `${name}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`  ✓ ${name}`);
    results.succeeded.push(name);
    return metadata;

  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    results.failed.push({ name, route, error: error.message });
    return null;
  }
}

/**
 * Main automation
 */
async function main() {
  console.log('🚀 Starting PROPER App Documentation\n');
  console.log('This time we verify each screen before capturing!\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // Setup auth states (use existing ones)
    const landlordAuthPath = path.join(CONFIG.authDir, 'landlord.json');
    const landlordCompletedAuthPath = path.join(CONFIG.authDir, 'landlord.json'); // Use same for now
    const tenantAuthPath = path.join(CONFIG.authDir, 'tenant.json');

    console.log('✓ Using existing auth states from .auth/ directory');

    // Get test data IDs from database
    // TODO: Query actual IDs from database
    const testData = {
      propertyId: '2a17b6c7-5f4f-4cdb-a707-d5b24d364fc7',
      assetId: 'a1111111-1111-1111-1111-111111111111',
      areaId: '12bae404-1e9f-4d77-964e-a57a122ec78d',
      tenantId: 'tenant-user-id', // TODO: Get real ID
      requestId: 'request-id', // TODO: Get real ID
    };

    // Document each category
    for (const [category, screens] of Object.entries(SCREENS)) {
      console.log(`\n📋 ${category.toUpperCase()}\n`);

      for (const screen of screens) {
        // Determine which auth state to use
        let authStatePath = null;
        if (screen.auth === 'landlord') authStatePath = landlordAuthPath;
        else if (screen.auth === 'landlord-completed') authStatePath = landlordCompletedAuthPath;
        else if (screen.auth === 'tenant') authStatePath = tenantAuthPath;

        const context = await browser.newContext({
          viewport: CONFIG.viewport,
          storageState: authStatePath,
        });
        const page = await context.newPage();

        await captureScreenVerified(page, screen, testData);

        await context.close();
      }
    }

    // Report results
    console.log('\n\n📊 RESULTS\n');
    console.log(`✅ Succeeded: ${results.succeeded.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Screens:');
      for (const failure of results.failed) {
        console.log(`  - ${failure.name} (${failure.route}): ${failure.error}`);
      }
    }

    // Check for duplicates
    const duplicateGroups = Array.from(results.duplicates.values()).filter(g => g.length > 1);
    if (duplicateGroups.length > 0) {
      console.log(`\n⚠️  DUPLICATES FOUND: ${duplicateGroups.length} groups\n`);
      for (const group of duplicateGroups) {
        console.log(`  ${group.join(', ')}`);
      }
    } else {
      console.log('\n✅ All screenshots are unique!');
    }

    console.log(`\n🎯 ACTUAL UNIQUE SCREENS: ${results.duplicates.size}`);

  } finally {
    await browser.close();
  }
}

// Run
main().catch(console.error);
