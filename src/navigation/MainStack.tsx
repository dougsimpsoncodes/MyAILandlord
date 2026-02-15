import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';
import { haptics } from '../lib/haptics';
import { useAppState } from '../context/AppStateContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useUnifiedAuth } from '../context/UnifiedAuthContext';

// Tenant Screens
import HomeScreen from '../screens/tenant/HomeScreen';
import MaintenanceStatusScreen from '../screens/tenant/MaintenanceStatusScreen';
import ReportIssueScreen from '../screens/tenant/ReportIssueScreen';
import ReviewIssueScreen from '../screens/tenant/ReviewIssueScreen';
import SubmissionSuccessScreen from '../screens/tenant/SubmissionSuccessScreen';
import FollowUpScreen from '../screens/tenant/FollowUpScreen';
import ConfirmSubmissionScreen from '../screens/tenant/ConfirmSubmissionScreen';
import CommunicationHubScreen from '../screens/tenant/CommunicationHubScreen';
import PropertyInfoScreen from '../screens/tenant/PropertyInfoScreen';
import PropertyCodeEntryScreen from '../screens/tenant/PropertyCodeEntryScreen';
import PropertyWelcomeScreen from '../screens/tenant/PropertyWelcomeScreen';
import PropertyInviteAcceptScreen from '../screens/tenant/PropertyInviteAcceptScreen';

// Landlord Screens
import LandlordHomeScreen from '../screens/landlord/LandlordHomeScreen';
import DashboardScreen from '../screens/landlord/DashboardScreen';
import CaseDetailScreen from '../screens/landlord/CaseDetailScreen';
import LandlordCommunicationScreen from '../screens/landlord/LandlordCommunicationScreen';
import PropertyManagementScreen from '../screens/landlord/PropertyManagementScreen';
import PropertyDetailsScreen from '../screens/landlord/PropertyDetailsScreen';
import PropertyAreasScreen from '../screens/landlord/PropertyAreasScreen';
import PropertyAssetsListScreen from '../screens/landlord/PropertyAssetsListScreen';
import PropertyReviewScreen from '../screens/landlord/PropertyReviewScreen';
import AddAssetScreen from '../screens/landlord/AddAssetScreen';
import PropertyBasicsScreen from '../screens/landlord/PropertyBasicsScreen';
import PropertyAttributesScreen from '../screens/landlord/PropertyAttributesScreen';
import PropertyPhotosScreen from '../screens/landlord/PropertyPhotosScreen';
import RoomSelectionScreen from '../screens/landlord/RoomSelectionScreen';
import RoomPhotographyScreen from '../screens/landlord/RoomPhotographyScreen';
import AssetScanningScreen from '../screens/landlord/AssetScanningScreen';
import AssetDetailsScreen from '../screens/landlord/AssetDetailsScreen';
import AssetPhotosScreen from '../screens/landlord/AssetPhotosScreen';
import ReviewSubmitScreen from '../screens/landlord/ReviewSubmitScreen';
import InviteTenantScreen from '../screens/landlord/InviteTenantScreen';
import LandlordChatScreen from '../screens/landlord/LandlordChatScreen';

// Landlord Onboarding Screens
import {
  LandlordPropertyIntroScreen,
  LandlordTenantInviteScreen,
  LandlordOnboardingSuccessScreen,
} from '../screens/onboarding';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SecurityScreen from '../screens/shared/SecurityScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import HelpCenterScreen from '../screens/shared/HelpCenterScreen';
import ContactSupportScreen from '../screens/shared/ContactSupportScreen';

import { InventoryItem } from '../types/property';

// ============ TYPE DEFINITIONS ============

export type TenantTabParamList = {
  TenantHome: undefined;
  TenantRequests: undefined;
  TenantMessages: undefined;
  TenantProfile: { userRole?: 'landlord' | 'tenant' } | undefined;
};

export type TenantStackParamList = {
  TenantTabs: undefined;
  Home: undefined;
  MaintenanceStatus: undefined;
  ReportIssue: undefined;
  ReviewIssue: {
    reviewData: {
      propertyId?: string;
      propertyName?: string;
      unitNumber?: string;
      area: string;
      asset: string;
      issueType: string;
      priority: string;
      duration: string;
      timing: string;
      additionalDetails: string;
      mediaItems: string[];
      title: string;
    }
  };
  SubmissionSuccess: {
    summary?: {
      title: string;
      area: string;
      asset: string;
      issueType: string;
      priority: string;
    };
  } | undefined;
  FollowUp: { issueId: string };
  ConfirmSubmission: { issueId: string };
  CommunicationHub: undefined;
  PropertyInfo: {
    propertyId?: string;
    address?: string;
    name?: string;
    wifiNetwork?: string;
    wifiPassword?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  } | undefined;
  PropertyCodeEntry: undefined;
  PropertyInviteAccept: { t?: string; token?: string; propertyId?: string; property?: string };
  PropertyWelcome: {
    propertyName: string;
    propertyAddress: string;
    wifiNetwork?: string;
    wifiPassword?: string;
  };
};

