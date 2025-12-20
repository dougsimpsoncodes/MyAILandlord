import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/shared/ScreenContainer';

type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

// OAuth providers are not enabled in Supabase - hide buttons to prevent redirect errors
const OAUTH_ENABLED = process.env.EXPO_PUBLIC_OAUTH_ENABLED === 'true';

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current URL for email redirect (works for web)
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailAddress,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Check if user is already confirmed (Supabase setting: "Enable email confirmations" is OFF)
      // In this case, we get a session immediately
      if (data.session) {
        // User is auto-signed in, no email verification needed
        // The auth context will detect the session change and navigate automatically
        return;
      }

      // Show success state - user needs to verify email
      setSignUpSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
      });

      if (error) {
        // Handle provider not enabled error gracefully
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          setError(`${provider === 'google' ? 'Google' : 'Apple'} sign-in is not available. Please use email/password.`);
        } else {
          setError(error.message);
        }
        return;
      }

      // OAuth flow will redirect - session will be set automatically
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to sign up with ${provider}. Please try again.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <>
      {/* Success Modal */}
      <Modal
        visible={signUpSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setSignUpSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setSignUpSuccess(false);
                navigateToSignIn();
              }}
            >
              <Ionicons name="close" size={24} color="#7F8C8D" />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Ionicons name="mail-outline" size={48} color="#3498DB" />
            </View>

            <Text style={styles.modalTitle}>Check Your Email</Text>

            <Text style={styles.modalMessage}>
              We sent a verification link to:
            </Text>
            <Text style={styles.modalEmail}>{emailAddress}</Text>

            <Text style={styles.modalInstructions}>
              Click the link in your email to verify your account.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSignUpSuccess(false);
                navigateToSignIn();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScreenContainer
        title="Sign Up"
        showBackButton
        onBackPress={() => navigation.goBack()}
        keyboardAware
      >
        <View style={styles.header}>
          <Text style={styles.roleIcon}>🏠</Text>
          <Text style={styles.welcomeTitle}>
            Create Account
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Sign up to get started with My AI Landlord
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#E74C3C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#7F8C8D"
              />
            </TouchableOpacity>
          </View>

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

          {OAUTH_ENABLED && (
            <>
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
            </>
          )}

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
      </ScreenContainer>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
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
  // Error display styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#E74C3C',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInstructions: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignUpScreen;
