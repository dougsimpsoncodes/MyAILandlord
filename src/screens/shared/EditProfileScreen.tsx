import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useProfile } from '../../context/ProfileContext';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, refreshUser, updateProfile } = useUnifiedAuth();
  const { refreshProfile, updateProfileCache } = useProfile();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmStyle?: 'default' | 'destructive' | 'info';
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const showNotification = (title: string, msg: string, style: 'default' | 'destructive' | 'info' = 'info', onConfirm?: () => void) => {
    setDialogConfig({
      visible: true,
      title,
      message: msg,
      confirmStyle: style,
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        onConfirm?.();
      },
    });
  };

  const getInitials = () => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showNotification('Error', 'Name is required', 'destructive');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined
      });
      // Update local cache immediately for instant UI update
      updateProfileCache({ name: name.trim() });
      // Refresh UnifiedAuth (ProfileScreen uses this) and ProfileContext
      await refreshUser();
      await refreshProfile();
      setIsSaving(false);
      showNotification('Success', 'Profile updated successfully', 'default', () => navigation.goBack());
    } catch (error) {
      setIsSaving(false);
      showNotification('Error', 'Failed to update profile', 'destructive');
    }
  };

  return (
    <ScreenContainer
      title="Edit Profile"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <TouchableOpacity style={styles.changePhotoBtn}>
            <Ionicons name="camera-outline" size={18} color="#3498DB" />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#95A5A6"
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.disabledInput}>
            <Text style={styles.disabledText}>{user?.email || ''}</Text>
            <Ionicons name="lock-closed" size={16} color="#95A5A6" />
          </View>
          <Text style={styles.helperText}>Email cannot be changed</Text>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            placeholderTextColor="#95A5A6"
            keyboardType="phone-pad"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmStyle={dialogConfig.confirmStyle}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changePhotoText: {
    fontSize: 15,
    color: '#3498DB',
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: DesignSystem.colors.text,
  },
  disabledInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 16,
    color: '#95A5A6',
  },
  helperText: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditProfileScreen;
