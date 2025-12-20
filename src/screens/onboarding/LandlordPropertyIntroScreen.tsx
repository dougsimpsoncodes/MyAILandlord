import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';

type LandlordOnboardingStackParamList = {
  LandlordOnboardingWelcome: { firstName: string };
  LandlordPropertyIntro: { firstName: string };
  PropertyBasics: { firstName?: string; isOnboarding?: boolean };
  PropertyAreas: { propertyData: any; draftId?: string; propertyId?: string; existingAreas?: any[]; isOnboarding?: boolean };
  LandlordTenantInvite: { firstName: string; propertyId: string };
  LandlordOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<LandlordOnboardingStackParamList, 'LandlordPropertyIntro'>;
type IntroRouteProp = RouteProp<LandlordOnboardingStackParamList, 'LandlordPropertyIntro'>;

const steps = [
  { number: '1', title: 'Property Basics', description: 'Address, type, bedrooms & bathrooms' },
  { number: '2', title: 'Property Areas', description: 'Rooms and spaces to document' },
  { number: '3', title: 'Invite Tenant', description: 'Connect with your tenant (optional)' },
];

export default function LandlordPropertyIntroScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IntroRouteProp>();
  const { firstName } = route.params;

  const handleContinue = () => {
    navigation.navigate('PropertyBasics', {
      firstName,
      isOnboarding: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🏗️</Text>
          <Text style={styles.title}>Let's add your property</Text>
          <Text style={styles.subtitle}>
            Here's what we'll cover:
          </Text>
        </View>

        {/* Steps Preview */}
        <View style={styles.stepsSection}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.number}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              {index < steps.length - 1 && <View style={styles.connector} />}
            </View>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={styles.infoText}>
            Don't worry, you can always edit these details later or add more properties.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Start Property Setup</Text>
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
  stepsSection: {
    marginBottom: spacing.xl,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  connector: {
    position: 'absolute',
    left: 17,
    top: 52,
    width: 2,
    height: 20,
    backgroundColor: colors.border.default,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
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
    color: '#15803d',
    lineHeight: 20,
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
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
