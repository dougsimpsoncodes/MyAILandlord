/**
 * @deprecated This context is deprecated. Use UnifiedAuthContext instead.
 * User profile data is now managed by UnifiedAuthContext which provides:
 * - user: Contains all profile data (id, email, name, role, etc.)
 * - refreshUser() / refreshProfile(): Refresh user data
 * - updateProfile(): Update user profile
 * - updateProfileCache(): Optimistic update for local state
 *
 * Migration: Replace `useProfile()` with `useUnifiedAuth()` and use `user` object.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedAuth } from './UnifiedAuthContext';
import { useApiClient } from '../services/api/client';
import { log } from '../lib/log';

// Profile data from the profiles table
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | null;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileContextValue {
  profile: UserProfile | null | undefined;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfileCache: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: undefined,
  isLoading: true,
  error: null,
  refreshProfile: async () => {},
  updateProfileCache: () => {},
  clearProfile: () => {},
});

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { user, isSignedIn, isLoading: authLoading } = useUnifiedAuth();
  const apiClient = useApiClient();

  // CRITICAL: Use undefined as initial state to distinguish "not checked" from "checked and not found"
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache management
  const lastFetchTime = useRef<number>(0);
  const fetchInProgress = useRef<boolean>(false);

  const fetchProfile = useCallback(async (force = false) => {
    // CRITICAL: Set loading immediately at the start to prevent race conditions
    setIsLoading(true);

    // Don't fetch if not signed in or API client not ready
    // Keep profile as undefined ("not checked") so consumers wait instead of assuming "no profile"
    if (!isSignedIn || !user || !apiClient) {
      setProfile(undefined);
      setIsLoading(false);
      return;
    }

    // Check cache validity (unless forced refresh)
    const now = Date.now();
    if (!force && lastFetchTime.current > 0 && (now - lastFetchTime.current) < CACHE_TTL_MS) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      return;
    }

    fetchInProgress.current = true;
    setError(null);

    try {
      log.info('ProfileContext: Fetching profile...');
      const profileData = await apiClient.getUserProfile();

      if (profileData) {
        const mappedProfile: UserProfile = {
          id: profileData.id,
          email: profileData.email || user.email,
          name: profileData.name || user.name,
          role: profileData.role as 'landlord' | 'tenant' | null,
          avatarUrl: profileData.avatar_url ?? undefined,
          createdAt: profileData.created_at ?? undefined,
          updatedAt: profileData.updated_at ?? undefined,
        };
        setProfile(mappedProfile);
        lastFetchTime.current = now;
        log.info('ProfileContext: Profile cached', { role: mappedProfile.role });
      } else {
        // No profile exists yet
        setProfile(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      log.error('ProfileContext: Error fetching profile', { error: message });
      setError(message);
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [isSignedIn, apiClient, user]);

  // Initial fetch when auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  // Clear profile on sign out
  useEffect(() => {
    if (!isSignedIn) {
      setProfile(undefined); // Reset to "not checked" state
      lastFetchTime.current = 0;
      setError(null);
      setIsLoading(false);
    }
  }, [isSignedIn]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(true);
  }, [fetchProfile]);

  // Update local cache without API call (for optimistic updates)
  const updateProfileCache = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(undefined); // Reset to "not checked" state
    lastFetchTime.current = 0;
    setError(null);
  }, []);

  const value: ProfileContextValue = {
    profile,
    isLoading: authLoading || isLoading,
    error,
    refreshProfile,
    updateProfileCache,
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
