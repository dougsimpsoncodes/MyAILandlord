import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Clipboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';

type PropertyInfoNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'PropertyInfo'>;

interface InfoSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: InfoItem[];
}

interface InfoItem {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'phone' | 'email' | 'wifi' | 'link';
  copyable?: boolean;
}

const PropertyInfoScreen = () => {
  const navigation = useNavigation<PropertyInfoNavigationProp>();

  const infoSections: InfoSection[] = [
    {
      id: 'wifi',
      title: 'WiFi & Internet',
      icon: 'wifi',
      color: '#3498DB',
      items: [
        {
          id: 'wifi-name',
          label: 'Network Name',
          value: 'Apartment_Building_5G',
          type: 'wifi',
          copyable: true,
        },
        {
          id: 'wifi-password',
          label: 'Password',
          value: 'SecurePass2024!',
          type: 'wifi',
          copyable: true,
        },
        {
          id: 'wifi-speed',
          label: 'Speed',
          value: '300 Mbps',
          type: 'text',
        },
      ],
    },
    {
      id: 'utilities',
      title: 'Utilities & Services',
      icon: 'calendar',
      color: '#2ECC71',
      items: [
        {
          id: 'trash-day',
          label: 'Trash Pickup',
          value: 'Tuesdays, 7:00 AM',
          type: 'text',
        },
        {
          id: 'recycling-day',
          label: 'Recycling',
          value: 'Every other Thursday',
          type: 'text',
        },
        {
          id: 'mail-delivery',
          label: 'Mail Delivery',
          value: 'Monday - Saturday, 2:00 PM',
          type: 'text',
        },
        {
          id: 'package-pickup',
          label: 'Package Room',
          value: 'Lobby, code: #4821',
          type: 'text',
          copyable: true,
        },
      ],
    },
    {
      id: 'contacts',
      title: 'Important Contacts',
      icon: 'call',
      color: '#E74C3C',
      items: [
        {
          id: 'landlord-phone',
          label: 'Landlord',
          value: '(555) 123-4567',
          type: 'phone',
        },
        {
          id: 'maintenance',
          label: 'Maintenance Emergency',
          value: '(555) 911-0000',
          type: 'phone',
        },
        {
          id: 'building-manager',
          label: 'Building Manager',
          value: 'manager@building.com',
          type: 'email',
        },
        {
          id: 'leasing-office',
          label: 'Leasing Office',
          value: '(555) 456-7890',
          type: 'phone',
        },
      ],
    },
    {
      id: 'appliances',
      title: 'Appliances & Manuals',
      icon: 'home',
      color: '#9B59B6',
      items: [
        {
          id: 'dishwasher',
          label: 'Dishwasher Manual',
          value: 'Bosch Serie 4 - View Manual',
          type: 'link',
        },
        {
          id: 'washer',
          label: 'Washer/Dryer Manual',
          value: 'LG WashTower - View Manual',
          type: 'link',
        },
        {
          id: 'hvac',
          label: 'Thermostat Guide',
          value: 'Nest Learning - View Guide',
          type: 'link',
        },
        {
          id: 'garbage-disposal',
          label: 'Garbage Disposal',
          value: 'InSinkErator - View Manual',
          type: 'link',
        },
      ],
    },
    {
      id: 'rules',
      title: 'Building Rules & Policies',
      icon: 'document-text',
      color: '#F39C12',
      items: [
        {
          id: 'quiet-hours',
          label: 'Quiet Hours',
          value: '10:00 PM - 8:00 AM',
          type: 'text',
        },
        {
          id: 'guest-policy',
          label: 'Guest Policy',
          value: 'Max 7 consecutive days',
          type: 'text',
        },
        {
          id: 'pet-policy',
          label: 'Pet Policy',
          value: 'Dogs under 40lbs, $200 deposit',
          type: 'text',
        },
        {
          id: 'parking',
          label: 'Parking',
          value: 'Assigned spot #15, visitor spots available',
          type: 'text',
        },
      ],
    },
  ];

  const handleItemPress = async (item: InfoItem) => {
    switch (item.type) {
      case 'phone':
        const phoneUrl = `tel:${item.value}`;
        const canOpenPhone = await Linking.canOpenURL(phoneUrl);
        if (canOpenPhone) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
        break;
      
      case 'email':
        const emailUrl = `mailto:${item.value}`;
        const canOpenEmail = await Linking.canOpenURL(emailUrl);
        if (canOpenEmail) {
          Linking.openURL(emailUrl);
        } else {
          Alert.alert('Error', 'Unable to open email client');
        }
        break;
      
      case 'link':
        Alert.alert(
          'Manual/Guide',
          'This would open the appliance manual or guide.',
          [{ text: 'OK' }]
        );
        break;
      
      case 'wifi':
      case 'text':
        if (item.copyable) {
          copyToClipboard(item.value, item.label);
        }
        break;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'phone': return 'call';
      case 'email': return 'mail';
      case 'wifi': return 'copy';
      case 'link': return 'document';
      case 'text': return (item: InfoItem) => item.copyable ? 'copy' : 'information-circle';
      default: return 'information-circle';
    }
  };

  return (
    <ScreenContainer
      title="Property Info"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="tenant"
    >
        {/* Property Address Header */}
        <View style={styles.propertyHeader}>
          <Ionicons name="location" size={24} color="#3498DB" />
          <View style={styles.propertyHeaderText}>
            <Text style={styles.propertyAddress}>123 Main St, Apt 4B</Text>
            <Text style={styles.propertySubtext}>Your rental property information</Text>
          </View>
        </View>

        {/* Info Sections */}
        {infoSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: `${section.color}15` }]}>
                <Ionicons name={section.icon} size={20} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.sectionContent}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.infoItem}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={item.type === 'text' && !item.copyable ? 1 : 0.7}
                >
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={[
                      styles.infoValue,
                      (item.type === 'phone' || item.type === 'email' || item.type === 'link') && styles.actionableValue
                    ]}>
                      {item.value}
                    </Text>
                  </View>
                  {(item.type === 'phone' || item.type === 'email' || item.type === 'link' || item.copyable) && (
                    <Ionicons 
                      name={
                        item.type === 'phone' ? 'call' :
                        item.type === 'email' ? 'mail' :
                        item.type === 'link' ? 'document' :
                        'copy'
                      } 
                      size={16} 
                      color="#7F8C8D" 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Emergency Notice */}
        <View style={styles.emergencyNotice}>
          <Ionicons name="warning" size={20} color="#E74C3C" />
          <Text style={styles.emergencyText}>
            For life-threatening emergencies, call 911 immediately.
          </Text>
        </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  propertyHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  propertySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    
    
    
    
    elevation: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  infoItemContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  actionableValue: {
    color: '#3498DB',
  },
  emergencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  emergencyText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#C62828',
    fontWeight: '500',
  },
});

export default PropertyInfoScreen;