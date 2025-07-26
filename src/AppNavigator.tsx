import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/ClerkAuthContext';
import { RoleContext } from './context/RoleContext';
import { useProfileSync } from './hooks/useProfileSync';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const { userRole } = useContext(RoleContext);
  
  // Sync Clerk user with Supabase profile
  useProfileSync();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <NavigationContainer>
      {isSignedIn && user && userRole ? (
        <MainStack userRole={userRole} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;