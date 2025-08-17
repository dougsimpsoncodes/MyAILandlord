import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthenticatedSupabase } from '../hooks/useSupabaseWithAuth';

export const ConfigurationChecker: React.FC = () => {
  const { isSignedIn, user, getToken } = useAuth();
  const { client, isAuthenticated } = useAuthenticatedSupabase();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Environment Variables
      addResult('🔍 Checking environment variables...');
      const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!clerkKey) addResult('❌ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY missing');
      else addResult('✅ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY configured');
      
      if (!supabaseUrl) addResult('❌ EXPO_PUBLIC_SUPABASE_URL missing');
      else addResult('✅ EXPO_PUBLIC_SUPABASE_URL configured');
      
      if (!supabaseKey) addResult('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY missing');
      else addResult('✅ EXPO_PUBLIC_SUPABASE_ANON_KEY configured');

      // Test 2: Clerk Authentication
      addResult('🔍 Checking Clerk authentication...');
      if (!isSignedIn) {
        addResult('❌ User not signed in');
        return;
      }
      addResult('✅ User is signed in');
      addResult(`📱 User ID: ${user?.id}`);
      addResult(`📧 User Email: ${user?.emailAddresses?.[0]?.emailAddress || 'N/A'}`);

      // Test 3: JWT Token
      addResult('🔍 Testing JWT token...');
      try {
        const token = await getToken();
        if (token) {
          addResult('✅ JWT token retrieved successfully');
          
          // Decode JWT payload
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            addResult(`🔑 JWT payload: ${JSON.stringify(payload, null, 2)}`);
          } catch (e) {
            addResult('⚠️ Could not decode JWT payload');
          }
        } else {
          addResult('❌ JWT token is null');
        }
      } catch (error) {
        addResult(`❌ Error getting JWT token: ${error}`);
      }

      // Test 4: Supabase Authentication
      addResult('🔍 Checking Supabase authentication...');
      if (!isAuthenticated || !client) {
        addResult('❌ Supabase client not authenticated');
        return;
      }
      addResult('✅ Supabase client authenticated');

      // Test 5: Database Connection
      addResult('🔍 Testing database connection...');
      try {
        const { data, error } = await client.client
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (error) {
          addResult(`❌ Database query failed: ${error.message}`);
        } else {
          addResult('✅ Database connection successful');
        }
      } catch (error) {
        addResult(`❌ Database connection error: ${error}`);
      }

      // Test 6: Profile Operations
      if (isAuthenticated && client) {
        addResult('🔍 Testing profile operations...');
        try {
          // Try to get user profile
          const profile = await client.getProfile(user!.id);
          if (profile) {
            addResult('✅ Profile retrieved successfully');
            addResult(`👤 Profile ID: ${profile.id}`);
            addResult(`🎭 Role: ${profile.role || 'Not set'}`);
          } else {
            addResult('ℹ️ No profile found (this is normal for new users)');
          }
        } catch (error) {
          addResult(`❌ Profile operation failed: ${error}`);
        }
      }

    } catch (error) {
      addResult(`❌ Test suite error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Configuration Checker</Text>
      <Text style={styles.subtitle}>Debug Clerk-Supabase Integration</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={runTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Running Tests...' : 'Run Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No test results yet. Run tests to see configuration status.</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))
        )}
      </ScrollView>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Clerk Status: {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}
        </Text>
        <Text style={styles.statusText}>
          Supabase Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  clearButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
});