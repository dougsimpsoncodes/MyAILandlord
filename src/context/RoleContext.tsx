import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import { apiClient } from '../services/api/client';

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
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      // If user has role in auth context, use that
      if (user.role) {
        setUserRoleState(user.role);
        setIsLoading(false);
      } else {
        // Otherwise load from storage (fallback)
        loadStoredRole();
      }
    } else {
      // No user, clear role
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
      if (role && user) {
        // Save to backend
        await apiClient.setUserRole(role);
        
        // Save to local storage as backup
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
      throw error;
    }
  };

  const value: RoleContextType = {
    userRole,
    setUserRole,
    clearRole,
    isLoading,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};