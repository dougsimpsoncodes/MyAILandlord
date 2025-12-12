import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';

type SendToVendorScreenRouteProp = RouteProp<LandlordStackParamList, 'SendToVendor'>;
type SendToVendorScreenNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'SendToVendor'>;

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string[];
  rating: number;
  responseTime: string;
  isPreferred: boolean;
}

interface CaseInfo {
  tenantName: string;
  tenantUnit: string;
  tenantPhone: string;
  issueType: string;
  description: string;
  location: string;
  urgency: string;
  preferredTimeSlots: string[];
  mediaCount: number;
  aiSummary: string;
}

const SendToVendorScreen = () => {
  const route = useRoute<SendToVendorScreenRouteProp>();
  const navigation = useNavigation<SendToVendorScreenNavigationProp>();
  const { caseId } = route.params;

  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeTenantContact, setIncludeTenantContact] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const caseInfo: CaseInfo = {
    tenantName: 'Sarah Johnson',
    tenantUnit: 'Apt 2B',
    tenantPhone: '+1 (555) 123-4567',
    issueType: 'Plumbing',
    description: 'Kitchen faucet is leaking and making strange noises when turned on.',
    location: 'Kitchen',
    urgency: 'Moderate',
    preferredTimeSlots: ['Tomorrow 2:00 PM - 6:00 PM', 'Friday 9:00 AM - 1:00 PM'],
    mediaCount: 2,
    aiSummary: 'Based on the description and photos, this appears to be a worn faucet cartridge or O-ring issue.',
  };

  const vendors: Vendor[] = [
    {
      id: '1',
      name: 'Mike\'s Plumbing Services',
      email: 'mike@mikesplumbing.com',
      phone: '+1 (555) 987-6543',
      specialty: ['Plumbing', 'Emergency Repairs'],
      rating: 4.8,
      responseTime: '< 2 hours',
      isPreferred: true,
    },
    {
      id: '2',
      name: 'Quick Fix Maintenance',
      email: 'info@quickfixmaint.com',
      phone: '+1 (555) 456-7890',
      specialty: ['Plumbing', 'Electrical', 'HVAC'],
      rating: 4.6,
      responseTime: '< 4 hours',
      isPreferred: false,
    },
    {
      id: '3',
      name: 'Home Repair Experts',
      email: 'contact@homerepairexperts.com',
      phone: '+1 (555) 321-0987',
      specialty: ['General Maintenance', 'Plumbing'],
      rating: 4.5,
      responseTime: '< 6 hours',
      isPreferred: false,
    },
  ];

  const filteredVendors = vendors.filter(vendor =>
    vendor.specialty.includes(caseInfo.issueType)
  );

  const generateEmailContent = () => {
    const selectedVendorData = vendors.find(v => v.id === selectedVendor);
    if (!selectedVendorData) return '';

    return `
Subject: Maintenance Request - ${caseInfo.issueType} Issue at ${caseInfo.tenantUnit}

Dear ${selectedVendorData.name},

I hope this email finds you well. We have a ${caseInfo.urgency.toLowerCase()} priority maintenance request that requires your expertise.

**Property Details:**
- Unit: ${caseInfo.tenantUnit}
- Tenant: ${caseInfo.tenantName}
- Issue Type: ${caseInfo.issueType}
- Location: ${caseInfo.location}

**Issue Description:**
${caseInfo.description}

**AI Analysis:**
${caseInfo.aiSummary}

**Preferred Service Times:**
${caseInfo.preferredTimeSlots.map(slot => `• ${slot}`).join('\n')}

${includeTenantContact ? `**Tenant Contact:**
- Phone: ${caseInfo.tenantPhone}` : '**Note:** Please coordinate through property management for tenant access.'}

${includePhotos ? `**Attachments:**
${caseInfo.mediaCount} photos are attached to help you understand the issue better.` : ''}

${customMessage ? `**Additional Notes:**
${customMessage}` : ''}

Please confirm your availability and estimated timeline for this repair. 

Thank you for your prompt attention to this matter.

Best regards,
Property Management
    `.trim();
  };

  const handleSendToVendor = async () => {
    if (!selectedVendor) {
      Alert.alert('Select Vendor', 'Please select a vendor before sending.');
      return;
    }

    setIsSending(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const selectedVendorData = vendors.find(v => v.id === selectedVendor);
      Alert.alert(
        'Email Sent Successfully!',
        `Your maintenance request has been sent to ${selectedVendorData?.name}. They typically respond within ${selectedVendorData?.responseTime}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Send Error', 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Ionicons
        key={index}
        name={index < Math.floor(rating) ? 'star' : 'star-outline'}
        size={16}
        color="#F39C12"
      />
    ));
  };

  // Bottom footer buttons
  const footerButtons = (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        onPress={handleSendToVendor}
        disabled={isSending || !selectedVendor}
        activeOpacity={0.8}
      >
        {isSending ? (
          <>
            <Ionicons name="hourglass" size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Sending...</Text>
          </>
        ) : (
          <>
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Send to Vendor</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer
      title="Send to Vendor"
      subtitle="Select a vendor and customize the maintenance request email"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      bottomContent={footerButtons}
    >
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.casePreview}>
          <Text style={styles.sectionTitle}>Case Summary</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Tenant:</Text>
              <Text style={styles.previewValue}>{caseInfo.tenantName} - {caseInfo.tenantUnit}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Issue:</Text>
              <Text style={styles.previewValue}>{caseInfo.issueType} - {caseInfo.location}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Priority:</Text>
              <Text style={[styles.previewValue, { color: '#F39C12' }]}>{caseInfo.urgency}</Text>
            </View>
          </View>
        </View>

        <View style={styles.vendorSelection}>
          <Text style={styles.sectionTitle}>Select Vendor</Text>
          <Text style={styles.sectionSubtitle}>
            Recommended vendors for {caseInfo.issueType.toLowerCase()} issues
          </Text>

          {filteredVendors.map((vendor) => (
            <TouchableOpacity
              key={vendor.id}
              style={[
                styles.vendorCard,
                selectedVendor === vendor.id && styles.vendorCardSelected,
                vendor.isPreferred && styles.vendorCardPreferred,
              ]}
              onPress={() => setSelectedVendor(vendor.id)}
              activeOpacity={0.8}
            >
              <View style={styles.vendorHeader}>
                <View style={styles.vendorInfo}>
                  <View style={styles.vendorNameRow}>
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    {vendor.isPreferred && (
                      <View style={styles.preferredBadge}>
                        <Ionicons name="star" size={12} color="#FFFFFF" />
                        <Text style={styles.preferredText}>Preferred</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.vendorRating}>
                    <View style={styles.stars}>
                      {renderStars(vendor.rating)}
                    </View>
                    <Text style={styles.ratingText}>{vendor.rating}</Text>
                  </View>
                </View>
                <View style={styles.vendorStatus}>
                  {selectedVendor === vendor.id ? (
                    <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                  ) : (
                    <Ionicons name="radio-button-off" size={24} color="#BDC3C7" />
                  )}
                </View>
              </View>

              <View style={styles.vendorDetails}>
                <View style={styles.vendorContact}>
                  <Ionicons name="mail" size={14} color="#7F8C8D" />
                  <Text style={styles.contactText}>{vendor.email}</Text>
                </View>
                <View style={styles.vendorContact}>
                  <Ionicons name="call" size={14} color="#7F8C8D" />
                  <Text style={styles.contactText}>{vendor.phone}</Text>
                </View>
              </View>

              <View style={styles.vendorMeta}>
                <View style={styles.specialtyContainer}>
                  {vendor.specialty.map((spec, index) => (
                    <View key={index} style={styles.specialtyTag}>
                      <Text style={styles.specialtyText}>{spec}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.responseTime}>
                  <Ionicons name="time" size={14} color="#27AE60" />
                  <Text style={styles.responseTimeText}>{vendor.responseTime}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emailOptions}>
          <Text style={styles.sectionTitle}>Email Options</Text>

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Include Photos</Text>
              <Text style={styles.optionDescription}>
                Attach {caseInfo.mediaCount} photos to help vendor assess the issue
              </Text>
            </View>
            <Switch
              value={includePhotos}
              onValueChange={setIncludePhotos}
              trackColor={{ false: '#E1E8ED', true: '#3498DB' }}
              thumbColor={includePhotos ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Include Tenant Contact</Text>
              <Text style={styles.optionDescription}>
                Allow vendor to contact tenant directly for scheduling
              </Text>
            </View>
            <Switch
              value={includeTenantContact}
              onValueChange={setIncludeTenantContact}
              trackColor={{ false: '#E1E8ED', true: '#3498DB' }}
              thumbColor={includeTenantContact ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Mark as Urgent</Text>
              <Text style={styles.optionDescription}>
                Request priority scheduling and faster response
              </Text>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={setIsUrgent}
              trackColor={{ false: '#E1E8ED', true: '#E74C3C' }}
              thumbColor={isUrgent ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.customMessage}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Add any special instructions or notes for the vendor..."
            placeholderTextColor="#95A5A6"
            multiline
            numberOfLines={4}
            value={customMessage}
            onChangeText={setCustomMessage}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.emailPreview}>
          <Text style={styles.sectionTitle}>Email Preview</Text>
          <ScrollView style={styles.previewContainer} nestedScrollEnabled>
            <Text style={styles.previewContent}>{generateEmailContent()}</Text>
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  casePreview: {
    marginBottom: 24,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    
    
    
    
    elevation: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  vendorSelection: {
    marginBottom: 24,
  },
  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  vendorCardSelected: {
    borderColor: '#27AE60',
    backgroundColor: '#F8FFF8',
  },
  vendorCardPreferred: {
    borderColor: '#F39C12',
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  preferredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  preferredText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  vendorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  vendorStatus: {},
  vendorDetails: {
    gap: 4,
    marginBottom: 12,
  },
  vendorContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  vendorMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specialtyContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 10,
    color: '#3498DB',
    fontWeight: '600',
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseTimeText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '500',
  },
  emailOptions: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    
    
    
    
    elevation: 2,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  customMessage: {
    marginBottom: 24,
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  emailPreview: {
    marginBottom: 20,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  previewContent: {
    fontSize: 12,
    color: '#2C3E50',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F39C12',
    gap: 8,
    
    
    
    
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SendToVendorScreen;