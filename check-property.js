const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperty() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .ilike('name', '%123 main%')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n🏠 Properties matching "123 Main St":');
  console.log('=====================================\n');

  if (!data || data.length === 0) {
    console.log('❌ No properties found');
  } else {
    data.forEach((prop, i) => {
      console.log(`Property ${i + 1}:`);
      console.log(`  ID: ${prop.id}`);
      console.log(`  Name: ${prop.name}`);
      console.log(`  Unit: ${prop.unit || 'N/A'}`);
      console.log(`  Property Code: ${prop.property_code || 'NOT SET'}`);
      console.log(`  Code Expires: ${prop.code_expires_at || 'N/A'}`);
      console.log(`  Address: ${JSON.stringify(prop.address_jsonb || prop.address)}`);
      console.log('');
    });
  }
}

checkProperty();
