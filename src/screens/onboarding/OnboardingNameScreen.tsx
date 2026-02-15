import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingName: { fromInvite?: boolean };
  OnboardingAccount: { firstName: string; fromInvite?: boolean };
  OnboardingRole: { firstName: string; userId: string };
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingName'>;
type OnboardingNameRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingName'>;

// Name validation: 2-60 chars, Unicode-friendly, no special characters
const validateName = (name: string): { valid: boolean; error?: string } => {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 60) {
    return { valid: false, error: 'Name must be less than 60 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes (Unicode-friendly)
  // This covers names like "José", "O'Brien", "Mary-Jane", "李明"
  const namePattern = /^[\p{L}\p{M}'\-\s]+$/u;
  if (!namePattern.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid name' };
  }

  return { valid: true };
};

export default function OnboardingNameScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OnboardingNameRouteProp>();
  const fromInvite = route.params?.fromInvite ?? false;

  const [firstName, setFirstName] = useState('');
  const [touched, setTouched] = useState(false);

  const validation = validateName(firstName);
  const showError = touched && !validation.valid && firstName.length > 0;

  const handleContinue = () => {
    setTouched(true);
    if (validation.valid) {
      // Pass fromInvite flag to skip role selection for invite users
      navigation.navigate('OnboardingAccount', { firstName: firstName.trim(), fromInvite });
    }
  };

  const isValid = validation.valid;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepIndicator}>Step 1 of 4</Text>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>👋</Text>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>We'd love to personalize your experience</Text>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <TextInput
              style={[styles.input, showError && styles.inputError]}
              placeholder="Your first name"
              testID="onboarding-name-input"
              placeholderTextColor={colors.text.tertiary}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={60}
              accessibilityLabel="First name"
              accessibilityHint="Enter your first name, 2 to 60 characters"
            />
            {showError && validation.error && (
              <Text style={styles.errorText}>{validation.error}</Text>
            )}
          </View>

          {/* Trust Badge */}
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>Your info stays private. We never share your data.</Text>
          </View>

          {/* Button Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.primaryButton, !isValid && styles.primaryButtonDisabled]}
              onPress={handleContinue}
              disabled={!isValid}
              testID="onboarding-name-continue"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
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
    marginBottom: spacing.xl,
  },
  heroIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
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
    marginBottom: spacing.lg,
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
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#2e7d32',
  },
  buttonSection: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
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
