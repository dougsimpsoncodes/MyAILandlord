import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingRoleSelectScreen from '../screens/onboarding/OnboardingRoleSelectScreen';
import LandlordSetupScreen from '../screens/onboarding/LandlordSetupScreen';
import TenantSetupScreen from '../screens/onboarding/TenantSetupScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  RoleSelect: undefined;
  LandlordSetup: undefined;
  TenantSetup: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="RoleSelect" component={OnboardingRoleSelectScreen} />
      <Stack.Screen name="LandlordSetup" component={LandlordSetupScreen} />
      <Stack.Screen name="TenantSetup" component={TenantSetupScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingStack;
