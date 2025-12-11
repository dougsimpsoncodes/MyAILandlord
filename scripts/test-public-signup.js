// Test public signup flow to understand the auth setup
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zxqhxjuwmkxevhkpqfzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cWh4anV3bWt4ZXZoa3BxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODg5MDQsImV4cCI6MjA2OTA2NDkwNH0.v7g7AAztjBZx_WmIj4BzLSgacWFFj_FcH4mV7yJ6i8g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testEmail = `e2e-test-${Date.now()}@myailandlord.com`;
const testPassword = 'TestUser123!E2E';

async function testSignup() {
  console.log('='.repeat(50));
  console.log('TESTING SIGNUP FLOW');
  console.log('='.repeat(50));

  console.log(`\n1. Attempting signup for: ${testEmail}`);

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { role: 'landlord' }
    }
  });

  if (signupError) {
    console.log(`❌ SIGNUP FAILED: ${signupError.message}`);
    return;
  }

  console.log(`✅ Signup response received`);
  console.log(`   User ID: ${signupData.user?.id}`);
  console.log(`   Email: ${signupData.user?.email}`);
  console.log(`   Email confirmed: ${signupData.user?.email_confirmed_at ? 'YES' : 'NO'}`);
  console.log(`   Confirmation sent at: ${signupData.user?.confirmation_sent_at || 'N/A'}`);

  // Try to login immediately
  console.log(`\n2. Attempting immediate login...`);

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    console.log(`❌ LOGIN FAILED: ${loginError.message}`);
    console.log(`   This suggests email confirmation IS required`);
  } else {
    console.log(`✅ LOGIN SUCCESS - Email confirmation is DISABLED`);
    console.log(`   User can login immediately after signup`);
    await supabase.auth.signOut();
  }
}

async function testExistingUsers() {
  console.log('\n' + '='.repeat(50));
  console.log('TESTING EXISTING E2E USERS');
  console.log('='.repeat(50));

  const users = [
    { email: 'e2e-test@myailandlord.com', password: 'TestUser123!E2E' },
    { email: 'test-tenant@myailandlord.com', password: 'MyAI2025!Tenant#Test' },
  ];

  for (const user of users) {
    console.log(`\nTesting: ${user.email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.log(`❌ FAILED: ${error.message}`);

      // Check if user exists by trying to sign up
      console.log(`   Checking if user exists...`);
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (signupError) {
        console.log(`   Signup error: ${signupError.message}`);
      } else if (signupData.user?.identities?.length === 0) {
        console.log(`   User EXISTS but password is wrong`);
      } else {
        console.log(`   User did NOT exist - just created it!`);
        // Try login again
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });
        if (retryError) {
          console.log(`   Retry login failed: ${retryError.message}`);
        } else {
          console.log(`   ✅ User created and login works now!`);
          await supabase.auth.signOut();
        }
      }
    } else {
      console.log(`✅ SUCCESS - Login works!`);
      console.log(`   User ID: ${data.user?.id}`);
      await supabase.auth.signOut();
    }
  }
}

async function main() {
  await testSignup();
  await testExistingUsers();
  console.log('\n' + '='.repeat(50));
}

main().catch(console.error);
