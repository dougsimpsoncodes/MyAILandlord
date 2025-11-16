#!/usr/bin/env node

/**
 * Safe Test Data Loader
 * Loads test data by temporarily disabling RLS policies
 * FOR DEVELOPMENT/TESTING USE ONLY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadTestDataSafe() {
  try {
    console.log('🚀 Starting safe test data load...');
    console.log('⚠️  This script temporarily disables RLS - FOR DEVELOPMENT ONLY');

    // Read the SQL script
    const sqlPath = path.join(__dirname, 'load-test-data-with-rls-bypass.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL script not found:', sqlPath);
      process.exit(1);
    }

    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL script...');
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql_script: sqlScript });
    
    if (error) {
      console.error('❌ Error executing SQL script:', error);
      
      // Try alternative approach - execute queries individually
      console.log('🔄 Trying alternative approach...');
      await loadDataWithIndividualQueries();
      return;
    }

    console.log('✅ SQL script executed successfully');
    await verifyDataLoaded();

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    // Try fallback approach
    console.log('🔄 Trying fallback approach...');
    await loadDataWithIndividualQueries();
  }
}

async function loadDataWithIndividualQueries() {
  try {
    console.log('📝 Loading data with individual queries...');

    // Step 1: Clear existing test data
    console.log('🧹 Clearing existing test data...');
    
    const clearQueries = [
      "DELETE FROM maintenance_requests WHERE tenant_id IN (SELECT id FROM profiles WHERE clerk_user_id LIKE '%_00%')",
      "DELETE FROM tenant_property_links WHERE tenant_id IN (SELECT id FROM profiles WHERE clerk_user_id LIKE '%_00%')",
      "DELETE FROM properties WHERE landlord_id IN (SELECT id FROM profiles WHERE clerk_user_id LIKE '%_00%')",
      "DELETE FROM profiles WHERE clerk_user_id LIKE '%_00%'"
    ];

    for (const query of clearQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql_script: query });
      if (error) {
        console.log('ℹ️  Clear query result:', error.message);
      }
    }

    // Step 2: Insert test data using Supabase client methods
    console.log('👥 Inserting test profiles...');
    
    const testProfiles = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        clerk_user_id: 'tenant_sarah_001',
        role: 'tenant',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        clerk_user_id: 'tenant_michael_002',
        role: 'tenant',
        name: 'Michael Chen',
        email: 'michael.chen@example.com'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        clerk_user_id: 'landlord_john_001',
        role: 'landlord',
        name: 'John Smith',
        email: 'john.smith@example.com'
      }
    ];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .upsert(testProfiles, { onConflict: 'id' });

    if (profilesError) {
      console.error('❌ Error loading profiles:', profilesError);
      return;
    }
    console.log('✅ Profiles loaded successfully');

    // Step 3: Insert test properties
    console.log('🏠 Inserting test properties...');
    
    const testProperties = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Sunset Apartments Unit 4B',
        address: '123 Sunset Boulevard, Unit 4B, Los Angeles, CA 90210',
        landlord_id: '33333333-3333-3333-3333-333333333333',
        property_type: 'apartment',
        unit: '4B',
        bedrooms: 2,
        bathrooms: 1
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Downtown Loft 12A',
        address: '456 Main Street, Unit 12A, Los Angeles, CA 90012',
        landlord_id: '33333333-3333-3333-3333-333333333333',
        property_type: 'apartment',
        unit: '12A',
        bedrooms: 1,
        bathrooms: 1
      }
    ];

    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .upsert(testProperties, { onConflict: 'id' });

    if (propertiesError) {
      console.error('❌ Error loading properties:', propertiesError);
      return;
    }
    console.log('✅ Properties loaded successfully');

    // Step 4: Insert tenant property links
    console.log('🔗 Inserting tenant property links...');
    
    const tenantPropertyLinks = [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        unit_number: '4B',
        is_active: true
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tenant_id: '22222222-2222-2222-2222-222222222222',
        property_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        unit_number: '12A',
        is_active: true
      }
    ];

    const { data: links, error: linksError } = await supabase
      .from('tenant_property_links')
      .upsert(tenantPropertyLinks, { onConflict: 'id' });

    if (linksError) {
      console.error('❌ Error loading tenant property links:', linksError);
      return;
    }
    console.log('✅ Tenant property links loaded successfully');

    // Step 5: Insert maintenance requests
    console.log('🔧 Inserting maintenance requests...');
    
    const testMaintenanceRequests = [
      {
        id: '11111111-0001-0001-0001-000000000001',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'Kitchen Faucet Leak',
        description: 'Kitchen faucet is leaking constantly and making strange noises when turned on.',
        priority: 'medium',
        status: 'pending',
        area: 'Kitchen',
        asset: 'Sink',
        issue_type: 'Plumbing Issue'
      },
      {
        id: '22222222-0002-0002-0002-000000000002',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'Bathroom Exhaust Fan Noise',
        description: 'Bathroom exhaust fan making loud buzzing and grinding noises.',
        priority: 'low',
        status: 'pending',
        area: 'Bathroom',
        asset: 'Exhaust Fan',
        issue_type: 'Electrical Issue'
      },
      {
        id: '33333333-0003-0003-0003-000000000003',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'AC Not Cooling Properly',
        description: 'Air conditioning unit not cooling properly.',
        priority: 'high',
        status: 'in_progress',
        area: 'Living Room',
        asset: 'AC Unit',
        issue_type: 'HVAC Issue'
      },
      {
        id: '66666666-0006-0006-0006-000000000006',
        tenant_id: '22222222-2222-2222-2222-222222222222',
        property_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        title: 'EMERGENCY: Sparking Outlet',
        description: 'Power outlet in bedroom sparking when plugs are inserted. SAFETY ISSUE.',
        priority: 'urgent',
        status: 'in_progress',
        area: 'Bedroom',
        asset: 'Power Outlet',
        issue_type: 'Electrical Issue'
      }
    ];

    const { data: maintenanceData, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .upsert(testMaintenanceRequests, { onConflict: 'id' });

    if (maintenanceError) {
      console.error('❌ Error loading maintenance requests:', maintenanceError);
      return;
    }
    console.log('✅ Maintenance requests loaded successfully');

    await verifyDataLoaded();

  } catch (error) {
    console.error('❌ Error in fallback approach:', error);
  }
}

async function verifyDataLoaded() {
  try {
    console.log('\n🔍 Verifying loaded data...');

    // Check profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .like('clerk_user_id', '%_00%');

    // Check properties
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .in('id', ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']);

    // Check maintenance requests
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select('*')
      .like('id', '________-000_-000_-000_-0000000000%');

    console.log('\n📊 Data Summary:');
    console.log(`   👥 Profiles: ${profiles?.length || 0}`);
    console.log(`   🏠 Properties: ${properties?.length || 0}`);
    console.log(`   🔧 Maintenance Requests: ${requests?.length || 0}`);

    if (requests && requests.length > 0) {
      console.log('\n🚨 Request Status Breakdown:');
      const statusCounts = requests.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} requests`);
      });
    }

    console.log('\n✅ Test data verification complete!');
    console.log('🚀 You can now test the maintenance hub in your app');

  } catch (error) {
    console.error('❌ Error verifying data:', error);
  }
}

// Run the script
if (require.main === module) {
  loadTestDataSafe();
}

module.exports = { loadTestDataSafe };