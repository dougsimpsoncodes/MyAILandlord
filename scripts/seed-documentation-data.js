#!/usr/bin/env node
/**
 * Seed Documentation Data
 *
 * Creates comprehensive test data for app documentation:
 * - 2 test accounts (landlord + tenant)
 * - 2 properties with areas and assets
 * - Maintenance requests and messages
 * - Realistic data for screenshot automation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create client with anon key (for auth operations like signup)
const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test account credentials
const LANDLORD_EMAIL = 'landlord-doc@myailandlord.com';
const LANDLORD_PASSWORD = 'TestDoc2025!';
const LANDLORD_NAME = 'John';

const TENANT_EMAIL = 'tenant-doc@myailandlord.com';
const TENANT_PASSWORD = 'TestDoc2025!';
const TENANT_NAME = 'Sarah';

async function clearTestData() {
  console.log('\n🧹 Clearing existing test data...');

  try {
    // Get existing user IDs first
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${LANDLORD_EMAIL},email.eq.${TENANT_EMAIL}`);

    const userIds = (existingProfiles || []).map(p => p.id);

    if (userIds.length === 0) {
      console.log('  ℹ️  No existing test data found');
      console.log('✅ Nothing to clear\n');
      return;
    }

    // Delete in order to respect foreign key constraints
    // Use RPC or direct SQL for complex deletions
    for (const userId of userIds) {
      // Delete messages
      await supabase.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

      // Delete maintenance requests
      await supabase.from('maintenance_requests').delete().or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`);

      // Delete tenant links
      await supabase.from('tenant_property_links').delete().eq('tenant_id', userId);

      // Get properties for this user
      const { data: properties } = await supabase.from('properties').select('id').eq('landlord_id', userId);

      if (properties && properties.length > 0) {
        const propertyIds = properties.map(p => p.id);

        // Delete property areas
        for (const propId of propertyIds) {
          await supabase.from('property_areas').delete().eq('property_id', propId);
        }

        // Delete properties
        await supabase.from('properties').delete().eq('landlord_id', userId);
      }
    }

    console.log('  ✓ Related data cleared');

    // Delete invites
    await supabase.from('invites').delete().or(`intended_email.eq.${LANDLORD_EMAIL},intended_email.eq.${TENANT_EMAIL}`);
    console.log('  ✓ Invites cleared');

    // Delete profiles
    await supabase.from('profiles').delete().or(`email.eq.${LANDLORD_EMAIL},email.eq.${TENANT_EMAIL}`);
    console.log('  ✓ Profiles cleared');

    console.log('✅ Test data cleared successfully\n');
  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
    // Don't throw - allow script to continue even if cleanup fails
    console.log('⚠️  Continuing despite cleanup errors...\n');
  }
}

async function createLandlordAccount() {
  console.log('👨‍💼 Creating landlord account...');

  try {
    // Create auth user using signup (works without service role)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: LANDLORD_EMAIL,
      password: LANDLORD_PASSWORD,
      options: {
        data: {
          first_name: LANDLORD_NAME
        }
      }
    });

    if (authError) throw authError;

    const landlordId = authData.user.id;
    console.log(`  ✓ Auth user created: ${landlordId}`);

    // Profile should be created automatically by trigger, but upsert to be safe
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: landlordId,
        email: LANDLORD_EMAIL,
        name: LANDLORD_NAME,
        role: 'landlord'
      }, {
        onConflict: 'id'
      });

    if (profileError) throw profileError;
    console.log('  ✓ Profile created/updated');

    console.log(`✅ Landlord account created: ${LANDLORD_EMAIL}\n`);
    return landlordId;
  } catch (error) {
    console.error('❌ Error creating landlord account:', error.message);
    throw error;
  }
}

async function createTenantAccount() {
  console.log('👤 Creating tenant account...');

  try {
    // Create auth user using signup (works without service role)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TENANT_EMAIL,
      password: TENANT_PASSWORD,
      options: {
        data: {
          first_name: TENANT_NAME,
          role: 'tenant'  // Include role in metadata to prevent useProfileSync from defaulting to 'landlord'
        }
      }
    });

    if (authError) throw authError;

    const tenantId = authData.user.id;
    console.log(`  ✓ Auth user created: ${tenantId}`);

    // Profile should be created automatically by trigger, but upsert to be safe
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: tenantId,
        email: TENANT_EMAIL,
        name: TENANT_NAME,
        role: 'tenant'
      }, {
        onConflict: 'id'
      });

    if (profileError) throw profileError;
    console.log('  ✓ Profile created/updated');

    console.log(`✅ Tenant account created: ${TENANT_EMAIL}\n`);
    return tenantId;
  } catch (error) {
    console.error('❌ Error creating tenant account:', error.message);
    throw error;
  }
}

async function createProperties(landlordId) {
  console.log('🏠 Creating properties...');

  try {
    // Property 1: Sunset Apartments
    const property1Data = {
      landlord_id: landlordId,
      name: 'Sunset Apartments (Doc)',
      address_jsonb: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        formatted: '123 Main St, San Francisco, CA 94105'
      },
      property_type: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      unit: 'Apt 2B'
    };

    const { data: property1, error: prop1Error } = await supabase
      .from('properties')
      .insert(property1Data)
      .select()
      .single();

    if (prop1Error) throw prop1Error;
    console.log(`  ✓ Property 1 created: ${property1.id}`);

    // Property 2: Oak Street Townhome
    const property2Data = {
      landlord_id: landlordId,
      name: 'Oak Street Townhome (Doc)',
      address_jsonb: {
        street: '456 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        formatted: '456 Oak Street, San Francisco, CA 94102'
      },
      property_type: 'townhouse',
      bedrooms: 3,
      bathrooms: 2.5
    };

    const { data: property2, error: prop2Error } = await supabase
      .from('properties')
      .insert(property2Data)
      .select()
      .single();

    if (prop2Error) throw prop2Error;
    console.log(`  ✓ Property 2 created: ${property2.id}`);

    console.log('✅ Properties created successfully\n');
    return [property1, property2];
  } catch (error) {
    console.error('❌ Error creating properties:', error.message);
    throw error;
  }
}

async function createPropertyAreas(property1Id) {
  console.log('📐 Creating property areas...');

  try {
    const areas = [
      { property_id: property1Id, name: 'Kitchen', area_type: 'kitchen' },
      { property_id: property1Id, name: 'Living Room', area_type: 'living_room' },
      { property_id: property1Id, name: 'Master Bedroom', area_type: 'bedroom' },
      { property_id: property1Id, name: 'Bedroom 2', area_type: 'bedroom' },
      { property_id: property1Id, name: 'Bathroom', area_type: 'bathroom' }
    ];

    const { data, error } = await supabase
      .from('property_areas')
      .insert(areas)
      .select();

    if (error) throw error;
    console.log(`  ✓ Created ${data.length} areas`);

    console.log('✅ Property areas created successfully\n');
    return data;
  } catch (error) {
    console.error('❌ Error creating property areas:', error.message);
    throw error;
  }
}

async function linkTenantToProperty(tenantId, property1Id) {
  console.log('🔗 Linking tenant to property...');

  try {
    const { error } = await supabase
      .from('tenant_property_links')
      .insert({
        tenant_id: tenantId,
        property_id: property1Id,
        is_active: true
      });

    if (error) throw error;
    console.log('  ✓ Tenant linked to Sunset Apartments');

    console.log('✅ Tenant property link created\n');
  } catch (error) {
    console.error('❌ Error linking tenant to property:', error.message);
    throw error;
  }
}

async function createMaintenanceRequests(landlordId, tenantId, property1Id) {
  console.log('🔧 Creating maintenance requests...');

  try {
    // Active request
    const { data: request1, error: req1Error } = await supabase
      .from('maintenance_requests')
      .insert({
        property_id: property1Id,
        tenant_id: tenantId,
        title: 'Kitchen faucet leaking',
        description: 'The kitchen faucet has been dripping constantly. Water is pooling under the sink.',
        area: 'Kitchen',
        asset: 'Kitchen Sink Faucet',
        issue_type: 'Leaking',
        priority: 'medium',
        status: 'in_progress'
      })
      .select()
      .single();

    if (req1Error) throw req1Error;
    console.log('  ✓ Active maintenance request created');

    // Completed request
    const { data: request2, error: req2Error } = await supabase
      .from('maintenance_requests')
      .insert({
        property_id: property1Id,
        tenant_id: tenantId,
        title: 'Air conditioner not cooling',
        description: 'AC unit running but not cooling the apartment. Temperature stays at 78°F.',
        area: 'Living Room',
        asset: 'Air Conditioner',
        issue_type: 'Not Working',
        priority: 'high',
        status: 'completed',
        completion_notes: 'Replaced air filter and recharged refrigerant. System working normally.'
      })
      .select()
      .single();

    if (req2Error) throw req2Error;
    console.log('  ✓ Completed maintenance request created');

    console.log('✅ Maintenance requests created\n');
    return [request1, request2];
  } catch (error) {
    console.error('❌ Error creating maintenance requests:', error.message);
    throw error;
  }
}

async function createMessages(landlordId, tenantId, property1Id, landlordPassword) {
  console.log('💬 Creating message thread...');

  try {
    // Authenticate as landlord to create messages (RLS policy requires auth)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: LANDLORD_EMAIL,
      password: landlordPassword
    });

    if (signInError) {
      console.log('  ⚠️  Could not authenticate to create messages, skipping...');
      return;
    }

    const messages = [
      {
        sender_id: tenantId,
        recipient_id: landlordId,
        property_id: property1Id,
        content: 'Hi John, the faucet in the kitchen is leaking. Could you take a look?',
        is_read: true
      },
      {
        sender_id: landlordId,
        recipient_id: tenantId,
        property_id: property1Id,
        content: 'Thanks for letting me know, Sarah. I\'ll send a plumber over tomorrow morning.',
        is_read: true
      },
      {
        sender_id: tenantId,
        recipient_id: landlordId,
        property_id: property1Id,
        content: 'Perfect, I\'ll be home after 9am. Thanks!',
        is_read: true
      },
      {
        sender_id: landlordId,
        recipient_id: tenantId,
        property_id: property1Id,
        content: 'The plumber fixed the leak. Please let me know if you notice any other issues.',
        is_read: false
      }
    ];

    const { data, error } = await supabase
      .from('messages')
      .insert(messages)
      .select();

    if (error) throw error;
    console.log(`  ✓ Created ${data.length} messages`);

    // Sign out after creating messages
    await supabase.auth.signOut();

    console.log('✅ Message thread created\n');
  } catch (error) {
    console.error('❌ Error creating messages:', error.message);
    // Don't throw - messages are nice to have but not critical
    console.log('⚠️  Skipping messages, continuing...\n');
  }
}

async function main() {
  console.log('🚀 Starting documentation data seeding...\n');

  try {
    // Step 1: Clear existing test data
    await clearTestData();

    // Step 2: Create accounts
    const landlordId = await createLandlordAccount();
    const tenantId = await createTenantAccount();

    // Step 3: Create properties
    const [property1, property2] = await createProperties(landlordId);

    // Step 4: Create property areas for property 1
    await createPropertyAreas(property1.id);

    // Step 5: Link tenant to property 1
    await linkTenantToProperty(tenantId, property1.id);

    // Step 6: Create maintenance requests
    await createMaintenanceRequests(landlordId, tenantId, property1.id);

    // Step 7: Create message thread
    await createMessages(landlordId, tenantId, property1.id, LANDLORD_PASSWORD);

    console.log('\n✅ Documentation data seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log(`   Landlord: ${LANDLORD_EMAIL} / ${LANDLORD_PASSWORD}`);
    console.log(`   Tenant:   ${TENANT_EMAIL} / ${TENANT_PASSWORD}`);
    console.log('\n📊 Data Summary:');
    console.log('   • 2 user accounts');
    console.log('   • 2 properties');
    console.log('   • 5 property areas');
    console.log('   • 2 maintenance requests');
    console.log('   • 4 messages');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
