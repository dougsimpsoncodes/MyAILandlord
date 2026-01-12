import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { markOnboardingStarted } from '../../hooks/useOnboardingStatus';
import { PropertyDraftService } from '../../services/storage/PropertyDraftService';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import Button from '../../components/shared/Button';
import PropertyAddressFormSimplified from '../../components/forms/PropertyAddressFormSimplified';
import ScreenContainer from '../../components/shared/ScreenContainer';
import log from '../../lib/log';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';

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
type PropertyBasicsRouteProp = RouteProp<LandlordStackParamList, 'PropertyBasics'>;

const PropertyBasicsScreen = () => {
  const navigation = useNavigation<PropertyBasicsNavigationProp>();
  const route = useRoute<PropertyBasicsRouteProp>();
  const responsive = useResponsive();
  const { user } = useUnifiedAuth();
  const { supabase } = useSupabaseWithAuth();

  // Get params from route (all optional)
  const routeDraftId = route.params?.draftId;
  const routePropertyId = route.params?.propertyId; // For editing existing properties
  const isOnboarding = route.params?.isOnboarding || false;
  const firstName = route.params?.firstName;
  const isEditMode = !!routePropertyId;

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

  // Draft management - load existing draft if draftId provided
  const {
    draftState,
    updatePropertyData,
    createNewDraft,
    saveDraft,
  } = usePropertyDraft({
    draftId: routeDraftId, // Auto-loads draft if ID provided
    enableAutoSave: false, // Disable auto-save for better typing performance
  });

  // Mark onboarding as started when entering this screen in onboarding mode
  useEffect(() => {
    if (isOnboarding) {
      markOnboardingStarted();
    }
  }, [isOnboarding]);

  // Load existing property data when editing
  useEffect(() => {
    const loadExistingProperty = async () => {
      if (!routePropertyId || !supabase) return;

      try {
        log.debug('PropertyBasics: Loading existing property', { propertyId: routePropertyId });
        const { data: property, error } = await supabase
          .from('properties')
          .select('name, address_jsonb')
          .eq('id', routePropertyId)
          .single();

        if (error) throw error;

        const addr = property.address_jsonb || {};
        setAddressData({
          propertyName: property.name || '',
          addressLine1: addr.line1 || '',
          addressLine2: addr.line2 || '',
          city: addr.city || '',
          state: addr.state || '',
          postalCode: addr.zipCode || '',
          country: 'US',
        });
        log.debug('PropertyBasics: Loaded existing property data', { name: property.name });
      } catch (error) {
        log.error('PropertyBasics: Failed to load property', { error: String(error) });
      }
    };

    loadExistingProperty();
  }, [routePropertyId, supabase]);

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

  const handleContinue = async () => {
    setIsValidating(true);

    // Basic validation - check required address fields
    const hasRequiredFields = addressData.propertyName.trim() &&
                             addressData.addressLine1.trim() &&
                             addressData.city.trim() &&
                             addressData.state.trim() &&
                             addressData.postalCode.trim();

    if (!hasRequiredFields) {
      setIsValidating(false);
      Alert.alert(
        'Please Complete Required Fields',
        'Make sure all required address information is filled out correctly.'
      );
      return;
    }

    try {
      // Build PropertyData from form
      const propertyDataFromForm = {
        name: addressData.propertyName.trim(),
        address: {
          line1: addressData.addressLine1.trim(),
          line2: addressData.addressLine2?.trim() || '',
          city: addressData.city.trim(),
          state: addressData.state.trim(),
          zipCode: addressData.postalCode.trim(),
          country: addressData.country || 'US',
        },
      };

      // EDIT MODE: Update existing property directly in database
      if (isEditMode && routePropertyId && supabase) {
        log.debug('PropertyBasics: Updating existing property', { propertyId: routePropertyId });
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            name: propertyDataFromForm.name,
            address_jsonb: propertyDataFromForm.address,
          })
          .eq('id', routePropertyId);

        if (updateError) throw updateError;

        setIsValidating(false);
        Alert.alert('Success', 'Property updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // CREATE MODE: Use draft system for new properties
      let targetDraftId: string;

      if (draftState) {
        // Update existing draft
        log.debug('PropertyBasics: Updating existing draft', { draftId: draftState.id });
        updatePropertyData(propertyDataFromForm);
        await saveDraft();
        targetDraftId = draftState.id;
      } else {
        // Create new draft and save immediately to storage
        log.debug('PropertyBasics: Creating new draft');
        const newDraft = createNewDraft(propertyDataFromForm);
        targetDraftId = newDraft.id;
        // Save directly to storage (can't use saveDraft() since state hasn't updated yet)
        if (user?.id) {
          await PropertyDraftService.saveDraft(user.id, newDraft);
          log.debug('PropertyBasics: Draft saved to storage', { draftId: targetDraftId });
        }
      }

      setIsValidating(false);

      // Navigate with only draftId (no object params)
      navigation.navigate('PropertyAttributes', {
        draftId: targetDraftId,
        isOnboarding,
        firstName,
      });
    } catch (error) {
      setIsValidating(false);
      log.error('PropertyBasics: Failed to save property', { error: String(error) });
      Alert.alert('Error', 'Failed to save property data. Please try again.');
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

  const buttonTitle = isValidating
    ? (isEditMode ? 'Saving...' : 'Validating...')
    : (isEditMode ? 'Save Changes' : 'Continue');

  const bottomActions = (
    <Button
      title={buttonTitle}
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
      title={isEditMode ? 'Edit Property' : 'Property Address'}
      subtitle={isEditMode ? 'Update property details' : 'Where is this property located?'}
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
