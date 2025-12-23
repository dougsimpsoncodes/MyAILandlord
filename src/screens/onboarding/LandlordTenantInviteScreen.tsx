import React, { useState, useEffect } from 'react';
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
import { shouldUseTokenizedInvites } from '../../config/featureFlags';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { log } from '../../lib/log';

type LandlordOnboardingStackParamList = {
  LandlordOnboardingWelcome: { firstName: string };
  LandlordPropertyIntro: { firstName: string };
  LandlordPropertyAddress: { firstName: string };
  LandlordPropertyType: { firstName: string; address: string; city: string; state: string; zip: string };
  LandlordTenantInvite: { firstName: string; propertyId: string; propertyName: string };
  LandlordOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<LandlordOnboardingStackParamList, 'LandlordTenantInvite'>;
type InviteRouteProp = RouteProp<LandlordOnboardingStackParamList, 'LandlordTenantInvite'>;

export default function LandlordTenantInviteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InviteRouteProp>();
  const { firstName, propertyId, propertyName } = route.params;
  const { user } = useAppAuth();
  const { supabase } = useSupabaseWithAuth();

  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useTokenizedFlow, setUseTokenizedFlow] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    // Log diagnostics for E2E debugging (DEV only)
    if (__DEV__) {
      console.log('[INVITES] 🔍 Screen mounted with:', {
        userId: user?.id,
        propertyId,
        propertyName,
        firstName,
        userExists: !!user,
        platform: Platform.OS,
      });
    }

    generateInviteUrl();
  }, []);

  const generateInviteUrl = async () => {
    setIsGenerating(true);

    try {
      const isWeb = Platform.OS === 'web';
      let url: string;

      // Check if we should use tokenized invites
      const useTokens = user?.id ? shouldUseTokenizedInvites(user.id) : false;

      // DIAGNOSTIC LOGGING (DEV only)
      if (__DEV__) {
        console.log('[INVITES] 🎟️ Feature flag check:', {
          userId: user?.id,
          useTokens,
          envFlag: process.env.EXPO_PUBLIC_TOKENIZED_INVITES,
          rolloutPercent: process.env.EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT,
          propertyId,
        });
      }

      setUseTokenizedFlow(useTokens);

      if (useTokens) {
        // NEW: Generate tokenized invite via RPC function
        if (__DEV__) console.log('[INVITES] 🎟️ Generating tokenized invite for property:', propertyId);
        log.info('🎟️ Generating tokenized invite for property:', propertyId);
        url = await generateTokenizedInvite(propertyId, isWeb);
        if (__DEV__) console.log('[INVITES] ✅ Tokenized invite generated:', url);
      } else {
        // LEGACY: Direct property link
        if (__DEV__) console.log('[INVITES] 🔗 Using legacy invite link for property:', propertyId);
        log.info('🔗 Generating legacy invite link for property:', propertyId);
        if (isWeb) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
          url = `${origin}/invite?property=${propertyId}`;
        } else {
          url = `myailandlord://invite?property=${propertyId}`;
        }
        if (__DEV__) console.log('[INVITES] 🔗 Legacy URL:', url);
      }

      setInviteUrl(url);
      setGenerationError(null); // Clear any previous errors
      if (__DEV__) console.log('[INVITES] ✅ Invite URL set in state:', url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invite link';
      console.error('[INVITES] ❌ Error generating invite URL:', error);
      log.error('Error generating invite URL:', error as Error);
      setGenerationError(errorMessage);
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTokenizedInvite = async (propId: string, isWeb: boolean): Promise<string> => {
    if (__DEV__) {
      console.log('[INVITES] 🔄 Calling RPC generate_invite_token with:', {
        p_property_id: propId,
        p_max_uses: 1,
        p_expires_in_days: 7
      });
    }

    // Call generate_invite_token RPC function
    const { data, error } = await supabase.rpc('generate_invite_token', {
      p_property_id: propId,
      p_max_uses: 1,       // Single-use token by default
      p_expires_in_days: 7 // 7-day expiry by default
    });

    if (__DEV__) console.log('[INVITES] 🎟️ RPC response:', { data, error, propId });

    if (error) {
      if (__DEV__) console.error('[INVITES] ❌ RPC error details:', JSON.stringify(error, null, 2));
      log.error('RPC error generating token:', error);
      throw new Error('Failed to generate invite token');
    }

    if (!data || !data.token) {
      if (__DEV__) console.error('[INVITES] ❌ No token in response:', data);
      throw new Error('No token returned from server');
    }

    const token = data.token;
    if (__DEV__) console.log('[INVITES] ✅ Token generated:', { token, token_id: data.token_id });
    log.info('✅ Generated tokenized invite:', { token_id: data.token_id });

    // Build URL with token parameter
    if (isWeb) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
      return `${origin}/invite?token=${token}`;
    } else {
      return `myailandlord://invite?token=${token}`;
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(
        'Copy Link',
        `Your invite link is:\n${inviteUrl}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `You're invited to connect to ${propertyName} using the MyAI Landlord app!\n\nClick this link to get started:\n${inviteUrl}`,
      });
    } catch (err) {
      // Share canceled or failed
    }
  };

  const handleSkip = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'LandlordOnboardingSuccess', params: { firstName } }],
      })
    );
  };

  const handleContinue = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'LandlordOnboardingSuccess', params: { firstName } }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Property Setup Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        <Text style={styles.stepIndicator}>Property Setup • Step 4 of 4</Text>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🔗</Text>
          <Text style={styles.title}>Invite your tenant</Text>
          <Text style={styles.subtitle}>
            Share this link with your tenant so they can connect to {propertyName}
          </Text>
        </View>

        {/* Invite Link Display */}
        <View style={styles.codeSection}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Invite Link</Text>
            <Text
              style={styles.linkText}
              numberOfLines={2}
              testID="invite-url"
              accessibilityLabel="Invite URL"
            >
              {inviteUrl || (isGenerating ? 'Generating invite link...' : '')}
            </Text>
            {/* Hidden testable state for E2E tests (DEV only) */}
            {__DEV__ && (
              <Text
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                testID="use-tokenized-flow"
                accessibilityLabel={`Using tokenized flow: ${useTokenizedFlow}`}
              >
                {useTokenizedFlow ? 'true' : 'false'}
              </Text>
            )}
            {generationError && (
              <Text
                style={styles.errorText}
                testID="invite-error"
                accessibilityLabel="Invite generation error"
              >
                Error: {generationError}
              </Text>
            )}
          </View>

          <View style={styles.codeActions}>
            <TouchableOpacity
              style={[styles.actionButton, copied && styles.actionButtonSuccess]}
              onPress={handleCopyLink}
            >
              <Text style={[styles.actionButtonText, copied && styles.actionButtonTextSuccess]}>
                {copied ? '✓ Copied!' : '📋 Copy Link'}
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
            When your tenant clicks this link, they'll be automatically connected to {propertyName}.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            testID="invite-continue-button"
            accessibilityRole="button"
            accessibilityLabel="Continue to success screen"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            testID="invite-skip-button"
            accessibilityRole="button"
            accessibilityLabel="Skip and invite tenant later"
          >
            <Text style={styles.skipButtonText}>I'll invite them later</Text>
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
  linkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.default,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.status.error,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
  },
  emailSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailInput: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.primary.default,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border.default,
  },
  sendButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.inverse,
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
