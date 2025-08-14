import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useResponsive, CONTAINER_WIDTHS } from '../../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: keyof typeof CONTAINER_WIDTHS;
  style?: ViewStyle;
  fullWidth?: boolean;
  padding?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'large',
  style,
  fullWidth = false,
  padding = true,
}) => {
  const responsive = useResponsive();

  const containerStyle = {
    width: '100%',
    ...(responsive.isWeb && !fullWidth ? responsive.maxWidth(maxWidth) : {}),
    ...(padding ? { paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize] as number } : {}),
    ...style,
  } as ViewStyle;

  return <View style={containerStyle}>{children}</View>;
};

export default ResponsiveContainer;