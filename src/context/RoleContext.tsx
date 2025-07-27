import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppAuth } from './ClerkAuthContext';
import { useAuth } from '@clerk/clerk-expo';
import { useApiClient } from '../services/api/client';

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
  
  // Always call the hook (React rules), returns null if not authenticated
  const apiClient = useApiClient();

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
      const storedRole = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole && (storedRole === 'tenant' || storedRole === 'landlord')) {
        setUserRoleState(storedRole as UserRole);
      }
    } catch (error) {
      console.error('Failed to load stored role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserRole = async (role: UserRole) => {
    try {
      // Temporarily skip backend storage due to RLS policy issue
      // TODO: Fix RLS and re-enable backend role storage
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