export type LandlordTabParamList = {
  LandlordHome: undefined;
  LandlordRequests: undefined;
  LandlordProperties: undefined;
  LandlordMessages: undefined;
  LandlordProfile: { userRole?: 'landlord' | 'tenant' } | undefined;
};

export type LandlordStackParamList = {
  LandlordTabs: undefined;
  Home: undefined;
  Dashboard: undefined;
  CaseDetail: { caseId: string };
  Communications: undefined;
  PropertyManagement: undefined;
  PropertyDetails: { propertyId: string };
  AddProperty: { draftId?: string } | undefined;
  // New flow screens - use draftId only (no object params)
  PropertyBasics: { draftId?: string; propertyId?: string; isOnboarding?: boolean; firstName?: string } | undefined;
  PropertyAttributes: { draftId: string; isOnboarding?: boolean; firstName?: string };
  PropertyAreas: { draftId?: string; propertyId?: string; isOnboarding?: boolean; firstName?: string };
  // draftId is required for new properties, propertyId for existing properties (at least one required)
  PropertyAssets: { draftId?: string; propertyId?: string; newAsset?: InventoryItem };
  // draftId for new properties (onboarding), propertyId for existing properties (at least one required)
  PropertyReview: { draftId?: string; propertyId?: string };
  AddAsset: {
    draftId?: string;  // Optional for existing properties
    areaId: string;
    areaName: string;
    propertyId?: string;
    templateId?: string; // Pass template ID instead of object (look up from templates list)
  };
  // Legacy flow screens (may be deprecated - kept for backward compat)
  PropertyPhotos: { draftId: string };
  RoomSelection: { draftId: string };
  RoomPhotography: { draftId: string };
  AssetScanning: { draftId: string };
  AssetDetails: { draftId: string };
  AssetPhotos: { draftId: string };
  ReviewSubmit: { draftId: string };
  InviteTenant: {
    propertyId: string;
    propertyName: string;
    propertyCode?: string;
  };
  LandlordChat: {
    tenantId: string;
    tenantName: string;
    tenantEmail?: string;
  };
};

// ============ TAB BAR STYLES ============

const tabBarStyles = {
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabBarActiveTintColor: '#3498DB',
  tabBarInactiveTintColor: '#7F8C8D',
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
};

// ============ LANDLORD NAVIGATION ============

const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();

// ============ SHARED SCREEN GROUPS ============
// These functions return screen definitions used across multiple stacks.
// Define once, use everywhere - prevents duplication bugs.

/**
 * Property flow screens shared between Home tab, Properties tab, and Onboarding.
 * Includes: PropertyBasics, PropertyAreas, PropertyAssets, PropertyReview, AddAsset, InviteTenant, PropertyDetails
 */
const LandlordPropertyFlowScreens = (Stack: ReturnType<typeof createNativeStackNavigator>) => (
  <>
    <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
    <Stack.Screen name="PropertyBasics" component={PropertyBasicsScreen} />
    <Stack.Screen name="PropertyAreas" component={PropertyAreasScreen} />
    <Stack.Screen name="PropertyAssets" component={PropertyAssetsListScreen} />
    <Stack.Screen name="PropertyReview" component={PropertyReviewScreen} />
    <Stack.Screen name="AddAsset" component={AddAssetScreen} />
    <Stack.Screen name="InviteTenant" component={InviteTenantScreen} />
  </>
);

/**
 * Case/chat screens shared between Home tab, Requests tab, and Messages tab.
 */
const LandlordCaseScreens = (Stack: ReturnType<typeof createNativeStackNavigator>) => (
  <>
    <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    <Stack.Screen name="LandlordChat" component={LandlordChatScreen} />
  </>
);

// ============ TAB STACK NAVIGATORS ============

