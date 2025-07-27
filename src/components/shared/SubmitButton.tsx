import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  leftIcon,
  rightIcon,
  fullWidth = true,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    if (fullWidth) baseStyle.push(styles.fullWidth);
    
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    } else {
      switch (variant) {
        case 'secondary':
          baseStyle.push(styles.buttonSecondary);
          break;
        case 'success':
          baseStyle.push(styles.buttonSuccess);
          break;
        case 'warning':
          baseStyle.push(styles.buttonWarning);
          break;
        case 'danger':
          baseStyle.push(styles.buttonDanger);
          break;
        default:
          baseStyle.push(styles.buttonPrimary);
      }
    }
    
    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.text];
    
    switch (size) {
      case 'small':
        baseStyle.push(styles.textSmall);
        break;
      case 'large':
        baseStyle.push(styles.textLarge);
        break;
      default:
        baseStyle.push(styles.textMedium);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.textDisabled);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.textSecondary);
    } else {
      baseStyle.push(styles.textPrimary);
    }
    
    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    if (disabled || loading) return '#FFFFFF';
    if (variant === 'secondary') return '#007AFF';
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            {leftIcon && (
              <Ionicons 
                name={leftIcon as any} 
                size={getIconSize()} 
                color={getIconColor()}
                style={styles.leftIcon}
              />
            )}
            <Text style={getTextStyle()}>{title}</Text>
            {rightIcon && (
              <Ionicons 
                name={rightIcon as any} 
                size={getIconSize()} 
                color={getIconColor()}
                style={styles.rightIcon}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44, // iOS minimum touch target
  },
  fullWidth: {
    width: '100%',
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  buttonMedium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF', // iOS Blue
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7', // iOS Light Gray
    borderWidth: 1,
    borderColor: '#C7C7CC',
    shadowOpacity: 0.05,
  },
  buttonSuccess: {
    backgroundColor: '#34C759', // iOS Green
  },
  buttonWarning: {
    backgroundColor: '#FF9500', // iOS Orange
  },
  buttonDanger: {
    backgroundColor: '#FF3B30', // iOS Red
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC', // iOS Disabled Gray
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.4, // iOS-style letter spacing
  },
  textSmall: {
    fontSize: 15,
  },
  textMedium: {
    fontSize: 17,
  },
  textLarge: {
    fontSize: 19,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#007AFF',
  },
  textDisabled: {
    color: '#FFFFFF',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

export default SubmitButton;