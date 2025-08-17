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
    saveDraft,
    deleteDraft,
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
    if (!draftId && !draftState && !isDraftLoading) {
      createNewDraft();
    }
  }, [draftId, draftState, isDraftLoading, createNewDraft]);

  // Handle property data changes with auto-save
  const handlePropertyDataChange = (changes: Partial<PropertyData>) => {
    updatePropertyData(changes);
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

      // Save current progress before navigating
      if (draftState) {
        try {
          await saveDraft();
        } catch (error) {
          console.warn('Failed to save draft before navigation:', error);
          // Continue anyway - user can manually save later
        }
      }

      navigation.navigate('PropertyAreas', { 
        propertyData: sanitizedData,
        draftId: draftState?.id 
      });
    } catch (error) {
      console.error('Error validating property data:', error);
      Alert.alert('Error', 'An error occurred while validating the property data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      Alert.alert('Draft Saved', 'Your property draft has been saved successfully.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Save Error', 'Failed to save draft. Please try again.');
    }
  };

  const handleDeleteDraft = async () => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft();
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete draft:', error);
              Alert.alert('Delete Error', 'Failed to delete draft. Please try again.');
            }
          }
        }
      ]
    );
  };

  const isFormValid = () => {
    return propertyData.name && 
           propertyData.address.line1 && 
           propertyData.address.city && 
           propertyData.address.state && 
           propertyData.address.zipCode && 
           propertyData.type;
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '20%' }]} />
          </View>
          <Text style={styles.progressText}>Step 1 of 5: Property Details</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* DEBUG MARKER */}
          <View style={{ backgroundColor: 'blue', padding: 10, marginBottom: 20 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>DEBUG: AddPropertyScreen IS RENDERING</Text>
          </View>
          {/* Property Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Property Name</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={propertyData.name}
              onChangeText={(text) => handlePropertyDataChange({ name: text })}
            />
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
            <Text style={styles.label}>Property Type</Text>
            <View style={styles.typeGrid}>
              {propertyTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    propertyData.type === type.id && styles.typeCardSelected,
                  ]}
                  onPress={() => handlePropertyDataChange({ type: type.id as PropertyData['type'] })}
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

          {/* Next Steps Preview */}
          <View style={styles.nextStepsCard}>
            <View style={styles.nextStepsHeader}>
              <Ionicons name="information-circle" size={20} color="#3498DB" />
              <Text style={styles.nextStepsTitle}>What's Next?</Text>
            </View>
            <View style={styles.nextStepsList}>
              <View style={styles.nextStepItem}>
                <Ionicons name="home" size={16} color="#2ECC71" />
                <Text style={styles.nextStepText}>Select property areas and rooms</Text>
              </View>
              <View style={styles.nextStepItem}>
                <Ionicons name="camera" size={16} color="#2ECC71" />
                <Text style={styles.nextStepText}>Add photos for each area</Text>
              </View>
              <View style={styles.nextStepItem}>
                <Ionicons name="construct" size={16} color="#2ECC71" />
                <Text style={styles.nextStepText}>Document appliances and assets</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveDraft}
            disabled={isSaving || isDraftLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isSaving ? "sync" : "bookmark-outline"} 
              size={18} 
              color={isSaving ? "#007AFF" : "#8E8E93"} 
            />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
          
          {draftId && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteDraft}
              disabled={isSaving || isDraftLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          )}
          
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
  nextStepsCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6EAF8',
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextStepText: {
    fontSize: 14,
    color: '#34495E',
    flex: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    gap: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    minHeight: 44,
    minWidth: 44,
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
});

export default AddPropertyScreen;