// Stack navigator for Home tab
const LandlordHomeStack = createNativeStackNavigator();
const LandlordHomeStackNavigator = () => (
  <LandlordHomeStack.Navigator screenOptions={{ headerShown: false }}>
    {/* Tab-specific main screen */}
    <LandlordHomeStack.Screen name="LandlordHomeMain" component={LandlordHomeScreen} />
    <LandlordHomeStack.Screen name="Dashboard" component={DashboardScreen} />
    <LandlordHomeStack.Screen name="PropertyManagement" component={PropertyManagementScreen} />
    {/* Shared screens */}
    {LandlordPropertyFlowScreens(LandlordHomeStack)}
    {LandlordCaseScreens(LandlordHomeStack)}
  </LandlordHomeStack.Navigator>
);

// Stack navigator for Properties tab
const LandlordPropertiesStack = createNativeStackNavigator();
const LandlordPropertiesStackNavigator = () => (
  <LandlordPropertiesStack.Navigator screenOptions={{ headerShown: false }}>
    {/* Tab-specific main screen */}
    <LandlordPropertiesStack.Screen name="PropertyManagementMain" component={PropertyManagementScreen} />
    {/* Legacy route name - maps to PropertyBasics for backwards compatibility */}
    <LandlordPropertiesStack.Screen name="AddProperty" component={PropertyBasicsScreen} />
    {/* Shared screens */}
    {LandlordPropertyFlowScreens(LandlordPropertiesStack)}
    {/* Properties-specific screens (extended property setup flow) */}
    <LandlordPropertiesStack.Screen name="PropertyAttributes" component={PropertyAttributesScreen} />
    <LandlordPropertiesStack.Screen name="PropertyPhotos" component={PropertyPhotosScreen} />
    <LandlordPropertiesStack.Screen name="RoomSelection" component={RoomSelectionScreen} />
    <LandlordPropertiesStack.Screen name="RoomPhotography" component={RoomPhotographyScreen} />
    <LandlordPropertiesStack.Screen name="AssetScanning" component={AssetScanningScreen} />
    <LandlordPropertiesStack.Screen name="AssetDetails" component={AssetDetailsScreen} />
    <LandlordPropertiesStack.Screen name="AssetPhotos" component={AssetPhotosScreen} />
    <LandlordPropertiesStack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
  </LandlordPropertiesStack.Navigator>
);

// Stack navigator for Messages tab
const LandlordMessagesStack = createNativeStackNavigator();
const LandlordMessagesStackNavigator = () => (
  <LandlordMessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordMessagesStack.Screen name="LandlordMessagesMain" component={LandlordCommunicationScreen} />
    {/* Shared case/chat screens */}
    {LandlordCaseScreens(LandlordMessagesStack)}
  </LandlordMessagesStack.Navigator>
);

// Stack navigator for Requests tab
const LandlordRequestsStack = createNativeStackNavigator();
const LandlordRequestsStackNavigator = () => (
  <LandlordRequestsStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordRequestsStack.Screen name="LandlordRequestsMain" component={DashboardScreen} />
    {/* Shared case/chat screens */}
    {LandlordCaseScreens(LandlordRequestsStack)}
  </LandlordRequestsStack.Navigator>
);

// Stack navigator for Profile tab
const LandlordProfileStack = createNativeStackNavigator();
const LandlordProfileStackNavigator = () => (
  <LandlordProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordProfileStack.Screen
      name="LandlordProfileMain"
      component={ProfileScreen}
      initialParams={{ userRole: 'landlord' }}
    />
    <LandlordProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <LandlordProfileStack.Screen name="Security" component={SecurityScreen} />
    <LandlordProfileStack.Screen name="Notifications" component={NotificationsScreen} />
    <LandlordProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} />
    <LandlordProfileStack.Screen name="ContactSupport" component={ContactSupportScreen} />
  </LandlordProfileStack.Navigator>
);

