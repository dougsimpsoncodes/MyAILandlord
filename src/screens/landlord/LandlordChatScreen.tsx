import React, { useState, useRef, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useAppState } from '../../context/AppStateContext';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { useApiClient } from '../../services/api/client';
import { log } from '../../lib/log';

type LandlordChatRouteParams = {
  LandlordChat: {
    tenantId: string;
    tenantName: string;
    tenantEmail?: string;
  };
};

interface Message {
  id: string;
  text: string;
  sender: 'tenant' | 'landlord';
  timestamp: Date;
  read: boolean;
}

const LandlordChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<LandlordChatRouteParams, 'LandlordChat'>>();
  const { tenantId, tenantName, tenantEmail } = route.params;
  const { user } = useUnifiedAuth();
  const apiClient = useApiClient();
  const { refreshNotificationCounts } = useAppState();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Load messages function - matches tenant pattern
  const loadMessages = useCallback(async () => {
    if (!apiClient || !user) return;

    try {
      const dbMessages = await apiClient.getMessages();

      // Filter messages for this specific conversation
      const conversationMessages = dbMessages.filter((msg: any) =>
        (msg.sender_id === tenantId && msg.recipient_id === user.id) ||
        (msg.sender_id === user.id && msg.recipient_id === tenantId)
      );

      // Map database messages to local format
      const mappedMessages: Message[] = conversationMessages.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id === user.id ? 'landlord' : 'tenant',
        timestamp: new Date(msg.created_at),
        read: msg.is_read || false,
      }));

      // Deduplicate by ID (in case of race conditions)
      const uniqueMessages = mappedMessages.filter(
        (msg, index, self) => index === self.findIndex(m => m.id === msg.id)
      );

      // Sort by timestamp (oldest first)
      uniqueMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(uniqueMessages);

      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      log.error('LandlordChat: Error loading messages', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, user?.id, tenantId]);

  // Load messages when screen gets focus - matches tenant pattern
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

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

  const sendMessage = async () => {
    if (!messageText.trim() || !apiClient || !user) return;

    setIsSending(true);
    log.info('Landlord sending message to tenant', {
      recipientId: tenantId,
      contentLength: messageText.trim().length
    });

    try {
      const sentMessage = await apiClient.sendMessage({
        recipientId: tenantId,
        content: messageText.trim(),
        messageType: 'text',
      });
      log.info('Message sent successfully', { messageId: sentMessage.id });

      // Add to local state immediately (only if not already present)
      const newMessage: Message = {
        id: sentMessage.id,
        text: messageText.trim(),
        sender: 'landlord',
        timestamp: new Date(),
        read: true,
      };

      setMessages(prev => {
        // Check if message already exists (race condition prevention)
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      setMessageText('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error('Error sending message', { error: errorMsg });
      showAlert('Error', `Failed to send message: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScreenContainer
      title="Messages"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable={false}
      keyboardAware
      padded={false}
    >
      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#34495E" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Start a conversation with {tenantName}
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'landlord' ? styles.landlordMessage : styles.tenantMessage
              ]}
            >
              <Text style={[
                styles.messageText,
                message.sender === 'landlord' && styles.landlordMessageText
              ]}>
                {message.text}
              </Text>
              <Text style={[
                styles.messageTime,
                message.sender === 'landlord' && styles.landlordMessageTime
              ]}>
                {formatTimestamp(message.timestamp)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={messageText.trim() ? '#FFFFFF' : '#BDC3C7'}
            />
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  messagesContent: {
    padding: 20,
    flexGrow: 1,
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
  tenantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  landlordMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#34495E', // Landlord theme color
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  landlordMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  landlordMessageTime: {
    color: '#BDC3C7',
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
    backgroundColor: '#34495E', // Landlord theme color
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E1E8ED',
  },
});

export default LandlordChatScreen;
