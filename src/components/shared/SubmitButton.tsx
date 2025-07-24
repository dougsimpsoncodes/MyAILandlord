import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
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
  const getButtonStyle = () => {
    const baseStyle: any[] = [styles.button];
    
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

  const getTextStyle = () => {
    const baseStyle: any[] = [styles.text];
    
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
    if (variant === 'secondary') return '#3498DB';
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
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  fullWidth: {
    width: '100%',
  },
  buttonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonMedium: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonLarge: {
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  buttonPrimary: {
    backgroundColor: '#3498DB',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  buttonSuccess: {
    backgroundColor: '#27AE60',
  },
  buttonWarning: {
    backgroundColor: '#F39C12',
  },
  buttonDanger: {
    backgroundColor: '#E74C3C',
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
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
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#3498DB',
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