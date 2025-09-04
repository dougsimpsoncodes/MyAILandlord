#!/usr/bin/env node

/**
 * Check if tenant-property link exists for the user experiencing RLS issues
 * This uses the anon key which should work for basic queries
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTenantPropertyLink() {
  console.log('🔍 Checking tenant-property relationship...');
  
  const clerkUserId = 'user_30ODEM6qBd8hMikaCUGP59IClEG';
  const propertyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  
  console.log(`👤 Clerk User ID: ${clerkUserId}`);
  console.log(`🏠 Property ID: ${propertyId}`);
  
  try {
    // Check profile
    console.log('\n📋 Looking up profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, role')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (profileError) {
      console.log('❌ Profile lookup error:', profileError.message);
      console.log('🔍 This might be expected due to RLS on profiles table');
    } else {
      console.log('✅ Profile found:', profile);
      
      // Check tenant-property link
      console.log('\n🔗 Looking up tenant-property link...');
      const { data: links, error: linkError } = await supabase
        .from('tenant_property_links')
        .select('id, tenant_id, property_id, is_active, unit_number, created_at')
        .eq('tenant_id', profile.id)
        .eq('property_id', propertyId);
      
      if (linkError) {
        console.log('❌ Tenant-property link error:', linkError.message);
      } else {
        if (links && links.length > 0) {
          console.log('✅ Tenant-property links found:');
          links.forEach(link => {
            console.log(`   - ID: ${link.id}`);
            console.log(`   - Active: ${link.is_active}`);
            console.log(`   - Unit: ${link.unit_number || 'N/A'}`);
            console.log(`   - Created: ${link.created_at}`);
          });
          
          const activeLinks = links.filter(link => link.is_active);
          if (activeLinks.length === 0) {
            console.log('⚠️  No ACTIVE links found! This is likely the issue.');
            console.log('💡 Need to activate or create an active tenant-property link');
          }
        } else {
          console.log('❌ No tenant-property links found');
          console.log('💡 This is the likely cause of the RLS violation');
          console.log('   The RLS policy requires an active tenant_property_link');
        }
      }
    }
    
    // Check property exists
    console.log('\n🏠 Verifying property exists...');
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, address, landlord_id')
      .eq('id', propertyId)
      .single();
    
    if (propertyError) {
      console.log('❌ Property lookup error:', propertyError.message);
    } else {
      console.log('✅ Property found:', property);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the check
checkTenantPropertyLink().catch(console.error);