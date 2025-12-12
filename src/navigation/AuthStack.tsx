import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import PropertyInviteAcceptScreen from '../screens/tenant/PropertyInviteAcceptScreen';
import { log } from '../lib/log';

export type AuthStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  // Keep legacy routes for backwards compatibility
  Login: undefined;
  SignUp: undefined;
  AuthCallback: undefined;
  PropertyInviteAccept: { propertyId?: string; property?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthStackProps {
  initialInvite?: boolean;
}

const AuthStack: React.FC<AuthStackProps> = ({ initialInvite = false }) => {
  // Choose initial route based on deep link context
  const initialRouteName = initialInvite ? 'PropertyInviteAccept' : 'Welcome';

  log.info('AuthStack initialized with:', { initialInvite, initialRouteName });

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      {/* Legacy screens redirect to unified Auth screen */}
      <Stack.Screen name="Login" component={AuthScreen} />
      <Stack.Screen name="SignUp" component={AuthScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="PropertyInviteAccept" component={PropertyInviteAcceptScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
