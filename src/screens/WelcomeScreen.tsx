import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { useAppAuth } from '../context/SupabaseAuthContext';
import { RoleContext } from '../context/RoleContext';
import { log } from '../lib/log';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { signOut, isSignedIn } = useAppAuth();
  const { clearRole, userRole } = useContext(RoleContext);
  
  // Debug logging
  log.info('🏠 Welcome Screen - Auth State:', { isSignedIn, userRole });

  const handleGetStarted = () => {
    // If user is authenticated with a role, AppNavigator should automatically
    // switch to MainStack. If we're still here, user needs to authenticate.
    if (isSignedIn && userRole) {
      log.info('User authenticated with role, AppNavigator should auto-redirect');
      // The AppNavigator will handle the transition automatically
      return;
    }

    // User not authenticated or no role, go to unified Auth screen
    navigation.navigate('Auth', { mode: 'signup' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🏠</Text>
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My AI Landlord</Text>
          <Text style={styles.subtitle}>
            Simplifying maintenance management with AI
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔧</Text>
            <Text style={styles.featureText}>Quick Issue Reporting</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureText}>AI-Powered Support</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureText}>Photo & Voice Enabled</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isSignedIn && userRole ? 'Continue to Dashboard' : 'Get Started'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Auth', { mode: 'login' })}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
        </TouchableOpacity>

        {isSignedIn && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={async () => {
              await clearRole();
              await signOut();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
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
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    
    
    
    
    elevation: 8,
  },
  logoText: {
    fontSize: 60,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  featuresContainer: {
    marginVertical: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    fontSize: 18,
    color: '#34495E',
    flex: 1,
  },
  getStartedButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
