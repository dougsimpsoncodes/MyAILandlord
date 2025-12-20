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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';
import { supabase } from '../../services/supabase/client';

type TenantOnboardingStackParamList = {
  TenantOnboardingWelcome: { firstName: string };
  TenantPropertyCode: { firstName: string };
  TenantPropertyConfirm: { firstName: string; propertyId: string; propertyName: string; landlordName: string };
  TenantOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<TenantOnboardingStackParamList, 'TenantPropertyCode'>;
type CodeRouteProp = RouteProp<TenantOnboardingStackParamList, 'TenantPropertyCode'>;

const CODE_LENGTH = 6;

export default function TenantPropertyCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CodeRouteProp>();
  const { firstName } = route.params;

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fullCode = code.join('');
  const isValid = fullCode.length === CODE_LENGTH;

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];

    // Handle paste
    if (text.length > 1) {
      const pastedCode = text.toUpperCase().slice(0, CODE_LENGTH);
      for (let i = 0; i < pastedCode.length; i++) {
        newCode[i] = pastedCode[i] || '';
      }
      setCode(newCode);
      // Focus last input or submit
      const nextIndex = Math.min(pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Handle single character
    newCode[index] = text.toUpperCase();
    setCode(newCode);

    // Auto-advance to next input
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      // Use server-side RPC for secure validation with rate limiting
      const { data, error: rpcError } = await supabase
        .rpc('validate_invite_code', { p_code: fullCode });

      if (rpcError) {
        console.error('Error validating code:', rpcError);
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Check the result
      const result = data?.[0];

      if (!result) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (!result.valid) {
        // Handle specific error cases
        switch (result.error_code) {
          case 'RATE_LIMITED':
            setError('Too many attempts. Please wait 15 minutes and try again.');
            break;
          case 'INVALID_FORMAT':
            setError('Invalid code format. Codes are 6 characters (letters and numbers).');
            break;
          case 'INVALID_CODE':
            setError('Invalid code. Please check with your landlord and try again.');
            break;
          case 'ALREADY_LINKED':
            setError('You are already connected to this property.');
            break;
          default:
            setError('Invalid code. Please check with your landlord and try again.');
        }
        setLoading(false);
        return;
      }

      // Navigate to confirmation
      navigation.navigate('TenantPropertyConfirm', {
        firstName,
        propertyId: result.property_id,
        propertyName: result.property_name,
        landlordName: result.landlord_name || 'Your landlord',
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'TenantOnboardingSuccess', params: { firstName } }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>🔑</Text>
            <Text style={styles.title}>Enter your property code</Text>
            <Text style={styles.subtitle}>
              Your landlord should have shared a 6-character code with you
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.codeSection}>
            <View style={styles.codeInputContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                    error && styles.codeInputError,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  maxLength={index === 0 ? CODE_LENGTH : 1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  textContentType="oneTimeCode"
                />
              ))}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Don't have a code? Ask your landlord to share one from their MyAI Landlord app.
            </Text>
          </View>

          {/* Button Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isValid || loading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>I don't have a code yet</Text>
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
    paddingTop: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
    lineHeight: 22,
  },
  codeSection: {
    marginBottom: spacing.xl,
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
  },
  codeInputFilled: {
    borderColor: colors.primary.default,
    backgroundColor: '#f0f4ff',
  },
  codeInputError: {
    borderColor: colors.status.error,
  },
  errorContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.status.error,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#854d0e',
    lineHeight: 20,
  },
  buttonSection: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});
