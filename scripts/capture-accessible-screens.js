#!/usr/bin/env node

/**
 * Realistic Screen Capture - Focus on Accessible Routes
 *
 * Based on testing, only certain routes are directly accessible.
 * This script focuses on those routes plus state-based natural routing.
 *
 * Success rate from systematic testing: 5/23 (21.7%)
 * Strategy: Capture what we CAN, document what we can't
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

const captured = new Map();
const duplicates = [];
const failed = [];
let totalAttempts = 0;

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

async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

async function captureScreen(page, screenName, metadata, waitTime = 3000) {
  totalAttempts++;
  console.log(`\n[${totalAttempts}] ${screenName}`);
  console.log(`  Purpose: ${metadata.purpose}`);

  try {
    await page.waitForTimeout(waitTime);

    const screenshotPath = path.join(SCREENSHOTS_DIR, `${screenName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const url = page.url();
    const title = await page.title();
    console.log(`  URL: ${url}`);

    // Check for duplicates
    const hash = await getFileHash(screenshotPath);
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
    console.log(`  ✅ UNIQUE`);
    return true;

  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed.push({ name: screenName, error: error.message });
    return false;
  }
}

/**
 * Accessible screens based on successful testing
 */
const ACCESSIBLE_SCREENS = [
  // === ONBOARDING (unauthenticated) ===
  {
    name: 'onboarding-welcome',
    purpose: 'Initial welcome screen',
    flow: 'Onboarding',
    setupDB: () => {},
    authState: null,
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  // === TENANT SCREENS (accessible routes) ===
  {
    name: 'tenant-home-post-onboarding',
    purpose: 'Tenant home after completing onboarding (no property)',
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

  {
    name: 'tenant-home-with-property',
    purpose: 'Tenant home dashboard with property linked',
    flow: 'Tenant Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`DELETE FROM tenant_property_links WHERE tenant_id = '${tenantId}'`);
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active')`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    },
    waitTime: 4000
  },

  {
    name: 'tenant-property-info',
    purpose: 'Property details and information',
    flow: 'Tenant Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`DELETE FROM tenant_property_links WHERE tenant_id = '${tenantId}'`);
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active')`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-info`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-report-issue',
    purpose: 'Report new maintenance issue',
    flow: 'Tenant Maintenance',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
      const tenantId = runSQL("SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com'");
      const propertyId = runSQL("SELECT id FROM properties LIMIT 1");
      if (tenantId && propertyId) {
        runSQL(`DELETE FROM tenant_property_links WHERE tenant_id = '${tenantId}'`);
        runSQL(`INSERT INTO tenant_property_links (tenant_id, property_id, invite_code, status) VALUES ('${tenantId}', '${propertyId}', 'TEST123', 'active')`);
      }
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/report-issue`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'tenant-property-code-entry',
    purpose: 'Enter property code to connect',
    flow: 'Tenant Onboarding',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
      runSQL("DELETE FROM tenant_property_links WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant-doc@myailandlord.com')");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/property-code-entry`, { waitUntil: 'networkidle' });
    }
  },

  // === LANDLORD SCREENS (accessible routes) ===
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

  {
    name: 'landlord-home-no-properties',
    purpose: 'Landlord home with onboarding complete but no properties',
    flow: 'Landlord Management',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'landlord', onboarding_completed = true WHERE email = 'landlord-doc@myailandlord.com'");
      runSQL("DELETE FROM properties WHERE landlord_id = (SELECT id FROM profiles WHERE email = 'landlord-doc@myailandlord.com')");
    },
    authState: '.auth/landlord.json',
    navigate: async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    }
  },

  // === SHARED SCREENS ===
  {
    name: 'shared-edit-profile',
    purpose: 'Edit profile information',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/edit-profile`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'shared-security',
    purpose: 'Security settings',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/security`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'shared-notifications',
    purpose: 'Notification preferences',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'shared-help-center',
    purpose: 'Help and support',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/help-center`, { waitUntil: 'networkidle' });
    }
  },

  {
    name: 'shared-contact-support',
    purpose: 'Contact support',
    flow: 'Shared',
    setupDB: () => {
      runSQL("UPDATE profiles SET role = 'tenant', onboarding_completed = true WHERE email = 'tenant-doc@myailandlord.com'");
    },
    authState: '.auth/tenant.json',
    navigate: async (page) => {
      await page.goto(`${BASE_URL}/contact-support`, { waitUntil: 'networkidle' });
    }
  },
];

async function main() {
  const startTime = Date.now();

  console.log('🚀 Realistic Screen Capture - Accessible Routes Only\n');
  console.log(`Target: ${ACCESSIBLE_SCREENS.length} accessible screens\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const screenDef of ACCESSIBLE_SCREENS) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Setting up: ${screenDef.name}`);

      screenDef.setupDB();

      const contextOptions = {
        viewport: { width: 1280, height: 720 }
      };

      if (screenDef.authState) {
        contextOptions.storageState = screenDef.authState;
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      await screenDef.navigate(page);
      await captureScreen(page, screenDef.name, {
        purpose: screenDef.purpose,
        flow: screenDef.flow
      }, screenDef.waitTime || 3000);

      await context.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } finally {
    await browser.close();
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESULTS\n');
  console.log(`⏱️  Time: ${totalTime}s (${(totalTime / 60).toFixed(1)} min)`);
  console.log(`📸 Attempts: ${totalAttempts}`);
  console.log(`✅ Unique: ${captured.size}`);
  console.log(`❌ Duplicates: ${duplicates.length}`);
  console.log(`💥 Failures: ${failed.length}`);

  if (captured.size > 0) {
    console.log('\n✅ Captured:');
    for (const [hash, screen] of captured) {
      console.log(`  - ${screen.name}`);
    }
  }

  if (duplicates.length > 0) {
    console.log('\n⚠️  Duplicates:');
    for (const dup of duplicates) {
      console.log(`  - ${dup.name} (→ ${dup.duplicateOf})`);
    }
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    for (const fail of failed) {
      console.log(`  - ${fail.name}: ${fail.error}`);
    }
  }

  console.log(`\n🎯 SUCCESS RATE: ${captured.size}/${totalAttempts} (${((captured.size / totalAttempts) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));
}

main().catch(console.error);
