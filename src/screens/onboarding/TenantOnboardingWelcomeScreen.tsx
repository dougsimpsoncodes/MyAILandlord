import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';
import { PendingInviteService } from '../../services/storage/PendingInviteService';
import { log } from '../../lib/log';

type TenantOnboardingStackParamList = {
  TenantOnboardingWelcome: { firstName: string };
  // Code-entry flow removed; only invite link path remains
  // TenantPropertyIntro: { firstName: string };
  // TenantPropertyCode: { firstName: string };
  // TenantPropertyConfirm: { firstName: string; propertyId: string; propertyName: string };
  TenantInviteRoommate: { firstName: string; propertyId: string; propertyName: string; inviteCode: string };
  TenantOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<TenantOnboardingStackParamList, 'TenantOnboardingWelcome'>;
type WelcomeRouteProp = RouteProp<TenantOnboardingStackParamList, 'TenantOnboardingWelcome'>;

const features = [
  {
    icon: '🔧',
    title: 'Report Issues Easily',
    description: 'Submit maintenance requests with photos in seconds',
  },
  {
    icon: '📱',
    title: 'Track Repairs',
    description: 'Get updates on your maintenance requests in real-time',
  },
  {
    icon: '💬',
    title: 'Direct Communication',
    description: 'Message your landlord directly through the app',
  },
  {
    icon: '🏠',
    title: 'Property Info',
    description: 'Access important property details anytime',
  },
];

export default function TenantOnboardingWelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WelcomeRouteProp>();
  const { firstName } = route.params;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleContinue = async () => {
    setIsProcessing(true);

    try {
      // Check for pending invite (from invite link flow)
      const pendingInvite = await PendingInviteService.getPendingInvite();

      if (pendingInvite && pendingInvite.type === 'token') {
        // Redirect to PropertyInviteAccept - the canonical invite handler
        // This centralizes all invite acceptance logic in one place
        log.info('[TenantOnboardingWelcome] Pending invite detected, redirecting to PropertyInviteAccept');

        // Navigate to the canonical invite handler (in AuthStack)
        (navigation as unknown as { navigate: (routeName: string, params?: object) => void }).navigate('PropertyInviteAccept', {
          token: pendingInvite.value,
        });
      } else {
        // No pending invite: require invite link
        log.info('[TenantOnboardingWelcome] No pending invite; requiring invite link');
        Alert.alert(
          'Invite Required',
          'Ask your landlord to send you an invite link. Open it on this device to connect.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      log.error('[TenantOnboardingWelcome] Error checking pending invite:', error as Error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
          <Text style={styles.stepIndicator}>Step 4 of 4 • Tenant Setup</Text>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>Welcome, {firstName}!</Text>
            <Text style={styles.subtitle}>
              Here's what you can do with MyAI Landlord
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trust Section */}
          <View style={styles.trustSection}>
            <Text style={styles.trustText}>
              🔒 Your data is secure and only shared with your landlord
            </Text>
          </View>

          {/* Button Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
              onPress={handleContinue}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Connect to My Property</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
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
  },
  featuresSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  trustSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  trustText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
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
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
