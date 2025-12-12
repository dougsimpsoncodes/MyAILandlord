import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Clipboard, Platform, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import CustomButton from '../../components/shared/CustomButton';
import ScreenContainer from '../../components/shared/ScreenContainer';

type InviteTenantNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'InviteTenant'>;

interface RouteParams {
  propertyId: string;
  propertyName: string;
  propertyCode?: string; // Make optional for backward compatibility
}

const InviteTenantScreen = () => {
  const navigation = useNavigation<InviteTenantNavigationProp>();
  const route = useRoute();
  const { propertyId, propertyName, propertyCode } = route.params as RouteParams;

  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    generateInviteUrl();
  }, []);

  const generateInviteUrl = () => {
    // Create invite URL with property ID that works with deep linking
    // Use Expo development URL for development, https for production
    const isDevelopment = __DEV__;
    const url = isDevelopment 
      ? `exp://192.168.0.14:8081/--/invite?property=${propertyId}`
      : `https://myailandlord.app/invite?property=${propertyId}`;
    setInviteUrl(url);
  };


  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(inviteUrl);
      Alert.alert('Copied!', 'Invite link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleSendEmail = async () => {
    try {
      const subject = encodeURIComponent(`Invitation to ${propertyName}`);
      const body = encodeURIComponent(
        `Hi!\n\nYou're invited to connect to ${propertyName} using the MyAI Landlord app.\n\nClick this link to get started:\n${inviteUrl}\n\nThis link will automatically connect you to your rental property so you can:\n• Report maintenance issues\n• Communicate with your property manager\n• Access property information\n\nBest regards`
      );
      
      const emailUrl = `mailto:?subject=${subject}&body=${body}`;
      
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        // Fallback: copy email content to clipboard
        const emailContent = `Subject: Invitation to ${propertyName}\n\nHi!\n\nYou're invited to connect to ${propertyName} using the MyAI Landlord app.\n\nClick this link to get started:\n${inviteUrl}\n\nThis link will automatically connect you to your rental property so you can:\n• Report maintenance issues\n• Communicate with your property manager\n• Access property information\n\nBest regards`;
        
        if (Platform.OS === 'web') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(emailContent);
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = emailContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
        } else {
          await Clipboard.setString(emailContent);
        }
        
        Alert.alert(
          'Email Content Copied',
          'Unable to open email app. The email content has been copied to your clipboard. You can paste it into any email app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Error', 'Failed to open email or copy content. Please try the "Copy Link" button.');
    }
  };

  return (
    <ScreenContainer
      title="Invite Tenant"
      subtitle="Share this link with your tenant to automatically connect them to the property"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
    >

        {/* Property Info */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={24} color="#007AFF" />
            <Text style={styles.propertyName}>{propertyName}</Text>
          </View>
        </View>

        {/* Invite URL Display */}
        <View style={styles.urlSection}>
          <Text style={styles.urlLabel}>Invite Link:</Text>
          <View style={styles.urlContainer}>
            <Text style={styles.urlText} numberOfLines={2}>
              {inviteUrl}
            </Text>
            <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.shareSection}>
          <Text style={styles.shareTitle}>Share Invitation:</Text>
          
          <CustomButton
            title="Send via Email"
            onPress={handleSendEmail}
            icon="mail-outline"
            style={styles.shareButton}
          />

          <CustomButton
            title="Copy Link"
            onPress={handleCopyLink}
            variant="outline"
            icon="copy-outline"
            style={styles.shareButton}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How it works:</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>Share the invite link with your tenant</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>Tenant clicks link and signs up for the app</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>They're automatically connected to {propertyName}</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4.</Text>
            <Text style={styles.stepText}>Tenant can start reporting maintenance issues!</Text>
          </View>
        </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  propertyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  propertyCode: {
    fontSize: 14,
    color: '#666',
  },
  urlSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  urlLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  shareSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  shareButton: {
    marginBottom: 12,
  },
  instructions: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default InviteTenantScreen;