import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme/DesignSystem';
import { supabase } from '../../services/supabase/client';
import { useOnboarding } from '../../context/OnboardingContext';

type RootStackParamList = {
  TenantOnboardingSuccess: { firstName: string };
};

type SuccessRouteProp = RouteProp<RootStackParamList, 'TenantOnboardingSuccess'>;

const nextSteps = [
  { icon: '🔧', text: 'Report a maintenance issue' },
  { icon: '💬', text: 'Message your landlord' },
  { icon: '📋', text: 'View your property details' },
];

export default function TenantOnboardingSuccessScreen() {
  const route = useRoute<SuccessRouteProp>();
  const { firstName } = route.params;
  const { refreshStatus } = useOnboarding();

  const [loading, setLoading] = useState(false);
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToHome = async () => {
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Ensure the role is set (for new users from the full onboarding flow)
        await supabase
          .from('profiles')
          .update({ role: 'tenant' })
          .eq('id', user.id);
      }

      // Refresh onboarding status - this will detect the property link
      // and trigger navigation to MainStack
      await refreshStatus();
    } catch (err) {
      // If there's an error, try again
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
        </Animated.View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>You're all set, {firstName}!</Text>
          <Text style={styles.subtitle}>
            You can now report issues, track repairs, and communicate with your landlord.
          </Text>
        </View>

        {/* Completion Badge */}
        <View style={styles.completionBadge}>
          <Text style={styles.completionIcon}>✅</Text>
          <Text style={styles.completionText}>Setup Complete</Text>
        </View>

        {/* Next Steps */}
        <Animated.View style={[styles.nextStepsSection, { opacity: fadeAnim }]}>
          <Text style={styles.nextStepsTitle}>Here's what you can do next:</Text>

          {nextSteps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleGoToHome}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Go to Home</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    borderWidth: 4,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 56,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  completionIcon: {
    fontSize: 16,
  },
  completionText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: '#16a34a',
  },
  nextStepsSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  nextStepsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  stepIcon: {
    fontSize: 20,
  },
  stepText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
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
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
