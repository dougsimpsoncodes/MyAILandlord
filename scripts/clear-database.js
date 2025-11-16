require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use anon key since we don't have service role key in env
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function clearAllData() {
  console.log('Attempting to clear all data from database...');
  console.log('Note: This will only clear data you have access to with current RLS policies.');
  
  // Tables to clear in order (respecting foreign key constraints)
  const tables = [
    'maintenance_requests',
    'tenants', 
    'property_invitations',
    'invite_links',
    'properties'
  ];
  
  console.log('\nClearing tables:');
  for (const table of tables) {
    try {
      // Try to delete all rows we have access to
      const { data, error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all non-zero UUID rows
        .select();
        
      if (error) {
        console.log(`${table}: ${error.message}`);
      } else {
        console.log(`${table}: Cleared ${data ? data.length : 0} rows`);
      }
    } catch (e) {
      console.log(`${table}: ${e.message}`);
    }
  }
  
  // Check what's left in tables
  console.log('\nChecking remaining data:');
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`${table}: Unable to count - ${error.message}`);
      } else {
        console.log(`${table}: ${count || 0} rows remaining`);
      }
    } catch (e) {
      console.log(`${table}: ${e.message}`);
    }
  }
}

clearAllData().catch(console.error);