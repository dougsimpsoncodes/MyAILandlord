#!/usr/bin/env node

/**
 * Test the official landlord-tenant invite flow
 * This tests the proper way to connect tenants to properties
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

async function testOfficialInviteFlow() {
  console.log('🧪 Testing Official Landlord-Tenant Invite Flow');
  console.log('================================================\n');

  const propertyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantClerkId = 'user_30ODEM6qBd8hMikaCUGP59IClEG';

  console.log('📋 Test Parameters:');
  console.log(`   Property ID: ${propertyId}`);
  console.log(`   Tenant Clerk ID: ${tenantClerkId}\n`);

  // Step 1: Get property code (landlord would see this in InviteTenantScreen)
  console.log('🏠 Step 1: Getting property code...');
  try {
    // This would normally work through authenticated landlord session
    // For testing, we'll try to get it or suggest manual retrieval
    console.log('   Note: Property code retrieval may be blocked by RLS');
    console.log('   💡 Run this SQL in Supabase to get the code:');
    console.log(`      SELECT name, property_code, code_expires_at FROM properties WHERE id = '${propertyId}';`);
    console.log('   📝 Then use that code in the next steps\n');
  } catch (error) {
    console.log('   ⚠️ Expected - RLS blocking direct access');
  }

  // Step 2: Test property code validation (tenant side)
  console.log('🔍 Step 2: Testing property code validation...');
  try {
    // You would get this code from step 1 above
    const testCodes = ['ABC123', 'XYZ789']; // Common test codes
    
    for (const code of testCodes) {
      console.log(`   Testing code: ${code}`);
      const { data, error } = await supabase.rpc('validate_property_code', {
        input_code: code,
        tenant_clerk_id: tenantClerkId
      });

      if (error) {
        console.log(`   ❌ Validation error: ${error.message}`);
      } else {
        console.log(`   📊 Validation result:`, data?.[0]);
        if (data?.[0]?.success) {
          console.log(`   ✅ Valid code found: ${code}!`);
          
          // Step 3: Test tenant linking
          console.log('\n🔗 Step 3: Testing tenant property linking...');
          const { data: linkData, error: linkError } = await supabase.rpc('link_tenant_to_property', {
            input_code: code,
            tenant_clerk_id: tenantClerkId,
            unit_number: '2A'
          });

          if (linkError) {
            console.log(`   ❌ Linking error: ${linkError.message}`);
          } else {
            console.log(`   📊 Linking result:`, linkData?.[0]);
            if (linkData?.[0]?.success) {
              console.log('   ✅ Successfully linked tenant to property!');
              console.log('   🎉 Official invite flow completed successfully');
              
              // Step 4: Verify the link was created
              console.log('\n✅ Step 4: Verifying tenant-property link...');
              console.log('   💡 Run this SQL to verify:');
              console.log('      SELECT tpl.*, p.name as property_name FROM tenant_property_links tpl');
              console.log('      JOIN properties p ON p.id = tpl.property_id');
              console.log('      JOIN profiles prof ON prof.id = tpl.tenant_id');
              console.log(`      WHERE prof.clerk_user_id = '${tenantClerkId}' AND tpl.is_active = true;`);
              
              console.log('\n🚀 Next Steps:');
              console.log('   1. The tenant is now properly linked to the property');
              console.log('   2. RLS policies should allow maintenance request creation');
              console.log('   3. Test maintenance request creation in the app');
              return;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Validation failed: ${error.message}`);
  }

  console.log('\n📝 Manual Testing Instructions:');
  console.log('================================');
  console.log('Since we need a valid property code, here\'s how to test manually:');
  console.log('\n1. 🏠 As Landlord:');
  console.log('   - Open the app as a landlord user');
  console.log('   - Go to PropertyManagementScreen');
  console.log('   - Tap "Invite Tenant" on the test property');
  console.log('   - This opens InviteTenantScreen with the property code');
  console.log('   - Copy the property code (e.g., "ABC123")');
  console.log('\n2. 👤 As Tenant:');
  console.log('   - Open the app as the tenant user');
  console.log('   - Go to PropertyCodeEntryScreen');
  console.log('   - Enter the property code from step 1');
  console.log('   - This should successfully link the tenant');
  console.log('\n3. 🔧 Test Maintenance Requests:');
  console.log('   - After linking, try creating a maintenance request');
  console.log('   - Should work without RLS violations');
  console.log('\n🎯 This is the proper flow - no fake data or RLS bypasses needed!');
}

testOfficialInviteFlow().catch(console.error);