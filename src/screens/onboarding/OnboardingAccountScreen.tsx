import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';
import { log } from '../../lib/log';
import { supabase } from '../../services/supabase/client';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingName: { fromInvite?: boolean };
  OnboardingAccount: { firstName: string; fromInvite?: boolean };
  OnboardingRole: { firstName: string; userId: string };
  PropertyInviteAccept: undefined;
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingAccount'>;
type AccountRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingAccount'>;

// Password strength calculation
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string): { strength: PasswordStrength; score: number; feedback: string } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('at least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('lowercase letter');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('uppercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('number');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('special character');

  let strength: PasswordStrength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';

  const feedbackText = feedback.length > 0 ? `Add: ${feedback.join(', ')}` : 'Strong password!';

  return { strength, score, feedback: feedbackText };
};

const strengthColors: Record<PasswordStrength, string> = {
  weak: '#ef4444',
  fair: '#f59e0b',
  good: '#22c55e',
  strong: '#16a34a',
};

export default function OnboardingAccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AccountRouteProp>();
  const { firstName, fromInvite = false } = route.params;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = password.length >= 8 && passwordStrength.score >= 3; // At least 'fair'
  const doPasswordsMatch = password === confirmPassword;
  const isValid = isEmailValid && isPasswordValid && doPasswordsMatch && acceptedTerms;

  const handleOpenLink = async (url: string) => {
    try {
      const { Linking } = await import('react-native');
      await Linking.openURL(url);
    } catch (error) {
      log.warn('Failed to open link', { error: String(error) });
    }
  };

  const handleCreateAccount = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      // Create the account with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        if (fromInvite) {
          // User came from tenant invite - skip role selection (they're obviously tenants)
          // Don't navigate anywhere - let RootNavigator bootstrap handle it
          // RootNavigator detects pending invite + signed in user → PropertyInviteAccept
          // This avoids race conditions with auth state changes
          return;
        } else {
          // Normal flow - navigate to role selection
          navigation.navigate('OnboardingRole', {
            firstName,
            userId: data.user.id
          });
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressDot} />
              <View style={styles.progressDot} />
            </View>
            <Text style={styles.stepIndicator}>Step 2 of 4</Text>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroIcon}>🔐</Text>
              <Text style={styles.title}>Nice to meet you, {firstName}!</Text>
              <Text style={styles.subtitle}>Let's secure your account</Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    email.length > 0 && !isEmailValid && styles.inputError,
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                {email.length > 0 && !isEmailValid && (
                  <Text style={styles.errorHint}>Please enter a valid email</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      password.length > 0 && !isPasswordValid && styles.inputError,
                    ]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    accessibilityLabel="Password"
                    accessibilityHint="Enter a password with at least 8 characters"
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text style={styles.showPasswordText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${(passwordStrength.score / 6) * 100}%`,
                            backgroundColor: strengthColors[passwordStrength.strength],
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthText, { color: strengthColors[passwordStrength.strength] }]}>
                      {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                    </Text>
                  </View>
                )}
                {password.length > 0 && passwordStrength.score < 5 && (
                  <Text style={styles.strengthHint}>{passwordStrength.feedback}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      confirmPassword.length > 0 && !doPasswordsMatch && styles.inputError,
                    ]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.text.tertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    onSubmitEditing={handleCreateAccount}
                    onFocus={() => {
                      // Scroll to bottom when confirm password is focused so terms are visible
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                    accessibilityLabel="Confirm password"
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text style={styles.showPasswordText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !doPasswordsMatch && (
                  <Text style={styles.errorHint}>Passwords don't match</Text>
                )}
              </View>
            </View>

            {/* Terms & Privacy */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              accessibilityLabel="Accept terms and privacy policy"
              testID="terms-checkbox"
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => handleOpenLink('https://myailandlord.com/terms')}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => handleOpenLink('https://myailandlord.com/privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Text style={styles.trustIcon}>🛡️</Text>
              <Text style={styles.trustText}>
                Your password is encrypted and never stored in plain text.
              </Text>
            </View>

            {/* Button Section */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.primaryButton, (!isValid || loading) && styles.primaryButtonDisabled]}
                onPress={handleCreateAccount}
                disabled={!isValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  progressDot: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: colors.primary.default,
  },
  progressDotCompleted: {
    backgroundColor: colors.status.success,
  },
  stepIndicator: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIcon: {
    fontSize: 50,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  showPasswordButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  showPasswordText: {
    fontSize: 18,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    minWidth: 50,
  },
  strengthHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.default,
    borderColor: colors.primary.default,
  },
  checkmark: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary.default,
    fontWeight: '600',
  },
  errorHint: {
    fontSize: typography.sizes.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: '#dc2626',
    textAlign: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#1d4ed8',
  },
  buttonSection: {
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary.default,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.default,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
