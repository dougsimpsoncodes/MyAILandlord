/**
 * Script to create E2E test users using Supabase Admin API
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key node scripts/create-e2e-users.js
 *
 * You can get the service role key from:
 *   Supabase Dashboard → Settings → API → service_role (secret)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zxqhxjuwmkxevhkpqfzf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nYou can find this key in:');
  console.log('  Supabase Dashboard → Settings → API → service_role (secret)');
  console.log('\nUsage:');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/create-e2e-users.js');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: 'e2e-test@myailandlord.com',
    password: 'TestUser123!E2E',
    role: 'landlord',
  },
  {
    email: 'test-tenant@myailandlord.com',
    password: 'MyAI2025!Tenant#Test',
    role: 'tenant',
  },
];

async function deleteUserIfExists(email) {
  // Get user by email
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.log(`Warning: Could not list users: ${error.message}`);
    return;
  }

  const user = data.users.find((u) => u.email === email);
  if (user) {
    console.log(`  Deleting existing user: ${email}`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.log(`  Warning: Could not delete user: ${deleteError.message}`);
    }
  }
}

async function createUser(userData) {
  console.log(`\nCreating user: ${userData.email}`);

  // Delete if exists
  await deleteUserIfExists(userData.email);

  // Create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      role: userData.role,
      first_name: userData.role === 'landlord' ? 'E2E' : 'Test',
      last_name: userData.role === 'landlord' ? 'Landlord' : 'Tenant',
    },
  });

  if (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    return false;
  }

  console.log(`  ✅ Created user with ID: ${data.user.id}`);

  // Update the profile with the correct role
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        role: userData.role,
        first_name: userData.role === 'landlord' ? 'E2E' : 'Test',
        last_name: userData.role === 'landlord' ? 'Landlord' : 'Tenant',
        email: userData.email,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.log(`  Warning: Could not update profile: ${profileError.message}`);
  } else {
    console.log(`  ✅ Profile updated with role: ${userData.role}`);
  }

  return true;
}

async function verifyLogin(email, password) {
  // Use anon client for login test
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cWh4anV3bWt4ZXZoa3BxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODg5MDQsImV4cCI6MjA2OTA2NDkwNH0.v7g7AAztjBZx_WmIj4BzLSgacWFFj_FcH4mV7yJ6i8g';
  const anonClient = createClient(SUPABASE_URL, anonKey);

  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log(`  ❌ Login verification FAILED: ${error.message}`);
    return false;
  }

  console.log(`  ✅ Login verification PASSED`);
  await anonClient.auth.signOut();
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('CREATE E2E TEST USERS');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  let allSuccess = true;

  for (const user of testUsers) {
    const created = await createUser(user);
    if (created) {
      console.log(`\nVerifying login for ${user.email}...`);
      const loginOk = await verifyLogin(user.email, user.password);
      if (!loginOk) allSuccess = false;
    } else {
      allSuccess = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('✅ ALL USERS CREATED AND VERIFIED SUCCESSFULLY');
    console.log('\nYou can now run E2E tests with:');
    console.log('  npx playwright test e2e/flows/verified-user-test.spec.ts');
  } else {
    console.log('⚠️  SOME USERS FAILED - Check the errors above');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
