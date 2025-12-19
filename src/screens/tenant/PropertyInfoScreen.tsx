import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Clipboard
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { PropertyImage } from '../../components/shared/PropertyImage';

type PropertyInfoNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'PropertyInfo'>;
type PropertyInfoRouteProp = RouteProp<TenantStackParamList, 'PropertyInfo'>;

interface InfoItem {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'phone' | 'email' | 'wifi';
  copyable?: boolean;
  available: boolean;
}

const PropertyInfoScreen = () => {
  const navigation = useNavigation<PropertyInfoNavigationProp>();
  const route = useRoute<PropertyInfoRouteProp>();

  // Get property data from route params
  const {
    address = 'Property Address',
    name,
    wifiNetwork,
    wifiPassword,
    emergencyContact,
    emergencyPhone,
  } = route.params || {};

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handlePhoneCall = async (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleItemPress = (item: InfoItem) => {
    if (!item.available) return;

    if (item.type === 'phone') {
      handlePhoneCall(item.value);
    } else if (item.copyable) {
      copyToClipboard(item.value, item.label);
    }
  };

  // WiFi section items
  const wifiItems: InfoItem[] = [
    {
      id: 'wifi-name',
      label: 'Network Name',
      value: wifiNetwork || 'Not provided',
      type: 'wifi',
      copyable: !!wifiNetwork,
      available: !!wifiNetwork,
    },
    {
      id: 'wifi-password',
      label: 'Password',
      value: wifiPassword || 'Not provided',
      type: 'wifi',
      copyable: !!wifiPassword,
      available: !!wifiPassword,
    },
  ];

  // Emergency contact items
  const contactItems: InfoItem[] = [
    {
      id: 'emergency-contact',
      label: 'Emergency Contact',
      value: emergencyContact || 'Not provided',
      type: 'text',
      copyable: false,
      available: !!emergencyContact,
    },
    {
      id: 'emergency-phone',
      label: 'Emergency Phone',
      value: emergencyPhone || 'Not provided',
      type: 'phone',
      copyable: false,
      available: !!emergencyPhone,
    },
  ];

  const hasWifiInfo = wifiNetwork || wifiPassword;
  const hasContactInfo = emergencyContact || emergencyPhone;

  return (
    <ScreenContainer
      title="Property Info"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="tenant"
    >
      {/* Property Header with Street View */}
      <View style={styles.propertyHeader}>
        <PropertyImage
          address={address}
          width={320}
          height={200}
          borderRadius={12}
        />
        {name && <Text style={styles.propertyName}>{name}</Text>}
        <Text style={styles.propertyAddress}>{address}</Text>
      </View>

      {/* WiFi Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, { backgroundColor: '#3498DB15' }]}>
            <Ionicons name="wifi" size={20} color="#3498DB" />
          </View>
          <Text style={styles.sectionTitle}>WiFi & Internet</Text>
        </View>

        <View style={styles.sectionContent}>
          {wifiItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.infoItem}
              onPress={() => handleItemPress(item)}
              activeOpacity={item.available && item.copyable ? 0.7 : 1}
              disabled={!item.available || !item.copyable}
            >
              <View style={styles.infoItemContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={[
                  styles.infoValue,
                  !item.available && styles.unavailableValue
                ]}>
                  {item.value}
                </Text>
              </View>
              {item.available && item.copyable && (
                <Ionicons name="copy" size={16} color="#7F8C8D" />
              )}
            </TouchableOpacity>
          ))}
          {!hasWifiInfo && (
            <Text style={styles.noDataMessage}>
              WiFi information not yet provided by your landlord.
            </Text>
          )}
        </View>
      </View>

      {/* Emergency Contacts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, { backgroundColor: '#E74C3C15' }]}>
            <Ionicons name="call" size={20} color="#E74C3C" />
          </View>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        </View>

        <View style={styles.sectionContent}>
          {contactItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.infoItem}
              onPress={() => handleItemPress(item)}
              activeOpacity={item.available && item.type === 'phone' ? 0.7 : 1}
              disabled={!item.available || item.type !== 'phone'}
            >
              <View style={styles.infoItemContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={[
                  styles.infoValue,
                  item.available && item.type === 'phone' && styles.actionableValue,
                  !item.available && styles.unavailableValue
                ]}>
                  {item.value}
                </Text>
              </View>
              {item.available && item.type === 'phone' && (
                <Ionicons name="call" size={16} color="#3498DB" />
              )}
            </TouchableOpacity>
          ))}
          {!hasContactInfo && (
            <Text style={styles.noDataMessage}>
              Emergency contact information not yet provided by your landlord.
            </Text>
          )}
        </View>
      </View>

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
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    textAlign: 'center',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
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
  unavailableValue: {
    color: '#BDC3C7',
    fontStyle: 'italic',
  },
  noDataMessage: {
    fontSize: 13,
    color: '#95A5A6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
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
