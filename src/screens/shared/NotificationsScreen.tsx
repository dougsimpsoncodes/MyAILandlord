import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';

interface NotificationSetting {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  enabled: boolean;
}

const NotificationsScreen = () => {
  const navigation = useNavigation();

  const [pushSettings, setPushSettings] = useState<NotificationSetting[]>([
    {
      id: 'maintenance',
      title: 'Maintenance Updates',
      subtitle: 'Status changes, new requests',
      icon: 'construct-outline',
      iconBg: '#FEF5E7',
      iconColor: '#F39C12',
      enabled: true,
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'New messages from tenants/landlords',
      icon: 'chatbubble-outline',
      iconBg: '#EBF5FB',
      iconColor: '#3498DB',
      enabled: true,
    },
    {
      id: 'reminders',
      title: 'Reminders',
      subtitle: 'Rent due, lease renewals',
      icon: 'alarm-outline',
      iconBg: '#F4ECF7',
      iconColor: '#9B59B6',
      enabled: true,
    },
  ]);

  const [emailSettings, setEmailSettings] = useState<NotificationSetting[]>([
    {
      id: 'weekly-summary',
      title: 'Weekly Summary',
      subtitle: 'Property activity digest',
      icon: 'newspaper-outline',
      iconBg: '#E8F8F0',
      iconColor: '#2ECC71',
      enabled: false,
    },
    {
      id: 'marketing',
      title: 'Product Updates',
      subtitle: 'New features, tips & tricks',
      icon: 'megaphone-outline',
      iconBg: '#FDEDEC',
      iconColor: '#E74C3C',
      enabled: false,
    },
  ]);

  const togglePushSetting = (id: string) => {
    setPushSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const toggleEmailSetting = (id: string) => {
    setEmailSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const renderToggleItem = (
    setting: NotificationSetting,
    onToggle: (id: string) => void
  ) => (
    <View key={setting.id} style={styles.toggleItem}>
      <View style={[styles.menuIcon, { backgroundColor: setting.iconBg }]}>
        <Ionicons name={setting.icon} size={20} color={setting.iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{setting.title}</Text>
        <Text style={styles.menuSubtitle}>{setting.subtitle}</Text>
      </View>
      <Switch
        value={setting.enabled}
        onValueChange={() => onToggle(setting.id)}
        trackColor={{ false: '#E1E8ED', true: '#3498DB' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <ScreenContainer
      title="Notifications"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      {/* Push Notifications */}
      <Text style={styles.sectionTitle}>Push Notifications</Text>
      <View style={styles.card}>
        {pushSettings.map(setting => renderToggleItem(setting, togglePushSetting))}
      </View>

      {/* Email Notifications */}
      <Text style={styles.sectionTitle}>Email Notifications</Text>
      <View style={styles.card}>
        {emailSettings.map(setting => renderToggleItem(setting, toggleEmailSetting))}
      </View>

      {/* Info Note */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#7F8C8D" />
        <Text style={styles.infoText}>
          You'll always receive important account and security notifications regardless of these settings.
        </Text>
      </View>
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
  toggleItem: {
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
});

export default NotificationsScreen;
