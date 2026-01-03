import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnifiedAuth } from '../context/UnifiedAuthContext';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from '../components/shared/ConfirmDialog';

/**
 * Quick role switcher for testing purposes
 * Add this screen to your navigation to easily switch between tenant and landlord
 */
const QuickRoleSwitch = () => {
  const { user } = useUnifiedAuth();
  const userRole = user?.role;

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

  const handleRoleSwitch = async (role: 'tenant' | 'landlord') => {
    // Role switching now requires database profile update via API
    showNotification(
      'Feature Unavailable',
      'Role switching requires account reconfiguration through the API. This dev tool is temporarily disabled.',
      'info'
    );
  };

  const handleClearRole = async () => {
    // Role clearing now requires sign out (handled by UnifiedAuth)
    showNotification(
      'Feature Unavailable',
      'Use the sign out button to clear your session. This dev tool is temporarily disabled.',
      'info'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Role Switcher</Text>
        <Text style={styles.subtitle}>For Testing Purposes</Text>
      </View>

      <View style={styles.currentRole}>
        <Text style={styles.currentRoleLabel}>Current Role:</Text>
        <View style={[styles.roleBadge, userRole === 'landlord' && styles.landlordBadge]}>
          <Ionicons 
            name={userRole === 'tenant' ? 'person' : 'business'} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.roleText}>{userRole || 'Not Set'}</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.tenantButton, userRole === 'tenant' && styles.activeButton]}
          onPress={() => handleRoleSwitch('tenant')}
          disabled={userRole === 'tenant'}
        >
          <Ionicons name="person" size={24} color="#fff" />
          <Text style={styles.buttonText}>Switch to Tenant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.landlordButton, userRole === 'landlord' && styles.activeButton]}
          onPress={() => handleRoleSwitch('landlord')}
          disabled={userRole === 'landlord'}
        >
          <Ionicons name="business" size={24} color="#fff" />
          <Text style={styles.buttonText}>Switch to Landlord</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearRole}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.buttonText}>Clear Role</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          Switching roles will immediately change the app's navigation and features.
          The app will reload with the selected role's interface.
        </Text>
      </View>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmStyle={dialogConfig.confirmStyle}
        onConfirm={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
        onCancel={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  currentRole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  currentRoleLabel: {
    fontSize: 16,
    color: '#666',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  landlordBadge: {
    backgroundColor: '#34495E',
  },
  roleText: {
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  buttons: {
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  tenantButton: {
    backgroundColor: '#007AFF',
  },
  landlordButton: {
    backgroundColor: '#34495E',
  },
  clearButton: {
    backgroundColor: '#95a5a6',
    marginTop: 12,
  },
  activeButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default QuickRoleSwitch;