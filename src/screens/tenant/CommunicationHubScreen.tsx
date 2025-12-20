import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useUnreadMessages } from '../../context/UnreadMessagesContext';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { useApiClient } from '../../services/api/client';
import log from '../../lib/log';

type CommunicationHubNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'CommunicationHub'>;

interface Message {
  id: string;
  text: string;
  sender: 'tenant' | 'landlord';
  timestamp: Date;
  read: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  read: boolean;
}

const CommunicationHubScreen = () => {
  const navigation = useNavigation<CommunicationHubNavigationProp>();
  const { user } = useAppAuth();
  const apiClient = useApiClient();
  const { refreshUnreadCount } = useUnreadMessages();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>('messages');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        if (apiClient) {
          try {
            await apiClient.markMessagesAsRead();
            await refreshUnreadCount();
          } catch (error) {
            log.error('Error marking messages as read', { error: String(error) });
          }
        }
      };
      markAsRead();
    }, [apiClient, refreshUnreadCount])
  );

  // Load messages and property info on mount
  const loadMessages = useCallback(async () => {
    if (!apiClient) return;

    try {
      // First get the tenant's linked property to find the landlord
      const tenantProperties = await apiClient.getTenantProperties();
      if (tenantProperties.length > 0) {
        const property = tenantProperties[0].properties as any;
        if (property) {
          setPropertyId(property.id);
          // Get landlord ID from property
          if (property.landlord_id) {
            setLandlordId(property.landlord_id);
            log.info('Found landlord from property', { landlordId: property.landlord_id });
          }
        }
      }

      // Load messages from API
      const dbMessages = await apiClient.getMessages();
      log.info('Loaded messages from database', { count: dbMessages.length });

      // Map database messages to local format
      const mappedMessages: Message[] = dbMessages.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id === user?.id ? 'tenant' : 'landlord',
        timestamp: new Date(msg.created_at),
        read: msg.is_read || false,
      }));

      // Sort by timestamp
      mappedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(mappedMessages);

      // Scroll to bottom after loading messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      log.error('Error loading messages', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  useEffect(() => {
    // Mark messages as read when viewing
    if (activeTab === 'messages') {
      setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
    } else {
      setAnnouncements(prev => prev.map(ann => ({ ...ann, read: true })));
    }
  }, [activeTab]);

  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !apiClient) return;

    // Need a recipient to send a message
    if (!landlordId) {
      showAlert('Error', 'No landlord found to message. Please link to a property first.');
      return;
    }

    setIsSending(true);
    log.info('Attempting to send message', {
      recipientId: landlordId,
      propertyId,
      contentLength: messageText.trim().length
    });
    try {
      // Send message to database
      const sentMessage = await apiClient.sendMessage({
        recipientId: landlordId,
        content: messageText.trim(),
        messageType: 'text',
        propertyId: propertyId || undefined,
      });
      log.info('Message sent response', { sentMessage });

      // Add to local state immediately for responsiveness
      const newMessage: Message = {
        id: sentMessage.id,
        text: messageText.trim(),
        sender: 'tenant',
        timestamp: new Date(),
        read: true,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessageText('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      log.info('Message sent successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error('Error sending message', { error: errorMsg });
      showAlert('Error', `Failed to send message: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#E74C3C';
      case 'medium': return '#F39C12';
      case 'low': return '#3498DB';
      default: return '#7F8C8D';
    }
  };

  const unreadCount = {
    messages: messages.filter(m => !m.read && m.sender === 'landlord').length,
    announcements: announcements.filter(a => !a.read).length,
  };

  return (
    <ScreenContainer
      title="Messages"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="tenant"
      scrollable={false}
      keyboardAware
      padded={false}
    >

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
            onPress={() => setActiveTab('messages')}
          >
            <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
              Messages
            </Text>
            {unreadCount.messages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount.messages}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
            onPress={() => setActiveTab('announcements')}
          >
            <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>
              Announcements
            </Text>
            {unreadCount.announcements > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount.announcements}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeTab === 'messages' ? (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3498DB" />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyMessagesContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#BDC3C7" />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>
                    {landlordId ? 'Start a conversation with your landlord' : 'Link to a property to message your landlord'}
                  </Text>
                </View>
              ) : (
                messages.map((message, index) => (
                  <View
                    key={`${message.id}-${index}`}
                    style={[
                      styles.messageBubble,
                      message.sender === 'tenant' ? styles.tenantMessage : styles.landlordMessage
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      message.sender === 'tenant' && styles.tenantMessageText
                    ]}>
                      {message.text}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      message.sender === 'tenant' && styles.tenantMessageTime
                    ]}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder={landlordId ? "Type a message..." : "Link to a property first..."}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
                editable={!!landlordId && !isSending}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!messageText.trim() || isSending || !landlordId) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!messageText.trim() || isSending || !landlordId}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={messageText.trim() && landlordId ? '#FFFFFF' : '#BDC3C7'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <ScrollView style={styles.announcementsContainer} showsVerticalScrollIndicator={false}>
            {announcements.map((announcement) => (
              <TouchableOpacity
                key={announcement.id}
                style={styles.announcementCard}
                onPress={() => showAlert(announcement.title, announcement.content)}
              >
                <View style={styles.announcementHeader}>
                  <View style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(announcement.priority) }
                  ]} />
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  {!announcement.read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text style={styles.announcementContent} numberOfLines={2}>
                  {announcement.content}
                </Text>
                <Text style={styles.announcementTime}>
                  {formatTimestamp(announcement.timestamp)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498DB',
  },
  tabText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498DB',
  },
  badge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7F8C8D',
  },
  emptyMessagesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  emptyMessagesSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  landlordMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  tenantMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498DB',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  tenantMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  tenantMessageTime: {
    color: '#E8F4F8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E1E8ED',
  },
  announcementsContainer: {
    flex: 1,
    padding: 20,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    
    
    
    
    elevation: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498DB',
    marginLeft: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginLeft: 16,
  },
  announcementTime: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
    marginLeft: 16,
  },
});

export default CommunicationHubScreen;
