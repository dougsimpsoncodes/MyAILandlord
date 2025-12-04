const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing public signup with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const email = `test-user-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    console.log('Attempting signup for:', email);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Signup failed:', error.message);
    } else {
        console.log('Signup successful!');
        console.log('User ID:', data.user?.id);
        console.log('Session:', data.session ? 'Created' : 'None (email confirmation required?)');
    }
}

testSignup();
