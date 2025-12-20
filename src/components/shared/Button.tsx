import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, Platform, Pressable, Animated, Easing, GestureResponderEvent } from 'react-native';
import { DesignSystem } from '../../theme/DesignSystem';
import { haptics } from '../../lib/haptics';

export interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: object;
  textStyle?: object;
}

export default function Button({
  title,
  onPress,
  type = 'primary',
  size = 'md',
  accessibilityLabel,
  accessibilityHint,
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style = {},
  textStyle = {}
}: ButtonProps) {
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const handlePress = (event: GestureResponderEvent) => {
    if (!disabled && !loading && onPress) {
      // Haptic feedback based on button type
      if (type === 'danger') {
        haptics.warning();
      } else if (type === 'success') {
        haptics.success();
      } else {
        haptics.medium();
      }
      onPress(event);
    }
  };

  const backgroundColors: Record<string, string> = {
    primary: DesignSystem.colors.primary,
    secondary: DesignSystem.colors.secondary,
    danger: DesignSystem.colors.danger,
    success: DesignSystem.colors.success,
    warning: DesignSystem.colors.warning
  };

  const textColors: Record<string, string> = {
    primary: DesignSystem.colors.primaryText,
    secondary: DesignSystem.colors.secondaryText,
    danger: DesignSystem.colors.dangerText,
    success: DesignSystem.colors.successText,
    warning: DesignSystem.colors.warningText
  };

  const sizeStyles = {
    sm: {
      paddingVertical: DesignSystem.spacing.sm,
      paddingHorizontal: DesignSystem.spacing.md,
      fontSize: DesignSystem.typography.fontSize.sm,
      minHeight: 36
    },
    md: {
      paddingVertical: DesignSystem.spacing.md,
      paddingHorizontal: DesignSystem.spacing.lg,
      fontSize: DesignSystem.typography.fontSize.md,
      minHeight: 44
    },
    lg: {
      paddingVertical: DesignSystem.spacing.lg,
      paddingHorizontal: DesignSystem.spacing.xl,
      fontSize: DesignSystem.typography.fontSize.lg,
      minHeight: 50
    }
  };

  const handlePressIn = () => {
    if (Platform.OS !== 'android' && !disabled) {
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS!=="web"
      }).start();
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'android' && !disabled) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS!=="web"
      }).start();
    }
  };

  const ButtonContent = () => (
    <>
      {loading && (
        <ActivityIndicator 
          size="small" 
          color={textColors[type]} 
          style={{ marginRight: icon || title ? DesignSystem.spacing.sm : 0 }} 
        />
      )}
      {icon && !loading && (
        <View style={{ marginRight: title ? DesignSystem.spacing.sm : 0 }}>
          {icon}
        </View>
      )}
      {title && (
        <Text 
          style={[
            {
              color: textColors[type],
              fontWeight: DesignSystem.typography.fontWeight.semibold,
              fontSize: sizeStyles[size].fontSize,
              letterSpacing: -0.2
            },
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </>
  );

  const baseStyles = {
    backgroundColor: backgroundColors[type],
    paddingVertical: sizeStyles[size].paddingVertical,
    paddingHorizontal: sizeStyles[size].paddingHorizontal,
    borderRadius: DesignSystem.radius.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    minHeight: sizeStyles[size].minHeight,
    ...DesignSystem.elevation.sm
  };

  if (Platform.OS === 'android') {
    return (
      <Pressable
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[baseStyles, style]}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
      >
        <ButtonContent />
      </Pressable>
    );
  }

  return (
    <Animated.View style={{ 
      transform: [{ scale: scaleAnim }], 
      width: fullWidth ? '100%' : undefined 
    }}>
      <TouchableOpacity
        activeOpacity={type === 'primary' ? 0.8 : 0.7}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[baseStyles, style]}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
      >
        <ButtonContent />
      </TouchableOpacity>
    </Animated.View>
  );
}