import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { haptics } from '../lib/haptics';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import { usePendingRequests } from '../context/PendingRequestsContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

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
import InviteAcceptScreen from '../screens/tenant/InviteAcceptScreen';

// Landlord Screens
import LandlordHomeScreen from '../screens/landlord/LandlordHomeScreen';
import DashboardScreen from '../screens/landlord/DashboardScreen';
import CaseDetailScreen from '../screens/landlord/CaseDetailScreen';
import LandlordCommunicationScreen from '../screens/landlord/LandlordCommunicationScreen';
import PropertyManagementScreen from '../screens/landlord/PropertyManagementScreen';
import PropertyDetailsScreen from '../screens/landlord/PropertyDetailsScreen';
import AddPropertyScreen from '../screens/landlord/AddPropertyScreen';
import PropertyAreasScreen from '../screens/landlord/PropertyAreasScreen';
import PropertyAssetsListScreen from '../screens/landlord/PropertyAssetsListScreen';
import PropertyReviewScreen from '../screens/landlord/PropertyReviewScreen';
import AddAssetScreen from '../screens/landlord/AddAssetScreen';
import PropertyBasicsScreen from '../screens/landlord/PropertyBasicsScreen';
import PropertyPhotosScreen from '../screens/landlord/PropertyPhotosScreen';
import RoomSelectionScreen from '../screens/landlord/RoomSelectionScreen';
import RoomPhotographyScreen from '../screens/landlord/RoomPhotographyScreen';
import AssetScanningScreen from '../screens/landlord/AssetScanningScreen';
import AssetDetailsScreen from '../screens/landlord/AssetDetailsScreen';
import AssetPhotosScreen from '../screens/landlord/AssetPhotosScreen';
import ReviewSubmitScreen from '../screens/landlord/ReviewSubmitScreen';
import InviteTenantScreen from '../screens/landlord/InviteTenantScreen';
import LandlordChatScreen from '../screens/landlord/LandlordChatScreen';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SecurityScreen from '../screens/shared/SecurityScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import HelpCenterScreen from '../screens/shared/HelpCenterScreen';
import ContactSupportScreen from '../screens/shared/ContactSupportScreen';

