import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const HelpCenterScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I submit a maintenance request?',
      answer: 'From the Home screen, tap "Report Issue" and follow the guided steps to describe the issue, add photos, and submit your request.',
    },
    {
      id: '2',
      question: 'How do I add a new property?',
      answer: 'As a landlord, go to the Properties tab and tap "Add Property". Follow the onboarding flow to enter property details, add rooms, and configure settings.',
    },
    {
      id: '3',
      question: 'How do I invite a tenant?',
      answer: 'From your property details page, tap "Invite Tenant" to generate a unique invite code or link that your tenant can use to join the property.',
    },
    {
      id: '4',
      question: 'How do I track maintenance request status?',
      answer: 'Go to the Requests tab to see all your maintenance requests and their current status. Tap any request to view details and updates.',
    },
    {
      id: '5',
      question: 'How do I change my notification settings?',
      answer: 'Go to Profile > Notifications to customize your push and email notification preferences.',
    },
  ];

  const quickLinks = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'rocket-outline' as const,
      color: '#3498DB',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Guide',
      icon: 'construct-outline' as const,
      color: '#F39C12',
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      icon: 'card-outline' as const,
      color: '#2ECC71',
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: 'bug-outline' as const,
      color: '#E74C3C',
    },
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScreenContainer
      title="Help Center"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#7F8C8D" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help articles..."
          placeholderTextColor="#95A5A6"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#95A5A6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Links */}
      {!searchQuery && (
        <>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksGrid}>
            {quickLinks.map(link => (
              <TouchableOpacity key={link.id} style={styles.quickLinkCard}>
                <View style={[styles.quickLinkIcon, { backgroundColor: `${link.color}20` }]}>
                  <Ionicons name={link.icon} size={24} color={link.color} />
                </View>
                <Text style={styles.quickLinkTitle}>{link.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* FAQ Section */}
      <Text style={styles.sectionTitle}>
        {searchQuery ? `Results (${filteredFAQs.length})` : 'Frequently Asked Questions'}
      </Text>
      <View style={styles.faqContainer}>
        {filteredFAQs.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.faqItem}
            onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons
                name={expandedFAQ === item.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#7F8C8D"
              />
            </View>
            {expandedFAQ === item.id && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Still Need Help */}
      <View style={styles.helpCard}>
        <Text style={styles.helpCardTitle}>Still need help?</Text>
        <Text style={styles.helpCardSubtitle}>
          Our support team is here to assist you
        </Text>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
          <Text style={styles.contactBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: DesignSystem.colors.text,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  quickLinkCard: {
    width: '47%',
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickLinkTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: DesignSystem.colors.text,
    textAlign: 'center',
  },
  faqContainer: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: DesignSystem.colors.text,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    lineHeight: 20,
  },
  helpCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  helpCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginBottom: 4,
  },
  helpCardSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  contactBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HelpCenterScreen;
