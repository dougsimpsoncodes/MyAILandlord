import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { OnboardingContext } from '../../context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'TenantSetup'>;

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const TenantSetupScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { completeOnboarding } = useContext(OnboardingContext);
  const [propertyCode, setPropertyCode] = useState('');

  const handleConnectProperty = async () => {
    if (!propertyCode.trim()) {
      showAlert('Enter Code', 'Please enter your property code to continue.');
      return;
    }

    // Complete onboarding with pending navigation to PropertyCodeEntry
    // The code will be validated in the main app
    await completeOnboarding('PropertyCodeEntry');
    // MainStack will check pendingNavigation and navigate accordingly
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
              <Ionicons name="key" size={48} color="#3498DB" />
            </View>
          </View>

          <Text style={styles.title}>Connect to Your Property</Text>

          <Text style={styles.subtitle}>
            Enter the property code from your landlord to connect and start reporting issues.
          </Text>

          {/* Property code input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Property Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code (e.g., ABC123)"
              value={propertyCode}
              onChangeText={setPropertyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <Text style={styles.inputHint}>
              Ask your landlord for this code
            </Text>
          </View>

          {/* Alternative options */}
          <View style={styles.alternativeContainer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.alternativeOption}>
              <Ionicons name="link-outline" size={20} color="#7F8C8D" />
              <Text style={styles.alternativeText}>
                Received an invite link? Just click it and you'll be connected automatically.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !propertyCode.trim() && styles.primaryButtonDisabled
            ]}
            onPress={handleConnectProperty}
            activeOpacity={0.8}
            disabled={!propertyCode.trim()}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Connect Property</Text>
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
    backgroundColor: '#3498DB',
    width: 24,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
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
    borderColor: '#3498DB',
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
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: '#E1E8ED',
  },
  inputHint: {
    fontSize: 13,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 8,
  },
  alternativeContainer: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E8ED',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#95A5A6',
  },
  alternativeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  alternativeText: {
    flex: 1,
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
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
  primaryButtonDisabled: {
    backgroundColor: '#BDC3C7',
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

export default TenantSetupScreen;
