#!/usr/bin/env node

/**
 * Cleanup Test Data Script
 * Removes test data that was loaded by load-test-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data IDs from load-real-test-data.js (valid UUIDs)
const testMaintenanceIds = [
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003',
  '44444444-0004-0004-0004-000000000004',
  '55555555-0005-0005-0005-000000000005',
  '66666666-0006-0006-0006-000000000006',
  '77777777-0007-0007-0007-000000000007',
  '88888888-0008-0008-0008-000000000008'
];

const testPropertyIds = [
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
];

const testProfileIds = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
];

const testTenantLinkIds = [
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
];

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  // Delete test maintenance requests FIRST (has foreign keys)
  console.log('🔧 Deleting test maintenance requests...');
  const { error: mrError } = await supabase
    .from('maintenance_requests')
    .delete()
    .in('id', testMaintenanceIds);

  if (mrError) {
    console.error('   ❌ Error:', mrError.message);
  } else {
    console.log('   ✅ Test maintenance requests deleted');
  }

  // Delete tenant property links
  console.log('🔗 Deleting test tenant property links...');
  const { error: linkError } = await supabase
    .from('tenant_property_links')
    .delete()
    .in('id', testTenantLinkIds);

  if (linkError) {
    console.error('   ❌ Error:', linkError.message);
  } else {
    console.log('   ✅ Test tenant property links deleted');
  }

  // Delete test properties
  console.log('🏠 Deleting test properties...');
  const { error: propError } = await supabase
    .from('properties')
    .delete()
    .in('id', testPropertyIds);

  if (propError) {
    console.error('   ❌ Error:', propError.message);
  } else {
    console.log('   ✅ Test properties deleted');
  }

  // Delete test profiles
  console.log('👥 Deleting test profiles...');
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .in('id', testProfileIds);

  if (profileError) {
    console.error('   ❌ Error:', profileError.message);
  } else {
    console.log('   ✅ Test profiles deleted');
  }

  console.log('\n✅ Test data cleanup complete!');
}

cleanupTestData();
