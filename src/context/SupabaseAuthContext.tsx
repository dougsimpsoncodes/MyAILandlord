import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { log } from '../lib/log';
import { PendingInviteService } from '../services/storage/PendingInviteService';

interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  user_metadata?: Record<string, any>;
}

type RedirectType =
  | { type: 'acceptInvite'; token: string; propertyId?: string; propertyName?: string }
  | null;

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  redirect: RedirectType;
  clearRedirect: () => void;
  processingInvite: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isSignedIn: false,
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  session: null,
  redirect: null,
  clearRedirect: () => {},
  processingInvite: false,
});

interface SupabaseAuthProviderProps {
  children: React.ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirect, setRedirect] = useState<RedirectType>(null);
  const [processingInvite, setProcessingInvite] = useState(false);

  const clearRedirect = () => {
    log.info('🧭 Clearing redirect state');
    setRedirect(null);
    setProcessingInvite(false);
  };

  useEffect(() => {
    // If auth is disabled, use dev user
    if (authDisabled) {
      const devUser: AppUser = {
        id: 'dev_user_1',
        name: 'Dev',
        email: 'dev@example.com',
        avatar: undefined,
      };
      setUser(devUser);
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUserToAppUser(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      log.info('🔐 Auth state changed', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      setSession(session);

      if (session?.user) {
        const mappedUser = mapSupabaseUserToAppUser(session.user);
        log.info('🔐 Setting user from session', {
          userId: mappedUser.id,
          email: mappedUser.email,
          name: mappedUser.name,
        });
        setUser(mappedUser);
      } else {
        log.info('🔐 Clearing user (no session)');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [authDisabled]);

  // Check for pending invite when user becomes authenticated
  useEffect(() => {
    if (authDisabled) return;

    // Log the current state to debug timing
    log.info('🎟️ Auth guard: Effect triggered', {
      hasUser: !!user?.id,
      userId: user?.id,
      isLoading,
      isSignedIn: !!session,
    });

    // Early return with clear logging
    if (!user?.id) {
      log.info('🎟️ Auth guard: Skipping check - no user ID yet');
      return;
    }

    if (isLoading) {
      log.info('🎟️ Auth guard: Skipping check - still loading');
      return;
    }

    // Run the actual check
    const checkPendingInvite = async () => {
      try {
        log.info('🎟️ Auth guard: Starting async check for pending invite');
        const pendingInvite = await PendingInviteService.getPendingInvite();

        const tokenHash = pendingInvite && pendingInvite.type === 'token'
          ? pendingInvite.value.substring(0, 4) + '...' + pendingInvite.value.substring(pendingInvite.value.length - 4)
          : null;

        log.info('🎟️ Auth guard: AsyncStorage check complete', {
          userId: user.id,
          hasPendingInvite: !!pendingInvite,
          inviteType: pendingInvite?.type,
          tokenHash,
        });

        if (pendingInvite && pendingInvite.type === 'token') {
          log.info('🎟️ Auth guard: Pending invite detected, setting redirect state', {
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
          log.info('🎟️ Auth guard: No pending invite found - normal navigation will proceed');
        }
      } catch (error) {
        log.error('🎟️ Auth guard: Error checking pending invite', error as Error);
      }
    };

    checkPendingInvite();
  }, [user?.id, isLoading, session, authDisabled]);

  const signOut = async (options?: { scope?: 'global' | 'local' | 'others' }) => {
    if (authDisabled) {
      return;
    }
    await supabase.auth.signOut(options);
    // Only clear local state if signing out current session
    if (!options?.scope || options.scope !== 'others') {
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    if (authDisabled) {
      log.info('Password reset skipped in auth-disabled mode');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myailandlord://reset-password',
    });
    if (error) {
      log.error('Failed to send password reset email', { error: error.message });
      throw error;
    }
    log.info('Password reset email sent', { email });
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    if (authDisabled) {
      // For dev mode, update the local user state
      if (data.name) {
        setUser(prev => prev ? { ...prev, name: data.name! } : null);
      }
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        name: data.name,
        full_name: data.name,
        phone: data.phone,
      },
    });

    if (error) {
      log.error('Failed to update profile', { error: error.message });
      throw error;
    }

    // Update local user state immediately
    if (data.name && user) {
      setUser({ ...user, name: data.name });
    }

    log.info('Profile updated successfully', { name: data.name });
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isSignedIn: authDisabled ? true : !!session,
    signOut,
    updateProfile,
    resetPassword,
    session,
    redirect,
    clearRedirect,
    processingInvite,
  };

  // Expose guard snapshot in development for Metro diagnostics
  if (__DEV__) {
    // @ts-ignore
    (globalThis as any).__AuthDebug = {
      processingInvite,
      redirect,
      isSignedIn: authDisabled ? true : !!session,
      userId: user?.id,
    };
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Map Supabase user to app user format
function mapSupabaseUserToAppUser(user: User): AppUser {
  return {
    id: user.id,
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
    user_metadata: user.user_metadata,
  };
}

// Hook to use auth context
export function useAppAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAppAuth must be used within SupabaseAuthProvider');
  }
  return context;
}

// Export alias for backward compatibility
export const SupabaseWrapper = SupabaseAuthProvider;
