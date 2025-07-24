import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { AuthContext } from '../context/AuthContext';
import { RoleContext } from '../context/RoleContext';
import { Ionicons } from '@expo/vector-icons';

type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;
type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const route = useRoute<LoginScreenRouteProp>();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { role } = route.params;
  const { signIn } = useContext(AuthContext);
  const { setUserRole } = useContext(RoleContext);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      await signIn(provider);
      setUserRole(role);
    } catch (error) {
      Alert.alert('Login Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.roleIcon}>{role === 'tenant' ? '🏘️' : '🏢'}</Text>
          <Text style={styles.title}>
            {role === 'tenant' ? 'Tenant Login' : 'Landlord Login'}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to access your {role === 'tenant' ? 'maintenance portal' : 'management dashboard'}
          </Text>
        </View>

        <View style={styles.loginContainer}>
          <TouchableOpacity
            style={[styles.loginButton, styles.googleButton]}
            onPress={() => handleLogin('google')}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, styles.appleButton]}
            onPress={() => handleLogin('apple')}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
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
  },
  backButton: {
    marginTop: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  roleIcon: {
    fontSize: 64,
    marginBottom: 16,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loginContainer: {
    gap: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyContainer: {
    marginTop: 40,
    paddingHorizontal: 40,
  },
  privacyText: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LoginScreen;