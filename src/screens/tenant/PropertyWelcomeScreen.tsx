import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../../components/shared/CustomButton';
import ScreenContainer from '../../components/shared/ScreenContainer';

type PropertyWelcomeNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'PropertyWelcome'>;

interface RouteParams {
  propertyName: string;
  propertyAddress: string;
  wifiNetwork?: string;
  wifiPassword?: string;
}

const PropertyWelcomeScreen = () => {
  const navigation = useNavigation<PropertyWelcomeNavigationProp>();
  const route = useRoute();
  const { propertyName, propertyAddress, wifiNetwork, wifiPassword } = route.params as RouteParams;

  const handleContinue = () => {
    navigation.navigate('Home');
  };

  const handleReportIssue = () => {
    navigation.navigate('ReportIssue');
  };

  const copyWifiPassword = () => {
    if (wifiPassword) {
      // In a real app, you'd use Clipboard.setString(wifiPassword)
      Alert.alert('WiFi Password Copied', `Password: ${wifiPassword}`);
    }
  };

  return (
    <ScreenContainer
      title="Welcome!"
      userRole="tenant"
    >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#2ECC71" />
          </View>
          <Text style={styles.subtitle}>
            You've been successfully linked to {propertyName}
          </Text>
        </View>

        {/* Property Info Card */}
        <View style={styles.propertyCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Property Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{propertyAddress}</Text>
            </View>
          </View>

          {wifiNetwork && (
            <>
              <View style={styles.separator} />
              <View style={styles.infoRow}>
                <Ionicons name="wifi" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>WiFi Network</Text>
                  <Text style={styles.infoValue}>{wifiNetwork}</Text>
                </View>
              </View>
              
              {wifiPassword && (
                <View style={styles.infoRow}>
                  <Ionicons name="key" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>WiFi Password</Text>
                    <Text style={styles.infoValue}>{wifiPassword}</Text>
                  </View>
                  <CustomButton
                    title="Copy"
                    onPress={copyWifiPassword}
                    variant="outline"
                    style={styles.copyButton}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>What you can do now:</Text>
          
          <View style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="construct" size={20} color="#E74C3C" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Report Maintenance Issues</Text>
              <Text style={styles.actionDescription}>
                Easily report any problems with appliances, plumbing, electrical, etc.
              </Text>
            </View>
          </View>

          <View style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={20} color="#3498DB" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Communicate with Your Landlord</Text>
              <Text style={styles.actionDescription}>
                Send messages and receive important announcements.
              </Text>
            </View>
          </View>

          <View style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="document-text" size={20} color="#9B59B6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Property Information</Text>
              <Text style={styles.actionDescription}>
                Access WiFi details, emergency contacts, and property guidelines.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <CustomButton
            title="Report Your First Issue"
            onPress={handleReportIssue}
            icon="construct"
            style={styles.primaryButton}
          />
          
          <CustomButton
            title="Go to Dashboard"
            onPress={handleContinue}
            variant="outline"
            icon="home"
            style={styles.secondaryButton}
          />
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you have any questions about using the app or need assistance with your property, 
            don't hesitate to contact your landlord through the Communication Hub.
          </Text>
        </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 12,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  buttonSection: {
    marginBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#E74C3C',
  },
  secondaryButton: {
    borderColor: '#007AFF',
  },
  helpSection: {
    backgroundColor: '#E8F4F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#5A6C7D',
    lineHeight: 20,
  },
});

export default PropertyWelcomeScreen;