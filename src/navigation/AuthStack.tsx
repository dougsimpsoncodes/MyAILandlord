import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import PropertyInviteAcceptScreen from '../screens/tenant/PropertyInviteAcceptScreen';
import { log } from '../lib/log';

// New onboarding screens (all screens used in auth/onboarding flow)
import {
  OnboardingWelcomeScreen,
  OnboardingNameScreen,
  OnboardingAccountScreen,
  OnboardingRoleScreen,
  LandlordOnboardingWelcomeScreen,
  LandlordPropertyIntroScreen,
  LandlordTenantInviteScreen,
  LandlordOnboardingSuccessScreen,
  TenantOnboardingWelcomeScreen,
  TenantInviteRoommateScreen,
  TenantOnboardingSuccessScreen,
} from '../screens/onboarding';

// Existing property setup screens (reused in onboarding)
import PropertyBasicsScreen from '../screens/landlord/PropertyBasicsScreen';
import PropertyAttributesScreen from '../screens/landlord/PropertyAttributesScreen';
import PropertyAreasScreen from '../screens/landlord/PropertyAreasScreen';
import PropertyAssetsListScreen from '../screens/landlord/PropertyAssetsListScreen';
import PropertyReviewScreen from '../screens/landlord/PropertyReviewScreen';

export type AuthStackParamList = {
  // Legacy screen for backwards compatibility
  Welcome: undefined;
  // New onboarding flow
  OnboardingWelcome: undefined;
  OnboardingName: { fromInvite?: boolean };
  OnboardingAccount: { firstName: string; fromInvite?: boolean };
  OnboardingRole: { firstName: string; userId: string };
  // Landlord onboarding path
  LandlordOnboardingWelcome: { firstName: string; role: 'landlord' };
  LandlordPropertyIntro: { firstName: string };
  PropertyBasics: { firstName?: string; isOnboarding?: boolean };
  PropertyAttributes: { addressData: any; isOnboarding?: boolean; firstName?: string };
  PropertyAreas: {
    propertyData: any; // PropertyData type
    draftId?: string;
    propertyId?: string;
    existingAreas?: any[]; // PropertyArea[] type
    isOnboarding?: boolean;
    firstName?: string;
  };
  PropertyAssets: {
    propertyData: any; // PropertyData type
    areas: any[]; // PropertyArea[] type
    propertyId?: string;
    draftId?: string;
    isOnboarding?: boolean;
    firstName?: string;
    newAsset?: any; // InventoryItem type
  };
  PropertyReview: {
    propertyData: any; // PropertyData type
    areas: any[]; // PropertyArea[] type
    draftId?: string;
    propertyId?: string;
    isOnboarding?: boolean;
    firstName?: string;
  };
  LandlordTenantInvite: { firstName: string; propertyId: string; propertyName: string };
  LandlordOnboardingSuccess: { firstName: string };
  // Tenant onboarding path
  TenantOnboardingWelcome: { firstName: string; role: 'tenant' };
  TenantInviteRoommate: { firstName: string; propertyId: string; propertyName: string; inviteCode: string };
  TenantOnboardingSuccess: { firstName: string };
  // Existing auth screens
  AuthForm: { initialMode?: 'login' | 'signup'; forceRole?: 'tenant' | 'landlord' };
  // Keep legacy routes for backwards compatibility
  Login: undefined;
  SignUp: undefined;
  AuthCallback: undefined;
  PropertyInviteAccept: { propertyId?: string; property?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface ContinuationProps {
  firstName: string;
  role: 'landlord' | 'tenant' | null;
}

interface AuthStackProps {
  initialInvite?: boolean;
  /** For existing authenticated users who need to complete onboarding */
  continuation?: ContinuationProps;
}

const AuthStack: React.FC<AuthStackProps> = ({ initialInvite = false, continuation }) => {
  // Determine initial route based on context:
  // 1. Deep link invite → PropertyInviteAccept
  // 2. Continuation for existing landlord → LandlordPropertyIntro
  // 3. Continuation for existing tenant → TenantOnboardingWelcome
  // 4. New user → OnboardingWelcome
  let initialRouteName: keyof AuthStackParamList = 'OnboardingWelcome';
  let initialParams: Record<string, unknown> | undefined;

  if (initialInvite) {
    initialRouteName = 'PropertyInviteAccept';
  } else if (continuation) {
    if (continuation.role === 'landlord') {
      initialRouteName = 'LandlordPropertyIntro';
      initialParams = { firstName: continuation.firstName };
    } else if (continuation.role === 'tenant') {
      initialRouteName = 'TenantOnboardingWelcome';
      initialParams = { firstName: continuation.firstName, role: 'tenant' };
    }
    // If no role, fall back to OnboardingWelcome
  }

  log.info('AuthStack initialized with:', {
    initialInvite,
    continuation,
    initialRouteName,
    initialParams,
  });

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Legacy screen for backwards compatibility */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* New onboarding flow - shared screens */}
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen name="OnboardingAccount" component={OnboardingAccountScreen} />
      <Stack.Screen name="OnboardingRole" component={OnboardingRoleScreen} />

      {/* Landlord onboarding path */}
      <Stack.Screen name="LandlordOnboardingWelcome" component={LandlordOnboardingWelcomeScreen} />
      <Stack.Screen
        name="LandlordPropertyIntro"
        component={LandlordPropertyIntroScreen}
        initialParams={continuation?.role === 'landlord' ? { firstName: continuation.firstName } : undefined}
      />
      {/* Reuse existing property setup screens */}
      <Stack.Screen name="PropertyBasics" component={PropertyBasicsScreen} />
      <Stack.Screen name="PropertyAttributes" component={PropertyAttributesScreen} />
      <Stack.Screen name="PropertyAreas" component={PropertyAreasScreen} />
      <Stack.Screen name="PropertyAssets" component={PropertyAssetsListScreen} />
      <Stack.Screen name="PropertyReview" component={PropertyReviewScreen} />
      <Stack.Screen name="LandlordTenantInvite" component={LandlordTenantInviteScreen} />
      <Stack.Screen name="LandlordOnboardingSuccess" component={LandlordOnboardingSuccessScreen} />

      {/* Tenant onboarding path */}
      <Stack.Screen name="TenantOnboardingWelcome" component={TenantOnboardingWelcomeScreen} />
      <Stack.Screen name="TenantInviteRoommate" component={TenantInviteRoommateScreen} />
      <Stack.Screen name="TenantOnboardingSuccess" component={TenantOnboardingSuccessScreen} />

      {/* Existing auth screens */}
      <Stack.Screen name="AuthForm" component={AuthScreen} />
      {/* Legacy screens redirect to unified Auth screen */}
      <Stack.Screen name="Login" component={AuthScreen} />
      <Stack.Screen name="SignUp" component={AuthScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="PropertyInviteAccept" component={PropertyInviteAcceptScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
