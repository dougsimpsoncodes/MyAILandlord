import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';

const SecurityScreen = () => {
  const navigation = useNavigation();

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'A password reset link will be sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () => {
            // TODO: Implement password reset
            Alert.alert('Success', 'Password reset link sent to your email');
          },
        },
      ]
    );
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} will be available in a future update.`);
  };

  return (
    <ScreenContainer
      title="Security"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      {/* Password Section */}
      <Text style={styles.sectionTitle}>Password</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
          <View style={[styles.menuIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="key-outline" size={20} color="#3498DB" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Change Password</Text>
            <Text style={styles.menuSubtitle}>Last changed 30+ days ago</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
        </TouchableOpacity>
      </View>

      {/* Two-Factor Authentication */}
      <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.toggleItem}
          onPress={() => handleComingSoon('Two-Factor Authentication')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#E8F8F0' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2ECC71" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Enable 2FA</Text>
            <Text style={styles.menuSubtitle}>Add extra security to your account</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Biometric Login */}
      <Text style={styles.sectionTitle}>Biometric Login</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.toggleItem}
          onPress={() => handleComingSoon('Face ID / Touch ID')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#F4ECF7' }]}>
            <Ionicons name="finger-print-outline" size={20} color="#9B59B6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Face ID / Touch ID</Text>
            <Text style={styles.menuSubtitle}>Quick sign-in with biometrics</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Active Sessions */}
      <Text style={styles.sectionTitle}>Active Sessions</Text>
      <View style={styles.card}>
        <View style={styles.sessionItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="phone-portrait-outline" size={20} color="#3498DB" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>This Device</Text>
            <Text style={styles.menuSubtitle}>Active now</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Current</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutAllBtn}>
        <Text style={styles.signOutAllText}>Sign Out All Other Devices</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
  sessionItem: {
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
  menuSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
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
  comingSoonBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F39C12',
  },
  signOutAllBtn: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  signOutAllText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E74C3C',
  },
});

export default SecurityScreen;
