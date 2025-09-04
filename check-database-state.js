#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  // Check if property_invite_info view exists
  console.log('1️⃣ Checking property_invite_info view...');
  const { data: viewCheck, error: viewError } = await supabase
    .from('property_invite_info')
    .select('*')
    .limit(1);

  if (viewError) {
    console.log('❌ View does not exist:', viewError.message);
    console.log('Creating property_invite_info view...');
    
    // Create the view manually
    const { error: createViewError } = await supabase.rpc('exec_sql', {
      sql_script: `
        CREATE OR REPLACE VIEW public.property_invite_info AS
        SELECT id, name, address, property_type, unit
        FROM properties;
        
        GRANT SELECT ON public.property_invite_info TO anon, authenticated;
      `
    });

    if (createViewError) {
      console.log('❌ Could not create view with exec_sql. Will try direct SQL.');
    } else {
      console.log('✅ View created successfully');
    }
  } else {
    console.log('✅ View exists and accessible');
  }

  // Check existing properties
  console.log('\n2️⃣ Checking existing properties...');
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, name, address, landlord_id')
    .limit(5);

  if (propError) {
    console.error('❌ Error fetching properties:', propError.message);
  } else {
    console.log(`✅ Found ${properties.length} properties`);
    properties.forEach(prop => {
      console.log(`   - ${prop.name} (${prop.id})`);
    });
  }

  // Check existing profiles
  console.log('\n3️⃣ Checking existing profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role, clerk_user_id')
    .limit(5);

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
  } else {
    console.log(`✅ Found ${profiles.length} profiles`);
    profiles.forEach(profile => {
      console.log(`   - ${profile.name} (${profile.role}) - ${profile.id}`);
    });
  }

  // Check tenant_property_links
  console.log('\n4️⃣ Checking existing tenant property links...');
  const { data: links, error: linkError } = await supabase
    .from('tenant_property_links')
    .select('*')
    .limit(5);

  if (linkError) {
    console.error('❌ Error fetching links:', linkError.message);
  } else {
    console.log(`✅ Found ${links.length} tenant property links`);
    links.forEach(link => {
      console.log(`   - Tenant: ${link.tenant_id} → Property: ${link.property_id}`);
    });
  }

  // Test with real UUIDs if we have data
  if (properties.length > 0 && profiles.length > 0) {
    console.log('\n5️⃣ Testing with real data...');
    
    const property = properties[0];
    const tenant = profiles.find(p => p.role === 'tenant');
    
    if (tenant) {
      console.log(`Testing link creation: ${tenant.name} → ${property.name}`);
      
      const { data: testLink, error: testLinkError } = await supabase
        .from('tenant_property_links')
        .insert({
          id: uuidv4(),
          tenant_id: tenant.id,
          property_id: property.id,
          is_active: true
        })
        .select()
        .single();

      if (testLinkError) {
        console.log('❌ Test link creation failed:', testLinkError.message);
      } else {
        console.log('✅ Test link created successfully');
        
        // Clean up
        await supabase
          .from('tenant_property_links')
          .delete()
          .eq('id', testLink.id);
        console.log('✅ Test link cleaned up');
      }
    } else {
      console.log('⚠️ No tenant profile found for testing');
    }
  }
}

checkDatabaseState().catch(console.error);