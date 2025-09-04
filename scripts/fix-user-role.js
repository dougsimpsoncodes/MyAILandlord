require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixUserRole() {
  const email = '1airbnbuser@gmail.com'; // Your Google email from the logs
  const clerkId = 'user_32D3tASWubEjlYfTrsjJKO2dl04'; // Your Clerk ID from the logs
  
  console.log(`Checking profile for ${email}...`);
  
  // Check current profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkId)
    .single();
    
  if (fetchError) {
    console.error('Error fetching profile:', fetchError);
    return;
  }
  
  console.log('Current profile:', profile);
  
  // Update role to landlord if needed
  if (!profile.role || profile.role !== 'landlord') {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'landlord' })
      .eq('clerk_user_id', clerkId);
      
    if (updateError) {
      console.error('Error updating role:', updateError);
    } else {
      console.log('✅ Role updated to landlord');
    }
  } else {
    console.log('✅ Role is already set to landlord');
  }
}

fixUserRole().catch(console.error);