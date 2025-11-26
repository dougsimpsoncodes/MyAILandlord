#!/usr/bin/env node

/**
 * Create Test Users in Supabase
 *
 * This script creates the test users needed for E2E RLS testing.
 *
 * Usage:
 *   node scripts/create-test-users.js
 *
 * Prerequisites:
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in environment or .env
 *   - This key has admin permissions and should NEVER be committed or exposed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test user credentials from .env.test
const LANDLORD_EMAIL = process.env.LANDLORD_EMAIL || 'test-landlord@myailandlord.com';
const LANDLORD_PASSWORD = process.env.LANDLORD_PASSWORD || 'MyAI2025!Landlord#Test';
const TENANT_EMAIL = process.env.TENANT_EMAIL || 'test-tenant@myailandlord.com';
const TENANT_PASSWORD = process.env.TENANT_PASSWORD || 'MyAI2025!Tenant#Test';

console.log('========================================');
console.log('Supabase Test User Creation');
console.log('========================================\n');

// Validation
if (!SUPABASE_URL) {
  console.error('❌ Error: EXPO_PUBLIC_SUPABASE_URL not found in environment');
  console.error('   Please check your .env.test file\n');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment\n');
  console.error('To get your service role key:');
  console.error('1. Go to: https://supabase.com/dashboard');
  console.error('2. Select your project: MyAILandlord');
  console.error('3. Go to: Settings → API');
  console.error('4. Copy the "service_role" key (NOT the anon key!)');
  console.error('5. Add to .env.test:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');
  console.error('⚠️  WARNING: Service role key has admin access - keep it secret!\n');
  process.exit(1);
}

console.log(`✅ Supabase URL: ${SUPABASE_URL}`);
console.log(`✅ Service key configured (${SERVICE_ROLE_KEY.substring(0, 20)}...)\n`);

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a test user
 */
async function createUser(email, password, role) {
  console.log(`Creating ${role} user: ${email}`);

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`   ❌ Error listing users: ${listError.message}`);
      return false;
    }

    const existing = existingUsers.users.find(u => u.email === email);

    if (existing) {
      console.log(`   ⚠️  User already exists (ID: ${existing.id})`);
      console.log(`   Deleting and recreating...`);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(existing.id);
      if (deleteError) {
        console.error(`   ❌ Error deleting user: ${deleteError.message}`);
        return false;
      }
      console.log(`   ✅ Old user deleted`);
    }

    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: {
        role: role.toLowerCase(),
        created_by: 'test-setup-script',
        created_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error(`   ❌ Error creating user: ${error.message}`);
      return false;
    }

    console.log(`   ✅ User created successfully!`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'YES' : 'NO'}`);

    return true;
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

/**
 * Verify users can authenticate
 */
async function verifyAuth(email, password, role) {
  console.log(`\nVerifying ${role} can authenticate...`);

  // Create a regular client (not admin) to test auth
  const testClient = createClient(SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  try {
    const { data, error } = await testClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`   ❌ Authentication failed: ${error.message}`);
      return false;
    }

    if (!data.session) {
      console.error(`   ❌ No session returned`);
      return false;
    }

    console.log(`   ✅ Authentication successful!`);
    console.log(`   Session token: ${data.session.access_token.substring(0, 20)}...`);

    // Sign out
    await testClient.auth.signOut();

    return true;
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  let success = true;

  // Create landlord user
  console.log('----------------------------------------');
  console.log('Creating Landlord Test User');
  console.log('----------------------------------------\n');
  const landlordCreated = await createUser(LANDLORD_EMAIL, LANDLORD_PASSWORD, 'Landlord');
  success = success && landlordCreated;

  // Create tenant user
  console.log('\n----------------------------------------');
  console.log('Creating Tenant Test User');
  console.log('----------------------------------------\n');
  const tenantCreated = await createUser(TENANT_EMAIL, TENANT_PASSWORD, 'Tenant');
  success = success && tenantCreated;

  // Verify authentication
  console.log('\n========================================');
  console.log('Verification');
  console.log('========================================');

  const landlordAuth = await verifyAuth(LANDLORD_EMAIL, LANDLORD_PASSWORD, 'Landlord');
  success = success && landlordAuth;

  const tenantAuth = await verifyAuth(TENANT_EMAIL, TENANT_PASSWORD, 'Tenant');
  success = success && tenantAuth;

  // Summary
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================\n');

  if (success) {
    console.log('✅ All test users created and verified successfully!\n');
    console.log('Test users:');
    console.log(`  - Landlord: ${LANDLORD_EMAIL}`);
    console.log(`  - Tenant:   ${TENANT_EMAIL}\n`);
    console.log('Next steps:');
    console.log('1. Run RLS tests:');
    console.log('   npx playwright test e2e/access-control/tenant-rls.spec.ts \\');
    console.log('     --config=playwright.config.real-auth.ts \\');
    console.log('     --project=chromium\n');
    console.log('2. Verify RLS policies:');
    console.log('   bash scripts/verify-test-setup.sh\n');
    process.exit(0);
  } else {
    console.log('❌ Some users failed to create or verify\n');
    console.log('Please check the errors above and try again.\n');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
