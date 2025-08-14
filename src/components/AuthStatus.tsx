import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthState } from '../hooks/useAuthState';
import { useAppAuth } from '../context/ClerkAuthContext';

export const AuthStatus: React.FC = () => {
  const { isAuthenticated, isLoading, user, role, profile } = useAuthState();
  const { signOut } = useAppAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading authentication...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Not authenticated</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Status</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{user?.id}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user?.name}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Role:</Text>
        <Text style={[styles.value, styles.role]}>{role}</Text>
      </View>
      
      {profile && (
        <View style={styles.section}>
          <Text style={styles.label}>Profile ID:</Text>
          <Text style={styles.value}>{profile.id}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  role: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});