/**
 * Script to create a test user in Supabase for E2E testing
 *
 * Usage:
 *   node scripts/create-test-user.js
 *
 * Prerequisites:
 *   - EXPO_PUBLIC_SUPABASE_URL set in .env
 *   - SUPABASE_SERVICE_ROLE_KEY set in .env (get from Supabase dashboard)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const TEST_USER_EMAIL = 'e2e-test@myailandlord.com';
const TEST_USER_PASSWORD = 'TestUser123!E2E';

async function createTestUser() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('ERROR: EXPO_PUBLIC_SUPABASE_URL not set');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    console.log('\nTo get the service role key:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Settings > API');
    console.log('4. Copy the "service_role" key (NOT the anon key)');
    console.log('5. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    process.exit(1);
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Creating test user...');
  console.log(`  Email: ${TEST_USER_EMAIL}`);
  console.log(`  Password: ${TEST_USER_PASSWORD}`);

  // Check if user already exists
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  const existingUser = existingUsers.users.find(u => u.email === TEST_USER_EMAIL);

  if (existingUser) {
    console.log('\nTest user already exists!');
    console.log(`  User ID: ${existingUser.id}`);
    console.log('\nAdd these to your .env file:');
    console.log(`TEST_USER_EMAIL=${TEST_USER_EMAIL}`);
    console.log(`TEST_USER_PASSWORD=${TEST_USER_PASSWORD}`);
    return;
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true, // Auto-confirm email for testing
    user_metadata: {
      name: 'E2E Test User',
      role: 'landlord' // Default to landlord role for testing
    }
  });

  if (createError) {
    console.error('Error creating user:', createError.message);
    process.exit(1);
  }

  console.log('\nTest user created successfully!');
  console.log(`  User ID: ${newUser.user.id}`);
  console.log('\nAdd these to your .env file:');
  console.log(`TEST_USER_EMAIL=${TEST_USER_EMAIL}`);
  console.log(`TEST_USER_PASSWORD=${TEST_USER_PASSWORD}`);
}

createTestUser().catch(console.error);
