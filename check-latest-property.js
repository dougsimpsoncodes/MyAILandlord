#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestProperty() {
  console.log('🔍 Checking latest property in database...\n');

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, name, address, landlord_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (properties && properties.length > 0) {
    const prop = properties[0];
    console.log('✅ Latest property found:');
    console.log('   ID:', prop.id);
    console.log('   Name:', prop.name);
    console.log('   Address:', prop.address);
    console.log('   Created:', new Date(prop.created_at).toLocaleString());
    console.log('\n📱 Expected invite URL:');
    console.log(`   https://myailandlord.app/invite?property=${prop.id}`);
  } else {
    console.log('❌ No properties found in database');
  }
}

checkLatestProperty();