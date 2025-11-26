import React from 'react';
import { Platform, TouchableOpacity, Text, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteButtonProps {
  onDelete: () => void;
  itemName: string;
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function DeleteButton({ 
  onDelete, 
  itemName, 
  iconOnly = false,
  style 
}: DeleteButtonProps) {

  return (
    <TouchableOpacity
      accessibilityLabel={`Delete ${itemName}`}
      accessibilityRole="button"
      accessibilityHint={`Deletes the ${itemName}`}
      onPress={onDelete}
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
  );
}
