#!/usr/bin/env node

/**
 * Direct database setup for invite link testing
 * Uses service role key to bypass RLS for setup
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Try to use service role key, fallback to anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const supabaseKey = serviceRoleKey || anonKey;
console.log(`🔑 Using ${serviceRoleKey ? 'service role' : 'anon'} key`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database for invite link testing...\n');

    // 1. Create the property_invite_info view using SQL
    console.log('1️⃣ Creating property_invite_info view...');
    
    // Try different SQL approaches
    try {
      const { error: sqlError } = await supabase.sql`
        CREATE OR REPLACE VIEW public.property_invite_info AS
        SELECT id, name, address, property_type, unit
        FROM properties;
        
        GRANT SELECT ON public.property_invite_info TO anon, authenticated;
      `;
      
      if (sqlError) {
        console.log('❌ SQL method failed:', sqlError.message);
      } else {
        console.log('✅ View created with SQL method');
      }
    } catch (err) {
      console.log('❌ SQL method not available');
    }

    // 2. Create test landlord profile
    console.log('\n2️⃣ Creating test landlord...');
    
    const landlordId = uuidv4();
    const landlordClerkId = 'test-landlord-' + Date.now();
    
    const { data: landlord, error: landlordError } = await supabase
      .from('profiles')
      .upsert({
        id: landlordId,
        clerk_user_id: landlordClerkId,
        role: 'landlord',
        name: 'Test Landlord',
        email: 'landlord@test.com'
      }, { onConflict: 'clerk_user_id' })
      .select()
      .single();

    if (landlordError) {
      console.log('❌ Landlord creation failed:', landlordError.message);
    } else {
      console.log('✅ Landlord created:', landlord.name);
    }

    // 3. Create test property
    console.log('\n3️⃣ Creating test property...');
    
    const propertyId = uuidv4();
    
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .upsert({
        id: propertyId,
        name: 'Test Apartment for Invites',
        address: '123 Test Street, Los Angeles, CA 90210',
        property_type: 'apartment',
        unit: '4B',
        landlord_id: landlordId,
        bedrooms: 2,
        bathrooms: 1
      }, { onConflict: 'id' })
      .select()
      .single();

    if (propertyError) {
      console.log('❌ Property creation failed:', propertyError.message);
    } else {
      console.log('✅ Property created:', property.name);
    }

    // 4. Create test tenant profile  
    console.log('\n4️⃣ Creating test tenant...');
    
    const tenantId = uuidv4();
    const tenantClerkId = 'test-tenant-' + Date.now();
    
    const { data: tenant, error: tenantError } = await supabase
      .from('profiles')
      .upsert({
        id: tenantId,
        clerk_user_id: tenantClerkId,
        role: 'tenant',
        name: 'Test Tenant',
        email: 'tenant@test.com'
      }, { onConflict: 'clerk_user_id' })
      .select()
      .single();

    if (tenantError) {
      console.log('❌ Tenant creation failed:', tenantError.message);
    } else {
      console.log('✅ Tenant created:', tenant.name);
    }

    // 5. Test property invite info view
    if (property) {
      console.log('\n5️⃣ Testing property invite info...');
      
      const { data: inviteInfo, error: inviteError } = await supabase
        .from('property_invite_info')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (inviteError) {
        console.log('❌ Invite info test failed:', inviteError.message);
        
        // Try direct property query
        const { data: directProperty, error: directError } = await supabase
          .from('properties')
          .select('id, name, address, property_type, unit')
          .eq('id', propertyId)
          .single();
        
        if (directError) {
          console.log('❌ Direct property query failed:', directError.message);
        } else {
          console.log('✅ Direct property access works');
          console.log('   Property data:', directProperty);
        }
      } else {
        console.log('✅ Property invite info accessible');
        console.log('   Invite data:', inviteInfo);
      }
    }

    // 6. Test tenant property link creation
    if (property && tenant) {
      console.log('\n6️⃣ Testing tenant property link...');
      
      const linkId = uuidv4();
      
      const { data: link, error: linkError } = await supabase
        .from('tenant_property_links')
        .insert({
          id: linkId,
          tenant_id: tenantId,
          property_id: propertyId,
          is_active: true
        })
        .select()
        .single();

      if (linkError) {
        console.log('❌ Property link creation failed:', linkError.message);
        console.log('   Link data attempted:', { tenantId, propertyId });
      } else {
        console.log('✅ Property link created successfully');
        console.log('   Link ID:', link.id);
      }
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\nTest data created:');
    console.log(`- Landlord: ${landlord?.name} (${landlordClerkId})`);
    console.log(`- Property: ${property?.name} (${propertyId})`);
    console.log(`- Tenant: ${tenant?.name} (${tenantClerkId})`);
    
    console.log('\nYou can now test the invite link flow with these IDs.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupDatabase();