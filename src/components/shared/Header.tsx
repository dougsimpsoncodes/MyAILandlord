import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBackPress,
  rightComponent,
  backgroundColor = '#FFFFFF',
  titleColor = '#2C3E50',
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {onBackPress && (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={24} color={titleColor} />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: titleColor + '80' }]}>
              {subtitle}
            </Text>
          )}
        </View>
        
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  rightSection: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});

export default Header;