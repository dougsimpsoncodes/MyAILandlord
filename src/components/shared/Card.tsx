import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { DesignSystem } from '../../theme/DesignSystem';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  backgroundColor?: string;
}

export default function Card({ 
  children, 
  style, 
  elevation = 'sm',
  padding = 'lg',
  backgroundColor = DesignSystem.colors.background
}: CardProps) {
  
  const paddingStyles = {
    none: 0,
    sm: DesignSystem.spacing.sm,
    md: DesignSystem.spacing.md,
    lg: DesignSystem.spacing.lg
  };

  return (
    <View
      style={[
        {
          backgroundColor,
          padding: paddingStyles[padding],
          borderRadius: DesignSystem.radius.md,
          ...DesignSystem.elevation[elevation]
        },
        style
      ]}
    >
      {children}
    </View>
  );
}