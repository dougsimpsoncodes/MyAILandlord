/**
 * @deprecated This context is deprecated. Use UnifiedAuthContext instead.
 * The role is now managed by UnifiedAuthContext which provides:
 * - user.role: Current role value
 * - updateRole(role): Update the role
 *
 * Migration: Replace `useRole()` with `useUnifiedAuth()` and use `user.role` and `updateRole`.
 */
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { log } from '../lib/log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUnifiedAuth } from './UnifiedAuthContext';

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
  const { user } = useUnifiedAuth();

  useEffect(() => {
    if (user && user.id) {
      // Load existing role from local storage only
      // The actual role will be set by useProfileSync when it loads the profile
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
      log.error('Failed to load stored role', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const setUserRole = async (role: UserRole) => {
    try {
      // Store role locally for quick access
      if (role) {
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
      } else {
        await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      }
      setUserRoleState(role);
      log.info('Role set successfully', { role });
    } catch (error) {
      log.error('Failed to store role', { error: String(error) });
      throw error;
    }
  };

  const clearRole = async () => {
    try {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      setUserRoleState(null);
    } catch (error) {
      log.error('Failed to clear role', { error: String(error) });
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
