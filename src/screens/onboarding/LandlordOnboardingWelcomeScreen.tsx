import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme/DesignSystem';

type LandlordOnboardingStackParamList = {
  LandlordOnboardingWelcome: { firstName: string };
  LandlordPropertyIntro: { firstName: string };
  LandlordPropertyAddress: { firstName: string };
  LandlordPropertyType: { firstName: string; address: string };
  LandlordTenantInvite: { firstName: string; propertyId: string };
  LandlordOnboardingSuccess: { firstName: string };
};

type NavigationProp = NativeStackNavigationProp<LandlordOnboardingStackParamList, 'LandlordOnboardingWelcome'>;
type WelcomeRouteProp = RouteProp<LandlordOnboardingStackParamList, 'LandlordOnboardingWelcome'>;

const features = [
  {
    icon: '🏠',
    title: 'Property Management',
    description: 'Add and manage all your properties in one place',
  },
  {
    icon: '🔧',
    title: 'Maintenance Tracking',
    description: 'Receive and track tenant maintenance requests',
  },
  {
    icon: '💬',
    title: 'Easy Communication',
    description: 'Message tenants directly through the app',
  },
  {
    icon: '📊',
    title: 'Smart Insights',
    description: 'AI-powered suggestions to help you manage better',
  },
];

export default function LandlordOnboardingWelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WelcomeRouteProp>();
  const { firstName } = route.params;

  const handleContinue = () => {
    navigation.navigate('LandlordPropertyIntro', { firstName });
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
          <Text style={styles.stepIndicator}>Step 4 of 4 • Landlord Setup</Text>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>🎉</Text>
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
              🌟 Trusted by landlords managing properties nationwide
            </Text>
          </View>

          {/* Button Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Let's Set Up Your First Property</Text>
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
  heroIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
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
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
