#!/usr/bin/env node

/**
 * Test the complete invite link database flow
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseFlow() {
  try {
    console.log('🧪 Testing invite link database flow...\n');

    // 1. Test property creation (simulate landlord)
    console.log('1️⃣ Testing property creation...');
    
    const testProperty = {
      id: 'test-property-' + Date.now(),
      name: 'Test Property for Invites',
      address: '123 Test Street, Test City, CA 90210',
      property_type: 'apartment',
      unit: '4B',
      landlord_id: 'test-landlord-id'
    };

    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert(testProperty)
      .select()
      .single();

    if (propError) {
      console.error('❌ Property creation failed:', propError.message);
    } else {
      console.log('✅ Property created successfully');
      console.log('   Property ID:', property.id);
      console.log('   Property Name:', property.name);
    }

    // 2. Test property invite info view
    console.log('\n2️⃣ Testing property invite info view...');
    
    const { data: inviteInfo, error: inviteError } = await supabase
      .from('property_invite_info')
      .select('*')
      .eq('id', testProperty.id)
      .single();

    if (inviteError) {
      console.error('❌ Property invite info failed:', inviteError.message);
    } else {
      console.log('✅ Property invite info accessible');
      console.log('   Available fields:', Object.keys(inviteInfo));
    }

    // 3. Test tenant profile creation
    console.log('\n3️⃣ Testing tenant profile creation...');
    
    const testTenant = {
      id: 'test-tenant-' + Date.now(),
      clerk_user_id: 'test-tenant-clerk-id',
      role: 'tenant',
      name: 'Test Tenant',
      email: 'tenant@test.com'
    };

    const { data: tenant, error: tenantError } = await supabase
      .from('profiles')
      .insert(testTenant)
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError.message);
    } else {
      console.log('✅ Tenant profile created successfully');
      console.log('   Tenant ID:', tenant.id);
    }

    // 4. Test tenant property link creation (this is the critical part)
    console.log('\n4️⃣ Testing tenant property link creation...');
    
    const testLink = {
      tenant_id: testTenant.id,
      property_id: testProperty.id,
      is_active: true
    };

    const { data: link, error: linkError } = await supabase
      .from('tenant_property_links')
      .insert(testLink)
      .select()
      .single();

    if (linkError) {
      console.error('❌ Property link creation failed:', linkError.message);
      console.error('   Error details:', linkError);
    } else {
      console.log('✅ Property link created successfully');
      console.log('   Link ID:', link.id);
      console.log('   Tenant ID:', link.tenant_id);
      console.log('   Property ID:', link.property_id);
    }

    // 5. Test duplicate link prevention
    console.log('\n5️⃣ Testing duplicate link prevention...');
    
    const { data: duplicateLink, error: duplicateError } = await supabase
      .from('tenant_property_links')
      .insert(testLink)
      .select()
      .single();

    if (duplicateError) {
      if (duplicateError.code === '23505') {
        console.log('✅ Duplicate prevention working correctly');
      } else {
        console.error('❌ Unexpected duplicate error:', duplicateError.message);
      }
    } else {
      console.error('⚠️ Duplicate link was created (should have been prevented)');
    }

    // 6. Test data retrieval for tenant
    console.log('\n6️⃣ Testing tenant data access...');
    
    const { data: tenantProperties, error: accessError } = await supabase
      .from('properties')
      .select(`
        id, name, address, property_type,
        tenant_property_links!inner(tenant_id, is_active)
      `)
      .eq('tenant_property_links.tenant_id', testTenant.id)
      .eq('tenant_property_links.is_active', true);

    if (accessError) {
      console.error('❌ Tenant property access failed:', accessError.message);
    } else {
      console.log('✅ Tenant can access linked properties');
      console.log('   Properties found:', tenantProperties.length);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    await supabase.from('tenant_property_links').delete().eq('tenant_id', testTenant.id);
    await supabase.from('properties').delete().eq('id', testProperty.id);
    await supabase.from('profiles').delete().eq('id', testTenant.id);
    
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Database flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testDatabaseFlow();