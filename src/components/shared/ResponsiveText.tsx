import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useResponsive, FONT_SCALES } from '../../hooks/useResponsive';

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: keyof typeof FONT_SCALES;
  style?: TextStyle;
  fluid?: boolean;
  scaleFactor?: number;
  numberOfLines?: number;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  style,
  fluid = false,
  scaleFactor = 1.0,
  numberOfLines,
}) => {
  const responsive = useResponsive();
  
  const baseFontSize = responsive.fontSize[variant][responsive.screenSize];
  const fontSize = fluid 
    ? responsive.getFluidFontSize(baseFontSize, scaleFactor)
    : baseFontSize;

  const textStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize * 1.4, // WCAG recommended line height
    ...style,
  };

  return <Text style={textStyle} numberOfLines={numberOfLines}>{children}</Text>;
};

// Convenient pre-configured text components
export const ResponsiveTitle: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="title" {...props} />
);

export const ResponsiveSubtitle: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="subtitle" {...props} />
);

export const ResponsiveHeading: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="heading" {...props} />
);

export const ResponsiveBody: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="body" {...props} />
);

export const ResponsiveCaption: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="caption" {...props} />
);

export default ResponsiveText;