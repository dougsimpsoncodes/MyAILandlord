import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData, PropertyType } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { DesignSystem } from '../../theme/DesignSystem';
import PropertyAddressFormSimplified from '../../components/forms/PropertyAddressFormSimplified';

// Address type for the form
type Address = {
  propertyName: string;
  fullName: string;
  organization?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
};

type PropertyBasicsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyBasics'>;

interface PropertyTypeOption {
  id: PropertyType;
  label: string;
  icon: string;
  description: string;
}

const propertyTypes: PropertyTypeOption[] = [
  {
    id: 'house',
    label: 'House',
    icon: 'home',
    description: 'Single-family home'
  },
  {
    id: 'apartment',
    label: 'Apartment',
    icon: 'business',
    description: 'Unit in building'
  },
  {
    id: 'condo',
    label: 'Condo',
    icon: 'location',
    description: 'Owned unit'
  },
  {
    id: 'townhouse',
    label: 'Townhouse',
    icon: 'home-outline',
    description: 'Attached home'
  },
];

const PropertyBasicsScreen = () => {
  const navigation = useNavigation<PropertyBasicsNavigationProp>();
  const responsive = useResponsive();
  
  // Form state
  const [addressData, setAddressData] = useState<Address>({
    propertyName: '',
    fullName: '',
    organization: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    email: '',
    phone: ''
  });
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isDraftLoading,
    lastSaved,
    saveDraft,
  } = usePropertyDraft();

  // Load existing draft data
  useEffect(() => {
    if (draftState?.propertyData) {
      const data = draftState.propertyData;
      setAddressData({
        propertyName: data.name || '',
        fullName: '',
        organization: '',
        addressLine1: data.address?.line1 || '',
        addressLine2: data.address?.line2 || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        postalCode: data.address?.zipCode || '',
        country: 'US',
        email: '',
        phone: ''
      });
      setSelectedType(data.type || null);
      setBedrooms(data.bedrooms || 1);
      setBathrooms(data.bathrooms || 1);
    }
  }, [draftState]);

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressData.propertyName || addressData.addressLine1 || selectedType) {
        const propertyData: Partial<PropertyData> = {
          name: addressData.propertyName,
          address: {
            line1: addressData.addressLine1,
            line2: addressData.addressLine2,
            city: addressData.city,
            state: addressData.state,
            zipCode: addressData.postalCode,
            country: addressData.country || 'US'
          },
          type: selectedType || 'house',
          unit: '', // Unit is not part of new form
          bedrooms,
          bathrooms,
          photos: draftState?.propertyData?.photos || [],
        };
        updatePropertyData(propertyData);
        updateCurrentStep(0); // First step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [addressData, selectedType, bedrooms, bathrooms]);

  // Validation for property type only (address validation is handled by the form component)
  const validateType = () => {
    const newErrors = { ...errors };
    if (!selectedType) {
      newErrors.type = 'Property type is required';
    } else {
      delete newErrors.type;
    }
    setErrors(newErrors);
    return !newErrors.type;
  };

  const handleContinue = async () => {
    setIsValidating(true);

    // Validate property type
    const isTypeValid = validateType();
    
    // Basic validation - the form component handles its own validation
    const hasRequiredFields = addressData.propertyName.trim() && 
                             addressData.addressLine1.trim() && 
                             addressData.city.trim() && 
                             addressData.state.trim() && 
                             addressData.postalCode.trim();

    setIsValidating(false);

    if (isTypeValid && hasRequiredFields) {
      // Save final data and navigate
      const propertyData: PropertyData = {
        name: addressData.propertyName,
        address: {
          line1: addressData.addressLine1,
          line2: addressData.addressLine2,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.postalCode,
          country: addressData.country || 'US'
        },
        type: selectedType!,
        unit: '', // No longer using unit field
        bedrooms,
        bathrooms,
        photos: draftState?.propertyData?.photos || [],
      };
      
      await updatePropertyData(propertyData);
      await saveDraft();
      
      // Navigate to next step
      navigation.navigate('PropertyPhotos', { propertyData });
    } else {
      Alert.alert(
        'Please Complete Required Fields',
        'Make sure all required information is filled out correctly.'
      );
    }
  };

  const incrementValue = (setter: (value: number) => void, current: number, max: number = 10) => {
    if (current < max) setter(current + 1);
  };

  const decrementValue = (setter: (value: number) => void, current: number, min: number = 0) => {
    if (current > min) setter(current - 1);
  };


  const canContinue = () => {
    return addressData.propertyName.trim() && 
           addressData.addressLine1.trim() && 
           addressData.city.trim() && 
           addressData.state && 
           selectedType &&
           Object.keys(errors).length === 0;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 120, // Space for fixed footer
    },
    header: {
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: responsive.spacing.section[responsive.screenSize],
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E9ECEF',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      marginBottom: 16,
    },
    backButtonText: {
      marginLeft: 8,
      fontSize: 16,
      color: '#6C757D',
    },
    progressContainer: {
      marginBottom: 24,
    },
    progressBar: {
      height: 4,
      backgroundColor: '#E9ECEF',
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28A745',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
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
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: 16,
      paddingBottom: Math.max(16, responsive.spacing.safeAreaBottom || 0),
    },
    saveStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    saveStatusText: {
      fontSize: 14,
      color: '#6C757D',
      marginLeft: 6,
    },
    continueButton: {
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
    },
    continueButtonDisabled: {
      backgroundColor: '#DEE2E6',
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    continueButtonTextDisabled: {
      color: '#6C757D',
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

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth="lg" padding={false}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#6C757D" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <ResponsiveTitle style={{ marginBottom: 8 }}>Add New Property</ResponsiveTitle>
            <ResponsiveBody style={{ color: '#6C757D' }}>
              Let's start with the basics. This should take about 2 minutes.
            </ResponsiveBody>

          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              {/* Property Address Form */}
              <PropertyAddressFormSimplified
                value={addressData}
                onChange={setAddressData}
                onSubmit={() => {}} // No submit needed here
                sectionId="property"
              />

              {/* Property Type */}
              <Card style={styles.section}>
                <Text style={styles.requiredLabel}>Property Type *</Text>
                <View style={styles.typeGrid}>
                  {propertyTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        selectedType === type.id && styles.typeOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedType(type.id);
                        // Clear type error when selecting
                        const newErrors = { ...errors };
                        delete newErrors.type;
                        setErrors(newErrors);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={32} 
                        color={selectedType === type.id ? '#28A745' : '#6C757D'} 
                        style={styles.typeIcon}
                      />
                      <Text style={styles.typeLabel}>{type.label}</Text>
                      <Text style={styles.typeDescription}>{type.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.type && (
                  <Text style={styles.errorText}>{errors.type}</Text>
                )}
              </Card>

              {/* Bedrooms */}
              <Card style={styles.inputGroup}>
                <Text style={styles.label}>Bedrooms</Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      bedrooms > 0 ? styles.numberButtonEnabled : styles.numberButtonDisabled
                    ]}
                    onPress={() => decrementValue(setBedrooms, bedrooms, 0)}
                    disabled={bedrooms <= 0}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={20} color={bedrooms > 0 ? '#343A40' : '#DEE2E6'} />
                  </TouchableOpacity>
                  
                  <Text style={styles.numberDisplay}>{bedrooms}</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      bedrooms < 10 ? styles.numberButtonEnabled : styles.numberButtonDisabled
                    ]}
                    onPress={() => incrementValue(setBedrooms, bedrooms, 10)}
                    disabled={bedrooms >= 10}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={bedrooms < 10 ? '#343A40' : '#DEE2E6'} />
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Bathrooms */}
              <Card style={styles.inputGroup}>
                <Text style={styles.label}>Bathrooms</Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      bathrooms > 0.5 ? styles.numberButtonEnabled : styles.numberButtonDisabled
                    ]}
                    onPress={() => decrementValue(setBathrooms, bathrooms, 0.5)}
                    disabled={bathrooms <= 0.5}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={20} color={bathrooms > 0.5 ? '#343A40' : '#DEE2E6'} />
                  </TouchableOpacity>
                  
                  <Text style={styles.numberDisplay}>{bathrooms}</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      bathrooms < 10 ? styles.numberButtonEnabled : styles.numberButtonDisabled
                    ]}
                    onPress={() => incrementValue(setBathrooms, bathrooms, 10)}
                    disabled={bathrooms >= 10}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={bathrooms < 10 ? '#343A40' : '#DEE2E6'} />
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          </ScrollView>

          {/* Fixed Footer */}
          <View style={styles.footer}>
            {/* Continue Button */}
            <Button
              title={isValidating ? 'Validating...' : 'Continue to Photos'}
              onPress={handleContinue}
              type="primary"
              size="lg"
              fullWidth
              disabled={!canContinue() || isValidating}
              loading={isValidating}
            />
          </View>
        </KeyboardAvoidingView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

export default PropertyBasicsScreen;