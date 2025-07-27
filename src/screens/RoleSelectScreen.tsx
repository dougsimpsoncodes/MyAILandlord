import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { useAppAuth } from '../context/ClerkAuthContext';
import { RoleContext } from '../context/RoleContext';

type RoleSelectScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

const { width } = Dimensions.get('window');

const RoleSelectScreen = () => {
  const navigation = useNavigation<RoleSelectScreenNavigationProp>();
  const { isSignedIn, user } = useAppAuth();
  const { setUserRole } = useContext(RoleContext);

  const handleRoleSelect = async (role: 'tenant' | 'landlord') => {
    if (isSignedIn) {
      // User is already authenticated, just set the role
      await setUserRole(role);
    } else {
      // User needs to authenticate
      navigation.navigate('Login', { role });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isSignedIn ? `Welcome, ${user?.name?.split(' ')[0] || 'User'}!` : 'Who are you?'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignedIn 
              ? 'Select your role to access your dashboard' 
              : 'Select your role to continue'
            }
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.roleCard, styles.tenantCard]}
            onPress={() => handleRoleSelect('tenant')}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>🏘️</Text>
            </View>
            <Text style={styles.cardTitle}>I'm a Tenant</Text>
            <Text style={styles.cardDescription}>
              Report maintenance issues and communicate with your landlord
            </Text>
            <View style={styles.cardFeatures}>
              <Text style={styles.featureItem}>• Voice & photo reports</Text>
              <Text style={styles.featureItem}>• Track repair status</Text>
              <Text style={styles.featureItem}>• Schedule preferences</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, styles.landlordCard]}
            onPress={() => handleRoleSelect('landlord')}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>🏢</Text>
            </View>
            <Text style={styles.cardTitle}>I'm a Landlord</Text>
            <Text style={styles.cardDescription}>
              Manage maintenance requests and coordinate repairs efficiently
            </Text>
            <View style={styles.cardFeatures}>
              <Text style={styles.featureItem}>• Organized dashboard</Text>
              <Text style={styles.featureItem}>• AI-powered insights</Text>
              <Text style={styles.featureItem}>• Vendor communication</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  tenantCard: {
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  landlordCard: {
    borderWidth: 2,
    borderColor: '#34495E',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardFeatures: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#95A5A6',
    marginBottom: 4,
  },
});

export default RoleSelectScreen;