import { PropertyAreasParams, PropertyAssetsParams, PropertyReviewParams, AssetTemplate, PropertyData, InventoryItem } from '../types/property';

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
  PropertyInviteAccept: { propertyId?: string; property?: string };
  UnitSelection: {
    propertyCode: string;
    propertyName: string;
    propertyAddress: string;
  };
  PropertyWelcome: {
    propertyName: string;
    propertyAddress: string;
    wifiNetwork?: string;
    wifiPassword?: string;
  };
  PropertySearch: undefined;
  InviteAccept: {
    propertyCode: string;
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
  PropertyDetails: { property: { id: string; name: string; address: string; type: string; tenants: number; activeRequests: number; } };
  AddProperty: { draftId?: string } | undefined;
  PropertyBasics: { draftId?: string } | undefined;
  PropertyPhotos: { propertyData: PropertyData };
  RoomSelection: { propertyData: PropertyData };
  RoomPhotography: { propertyData: PropertyData };
  AssetScanning: { propertyData: PropertyData };
  AssetDetails: { propertyData: PropertyData };
  AssetPhotos: { propertyData: PropertyData };
  ReviewSubmit: { propertyData: PropertyData };
  PropertyAreas: PropertyAreasParams & { draftId?: string };
  PropertyAssets: PropertyAssetsParams & { draftId?: string; newAsset?: InventoryItem };
  PropertyReview: PropertyReviewParams;
  AddAsset: {
    areaId: string;
    areaName: string;
    template: AssetTemplate | null;
    propertyData: PropertyData;
    draftId?: string;
    propertyId?: string;
  };
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

// Stack navigator for Home tab
const LandlordHomeStack = createNativeStackNavigator();
const LandlordHomeStackNavigator = () => (
  <LandlordHomeStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordHomeStack.Screen name="LandlordHomeMain" component={LandlordHomeScreen} />
    <LandlordHomeStack.Screen name="Dashboard" component={DashboardScreen} />
    <LandlordHomeStack.Screen name="CaseDetail" component={CaseDetailScreen} />
    <LandlordHomeStack.Screen name="LandlordChat" component={LandlordChatScreen} />
    <LandlordHomeStack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
    <LandlordHomeStack.Screen name="PropertyManagement" component={PropertyManagementScreen} />
    <LandlordHomeStack.Screen name="AddProperty" component={AddPropertyScreen} />
    <LandlordHomeStack.Screen name="PropertyAreas" component={PropertyAreasScreen} />
    <LandlordHomeStack.Screen name="PropertyAssets" component={PropertyAssetsListScreen} />
    <LandlordHomeStack.Screen name="PropertyReview" component={PropertyReviewScreen} />
    <LandlordHomeStack.Screen name="AddAsset" component={AddAssetScreen} />
    <LandlordHomeStack.Screen name="InviteTenant" component={InviteTenantScreen} />
  </LandlordHomeStack.Navigator>
);

// Stack navigator for Properties tab
const LandlordPropertiesStack = createNativeStackNavigator();
const LandlordPropertiesStackNavigator = () => (
  <LandlordPropertiesStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordPropertiesStack.Screen name="PropertyManagementMain" component={PropertyManagementScreen} />
    <LandlordPropertiesStack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
    <LandlordPropertiesStack.Screen name="AddProperty" component={AddPropertyScreen} />
    <LandlordPropertiesStack.Screen name="PropertyBasics" component={PropertyBasicsScreen} />
    <LandlordPropertiesStack.Screen name="PropertyPhotos" component={PropertyPhotosScreen} />
    <LandlordPropertiesStack.Screen name="RoomSelection" component={RoomSelectionScreen} />
    <LandlordPropertiesStack.Screen name="RoomPhotography" component={RoomPhotographyScreen} />
    <LandlordPropertiesStack.Screen name="AssetScanning" component={AssetScanningScreen} />
    <LandlordPropertiesStack.Screen name="AssetDetails" component={AssetDetailsScreen} />
    <LandlordPropertiesStack.Screen name="AssetPhotos" component={AssetPhotosScreen} />
    <LandlordPropertiesStack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
    <LandlordPropertiesStack.Screen name="PropertyAreas" component={PropertyAreasScreen} />
    <LandlordPropertiesStack.Screen name="PropertyAssets" component={PropertyAssetsListScreen} />
    <LandlordPropertiesStack.Screen name="PropertyReview" component={PropertyReviewScreen} />
    <LandlordPropertiesStack.Screen name="AddAsset" component={AddAssetScreen} />
    <LandlordPropertiesStack.Screen name="InviteTenant" component={InviteTenantScreen} />
  </LandlordPropertiesStack.Navigator>
);

// Stack navigator for Messages tab
const LandlordMessagesStack = createNativeStackNavigator();
const LandlordMessagesStackNavigator = () => (
  <LandlordMessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordMessagesStack.Screen name="LandlordMessagesMain" component={LandlordCommunicationScreen} />
    <LandlordMessagesStack.Screen name="LandlordChat" component={LandlordChatScreen} />
  </LandlordMessagesStack.Navigator>
);

// Stack navigator for Requests tab
const LandlordRequestsStack = createNativeStackNavigator();
const LandlordRequestsStackNavigator = () => (
  <LandlordRequestsStack.Navigator screenOptions={{ headerShown: false }}>
    <LandlordRequestsStack.Screen name="LandlordRequestsMain" component={DashboardScreen} />
    <LandlordRequestsStack.Screen name="CaseDetail" component={CaseDetailScreen} />
    <LandlordRequestsStack.Screen name="LandlordChat" component={LandlordChatScreen} />
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

const LandlordNavigator = () => {
  const { unreadCount } = useUnreadMessages();
  const { newCount, pendingCount } = usePendingRequests();

  // Badge logic: red for new requests, orange for pending (if no new)
  const requestBadgeCount = newCount > 0 ? newCount : (pendingCount > 0 ? pendingCount : undefined);
  const requestBadgeColor = newCount > 0 ? '#E74C3C' : '#F39C12';

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
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
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
        }}
      />
    </LandlordTab.Navigator>
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
    <TenantHomeStack.Screen name="InviteAccept" component={InviteAcceptScreen} />
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

interface TenantNavigatorProps {
  pendingInvitePropertyId?: string | null;
}

const TenantNavigator: React.FC<TenantNavigatorProps> = ({ pendingInvitePropertyId }) => {
  const { unreadCount } = useUnreadMessages();

  // For pending invites, we'll handle the initial navigation in the Home stack
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
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
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
  pendingInvitePropertyId?: string | null;
}

const MainStack: React.FC<MainStackProps> = ({ userRole, pendingInvitePropertyId }) => {
  // Register for push notifications (must be inside NavigationContainer)
  usePushNotifications();

  return userRole === 'tenant' ? (
    <TenantNavigator pendingInvitePropertyId={pendingInvitePropertyId} />
  ) : (
    <LandlordNavigator />
  );
};

export default MainStack;
