import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useApiClient } from '../../services/api/client';
import { log } from '../../lib/log';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveTitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';
import CustomButton from '../../components/shared/CustomButton';
import CustomTextInput from '../../components/shared/CustomTextInput';

type PropertyCodeEntryNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'PropertyCodeEntry'>;

const PropertyCodeEntryScreen = () => {
  const navigation = useNavigation<PropertyCodeEntryNavigationProp>();
  const { user } = useAppAuth();
  const apiClient = useApiClient();
  const responsive = useResponsive();
  
  const [propertyCode, setPropertyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ensureProfileExists = async () => {
    if (!user || !apiClient) {
      throw new Error('User not authenticated');
    }
    const profile = await apiClient.getUserProfile();
    if (!profile) {
      const email = user.email;
      const name = user.name;
      const avatarUrl = user.avatar || '';
      await apiClient.createUserProfile({ email, name, avatarUrl, role: 'tenant' });
      log.info('Profile created for tenant via code entry');
    }
  };

  const handleCodeSubmit = async () => {
    if (!propertyCode.trim()) {
      setError('Please enter a property code');
      return;
    }

    if (!apiClient || !user) {
      Alert.alert('Error', 'Authentication required. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Ensure profile exists before validation
      await ensureProfileExists();

      // Validate property code
      const validation = await apiClient.validatePropertyCode(propertyCode.trim());
      
      if (!validation.success) {
        setError(validation.error_message || 'Invalid property code');
        return;
      }

      // Check if multi-unit property
      if (validation.is_multi_unit) {
        // Navigate to unit selection
        navigation.navigate('UnitSelection', {
          propertyCode: propertyCode.trim(),
          propertyName: validation.property_name || '',
          propertyAddress: validation.property_address || '',
        });
      } else {
        // Link tenant directly to property
        const linkResult = await apiClient.linkTenantToProperty(propertyCode.trim());
        
        if (linkResult.success) {
          Alert.alert(
            'Success!',
            `You've been linked to ${validation.property_name}`,
            [
              {
                text: 'Continue',
                onPress: () => navigation.navigate('PropertyWelcome', {
                  propertyName: validation.property_name || '',
                  propertyAddress: validation.property_address || '',
                  wifiNetwork: validation.wifi_network || undefined,
                  wifiPassword: validation.wifi_password || undefined,
                })
              }
            ]
          );
        } else {
          setError(linkResult.error_message || 'Failed to link to property');
        }
      }
    } catch (error) {
      log.error('Property code validation error:', error as any);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        setError('Authentication error. Please sign out and sign back in.');
      } else if (errorMessage.includes('profile')) {
        setError('Profile setup failed. Please contact support.');
      } else {
        setError('Failed to validate property code. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Property Setup?',
      'You can link to your property later in Settings. Some features may be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.navigate('Home') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer>
        {/* Header */}
        <View style={styles.header}>
          <ResponsiveTitle style={styles.title}>
            Connect to Your Property
          </ResponsiveTitle>
          <ResponsiveBody style={styles.subtitle}>
            Enter the property code provided by your landlord or property manager
          </ResponsiveBody>
        </View>

        {/* Property Code Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Property Code</Text>
          <CustomTextInput
            value={propertyCode}
            onChangeText={(text) => {
              setPropertyCode(text.toUpperCase());
              setError('');
            }}
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={true}
            style={[
              styles.codeInput,
              error ? styles.inputError : null
            ]}
            onSubmitEditing={handleCodeSubmit}
            returnKeyType="done"
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <ResponsiveCaption style={styles.helpText}>
            Example: ABC123 (6 characters)
          </ResponsiveCaption>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <CustomButton
            title={loading ? 'Validating...' : 'Continue'}
            onPress={handleCodeSubmit}
            disabled={loading || !propertyCode.trim()}
            style={styles.continueButton}
            icon={loading ? undefined : 'arrow-forward'}
          />

          <CustomButton
            title="Don't have a code?"
            onPress={() => navigation.navigate('PropertySearch')}
            variant="outline"
            style={styles.searchButton}
            icon="search"
          />

          <CustomButton
            title="Skip for now"
            onPress={handleSkip}
            variant="text"
            style={styles.skipButton}
          />
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpItem}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <ResponsiveCaption style={styles.helpItemText}>
              Property codes are provided by your landlord via email, text, or lease documents
            </ResponsiveCaption>
          </View>
          <View style={styles.helpItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <ResponsiveCaption style={styles.helpItemText}>
              Codes may expire for security. Contact your landlord if yours doesn't work
            </ResponsiveCaption>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  inputSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  codeInput: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  helpText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  actionSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#007AFF',
  },
  searchButton: {
    borderColor: '#007AFF',
  },
  skipButton: {
    marginTop: 8,
  },
  helpSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpItemText: {
    flex: 1,
    color: '#666',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PropertyCodeEntryScreen;
