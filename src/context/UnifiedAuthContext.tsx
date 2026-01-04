/**
 * UnifiedAuthContext - Consolidated authentication and profile management
 *
 * Combines the functionality of:
 * - SupabaseAuthContext (auth state, sessions)
 * - ProfileContext (user profile data)
 * - RoleContext (user role management)
 *
 * Benefits:
 * - Single source of truth for user state
 * - Atomic updates (no race conditions between auth/profile/role)
 * - Reduced re-renders (one context instead of three)
 * - Simpler component tree (one provider instead of three nested)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/log';
import { PendingInviteService } from '../services/storage/PendingInviteService';

// ============================================================================
// Types
// ============================================================================

export interface UnifiedUser {
  // Auth data (from auth.users)
  id: string;
  email: string;
  name: string;
  avatar?: string;
  user_metadata?: Record<string, any>;

  // Profile data (from profiles table)
  role: 'landlord' | 'tenant' | null;
  onboarding_completed: boolean;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Redirect type for pending invites
type RedirectType =
  | { type: 'acceptInvite'; token: string; propertyId?: string; propertyName?: string }
  | null;

interface UnifiedAuthContextValue {
  // User state
  user: UnifiedUser | null;
  isLoading: boolean;
  isSignedIn: boolean;

  // Session
  session: Session | null;

  // Actions
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateRole: (role: 'landlord' | 'tenant') => Promise<void>;

  // Pending invite state (for tenant invite flow)
  processingInvite: boolean;
  redirect: RedirectType;
  clearRedirect: () => void;

  // Error state
  error: string | null;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface UnifiedAuthProviderProps {
  children: React.ReactNode;
}

const ROLE_STORAGE_KEY = '@MyAILandlord:userRole';

export const UnifiedAuthProvider: React.FC<UnifiedAuthProviderProps> = ({ children }) => {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending invite state (for tenant invite flow)
  const [processingInvite, setProcessingInvite] = useState(false);
  const [redirect, setRedirect] = useState<RedirectType>(null);

  // Refs to prevent concurrent operations
  const fetchInProgress = useRef(false);
  const initialized = useRef(false);

  /**
   * Clear redirect state after handling
   */
  const clearRedirect = useCallback(() => {
    log.debug('🧭 UnifiedAuth: Clearing redirect state');
    setRedirect(null);
    setProcessingInvite(false);
  }, []);

  /**
   * Map Supabase auth user + profile data to UnifiedUser
   */
  const mapToUnifiedUser = useCallback(async (authUser: User): Promise<UnifiedUser | null> => {
    try {
      // Fetch profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, onboarding_completed, created_at, updated_at')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (profile doesn't exist yet, which is okay)
        log.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // Combine auth user + profile data
      const unifiedUser: UnifiedUser = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        avatar: authUser.user_metadata?.avatar_url,
        user_metadata: authUser.user_metadata,

        // Profile data (defaults if profile doesn't exist yet)
        role: profile?.role || null,
        onboarding_completed: profile?.onboarding_completed || false,
        createdAt: profile?.created_at,
        updatedAt: profile?.updated_at,
      };

      // Cache role in AsyncStorage for quick access
      if (unifiedUser.role) {
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, unifiedUser.role);
      }

      return unifiedUser;
    } catch (err) {
      log.error('Failed to map unified user:', err);
      return null;
    }
  }, []);

  /**
   * Refresh user data from database
   */
  const refreshUser = useCallback(async () => {
    if (!session?.user) {
      return;
    }

    if (fetchInProgress.current) {
      log.debug('UnifiedAuth: Fetch already in progress, skipping');
      return;
    }

    fetchInProgress.current = true;
    setError(null);

    try {
      const mappedUser = await mapToUnifiedUser(session.user);
      setUser(mappedUser);
      log.debug('UnifiedAuth: User refreshed', {
        userId: mappedUser?.id,
        role: mappedUser?.role,
        onboardingComplete: mappedUser?.onboarding_completed
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh user';
      setError(errorMessage);
      log.error('UnifiedAuth: Refresh failed:', err);
    } finally {
      fetchInProgress.current = false;
    }
  }, [session, mapToUnifiedUser]);

  /**
   * Update user role (optimistic update + database write)
   */
  const updateRole = useCallback(async (role: 'landlord' | 'tenant') => {
    if (!user) {
      throw new Error('No user to update');
    }

    // Optimistic update
    setUser(prev => prev ? { ...prev, role } : null);
    await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      log.debug('UnifiedAuth: Role updated', { role });

      // Refresh to get server state
      await refreshUser();
    } catch (err) {
      log.error('UnifiedAuth: Failed to update role:', err);
      // Rollback optimistic update by refreshing
      await refreshUser();
      throw err;
    }
  }, [user, refreshUser]);

  /**
   * Sign out
   */
  const signOut = useCallback(async (options?: { scope?: 'global' | 'local' | 'others' }) => {
    try {
      await supabase.auth.signOut(options);
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      setUser(null);
      setSession(null);
      log.debug('UnifiedAuth: Signed out');
    } catch (err) {
      log.error('UnifiedAuth: Sign out failed:', err);
      throw err;
    }
  }, []);

  /**
   * Check for pending invite when user becomes authenticated
   * This enables the tenant invite flow to skip role selection
   */
  useEffect(() => {
    if (authDisabled) return;

    // Only check if we have an authenticated user and auth is initialized
    if (!user?.id || isLoading) {
      return;
    }

    const checkPendingInvite = async () => {
      try {
        log.debug('🎟️ UnifiedAuth: Checking for pending invite', { userId: user.id });
        const pendingInvite = await PendingInviteService.getPendingInvite();

        if (pendingInvite && pendingInvite.type === 'token') {
          const tokenHash = pendingInvite.value.substring(0, 4) + '...' + pendingInvite.value.substring(pendingInvite.value.length - 4);
          log.info('🎟️ UnifiedAuth: Pending invite detected, setting redirect state', {
            tokenHash,
            propertyId: pendingInvite.metadata?.propertyId,
            propertyName: pendingInvite.metadata?.propertyName,
          });

          setProcessingInvite(true);
          setRedirect({
            type: 'acceptInvite',
            token: pendingInvite.value,
            propertyId: pendingInvite.metadata?.propertyId,
            propertyName: pendingInvite.metadata?.propertyName,
          });
        } else {
          log.debug('🎟️ UnifiedAuth: No pending invite found');
        }
      } catch (error) {
        log.error('🎟️ UnifiedAuth: Error checking pending invite', error as Error);
      }
    };

    checkPendingInvite();
  }, [user?.id, isLoading, authDisabled]);

  /**
   * Initialize and listen to auth state changes
   */
  useEffect(() => {
    // Development bypass
    if (authDisabled) {
      const devUser: UnifiedUser = {
        id: 'dev_user_1',
        name: 'Dev User',
        email: 'dev@example.com',
        role: 'landlord',
        onboarding_completed: true,
      };
      setUser(devUser);
      setIsLoading(false);
      initialized.current = true;
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        setSession(initialSession);

        if (initialSession?.user) {
          const mappedUser = await mapToUnifiedUser(initialSession.user);
          setUser(mappedUser);
        }
      } catch (err) {
        log.error('UnifiedAuth: Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize auth');
      } finally {
        setIsLoading(false);
        initialized.current = true;
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        log.debug('UnifiedAuth: Auth state changed', {
          event,
          hasSession: !!newSession,
          userId: newSession?.user?.id,
        });

        setSession(newSession);

        if (newSession?.user) {
          const mappedUser = await mapToUnifiedUser(newSession.user);
          setUser(mappedUser);
        } else {
          setUser(null);
          await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [authDisabled, mapToUnifiedUser]);

  const value: UnifiedAuthContextValue = {
    user,
    isLoading,
    isSignedIn: !!session,
    session,
    signOut,
    refreshUser,
    updateRole,
    processingInvite,
    redirect,
    clearRedirect,
    error,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within UnifiedAuthProvider');
  }
  return context;
};
