import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DesignSystem } from '../../theme/DesignSystem';

export interface ScreenContainerProps {
  children: React.ReactNode;
  // Header options
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  headerStyle?: 'default' | 'transparent' | 'primary';
  // Content options
  scrollable?: boolean;
  padded?: boolean;
  backgroundColor?: string;
  // Pull to refresh
  refreshing?: boolean;
  onRefresh?: () => void;
  // Keyboard handling
  keyboardAware?: boolean;
  // Bottom button area
  bottomContent?: React.ReactNode;
  // Custom styles
  contentStyle?: ViewStyle;
  // User role theming
  userRole?: 'landlord' | 'tenant';
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  headerRight,
  headerStyle = 'default',
  scrollable = true,
  padded = true,
  backgroundColor,
  refreshing = false,
  onRefresh,
  keyboardAware = false,
  bottomContent,
  contentStyle,
  userRole = 'landlord',
}) => {

  // Theme colors based on user role
  const themeColor = userRole === 'tenant' ? '#2ECC71' : '#3498DB';

  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    return DesignSystem.colors.surfaceSecondary;
  };

  const getHeaderBackgroundColor = () => {
    switch (headerStyle) {
      case 'transparent':
        return 'transparent';
      case 'primary':
        return themeColor;
      default:
        return DesignSystem.colors.background;
    }
  };

  const getHeaderTextColor = () => {
    switch (headerStyle) {
      case 'primary':
        return '#FFFFFF';
      default:
        return DesignSystem.colors.text;
    }
  };

  const renderHeader = () => {
    if (!title && !showBackButton && !headerRight) return null;

    const headerBgColor = getHeaderBackgroundColor();
    const headerTextColor = getHeaderTextColor();

    return (
      <View
        style={[
          styles.header,
          {
            backgroundColor: headerBgColor,
            borderBottomColor: headerStyle === 'transparent' ? 'transparent' : '#E1E8ED',
          },
        ]}
      >
        <View style={styles.headerContent}>
          {/* Left side - Back button (absolute positioned) */}
          <View style={styles.headerLeft}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={headerTextColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Center - Title (centered) */}
          <View style={styles.titleContainer}>
            {title && (
              <Text style={[styles.title, { color: headerTextColor }]} numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: headerTextColor + '99' }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Right side - Header right (absolute positioned) */}
          <View style={styles.headerRightContainer}>
            {headerRight}
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    const contentPadding = padded ? styles.paddedContent : undefined;

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[contentPadding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[themeColor]}
                tintColor={themeColor}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={[styles.content, contentPadding, contentStyle]}>
        {children}
      </View>
    );
  };

  const mainContent = (
    <>
      {renderHeader()}
      {renderContent()}
      {bottomContent && (
        <View style={styles.bottomContainer}>
          {bottomContent}
        </View>
      )}
    </>
  );

  const containerStyle = [
    styles.container,
    { backgroundColor: getBackgroundColor() },
  ];

  if (keyboardAware) {
    return (
      <SafeAreaView style={containerStyle} edges={['top']}>
        <StatusBar
          barStyle={headerStyle === 'primary' ? 'light-content' : 'dark-content'}
        />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {mainContent}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={['top']}>
      <StatusBar
        barStyle={headerStyle === 'primary' ? 'light-content' : 'dark-content'}
      />
      {mainContent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DesignSystem.spacing.xl,
    paddingVertical: DesignSystem.spacing.lg,
    minHeight: 60,
    position: 'relative',
  },
  headerLeft: {
    position: 'absolute',
    left: DesignSystem.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 50, // Space for back button and right content
  },
  title: {
    fontSize: DesignSystem.typography.fontSize.title2,
    fontWeight: DesignSystem.typography.fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: DesignSystem.typography.fontSize.subheadline,
    marginTop: 2,
    textAlign: 'center',
  },
  headerRightContainer: {
    position: 'absolute',
    right: DesignSystem.spacing.xl,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  paddedContent: {
    paddingHorizontal: DesignSystem.spacing.xl,
    paddingVertical: DesignSystem.spacing.lg,
  },
  bottomContainer: {
    backgroundColor: DesignSystem.colors.background,
    paddingHorizontal: DesignSystem.spacing.lg,
    paddingVertical: DesignSystem.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
});

export default ScreenContainer;
