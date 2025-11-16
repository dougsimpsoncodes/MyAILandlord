#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllProperties() {
  console.log('🔍 Checking ALL properties in database...\n');

  // Try without any RLS restrictions
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying with service role key if available...');
    return;
  }

  if (properties && properties.length > 0) {
    console.log(`✅ Found ${properties.length} properties:\n`);
    properties.forEach((prop, index) => {
      console.log(`Property ${index + 1}:`);
      console.log('   ID:', prop.id);
      console.log('   Name:', prop.name);
      console.log('   Address:', prop.address);
      console.log('   Created:', new Date(prop.created_at).toLocaleString());
      console.log('   Invite URL:', `https://myailandlord.app/invite?property=${prop.id}`);
      console.log('');
    });
  } else {
    console.log('❌ No properties found');
  }

  // Also check profiles to understand the context
  console.log('📱 Checking profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role, clerk_user_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (profiles && profiles.length > 0) {
    console.log(`Found ${profiles.length} profiles`);
  }
}

checkAllProperties();