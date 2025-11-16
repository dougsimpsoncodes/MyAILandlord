#!/usr/bin/env node

/**
 * Script to ensure all existing properties have property codes
 * This should be run once to fix any properties created before the property code system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPropertyCodes() {
  try {
    console.log('🔍 Checking for properties without codes...');
    
    // Get all properties without property codes
    const { data: propertiesWithoutCodes, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, property_code')
      .is('property_code', null);
    
    if (fetchError) {
      throw new Error(`Failed to fetch properties: ${fetchError.message}`);
    }
    
    if (!propertiesWithoutCodes || propertiesWithoutCodes.length === 0) {
      console.log('✅ All properties already have codes!');
      return;
    }
    
    console.log(`📝 Found ${propertiesWithoutCodes.length} properties without codes:`);
    propertiesWithoutCodes.forEach(p => {
      console.log(`   - ${p.name} (ID: ${p.id})`);
    });
    
    // Generate codes for each property
    for (const property of propertiesWithoutCodes) {
      console.log(`\n🔧 Generating code for "${property.name}"...`);
      
      // Generate a unique property code
      const { data: newCode, error: codeError } = await supabase
        .rpc('generate_property_code');
      
      if (codeError) {
        console.error(`❌ Failed to generate code for ${property.name}:`, codeError.message);
        continue;
      }
      
      // Update the property with the new code
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_code: newCode,
          code_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          allow_tenant_signup: true
        })
        .eq('id', property.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${property.name}:`, updateError.message);
      } else {
        console.log(`✅ Generated code "${newCode}" for "${property.name}"`);
      }
    }
    
    console.log('\n🎉 Property code update complete!');
    
    // Verify all properties now have codes
    const { data: allProperties, error: verifyError } = await supabase
      .from('properties')
      .select('name, property_code, allow_tenant_signup')
      .order('created_at', { ascending: false });
    
    if (!verifyError && allProperties) {
      console.log('\n📋 Final property code status:');
      allProperties.forEach(p => {
        const status = p.property_code ? '✅' : '❌';
        console.log(`   ${status} ${p.name}: ${p.property_code || 'NO CODE'}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

// Run the script
fixPropertyCodes();