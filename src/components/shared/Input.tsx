import React from 'react';
import { TextInput, View, Text, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { DesignSystem } from '../../theme/DesignSystem';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  required?: boolean;
}

export default function Input({ 
  label, 
  error,
  containerStyle,
  style,
  required = false,
  ...textInputProps 
}: InputProps) {
  return (
    <View style={[{ marginBottom: DesignSystem.spacing.lg }, containerStyle]}>
      {label && (
        <Text style={{
          fontSize: DesignSystem.typography.fontSize.md,
          fontWeight: DesignSystem.typography.fontWeight.semibold,
          color: DesignSystem.colors.text,
          marginBottom: DesignSystem.spacing.sm
        }}>
          {label}
          {required && <Text style={{ color: DesignSystem.colors.danger }}> *</Text>}
        </Text>
      )}
      <TextInput
        {...textInputProps}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? DesignSystem.colors.danger : DesignSystem.colors.border,
            borderRadius: DesignSystem.radius.md,
            paddingVertical: DesignSystem.spacing.md,
            paddingHorizontal: DesignSystem.spacing.lg,
            backgroundColor: DesignSystem.colors.background,
            fontSize: DesignSystem.typography.fontSize.md,
            color: DesignSystem.colors.text,
            minHeight: 50,
            ...DesignSystem.elevation.sm
          },
          style
        ]}
        placeholderTextColor={DesignSystem.colors.textSubtle}
      />
      {error && (
        <Text style={{
          fontSize: DesignSystem.typography.fontSize.sm,
          color: DesignSystem.colors.danger,
          marginTop: DesignSystem.spacing.xs
        }}>
          {error}
        </Text>
      )}
    </View>
  );
}