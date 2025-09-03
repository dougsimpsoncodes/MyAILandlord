import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/ClerkAuthContext';
import { RoleContext } from './context/RoleContext';
import { useProfileSync } from './hooks/useProfileSync';
import { LoadingScreen } from './components/LoadingSpinner';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  
  // Debug logging
  console.log('🧭 AppNavigator state:', { isSignedIn, userRole, isLoading, roleLoading, hasUser: !!user });
  
  // Sync Clerk user with Supabase profile
  useProfileSync();

  // Show proper loading screen during authentication check
  if (isLoading || roleLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If user is signed in but doesn't have a role, show AuthStack to select role
  const shouldShowMainStack = isSignedIn && user && userRole;
  console.log('🧭 shouldShowMainStack:', shouldShowMainStack);

  // Configure deep linking
  const linking = {
    prefixes: [
      'myailandlord://',
      'https://myailandlord.app',
      'https://www.myailandlord.app'
    ],
    config: {
      screens: {
        // Main screens (shown when authenticated with role)
        PropertyInviteAccept: 'invite',
        Home: 'home',
        PropertyCodeEntry: 'link',
        PropertyManagement: 'properties',
        InviteTenant: 'invite-tenant',
        // Tenant issue flow (web linking support)
        ReportIssue: 'report-issue',
        ReviewIssue: 'review-issue',
        // Auth screens (shown when not authenticated)
        Welcome: 'welcome',
        Login: 'login',
        SignUp: 'signup'
      }
    }
  };

  return (
    <NavigationContainer linking={linking}>
      {shouldShowMainStack ? (
        <MainStack userRole={userRole} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;