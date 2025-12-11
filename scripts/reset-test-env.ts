#!/usr/bin/env npx ts-node
/**
 * Reset Test Environment Script
 *
 * This script cleans up the database and auth users before running E2E tests.
 * Run this before your test suite to ensure a clean slate.
 *
 * Usage:
 *   npx ts-node scripts/reset-test-env.ts
 *
 * Or add to package.json:
 *   "scripts": {
 *     "test:reset": "ts-node scripts/reset-test-env.ts",
 *     "test:e2e": "npm run test:reset && npx playwright test"
 *   }
 *
 * Required environment variables:
 *   - EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   - EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY (for auth user deletion)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import after env is loaded
import { DatabaseHelper } from '../e2e/helpers/database-helper';

async function main() {
  console.log('🚀 Starting test environment reset...\n');

  const dbHelper = new DatabaseHelper();

  if (!dbHelper.isAvailable()) {
    console.error('❌ Supabase is not configured. Check your .env file.');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const skipAuth = args.includes('--skip-auth');
  const pattern = args.find(a => a.startsWith('--pattern='))?.split('=')[1] || 'test-user-';

  console.log('Options:');
  console.log(`  Skip auth cleanup: ${skipAuth}`);
  console.log(`  Email pattern: ${pattern}`);
  console.log(`  Admin available: ${dbHelper.isAdminAvailable()}`);
  console.log('');

  try {
    const result = await dbHelper.resetTestEnvironment({
      deleteAuthUsers: !skipAuth,
      emailPattern: pattern,
      preserveEmails: [
        'e2e-test@myailandlord.com',      // Main E2E landlord test user
        'test-tenant@myailandlord.com',    // Main E2E tenant test user
      ],
    });

    if (result.success) {
      console.log('✅ Test environment reset successfully!');
      process.exit(0);
    } else {
      console.error('⚠️ Test environment reset completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to reset test environment:', error);
    process.exit(1);
  }
}

main();
