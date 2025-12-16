import React, { useState } from 'react';
import { Platform, TouchableOpacity, Text, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from './ConfirmDialog';

interface DeleteButtonProps {
  onDelete: () => void;
  itemName: string;
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Skip confirmation dialog (default: false) */
  skipConfirmation?: boolean;
}

export default function DeleteButton({
  onDelete,
  itemName,
  iconOnly = false,
  style,
  skipConfirmation = false,
}: DeleteButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePress = () => {
    if (skipConfirmation) {
      onDelete();
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = () => {
    setShowConfirmDialog(false);
    onDelete();
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`Delete ${itemName}`}
        accessibilityRole="button"
        accessibilityHint={`Deletes the ${itemName}`}
        onPress={handlePress}
        style={[
          {
            backgroundColor: '#FFE5E5',
            padding: iconOnly ? 8 : 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#FFB8B8',
            minWidth: iconOnly ? 36 : undefined,
            minHeight: iconOnly ? 36 : undefined,
            alignItems: 'center',
            justifyContent: 'center',
            ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
          },
          style
        ]}
        activeOpacity={0.7}
      >
        {iconOnly ? (
          <Ionicons name="trash-outline" size={20} color="#E74C3C" />
        ) : (
          <Text style={{ color: '#E74C3C', fontWeight: 'bold' }}>Delete</Text>
        )}
      </TouchableOpacity>

      <ConfirmDialog
        visible={showConfirmDialog}
        title="Delete"
        message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </>
  );
}
