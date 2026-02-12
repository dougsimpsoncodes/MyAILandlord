import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Database } from '../../services/supabase/types';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useAppState } from '../../context/AppStateContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useApiErrorHandling } from '../../hooks/useErrorHandling';
import { formatRelativeTime } from '../../utils/helpers';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { log } from '../../lib/log';

type ConversationFilter = 'all' | 'unread' | 'urgent';
type MessageWithRelations = Database['public']['Tables']['messages']['Row'] & {
  sender?: { name?: string | null; email?: string | null } | null;
  recipient?: { name?: string | null; email?: string | null } | null;
};

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
  const navigation = useNavigation<NativeStackNavigationProp<LandlordStackParamList>>();
  const apiClient = useApiClient();
  const { user } = useUnifiedAuth();
  const { refreshNotificationCounts } = useAppState();
  const { handleApiError } = useApiErrorHandling();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ConversationFilter>('all');

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        if (apiClient) {
          try {
            await apiClient.markMessagesAsRead();
            await refreshNotificationCounts();
          } catch (error) {
            log.error('Error marking messages as read', { error: String(error) });
          }
        }
      };
      markAsRead();
    }, [apiClient, refreshNotificationCounts])
  );

  // Reload conversations when screen gets focus (like tenant screen)
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    try {
      setLoading(true);

      if (!apiClient || !user) {
        log.warn('LandlordCommunication: No API client or user');
        setConversations([]);
        return;
      }

      // Load messages from API
      const messages = (await apiClient.getMessages()) as MessageWithRelations[];
      log.info('Landlord loaded messages', { count: messages.length });

      // Group messages by the other party (tenant)
      const conversationMap = new Map<string, {
        tenantId: string;
        tenantName: string;
        tenantEmail: string;
        property: string;
        messages: MessageWithRelations[];
      }>();

      for (const msg of messages) {
        // Determine who the tenant is (the other party)
        const tenantId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;

        if (!conversationMap.has(tenantId)) {
          // Get tenant info from the message's sender/recipient data (if expanded)
          const sender = msg.sender;
          const recipient = msg.recipient;
          const tenantInfo = msg.sender_id === user.id ? recipient : sender;

          conversationMap.set(tenantId, {
            tenantId,
            tenantName: tenantInfo?.name || tenantInfo?.email || 'Unknown Tenant',
            tenantEmail: tenantInfo?.email || '',
            property: 'Property', // TODO: Get actual property name
            messages: [],
          });
        }

        conversationMap.get(tenantId)!.messages.push(msg);
      }

      // Convert to Conversation array
      const convos: Conversation[] = [];
      for (const [tenantId, data] of conversationMap.entries()) {
        // Sort messages by time to get latest
        data.messages.sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        const latestMsg = data.messages[0];
        const unreadCount = data.messages.filter(m =>
          !m.is_read && m.sender_id !== user.id
        ).length;

        convos.push({
          id: tenantId,
          tenantName: data.tenantName,
          tenantEmail: data.tenantEmail,
          property: data.property,
          lastMessage: latestMsg?.content || '',
          lastMessageTime: latestMsg ? formatRelativeTime(new Date(latestMsg.created_at || 0)) : '',
          unreadCount,
          priority: unreadCount > 0 ? 'high' : 'low',
        });
      }

      // Sort by most recent message
      convos.sort((a, b) => {
        // This is a simplified sort - ideally we'd store actual timestamps
        return b.unreadCount - a.unreadCount;
      });

      setConversations(convos);
      log.info('Landlord conversations loaded', { count: convos.length });
    } catch (error) {
      log.error('Error loading landlord conversations', { error: String(error) });
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
    navigation.navigate('LandlordChat', {
      tenantId: conversation.id,
      tenantName: conversation.tenantName,
      tenantEmail: conversation.tenantEmail,
    });
  };

  const handleNewMessage = () => {
    // TODO: Navigate to new message composer
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  // Header right button
  const headerRight = (
    <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
      <Ionicons name="add" size={24} color="#3498DB" />
    </TouchableOpacity>
  );

  return (
    <ErrorBoundary>
      <ScreenContainer
        title="Messages"
        showBackButton
        onBackPress={() => navigation.goBack()}
        headerRight={headerRight}
        userRole="landlord"
        refreshing={refreshing}
        onRefresh={onRefresh}
        padded={false}
      >

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
                onPress={() => setSelectedFilter(filter.key as ConversationFilter)}
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
        <View style={styles.conversationsList}>
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
        </View>
      </ScreenContainer>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
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
