import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  /** If not provided, dialog will show single button (notification mode) */
  cancelText?: string | null;
  confirmStyle?: 'default' | 'destructive' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  confirmStyle = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  // Single button mode when cancelText is not provided
  const isSingleButton = cancelText === undefined || cancelText === null;

  const getIcon = () => {
    switch (confirmStyle) {
      case 'destructive':
        return { name: 'alert-circle' as const, color: '#E74C3C' };
      case 'info':
        return { name: 'information-circle' as const, color: '#3498DB' };
      default:
        return { name: 'checkmark-circle' as const, color: '#27AE60' };
    }
  };

  const icon = getIcon();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={isSingleButton ? onConfirm : onCancel}>
        <Pressable style={styles.dialogContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon.name}
              size={48}
              color={icon.color}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={[styles.buttonContainer, isSingleButton && styles.singleButtonContainer]}>
            {!isSingleButton && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                confirmStyle === 'destructive' && styles.destructiveButton,
                confirmStyle === 'info' && styles.infoButton,
                isSingleButton && styles.fullWidthButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Processing...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F3F4',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5F6368',
  },
  confirmButton: {
    backgroundColor: '#27AE60',
  },
  destructiveButton: {
    backgroundColor: '#E74C3C',
  },
  infoButton: {
    backgroundColor: '#3498DB',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 0,
    minWidth: '60%',
  },
});

export default ConfirmDialog;
