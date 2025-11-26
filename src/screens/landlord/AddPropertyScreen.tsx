import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { PropertyData, PropertyAddress } from '../../types/property';
import { validatePropertyData, sanitizePropertyData, validatePhotos } from '../../utils/propertyValidation';
import { AddressForm } from '../../components/forms/AddressForm';
import { validateAddress, migrateAddressData } from '../../utils/addressValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { log } from '../../lib/log';

type AddPropertyNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type AddPropertyRouteProp = RouteProp<LandlordStackParamList, 'AddProperty'>;


const AddPropertyScreen = () => {
  const navigation = useNavigation<AddPropertyNavigationProp>();
  const route = useRoute<AddPropertyRouteProp>();
  
  // Check if we're loading an existing draft
  const draftId = route.params?.draftId;
  
  // Initialize draft management
  const {
    draftState,
    isLoading: isDraftLoading,
    isSaving,
    lastSaved,
    error: draftError,
    updatePropertyData,
    updateCurrentStep,
    saveDraft,
    createNewDraft,
    clearError,
  } = usePropertyDraft({
    draftId,
    enableAutoSave: true,
    autoSaveDelay: 2000
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [bedroomSliderValue] = useState(new Animated.Value(1));
  const [bathroomSliderValue] = useState(new Animated.Value(1));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time validation state
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Use draft data if available, otherwise use default values
  let basePropertyData = draftState?.propertyData || {
    name: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    } as PropertyAddress,
    type: '',
    unit: '',
    bedrooms: 1,
    bathrooms: 1,
    photos: [],
  };

  // Migrate legacy address format if needed
  if (typeof basePropertyData.address === 'string') {
    basePropertyData = {
      ...basePropertyData,
      address: migrateAddressData(basePropertyData.address)
    };
  }

  const propertyData = basePropertyData;

  const propertyTypes = [
    { id: 'apartment', label: 'Apartment', icon: 'business' },
    { id: 'house', label: 'House', icon: 'home' },
    { id: 'condo', label: 'Condo', icon: 'business-outline' },
    { id: 'townhouse', label: 'Townhouse', icon: 'home-outline' },
  ];

  // Create new draft when component mounts (if not loading existing draft)
  useEffect(() => {
    log.info('🏗️ AddPropertyScreen mounted', { draftId, hasDraftState: !!draftState, isDraftLoading });
    if (!draftId && !draftState && !isDraftLoading) {
      log.info('✨ Creating new property draft');
      createNewDraft();
    }
  }, [draftId, draftState, isDraftLoading, createNewDraft]);

  // Update URL with draftId once created (for page refresh persistence)
  useEffect(() => {
    if (draftState?.id && !draftId) {
      // Replace current route with draftId to enable page refresh
      navigation.setParams({ draftId: draftState.id } as any);
    }
  }, [draftState?.id, draftId, navigation]);

  // Validate individual field
  const validateField = (fieldName: string, value: any): string | null => {
    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') return 'Property name is required';
        if (value.length < 3) return 'Property name must be at least 3 characters';
        return null;
      case 'address.line1':
        if (!value || value.trim() === '') return 'Street address is required';
        return null;
      case 'address.city':
        if (!value || value.trim() === '') return 'City is required';
        return null;
      case 'address.state':
        if (!value || value.trim() === '') return 'State is required';
        return null;
      case 'address.zipCode':
        if (!value || value.trim() === '') return 'ZIP code is required';
        if (!/^\d{5}(-\d{4})?$/.test(value)) return 'Invalid ZIP code format';
        return null;
      case 'type':
        if (!value) return 'Please select a property type';
        return null;
      default:
        return null;
    }
  };

  // Mark field as touched and validate
  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));

    // Validate the field
    let value;
    if (fieldName.startsWith('address.')) {
      const addressKey = fieldName.split('.')[1];
      value = propertyData.address[addressKey as keyof PropertyAddress];
    } else {
      value = propertyData[fieldName as keyof PropertyData];
    }

    const error = validateField(fieldName, value);
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));
  };

  // Handle property data changes with auto-save and real-time validation
  const handlePropertyDataChange = (changes: Partial<PropertyData>) => {
    updatePropertyData(changes);

    // Validate changed fields if they've been touched
    Object.keys(changes).forEach(key => {
      if (touchedFields.has(key)) {
        const error = validateField(key, changes[key as keyof PropertyData]);
        setFieldErrors(prev => ({
          ...prev,
          [key]: error || ''
        }));
      }
    });
  };

  // Handle draft error display
  useEffect(() => {
    if (draftError) {
      Alert.alert('Auto-save Error', draftError, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [draftError, clearError]);

  // Smart stepper component for bedrooms/bathrooms
  const StepperControl = ({ 
    label, 
    value, 
    onValueChange, 
    min = 0, 
    max = 10, 
    step = 1,
    suffix = '',
    icon 
  }: {
    label: string;
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    icon: string;
  }) => {
    const handleDecrement = () => {
      if (value > min) {
        onValueChange(value - step);
      }
    };

    const handleIncrement = () => {
      if (value < max) {
        onValueChange(value + step);
      }
    };

    return (
      <View style={styles.stepperContainer}>
        <View style={styles.stepperHeader}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color="#3498DB" />
          <Text style={styles.stepperLabel}>{label}</Text>
        </View>
        
        <View style={styles.stepperControls}>
          <TouchableOpacity
            style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
            onPress={handleDecrement}
            disabled={value <= min}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={24} color={value <= min ? "#BDC3C7" : "#3498DB"} />
          </TouchableOpacity>
          
          <View style={styles.stepperValueContainer}>
            <Text style={styles.stepperValue}>{value}{suffix}</Text>
            <Text style={styles.stepperValueLabel}>{label.toLowerCase()}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
            onPress={handleIncrement}
            disabled={value >= max}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={value >= max ? "#BDC3C7" : "#3498DB"} />
          </TouchableOpacity>
        </View>
        
        {/* Visual progress indicator */}
        <View style={styles.stepperProgress}>
          <View style={styles.stepperProgressTrack}>
            <View 
              style={[
                styles.stepperProgressFill, 
                { width: `${((value - min) / (max - min)) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.stepperRange}>{min} - {max}{suffix}</Text>
        </View>
      </View>
    );
  };

  const handleNext = async () => {
    if (isSubmitting || isDraftLoading) return;
    
    try {
      setIsSubmitting(true);
      
      // Validate property data
      const sanitizedData = sanitizePropertyData(propertyData);
      const validation = validatePropertyData(sanitizedData);
      
      if (!validation.isValid) {
        Alert.alert('Validation Error', `Please fix the following issues:\n${validation.errors.join('\n')}`);
        return;
      }

      // Update data and step before navigating
      if (draftState) {
        updatePropertyData(sanitizedData);
        updateCurrentStep(1); // Move to step 1: Property Photos

        // Try to save (async, may complete after navigation)
        saveDraft().catch((error) => {
          log.warn('Failed to save draft before navigation:', { error: String(error) });
        });
      }

      // Navigate with both draftId and propertyData for immediate display
      navigation.navigate('PropertyPhotos', {
        draftId: draftState?.id,
        propertyData: sanitizedData,
      } as any);
    } catch (error) {
      log.error('Error validating property data:', { error: String(error) });
      Alert.alert('Error', 'An error occurred while validating the property data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return propertyData.name &&
           propertyData.address.line1 &&
           propertyData.address.city &&
           propertyData.address.state &&
           propertyData.address.zipCode &&
           propertyData.type;
  };

  const getMissingFields = () => {
    const missing: string[] = [];
    if (!propertyData.name) missing.push('Property Name');
    if (!propertyData.address.line1) missing.push('Street Address');
    if (!propertyData.address.city) missing.push('City');
    if (!propertyData.address.state) missing.push('State');
    if (!propertyData.address.zipCode) missing.push('ZIP Code');
    if (!propertyData.type) missing.push('Property Type');
    return missing;
  };

  const getCompletionPercentage = () => {
    const requiredFields = 6;
    const completedFields = requiredFields - getMissingFields().length;
    return Math.round((completedFields / requiredFields) * 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {draftId ? 'Edit Property Draft' : 'Add New Property'}
            </Text>
            {(isSaving || lastSaved) && (
              <View style={styles.saveStatus}>
                {isSaving ? (
                  <>
                    <Ionicons name="sync" size={12} color="#3498DB" />
                    <Text style={styles.saveStatusText}>Saving...</Text>
                  </>
                ) : lastSaved ? (
                  <>
                    <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
                    <Text style={styles.saveStatusText}>
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </Text>
                  </>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '12.5%' }]} />
          </View>
          <Text style={styles.progressText}>Step 1 of 8: Property Basics</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Property Name */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Property Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                touchedFields.has('name') && fieldErrors.name && styles.inputError
              ]}
              placeholder="e.g., Sunset Apartments"
              value={propertyData.name}
              onChangeText={(text) => handlePropertyDataChange({ name: text })}
              onBlur={() => handleFieldBlur('name')}
            />
            {touchedFields.has('name') && fieldErrors.name && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.errorText}>{fieldErrors.name}</Text>
              </View>
            )}
          </View>

          {/* Address - Multi-field Form */}
          <View style={styles.section}>
            <AddressForm
              value={propertyData.address}
              onChange={(address) => handlePropertyDataChange({ address })}
            />
          </View>

          {/* Property Type */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Property Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={[
              styles.typeGrid,
              touchedFields.has('type') && fieldErrors.type && styles.typeGridError
            ]}>
              {propertyTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    propertyData.type === type.id && styles.typeCardSelected,
                  ]}
                  onPress={() => {
                    handlePropertyDataChange({ type: type.id as PropertyData['type'] });
                    handleFieldBlur('type');
                  }}
                >
                  <Ionicons
                    name={type.icon as keyof typeof Ionicons.glyphMap}
                    size={28}
                    color={propertyData.type === type.id ? '#3498DB' : '#7F8C8D'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      propertyData.type === type.id && styles.typeLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {touchedFields.has('type') && fieldErrors.type && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.errorText}>{fieldErrors.type}</Text>
              </View>
            )}
          </View>


          {/* Bedrooms & Bathrooms - Modern Stepper Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <Text style={styles.sectionSubtitle}>Use the controls below to set the number of bedrooms and bathrooms</Text>
            
            <View style={styles.steppersContainer}>
              <StepperControl
                label="Bedrooms"
                value={propertyData.bedrooms}
                onValueChange={(value) => handlePropertyDataChange({ bedrooms: value })}
                min={0}
                max={10}
                icon="bed"
              />
              
              <StepperControl
                label="Bathrooms"
                value={propertyData.bathrooms}
                onValueChange={(value) => handlePropertyDataChange({ bathrooms: value })}
                min={0.5}
                max={10}
                step={0.5}
                icon="water"
              />
            </View>
          </View>

        </ScrollView>

        {/* Validation Summary - Show if form is incomplete */}
        {!isFormValid() && (
          <View style={styles.validationSummary}>
            <View style={styles.validationHeader}>
              <Ionicons name="alert-circle" size={20} color="#F39C12" />
              <Text style={styles.validationTitle}>
                Complete {getMissingFields().length} required field{getMissingFields().length !== 1 ? 's' : ''} to continue
              </Text>
            </View>
            <View style={styles.missingFieldsList}>
              {getMissingFields().map((field, index) => (
                <View key={index} style={styles.missingFieldItem}>
                  <View style={styles.missingFieldBullet} />
                  <Text style={styles.missingFieldText}>{field}</Text>
                </View>
              ))}
            </View>
            <View style={styles.progressIndicator}>
              <View style={styles.progressBarSmall}>
                <View style={[styles.progressFillSmall, { width: `${getCompletionPercentage()}%` }]} />
              </View>
              <Text style={styles.progressPercentage}>{getCompletionPercentage()}% Complete</Text>
            </View>
          </View>
        )}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!isFormValid() || isSubmitting || isDraftLoading) && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!isFormValid() || isSubmitting || isDraftLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Validating...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  saveStatusText: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    width: '48%',
  },
  typeCardSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  typeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
  },
  typeLabelSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    lineHeight: 20,
  },
  steppersContainer: {
    gap: 16,
  },
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 2,
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
    
    
    
    
    elevation: 2,
  },
  stepperButtonDisabled: {
    borderColor: '#BDC3C7',
    backgroundColor: '#F8F9FA',
    
    elevation: 0,
  },
  stepperValueContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C3E50',
    lineHeight: 36,
  },
  stepperValueLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stepperProgress: {
    alignItems: 'center',
    gap: 8,
  },
  stepperProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepperProgressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 2,
  },
  stepperRange: {
    fontSize: 12,
    color: '#95A5A6',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    
    
    
    
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
    boxShadow: 'none',
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Validation error styles
  required: {
    color: '#E74C3C',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#E74C3C',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  typeGridError: {
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    borderRadius: 8,
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },
  // Validation summary styles
  validationSummary: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E67E22',
    flex: 1,
  },
  missingFieldsList: {
    gap: 8,
    marginBottom: 12,
  },
  missingFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missingFieldBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F39C12',
  },
  missingFieldText: {
    fontSize: 14,
    color: '#95A5A6',
    flex: 1,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarSmall: {
    flex: 1,
    height: 6,
    backgroundColor: '#FFF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#F39C12',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E67E22',
    minWidth: 70,
    textAlign: 'right',
  },
});

export default AddPropertyScreen;
