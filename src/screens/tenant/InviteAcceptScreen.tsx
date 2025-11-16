import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useApiClient } from '../../services/api/client';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import CustomButton from '../../components/shared/CustomButton';

type InviteAcceptNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'InviteAccept'>;

interface RouteParams {
  propertyCode: string;
}

const InviteAcceptScreen = () => {
  const navigation = useNavigation<InviteAcceptNavigationProp>();
  const route = useRoute();
  const { propertyCode } = route.params as RouteParams;
  const { user } = useAppAuth();
  const apiClient = useApiClient();
  const responsive = useResponsive();
  
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    validateInviteCode();
  }, []);

  const validateInviteCode = async () => {
    if (!apiClient || !user) {
      setLoading(false);
      return;
    }

    try {
      const result = await apiClient.validatePropertyCode(propertyCode);
      setValidationResult(result);
      
      if (!result.success) {
        Alert.alert('Invalid Invite', result.error_message || 'This invite link is not valid or has expired.');
      }
    } catch (error) {
      console.error('Error validating invite code:', error);
      Alert.alert('Error', 'Failed to validate invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!validationResult?.success || !apiClient) return;

    try {
      setLinking(true);

      if (validationResult.is_multi_unit) {
        // Navigate to unit selection for multi-unit properties
        navigation.navigate('UnitSelection', {
          propertyCode: propertyCode,
          propertyName: validationResult.property_name,
          propertyAddress: validationResult.property_address,
        });
      } else {
        // Link tenant directly to single-unit property
        const linkResult = await apiClient.linkTenantToProperty(propertyCode);
        
        if (linkResult.success) {
          Alert.alert(
            'Welcome!',
            `You've been successfully connected to ${validationResult.property_name}`,
            [
              {
                text: 'Continue',
                onPress: () => navigation.navigate('PropertyWelcome', {
                  propertyName: validationResult.property_name,
                  propertyAddress: validationResult.property_address,
                  wifiNetwork: validationResult.wifi_network,
                  wifiPassword: validationResult.wifi_password,
                })
              }
            ]
          );
        } else {
          Alert.alert('Error', linkResult.error_message || 'Failed to connect to property');
        }
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this property invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => navigation.navigate('Home') }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ResponsiveContainer>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Validating invitation...</Text>
          </View>
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  if (!validationResult?.success) {
    return (
      <SafeAreaView style={styles.container}>
        <ResponsiveContainer>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
            <ResponsiveTitle style={styles.errorTitle}>
              Invalid Invitation
            </ResponsiveTitle>
            <ResponsiveBody style={styles.errorMessage}>
              This invitation link is not valid or has expired. Please contact your landlord for a new invitation.
            </ResponsiveBody>
            <CustomButton
              title="Go Home"
              onPress={() => navigation.navigate('Home')}
              style={styles.button}
            />
          </View>
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail-open-outline" size={64} color="#007AFF" />
          <ResponsiveTitle style={styles.title}>
            Property Invitation
          </ResponsiveTitle>
          <ResponsiveBody style={styles.subtitle}>
            You've been invited to connect to a rental property
          </ResponsiveBody>
        </View>

        {/* Property Info */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={32} color="#007AFF" />
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{validationResult.property_name}</Text>
              <Text style={styles.propertyAddress}>{validationResult.property_address}</Text>
            </View>
          </View>

          {validationResult.wifi_network && (
            <View style={styles.wifiInfo}>
              <Ionicons name="wifi" size={20} color="#666" />
              <View style={styles.wifiDetails}>
                <Text style={styles.wifiNetwork}>WiFi: {validationResult.wifi_network}</Text>
                {validationResult.wifi_password && (
                  <Text style={styles.wifiPassword}>Password: {validationResult.wifi_password}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>What you'll get:</Text>
          <View style={styles.benefit}>
            <Ionicons name="build-outline" size={20} color="#007AFF" />
            <Text style={styles.benefitText}>Report maintenance issues instantly</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
            <Text style={styles.benefitText}>Communicate with your landlord</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.benefitText}>Access property information</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="notifications-outline" size={20} color="#007AFF" />
            <Text style={styles.benefitText}>Get updates on your requests</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <CustomButton
            title={linking ? 'Connecting...' : 'Accept Invitation'}
            onPress={handleAcceptInvite}
            disabled={linking}
            loading={linking}
            style={styles.acceptButton}
            icon={linking ? undefined : 'checkmark-circle'}
          />

          <CustomButton
            title="Not interested"
            onPress={handleDecline}
            variant="text"
            style={styles.declineButton}
          />
        </View>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorTitle: {
    textAlign: 'center',
    color: '#ff4444',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  propertyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  wifiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  wifiDetails: {
    flex: 1,
  },
  wifiNetwork: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  wifiPassword: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  benefitsSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  actionSection: {
    marginHorizontal: 16,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  declineButton: {
    marginTop: 8,
  },
  button: {
    marginTop: 16,
  },
});

export default InviteAcceptScreen;
