#!/usr/bin/env node

/**
 * Load Test Data Script
 * Populates the database with realistic maintenance cases for testing
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

// Test maintenance requests data
const testMaintenanceRequests = [
  {
    id: 'req_001',
    issue_type: 'plumbing',
    description: 'Kitchen faucet is leaking constantly and making strange noises when turned on. Water pressure seems low.',
    area: 'kitchen',
    priority: 'medium',
    status: 'new',
    estimated_cost: 150,
    images: JSON.stringify(['faucet-leak-1.jpg', 'faucet-leak-2.jpg']),
    tenant_notes: 'The leak started yesterday evening. Water is dripping into the cabinet below.',
    preferred_time: 'weekday_morning',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'req_002',
    issue_type: 'electrical',
    description: 'Bathroom exhaust fan making loud buzzing and grinding noises. Sometimes stops working completely.',
    area: 'bathroom',
    priority: 'low',
    status: 'new',
    estimated_cost: 75,
    images: JSON.stringify(['fan-noise.jpg']),
    tenant_notes: 'Fan has been noisy for about a week. Seems to work better in the morning.',
    preferred_time: 'weekday_afternoon',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'req_003',
    issue_type: 'hvac',
    description: 'Air conditioning unit not cooling properly. Takes hours to cool down the apartment.',
    area: 'living_room',
    priority: 'high',
    status: 'in_progress',
    estimated_cost: 300,
    images: JSON.stringify(['ac-unit.jpg', 'thermostat.jpg']),
    tenant_notes: 'AC was serviced 6 months ago but performance has declined. Very hot inside.',
    preferred_time: 'any_weekday',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'req_004',
    issue_type: 'appliance',
    description: 'Refrigerator making loud humming noises and not keeping food cold enough.',
    area: 'kitchen',
    priority: 'high',
    status: 'new',
    estimated_cost: 450,
    images: JSON.stringify(['refrigerator-temp.jpg']),
    tenant_notes: 'Food is spoiling. Refrigerator temperature reads 50°F instead of 35°F.',
    preferred_time: 'asap',
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'req_005',
    issue_type: 'plumbing',
    description: 'Toilet in main bathroom running constantly and water level seems low.',
    area: 'bathroom',
    priority: 'medium',
    status: 'resolved',
    estimated_cost: 120,
    images: JSON.stringify(['toilet-running.jpg']),
    tenant_notes: 'Fixed last week - toilet flapper was warped and needed replacement.',
    preferred_time: 'weekday_morning',
    created_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
    updated_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
  },
  {
    id: 'req_006',
    issue_type: 'electrical',
    description: 'EMERGENCY: Power outlet in bedroom sparking when plugs are inserted.',
    area: 'bedroom',
    priority: 'emergency',
    status: 'in_progress',
    estimated_cost: 200,
    images: JSON.stringify(['sparking-outlet.jpg', 'outlet-closeup.jpg']),
    tenant_notes: 'SAFETY ISSUE - outlet sparked when I plugged in phone charger. Unplugged everything.',
    preferred_time: 'asap',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: 'req_007',
    issue_type: 'general',
    description: 'Front door lock sticking and difficult to open with key.',
    area: 'entrance',
    priority: 'low',
    status: 'new',
    estimated_cost: 80,
    images: JSON.stringify(['door-lock.jpg']),
    tenant_notes: 'Lock has been getting harder to turn over the past month.',
    preferred_time: 'weekend',
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'req_008',
    issue_type: 'plumbing',
    description: 'Shower pressure very low and water takes long time to heat up.',
    area: 'bathroom',
    priority: 'medium',
    status: 'new',
    estimated_cost: 180,
    images: JSON.stringify(['shower-head.jpg', 'water-pressure.mp4']),
    tenant_notes: 'Issue started about 2 weeks ago. Morning showers are especially problematic.',
    preferred_time: 'weekday_afternoon',
    created_at: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    updated_at: new Date(Date.now() - 518400000).toISOString()
  }
];

// Test properties data
const testProperties = [
  {
    id: 'prop_001',
    name: 'Sunset Apartments Unit 4B',
    address_line1: '123 Sunset Boulevard',
    address_line2: 'Unit 4B',
    city: 'Los Angeles',
    state: 'CA',
    postal_code: '90210',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    square_footage: 850,
    rent_amount: 2500,
    created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    updated_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: 'prop_002', 
    name: 'Downtown Loft 12A',
    address_line1: '456 Main Street',
    address_line2: 'Unit 12A',
    city: 'Los Angeles',
    state: 'CA',
    postal_code: '90012',
    property_type: 'loft',
    bedrooms: 1,
    bathrooms: 1,
    square_footage: 750,
    rent_amount: 2800,
    created_at: new Date(Date.now() - 5184000000).toISOString(), // 60 days ago
    updated_at: new Date(Date.now() - 5184000000).toISOString()
  }
];

// Test profiles (tenants)
const testProfiles = [
  {
    id: 'tenant_001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 234-5678',
    role: 'tenant',
    property_id: 'prop_001',
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    updated_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: 'tenant_002',
    name: 'Michael Chen',
    email: 'michael.chen@example.com', 
    phone: '+1 (555) 345-6789',
    role: 'tenant',
    property_id: 'prop_002',
    created_at: new Date(Date.now() - 5184000000).toISOString(),
    updated_at: new Date(Date.now() - 5184000000).toISOString()
  }
];

async function loadTestData() {
  try {
    console.log('🚀 Starting test data load...');

    // Load test properties
    console.log('📍 Loading test properties...');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .upsert(testProperties, { onConflict: 'id' });

    if (propertiesError) {
      console.error('❌ Error loading properties:', propertiesError);
    } else {
      console.log('✅ Properties loaded successfully');
    }

    // Load test profiles
    console.log('👥 Loading test profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .upsert(testProfiles, { onConflict: 'id' });

    if (profilesError) {
      console.error('❌ Error loading profiles:', profilesError);
    } else {
      console.log('✅ Profiles loaded successfully');
    }

    // Load test maintenance requests
    console.log('🔧 Loading test maintenance requests...');
    const { data: maintenanceData, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .upsert(testMaintenanceRequests, { onConflict: 'id' });

    if (maintenanceError) {
      console.error('❌ Error loading maintenance requests:', maintenanceError);
    } else {
      console.log('✅ Maintenance requests loaded successfully');
    }

    console.log('\n🎉 Test data loading complete!');
    console.log('\n📊 Data Summary:');
    console.log(`   🏠 Properties: ${testProperties.length}`);
    console.log(`   👥 Tenants: ${testProfiles.length}`);
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

    console.log('\n✅ You can now test the maintenance hub with realistic data!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Check if running as main script
if (require.main === module) {
  loadTestData();
}

module.exports = { loadTestData, testMaintenanceRequests, testProperties, testProfiles };