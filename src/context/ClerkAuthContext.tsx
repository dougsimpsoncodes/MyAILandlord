import React, { createContext, useContext } from 'react';
import { ClerkProvider, useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

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
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const appUser = user ? {
    id: user.id,
    name: user.fullName || user.firstName || 'User',
    email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || '',
    avatar: user.imageUrl || undefined,
  } : null;

  // Properly handle signOut function
  const signOut = async () => {
    if (clerk && clerk.signOut) {
      return await clerk.signOut();
    }
  };

  return {
    user: appUser,
    isLoading: !isLoaded,
    isSignedIn,
    signOut,
  };
}