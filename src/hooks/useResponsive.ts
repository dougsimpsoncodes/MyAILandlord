import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

// Enhanced breakpoint definitions for large screen support
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  large: 1440,     // Large desktop displays
  xl: 1920,        // 4K and ultra-wide displays
  xxl: 2560,       // 40"+ professional displays
} as const;

// Container max-widths for different screen sizes
export const CONTAINER_WIDTHS = {
  mobile: '100%',
  tablet: 768,
  desktop: 1200,
  large: 1400,     // Optimal for complex dashboards
  xl: 1600,        // Maximum for data-heavy interfaces
  xxl: 1600,       // Cap at 1600px even on massive displays
} as const;

// Grid system for different screen sizes
export const GRID_COLUMNS = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  large: 4,
  xl: 5,
  xxl: 6,
} as const;

// Enhanced font scales with large screen support and accessibility considerations
export const FONT_SCALES = {
  // Display text for hero sections
  display: {
    mobile: 28,
    tablet: 32,
    desktop: 36,
    large: 40,
    xl: 44,
    xxl: 48,
  },
  // Page titles
  title: {
    mobile: 22,
    tablet: 24,
    desktop: 28,
    large: 30,
    xl: 32,
    xxl: 34,
  },
  // Section headings
  subtitle: {
    mobile: 18,
    tablet: 20,
    desktop: 22,
    large: 24,
    xl: 24,
    xxl: 26,
  },
  // Card titles and important labels
  heading: {
    mobile: 16,
    tablet: 17,
    desktop: 18,
    large: 20,
    xl: 20,
    xxl: 22,
  },
  // Main body text (WCAG recommends 16px minimum)
  body: {
    mobile: 16,
    tablet: 16,
    desktop: 17,
    large: 18,
    xl: 18,
    xxl: 19,
  },
  // Secondary text
  small: {
    mobile: 14,
    tablet: 14,
    desktop: 15,
    large: 16,
    xl: 16,
    xxl: 17,
  },
  // Captions and metadata
  caption: {
    mobile: 12,
    tablet: 13,
    desktop: 14,
    large: 14,
    xl: 15,
    xxl: 15,
  },
} as const;

// Enhanced spacing scales for large screens
export const SPACING = {
  // Main container padding
  screenPadding: {
    mobile: 16,
    tablet: 24,
    desktop: 32,
    large: 40,
    xl: 48,
    xxl: 56,
  },
  // Card internal padding
  cardPadding: {
    mobile: 16,
    tablet: 20,
    desktop: 24,
    large: 28,
    xl: 32,
    xxl: 36,
  },
  // Element spacing
  gap: {
    mobile: 8,
    tablet: 12,
    desktop: 16,
    large: 20,
    xl: 24,
    xxl: 28,
  },
  // Section spacing
  section: {
    mobile: 24,
    tablet: 32,
    desktop: 40,
    large: 48,
    xl: 56,
    xxl: 64,
  },
  // Grid gaps
  gridGap: {
    mobile: 12,
    tablet: 16,
    desktop: 20,
    large: 24,
    xl: 28,
    xxl: 32,
  },
} as const;

// Screen size type for better type safety
type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'large' | 'xl' | 'xxl';

// Enhanced responsive options interface
interface ResponsiveOptions<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  large?: T;
  xl?: T;
  xxl?: T;
  default: T;
}

interface ResponsiveValues {
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  isXL: boolean;
  isXXL: boolean;
  screenWidth: number;
  screenHeight: number;
  screenSize: ScreenSize;
  fontSize: typeof FONT_SCALES;
  spacing: typeof SPACING;
  containerWidths: typeof CONTAINER_WIDTHS;
  // Enhanced helper functions
  select: <T>(options: ResponsiveOptions<T>) => T;
  gridColumns: (mobile: number, tablet?: number, desktop?: number, large?: number, xl?: number, xxl?: number) => number;
  maxWidth: (preset?: keyof typeof CONTAINER_WIDTHS) => { maxWidth?: number | string; marginHorizontal?: string | number };
  // New utility functions
  getOptimalColumns: (minItemWidth: number) => number;
  getFluidFontSize: (baseSize: number, scaleFactor?: number) => number;
  isLargeScreen: () => boolean;
}

