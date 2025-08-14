import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  minItemWidth?: number;
  maxColumns?: number;
  style?: ViewStyle;
  itemStyle?: ViewStyle;
  gap?: boolean;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  minItemWidth = 280,
  maxColumns,
  style,
  itemStyle,
  gap = false,
}) => {
  const responsive = useResponsive();
  
  const optimalColumns = maxColumns 
    ? Math.min(responsive.getOptimalColumns(minItemWidth), maxColumns)
    : responsive.getOptimalColumns(minItemWidth);

  const gridGap = responsive.spacing.gridGap[responsive.screenSize];

  const gridStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -gridGap / 2,
    ...style,
  };

  const childArray = React.Children.toArray(children);

  return (
    <View style={gridStyle}>
      {childArray.map((child, index) => {
        const itemWidthPercent = Math.floor((100 / optimalColumns) * 100) / 100; // Round to avoid precision issues
        
        const childStyle: ViewStyle = {
          width: `${itemWidthPercent}%`,
          paddingHorizontal: gridGap / 2,
          marginBottom: gridGap,
          ...itemStyle,
        };

        return (
          <View key={index} style={childStyle}>
            {child}
          </View>
        );
      })}
    </View>
  );
};

export default ResponsiveGrid;