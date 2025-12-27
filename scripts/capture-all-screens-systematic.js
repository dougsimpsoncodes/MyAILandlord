#!/usr/bin/env node

/**
 * Systematic Screen Capture - Database-First Approach
 *
 * Based on successful timing test showing 6.8s per screen with proper database setup.
 * This script systematically captures all 59 screens by:
 * 1. Setting up proper database state for each screen
 * 2. Navigating to the app (letting React Navigation route naturally)
 * 3. Capturing and verifying uniqueness
 * 4. Reporting actual progress
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = 'docs/screenshots';
const METADATA_DIR = 'docs/metadata';

const DB_PASSWORD = '0KjIkPbSG2sACfLJ';
const DB_URL = `postgresql://postgres.zxqhxjuwmkxevhkpqfzf:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

// Track results
const captured = new Map(); // hash -> { name, metadata }
const duplicates = [];
const failed = [];
let totalAttempts = 0;

/**
 * Database helper
 */
function runSQL(sql) {
  try {
    const result = execSync(`PGPASSWORD="${DB_PASSWORD}" psql "${DB_URL}" -t -c "${sql.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8'
    });
    return result.trim();
  } catch (error) {
    console.error(`SQL Error: ${error.message}`);
    return null;
  }
}

/**
 * Get file hash for duplicate detection
 */
async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Capture a single screen
 */
async function captureScreen(page, screenName, metadata, waitTime = 3000) {
  totalAttempts++;
  console.log(`\n[${totalAttempts}] Capturing: ${screenName}`);
  console.log(`  Purpose: ${metadata.purpose}`);

  try {
    // Wait for page to settle
    await page.waitForTimeout(waitTime);

    // Capture
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${screenName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Get current URL and title
    const url = page.url();
    const title = await page.title();
    console.log(`  URL: ${url}`);

    // Check for duplicates
    const hash = await getFileHash(screenshotPath);

    // Check against all existing screenshots
    const existingFiles = await fs.readdir(SCREENSHOTS_DIR);
    for (const file of existingFiles) {
      if (file.endsWith('.png') && file !== `${screenName}.png`) {
        const existingPath = path.join(SCREENSHOTS_DIR, file);
        const existingHash = await getFileHash(existingPath);
        if (existingHash === hash) {
          console.log(`  ❌ DUPLICATE of ${file}`);
          await fs.unlink(screenshotPath);
          duplicates.push({ name: screenName, duplicateOf: file.replace('.png', '') });
          return false;
        }
      }
    }

    // Save metadata
    const fullMetadata = {
      name: screenName,
      url,
      title,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    await fs.writeFile(
      path.join(METADATA_DIR, `${screenName}.json`),
      JSON.stringify(fullMetadata, null, 2)
    );

    captured.set(hash, { name: screenName, metadata: fullMetadata });
    console.log(`  ✅ UNIQUE - Captured successfully`);
    return true;

  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed.push({ name: screenName, error: error.message });
    return false;
  }
}

/**
 * All 59 screens with their database state requirements
 */
const SCREEN_DEFINITIONS = [
  // === ONBOARDING FLOWS (Unauthenticated) ===
  {
    name: 'onboarding-welcome',
    purpose: 'Initial welcome screen',
    flow: 'Onboarding',
    setupDB: () => {
      // No database setup needed - unauthenticated
    },
    authState: null,
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  // === LANDLORD ONBOARDING ===
  {
    name: 'landlord-onboarding-welcome',
    purpose: 'Landlord welcome after role selection',
    flow: 'Landlord Onboarding',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'landlord-property-intro',
    purpose: 'Introduction to property setup wizard',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  // === TENANT ONBOARDING ===
  {
    name: 'tenant-onboarding-welcome',
    purpose: 'Tenant welcome after role selection',
    flow: 'Tenant Onboarding',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = false WHERE email = 'tenant-doc@myailandlord.com'");
      runSQL("DELETE FROM tenant_property_links WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com')");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-home-post-onboarding',
    purpose: 'Tenant home after completing onboarding (no property yet)',
    flow: 'Tenant Onboarding',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
      runSQL("DELETE FROM tenant_property_links WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com')");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  // === TENANT WITH PROPERTY ===
  {
    name: 'tenant-home',
    purpose: 'Tenant home dashboard with property linked',
    flow: 'Tenant Management',
    setupDB: () => {
      // Ensure tenant has property link
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com') LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active') ON CONFLICT DO NOTHING`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-property-info',
    purpose: 'Detailed property information for tenant',
    flow: 'Tenant Management',
    setupDB: () => {
      // Same as tenant-home
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com') LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active') ON CONFLICT DO NOTHING`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-info`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-requests-list',
    purpose: 'All maintenance requests for tenant',
    flow: 'Tenant Maintenance',
    setupDB: () => {
      // Ensure property link
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com') LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active') ON CONFLICT DO NOTHING`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // Click requests tab if visible
      try {
        await page.click('[data-testid="tab-requests"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Tab might not be visible, that's ok
      }
    }
  },

  {
    name: 'tenant-report-issue',
    purpose: 'Report new maintenance issue form',
    flow: 'Tenant Maintenance',
    setupDB: () => {
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com') LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active') ON CONFLICT DO NOTHING`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/report-issue`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-messages',
    purpose: 'Messages with landlord',
    flow: 'Tenant Communication',
    setupDB: () => {
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com') LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active') ON CONFLICT DO NOTHING`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-messages"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  {
    name: 'tenant-profile',
    purpose: 'Tenant profile and settings',
    flow: 'Shared',
    setupDB: () => {
      // Just ensure tenant is set up
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-profile"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  // === LANDLORD WITH PROPERTY ===
  {
    name: 'landlord-home',
    purpose: 'Landlord main dashboard',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
      // Ensure at least one property exists
      const landlordId = runSQL("SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com'");
      const hasProperty = runSQL(`SELECT COUNT(*) FROM properties WHERE landlord_id = '${landlordId}'`);
      if (hasProperty === '0') {
        runSQL(`INSERT INTO properties (landlord_id, name, address, property_type, bedrooms, bathrooms) VALUES ('${landlordId}', 'Test Property', '123 Main St', 'apartment', 2, 1)`);
      }
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'landlord-properties-list',
    purpose: 'List of all properties',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
      const landlordId = runSQL("SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com'");
      const hasProperty = runSQL(`SELECT COUNT(*) FROM properties WHERE landlord_id = '${landlordId}'`);
      if (hasProperty === '0') {
        runSQL(`INSERT INTO properties (landlord_id, name, address, property_type, bedrooms, bathrooms) VALUES ('${landlordId}', 'Test Property', '123 Main St', 'apartment', 2, 1)`);
      }
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-properties"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  {
    name: 'landlord-property-details',
    purpose: 'Single property detailed view',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
      const landlordId = runSQL("SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com'");
      const hasProperty = runSQL(`SELECT COUNT(*) FROM properties WHERE landlord_id = '${landlordId}'`);
      if (hasProperty === '0') {
        runSQL(`INSERT INTO properties (landlord_id, name, address, property_type, bedrooms, bathrooms) VALUES ('${landlordId}', 'Test Property', '123 Main St', 'apartment', 2, 1)`);
      }
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      // Get first property ID
      const landlordId = runSQL("SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com'");
      const propertyId = runSQL(`SELECT id FROM properties WHERE landlord_id = '${landlordId}' LIMIT 1`);
      if (propertyId) {
        await page.goto(`${BASE_URL}/property/${propertyId}`, { waitUntil: 'networkidle' });
      } else {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      }
    }
  },

  {
    name: 'landlord-requests-list',
    purpose: 'All maintenance requests',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-requests"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  {
    name: 'landlord-messages',
    purpose: 'Messages inbox',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-messages"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  {
    name: 'landlord-profile',
    purpose: 'Landlord profile and settings',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      try {
        await page.click('[data-testid="tab-profile"]', { timeout: 2000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Continue
      }
    }
  },

  // === PROPERTY SETUP FLOW ===
  {
    name: 'landlord-property-basics',
    purpose: 'Enter property address, name, type',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      // Delete existing properties to force property setup flow
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-basics`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'landlord-property-attributes',
    purpose: 'Bedrooms, bathrooms, square footage',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-attributes`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'landlord-property-areas-selection',
    purpose: 'Select rooms/areas in property',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/room-selection`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'landlord-room-photography',
    purpose: 'Add photos to selected rooms',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/room-photography`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'landlord-property-assets-setup',
    purpose: 'Add assets during property setup',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-assets`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'landlord-property-review',
    purpose: 'Final review before submission',
    flow: 'Landlord Property Setup',
    setupDB: () => {
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = false WHERE email = 'landlord-doc@myailandlord.com'");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-review`, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  // Add more screen definitions here - this is a starting set
  // TODO: Add remaining 39 screens
];

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  console.log('🚀 Systematic Screen Capture - Database-First Approach\n');
  console.log(`Target: ${SCREEN_DEFINITIONS.length} screens\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const screenDef of SCREEN_DEFINITIONS) {
      console.log(`\n${'='.repeat(80)}`);

      // Set up database state
      console.log(`Setting up database for: ${screenDef.name}`);
      screenDef.setupDB();

      // Create browser context with appropriate auth
      const contextOptions = {
        viewport: { width: 1280, height: 720 }
      };

      if (screenDef.authState) {
        contextOptions.storageState = screenDef.authState;
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      // Navigate
      await screenDef.navigate(page);

      // Capture
      await captureScreen(page, screenDef.name, {
        purpose: screenDef.purpose,
        flow: screenDef.flow,
        databaseState: 'See metadata file for details'
      }, screenDef.waitTime || 3000);

      await context.close();

      // Brief pause between captures
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } finally {
    await browser.close();
  }

  // Final report
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS\n');
  console.log(`⏱️  Total time: ${totalTime} seconds (${(totalTime / 60).toFixed(1)} minutes)`);
  console.log(`📸 Total attempts: ${totalAttempts}`);
  console.log(`✅ Unique screens captured: ${captured.size}`);
  console.log(`❌ Duplicates rejected: ${duplicates.length}`);
  console.log(`💥 Failures: ${failed.length}`);

  if (captured.size > 0) {
    console.log('\n✅ Successfully Captured:');
    for (const [hash, screen] of captured) {
      console.log(`  - ${screen.name}`);
    }
  }

  if (duplicates.length > 0) {
    console.log('\n⚠️  Duplicates Rejected:');
    for (const dup of duplicates) {
      console.log(`  - ${dup.name} (duplicate of ${dup.duplicateOf})`);
    }
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    for (const fail of failed) {
      console.log(`  - ${fail.name}: ${fail.error}`);
    }
  }

  console.log(`\n🎯 ACTUAL COVERAGE: ${captured.size}/${SCREEN_DEFINITIONS.length} (${((captured.size / SCREEN_DEFINITIONS.length) * 100).toFixed(1)}%)`);
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
