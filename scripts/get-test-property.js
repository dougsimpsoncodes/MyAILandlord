const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function getProperties() {
  // First, sign in as the landlord user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'goblue12@aol.com',
    password: '1234567',
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Logged in as:', authData.user.email);

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, address')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Properties found:');
  console.log(JSON.stringify(data, null, 2));
}

getProperties();
