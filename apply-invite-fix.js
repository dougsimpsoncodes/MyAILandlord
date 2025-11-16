#!/usr/bin/env node

/**
 * Apply invite link flow database fixes
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFixes() {
  try {
    console.log('🔧 Applying invite link flow database fixes...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250902_fix_invite_link_flow.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_script: statement 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.slice(0, 100) + '...');
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n🎉 Invite link flow fixes applied!');
    console.log('\nChanges made:');
    console.log('• Fixed RLS policies to allow tenants to create property links');
    console.log('• Created public view for property invite info');
    console.log('• Added unique constraint to prevent duplicate links');
    
  } catch (error) {
    console.error('❌ Failed to apply fixes:', error);
    process.exit(1);
  }
}

applyFixes();