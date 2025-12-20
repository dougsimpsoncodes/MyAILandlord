export const DesignSystem = {
  colors: {
    // Primary brand colors
    primary: '#007AFF',
    primaryText: '#FFFFFF',

    // Secondary colors
    secondary: '#E0E0E0',
    secondaryText: '#333333',

    // State colors
    success: '#2ECC71',
    successText: '#FFFFFF',
    warning: '#F39C12',
    warningText: '#FFFFFF',
    danger: '#E74C3C',
    dangerText: '#FFFFFF',

    // Property management specific colors
    draft: '#3498DB',
    draftText: '#FFFFFF',
    completed: '#2ECC71',
    completedText: '#FFFFFF',

    // Surface colors
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceSecondary: '#F5F7FA',
    border: '#E9ECEF',
    borderLight: '#F8F9FA',

    // Text colors
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textSubtle: '#8E8E93',
    textDisabled: '#BDC3C7'
  },

  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6
    }
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },

  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16
  },

  elevation: {
    none: {
      
      
      elevation: 0,
    },
    sm: {
      
      
      
      
      elevation: 2,
    },
    md: {
      
      
      
      
      elevation: 4,
    },
    lg: {
      
      
      
      
      elevation: 8,
    }
  }
};

// Named exports for convenient imports
// These provide a more structured API for colors, spacing, and typography

export const colors = {
  primary: {
    default: '#007AFF',
    light: '#4DA3FF',
    dark: '#0056B3',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F0F2F5',
  },
  text: {
    primary: '#2C3E50',
    secondary: '#7F8C8D',
    tertiary: '#95A5A6',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E9ECEF',
    light: '#F8F9FA',
  },
  status: {
    success: '#2ECC71',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#3498DB',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Helper functions for consistent styling
export const createButtonStyle = (type: 'primary' | 'secondary' | 'danger' | 'success' | 'warning') => {
  const colorMap = {
    primary: { bg: DesignSystem.colors.primary, text: DesignSystem.colors.primaryText },
    secondary: { bg: DesignSystem.colors.secondary, text: DesignSystem.colors.secondaryText },
    danger: { bg: DesignSystem.colors.danger, text: DesignSystem.colors.dangerText },
    success: { bg: DesignSystem.colors.success, text: DesignSystem.colors.successText },
    warning: { bg: DesignSystem.colors.warning, text: DesignSystem.colors.warningText }
  };
  
  return {
    backgroundColor: colorMap[type].bg,
    color: colorMap[type].text
  };
};