import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { RoleContext } from '../context/RoleContext';
import { Ionicons } from '@expo/vector-icons';

type SignUpScreenRouteProp = RouteProp<AuthStackParamList, 'SignUp'>;
type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const route = useRoute<SignUpScreenRouteProp>();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { role } = route.params;
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: appleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const { setUserRole } = useContext(RoleContext);
  const [loading, setLoading] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const handleSignUp = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setPendingVerification(true);
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.errors?.[0]?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        setUserRole(role);
      } else {
        Alert.alert('Verification Error', 'Unable to verify email. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Verification Error', error.errors?.[0]?.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      
      const oauthFlow = provider === 'google' ? googleOAuth : appleOAuth;
      const { createdSessionId, setActive: oauthSetActive } = await oauthFlow();
      
      if (createdSessionId) {
        await oauthSetActive({ session: createdSessionId });
        setUserRole(role);
      }
    } catch (error: any) {
      Alert.alert('OAuth Error', error.message || `Failed to sign up with ${provider}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignIn = () => {
    navigation.navigate('Login', { role });
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPendingVerification(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.roleIcon}>✉️</Text>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to {emailAddress}
            </Text>
          </View>

          <View style={styles.loginContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.loginButton, styles.primaryButton]}
              onPress={handleVerification}
              disabled={loading || !code}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            Create {role === 'tenant' ? 'Tenant' : 'Landlord'} Account
          </Text>
          <Text style={styles.subtitle}>
            Sign up to access your {role === 'tenant' ? 'maintenance portal' : 'management dashboard'}
          </Text>
        </View>

        <View style={styles.loginContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.loginButton, styles.primaryButton]}
            onPress={handleSignUp}
            disabled={loading || !emailAddress || !password}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, styles.googleButton]}
            onPress={() => handleOAuthSignUp('google')}
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
            onPress={() => handleOAuthSignUp('apple')}
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

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={navigateToSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpText}>
              Already have an account? <Text style={styles.signUpLink}>Sign In</Text>
            </Text>
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
    marginTop: 40,
    marginBottom: 40,
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loginContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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
  primaryButton: {
    backgroundColor: '#3498DB',
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E8ED',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#7F8C8D',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  signUpButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  signUpLink: {
    color: '#3498DB',
    fontWeight: '600',
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

export default SignUpScreen;