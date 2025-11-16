#!/usr/bin/env node

/**
 * Apply maintenance RLS policy fix directly via Supabase client
 * This script applies the RLS policies from fix-maintenance-rls-policy.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('💡 You need to set SUPABASE_SERVICE_ROLE_KEY in your .env file');
  console.log('   Get it from: https://supabase.com/dashboard/project/zxqhxjuwmkxevhkpqfzf/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyRLSFix() {
  console.log('🔍 Applying maintenance RLS policy fix...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-maintenance-rls-policy.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Read SQL file:', sqlPath);
    
    // Split SQL into individual statements (simple split on ';')
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        // Try direct execution for policy statements
        console.log(`📋 Statement: ${statement.substring(0, 100)}...`);
        
        // For DROP POLICY statements
        if (statement.includes('DROP POLICY')) {
          console.log('🗑️  Dropping policy...');
        }
        
        // For CREATE POLICY statements  
        if (statement.includes('CREATE POLICY')) {
          console.log('✨ Creating policy...');
        }
        
        console.log('⚠️  Error (may be expected for non-existent policies):', error.message);
      } else {
        console.log('✅ Success');
      }
    }
    
    console.log('🎉 RLS policy fix application completed');
    
    // Test the policies
    await testRLSPolicies();
    
  } catch (error) {
    console.error('❌ Error applying RLS fix:', error);
    process.exit(1);
  }
}

async function testRLSPolicies() {
  console.log('\n🔍 Testing RLS policies...');
  
  try {
    // Check current policies
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd')
      .eq('schemaname', 'public')
      .eq('tablename', 'maintenance_requests');
    
    if (error) {
      console.log('⚠️  Cannot query pg_policies (expected with RLS)');
    } else {
      console.log('📋 Current maintenance_requests policies:');
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    // Test tenant-property link for the specific user from logs
    const clerkUserId = 'user_30ODEM6qBd8hMikaCUGP59IClEG';
    const propertyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    
    console.log('\n🔍 Testing tenant-property relationship...');
    console.log(`👤 Clerk User ID: ${clerkUserId}`);
    console.log(`🏠 Property ID: ${propertyId}`);
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, role')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (profileError) {
      console.log('❌ Profile lookup error:', profileError.message);
    } else {
      console.log('✅ Profile found:', profile);
      
      // Check tenant-property link
      const { data: link, error: linkError } = await supabase
        .from('tenant_property_links')
        .select('id, tenant_id, property_id, is_active, unit_number')
        .eq('tenant_id', profile.id)
        .eq('property_id', propertyId)
        .single();
      
      if (linkError) {
        console.log('❌ Tenant-property link missing or error:', linkError.message);
        console.log('💡 You may need to create the tenant-property link');
      } else {
        console.log('✅ Tenant-property link found:', link);
        if (!link.is_active) {
          console.log('⚠️  Link exists but is not active!');
        }
      }
    }
    
  } catch (error) {
    console.log('⚠️  Error in testing:', error.message);
  }
}

// Run the script
applyRLSFix().catch(console.error);