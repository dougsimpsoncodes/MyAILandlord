import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useClerkSupabase } from '../hooks/useClerkSupabaseClient';
import { ClerkSupabaseClient } from '../services/supabase/ClerkSupabaseClient';

/**
 * Test component for Native Clerk + Supabase integration
 * Tests the recommended integration approach (no JWT templates)
 */
export function ClerkSupabaseTest() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { client, clerkUserId } = useClerkSupabase();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading Clerk...</Text>
      </View>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Please sign in to test the integration</Text>
      </View>
    );
  }

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFn();
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message || String(error) }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAuthJWT = async () => {
    // Test if auth.jwt()->>'sub' returns the Clerk user ID
    const { data, error } = await client
      .rpc('get_auth_jwt_sub')
      .single();
    
    if (error) throw error;
    
    return {
      jwtSub: data,
      matchesClerkId: data === clerkUserId,
      clerkUserId
    };
  };

  const testProfileCRUD = async () => {
    const supabaseClient = new ClerkSupabaseClient(client, clerkUserId);
    
    // Test READ
    let profile = await supabaseClient.getProfile();
    const existingProfile = profile;
    
    if (!profile) {
      // Test CREATE
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) throw new Error('No email found');
      
      profile = await supabaseClient.createProfile({
        email,
        name: user.fullName || 'Test User',
        role: 'tenant'
      });
    }
    
    // Test UPDATE
    const updatedProfile = await supabaseClient.updateProfile({
      name: `Updated at ${new Date().toISOString()}`
    });
    
    return {
      existingProfile,
      createdOrFound: profile,
      updated: updatedProfile
    };
  };

  const testRLSPolicies = async () => {
    // Try to access profiles table directly
    const { data: myProfile, error: myError } = await client
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    // Try to access someone else's profile (should fail)
    const { data: otherProfile, error: otherError } = await client
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', 'fake_user_id')
      .single();
    
    return {
      canReadOwnProfile: !myError,
      ownProfileData: myProfile,
      cannotReadOthers: !!otherError,
      otherError: otherError?.message
    };
  };

  const testPropertyOperations = async () => {
    const supabaseClient = new ClerkSupabaseClient(client, clerkUserId);
    
    // Ensure profile exists first
    let profile = await supabaseClient.getProfile();
    if (!profile) {
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) throw new Error('No email found');
      
      profile = await supabaseClient.createProfile({
        email,
        name: user.fullName || 'Test User',
        role: 'landlord'
      });
    }
    
    // Create a test property
    const property = await supabaseClient.createProperty({
      name: 'Test Property',
      address: '123 Test St',
      type: 'apartment',
      bedrooms: 2,
      bathrooms: 1
    });
    
    // Read properties
    const properties = await supabaseClient.getProperties();
    
    // Update property
    const updated = await supabaseClient.updateProperty(property.id, {
      name: 'Updated Test Property'
    });
    
    // Delete property
    await supabaseClient.deleteProperty(property.id);
    
    return {
      created: property,
      listed: properties.length,
      updated: updated.name === 'Updated Test Property',
      deleted: true
    };
  };

  const runAllTests = async () => {
    await runTest('authJWT', testAuthJWT);
    await runTest('profileCRUD', testProfileCRUD);
    await runTest('rlsPolicies', testRLSPolicies);
    await runTest('properties', testPropertyOperations);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Native Clerk + Supabase Integration Test</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.label}>Clerk User ID:</Text>
        <Text style={styles.value}>{clerkUserId}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user.emailAddresses[0]?.emailAddress}</Text>
      </View>

      <View style={styles.actions}>
        <Button 
          title="Run All Tests" 
          onPress={runAllTests}
          disabled={loading}
        />
      </View>

      {/* Test Results */}
      {Object.entries(testResults).map(([testName, result]: [string, any]) => (
        <View key={testName} style={styles.testResult}>
          <Text style={styles.testName}>{testName}</Text>
          {result.success ? (
            <>
              <Text style={styles.success}>✅ Test Passed</Text>
              <Text style={styles.detail}>
                {JSON.stringify(result.data, null, 2)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.error}>❌ Test Failed</Text>
              <Text style={styles.errorDetail}>{result.error}</Text>
            </>
          )}
        </View>
      ))}

      {/* Diagnosis */}
      {Object.keys(testResults).length > 0 && (
        <View style={styles.diagnosis}>
          <Text style={styles.diagnosisTitle}>Integration Status:</Text>
          {testResults.authJWT?.success ? (
            <Text style={styles.success}>✅ JWT Authentication Working</Text>
          ) : (
            <Text style={styles.error}>❌ JWT Authentication Failed - Check Clerk provider in Supabase</Text>
          )}
          {testResults.profileCRUD?.success ? (
            <Text style={styles.success}>✅ Profile Operations Working</Text>
          ) : (
            <Text style={styles.error}>❌ Profile Operations Failed</Text>
          )}
          {testResults.rlsPolicies?.success ? (
            <Text style={styles.success}>✅ RLS Policies Working</Text>
          ) : (
            <Text style={styles.error}>❌ RLS Policies Failed</Text>
          )}
        </View>
      )}
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
  infoBox: {
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
  actions: {
    marginBottom: 20,
  },
  testResult: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  testName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  errorDetail: {
    fontSize: 12,
    color: 'red',
    marginTop: 5,
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