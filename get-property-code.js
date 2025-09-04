#!/usr/bin/env node

/**
 * Get property code for the test property to use in proper tenant linking flow
 * This script shows the property code that should be used in PropertyCodeEntryScreen
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getPropertyCode() {
  console.log('🔍 Getting property code for proper tenant linking...');
  
  const propertyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  console.log(`🏠 Property ID: ${propertyId}`);
  
  try {
    // Try to get property information including code
    const { data: property, error } = await supabase
      .from('properties')
      .select('id, name, property_code, code_expires_at, allow_tenant_signup, address')
      .eq('id', propertyId)
      .single();
    
    if (error) {
      console.log('⚠️  Could not retrieve property directly (may be due to RLS)');
      console.log('📋 Error:', error.message);
      console.log('\n💡 Next Steps:');
      console.log('1. You need to get the property code from the Supabase dashboard');
      console.log('2. Go to: https://supabase.com/dashboard/project/zxqhxjuwmkxevhkpqfzf/editor');
      console.log('3. Run this SQL query:');
      console.log(`   SELECT name, property_code, code_expires_at FROM properties WHERE id = '${propertyId}';`);
      console.log('4. Use the returned property_code in the app\'s PropertyCodeEntryScreen');
      console.log('5. This will properly link the tenant to the property via the intended flow');
    } else {
      console.log('✅ Property found:', {
        id: property.id,
        name: property.name,
        address: property.address,
        property_code: property.property_code,
        code_expires_at: property.code_expires_at,
        allow_tenant_signup: property.allow_tenant_signup
      });
      
      if (property.property_code) {
        console.log('\n🎯 PROPERTY CODE TO USE: ' + property.property_code);
        console.log('\n📱 Next Steps:');
        console.log('1. Open your app and go to PropertyCodeEntryScreen');
        console.log(`2. Enter the code: ${property.property_code}`);
        console.log('3. This will properly link your tenant to the property');
        console.log('4. Then you can create maintenance requests');
        
        if (property.code_expires_at) {
          const expiresAt = new Date(property.code_expires_at);
          const now = new Date();
          if (expiresAt < now) {
            console.log('⚠️  WARNING: This code has EXPIRED!');
            console.log('   You need to generate a new code or extend the expiration.');
          } else {
            console.log(`⏰ Code expires: ${expiresAt.toLocaleString()}`);
          }
        }
      } else {
        console.log('❌ No property code found for this property!');
        console.log('\n💡 Fix: Run this SQL in Supabase dashboard to generate a code:');
        console.log(`   UPDATE properties SET property_code = generate_property_code(), code_expires_at = NOW() + INTERVAL '90 days' WHERE id = '${propertyId}';`);
        console.log('   SELECT property_code FROM properties WHERE id = \'' + propertyId + '\';');
      }
    }
    
    console.log('\n🔄 Why this is the right approach:');
    console.log('- RLS policies are working correctly by blocking unauthorized requests');
    console.log('- The property code system is the intended way to connect tenants');
    console.log('- This creates proper audit trails and security');
    console.log('- No fake data or bypasses are needed');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the check
getPropertyCode().catch(console.error);