#!/usr/bin/env node
// Script to apply RLS migration directly to fix maintenance request creation issue

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // We need service role for schema changes

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running RLS standardization migration...');
    
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250904_fix_rls_standardize.sql', 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ RLS migration applied successfully');
    
    // Test the policies
    console.log('🔄 Testing policies...');
    
    // Test JWT access
    const { data: jwtTest } = await supabase.rpc('test_sql', {
      sql_query: "SELECT auth.jwt() ->> 'sub' AS clerk_sub;"
    });
    
    console.log('JWT test result:', jwtTest);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();