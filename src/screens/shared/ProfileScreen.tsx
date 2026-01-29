import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

interface ProfileScreenProps {
  route?: {
    params?: {
      userRole?: 'landlord' | 'tenant';
    };
  };
}

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconBg: string;
  onPress?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const { user, signOut, refreshUser } = useUnifiedAuth();
  const role = route?.params?.userRole || user?.role;
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Refresh user data when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const isLandlord = role === 'landlord';
  const accentColor = isLandlord ? '#3498DB' : '#2ECC71';

  const handleSignOut = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      // Navigate to Auth screen after successful sign out
      // Use getRootState to access root navigator
      const rootNav = navigation.getParent();
      if (rootNav) {
        rootNav.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setShowSignOutDialog(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const accountMenuItems: MenuItem[] = [
    {
      id: 'edit-profile',
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Name, phone, photo',
      iconBg: '#EBF5FB',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'security',
      icon: 'lock-closed-outline',
      title: 'Security',
      subtitle: 'Password, 2FA',
      iconBg: '#E8F8F0',
      onPress: () => navigation.navigate('Security'),
    },
  ];

  const preferencesMenuItems: MenuItem[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Push, email settings',
      iconBg: '#FEF5E7',
      onPress: () => navigation.navigate('Notifications'),
    },
  ];

  const supportMenuItems: MenuItem[] = [
    {
      id: 'help',
      icon: 'help-circle-outline',
      title: 'Help Center',
      iconBg: '#EBF5FB',
      onPress: () => navigation.navigate('HelpCenter'),
    },
    {
      id: 'contact',
      icon: 'chatbubble-outline',
      title: 'Contact Support',
      iconBg: '#E8F8F0',
      onPress: () => navigation.navigate('ContactSupport'),
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={20} color={accentColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
    </TouchableOpacity>
  );

  const getInitials = () => {
    if (!user?.name) return '?';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <ScreenContainer
      title="Profile"
      userRole={role || undefined}
    >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: accentColor }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
            <Text style={[styles.roleBadgeText, { color: accentColor }]}>
              {isLandlord ? 'Landlord' : 'Tenant'}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {accountMenuItems.map(renderMenuItem)}
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          {preferencesMenuItems.map(renderMenuItem)}
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          {supportMenuItems.map(renderMenuItem)}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} testID="nav-sign-out">
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>MyAI Landlord v1.0.0</Text>

        <ConfirmDialog
          visible={showSignOutDialog}
          title="Sign Out"
          message="Are you sure you want to sign out of your account?"
          confirmText="Sign Out"
          cancelText="Cancel"
          confirmStyle="destructive"
          onConfirm={confirmSignOut}
          onCancel={() => setShowSignOutDialog(false)}
          isLoading={isSigningOut}
        />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: DesignSystem.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
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
  logoutButton: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
  versionText: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default ProfileScreen;
