require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function clearAllData() {
  console.log('Clearing ALL data from database...\n');
  
  // First, sign out any active sessions
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.log('Note: No active session to sign out');
  } else {
    console.log('✓ Signed out active session');
  }
  
  // Tables to clear in order
  const operations = [
    { table: 'maintenance_requests', where: 'id', op: 'neq', value: '00000000-0000-0000-0000-000000000000' },
    { table: 'tenants', where: 'id', op: 'neq', value: '00000000-0000-0000-0000-000000000000' },
    { table: 'properties', where: 'id', op: 'neq', value: '00000000-0000-0000-0000-000000000000' },
    { table: 'profiles', where: 'id', op: 'neq', value: '00000000-0000-0000-0000-000000000000' }
  ];
  
  console.log('Clearing tables:');
  for (const { table, where, op, value } of operations) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        [op](where, value)
        .select();
        
      if (error) {
        console.log(`✗ ${table}: ${error.message}`);
      } else {
        console.log(`✓ ${table}: Cleared ${data ? data.length : 0} rows`);
      }
    } catch (e) {
      console.log(`✗ ${table}: ${e.message}`);
    }
  }
  
  // Show what remains
  console.log('\nRemaining data check:');
  const tables = ['profiles', 'properties', 'tenants', 'maintenance_requests'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`  ${table}: Unable to count`);
      } else {
        console.log(`  ${table}: ${count || 0} rows`);
      }
    } catch (e) {
      console.log(`  ${table}: ${e.message}`);
    }
  }
  
  console.log('\n✅ Database clearing complete!');
  console.log('You can now start fresh with new user registrations.');
}

clearAllData().catch(console.error);