export const useResponsive = (): ResponsiveValues => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  const { width: screenWidth, height: screenHeight } = dimensions;
  
  const isWeb = Platform.OS === 'web';
  const isMobile = screenWidth < BREAKPOINTS.tablet;
  const isTablet = screenWidth >= BREAKPOINTS.tablet && screenWidth < BREAKPOINTS.desktop;
  const isDesktop = screenWidth >= BREAKPOINTS.desktop && screenWidth < BREAKPOINTS.large;
  const isLarge = screenWidth >= BREAKPOINTS.large && screenWidth < BREAKPOINTS.xl;
  const isXL = screenWidth >= BREAKPOINTS.xl && screenWidth < BREAKPOINTS.xxl;
  const isXXL = screenWidth >= BREAKPOINTS.xxl;

  // Determine current screen size
  const screenSize: ScreenSize = 
    isXXL ? 'xxl' :
    isXL ? 'xl' :
    isLarge ? 'large' :
    isDesktop ? 'desktop' :
    isTablet ? 'tablet' : 'mobile';

  // Enhanced responsive value selector
  const select = <T,>(options: ResponsiveOptions<T>): T => {
    if (isXXL && options.xxl !== undefined) return options.xxl;
    if (isXL && options.xl !== undefined) return options.xl;
    if (isLarge && options.large !== undefined) return options.large;
    if (isDesktop && options.desktop !== undefined) return options.desktop;
    if (isTablet && options.tablet !== undefined) return options.tablet;
    if (isMobile && options.mobile !== undefined) return options.mobile;
    return options.default;
  };

  // Enhanced grid columns helper
  const gridColumns = (
    mobile: number, 
    tablet?: number, 
    desktop?: number, 
    large?: number, 
    xl?: number, 
    xxl?: number
  ): number => {
    if (isXXL && xxl) return xxl;
    if (isXL && xl) return xl;
    if (isLarge && large) return large;
    if (isDesktop && desktop) return desktop;
    if (isTablet && tablet) return tablet;
    return mobile;
  };

  // Enhanced container max-width helper with presets
  const maxWidth = (preset: keyof typeof CONTAINER_WIDTHS = 'desktop') => {
    if (!isWeb || isMobile) return {};
    
    const width = CONTAINER_WIDTHS[preset];
    
    return {
      maxWidth: width,
      marginHorizontal: 'auto' as const,
    };
  };

  // Get optimal number of columns based on minimum item width
  const getOptimalColumns = (minItemWidth: number): number => {
    const availableWidth = Math.min(screenWidth, CONTAINER_WIDTHS[screenSize as keyof typeof CONTAINER_WIDTHS] as number);
    const columnsWithGaps = Math.floor(availableWidth / (minItemWidth + SPACING.gridGap[screenSize]));
    return Math.max(1, Math.min(columnsWithGaps, GRID_COLUMNS[screenSize]));
  };

  // Calculate fluid font size with scale factor for large screens
  const getFluidFontSize = (baseSize: number, scaleFactor: number = 1.2): number => {
    const scale = isXXL ? scaleFactor * 1.4 :
                  isXL ? scaleFactor * 1.3 :
                  isLarge ? scaleFactor * 1.2 :
                  isDesktop ? scaleFactor * 1.1 :
                  scaleFactor;
    return Math.round(baseSize * scale);
  };

  // Check if current screen is considered "large"
  const isLargeScreen = (): boolean => {
    return isLarge || isXL || isXXL;
  };

  return {
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    isXL,
    isXXL,
    screenWidth,
    screenHeight,
    screenSize,
    fontSize: FONT_SCALES,
    spacing: SPACING,
    containerWidths: CONTAINER_WIDTHS,
    select,
    gridColumns,
    maxWidth,
    getOptimalColumns,
    getFluidFontSize,
    isLargeScreen,
  };
};

// Type-safe style helper
export const responsiveStyles = <T extends Record<string, any>>(
  createStyles: (responsive: ResponsiveValues) => T
) => {
  return (responsive: ResponsiveValues) => createStyles(responsive);
};