#!/usr/bin/env node

/**
 * Timed Single Screen Capture Test
 *
 * Target: Tenant home screen after completing onboarding
 * Goal: Measure actual time/effort required for ONE proper screen capture
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = 'docs/screenshots';

// Timing
const startTime = Date.now();
const log = (step) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${elapsed}s] ${step}`);
};

/**
 * Get file hash
 */
async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Main
 */
async function main() {
  console.log('\n🧪 TIMED SINGLE SCREEN CAPTURE TEST');
  console.log('Target: Tenant home screen (post-onboarding)\n');
  log('START');

  try {
    // STEP 1: Set up database state
    log('Setting up database state...');

    // Check if tenant exists
    const checkTenant = execSync(`
      PGPASSWORD="0KjIkPbSG2sACfLJ" psql \\
        "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \\
        -t -c "SELECT id, email, onboarding_completed FROM profiles WHERE email = 'tenant-doc@myailandlord.com';"
    `).toString().trim();

    console.log(`  Current tenant state: ${checkTenant || 'NOT FOUND'}`);

    // Verify property links
    let propertyLinks = '0';

    // If tenant exists, update their state to "just completed onboarding, no property"
    if (checkTenant) {
      log('Updating tenant to post-onboarding state...');
      execSync(`
        PGPASSWORD="0KjIkPbSG2sACfLJ" psql \\
          "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \\
          -c "UPDATE profiles SET onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com';"
      `);

      // Verify no property links
      propertyLinks = execSync(`
        PGPASSWORD="0KjIkPbSG2sACfLJ" psql \\
          "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \\
          -t -c "SELECT COUNT(*) FROM tenant_property_links WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com');"
      `).toString().trim();

      console.log(`  Tenant has ${propertyLinks} property link(s)`);
    } else {
      console.log('  ⚠️  Tenant does not exist - will use existing auth state anyway');
    }

    log('Database setup complete');

    // STEP 2: Launch browser
    log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: '.auth/tenant.json'
    });
    const page = await context.newPage();

    // STEP 3: Navigate to app
    log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const url = page.url();
    const title = await page.title();
    log(`Landed on: ${url} (${title})`);

    // STEP 4: Capture screenshot
    log('Capturing screenshot...');
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'tenant-home-post-onboarding.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // STEP 5: Verify uniqueness
    log('Verifying uniqueness...');
    const hash = await getFileHash(screenshotPath);

    // Check against existing screenshots
    const existing = await fs.readdir(SCREENSHOTS_DIR);
    const hashes = new Map();

    for (const file of existing) {
      if (file.endsWith('.png') && file !== 'tenant-home-post-onboarding.png') {
        const filePath = path.join(SCREENSHOTS_DIR, file);
        const fileHash = await getFileHash(filePath);
        if (fileHash === hash) {
          hashes.set(file, fileHash);
        }
      }
    }

    if (hashes.size > 0) {
      console.log(`  ❌ DUPLICATE of: ${Array.from(hashes.keys()).join(', ')}`);
      await fs.unlink(screenshotPath);
      log('Deleted duplicate screenshot');
    } else {
      console.log('  ✅ UNIQUE screenshot');

      // Save metadata
      const metadata = {
        name: 'tenant-home-post-onboarding',
        url,
        title,
        timestamp: new Date().toISOString(),
        flow: 'Tenant Onboarding',
        purpose: 'Home screen for tenant who just completed onboarding (no property yet)',
        databaseState: {
          onboardingCompleted: true,
          hasProperty: propertyLinks === '0' ? false : true
        }
      };

      await fs.writeFile(
        path.join('docs/metadata', 'tenant-home-post-onboarding.json'),
        JSON.stringify(metadata, null, 2)
      );

      log('Saved metadata');
    }

    await browser.close();
    log('Browser closed');

    // FINAL REPORT
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n📊 RESULTS\n');
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`🎯 Screen captured: ${hashes.size === 0 ? 'YES (unique)' : 'NO (duplicate)'}`);
    console.log(`📍 URL: ${url}`);
    console.log(`\n📝 Steps involved:`);
    console.log(`  1. Database state setup (query + update)`);
    console.log(`  2. Browser launch with auth state`);
    console.log(`  3. Navigate to app`);
    console.log(`  4. Wait for page load + settle time`);
    console.log(`  5. Capture screenshot`);
    console.log(`  6. Verify uniqueness against ${existing.length} existing screenshots`);
    console.log(`  7. Save metadata`);

    console.log(`\n💡 Extrapolation:`);
    console.log(`  - Time per screen: ~${totalTime}s`);
    console.log(`  - For 59 screens: ~${(totalTime * 59 / 60).toFixed(1)} minutes`);
    console.log(`  - BUT: Assumes no navigation issues, all screens accessible`);
    console.log(`  - Reality: Will need to handle ~20+ navigation failures`);
    console.log(`  - Realistic estimate: 2-4x longer with debugging`);

  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    console.error(error);
  }

  log('END');
}

main();
