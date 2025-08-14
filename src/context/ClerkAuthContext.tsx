import React, { createContext, useContext, useEffect } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { bindClerkTokenGetter } from '../services/supabase/config';

// Secure token storage for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

interface ClerkWrapperProps {
  children: React.ReactNode;
}

export const ClerkWrapper: React.FC<ClerkWrapperProps> = ({ children }) => {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env file.'
    );
  }

  return (
    <ClerkProvider 
      tokenCache={tokenCache} 
      publishableKey={publishableKey}
    >
      <ClerkSupabaseBridge>
        {children}
      </ClerkSupabaseBridge>
    </ClerkProvider>
  );
};

const ClerkSupabaseBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    bindClerkTokenGetter(async () => {
      try {
        return await getToken({ template: 'supabase' });
      } catch (_e) {
        return null;
      }
    });
  }, [isLoaded, getToken]);

  return <>{children}</>;
};

// Custom hook that combines Clerk's auth with your app's user structure
export function useAppAuth() {
  const { isSignedIn, signOut, isLoaded } = useAuth();
  const { user } = useUser();

  const appUser = user ? {
    id: user.id,
    name: user.fullName || user.firstName || 'User',
    email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || '',
    avatar: user.imageUrl || undefined,
  } : null;

  return {
    user: appUser,
    isLoading: !isLoaded,
    isSignedIn,
    signOut,
  };
}