// Verify that RLS security is now working properly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRLSSecurity() {
  console.log('🔒 Verifying RLS Security is Working...');
  
  try {
    // Test 1: Query without user context (should return 0 rows now)
    console.log('\n1. Testing database access without user context...');
    const { data: noAuthData, error: noAuthError } = await supabase
      .from('profiles')
      .select('clerk_user_id');
    
    if (noAuthError) {
      console.log('❌ Error:', noAuthError.message);
    } else {
      console.log(`Profiles accessible without auth: ${noAuthData?.length || 0} rows`);
      if (noAuthData && noAuthData.length === 0) {
        console.log('✅ SUCCESS: RLS is working - no data accessible without auth');
      } else {
        console.log('❌ FAILURE: RLS is NOT working - data is still accessible!');
      }
    }

    // Test 2: Test the user context function
    console.log('\n2. Testing user context function...');
    const { data: functionResult, error: functionError } = await supabase.rpc('set_current_user_id', {
      user_id: 'sample_tenant_456'
    });
    
    if (functionError) {
      console.log('❌ User context function error:', functionError.message);
    } else {
      console.log('✅ User context function working');
      
      // Test 3: Query with user context (should return 1 row for sample user)
      console.log('\n3. Testing database access with user context...');
      const { data: withAuthData, error: withAuthError } = await supabase
        .from('profiles')
        .select('clerk_user_id, name, role');
      
      if (withAuthError) {
        console.log('❌ Error with auth:', withAuthError.message);
      } else {
        console.log(`Profiles accessible with auth: ${withAuthData?.length || 0} rows`);
        if (withAuthData && withAuthData.length === 1) {
          console.log('✅ SUCCESS: User can see their own profile only');
          console.log('   Profile:', withAuthData[0]);
        } else if (withAuthData && withAuthData.length === 0) {
          console.log('ℹ️  No profile found for sample user (this is OK if sample data was not inserted)');
        } else {
          console.log('❌ FAILURE: User can see multiple profiles!');
        }
      }
    }

    console.log('\n🔒 Security Verification Complete');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyRLSSecurity();