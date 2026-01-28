import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useApiClient } from '../services/api/client';
import { useUnifiedAuth } from './UnifiedAuthContext';
import { supabase } from '../services/supabase/config';
import log from '../lib/log';

interface UnreadMessagesContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  markAsRead: () => {},
});

export const useUnreadMessages = () => useContext(UnreadMessagesContext);

interface UnreadMessagesProviderProps {
  children: ReactNode;
}

export const UnreadMessagesProvider: React.FC<UnreadMessagesProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { user } = useUnifiedAuth();
  const apiClient = useApiClient();

  const refreshUnreadCount = useCallback(async () => {
    if (!apiClient || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      const messages = await apiClient.getMessages();

      // Count messages where user is recipient and is_read is false
      const unread = messages.filter(
        (msg: any) => msg.recipient_id === user.id && !msg.is_read
      ).length;

      log.info('Unread count updated', { unread, totalMessages: messages.length });
      setUnreadCount(unread);
      setProfileId(user.id);
    } catch (error) {
      log.error('Error fetching unread message count', { error: String(error) });
      // Don't reset count on error to avoid flickering
    }
  }, [apiClient, user]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Subscribe to real-time message changes (like iPhone push notifications when app is open)
  useEffect(() => {
    if (!profileId) return;

    log.info('📬 Subscribing to real-time message updates for profile:', { profileId });

    const channel = supabase
      .channel(`unread-messages-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profileId}`,
        },
        (payload) => {
          log.info('📨 New message received via realtime', { messageId: payload.new?.id });
          // Increment unread count when a new message arrives for this user
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profileId}`,
        },
        (payload) => {
          // If a message was marked as read, refresh the count
          if (payload.new?.is_read && !payload.old?.is_read) {
            log.info('📭 Message marked as read via realtime');
            refreshUnreadCount();
          }
        }
      )
      .subscribe((status) => {
        log.info('📬 Realtime subscription status:', { status });
      });

    return () => {
      log.info('📬 Unsubscribing from real-time message updates');
      supabase.removeChannel(channel);
    };
  }, [profileId, refreshUnreadCount]);

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        markAsRead,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
};
