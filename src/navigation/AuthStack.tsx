import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PropertyInviteAcceptScreen from '../screens/tenant/PropertyInviteAcceptScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  PropertyInviteAccept: { propertyId?: string; property?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthStackProps {
  initialInvite?: boolean;
}

const AuthStack: React.FC<AuthStackProps> = ({ initialInvite = false }) => {
  // Choose initial route based on deep link context
  const initialRouteName = initialInvite ? 'PropertyInviteAccept' : 'Welcome';
  
  console.log('🔗 AuthStack initialized with:', { initialInvite, initialRouteName });

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="PropertyInviteAccept" component={PropertyInviteAcceptScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;