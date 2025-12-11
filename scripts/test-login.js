// Test login credentials against Supabase Auth
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zxqhxjuwmkxevhkpqfzf.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cWh4anV3bWt4ZXZoa3BxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODg5MDQsImV4cCI6MjA2OTA2NDkwNH0.v7g7AAztjBZx_WmIj4BzLSgacWFFj_FcH4mV7yJ6i8g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin(email, password) {
  console.log(`\nTesting login for: ${email}`);
  console.log(`Password: ${password}`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log(`❌ LOGIN FAILED: ${error.message}`);
    return false;
  }

  console.log(`✅ LOGIN SUCCESS!`);
  console.log(`   User ID: ${data.user?.id}`);
  console.log(`   Email: ${data.user?.email}`);
  console.log(`   Role: ${data.user?.user_metadata?.role || 'not set'}`);

  // Sign out
  await supabase.auth.signOut();
  return true;
}

async function main() {
  console.log('='.repeat(50));
  console.log('SUPABASE LOGIN CREDENTIAL TEST');
  console.log('='.repeat(50));
  console.log(`URL: ${SUPABASE_URL}`);

  // Test landlord
  await testLogin('e2e-test@myailandlord.com', 'TestUser123!E2E');

  // Test tenant
  await testLogin('test-tenant@myailandlord.com', 'MyAI2025!Tenant#Test');

  console.log('\n' + '='.repeat(50));
}

main().catch(console.error);
