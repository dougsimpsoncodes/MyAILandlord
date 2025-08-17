// Industry-standard multi-field address form component
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PropertyAddress } from '../../types/property';
import { formatZipCode, formatCityName, formatStreetAddress } from '../../utils/addressValidation';
import { US_STATES } from '../../utils/addressConstants';

interface AddressFormProps {
  value: PropertyAddress;
  onChange: (address: PropertyAddress) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  errors = {},
  disabled = false
}) => {
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  
  const filteredStates = US_STATES.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const handleFieldChange = (field: keyof PropertyAddress, newValue: string) => {
    let processedValue = newValue;
    
    // Auto-format certain fields
    switch (field) {
      case 'zipCode':
        processedValue = formatZipCode(newValue);
        break;
      case 'city':
        // Don't format during typing to allow spaces
        processedValue = newValue;
        break;
      case 'state':
        processedValue = newValue.toUpperCase();
        break;
      case 'line1':
        // Auto-format on blur, not during typing
        break;
    }
    
    onChange({
      ...value,
      [field]: processedValue
    });
  };

  const selectedState = US_STATES.find(state => state.code === value.state);

  return (
    <View style={styles.container}>
      {/* Street Address */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Street Address <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.line1 && styles.inputError]}
          placeholder=""
          value={value.line1}
          onChangeText={(text) => handleFieldChange('line1', text)}
          onBlur={() => {
            // Only format if the field has content and is not empty
            if (value.line1 && value.line1.trim().length > 0) {
              // Avoid re-formatting if already properly formatted
              const formatted = formatStreetAddress(value.line1);
              if (formatted !== value.line1) {
                handleFieldChange('line1', formatted);
              }
            }
          }}
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          autoCapitalize="words"
          returnKeyType="next"
          editable={!disabled}
          accessibilityLabel="Street address"
          accessibilityHint="Enter your street number and name"
        />
        {errors.line1 && <Text style={styles.errorText}>{errors.line1}</Text>}
      </View>

      {/* Unit/Apartment (Optional) */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Unit, Apt, Suite (Optional)</Text>
        <TextInput
          style={[styles.input, errors.line2 && styles.inputError]}
          placeholder=""
          value={value.line2 || ''}
          onChangeText={(text) => handleFieldChange('line2', text)}
          autoComplete="street-address"
          textContentType="streetAddressLine2"
          autoCapitalize="words"
          returnKeyType="next"
          editable={!disabled}
          accessibilityLabel="Unit or apartment number"
          accessibilityHint="Optional: Enter unit, apartment, or suite number"
        />
        {errors.line2 && <Text style={styles.errorText}>{errors.line2}</Text>}
      </View>

      {/* City */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          City <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.city && styles.inputError]}
          placeholder=""
          value={value.city}
          onChangeText={(text) => handleFieldChange('city', text)}
          onBlur={() => {
            // Format city name on blur to title case
            if (value.city && value.city.trim().length > 0) {
              const formatted = formatCityName(value.city);
              if (formatted !== value.city) {
                handleFieldChange('city', formatted);
              }
            }
          }}
          autoComplete="address-level2"
          textContentType="addressCity"
          autoCapitalize="words"
          returnKeyType="next"
          editable={!disabled}
          accessibilityLabel="City"
          accessibilityHint="Enter your city name"
        />
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      {/* State and ZIP Code Row */}
      <View style={styles.row}>
        {/* State Dropdown */}
        <View style={[styles.fieldContainer, styles.halfWidth]}>
          <Text style={styles.label}>
            State <Text style={styles.required}>*</Text>
          </Text>
          {/* Hidden input for autofill */}
          <TextInput
            style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }}
            autoComplete="address-level1"
            textContentType="addressState"
            value={value.state}
            onChangeText={(text) => {
              // Find matching state and update
              const matchingState = US_STATES.find(state => 
                state.code.toLowerCase() === text.toLowerCase() ||
                state.name.toLowerCase() === text.toLowerCase()
              );
              if (matchingState) {
                handleFieldChange('state', matchingState.code);
              } else {
                handleFieldChange('state', text.toUpperCase());
              }
            }}
          />
          <TouchableOpacity
            style={[styles.dropdownButton, errors.state && styles.inputError]}
            onPress={() => setShowStateModal(true)}
            disabled={disabled}
            accessibilityLabel="State"
            accessibilityHint="Select your state from the dropdown"
            accessibilityRole="button"
          >
            <Text style={[styles.dropdownText, !selectedState && styles.placeholder]}>
              {selectedState ? selectedState.code : 'State'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>

        {/* ZIP Code */}
        <View style={[styles.fieldContainer, styles.halfWidth]}>
          <Text style={styles.label}>
            ZIP Code <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.zipCode && styles.inputError]}
            placeholder=""
            value={value.zipCode}
            onChangeText={(text) => handleFieldChange('zipCode', text)}
            autoComplete="postal-code"
            textContentType="postalCode"
            keyboardType="numeric"
            maxLength={10} // Allow for ZIP+4 format
            returnKeyType="done"
            editable={!disabled}
            accessibilityLabel="ZIP code"
            accessibilityHint="Enter your 5-digit ZIP code"
          />
          {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
        </View>
      </View>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowStateModal(false)}
              style={styles.modalHeaderButton}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity 
              onPress={() => setShowStateModal(false)}
              style={styles.modalHeaderButton}
            >
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search states..."
            value={stateSearch}
            onChangeText={setStateSearch}
            autoCapitalize="words"
            autoCorrect={false}
          />
          
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.stateItem,
                  value.state === item.code && styles.stateItemSelected
                ]}
                onPress={() => {
                  handleFieldChange('state', item.code);
                  setShowStateModal(false);
                  setStateSearch('');
                }}
              >
                <Text style={[
                  styles.stateItemText,
                  value.state === item.code && styles.stateItemTextSelected
                ]}>
                  {item.code} - {item.name}
                </Text>
                {value.state === item.code && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  required: {
    color: '#E74C3C',
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
  inputError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#E74C3C',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
    minHeight: 52,
  },
  dropdownText: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  placeholder: {
    color: '#7F8C8D',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalHeaderButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  modalDone: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  stateItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateItemSelected: {
    backgroundColor: '#E8F4FD',
  },
  stateItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  stateItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});