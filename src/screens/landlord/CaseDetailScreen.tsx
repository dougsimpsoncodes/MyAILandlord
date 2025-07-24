import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';

type CaseDetailScreenRouteProp = RouteProp<LandlordStackParamList, 'CaseDetail'>;
type CaseDetailScreenNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'CaseDetail'>;

interface DetailedCase {
  id: string;
  tenantName: string;
  tenantUnit: string;
  tenantPhone: string;
  tenantEmail: string;
  issueType: string;
  description: string;
  location: string;
  urgency: 'Emergency' | 'Very urgent' | 'Moderate' | 'Can wait' | 'Low priority';
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  duration: string;
  timing: string;
  mediaUrls: string[];
  aiSummary: string;
  estimatedCost: string;
  preferredTimeSlots: string[];
  conversationLog: Array<{
    question: string;
    answer: string;
  }>;
}

const { width } = Dimensions.get('window');

const CaseDetailScreen = () => {
  const route = useRoute<CaseDetailScreenRouteProp>();
  const navigation = useNavigation<CaseDetailScreenNavigationProp>();
  const { caseId } = route.params;

  const [caseData] = useState<DetailedCase>({
    id: caseId,
    tenantName: 'Sarah Johnson',
    tenantUnit: 'Apt 2B',
    tenantPhone: '+1 (555) 123-4567',
    tenantEmail: 'sarah.johnson@email.com',
    issueType: 'Plumbing',
    description: 'Kitchen faucet is leaking and making strange noises when turned on. Water pressure seems lower than usual and there\'s a constant drip even when fully closed.',
    location: 'Kitchen',
    urgency: 'Moderate',
    status: 'new',
    submittedAt: '2 hours ago',
    duration: 'A few days',
    timing: 'All the time',
    mediaUrls: ['photo1.jpg', 'photo2.jpg'],
    aiSummary: 'Based on the description and photos, this appears to be a worn faucet cartridge or O-ring issue. The constant dripping and reduced water pressure are typical signs. A licensed plumber should be able to fix this within 1-2 hours with standard parts.',
    estimatedCost: '$150-250',
    preferredTimeSlots: ['Tomorrow 2:00 PM - 6:00 PM', 'Friday 9:00 AM - 1:00 PM'],
    conversationLog: [
      {
        question: 'Where exactly is this issue located?',
        answer: 'Kitchen',
      },
      {
        question: 'How long has this problem been occurring?',
        answer: 'A few days',
      },
      {
        question: 'Does this happen at specific times?',
        answer: 'All the time',
      },
      {
        question: 'How urgent is this repair?',
        answer: 'Moderate',
      },
    ],
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'media'>('overview');

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency':
        return '#E74C3C';
      case 'Very urgent':
        return '#E67E22';
      case 'Moderate':
        return '#F39C12';
      case 'Can wait':
        return '#27AE60';
      case 'Low priority':
        return '#95A5A6';
      default:
        return '#3498DB';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3498DB';
      case 'in_progress':
        return '#F39C12';
      case 'resolved':
        return '#27AE60';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const handleSendToVendor = () => {
    navigation.navigate('SendToVendor', { caseId });
  };

  const handleMarkResolved = () => {
    Alert.alert(
      'Mark as Resolved',
      'Are you sure this issue has been resolved?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Resolved',
          onPress: () => {
            Alert.alert('Success', 'Case marked as resolved!');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleCall = () => {
    Alert.alert('Call Tenant', `Calling ${caseData.tenantPhone}`);
  };

  const handleEmail = () => {
    Alert.alert('Email Tenant', `Opening email to ${caseData.tenantEmail}`);
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Analysis</Text>
        <View style={styles.aiSummaryCard}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color="#9B59B6" />
            <Text style={styles.aiTitle}>AI Summary</Text>
          </View>
          <Text style={styles.aiText}>{caseData.aiSummary}</Text>
          <View style={styles.costEstimate}>
            <Text style={styles.costLabel}>Estimated Cost:</Text>
            <Text style={styles.costValue}>{caseData.estimatedCost}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Time Slots</Text>
        <View style={styles.timeSlotsContainer}>
          {caseData.preferredTimeSlots.map((slot, index) => (
            <View key={index} style={styles.timeSlot}>
              <Ionicons name="time" size={16} color="#3498DB" />
              <Text style={styles.timeSlotText}>{slot}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleCall}>
            <Ionicons name="call" size={24} color="#3498DB" />
            <Text style={styles.quickActionText}>Call Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleEmail}>
            <Ionicons name="mail" size={24} color="#3498DB" />
            <Text style={styles.quickActionText}>Email Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleSendToVendor}>
            <Ionicons name="business" size={24} color="#F39C12" />
            <Text style={styles.quickActionText}>Send to Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Type</Text>
            <Text style={styles.detailValue}>{caseData.issueType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{caseData.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{caseData.duration}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Timing</Text>
            <Text style={styles.detailValue}>{caseData.timing}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{caseData.submittedAt}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Q&A Log</Text>
        <View style={styles.conversationLog}>
          {caseData.conversationLog.map((item, index) => (
            <View key={index} style={styles.conversationItem}>
              <View style={styles.questionContainer}>
                <Ionicons name="help-circle" size={16} color="#3498DB" />
                <Text style={styles.questionText}>{item.question}</Text>
              </View>
              <View style={styles.answerContainer}>
                <Ionicons name="chatbubble" size={16} color="#27AE60" />
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderMedia = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attached Media</Text>
        <View style={styles.mediaGrid}>
          {caseData.mediaUrls.map((url, index) => (
            <TouchableOpacity key={index} style={styles.mediaItem}>
              <View style={styles.mediaPlaceholder}>
                <Ionicons name="image" size={40} color="#95A5A6" />
                <Text style={styles.mediaLabel}>Photo {index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.mediaNote}>
          Tap any image to view full size. These photos help vendors understand the issue better.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.tenantInfo}>
            <Text style={styles.tenantName}>{caseData.tenantName}</Text>
            <Text style={styles.tenantUnit}>{caseData.tenantUnit}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(caseData.status) },
              ]}
            >
              <Text style={styles.statusText}>{getStatusText(caseData.status)}</Text>
            </View>
            <View
              style={[
                styles.urgencyBadge,
                { borderColor: getUrgencyColor(caseData.urgency) },
              ]}
            >
              <Text
                style={[
                  styles.urgencyText,
                  { color: getUrgencyColor(caseData.urgency) },
                ]}
              >
                {caseData.urgency}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.issueDescription} numberOfLines={2}>
          {caseData.description}
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'home' },
          { key: 'details', label: 'Details', icon: 'list' },
          { key: 'media', label: 'Media', icon: 'images' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={selectedTab === tab.key ? '#34495E' : '#95A5A6'}
            />
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'details' && renderDetails()}
        {selectedTab === 'media' && renderMedia()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSendToVendor}
          activeOpacity={0.8}
        >
          <Ionicons name="mail" size={20} color="#F39C12" />
          <Text style={styles.secondaryButtonText}>Send to Vendor</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleMarkResolved}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Mark Resolved</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenantInfo: {},
  tenantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tenantUnit: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#34495E',
  },
  tabText: {
    fontSize: 14,
    color: '#95A5A6',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#34495E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  aiSummaryCard: {
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D5FF',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B59B6',
  },
  aiText: {
    fontSize: 14,
    color: '#8E44AD',
    lineHeight: 20,
    marginBottom: 12,
  },
  costEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D5FF',
  },
  costLabel: {
    fontSize: 14,
    color: '#9B59B6',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 16,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  conversationLog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationItem: {
    gap: 8,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
    flex: 1,
  },
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 24,
  },
  answerText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
    flex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  mediaItem: {
    width: (width - 64) / 2,
  },
  mediaPlaceholder: {
    aspectRatio: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    gap: 8,
  },
  mediaLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  mediaNote: {
    fontSize: 12,
    color: '#95A5A6',
    fontStyle: 'italic',
    textAlign: 'center',
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
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F4D03F',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#F39C12',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#27AE60',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CaseDetailScreen;