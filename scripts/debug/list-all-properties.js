const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, unit, property_code, code_expires_at')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n🏠 ALL PROPERTIES IN DATABASE:');
  console.log('=====================================\n');

  if (!data || data.length === 0) {
    console.log('❌ No properties found in database');
  } else {
    console.log(`Found ${data.length} properties:\n`);
    data.forEach((prop, i) => {
      console.log(`${i + 1}. ${prop.name}${prop.unit ? ` (Unit: ${prop.unit})` : ''}`);
      console.log(`   Code: ${prop.property_code || 'NOT SET'}`);
      console.log(`   ID: ${prop.id}`);
      console.log('');
    });
  }
}

listAllProperties();
