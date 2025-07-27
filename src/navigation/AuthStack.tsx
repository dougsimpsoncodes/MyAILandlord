import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import { useAppAuth } from '../context/ClerkAuthContext';
import { RoleContext } from '../context/RoleContext';

export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelect: undefined;
  Login: { role: 'tenant' | 'landlord' };
  SignUp: { role: 'tenant' | 'landlord' };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => {
  const { isSignedIn } = useAppAuth();
  const { userRole } = useContext(RoleContext);

  // If user is signed in but no role, start at role selection
  // Otherwise start at welcome screen
  const initialRoute = isSignedIn && !userRole ? "RoleSelect" : "Welcome";

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;