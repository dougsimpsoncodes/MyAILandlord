#!/usr/bin/env node

/**
 * Test property code validation
 * Check if the property code YWD226 exists and is valid
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPropertyCode() {
  const propertyCode = 'YWD226';
  const tenantClerkId = 'user_30ODEM6qBd8hMikaCUGP59IClEG';
  
  console.log('🔍 Testing Property Code: ' + propertyCode);
  console.log('=======================================\n');

  // Test 1: Check if property with this code exists
  console.log('📋 Test 1: Checking if property exists with this code...');
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, name, property_code, code_expires_at, allow_tenant_signup')
      .eq('property_code', propertyCode);

    if (error) {
      console.log('❌ Error querying properties:', error.message);
    } else if (!properties || properties.length === 0) {
      console.log('❌ No property found with code:', propertyCode);
      console.log('\n💡 This is likely the issue - the property code doesn\'t exist');
      console.log('   Properties may not have codes generated yet');
    } else {
      console.log('✅ Property found:', properties[0]);
      
      // Check if expired
      if (properties[0].code_expires_at) {
        const expiresAt = new Date(properties[0].code_expires_at);
        const now = new Date();
        if (expiresAt < now) {
          console.log('⚠️  WARNING: Property code has EXPIRED!');
        }
      }
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  // Test 2: Try to validate the code using the RPC function
  console.log('\n📋 Test 2: Testing property code validation function...');
  try {
    const { data, error } = await supabase.rpc('validate_property_code', {
      input_code: propertyCode,
      tenant_clerk_id: tenantClerkId
    });

    if (error) {
      console.log('❌ Validation function error:', error.message);
    } else {
      console.log('📊 Validation result:', data?.[0]);
      
      if (data?.[0]?.success) {
        console.log('✅ Property code is valid!');
      } else {
        console.log('❌ Property code validation failed:', data?.[0]?.error_message);
      }
    }
  } catch (error) {
    console.log('❌ RPC call failed:', error.message);
  }

  // Test 3: List all property codes (may be blocked by RLS)
  console.log('\n📋 Test 3: Listing all property codes (if accessible)...');
  try {
    const { data: allProperties, error } = await supabase
      .from('properties')
      .select('name, property_code')
      .not('property_code', 'is', null)
      .limit(5);

    if (error) {
      console.log('⚠️  Cannot list properties (expected due to RLS)');
    } else if (allProperties && allProperties.length > 0) {
      console.log('📊 Sample property codes in database:');
      allProperties.forEach(p => {
        console.log(`   - ${p.name}: ${p.property_code || 'NO CODE'}`);
      });
    } else {
      console.log('⚠️  No properties with codes found (or RLS blocking)');
    }
  } catch (error) {
    console.log('⚠️  Query failed:', error.message);
  }

  console.log('\n🔧 Troubleshooting Steps:');
  console.log('================================');
  console.log('1. Check if properties have codes:');
  console.log('   Run this SQL in Supabase dashboard:');
  console.log('   SELECT id, name, property_code, code_expires_at FROM properties;');
  console.log('\n2. If YWD226 doesn\'t exist, generate codes:');
  console.log('   UPDATE properties SET property_code = generate_property_code(),');
  console.log('   code_expires_at = NOW() + INTERVAL \'90 days\'');
  console.log('   WHERE property_code IS NULL;');
  console.log('\n3. Get the actual code for your test property:');
  console.log('   SELECT property_code FROM properties');
  console.log('   WHERE id = \'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\';');
  console.log('\n4. Use the correct code in the invite link');
}

testPropertyCode().catch(console.error);