// Landlord Tabs (the main app once onboarding is complete)
const LandlordTabsNavigator = () => {
  const { unreadMessagesCount, newRequestsCount, pendingRequestsCount } = useAppState();

  // Badge logic: red for new requests, orange for pending (if no new)
  const requestBadgeCount = newRequestsCount > 0 ? newRequestsCount : (pendingRequestsCount > 0 ? pendingRequestsCount : undefined);
  const requestBadgeColor = newRequestsCount > 0 ? '#E74C3C' : '#F39C12';

  return (
    <LandlordTab.Navigator
      screenOptions={{
        headerShown: false,
        ...tabBarStyles,
      }}
      screenListeners={{
        tabPress: () => {
          haptics.light();
        },
      }}
    >
      <LandlordTab.Screen
        name="LandlordHome"
        component={LandlordHomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          // Expose accessibilityLabel for E2E testing
          tabBarAccessibilityLabel: 'nav-dashboard',
        }}
      />
      <LandlordTab.Screen
        name="LandlordRequests"
        component={LandlordRequestsStackNavigator}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct" size={size} color={color} />
          ),
          tabBarBadge: requestBadgeCount,
          tabBarBadgeStyle: {
            backgroundColor: requestBadgeColor,
            fontSize: 11,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <LandlordTab.Screen
        name="LandlordProperties"
        component={LandlordPropertiesStackNavigator}
        options={{
          tabBarLabel: 'Properties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
          // Expose accessibilityLabel for E2E testing
          tabBarAccessibilityLabel: 'nav-properties',
        }}
      />
      <LandlordTab.Screen
        name="LandlordMessages"
        component={LandlordMessagesStackNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarBadge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#E74C3C',
            fontSize: 11,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <LandlordTab.Screen
        name="LandlordProfile"
        component={LandlordProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'nav-user-menu',
        }}
      />
    </LandlordTab.Navigator>
  );
};

// Root Landlord Navigator (includes both onboarding and main app)
const LandlordRootStack = createNativeStackNavigator();

interface LandlordNavigatorProps {
  needsOnboarding?: boolean;
  userFirstName?: string | null;
}

const LandlordNavigator: React.FC<LandlordNavigatorProps> = ({ needsOnboarding, userFirstName }) => {
  // ONE-TIME decision on mount: capture initial route and NEVER recalculate
  // Use useRef to ensure this value is set once and persists across re-renders
  const initialRouteRef = React.useRef<'LandlordPropertyIntro' | 'LandlordTabs'>(
    needsOnboarding ? 'LandlordPropertyIntro' : 'LandlordTabs'
  );

  return (
    <LandlordRootStack.Navigator
      initialRouteName={initialRouteRef.current}
      screenOptions={{ headerShown: false }}
    >
      {/* Main App (Tabs) */}
      <LandlordRootStack.Screen name="LandlordTabs" component={LandlordTabsNavigator} />

      {/* Onboarding Screens - accessible when needsOnboarding */}
      <LandlordRootStack.Screen
        name="LandlordPropertyIntro"
        component={LandlordPropertyIntroScreen}
        initialParams={{ firstName: userFirstName || 'there' }}
      />
      <LandlordRootStack.Screen
        name="PropertyBasics"
        component={PropertyBasicsScreen}
      />
      <LandlordRootStack.Screen
        name="PropertyAttributes"
        component={PropertyAttributesScreen}
      />
      <LandlordRootStack.Screen
        name="PropertyAreas"
        component={PropertyAreasScreen}
      />
      <LandlordRootStack.Screen
        name="PropertyAssets"
        component={PropertyAssetsListScreen}
      />
      <LandlordRootStack.Screen
        name="PropertyReview"
        component={PropertyReviewScreen}
      />
      <LandlordRootStack.Screen
        name="AddAsset"
        component={AddAssetScreen}
      />
      <LandlordRootStack.Screen
        name="LandlordTenantInvite"
        component={LandlordTenantInviteScreen}
      />
      <LandlordRootStack.Screen
        name="LandlordOnboardingSuccess"
        component={LandlordOnboardingSuccessScreen}
      />
    </LandlordRootStack.Navigator>
  );
};

// ============ TENANT NAVIGATION ============

const TenantTab = createBottomTabNavigator<TenantTabParamList>();

// Stack navigator for Home tab (includes maintenance request flow)
const TenantHomeStack = createNativeStackNavigator();
const TenantHomeStackNavigator = () => (
  <TenantHomeStack.Navigator screenOptions={{ headerShown: false }}>
    <TenantHomeStack.Screen name="TenantHomeMain" component={HomeScreen} />
    <TenantHomeStack.Screen name="ReportIssue" component={ReportIssueScreen} />
    <TenantHomeStack.Screen name="ReviewIssue" component={ReviewIssueScreen} />
    <TenantHomeStack.Screen name="SubmissionSuccess" component={SubmissionSuccessScreen} />
    <TenantHomeStack.Screen name="FollowUp" component={FollowUpScreen} />
    <TenantHomeStack.Screen name="ConfirmSubmission" component={ConfirmSubmissionScreen} />
    <TenantHomeStack.Screen name="PropertyCodeEntry" component={PropertyCodeEntryScreen} />
    <TenantHomeStack.Screen name="PropertyInviteAccept" component={PropertyInviteAcceptScreen} />
    <TenantHomeStack.Screen name="PropertyWelcome" component={PropertyWelcomeScreen} />
    <TenantHomeStack.Screen name="PropertyInfo" component={PropertyInfoScreen} />
    <TenantHomeStack.Screen name="CommunicationHub" component={CommunicationHubScreen} />
  </TenantHomeStack.Navigator>
);

