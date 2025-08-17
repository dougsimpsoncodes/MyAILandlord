import { ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

// Touch target optimization (Apple HIG: 44pt, Material: 48dp, but scale for large screens)
export const getOptimalTouchTarget = (screenSize: string): number => {
  switch (screenSize) {
    case 'mobile': return 44;
    case 'tablet': return 46;
    case 'desktop': return 48;
    case 'large': return 50;
    case 'xl': return 52;
    case 'xxl': return 53;
    default: return 44;
  }
};

// Optimal line length for readability (45-75 characters)
export const getOptimalLineLength = (fontSize: number): number => {
  const avgCharWidth = fontSize * 0.6; // Approximate character width
  const optimalChars = 65; // Sweet spot for readability
  return Math.round(optimalChars * avgCharWidth);
};

// Image quality based on display density and screen size
export const getOptimalImageQuality = (screenSize: string): number => {
  switch (screenSize) {
    case 'mobile': return 0.8;
    case 'tablet': return 0.85;
    case 'desktop': return 0.9;
    case 'large':
    case 'xl':
    case 'xxl': return 0.95; // Higher quality for large displays
    default: return 0.8;
  }
};

// Responsive shadow styles that scale appropriately
export const getResponsiveShadow = (screenSize: string, elevation: 'low' | 'medium' | 'high' = 'medium'): ViewStyle => {
  const baseElevation = elevation === 'low' ? 1 : elevation === 'medium' ? 2 : 4;
  const scale = screenSize === 'mobile' ? 1 : screenSize === 'tablet' ? 1.2 : 1.5;
  
  return {
    
    
    
    
    elevation: Math.round(baseElevation * scale),
  };
};

// Responsive border radius that scales with screen size
export const getResponsiveBorderRadius = (screenSize: string, size: 'small' | 'medium' | 'large' = 'medium'): number => {
  const baseRadius = size === 'small' ? 8 : size === 'medium' ? 12 : 20;
  const scale = screenSize === 'mobile' ? 1 : screenSize === 'tablet' ? 1.1 : 1.2;
  
  return Math.round(baseRadius * scale);
};

// Calculate optimal number of columns for a grid based on content type
export const getOptimalGridColumns = (
  screenWidth: number,
  contentType: 'cards' | 'list' | 'tiles' | 'dashboard' = 'cards'
): number => {
  const minWidths = {
    cards: 280,
    list: 320,
    tiles: 200,
    dashboard: 400,
  };

  const minWidth = minWidths[contentType];
  const maxColumns = {
    cards: 4,
    list: 3,
    tiles: 6,
    dashboard: 3,
  };

  const possibleColumns = Math.floor(screenWidth / minWidth);
  return Math.min(possibleColumns, maxColumns[contentType]);
};

// Responsive typography with WCAG compliance
export const getFluidTypography = (
  baseSize: number,
  screenSize: string,
  scaleFactor: number = 1.2
): { fontSize: number; lineHeight: number } => {
  const scale = 
    screenSize === 'xxl' ? scaleFactor * 1.4 :
    screenSize === 'xl' ? scaleFactor * 1.3 :
    screenSize === 'large' ? scaleFactor * 1.2 :
    screenSize === 'desktop' ? scaleFactor * 1.1 :
    scaleFactor;

  const fontSize = Math.max(16, Math.round(baseSize * scale)); // WCAG minimum 16px
  const lineHeight = fontSize * 1.4; // WCAG recommended line height

  return { fontSize, lineHeight };
};

// Responsive spacing system
export const getResponsiveSpacing = (
  baseSpacing: number,
  screenSize: string,
  type: 'padding' | 'margin' | 'gap' = 'padding'
): number => {
  const multipliers = {
    mobile: 1,
    tablet: 1.2,
    desktop: 1.4,
    large: 1.6,
    xl: 1.8,
    xxl: 2.0,
  };

  const typeAdjustment = type === 'gap' ? 0.8 : type === 'margin' ? 1.1 : 1;
  return Math.round(baseSpacing * (multipliers[screenSize as keyof typeof multipliers] || 1) * typeAdjustment);
};

// Create responsive style objects
export const createResponsiveStyles = <T extends Record<string, any>>(
  styleCreator: (responsive: ReturnType<typeof useResponsive>) => T
) => {
  return (responsive: ReturnType<typeof useResponsive>) => styleCreator(responsive);
};

// Breakpoint media queries for web (React Native Web)
export const getMediaQuery = (breakpoint: keyof typeof import('../hooks/useResponsive').BREAKPOINTS): string => {
  const breakpoints = {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    large: 1440,
    xl: 1920,
    xxl: 2560,
  };

  return `@media (min-width: ${breakpoints[breakpoint]}px)`;
};

// Responsive container widths with optimal reading lengths
export const getOptimalContentWidth = (contentType: 'text' | 'form' | 'dashboard' | 'full'): number => {
  switch (contentType) {
    case 'text': return 700; // Optimal for reading
    case 'form': return 500; // Comfortable for form completion
    case 'dashboard': return 1400; // Good for data visualization
    case 'full': return 1600; // Maximum for complex interfaces
    default: return 1200;
  }
};

export default {
  getOptimalTouchTarget,
  getOptimalLineLength,
  getOptimalImageQuality,
  getResponsiveShadow,
  getResponsiveBorderRadius,
  getOptimalGridColumns,
  getFluidTypography,
  getResponsiveSpacing,
  createResponsiveStyles,
  getMediaQuery,
  getOptimalContentWidth,
};