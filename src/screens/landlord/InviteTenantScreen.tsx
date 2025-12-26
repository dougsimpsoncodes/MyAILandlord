import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Platform, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../../components/shared/CustomButton';
import ScreenContainer from '../../components/shared/ScreenContainer';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { supabase } from '../../services/supabase/client';
import log from '../../lib/log';

type InviteTenantNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'InviteTenant'>;

interface RouteParams {
  propertyId: string;
  propertyName: string;
}

type DeliveryMode = 'email' | 'code' | null;

const InviteTenantScreen = () => {
  const navigation = useNavigation<InviteTenantNavigationProp>();
  const route = useRoute();
  const { propertyId, propertyName } = route.params as RouteParams;

  const [mode, setMode] = useState<DeliveryMode>(null);
  const [email, setEmail] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Dialog state
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmStyle?: 'default' | 'destructive' | 'info';
  }>({ visible: false, title: '', message: '' });

  const showNotification = (title: string, msg: string, style: 'default' | 'destructive' | 'info' = 'info') => {
    setDialogConfig({
      visible: true,
      title,
      message: msg,
      confirmStyle: style,
    });
  };

  const buildInviteUrl = (token: string): string => {
    const isDevelopment = __DEV__;

    if (Platform.OS === 'web') {
      return isDevelopment
        ? `http://localhost:8081/invite?t=${token}`
        : `https://myailandlord.app/invite?t=${token}`;
    } else {
      return isDevelopment
        ? `exp://192.168.0.14:8081/--/invite?t=${token}`
        : `https://myailandlord.app/invite?t=${token}`;
    }
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      log.info('[InviteTenant] Generating code invite for property:', propertyId);

      // Check session before RPC call
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      log.info('[InviteTenant] Current session:', {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        sessionError: sessionError?.message,
      });

      const { data, error } = await supabase.rpc('create_invite', {
        p_property_id: propertyId,
        p_delivery_method: 'code',
        p_intended_email: null
      });

      if (error) {
        log.error('[InviteTenant] Error generating invite:', error);
        showNotification('Error', 'Failed to generate invite code. Please try again.', 'destructive');
        return;
      }

      if (!data || !Array.isArray(data) || data.length === 0 || !data[0].token) {
        log.error('[InviteTenant] No token returned from RPC, data:', data);
        showNotification('Error', 'Failed to generate invite code. Please try again.', 'destructive');
        return;
      }

      const token = data[0].token;
      const url = buildInviteUrl(token);

      setInviteToken(token);
      setInviteUrl(url);
      setMode('code');

      log.info('[InviteTenant] Code invite created:', { token, url });
    } catch (err) {
      log.error('[InviteTenant] Exception generating code invite:', err);
      showNotification('Error', 'An unexpected error occurred. Please try again.', 'destructive');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      showNotification('Invalid Email', 'Please enter a valid email address.', 'destructive');
      return;
    }

    setIsGenerating(true);
    try {
      log.info('[InviteTenant] Generating email invite for property:', propertyId);

      // Step 1: Create invite token
      const { data, error } = await supabase.rpc('create_invite', {
        p_property_id: propertyId,
        p_delivery_method: 'email',
        p_intended_email: email
      });

      if (error) {
        log.error('[InviteTenant] Error generating invite:', error);
        showNotification('Error', 'Failed to generate invite. Please try again.', 'destructive');
        return;
      }

      if (!data || !Array.isArray(data) || data.length === 0 || !data[0].token) {
        log.error('[InviteTenant] No token returned from RPC, data:', data);
        showNotification('Error', 'Failed to generate invite. Please try again.', 'destructive');
        return;
      }

      const token = data[0].token;
      const url = buildInviteUrl(token);

      log.info('[InviteTenant] Email invite token created:', { token, url });

      // Step 2: Send email via Edge Function
      const { data: userData } = await supabase.auth.getUser();
      const landlordName = userData?.user?.user_metadata?.name || 'Your Landlord';

      const edgeResponse = await supabase.functions.invoke('send-invite-email', {
        body: {
          recipientEmail: email,
          propertyName: propertyName,
          inviteUrl: url,
          landlordName: landlordName,
        },
      });

      if (edgeResponse.error) {
        log.error('[InviteTenant] Error sending email:', edgeResponse.error);
        showNotification(
          'Email Failed',
          'Invite was created but email failed to send. You can copy the link and send it manually.',
          'destructive'
        );
        // Still show the invite URL for manual sharing
        setInviteToken(token);
        setInviteUrl(url);
        setMode('code');
        return;
      }

      log.info('[InviteTenant] Email sent successfully to:', email);

      setInviteToken(token);
      setInviteUrl(url);
      setMode('email');
      setEmailSent(true);

      showNotification(
        'Email Sent!',
        `Invitation email sent to ${email}`,
        'default'
      );
    } catch (err) {
      log.error('[InviteTenant] Exception sending email invite:', err);
      showNotification('Error', 'An unexpected error occurred. Please try again.', 'destructive');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = async () => {
    try {
      await Clipboard.setString(inviteToken);
      showNotification('Copied!', 'Invite code copied to clipboard', 'default');
    } catch (error) {
      log.error('Error copying token:', error);
      showNotification('Error', 'Failed to copy code', 'destructive');
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(inviteUrl);
      showNotification('Copied!', 'Invite link copied to clipboard', 'default');
    } catch (error) {
      log.error('Error copying link:', error);
      showNotification('Error', 'Failed to copy link', 'destructive');
    }
  };

  const handleReset = () => {
    setMode(null);
    setEmail('');
    setInviteToken('');
    setInviteUrl('');
    setEmailSent(false);
  };

  return (
    <ScreenContainer
      title="Invite Tenant"
      subtitle="Share an invite with your tenant to connect them to the property"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
    >
      <View testID="invite-screen" />
      {/* Property Info */}
      <View style={styles.propertyCard}>
        <View style={styles.propertyHeader}>
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={styles.propertyName}>{propertyName}</Text>
        </View>
      </View>

      {!mode && (
        <View style={styles.modeSelection}>
          <Text style={styles.modeTitle}>Choose how to send the invite:</Text>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setMode('email')}
            testID="invite-mode-email"
          >
            <Ionicons name="mail" size={32} color="#007AFF" />
            <Text style={styles.modeCardTitle}>Send via Email</Text>
            <Text style={styles.modeCardDescription}>
              Enter the tenant's email address and we'll send them the invite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setMode('code')}
            disabled={isGenerating}
            testID="invite-mode-code"
          >
            {isGenerating ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <>
                <Ionicons name="link" size={32} color="#007AFF" />
                <Text style={styles.modeCardTitle}>Get Shareable Code</Text>
                <Text style={styles.modeCardDescription}>
                  Generate a code that you can share via SMS, messaging apps, etc.
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'email' && !emailSent && (
        <View style={styles.emailSection}>
          <Text style={styles.sectionTitle}>Tenant's Email Address:</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="tenant@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            testID="invite-email-input"
          />

          <CustomButton
            title={isGenerating ? "Sending..." : "Send Invitation Email"}
            onPress={handleSendEmail}
            disabled={isGenerating}
            icon="paper-plane-outline"
            style={styles.sendButton}
            testID="invite-send"
          />

          <CustomButton
            title="Back"
            onPress={handleReset}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      )}

      {mode === 'code' && !inviteToken && (
        <View style={styles.codeSection}>
          <CustomButton
            title={isGenerating ? 'Generating...' : 'Generate Invite Code'}
            onPress={handleGenerateCode}
            disabled={isGenerating}
            testID="invite-generate"
          />
        </View>
      )}

      {mode === 'code' && inviteToken && (
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Invite Code:</Text>
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenText} testID="invite-code">{inviteToken}</Text>
            <TouchableOpacity onPress={handleCopyToken} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Or share the full link:</Text>
          <View style={styles.urlContainer}>
            <Text style={styles.urlText} numberOfLines={2}>
              {inviteUrl}
            </Text>
            <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How it works:</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Share the code or link with your tenant</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Tenant opens the link or enters the code</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>They sign up or log in to the app</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>They're automatically connected to {propertyName}</Text>
            </View>
          </View>

          <CustomButton
            title="Create Another Invite"
            onPress={handleReset}
            variant="outline"
            style={styles.resetButton}
          />
        </View>
      )}

      {mode === 'email' && emailSent && (
        <View style={styles.successSection}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successMessage}>
            An invitation email has been sent to {email}
          </Text>

          <View style={styles.backupSection}>
            <Text style={styles.backupTitle}>Backup options:</Text>
            <Text style={styles.backupText}>
              If they don't receive the email, you can share this code directly:
            </Text>
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenText}>{inviteToken}</Text>
              <TouchableOpacity onPress={handleCopyToken} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <CustomButton
            title="Send Another Invite"
            onPress={handleReset}
            variant="outline"
            style={styles.resetButton}
          />
        </View>
      )}

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmStyle={dialogConfig.confirmStyle}
        onConfirm={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
        onCancel={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
      />
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
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modeSelection: {
    marginHorizontal: 16,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    alignItems: 'center',
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  modeCardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailSection: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  sendButton: {
    marginBottom: 12,
  },
  backButton: {
    marginTop: 8,
  },
  codeSection: {
    marginHorizontal: 16,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  tokenText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    marginBottom: 24,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  instructions: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
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
  resetButton: {
    marginTop: 8,
  },
  successSection: {
    marginHorizontal: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backupSection: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  backupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  backupText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
});

export default InviteTenantScreen;
