#!/usr/bin/env node

/**
 * Debug Script: Get Current User Context
 * This script helps identify your real Clerk ID for fixing test data
 */

console.log(`
🔍 MAINTENANCE HUB DEBUG SCRIPT
================================

To fix the "No active requests" issue, we need your real Clerk user ID.

STEP 1: Open your browser and navigate to localhost:8082
STEP 2: Open Developer Console (F12)
STEP 3: Run this code in the console:

    // Get current user info
    console.log('Current User ID:', user?.id);
    console.log('Current User Email:', user?.emailAddresses?.[0]?.emailAddress);
    console.log('Full User Object:', user);

STEP 4: Copy your real Clerk ID (starts with 'user_')

STEP 5: Run this SQL in Supabase to fix test data:

    UPDATE profiles 
    SET clerk_user_id = 'YOUR_REAL_CLERK_ID_HERE'
    WHERE clerk_user_id = 'landlord_john_001';

EXPECTED RESULT: Maintenance Hub will show 8 test maintenance requests

PROBLEM SUMMARY:
================
- Test data uses fake Clerk ID: 'landlord_john_001'  
- Your app uses real Clerk ID: 'user_abc123...'
- RLS policies require exact ID matches
- Mismatch = empty results = "No active requests"

This is a data setup issue, not a code bug. The authentication works perfectly.
`);

// Also create a simple test to verify environment
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n✅ Environment Check:');
console.log('   Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Environment variables missing. Check your .env file.');
} else {
  console.log('\n✅ Environment configured correctly.');
}

console.log('\n📋 Next Steps:');
console.log('   1. Get your real Clerk ID from browser console');
console.log('   2. Update the SQL query with your real ID'); 
console.log('   3. Run the SQL in Supabase');
console.log('   4. Refresh your app - maintenance requests should appear!');