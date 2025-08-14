import React, { createContext, useContext, useEffect } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/supabase/auth-service';

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
      {children}
    </ClerkProvider>
  );
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

  // Sync user profile with Supabase when user changes
  useEffect(() => {
    if (user && isSignedIn) {
      const syncProfile = async () => {
        try {
          await AuthService.syncUserProfile(user.id, {
            email: appUser?.email || '',
            name: appUser?.name,
            avatarUrl: appUser?.avatar,
          });
        } catch (error) {
          console.error('Failed to sync profile:', error);
        }
      };
      
      syncProfile();
    }
  }, [user, isSignedIn]);

  return {
    user: appUser,
    isLoading: !isLoaded,
    isSignedIn,
    signOut,
  };
}