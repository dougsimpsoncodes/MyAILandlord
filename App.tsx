import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkWrapper } from './src/context/ClerkAuthContext';
import { RoleProvider } from './src/context/RoleContext';
import AppNavigator from './src/AppNavigator';

export default function App() {
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