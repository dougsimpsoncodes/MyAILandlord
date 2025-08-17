import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

export function JWTValidationTest() {
  const { getToken, isSignedIn, user } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFn();
      setResults(prev => ({ ...prev, [testName]: { success: true, data: result } }));
    } catch (error: any) {
      setResults(prev => ({ ...prev, [testName]: { success: false, error: error.message } }));
    } finally {
      setLoading(false);
    }
  };

  const testClerkToken = async () => {
    const token = await getToken();
    if (!token) throw new Error('No token received from Clerk');
    
    // Decode JWT to inspect claims
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    return {
      tokenLength: token.length,
      header: JSON.parse(atob(parts[0])),
      payload,
      tokenPreview: token.substring(0, 50) + '...'
    };
  };

  const testSupabaseAuth = async () => {
    const token = await getToken();
    if (!token) throw new Error('No token from Clerk');

    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await supabase.rpc('get_current_user_id');
    if (error) throw error;
    return { supabaseUserId: data };
  };

  const testSupabaseDebug = async () => {
    const token = await getToken();
    if (!token) throw new Error('No token from Clerk');

    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await supabase.rpc('debug_jwt_full');
    if (error) throw error;
    return data;
  };

  const testProfileQuery = async () => {
    const token = await getToken();
    if (!token) throw new Error('No token from Clerk');

    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', user?.id)
      .single();
      
    if (error) throw error;
    return data;
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Please sign in to run JWT validation tests</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>JWT Validation Test Suite</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Clerk User ID:</Text>
        <Text style={styles.value}>{user?.id}</Text>
        <Text style={styles.label}>Clerk Email:</Text>
        <Text style={styles.value}>{user?.emailAddresses?.[0]?.emailAddress}</Text>
      </View>

      <View style={styles.testSection}>
        <Button 
          title="1. Test Clerk Token Generation" 
          onPress={() => runTest('clerkToken', testClerkToken)}
          disabled={loading}
        />
        {results.clerkToken && (
          <View style={styles.result}>
            {results.clerkToken.success ? (
              <>
                <Text style={styles.success}>✅ Token generated successfully</Text>
                <Text style={styles.detail}>Algorithm: {results.clerkToken.data.header.alg}</Text>
                <Text style={styles.detail}>Subject: {results.clerkToken.data.payload.sub}</Text>
                <Text style={styles.detail}>Email: {results.clerkToken.data.payload.email}</Text>
                <Text style={styles.detail}>Issuer: {results.clerkToken.data.payload.iss}</Text>
              </>
            ) : (
              <Text style={styles.error}>❌ {results.clerkToken.error}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.testSection}>
        <Button 
          title="2. Test Supabase Auth (auth.uid())" 
          onPress={() => runTest('supabaseAuth', testSupabaseAuth)}
          disabled={loading || !results.clerkToken?.success}
        />
        {results.supabaseAuth && (
          <View style={styles.result}>
            {results.supabaseAuth.success ? (
              <>
                <Text style={styles.success}>✅ JWT validated by Supabase!</Text>
                <Text style={styles.detail}>Supabase sees user as: {results.supabaseAuth.data.supabaseUserId}</Text>
              </>
            ) : (
              <Text style={styles.error}>❌ JWT validation failed: {results.supabaseAuth.error}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.testSection}>
        <Button 
          title="3. Debug JWT Claims (detailed)" 
          onPress={() => runTest('debugJWT', testSupabaseDebug)}
          disabled={loading || !results.clerkToken?.success}
        />
        {results.debugJWT && (
          <View style={styles.result}>
            {results.debugJWT.success ? (
              <>
                <Text style={styles.success}>✅ Full JWT debug info:</Text>
                <Text style={styles.detail}>{JSON.stringify(results.debugJWT.data, null, 2)}</Text>
              </>
            ) : (
              <Text style={styles.error}>❌ {results.debugJWT.error}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.testSection}>
        <Button 
          title="4. Test Profile Query with RLS" 
          onPress={() => runTest('profileQuery', testProfileQuery)}
          disabled={loading || !results.supabaseAuth?.success}
        />
        {results.profileQuery && (
          <View style={styles.result}>
            {results.profileQuery.success ? (
              <>
                <Text style={styles.success}>✅ RLS policies working!</Text>
                <Text style={styles.detail}>Profile: {JSON.stringify(results.profileQuery.data, null, 2)}</Text>
              </>
            ) : (
              <Text style={styles.error}>❌ RLS query failed: {results.profileQuery.error}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.diagnosis}>
        <Text style={styles.diagnosisTitle}>Diagnosis:</Text>
        {!results.clerkToken && <Text>• Run test 1 to start</Text>}
        {results.clerkToken?.success && !results.supabaseAuth && <Text>• Token generated. Run test 2 to verify Supabase JWT config</Text>}
        {results.clerkToken?.success && results.supabaseAuth?.error && (
          <Text style={styles.error}>• JWT validation failing. Check Supabase JWT Provider config (JWKS URL and Issuer)</Text>
        )}
        {results.supabaseAuth?.success && results.profileQuery?.error && (
          <Text style={styles.warning}>• JWT works but RLS fails. Need to update RLS policies to use auth.uid() instead of custom functions</Text>
        )}
        {results.profileQuery?.success && (
          <Text style={styles.success}>• Everything is working! JWT validation and RLS policies are correctly configured.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  value: {
    color: '#666',
    marginBottom: 5,
  },
  testSection: {
    marginBottom: 20,
  },
  result: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
  warning: {
    color: 'orange',
    fontWeight: 'bold',
  },
  detail: {
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  diagnosis: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  diagnosisTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
});