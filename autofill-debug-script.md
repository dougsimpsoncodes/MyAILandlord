# Autofill Debug Script for LLM Help

## PROBLEM SUMMARY
City and state fields are not populating with browser autofill on the AddPropertyScreen form despite implementing proper autoComplete attributes.

## EXPECTED BEHAVIOR
When using browser autofill (clicking on address autofill suggestion), the city and state fields should automatically populate with the address data.

## CURRENT TECHNICAL STATE

### Current autoComplete Attributes
1. **City field** (AddressForm.tsx line 138): `autoComplete="address-level2"` ✅ CORRECT
2. **State field** (AddressForm.tsx line 159): `autoComplete="address-level1"` ✅ CORRECT  
3. **ZIP Code field** (AddressForm.tsx line 196): `autoComplete="postal-code"` ✅ CORRECT
4. **Street Address** (AddressForm.tsx line 89): `autoComplete="street-address"` ✅ CORRECT

### Platform Details
- **Framework**: React Native with Expo
- **Platform**: React Native Web (running in browser)
- **Browser**: Testing in web browser at localhost:8081
- **Server**: Expo dev server running on port 8081

## RELEVANT CODE

### 1. AddPropertyScreen.tsx (Main Screen)
**Lines 334-338** - Uses AddressForm component:
```typescript
<AddressForm
  value={propertyData.address}
  onChange={(address) => handlePropertyDataChange({ address })}
/>
```

**PropertyData Structure**:
```typescript
address: {
  line1: '',
  line2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US'
} as PropertyAddress
```

### 2. AddressForm.tsx (Address Component)
**Complete component code:**

```typescript
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
        {/* Modal content omitted for brevity */}
      </Modal>
    </View>
  );
};
```

### 3. PropertyAddress Type Definition
```typescript
export interface PropertyAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
```

## DEBUGGING QUESTIONS FOR LLM

### 1. React Native Web Autofill Support
**Question**: Does React Native Web properly support HTML autoComplete attributes in TextInput components when rendered in a browser?

**Context**: The form is running in a web browser via React Native Web, but autofill may not work the same as native HTML inputs.

### 2. Form Structure for Autofill
**Question**: Do the autoComplete attributes need to be on a proper HTML `<form>` element for browser autofill to work?

**Current State**: Using React Native components, no HTML form wrapper.

### 3. Hidden Input Strategy
**Question**: Is the hidden TextInput approach for the state dropdown the correct strategy for React Native Web autofill?

**Current Implementation**: Hidden input with `position: absolute, left: -9999, opacity: 0, height: 0`

### 4. AutoComplete Token Verification
**Question**: Are these the correct autoComplete tokens for address fields?
- Street: `street-address` 
- City: `address-level2`
- State: `address-level1`  
- ZIP: `postal-code`

### 5. Browser Platform Detection
**Question**: Does the browser properly detect this as an address form for autofill suggestions?

**Testing Steps Needed**:
1. Check if browser shows autofill dropdown when clicking on street address field
2. Verify if selecting autofill suggestion populates ANY fields
3. Check browser developer tools for form recognition

## SPECIFIC BROWSER TESTING REQUIRED

### Test Case 1: Basic Autofill Detection
1. Open localhost:8081 in browser
2. Navigate to AddPropertyScreen (should show blue debug banner)
3. Click on "Street Address" field
4. Check if browser shows autofill suggestions
5. If yes, select an autofill suggestion
6. Report which fields (if any) get populated

### Test Case 2: Developer Tools Inspection
1. Open browser dev tools
2. Inspect the Street Address field
3. Verify it renders as an HTML `<input>` element
4. Check if `autocomplete="street-address"` attribute is present
5. Check console for any autofill-related errors

### Test Case 3: Form Recognition
1. In dev tools, check if the form is wrapped in an HTML `<form>` element
2. Verify all address inputs are within the same form context
3. Check if browser recognizes this as an address form

## POTENTIAL SOLUTIONS TO INVESTIGATE

### Solution 1: Add HTML Form Wrapper
Wrap the address fields in a proper HTML form element for React Native Web.

### Solution 2: Use Native HTML Inputs
Replace TextInput components with native HTML input elements for web platform.

### Solution 3: Adjust Hidden State Input
Modify the hidden state input positioning and attributes.

### Solution 4: Add Name Attributes
Add `name` attributes to inputs for better browser recognition.

### Solution 5: Form Section/Group
Add `autoComplete` section grouping for related fields.

## CURRENT AUTOFILL BEHAVIOR
**What happens now**: User clicks street address field, browser may or may not show autofill suggestions. If autofill is selected, fields do not populate with address data.

**Expected behavior**: Browser shows autofill suggestions, and selecting one populates street address, city, state, and ZIP code fields automatically.

## FILES TO EXAMINE
1. `/src/screens/landlord/AddPropertyScreen.tsx` - Main screen using AddressForm
2. `/src/components/forms/AddressForm.tsx` - Address form component with autofill attributes  
3. `/src/types/property.ts` - PropertyAddress type definition
4. Browser developer tools - HTML rendering and form detection

## NEXT STEPS FOR LLM
1. **Analyze React Native Web autofill support** - Research if TextInput components support browser autofill
2. **Review autoComplete token usage** - Verify correct tokens for address fields
3. **Investigate form structure requirements** - Check if HTML form wrapper is needed
4. **Provide platform-specific solution** - Address React Native Web limitations if any
5. **Test alternative approaches** - Hidden inputs, native HTML elements, or form grouping