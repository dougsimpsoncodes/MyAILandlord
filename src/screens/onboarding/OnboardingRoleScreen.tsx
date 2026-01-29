import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';
import { supabase } from '../../services/supabase/client';
import { markOnboardingStarted } from '../../hooks/useOnboardingStatus';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { log } from '../../lib/log';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingName: undefined;
  OnboardingAccount: { firstName: string };
  OnboardingRole: { firstName: string; userId: string };
  // Landlord path
  LandlordOnboardingWelcome: { firstName: string };
  // Tenant path
  TenantOnboardingWelcome: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingRole'>;
type RoleRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingRole'>;

type Role = 'landlord' | 'tenant';

export default function OnboardingRoleScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoleRouteProp>();
  const { firstName, userId } = route.params;
  const { processingInvite, redirect, updateRole } = useUnifiedAuth();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: Skip role selection if user came through invite link
  useEffect(() => {
    if (processingInvite && redirect?.type === 'acceptInvite') {
      log.info('[OnboardingRole] Pending invite detected - skipping role selection, navigating to PropertyInviteAcceptScreen');
      // Navigate to PropertyInviteAcceptScreen which will handle the invite acceptance
      // Use parent navigation to get to root level
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.reset({
          index: 0,
          routes: [{ name: 'PropertyInviteAccept' as never }],
        });
      }
    }
  }, [processingInvite, redirect, navigation]);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      // Mark onboarding as started to prevent AppNavigator from switching stacks mid-flow
      await markOnboardingStarted();

      // Save the selected role to database so AppNavigator can route correctly
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
        })
        .eq('id', userId);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // CRITICAL: Set role in UnifiedAuthContext to prevent useProfileSync from overwriting
      // This ensures the selected role is preserved during navigation
      await updateRole(selectedRole);
      log.info('[OnboardingRole] Role set in context and DB', { selectedRole });

      // Navigate to role-specific onboarding, passing role in params
      if (selectedRole === 'landlord') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'LandlordOnboardingWelcome', params: { firstName, role: selectedRole } }],
          })
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'TenantOnboardingWelcome', params: { firstName, role: selectedRole } }],
          })
        );
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepIndicator}>Step 3 of 4</Text>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🎯</Text>
          <Text style={styles.title}>How will you use{'\n'}MyAI Landlord, {firstName}?</Text>
          <Text style={styles.subtitle}>This helps us personalize your experience</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleSection}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'landlord' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('landlord')}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>🏠</Text>
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>I'm a Landlord</Text>
              <Text style={styles.roleDescription}>
                Manage properties, track maintenance, and communicate with tenants
              </Text>
            </View>
            <View style={[
              styles.radioCircle,
              selectedRole === 'landlord' && styles.radioCircleSelected,
            ]}>
              {selectedRole === 'landlord' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'tenant' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('tenant')}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>🔑</Text>
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>I'm a Tenant</Text>
              <Text style={styles.roleDescription}>
                Report issues, track repairs, and stay connected with your landlord
              </Text>
            </View>
            <View style={[
              styles.radioCircle,
              selectedRole === 'tenant' && styles.radioCircleSelected,
            ]}>
              {selectedRole === 'tenant' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            You can always switch roles or add another account later from Settings.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!selectedRole || loading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
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
    fontSize: 50,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  roleSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  roleCardSelected: {
    borderColor: colors.primary.default,
    backgroundColor: '#f0f4ff',
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 24,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary.default,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.default,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#854d0e',
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
