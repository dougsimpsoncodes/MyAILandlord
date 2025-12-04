import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const { width } = Dimensions.get('window');

const OnboardingWelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('RoleSelect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.mainIcon}>🏠</Text>
          </View>

          <Text style={styles.title}>Welcome to{'\n'}My AI Landlord</Text>

          <Text style={styles.subtitle}>
            Streamline property management with AI-powered maintenance tracking and seamless communication.
          </Text>

          {/* Feature highlights */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Ionicons name="camera-outline" size={24} color="#3498DB" />
              <Text style={styles.featureText}>Report issues with photos & voice</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="chatbubbles-outline" size={24} color="#3498DB" />
              <Text style={styles.featureText}>Direct landlord-tenant messaging</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="analytics-outline" size={24} color="#3498DB" />
              <Text style={styles.featureText}>AI-powered maintenance insights</Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    paddingTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E8ED',
  },
  progressDotActive: {
    backgroundColor: '#3498DB',
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
  mainIcon: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#2C3E50',
    flex: 1,
  },
  footer: {
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
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
});

export default OnboardingWelcomeScreen;
