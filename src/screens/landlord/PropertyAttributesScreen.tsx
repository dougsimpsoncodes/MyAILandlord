import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyType } from '../../types/property';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import ScreenContainer from '../../components/shared/ScreenContainer';
import log from '../../lib/log';

type PropertyAttributesNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyAttributes'>;
type PropertyAttributesRouteProp = RouteProp<LandlordStackParamList, 'PropertyAttributes'>;

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

const PropertyAttributesScreen = () => {
  const navigation = useNavigation<PropertyAttributesNavigationProp>();
  const route = useRoute<PropertyAttributesRouteProp>();

  // Get draftId and other params from route
  const { draftId, isOnboarding, firstName } = route.params;

  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Load draft using draftId from route params
  const {
    draftState,
    updatePropertyData,
    saveDraft,
  } = usePropertyDraft({
    draftId, // Auto-loads draft
    enableAutoSave: false,
  });

  // Initialize form from draft data when loaded
  useEffect(() => {
    if (draftState?.propertyData) {
      const data = draftState.propertyData;
      if (data.type && !selectedType) {
        setSelectedType(data.type);
      }
      if (data.bedrooms !== undefined) {
        setBedrooms(data.bedrooms);
      }
      if (data.bathrooms !== undefined) {
        setBathrooms(data.bathrooms);
      }
    }
  }, [draftState?.propertyData]);

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

  const incrementValue = (setter: (value: number) => void, current: number, max: number = 10) => {
    if (current < max) setter(current + 1);
  };

  const decrementValue = (setter: (value: number) => void, current: number, min: number = 0) => {
    if (current > min) setter(current - 1);
  };

  const incrementBathrooms = () => {
    if (bathrooms < 10) setBathrooms(bathrooms + 0.5);
  };

  const decrementBathrooms = () => {
    if (bathrooms > 0.5) setBathrooms(bathrooms - 0.5);
  };

  const handleContinue = async () => {
    setIsValidating(true);
    const isTypeValid = validateType();

    if (!isTypeValid) {
      setIsValidating(false);
      Alert.alert(
        'Please Select Property Type',
        'Please select the type of property before continuing.'
      );
      return;
    }

    if (!draftState) {
      setIsValidating(false);
      Alert.alert('Error', 'Draft not loaded. Please go back and try again.');
      return;
    }

    try {
      // Update draft with type, bedrooms, bathrooms
      log.debug('PropertyAttributes: Updating draft with attributes', { draftId });
      updatePropertyData({
        type: selectedType!,
        bedrooms,
        bathrooms,
      });
      await saveDraft();

      setIsValidating(false);

      // Navigate with only draftId (no object params)
      navigation.navigate('PropertyAreas', {
        draftId,
        isOnboarding: isOnboarding || false,
        firstName,
      });
    } catch (error) {
      setIsValidating(false);
      log.error('PropertyAttributes: Failed to save draft', { error: String(error) });
      Alert.alert('Error', 'Failed to save property data. Please try again.');
    }
  };

  const canContinue = () => {
    return selectedType && Object.keys(errors).length === 0;
  };

  return (
    <ScreenContainer
      title="Property Details"
      subtitle="Tell us about your property"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable={true}
      keyboardAware={true}
      bottomContent={
        <Button
          testID="continue-button"
          title="Continue"
          onPress={handleContinue}
          type="primary"
          size="lg"
          fullWidth
          disabled={!canContinue() || isValidating}
          loading={isValidating}
        />
      }
    >
      <View style={styles.content}>
        {/* Property Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.typeGrid}>
            {propertyTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  selectedType === type.id && styles.typeOptionSelected
                ]}
                onPress={() => setSelectedType(type.id)}
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
          {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
        </View>

        {/* Bedrooms */}
        <Card style={styles.inputGroup}>
          <Text style={styles.label}>Bedrooms</Text>
          <View style={styles.numberInputContainer}>
            <TouchableOpacity
              testID="bedrooms-decrement"
              accessibilityRole="button"
              accessibilityLabel="Decrease bedrooms"
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
            <Text style={styles.numberDisplay} testID="bedrooms-value">{bedrooms}</Text>
            <TouchableOpacity
              testID="bedrooms-increment"
              accessibilityRole="button"
              accessibilityLabel="Increase bedrooms"
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
              testID="bathrooms-decrement"
              accessibilityRole="button"
              accessibilityLabel="Decrease bathrooms"
              style={[
                styles.numberButton,
                bathrooms > 0.5 ? styles.numberButtonEnabled : styles.numberButtonDisabled
              ]}
              onPress={decrementBathrooms}
              disabled={bathrooms <= 0.5}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color={bathrooms > 0.5 ? '#343A40' : '#DEE2E6'} />
            </TouchableOpacity>

            <Text style={styles.numberDisplay} testID="bathrooms-value">{bathrooms}</Text>

            <TouchableOpacity
              testID="bathrooms-increment"
              accessibilityRole="button"
              accessibilityLabel="Increase bathrooms"
              style={[
                styles.numberButton,
                bathrooms < 10 ? styles.numberButtonEnabled : styles.numberButtonDisabled
              ]}
              onPress={incrementBathrooms}
              disabled={bathrooms >= 10}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={bathrooms < 10 ? '#343A40' : '#DEE2E6'} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  typeOption: {
    flex: 1,
    minWidth: '45%',
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 8,
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
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginTop: 8,
  },
});

export default PropertyAttributesScreen;
