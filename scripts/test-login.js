const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing login with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
    const email = 'test-landlord@myailandlord.com';
    const password = 'MyAI2025!Landlord#Test';

    console.log('Attempting login for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Login failed:', error.message);
        console.error('Error details:', error);
    } else {
        console.log('Login successful!');
        console.log('User ID:', data.user?.id);
        console.log('Session Token:', data.session?.access_token?.substring(0, 20) + '...');
    }
}

testLogin();
