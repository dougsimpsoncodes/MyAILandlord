import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
} from 'react-native';
import Button from '../shared/Button';
import { DesignSystem } from '../../theme/DesignSystem';

type Address = {
  propertyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Props = {
  value: Address;
  onChange: (next: Address) => void;
  onSubmit: (addr: Address) => void;
  sectionId?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  showSubmitButton?: boolean;
};

type AddressSuggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type AddressAutocompleteResponse = {
  suggestions?: AddressSuggestion[];
  error?: string;
};

const SUPABASE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL || '';

const US_STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const toStateCode = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return US_STATE_CODES[trimmed.toLowerCase()] || trimmed.toUpperCase();
};

const normalizeState = (v: string) => toStateCode(v).replace(/[^A-Za-z]/g, '').slice(0, 30);
const normalizePostal = (v: string) => v.replace(/[^0-9A-Za-z -]/g, '').slice(0, 12);

const requiredKeys: (keyof Address)[] = ['propertyName', 'addressLine1', 'city', 'state', 'postalCode', 'country'];

// IMPORTANT: Field component MUST be outside to prevent re-creation on every render
const Field = ({
  label,
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  id,
  autoComplete,
  textContentType,
  keyboardType,
  autoCapitalize,
  importantForAutofill,
  autoCorrect,
  nameAttr,
  required,
  error,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  id: string;
  autoComplete: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  importantForAutofill?: TextInputProps['importantForAutofill'];
  autoCorrect?: boolean;
  nameAttr?: string;
  required?: boolean;
  error?: string;
  inputRef?: React.RefObject<RNTextInput | null>;
}) => {
  const baseStyle = {
    borderWidth: 1,
    borderColor: error ? DesignSystem.colors.danger : DesignSystem.colors.border,
    borderRadius: DesignSystem.radius.sm,
    padding: DesignSystem.spacing.md,
    backgroundColor: DesignSystem.colors.background,
    fontSize: DesignSystem.typography.fontSize.callout,
  } as const;

  return (
    <View style={{ marginBottom: DesignSystem.spacing.lg }}>
      <Text
        style={{
          fontSize: DesignSystem.typography.fontSize.subheadline,
          fontWeight: DesignSystem.typography.fontWeight.semibold,
          marginBottom: DesignSystem.spacing.sm,
        }}
      >
        {label}
        {required ? ' *' : ''}
      </Text>
      <RNTextInput
        ref={inputRef}
        nativeID={id}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        autoComplete={autoComplete}
        textContentType={textContentType}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        importantForAutofill={importantForAutofill}
        autoCorrect={autoCorrect}
        style={baseStyle}
        returnKeyType="next"
        {...(Platform.OS === 'web' ? { name: nameAttr || id } : {})}
      />
      {!!error && (
        <Text
          style={{
            color: DesignSystem.colors.danger,
            marginTop: 6,
            fontSize: DesignSystem.typography.fontSize.subheadline,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

// CRITICAL: FormWrapper components MUST be outside to prevent input focus loss
const WebFormWrapper = ({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) => (
  <form
    autoComplete="on"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
    style={{ width: '100%' }}
  >
    {children}
  </form>
);

const NativeFormWrapper = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: '100%' }}>{children}</View>
);

export default function PropertyAddressFormSimplified({
  value,
  onChange,
  onSubmit,
  submitLabel = 'Save Address',
  loading,
  disabled,
  showSubmitButton = true,
}: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const addressInputRef = useRef<RNTextInput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const suppressLookupRef = useRef(false);

  const clearLookupTimers = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const clearActiveRequest = () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearLookupTimers();
      clearActiveRequest();
    };
  }, []);

  const searchSuggestions = async (query: string) => {
    clearActiveRequest();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setIsSearching(true);
    setLookupError(null);

    try {
      if (!SUPABASE_FUNCTIONS_URL) {
        throw new Error('EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL is missing');
      }

      const baseUrl = SUPABASE_FUNCTIONS_URL.replace(/\/$/, '');
      const url = `${baseUrl}/address-autocomplete?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      const payload = (await response.json()) as AddressAutocompleteResponse;

      if (!response.ok) {
        throw new Error(payload.error || `Address lookup failed (${response.status})`);
      }

      if (controller.signal.aborted) return;

      const nextSuggestions = payload.suggestions || [];
      setSuggestions(nextSuggestions);

      if (nextSuggestions.length === 0) {
        setLookupError('No matching addresses found. Refine the address and try again.');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setSuggestions([]);
      setLookupError(
        error instanceof Error
          ? error.message
          : 'Address lookup is temporarily unavailable. You can continue with manual entry.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    const query = value.addressLine1?.trim() || '';

    if (suppressLookupRef.current) {
      suppressLookupRef.current = false;
      return;
    }

    if (query.length < 3) {
      clearLookupTimers();
      clearActiveRequest();
      setSuggestions([]);
      setLookupError(null);
      setIsSearching(false);
      return;
    }

    clearLookupTimers();
    debounceRef.current = setTimeout(() => {
      void searchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [value.addressLine1]);

  const set = (k: keyof Address) => (t: string) => {
    let v = t;
    if (k === 'state') v = normalizeState(t);
    if (k === 'postalCode') v = normalizePostal(t);

    onChange({ ...value, [k]: v });

    if (k === 'addressLine1') {
      setShowSuggestions(true);
      setLookupError(null);
    }
  };

  const handleAddressFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setShowSuggestions(true);
  };

  const handleAddressBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const applySuggestion = (suggestion: AddressSuggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    suppressLookupRef.current = true;

    onChange({
      ...value,
      addressLine1: suggestion.line1 || suggestion.primaryText,
      city: suggestion.city || value.city,
      state: suggestion.state ? normalizeState(suggestion.state) : value.state,
      postalCode: suggestion.postalCode || value.postalCode,
      country: (suggestion.country || value.country || 'US').toUpperCase(),
    });

    setSuggestions([]);
    setLookupError(null);
    setShowSuggestions(false);
  };

  const validate = () => {
    const e: Partial<Record<keyof Address, string>> = {};
    requiredKeys.forEach((k) => {
      const v = (value[k] ?? '') as string;
      if (!v || String(v).trim().length === 0) e[k] = 'Required';
    });
    if (value.postalCode && value.postalCode.length < 3) e.postalCode = e.postalCode || 'Invalid postal code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) {
      return;
    }
    onSubmit(value);
  };

  const FormWrapper = Platform.OS === 'web' ? WebFormWrapper : NativeFormWrapper;
  const showLookupPanel =
    showSuggestions &&
    value.addressLine1.trim().length >= 3 &&
    (isSearching || suggestions.length > 0 || !!lookupError);

  return (
    <View style={{ paddingBottom: DesignSystem.spacing.lg }}>
      <FormWrapper onSubmit={submit}>
        <Field
          label="Property Name"
          id="property-name"
          value={value.propertyName || ''}
          onChangeText={set('propertyName')}
          placeholder=""
          autoComplete="off"
          textContentType={Platform.OS === 'ios' ? 'none' : undefined}
          importantForAutofill="no"
          autoCorrect={false}
          autoCapitalize="words"
          nameAttr="property-name"
          required
          error={errors.propertyName}
        />

        <View style={{ marginBottom: DesignSystem.spacing.lg, position: 'relative' }}>
          <Field
            label="Street Address"
            id="address-line1"
            value={value.addressLine1 || ''}
            onChangeText={set('addressLine1')}
            onFocus={handleAddressFocus}
            onBlur={handleAddressBlur}
            inputRef={addressInputRef}
            placeholder="Start typing address"
            autoComplete="address-line1"
            textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
            autoCapitalize="words"
            importantForAutofill="yes"
            required
            error={errors.addressLine1}
          />

          {showLookupPanel && (
            <View
              style={{
                borderWidth: 1,
                borderColor: DesignSystem.colors.border,
                borderRadius: DesignSystem.radius.sm,
                backgroundColor: DesignSystem.colors.background,
                marginTop: -8,
                overflow: 'hidden',
                zIndex: 20,
                ...(Platform.OS !== 'web' ? { elevation: 4 } : {}),
              }}
            >
              {isSearching && (
                <View style={{ padding: DesignSystem.spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={DesignSystem.colors.textSubtle} />
                  <Text style={{ color: DesignSystem.colors.textSubtle }}>Searching Google Maps addresses...</Text>
                </View>
              )}

              {!isSearching &&
                suggestions.map((suggestion, index) => (
                  <Pressable
                    key={suggestion.id}
                    onPress={() => applySuggestion(suggestion)}
                    style={{
                      padding: DesignSystem.spacing.md,
                      borderBottomWidth: index === suggestions.length - 1 ? 0 : 1,
                      borderBottomColor: DesignSystem.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: DesignSystem.colors.text,
                        fontWeight: DesignSystem.typography.fontWeight.semibold,
                        fontSize: DesignSystem.typography.fontSize.callout,
                      }}
                    >
                      {suggestion.primaryText}
                    </Text>
                    {!!suggestion.secondaryText && (
                      <Text
                        style={{
                          color: DesignSystem.colors.textSubtle,
                          marginTop: 2,
                          fontSize: DesignSystem.typography.fontSize.subheadline,
                        }}
                      >
                        {suggestion.secondaryText}
                      </Text>
                    )}
                  </Pressable>
                ))}

              {!isSearching && !!lookupError && (
                <View style={{ padding: DesignSystem.spacing.md }}>
                  <Text
                    style={{
                      color: DesignSystem.colors.textSubtle,
                      fontSize: DesignSystem.typography.fontSize.subheadline,
                    }}
                  >
                    {lookupError}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Field
          label="Unit / Apt / Suite (Optional)"
          id="address-line2"
          value={value.addressLine2 || ''}
          onChangeText={set('addressLine2')}
          placeholder=""
          autoComplete="address-line2"
          textContentType={Platform.OS === 'ios' ? 'streetAddressLine2' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          error={errors.addressLine2}
        />
        <Field
          label="City"
          id="address-city"
          value={value.city || ''}
          onChangeText={set('city')}
          placeholder=""
          autoComplete="street-address"
          textContentType={Platform.OS === 'ios' ? 'addressCity' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.city}
        />
        <Field
          label="State/Region"
          id="address-state"
          value={value.state || ''}
          onChangeText={set('state')}
          placeholder=""
          autoComplete="postal-code"
          textContentType={Platform.OS === 'ios' ? 'addressState' : undefined}
          autoCapitalize="characters"
          importantForAutofill="yes"
          required
          error={errors.state}
        />
        <Field
          label="Postal Code"
          id="postal-code"
          value={value.postalCode || ''}
          onChangeText={set('postalCode')}
          placeholder=""
          autoComplete="postal-code"
          textContentType={Platform.OS === 'ios' ? 'postalCode' : undefined}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
          autoCapitalize="none"
          importantForAutofill="yes"
          required
          error={errors.postalCode}
        />
        <Field
          label="Country"
          id="country"
          value={value.country || ''}
          onChangeText={set('country')}
          placeholder="United States"
          autoComplete="country"
          textContentType={Platform.OS === 'ios' ? 'countryName' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.country}
        />
        {showSubmitButton && (
          <View style={{ marginTop: DesignSystem.spacing.lg }}>
            <Button title={submitLabel} onPress={submit} type="primary" fullWidth disabled={disabled} loading={loading} />
          </View>
        )}
      </FormWrapper>
    </View>
  );
}
