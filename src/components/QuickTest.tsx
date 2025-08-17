import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useUser, useSession } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';

export function QuickTest() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    if (!isSignedIn || !session) {
      setResult('❌ Not signed in');
      return;
    }

    try {
      // Create Supabase client with Clerk token
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (url, options = {}) => {
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

      // Test 1: Check JWT
      const { data: jwtTest, error: jwtError } = await supabase
        .rpc('get_auth_jwt_sub');

      if (jwtError) {
        setResult(`❌ JWT Test Failed: ${jwtError.message}`);
        return;
      }

      // Test 2: Try to read profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user!.id);

      if (profileError) {
        setResult(`❌ Profile Query Failed: ${profileError.message}`);
        return;
      }

      setResult(`✅ Success! 
JWT Sub: ${jwtTest}
Matches Clerk ID: ${jwtTest === user!.id}
Profiles found: ${profiles?.length || 0}`);

    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    }
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <Text>Please sign in to test</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Integration Test</Text>
      <Text>User: {user?.emailAddresses[0]?.emailAddress}</Text>
      <Text>Clerk ID: {user?.id}</Text>
      
      <Button title="Test Connection" onPress={testConnection} />
      
      {result && (
        <Text style={styles.result}>{result}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  result: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 4,
  },
});