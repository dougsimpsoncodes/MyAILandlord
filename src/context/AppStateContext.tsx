/**
 * AppStateContext - Consolidated app-level state management
 *
 * Combines the functionality of:
 * - PendingRequestsContext (maintenance request counts)
 * - UnreadMessagesContext (message counts)
 * - Real-time subscriptions for automatic updates
 *
 * Benefits:
 * - Single source of truth for notification badges
 * - Shared subscription logic (one connection instead of multiple)
 * - Reduced re-renders (one context instead of multiple)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUnifiedAuth } from './UnifiedAuthContext';
import { log } from '../lib/log';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface AppStateContextValue {
  // Maintenance requests (for landlords)
  newRequestsCount: number;      // "submitted" - never reviewed
  pendingRequestsCount: number;  // "pending" - seen but not resolved

  // Messages (for both roles)
  unreadMessagesCount: number;

  // Actions
  refreshCounts: () => Promise<void>;
  refreshNotificationCounts: () => Promise<void>; // Alias for refreshCounts
  markMessageAsRead: (messageId: string) => Promise<void>;

  // Loading/error state
  isLoading: boolean;
  error: string | null;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const { user, isSignedIn } = useUnifiedAuth();

  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for subscriptions
  const requestsChannel = useRef<RealtimeChannel | null>(null);
  const messagesChannel = useRef<RealtimeChannel | null>(null);

  /**
   * Fetch maintenance request counts (landlords only)
   */
  const fetchRequestCounts = useCallback(async () => {
    if (!user || user.role !== 'landlord') {
      setNewRequestsCount(0);
      setPendingRequestsCount(0);
      return;
    }

    try {
      // Get all maintenance requests for landlord's properties
      const { data: requests, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('status, property_id, properties!inner(landlord_id)')
        .eq('properties.landlord_id', user.id);

      if (requestsError) {
        throw requestsError;
      }

      // Count new requests (status = 'submitted')
      const newCount = (requests || []).filter((r: any) => r.status === 'submitted').length;

      // Count pending requests (status = 'pending')
      const pendingCount = (requests || []).filter((r: any) => r.status === 'pending').length;

      setNewRequestsCount(newCount);
      setPendingRequestsCount(pendingCount);

      log.debug('AppState: Request counts updated', { newCount, pendingCount });
    } catch (err) {
      log.error('AppState: Failed to fetch request counts:', err);
    }
  }, [user]);

  /**
   * Fetch unread message count (both roles)
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (countError) {
        throw countError;
      }

      setUnreadMessagesCount(count || 0);
      log.debug('AppState: Unread count updated', { count });
    } catch (err) {
      log.error('AppState: Failed to fetch unread count:', err);
    }
  }, [user]);

  /**
   * Refresh all counts
   */
  const refreshCounts = useCallback(async () => {
    if (!isSignedIn || !user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchRequestCounts(),
        fetchUnreadCount(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh counts';
      setError(errorMessage);
      log.error('AppState: Refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user, fetchRequestCounts, fetchUnreadCount]);

  /**
   * Mark message as read (optimistic update)
   */
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) {
      return;
    }

    // Optimistic update
    setUnreadMessagesCount(prev => Math.max(0, prev - 1));

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('recipient_id', user.id);

      if (updateError) {
        throw updateError;
      }

      log.debug('AppState: Message marked as read', { messageId });
    } catch (err) {
      log.error('AppState: Failed to mark message as read:', err);
      // Rollback optimistic update
      await fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  /**
   * Initial fetch on mount and when user changes
   */
  useEffect(() => {
    if (isSignedIn && user) {
      refreshCounts();
    } else {
      // Clear counts when signed out
      setNewRequestsCount(0);
      setPendingRequestsCount(0);
      setUnreadMessagesCount(0);
    }
  }, [isSignedIn, user, refreshCounts]);

  /**
   * Set up real-time subscriptions for automatic updates
   */
  useEffect(() => {
    if (!isSignedIn || !user) {
      return;
    }

    // Subscribe to maintenance requests (landlords only)
    if (user.role === 'landlord') {
      requestsChannel.current = supabase
        .channel(`requests:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests',
            filter: `property_id=in.(SELECT id FROM properties WHERE landlord_id='${user.id}')`,
          },
          () => {
            log.debug('AppState: Maintenance request changed, refreshing counts');
            fetchRequestCounts();
          }
        )
        .subscribe();
    }

    // Subscribe to messages (both roles)
    messagesChannel.current = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          log.debug('AppState: Message changed, refreshing counts');
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      if (requestsChannel.current) {
        supabase.removeChannel(requestsChannel.current);
        requestsChannel.current = null;
      }
      if (messagesChannel.current) {
        supabase.removeChannel(messagesChannel.current);
        messagesChannel.current = null;
      }
    };
  }, [isSignedIn, user, fetchRequestCounts, fetchUnreadCount]);

  const value: AppStateContextValue = {
    newRequestsCount,
    pendingRequestsCount,
    unreadMessagesCount,
    refreshCounts,
    refreshNotificationCounts: refreshCounts, // Alias for backwards compatibility
    markMessageAsRead,
    isLoading,
    error,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};
