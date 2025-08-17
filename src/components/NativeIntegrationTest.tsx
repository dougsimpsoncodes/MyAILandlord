import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useUser, useSession } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';

export function NativeIntegrationTest() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const [result, setResult] = useState<string>('');

  const testNativeIntegration = async () => {
    if (!isSignedIn || !session || !user) {
      setResult('❌ Not signed in with Clerk');
      return;
    }

    try {
      // Native Clerk + Supabase integration
      // No JWT templates, just session.getToken()
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (url, options = {}) => {
              // This is the native integration - no template parameter!
              const token = await session.getToken();
              const headers = new Headers(options.headers);
              if (token) {
                headers.set('Authorization', `Bearer ${token}`);
              }
              return fetch(url, { ...options, headers });
            },
          },
        }
      );

      // Test 1: Check if Supabase can read the Clerk user ID from the token
      const { data: clerkId, error: authError } = await supabase
        .rpc('get_auth_jwt_sub');

      if (authError) {
        setResult(`❌ Auth Test Failed: ${authError.message}
        
This likely means Clerk is not configured as a third-party provider in Supabase.`);
        return;
      }

      // Test 2: Try a simple authenticated query
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single();

      const success = clerkId === user.id;
      
      setResult(`${success ? '✅' : '❌'} Native Integration Test
      
Clerk User ID: ${user.id}
Supabase sees: ${clerkId}
Match: ${success}

Profile query: ${profileError ? `Failed: ${profileError.message}` : 'Success'}

${success ? 
  '🎉 Native integration is working!' : 
  '⚠️ Clerk user ID mismatch - check third-party provider config'}`);

    } catch (error: any) {
      setResult(`❌ Connection Error: ${error.message}
      
This suggests the basic Supabase connection isn't working.`);
    }
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Native Clerk + Supabase Test</Text>
        <Text>Please sign in with Clerk to test the native integration</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Native Integration Test</Text>
      <Text style={styles.info}>Testing: session.getToken() → Supabase</Text>
      <Text style={styles.user}>User: {user.emailAddresses[0]?.emailAddress}</Text>
      
      <Button title="Test Native Integration" onPress={testNativeIntegration} />
      
      {result && (
        <Text style={styles.result}>{result}</Text>
      )}
      
      <Text style={styles.note}>
        Note: This uses the native integration (no JWT templates).
        Clerk is configured as a third-party auth provider in Supabase.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  user: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  result: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});