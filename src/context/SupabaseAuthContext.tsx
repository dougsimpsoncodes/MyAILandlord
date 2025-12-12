import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { log } from '../lib/log';

interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isSignedIn: false,
  signOut: async () => {},
  updateProfile: async () => {},
  session: null,
});

interface SupabaseAuthProviderProps {
  children: React.ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      log.info('🔐 Auth state changed', { event: _event, hasSession: !!session });
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUserToAppUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [authDisabled]);

  const signOut = async () => {
    if (authDisabled) {
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
    session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Map Supabase user to app user format
function mapSupabaseUserToAppUser(user: User): AppUser {
  return {
    id: user.id,
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
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
