import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useApiClient } from '../services/api/client';
import { useUnifiedAuth } from './UnifiedAuthContext';
import { useProfile } from './ProfileContext';
import { supabase } from '../services/supabase/config';
import log from '../lib/log';

interface PendingRequestsContextType {
  newCount: number;      // "submitted" - never reviewed
  pendingCount: number;  // "pending" - seen but not resolved
  refreshPendingCount: () => Promise<void>;
}

const PendingRequestsContext = createContext<PendingRequestsContextType>({
  newCount: 0,
  pendingCount: 0,
  refreshPendingCount: async () => {},
});

export const usePendingRequests = () => useContext(PendingRequestsContext);

interface PendingRequestsProviderProps {
  children: ReactNode;
}

export const PendingRequestsProvider: React.FC<PendingRequestsProviderProps> = ({ children }) => {
  const [newCount, setNewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const { user } = useUnifiedAuth();
  const { profile } = useProfile();
  const apiClient = useApiClient();

  const refreshPendingCount = useCallback(async () => {
    if (!apiClient || !user) {
      setNewCount(0);
      setPendingCount(0);
      return;
    }

    try {
      // Use cached profile from ProfileContext instead of API call
      if (!profile || profile.role !== 'landlord') {
        setNewCount(0);
        setPendingCount(0);
        return;
      }

      setLandlordId(profile.id);

      // Get maintenance requests for landlord's properties
      const requests = await apiClient.getMaintenanceRequests();

      // Count new requests (submitted - never reviewed)
      const newRequests = requests.filter(
        (req: any) => req.status === 'submitted'
      ).length;

      // Count pending requests (seen but not resolved)
      const pendingRequests = requests.filter(
        (req: any) => req.status === 'pending'
      ).length;

      log.info('🔧 Request counts updated', { new: newRequests, pending: pendingRequests, total: requests.length });
      setNewCount(newRequests);
      setPendingCount(pendingRequests);
    } catch (error) {
      log.error('Error fetching pending requests count', { error: String(error) });
    }
  }, [apiClient, user, profile]);

  // Fetch pending count on mount and when user changes
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Subscribe to real-time maintenance request changes
  useEffect(() => {
    if (!landlordId) return;

    log.info('🔧 Subscribing to real-time maintenance request updates');

    const channel = supabase
      .channel(`pending-requests-${landlordId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maintenance_requests',
        },
        (payload) => {
          log.info('🔧 New maintenance request received via realtime', { requestId: payload.new?.id });
          // Refresh count when a new request arrives
          refreshPendingCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maintenance_requests',
        },
        (payload) => {
          log.info('🔧 Maintenance request updated via realtime', { requestId: payload.new?.id });
          // Refresh count when a request status changes
          refreshPendingCount();
        }
      )
      .subscribe((status) => {
        log.info('🔧 Realtime subscription status:', { status });
      });

    return () => {
      log.info('🔧 Unsubscribing from real-time maintenance request updates');
      supabase.removeChannel(channel);
    };
  }, [landlordId, refreshPendingCount]);

  return (
    <PendingRequestsContext.Provider
      value={{
        newCount,
        pendingCount,
        refreshPendingCount,
      }}
    >
      {children}
    </PendingRequestsContext.Provider>
  );
};
