import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { DesignSystem } from '../theme/DesignSystem';

type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AuthForm'>;
type AuthScreenRouteProp = RouteProp<AuthStackParamList, 'AuthForm'>;

const OAUTH_ENABLED = process.env.EXPO_PUBLIC_OAUTH_ENABLED === 'true';
const AUTO_LOGIN_AFTER_SIGNUP = process.env.EXPO_PUBLIC_SIGNUP_AUTOLOGIN === '1';

type AuthMode = 'login' | 'signup';

const AuthScreen = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const route = useRoute<AuthScreenRouteProp>();

  // Get initial mode from route params, default to 'login'
  const initialMode = (route.params as any)?.initialMode || 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearForm = () => {
    setEmailAddress('');
    setPassword('');
    setError(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailAddress,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }
      // Session is automatically set by Supabase
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);

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

      // Check if user is already confirmed (auto sign-in)
      if (data.session) {
        return;
      }

      // Optional fallback for environments where Supabase doesn't return session
      // even when email confirmation is disabled (e.g., E2E). When enabled via
      // EXPO_PUBLIC_SIGNUP_AUTOLOGIN=1, attempt password sign-in immediately.
      if (AUTO_LOGIN_AFTER_SIGNUP) {
        const delays = [150, 300, 600, 1000];
        for (const delay of delays) {
          const { error: pwError } = await supabase.auth.signInWithPassword({
            email: emailAddress,
            password,
          });
          if (!pwError) {
            return;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
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

  const handleSubmit = () => {
    if (mode === 'login') {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider,
      });

      if (oauthError) {
        if (oauthError.message.includes('provider is not enabled') || oauthError.message.includes('Unsupported provider')) {
          setError(`${provider === 'google' ? 'Google' : 'Apple'} sign-in is not available. Please use email/password.`);
        } else {
          setError(oauthError.message);
        }
        return;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to sign in with ${provider}. Please try again.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Success Modal for Sign Up */}
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
                switchMode('login');
                clearForm();
              }}
            >
              <Ionicons name="close" size={24} color="#7F8C8D" />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Ionicons name="mail-outline" size={48} color="#3498DB" />
            </View>

            <Text style={styles.modalTitle}>Check Your Email</Text>
            <Text style={styles.modalMessage}>We sent a verification link to:</Text>
            <Text style={styles.modalEmail}>{emailAddress}</Text>
            <Text style={styles.modalInstructions}>
              Click the link in your email to verify your account.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSignUpSuccess(false);
                switchMode('login');
                clearForm();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#2C3E50" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logoIcon}>🏠</Text>
              <Text style={styles.logoText}>MyAI Landlord</Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => switchMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#BDC3C7"
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="auth-email"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                    placeholderTextColor="#BDC3C7"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="auth-password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#7F8C8D"
                    />
                  </TouchableOpacity>
                </View>
                {mode === 'login' && (
                  <TouchableOpacity style={styles.forgotLink}>
                    <Text style={styles.forgotText}>Forgot your password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!emailAddress || !password) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading || !emailAddress || !password}
                activeOpacity={0.8}
                testID="auth-submit"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'login' ? 'Log In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Signup marker for E2E */}
            {mode === 'signup' && (
              <View testID="auth-signup" />
            )}

            {/* OAuth Divider and Buttons */}
            {OAUTH_ENABLED && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleOAuth('google')}
                    disabled={loading}
                  >
                    <Text style={styles.socialButtonIcon}>G</Text>
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleOAuth('apple')}
                    disabled={loading}
                  >
                    <Ionicons name="logo-apple" size={20} color="#2C3E50" />
                    <Text style={styles.socialButtonText}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Privacy Text */}
            <Text style={styles.privacyText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E1E8ED',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
  tabActive: {
    borderBottomColor: '#3498DB',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  tabTextActive: {
    color: '#3498DB',
  },
  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    color: '#2C3E50',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    color: '#2C3E50',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
    color: '#3498DB',
  },
  submitButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E8ED',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#7F8C8D',
  },
  // Social Buttons
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    backgroundColor: '#FFFFFF',
  },
  socialButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2C3E50',
  },
  // Privacy
  privacyText: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // Error
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
  // Modal
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

export default AuthScreen;
