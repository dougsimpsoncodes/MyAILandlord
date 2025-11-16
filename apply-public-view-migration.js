#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Create a script to apply the public property view migration
const applyMigration = async () => {
  try {
    console.log('🔧 Starting migration to create public property view...');
    
    // You'll need to set your SUPABASE_URL and SERVICE_KEY as environment variables
    // or replace with your actual values
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zxqhxjuwmkxevhkpqfzf.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!serviceKey) {
      console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // SQL to create the public view
    const sql = `
      -- Create a public view for property invite previews
      -- This allows anonymous users to see basic property details for invites

      CREATE OR REPLACE VIEW public_property_invite_info AS
      SELECT 
        id,
        name,
        address,
        property_type,
        created_at
      FROM properties;

      -- Allow anonymous users to read from this view
      ALTER VIEW public_property_invite_info ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow anonymous property invite preview" ON public_property_invite_info;
      
      CREATE POLICY "Allow anonymous property invite preview" ON public_property_invite_info
      FOR SELECT 
      TO anon
      USING (true);
    `;
    
    console.log('📝 Executing SQL migration...');
    console.log(sql);
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ public_property_invite_info view created');
    console.log('✅ Anonymous access policy applied');
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
};

applyMigration();