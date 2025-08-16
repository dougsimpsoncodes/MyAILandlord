import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/tenant/HomeScreen';
import MaintenanceStatusScreen from '../screens/tenant/MaintenanceStatusScreen';
import ReportIssueScreen from '../screens/tenant/ReportIssueScreen';
import ReviewIssueScreen from '../screens/tenant/ReviewIssueScreen';
import SubmissionSuccessScreen from '../screens/tenant/SubmissionSuccessScreen';
import FollowUpScreen from '../screens/tenant/FollowUpScreen';
import ConfirmSubmissionScreen from '../screens/tenant/ConfirmSubmissionScreen';
import CommunicationHubScreen from '../screens/tenant/CommunicationHubScreen';
import PropertyInfoScreen from '../screens/tenant/PropertyInfoScreen';
import LandlordHomeScreen from '../screens/landlord/LandlordHomeScreen';
import DashboardScreen from '../screens/landlord/DashboardScreen';
import CaseDetailScreen from '../screens/landlord/CaseDetailScreen';
import SendToVendorScreen from '../screens/landlord/SendToVendorScreen';
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
import { PropertyAreasParams, PropertyAssetsParams, PropertyReviewParams, AssetTemplate, PropertyData, InventoryItem } from '../types/property';

export type TenantStackParamList = {
  Home: undefined;
  MaintenanceStatus: undefined;
  ReportIssue: undefined;
  ReviewIssue: { 
    reviewData: {
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
  SubmissionSuccess: undefined;
  FollowUp: { issueId: string };
  ConfirmSubmission: { issueId: string };
  CommunicationHub: undefined;
  PropertyInfo: undefined;
};

export type LandlordStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  CaseDetail: { caseId: string };
  SendToVendor: { caseId: string };
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
  };
};

const TenantStack = createNativeStackNavigator<TenantStackParamList>();
const LandlordStack = createNativeStackNavigator<LandlordStackParamList>();

const TenantNavigator = () => {
  return (
    <TenantStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2C3E50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <TenantStack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          headerShown: false 
        }}
      />
      <TenantStack.Screen 
        name="MaintenanceStatus" 
        component={MaintenanceStatusScreen}
        options={{ title: 'Maintenance' }}
      />
      <TenantStack.Screen 
        name="ReportIssue" 
        component={ReportIssueScreen}
        options={{ title: 'Report Issue' }}
      />
      <TenantStack.Screen 
        name="ReviewIssue" 
        component={ReviewIssueScreen}
        options={{ title: 'Review Request' }}
      />
      <TenantStack.Screen 
        name="SubmissionSuccess" 
        component={SubmissionSuccessScreen}
        options={{ title: 'Success', headerLeft: () => null }}
      />
      <TenantStack.Screen 
        name="FollowUp" 
        component={FollowUpScreen}
        options={{ title: 'Additional Details' }}
      />
      <TenantStack.Screen 
        name="ConfirmSubmission" 
        component={ConfirmSubmissionScreen}
        options={{ title: 'Confirm Submission' }}
      />
      <TenantStack.Screen 
        name="CommunicationHub" 
        component={CommunicationHubScreen}
        options={{ headerShown: false }}
      />
      <TenantStack.Screen 
        name="PropertyInfo" 
        component={PropertyInfoScreen}
        options={{ headerShown: false }}
      />
    </TenantStack.Navigator>
  );
};

const LandlordNavigator = () => {
  return (
    <LandlordStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#34495E',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <LandlordStack.Screen 
        name="Home" 
        component={LandlordHomeScreen}
        options={{ 
          title: 'Landlord Dashboard',
          headerShown: false 
        }}
      />
      <LandlordStack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Maintenance Dashboard' }}
      />
      <LandlordStack.Screen 
        name="CaseDetail" 
        component={CaseDetailScreen}
        options={{ title: 'Case Details' }}
      />
      <LandlordStack.Screen 
        name="SendToVendor" 
        component={SendToVendorScreen}
        options={{ title: 'Send to Vendor' }}
      />
      <LandlordStack.Screen 
        name="Communications" 
        component={LandlordCommunicationScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyManagement" 
        component={PropertyManagementScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="AddProperty" 
        component={AddPropertyScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyBasics" 
        component={PropertyBasicsScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyPhotos" 
        component={PropertyPhotosScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="RoomSelection" 
        component={RoomSelectionScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="RoomPhotography" 
        component={RoomPhotographyScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="AssetScanning" 
        component={AssetScanningScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="AssetDetails" 
        component={AssetDetailsScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="AssetPhotos" 
        component={AssetPhotosScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="ReviewSubmit" 
        component={ReviewSubmitScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyAreas" 
        component={PropertyAreasScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyAssets" 
        component={PropertyAssetsListScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="PropertyReview" 
        component={PropertyReviewScreen}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen 
        name="AddAsset" 
        component={AddAssetScreen}
        options={{ headerShown: false }}
      />
    </LandlordStack.Navigator>
  );
};

interface MainStackProps {
  userRole: 'tenant' | 'landlord';
}

const MainStack: React.FC<MainStackProps> = ({ userRole }) => {
  return userRole === 'tenant' ? <TenantNavigator /> : <LandlordNavigator />;
};

export default MainStack;