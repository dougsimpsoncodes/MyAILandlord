import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';

type TenantOnboardingStackParamList = {
  TenantOnboardingWelcome: { firstName: string };
  TenantInviteRoommate: { firstName: string; propertyId: string; propertyName: string; inviteCode: string };
  TenantOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<TenantOnboardingStackParamList, 'TenantInviteRoommate'>;
type InviteRouteProp = RouteProp<TenantOnboardingStackParamList, 'TenantInviteRoommate'>;

export default function TenantInviteRoommateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InviteRouteProp>();
  const { firstName, propertyId, propertyName, inviteCode } = route.params;

  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setString(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(
        'Copy Code',
        `Your property code is: ${inviteCode}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me at ${propertyName} on the MyAI Landlord app!\n\nUse this code to connect: ${inviteCode}`,
      });
    } catch (err) {
      // Share canceled or failed
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

  const handleContinue = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'TenantOnboardingSuccess', params: { firstName } }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>👥</Text>
          <Text style={styles.title}>Share with a roommate?</Text>
          <Text style={styles.subtitle}>
            Your roommate can use this code to connect to {propertyName}
          </Text>
        </View>

        {/* Code Display */}
        <View style={styles.codeSection}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Invite Code</Text>
            <Text
              style={styles.codeText}
              testID="invite-code"
              accessibilityLabel="Invite code"
            >
              {inviteCode}
            </Text>
          </View>

          <View style={styles.codeActions}>
            <TouchableOpacity
              style={[styles.actionButton, copied && styles.actionButtonSuccess]}
              onPress={handleCopyCode}
            >
              <Text style={[styles.actionButtonText, copied && styles.actionButtonTextSuccess]}>
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Your roommate can use this same invite code to connect to the property and report issues.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            testID="roommate-invite-continue-button"
            accessibilityRole="button"
            accessibilityLabel="Continue to success screen"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            testID="roommate-invite-skip-button"
            accessibilityRole="button"
            accessibilityLabel="Skip and invite roommate later"
          >
            <Text style={styles.skipButtonText}>I'll do this later</Text>
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
    paddingTop: spacing.xl,
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
    lineHeight: 22,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  codeCard: {
    backgroundColor: '#f0f4ff',
    borderWidth: 2,
    borderColor: colors.primary.default,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  codeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary.default,
    letterSpacing: 4,
    textAlign: 'center',
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionButtonSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionButtonTextSuccess: {
    color: '#16a34a',
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
    fontSize: 20,
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
