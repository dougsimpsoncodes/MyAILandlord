import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { useAppAuth } from '../../context/ClerkAuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useApiErrorHandling } from '../../hooks/useErrorHandling';
import { formatRelativeTime } from '../../utils/helpers';

interface Conversation {
  id: string;
  tenantName: string;
  tenantEmail: string;
  property: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  priority: 'high' | 'medium' | 'low';
}

const LandlordCommunicationScreen = () => {
  const navigation = useNavigation();
  const apiClient = useApiClient();
  const { user } = useAppAuth();
  const { handleApiError } = useApiErrorHandling();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // TODO: Load actual conversations from API
      // For now, using mock data
      const mockConversations: Conversation[] = [
        {
          id: '1',
          tenantName: 'Sarah Johnson',
          tenantEmail: 'sarah.johnson@email.com',
          property: 'Apartment 2B - Oak Street',
          lastMessage: 'The repair work looks great! Thank you for the quick response.',
          lastMessageTime: '2 hours ago',
          unreadCount: 0,
          priority: 'low',
        },
        {
          id: '2',
          tenantName: 'Mike Chen',
          tenantEmail: 'mike.chen@email.com',
          property: 'Unit 15 - Maple Avenue',
          lastMessage: 'When can we schedule the maintenance visit?',
          lastMessageTime: '5 hours ago',
          unreadCount: 2,
          priority: 'medium',
        },
        {
          id: '3',
          tenantName: 'Emily Rodriguez',
          tenantEmail: 'emily.rodriguez@email.com',
          property: 'House 42 - Pine Street',
          lastMessage: 'Emergency: Water leak in the basement!',
          lastMessageTime: '1 day ago',
          unreadCount: 3,
          priority: 'high',
        },
      ];

      setConversations(mockConversations);
    } catch (error) {
      handleApiError(error, 'Loading conversations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = searchQuery === '' || 
        conv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.property.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = selectedFilter === 'all' ||
        (selectedFilter === 'unread' && conv.unreadCount > 0) ||
        (selectedFilter === 'urgent' && conv.priority === 'high');
      
      return matchesSearch && matchesFilter;
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#E74C3C';
      case 'medium': return '#F39C12';
      case 'low': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    // TODO: Navigate to conversation detail
  };

  const handleNewMessage = () => {
    // TODO: Navigate to new message composer
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#34495E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Communications</Text>
          </View>
          <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
            <Ionicons name="add" size={24} color="#3498DB" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#7F8C8D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tenants or properties..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#95A5A6"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#7F8C8D" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All Conversations', count: conversations.length },
              { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unreadCount > 0).length },
              { key: 'urgent', label: 'Urgent', count: conversations.filter(c => c.priority === 'high').length },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter.key && styles.filterTextActive,
                  ]}
                >
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Conversations List */}
        <ScrollView
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#BDC3C7" />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'No conversations match your search.'
                  : 'Start communicating with your tenants to see conversations here.'}
              </Text>
            </View>
          ) : (
            filteredConversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationCard}
                onPress={() => handleConversationPress(conversation)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationHeader}>
                  <View style={styles.tenantInfo}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {conversation.tenantName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.conversationMeta}>
                      <Text style={styles.tenantName}>{conversation.tenantName}</Text>
                      <Text style={styles.propertyName}>{conversation.property}</Text>
                    </View>
                  </View>
                  <View style={styles.conversationStatus}>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.priorityDot,
                      { backgroundColor: getPriorityColor(conversation.priority) }
                    ]} />
                  </View>
                </View>

                <View style={styles.messagePreview}>
                  <Text style={styles.lastMessage} numberOfLines={2}>
                    {conversation.lastMessage}
                  </Text>
                  <Text style={styles.messageTime}>{conversation.lastMessageTime}</Text>
                </View>

                <View style={styles.conversationActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble" size={16} color="#3498DB" />
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="call" size={16} color="#27AE60" />
                    <Text style={styles.actionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="construct" size={16} color="#F39C12" />
                    <Text style={styles.actionText}>Create Request</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  newMessageButton: {
    padding: 8,
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#34495E',
    borderColor: '#34495E',
  },
  filterText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  conversationMeta: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  propertyName: {
    fontSize: 12,
    color: '#6C757D',
  },
  conversationStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messagePreview: {
    marginBottom: 12,
  },
  lastMessage: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#6C757D',
  },
  conversationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C757D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default LandlordCommunicationScreen;