// Stack navigator for Requests tab
const TenantRequestsStack = createNativeStackNavigator();
const TenantRequestsStackNavigator = () => (
  <TenantRequestsStack.Navigator screenOptions={{ headerShown: false }}>
    <TenantRequestsStack.Screen name="TenantRequestsMain" component={MaintenanceStatusScreen} />
    <TenantRequestsStack.Screen name="FollowUp" component={FollowUpScreen} />
  </TenantRequestsStack.Navigator>
);

// Stack navigator for Messages tab
const TenantMessagesStack = createNativeStackNavigator();
const TenantMessagesStackNavigator = () => (
  <TenantMessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <TenantMessagesStack.Screen name="TenantMessagesMain" component={CommunicationHubScreen} />
  </TenantMessagesStack.Navigator>
);

// Stack navigator for Profile tab
const TenantProfileStack = createNativeStackNavigator();
const TenantProfileStackNavigator = () => (
  <TenantProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <TenantProfileStack.Screen
      name="TenantProfileMain"
      component={ProfileScreen}
      initialParams={{ userRole: 'tenant' }}
    />
    <TenantProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <TenantProfileStack.Screen name="Security" component={SecurityScreen} />
    <TenantProfileStack.Screen name="Notifications" component={NotificationsScreen} />
    <TenantProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} />
    <TenantProfileStack.Screen name="ContactSupport" component={ContactSupportScreen} />
  </TenantProfileStack.Navigator>
);

const TenantNavigator: React.FC = () => {
  const { unreadMessagesCount } = useAppState();

  return (
    <TenantTab.Navigator
      screenOptions={{
        headerShown: false,
        ...tabBarStyles,
        tabBarActiveTintColor: '#2ECC71', // Green for tenant
      }}
      screenListeners={{
        tabPress: () => {
          haptics.light();
        },
      }}
    >
      <TenantTab.Screen
        name="TenantHome"
        component={TenantHomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <TenantTab.Screen
        name="TenantRequests"
        component={TenantRequestsStackNavigator}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct" size={size} color={color} />
          ),
        }}
      />
      <TenantTab.Screen
        name="TenantMessages"
        component={TenantMessagesStackNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarBadge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#E74C3C',
            fontSize: 11,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <TenantTab.Screen
        name="TenantProfile"
        component={TenantProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </TenantTab.Navigator>
  );
};

// ============ MAIN STACK ============

interface MainStackProps {
  userRole: 'tenant' | 'landlord';
  needsOnboarding?: boolean;
  userFirstName?: string | null;
}

const MainStackComponent: React.FC<MainStackProps> = ({
  userRole,
  needsOnboarding,
  userFirstName
}) => {
  // Register for push notifications (must be inside NavigationContainer)
  usePushNotifications();

  return userRole === 'tenant' ? (
    <TenantNavigator />
  ) : (
    <LandlordNavigator needsOnboarding={needsOnboarding} userFirstName={userFirstName} />
  );
};

// Wrapper to extract route.params and pass to MainStackComponent
interface MainStackRouteParams {
  userRole: 'tenant' | 'landlord';
  needsOnboarding?: boolean;
  userFirstName?: string | null;
}

const MainStack = ({ route }: { route: { params?: MainStackRouteParams } }) => {
  const { user } = useUnifiedAuth();

  // Deep-link paths can mount Main without explicit route params.
  // Do not default to tenant while auth/profile role is still hydrating.
  const resolvedRole = route.params?.userRole ?? user?.role ?? null;

  if (!resolvedRole) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  const needsOnboarding = route.params?.needsOnboarding ?? (user ? !user.onboarding_completed : undefined);
  const userFirstName = route.params?.userFirstName ?? user?.name?.split(' ')[0] ?? null;

  return (
    <MainStackComponent
      userRole={resolvedRole}
      needsOnboarding={needsOnboarding}
      userFirstName={userFirstName}
    />
  );
};

export default MainStack;
