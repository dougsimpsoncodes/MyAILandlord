import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { supabase } from '../../lib/supabaseClient';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; visible: boolean }> = ({
  message,
  type,
  visible,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        type === 'success' ? styles.toastSuccess : styles.toastError,
        { transform: [{ translateY }] },
      ]}
    >
      <Ionicons
        name={type === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={20}
        color="#FFFFFF"
      />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const SecurityScreen = () => {
  const navigation = useNavigation();
  const { user } = useUnifiedAuth();

  // Expandable section states
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  // Loading states
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Inline feedback states
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
    // Clear feedback when closing
    if (expandedSection === section) {
      setPasswordFeedback(null);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      setPasswordFeedback({ type: 'error', message: 'No email address found for your account.' });
      return;
    }

    setIsResettingPassword(true);
    setPasswordFeedback(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'myailandlord://reset-password',
      });

      if (error) {
        throw error;
      }

      setPasswordFeedback({ type: 'success', message: 'Password reset link sent! Check your email.' });
      showToast('Password reset email sent', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      setPasswordFeedback({ type: 'error', message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <ScreenContainer
      title="Security"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* Password Section */}
      <Text style={styles.sectionTitle}>Password</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => toggleSection('password')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="key-outline" size={20} color="#3498DB" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Change Password</Text>
            <Text style={styles.menuSubtitle}>
              {user?.email ? `Reset via ${user.email}` : 'Send reset link to your email'}
            </Text>
          </View>
          <Ionicons
            name={expandedSection === 'password' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#BDC3C7"
          />
        </TouchableOpacity>

        {/* Expanded Password Section */}
        {expandedSection === 'password' && (
          <View style={styles.expandedContent}>
            <Text style={styles.expandedDescription}>
              We'll send a password reset link to your email address. Click the link to set a new password.
            </Text>

            {passwordFeedback && (
              <View style={[
                styles.feedbackBox,
                passwordFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
              ]}>
                <Ionicons
                  name={passwordFeedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={passwordFeedback.type === 'success' ? '#2ECC71' : '#E74C3C'}
                />
                <Text style={[
                  styles.feedbackText,
                  { color: passwordFeedback.type === 'success' ? '#2ECC71' : '#E74C3C' }
                ]}>
                  {passwordFeedback.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, isResettingPassword && styles.actionButtonDisabled]}
              onPress={handleSendPasswordReset}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Two-Factor Authentication - Coming Soon */}
      <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#F1F2F6' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#95A5A6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitleDisabled}>Authenticator App</Text>
            <Text style={styles.menuSubtitle}>Add extra security with TOTP codes</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Biometric Login - Coming Soon */}
      <Text style={styles.sectionTitle}>Biometric Login</Text>
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#F1F2F6' }]}>
            <Ionicons name="finger-print-outline" size={20} color="#95A5A6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitleDisabled}>Face ID / Touch ID</Text>
            <Text style={styles.menuSubtitle}>Quick sign-in with biometrics</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Active Sessions - Hidden for now, uncomment when needed
      <Text style={styles.sectionTitle}>Active Sessions</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => toggleSection('sessions')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="phone-portrait-outline" size={20} color="#3498DB" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>This Device</Text>
            <Text style={styles.menuSubtitle}>Manage your active sessions</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Current</Text>
          </View>
        </TouchableOpacity>

        {expandedSection === 'sessions' && (
          <View style={styles.expandedContent}>
            <View style={styles.sessionInfo}>
              <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
              <Text style={styles.sessionInfoText}>This device is currently active</Text>
            </View>

            <Text style={styles.expandedDescription}>
              Sign out all other devices that are logged into your account.
            </Text>

            {sessionFeedback && (
              <View style={[
                styles.feedbackBox,
                sessionFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
              ]}>
                <Ionicons
                  name={sessionFeedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={sessionFeedback.type === 'success' ? '#2ECC71' : '#E74C3C'}
                />
                <Text style={[
                  styles.feedbackText,
                  { color: sessionFeedback.type === 'success' ? '#2ECC71' : '#E74C3C' }
                ]}>
                  {sessionFeedback.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.dangerOutlineButton, isSigningOutOthers && styles.actionButtonDisabled]}
              onPress={handleSignOutOthers}
              disabled={isSigningOutOthers}
            >
              {isSigningOutOthers ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Text style={styles.dangerOutlineButtonText}>Sign Out Other Devices</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
      */}

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Toast styles
  toast: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    zIndex: 1000,
    gap: 10,
  },
  toastSuccess: {
    backgroundColor: '#2ECC71',
  },
  toastError: {
    backgroundColor: '#E74C3C',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.7,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: DesignSystem.colors.text,
  },
  menuTitleDisabled: {
    fontSize: 15,
    fontWeight: '500',
    color: '#95A5A6',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  // Expanded content styles
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  expandedDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  feedbackSuccess: {
    backgroundColor: '#E8F8F0',
  },
  feedbackError: {
    backgroundColor: '#FDEDEC',
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F2F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerOutlineButton: {
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerOutlineButtonText: {
    color: '#E74C3C',
    fontSize: 15,
    fontWeight: '600',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sessionInfoText: {
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '500',
  },
  // Badges
  activeBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2ECC71',
  },
  enabledBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enabledBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2ECC71',
  },
  unavailableBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#95A5A6',
  },
  comingSoonBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E67E22',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  modalCancel: {
    fontSize: 16,
    color: '#3498DB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalInstructions: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 16,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    minHeight: 200,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2C3E50',
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    letterSpacing: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SecurityScreen;
