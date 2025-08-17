import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuthenticatedSupabase } from '../hooks/useSupabaseWithAuth';

/**
 * Example component showing proper usage of authenticated Supabase client
 * This demonstrates the correct pattern for Clerk-Supabase integration
 */
export const ExampleUsage: React.FC = () => {
  const { client, isAuthenticated, user } = useAuthenticatedSupabase();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Example 1: Get user profile
  const handleGetProfile = async () => {
    if (!client || !user) {
      Alert.alert('Error', 'Client not authenticated or user not found');
      return;
    }

    setLoading(true);
    try {
      const userProfile = await client.getProfile(user.id);
      setProfile(userProfile);
      
      if (userProfile) {
        Alert.alert('Success', `Profile found: ${userProfile.name || 'No name'}`);
      } else {
        Alert.alert('Info', 'No profile found. You can create one below.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Create user profile
  const handleCreateProfile = async () => {
    if (!client || !user) {
      Alert.alert('Error', 'Client not authenticated or user not found');
      return;
    }

    setLoading(true);
    try {
      const newProfile = await client.createProfile({
        clerkUserId: user.id,
        email: user.email,
        name: user.name,
        role: 'tenant', // Default role
      });
      
      setProfile(newProfile);
      Alert.alert('Success', 'Profile created successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to create profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Update user profile
  const handleUpdateProfile = async () => {
    if (!client || !user || !profile) {
      Alert.alert('Error', 'No profile to update');
      return;
    }

    setLoading(true);
    try {
      const updatedProfile = await client.updateProfile(user.id, {
        name: `${user.name} (Updated)`,
        role: profile.role === 'tenant' ? 'landlord' : 'tenant',
      });
      
      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to update profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔒 Authentication Required</Text>
        <Text style={styles.subtitle}>
          Please sign in to use Supabase features
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 Example Usage</Text>
      <Text style={styles.subtitle}>
        Proper Clerk-Supabase Integration Pattern
      </Text>

      <View style={styles.userInfo}>
        <Text style={styles.userInfoText}>User ID: {user?.id}</Text>
        <Text style={styles.userInfoText}>Email: {user?.email}</Text>
        <Text style={styles.userInfoText}>Name: {user?.name}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleGetProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Get Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCreateProfile}
          disabled={loading || !!profile}
        >
          <Text style={styles.buttonText}>
            {profile ? 'Profile Exists' : 'Create Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={handleUpdateProfile}
          disabled={loading || !profile}
        >
          <Text style={styles.buttonText}>
            Update Profile
          </Text>
        </TouchableOpacity>
      </View>

      {profile && (
        <View style={styles.profileInfo}>
          <Text style={styles.profileTitle}>Current Profile</Text>
          <Text style={styles.profileText}>ID: {profile.id}</Text>
          <Text style={styles.profileText}>Name: {profile.name || 'Not set'}</Text>
          <Text style={styles.profileText}>Role: {profile.role || 'Not set'}</Text>
          <Text style={styles.profileText}>Email: {profile.email}</Text>
          <Text style={styles.profileText}>
            Created: {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Key Points:</Text>
        <Text style={styles.infoText}>• Always check `isAuthenticated` before using client</Text>
        <Text style={styles.infoText}>• Use `client.client` for direct Supabase operations</Text>
        <Text style={styles.infoText}>• Handle errors gracefully with try-catch</Text>
        <Text style={styles.infoText}>• JWT tokens are automatically managed</Text>
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
  userInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  userInfoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  tertiaryButton: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  profileInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  profileText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#424242',
  },
});
