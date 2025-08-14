import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppAuth } from './ClerkAuthContext';
import { useAuth } from '@clerk/clerk-expo';
import { AuthService } from '../services/supabase/auth-service';

type UserRole = 'tenant' | 'landlord' | null;

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => Promise<void>;
  clearRole: () => Promise<void>;
  isLoading: boolean;
}

export const RoleContext = createContext<RoleContextType>({
  userRole: null,
  setUserRole: async () => {},
  clearRole: async () => {},
  isLoading: true,
});

interface RoleProviderProps {
  children: ReactNode;
}

const ROLE_STORAGE_KEY = '@MyAILandlord:userRole';

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { user } = useAppAuth();
  const { userId } = useAuth();

  useEffect(() => {
    if (user && user.id) {
      // Load existing role if user is authenticated
      if (!hasInitialized) {
        loadStoredRole();
        setHasInitialized(true);
      }
    } else {
      // No user, clear role and stop loading
      setUserRoleState(null);
      setIsLoading(false);
    }
  }, [user]);

  const loadStoredRole = async () => {
    try {
      // Try to load from Supabase first
      if (user?.id) {
        const profile = await AuthService.getUserProfile(user.id);
        if (profile?.role) {
          setUserRoleState(profile.role);
          // Also update local storage for offline access
          await AsyncStorage.setItem(ROLE_STORAGE_KEY, profile.role);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to local storage
      const storedRole = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole && (storedRole === 'tenant' || storedRole === 'landlord')) {
        setUserRoleState(storedRole as UserRole);
      }
    } catch (error) {
      console.error('Failed to load stored role:', error);
      // Fallback to local storage on error
      try {
        const storedRole = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        if (storedRole && (storedRole === 'tenant' || storedRole === 'landlord')) {
          setUserRoleState(storedRole as UserRole);
        }
      } catch (fallbackError) {
        console.error('Failed to load from local storage:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setUserRole = async (role: UserRole) => {
    try {
      // Store in both Supabase and local storage
      if (role && user?.id) {
        try {
          await AuthService.setUserRole(user.id, role);
        } catch (supabaseError) {
          console.error('Failed to store role in Supabase:', supabaseError);
          // Continue with local storage even if Supabase fails
        }
      }
      
      // Always update local storage for offline access
      if (role) {
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
      } else {
        await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      }
      
      setUserRoleState(role);
    } catch (error) {
      console.error('Failed to store role:', error);
      throw error;
    }
  };

  const clearRole = async () => {
    try {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      setUserRoleState(null);
    } catch (error) {
      console.error('Failed to clear role:', error);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        userRole,
        setUserRole,
        clearRole,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};