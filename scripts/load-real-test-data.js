#!/usr/bin/env node

/**
 * Load Real Test Data Script
 * Populates the database with realistic maintenance cases matching the actual schema
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// First, let's create test profiles for tenants
const testProfiles = [
  {
    id: '11111111-1111-1111-1111-111111111111', // Fixed UUID for consistency
    clerk_user_id: 'tenant_sarah_001',
    role: 'tenant',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    updated_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    clerk_user_id: 'tenant_michael_002', 
    role: 'tenant',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    created_at: new Date(Date.now() - 5184000000).toISOString(), // 60 days ago
    updated_at: new Date(Date.now() - 5184000000).toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    clerk_user_id: 'landlord_john_001',
    role: 'landlord', 
    name: 'John Smith',
    email: 'john.smith@example.com',
    created_at: new Date(Date.now() - 7776000000).toISOString(), // 90 days ago
    updated_at: new Date(Date.now() - 7776000000).toISOString()
  }
];

// Test properties with correct schema
const testProperties = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Sunset Apartments Unit 4B',
    address: '123 Sunset Boulevard, Unit 4B, Los Angeles, CA 90210',
    landlord_id: '33333333-3333-3333-3333-333333333333',
    property_type: 'apartment',
    unit: '4B',
    bedrooms: 2,
    bathrooms: 1,
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    updated_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Downtown Loft 12A',
    address: '456 Main Street, Unit 12A, Los Angeles, CA 90012',
    landlord_id: '33333333-3333-3333-3333-333333333333',
    property_type: 'apartment',
    unit: '12A',
    bedrooms: 1,
    bathrooms: 1,
    created_at: new Date(Date.now() - 5184000000).toISOString(),
    updated_at: new Date(Date.now() - 5184000000).toISOString()
  }
];

// Tenant property links
const tenantPropertyLinks = [
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    unit_number: '4B',
    is_active: true,
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    updated_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    tenant_id: '22222222-2222-2222-2222-222222222222',
    property_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    unit_number: '12A',
    is_active: true,
    created_at: new Date(Date.now() - 5184000000).toISOString(),
    updated_at: new Date(Date.now() - 5184000000).toISOString()
  }
];

// Test maintenance requests with correct schema matching supabase-schema.sql
const testMaintenanceRequests = [
  {
    id: '11111111-0001-0001-0001-000000000001',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Kitchen Faucet Leak',
    description: 'Kitchen faucet is leaking constantly and making strange noises when turned on. Water pressure seems low and water is dripping into the cabinet below.',
    priority: 'medium',
    status: 'pending',
    area: 'Kitchen',
    asset: 'Sink',
    issue_type: 'Plumbing Issue',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '22222222-0002-0002-0002-000000000002',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Bathroom Exhaust Fan Noise',
    description: 'Bathroom exhaust fan making loud buzzing and grinding noises. Sometimes stops working completely. Fan has been noisy for about a week.',
    priority: 'low',
    status: 'pending',
    area: 'Bathroom',
    asset: 'Exhaust Fan',
    issue_type: 'Electrical Issue',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '33333333-0003-0003-0003-000000000003',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'AC Not Cooling Properly',
    description: 'Air conditioning unit not cooling properly. Takes hours to cool down the apartment. AC was serviced 6 months ago but performance has declined.',
    priority: 'high',
    status: 'in_progress',
    area: 'Living Room',
    asset: 'AC Unit',
    issue_type: 'HVAC Issue',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '44444444-0004-0004-0004-000000000004',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Refrigerator Not Cooling',
    description: 'Refrigerator making loud humming noises and not keeping food cold enough. Food is spoiling. Temperature reads 50°F instead of 35°F.',
    priority: 'high',
    status: 'pending',
    area: 'Kitchen',
    asset: 'Refrigerator',
    issue_type: 'Appliance Issue',
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: '55555555-0005-0005-0005-000000000005',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Toilet Running Constantly',
    description: 'Toilet in main bathroom running constantly and water level seems low. Fixed last week - toilet flapper was warped and needed replacement.',
    priority: 'medium',
    status: 'completed',
    area: 'Bathroom',
    asset: 'Toilet',
    issue_type: 'Plumbing Issue',
    created_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
    updated_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
  },
  {
    id: '66666666-0006-0006-0006-000000000006',
    tenant_id: '22222222-2222-2222-2222-222222222222',
    property_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    title: 'EMERGENCY: Sparking Outlet',
    description: 'Power outlet in bedroom sparking when plugs are inserted. SAFETY ISSUE - outlet sparked when I plugged in phone charger. Unplugged everything for safety.',
    priority: 'urgent',
    status: 'in_progress',
    area: 'Bedroom',
    asset: 'Power Outlet',
    issue_type: 'Electrical Issue',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: '77777777-0007-0007-0007-000000000007',
    tenant_id: '22222222-2222-2222-2222-222222222222',
    property_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    title: 'Front Door Lock Sticking',
    description: 'Front door lock sticking and difficult to open with key. Lock has been getting harder to turn over the past month.',
    priority: 'low',
    status: 'pending',
    area: 'Entrance',
    asset: 'Door Lock',
    issue_type: 'General Maintenance',
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: '88888888-0008-0008-0008-000000000008',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    property_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Low Shower Pressure',
    description: 'Shower pressure very low and water takes long time to heat up. Issue started about 2 weeks ago. Morning showers are especially problematic.',
    priority: 'medium',
    status: 'pending',
    area: 'Bathroom',
    asset: 'Shower',
    issue_type: 'Plumbing Issue',
    created_at: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    updated_at: new Date(Date.now() - 518400000).toISOString()
  }
];

async function loadRealTestData() {
  try {
    console.log('🚀 Starting REAL test data load...');

    // Step 1: Load test profiles
    console.log('👥 Loading test profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .upsert(testProfiles, { onConflict: 'id' });

    if (profilesError) {
      console.error('❌ Error loading profiles:', profilesError);
    } else {
      console.log('✅ Profiles loaded successfully');
    }

    // Step 2: Load test properties  
    console.log('🏠 Loading test properties...');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .upsert(testProperties, { onConflict: 'id' });

    if (propertiesError) {
      console.error('❌ Error loading properties:', propertiesError);
    } else {
      console.log('✅ Properties loaded successfully');
    }

    // Step 3: Load tenant property links
    console.log('🔗 Loading tenant property links...');
    const { data: links, error: linksError } = await supabase
      .from('tenant_property_links')
      .upsert(tenantPropertyLinks, { onConflict: 'id' });

    if (linksError) {
      console.error('❌ Error loading tenant property links:', linksError);
    } else {
      console.log('✅ Tenant property links loaded successfully');
    }

    // Step 4: Load test maintenance requests
    console.log('🔧 Loading test maintenance requests...');
    const { data: maintenanceData, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .upsert(testMaintenanceRequests, { onConflict: 'id' });

    if (maintenanceError) {
      console.error('❌ Error loading maintenance requests:', maintenanceError);
    } else {
      console.log('✅ Maintenance requests loaded successfully');
    }

    console.log('\n🎉 REAL test data loading complete!');
    console.log('\n📊 Data Summary:');
    console.log(`   👥 Profiles: ${testProfiles.length} (2 tenants + 1 landlord)`);
    console.log(`   🏠 Properties: ${testProperties.length}`);
    console.log(`   🔗 Tenant Links: ${tenantPropertyLinks.length}`);
    console.log(`   🔧 Maintenance Requests: ${testMaintenanceRequests.length}`);
    
    console.log('\n📋 Request Status Breakdown:');
    const statusCounts = testMaintenanceRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} requests`);
    });

    console.log('\n🚨 Priority Breakdown:');
    const priorityCounts = testMaintenanceRequests.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`   ${priority}: ${count} requests`);
    });

    console.log('\n🏠 Properties Created:');
    testProperties.forEach(prop => {
      console.log(`   ${prop.name} (${prop.property_type}, ${prop.bedrooms}bed/${prop.bathrooms}bath)`);
    });

    console.log('\n👥 Test Users Created:');
    testProfiles.forEach(profile => {
      console.log(`   ${profile.name} (${profile.role}) - ${profile.email}`);
    });

    console.log('\n✅ You can now test the maintenance hub with REAL data in your database!');
    console.log('🔍 Check your Supabase dashboard to see the data');
    console.log('🚀 Navigate to /landlord/dashboard in your app to see the maintenance requests');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  loadRealTestData();
}

module.exports = { 
  loadRealTestData, 
  testMaintenanceRequests, 
  testProperties, 
  testProfiles,
  tenantPropertyLinks
};