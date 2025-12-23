import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { markOnboardingStarted } from '../../hooks/useOnboardingStatus';
import Button from '../../components/shared/Button';
import PropertyAddressFormSimplified from '../../components/forms/PropertyAddressFormSimplified';
import ScreenContainer from '../../components/shared/ScreenContainer';

// Address type for the form
type Address = {
  propertyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PropertyBasicsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyBasics'>;

const PropertyBasicsScreen = () => {
  const navigation = useNavigation<PropertyBasicsNavigationProp>();
  const route = useRoute();
  const responsive = useResponsive();

  // Check if we're in onboarding mode
  const isOnboarding = (route.params as any)?.isOnboarding || false;
  
  // Form state
  const [addressData, setAddressData] = useState<Address>({
    propertyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });

  // UI state
  const [isValidating, setIsValidating] = useState(false);

  // Draft management (disable auto-save for better performance, we handle it manually)
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isLoading: isDraftLoading,
    lastSaved,
    saveDraft,
  } = usePropertyDraft({
    enableAutoSave: false, // Disable auto-save for better typing performance
  });

  // Mark onboarding as started when entering this screen in onboarding mode
  useEffect(() => {
    if (isOnboarding) {
      markOnboardingStarted();
    }
  }, [isOnboarding]);

  // Load existing draft data ONCE on mount only
  useEffect(() => {
    if (draftState?.propertyData && !addressData.propertyName) {
      const data = draftState.propertyData;
      setAddressData({
        propertyName: data.name || '',
        addressLine1: data.address?.line1 || '',
        addressLine2: data.address?.line2 || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        postalCode: data.address?.zipCode || '',
        country: 'US'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftState?.propertyData]); // Only react to propertyData changes, and only if form is empty

  const handleContinue = () => {
    setIsValidating(true);

    // Basic validation - check required address fields
    const hasRequiredFields = addressData.propertyName.trim() &&
                             addressData.addressLine1.trim() &&
                             addressData.city.trim() &&
                             addressData.state.trim() &&
                             addressData.postalCode.trim();

    setIsValidating(false);

    if (hasRequiredFields) {
      // Navigate to Property Attributes screen (type, bedrooms, bathrooms)
      navigation.navigate('PropertyAttributes', {
        addressData,
        isOnboarding,
        firstName: (route.params as any)?.firstName,
      });
    } else {
      Alert.alert(
        'Please Complete Required Fields',
        'Make sure all required address information is filled out correctly.'
      );
    }
  };

  const canContinue = () => {
    return addressData.propertyName.trim() &&
           addressData.addressLine1.trim() &&
           addressData.city.trim() &&
           addressData.state.trim() &&
           addressData.postalCode.trim();
  };

  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingTop: responsive.spacing.section[responsive.screenSize],
    },
    section: {
      marginBottom: 32,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    requiredLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 56,
    },
    inputError: {
      borderColor: '#DC3545',
      backgroundColor: '#FEF7F7',
    },
    errorText: {
      fontSize: 14,
      color: '#DC3545',
      marginTop: 4,
    },
    addressGrid: {
      gap: 12,
    },
    addressRow: {
      flexDirection: 'row',
      gap: 12,
    },
    addressHalf: {
      flex: 1,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    typeOption: {
      flex: 1,
      minWidth: responsive.select({
        mobile: '100%',
        tablet: '48%',
        desktop: '48%',
        large: '48%',
        xl: '48%',
        xxl: '48%',
        default: '100%'
      }),
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#DEE2E6',
      minHeight: 100,
    },
    typeOptionSelected: {
      borderColor: '#28A745',
      backgroundColor: '#F8FFF9',
    },
    typeIcon: {
      marginBottom: 8,
    },
    typeLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 4,
      textAlign: 'center',
    },
    typeDescription: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
    numberInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 56,
    },
    numberButton: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      margin: 4,
    },
    numberButtonEnabled: {
      backgroundColor: '#F8F9FA',
    },
    numberButtonDisabled: {
      backgroundColor: 'transparent',
    },
    numberDisplay: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
    },
    dropdown: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 56,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    dropdownText: {
      fontSize: 16,
      color: '#6C757D',
    },
    dropdownTextSelected: {
      color: '#343A40',
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      marginTop: 4,
      maxHeight: 200,
      zIndex: 1000,
      
      
      
      
      elevation: 5,
    },
    dropdownItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F8F9FA',
    },
    dropdownItemText: {
      fontSize: 16,
      color: '#343A40',
    },
  });

  const bottomActions = (
    <Button
      title={isValidating ? 'Validating...' : 'Continue'}
      onPress={handleContinue}
      type="primary"
      size="lg"
      fullWidth
      disabled={!canContinue() || isValidating}
      loading={isValidating}
    />
  );

  return (
    <ScreenContainer
      title="Property Address"
      subtitle="Where is this property located?"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable
      keyboardAware
      bottomContent={bottomActions}
    >
      <ResponsiveContainer maxWidth="large" padding={false}>
        <View style={styles.content}>
              {/* Property Address Form */}
              <PropertyAddressFormSimplified
                value={addressData}
                onChange={setAddressData}
                onSubmit={() => {}} // No submit needed here
                sectionId="property"
                showSubmitButton={false}
              />
            </View>
      </ResponsiveContainer>
    </ScreenContainer>
  );
};

export default PropertyBasicsScreen;