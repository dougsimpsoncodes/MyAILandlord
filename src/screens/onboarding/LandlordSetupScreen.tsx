import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { OnboardingContext } from '../../context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'LandlordSetup'>;

const LandlordSetupScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { completeOnboarding } = useContext(OnboardingContext);

  const handleAddProperty = async () => {
    // Complete onboarding with pending navigation to AddProperty
    await completeOnboarding('AddProperty');
    // The MainStack will check pendingNavigation and navigate accordingly
  };

  const handleSkip = async () => {
    await completeOnboarding();
    // AppNavigator will automatically route to MainStack once onboarding is complete
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>

          <View style={styles.backButton} />
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="home" size={48} color="#34495E" />
            </View>
          </View>

          <Text style={styles.title}>Add Your First Property</Text>

          <Text style={styles.subtitle}>
            Set up your property to start managing maintenance requests and inviting tenants.
          </Text>

          {/* Benefits */}
          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="people-outline" size={20} color="#34495E" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Invite Tenants</Text>
                <Text style={styles.benefitDescription}>Share a simple code with your tenants</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="construct-outline" size={20} color="#34495E" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Track Maintenance</Text>
                <Text style={styles.benefitDescription}>Receive and manage repair requests</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="analytics-outline" size={20} color="#34495E" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>AI Insights</Text>
                <Text style={styles.benefitDescription}>Get cost estimates and recommendations</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddProperty}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Property</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>I'll do this later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E8ED',
  },
  progressDotActive: {
    backgroundColor: '#34495E',
    width: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#34495E',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  benefits: {
    width: '100%',
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#34495E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
});

export default LandlordSetupScreen;
