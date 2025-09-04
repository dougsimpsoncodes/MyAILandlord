import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkWrapper } from './src/context/ClerkAuthContext';
import { RoleProvider } from './src/context/RoleContext';
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
      <ClerkWrapper>
        <RoleProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </RoleProvider>
      </ClerkWrapper>
    </SafeAreaProvider>
  );
}
