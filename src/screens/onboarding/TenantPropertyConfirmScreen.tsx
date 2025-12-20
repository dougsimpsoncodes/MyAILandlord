import React, { useState } from 'react';
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

type TenantOnboardingStackParamList = {
  TenantOnboardingWelcome: { firstName: string };
  TenantPropertyCode: { firstName: string };
  TenantPropertyConfirm: { firstName: string; propertyId: string; propertyName: string; landlordName: string };
  TenantOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<TenantOnboardingStackParamList, 'TenantPropertyConfirm'>;
type ConfirmRouteProp = RouteProp<TenantOnboardingStackParamList, 'TenantPropertyConfirm'>;

export default function TenantPropertyConfirmScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConfirmRouteProp>();
  const { firstName, propertyId, propertyName, landlordName } = route.params;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      // Create tenant-property link
      const { error: linkError } = await supabase
        .from('tenant_property_links')
        .insert({
          tenant_id: user.id,
          property_id: propertyId,
          status: 'active',
        });

      if (linkError) {
        // Check if already linked
        if (linkError.code === '23505') {
          setError('You are already connected to this property.');
        } else {
          setError(linkError.message);
        }
        setLoading(false);
        return;
      }

      // Navigate to success
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TenantOnboardingSuccess', params: { firstName } }],
        })
      );
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🏠</Text>
          <Text style={styles.title}>Is this your property?</Text>
        </View>

        {/* Property Card */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyIcon}>
            <Text style={styles.propertyIconText}>🏡</Text>
          </View>
          <Text style={styles.propertyName}>{propertyName}</Text>
          <View style={styles.landlordInfo}>
            <Text style={styles.landlordLabel}>Managed by</Text>
            <Text style={styles.landlordName}>{landlordName}</Text>
          </View>
        </View>

        {/* Confirmation Text */}
        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationText}>
            By confirming, you'll be connected to this property and can:
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Submit maintenance requests</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Message your landlord directly</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Access property information</Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Yes, Connect Me</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <Text style={styles.secondaryButtonText}>No, Go Back</Text>
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
  },
  propertyCard: {
    backgroundColor: '#f0f4ff',
    borderWidth: 2,
    borderColor: colors.primary.default,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  propertyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  propertyIconText: {
    fontSize: 32,
  },
  propertyName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  landlordInfo: {
    alignItems: 'center',
  },
  landlordLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  landlordName: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.primary.default,
  },
  confirmationSection: {
    marginBottom: spacing.lg,
  },
  confirmationText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  benefitsList: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  benefitIcon: {
    fontSize: 16,
    color: colors.status.success,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
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
  secondaryButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
