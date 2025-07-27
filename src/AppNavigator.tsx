import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/ClerkAuthContext';
import { RoleContext } from './context/RoleContext';
import { useProfileSync } from './hooks/useProfileSync';
import { LoadingScreen } from './components/LoadingSpinner';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  
  // Sync Clerk user with Supabase profile
  useProfileSync();

  // Show proper loading screen during authentication check
  if (isLoading || roleLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If user is signed in but doesn't have a role, show AuthStack to select role
  const shouldShowMainStack = isSignedIn && user && userRole;

  return (
    <NavigationContainer>
      {shouldShowMainStack ? (
        <MainStack userRole={userRole} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;