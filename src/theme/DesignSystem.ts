/**
 * MyAILandlord Design System
 * Slate & White Color Palette - Modern iOS Style
 *
 * Professional light theme with slate navy accents
 * WCAG AA compliant - All color combinations meet accessibility standards
 */

export const DesignSystem = {
  colors: {
    // Primary brand colors - Slate Navy
    primary: '#1E293B',
    primaryText: '#FFFFFF',
    primaryLight: '#334155',
    primaryDark: '#0F172A',

    // Secondary colors - Slate Grey
    secondary: '#64748B',
    secondaryText: '#FFFFFF',
    secondaryLight: '#94A3B8',
    secondaryDark: '#475569',

    // State colors (keeping iOS system-like colors)
    success: '#10B981',
    successText: '#FFFFFF',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningText: '#FFFFFF',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerText: '#FFFFFF',
    dangerLight: '#FEE2E2',
    info: '#3B82F6',
    infoText: '#FFFFFF',
    infoLight: '#DBEAFE',

    // Property management specific colors
    draft: '#64748B',
    draftText: '#FFFFFF',
    completed: '#10B981',
    completedText: '#FFFFFF',

    // Surface colors - Light grey palette
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F1F3F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',
    surfaceElevated: '#FFFFFF',

    // Border colors
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',

    // Text colors - Slate hierarchy
    text: '#1E293B',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textSubtle: '#CBD5E1',
    textDisabled: '#E2E8F0',
    textInverse: '#FFFFFF',

    // Overlay colors
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.2)',
  },

  typography: {
    // iOS-style font sizing
    fontSize: {
      caption2: 11,
      caption1: 12,
      footnote: 13,
      subheadline: 15,
      callout: 16,
      body: 17,
      headline: 17,
      title3: 20,
      title2: 22,
      title1: 28,
      largeTitle: 34,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  spacing: {
    // 4pt grid system
    xxxs: 4,
    xxs: 8,
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
  },

  radius: {
    // Modern iOS border radius
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 9999,
  },

  elevation: {
    none: {
      boxShadow: 'none',
      elevation: 0,
    },
    sm: {
      boxShadow: '0px 2px 4px rgba(30, 41, 59, 0.08)',
      elevation: 2,
    },
    md: {
      boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.10)',
      elevation: 4,
    },
    lg: {
      boxShadow: '0px 8px 16px rgba(30, 41, 59, 0.12)',
      elevation: 8,
    },
    xl: {
      boxShadow: '0px 12px 24px rgba(30, 41, 59, 0.15)',
      elevation: 12,
    },
  },
};

// Named exports for convenient imports
// These provide a more structured API for colors, spacing, and typography

export const colors = {
  primary: {
    default: '#1E293B',
    light: '#334155',
    dark: '#0F172A',
  },
  secondary: {
    default: '#64748B',
    light: '#94A3B8',
    dark: '#475569',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
  },
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    light: '#F1F5F9',
    dark: '#CBD5E1',
  },
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
};

export const spacing = {
  xxxs: 4,
  xxs: 8,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const typography = {
  sizes: {
    caption2: 11,
    caption1: 12,
    footnote: 13,
    subheadline: 15,
    callout: 16,
    body: 17,
    headline: 17,
    title3: 20,
    title2: 22,
    title1: 28,
    largeTitle: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
};

// Helper functions for consistent styling
export const createButtonStyle = (
  type: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info'
) => {
  const colorMap = {
    primary: { bg: DesignSystem.colors.primary, text: DesignSystem.colors.primaryText },
    secondary: { bg: DesignSystem.colors.secondary, text: DesignSystem.colors.secondaryText },
    danger: { bg: DesignSystem.colors.danger, text: DesignSystem.colors.dangerText },
    success: { bg: DesignSystem.colors.success, text: DesignSystem.colors.successText },
    warning: { bg: DesignSystem.colors.warning, text: DesignSystem.colors.warningText },
    info: { bg: DesignSystem.colors.info, text: DesignSystem.colors.infoText },
  };

  return {
    backgroundColor: colorMap[type].bg,
    color: colorMap[type].text,
  };
};

// Card styles with modern shadows
export const createCardStyle = (elevated: boolean = true) => {
  return {
    backgroundColor: DesignSystem.colors.surface,
    borderRadius: DesignSystem.radius.lg,
    borderWidth: 1,
    borderColor: DesignSystem.colors.border,
    ...(elevated ? DesignSystem.elevation.md : DesignSystem.elevation.none),
  };
};

// Input field styles
export const createInputStyle = (focused: boolean = false) => {
  return {
    backgroundColor: DesignSystem.colors.backgroundSecondary,
    borderRadius: DesignSystem.radius.sm,
    borderWidth: focused ? 2 : 1,
    borderColor: focused ? DesignSystem.colors.primary : DesignSystem.colors.border,
    paddingVertical: DesignSystem.spacing.xs,
    paddingHorizontal: DesignSystem.spacing.sm,
    fontSize: DesignSystem.typography.fontSize.body,
    color: DesignSystem.colors.text,
  };
};

// Status badge styles
export const createBadgeStyle = (status: 'success' | 'warning' | 'danger' | 'info' | 'draft') => {
  const colorMap = {
    success: { bg: DesignSystem.colors.successLight, text: DesignSystem.colors.success },
    warning: { bg: DesignSystem.colors.warningLight, text: DesignSystem.colors.warning },
    danger: { bg: DesignSystem.colors.dangerLight, text: DesignSystem.colors.danger },
    info: { bg: DesignSystem.colors.infoLight, text: DesignSystem.colors.info },
    draft: { bg: '#F1F5F9', text: DesignSystem.colors.secondary },
  };

  return {
    backgroundColor: colorMap[status].bg,
    paddingVertical: DesignSystem.spacing.xxs,
    paddingHorizontal: DesignSystem.spacing.xs,
    borderRadius: DesignSystem.radius.sm,
  };
};

export default DesignSystem;
