import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SupabaseAuthProvider } from './src/context/SupabaseAuthContext';
import { RoleProvider } from './src/context/RoleContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { UnreadMessagesProvider } from './src/context/UnreadMessagesContext';
import { PendingRequestsProvider } from './src/context/PendingRequestsContext';
import AppNavigator from './src/AppNavigator';
import { initMonitoring } from './src/lib/monitoring';

export default function App() {
  // Initialize monitoring (no-op without DSN)
  React.useEffect(() => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    initMonitoring({ dsn });
  }, []);

  return (
    <SafeAreaProvider>
      <SupabaseAuthProvider>
        <RoleProvider>
          <ProfileProvider>
            <UnreadMessagesProvider>
              <PendingRequestsProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </PendingRequestsProvider>
            </UnreadMessagesProvider>
          </ProfileProvider>
        </RoleProvider>
      </SupabaseAuthProvider>
    </SafeAreaProvider>
  );
}
