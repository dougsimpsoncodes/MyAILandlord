import React, { useMemo, useState, useEffect } from 'react';
import { Platform, View, Text, TextInput as RNTextInput, KeyboardTypeOptions, TextInputIOSProps } from 'react-native';
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

// IMPORTANT: Field component MUST be outside to prevent re-creation on every render
const Field = ({
  label,
  value,
  onChangeText,
  onBlur,
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
  inputRef
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id: string;
  autoComplete: string;
  textContentType?: TextInputIOSProps['textContentType'];
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  importantForAutofill?: 'auto' | 'yes' | 'no' | 'noExcludeDescendants' | 'yesExcludeDescendants';
  autoCorrect?: boolean;
  nameAttr?: string;
  required?: boolean;
  error?: string;
  inputRef?: React.RefObject<RNTextInput>;
}) => {
  const baseStyle = {
    borderWidth: 1,
    borderColor: error ? DesignSystem.colors.danger : DesignSystem.colors.border,
    borderRadius: DesignSystem.radius.sm,
    padding: DesignSystem.spacing.md,
    backgroundColor: DesignSystem.colors.background,
    fontSize: DesignSystem.typography.fontSize.md
  } as const;

  return (
    <View style={{ marginBottom: DesignSystem.spacing.lg }}>
      <Text style={{ fontSize: DesignSystem.typography.fontSize.sm, fontWeight: DesignSystem.typography.fontWeight.semibold, marginBottom: DesignSystem.spacing.sm }}>
        {label}{required ? ' *' : ''}
      </Text>
      <RNTextInput
        ref={inputRef}
        nativeID={id}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete as any}
        textContentType={textContentType}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        importantForAutofill={importantForAutofill as any}
        autoCorrect={autoCorrect}
        style={baseStyle as any}
        returnKeyType="next"
        {...(Platform.OS === 'web' ? { name: nameAttr || id } : {})}
      />
      {!!error && <Text style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}>{error}</Text>}
    </View>
  );
};

const normalizeState = (v: string) => v.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0, 30);
const normalizePostal = (v: string) => v.replace(/[^0-9A-Za-z -]/g,'').slice(0, 12);

const requiredKeys: (keyof Address)[] = ['propertyName','addressLine1','city','state','postalCode','country'];

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

const NativeFormWrapper = ({ children, onSubmit }: { children: React.ReactNode; onSubmit?: () => void }) => (
  <View style={{ width: '100%' }}>{children}</View>
);

export default function PropertyAddressFormSimplified({
  value,
  onChange,
  onSubmit,
  sectionId = 'property',
  submitLabel = 'Save Address',
  loading,
  disabled,
  showSubmitButton = true
}: Props) {
  // Use parent state directly - no local state complexity
  const [errors, setErrors] = useState<Partial<Record<keyof Address,string>>>({});

  // Use consistent autocomplete section to prevent duplicates
  const section = 'property-address';

  // Direct state setter - updates parent immediately
  const set = (k: keyof Address) => (t: string) => {
    let v = t;
    if (k === 'state') v = normalizeState(t);
    if (k === 'postalCode') v = normalizePostal(t);

    // Update parent state directly
    onChange({ ...value, [k]: v });
  };

  const validate = () => {
    const e: Partial<Record<keyof Address,string>> = {};
    requiredKeys.forEach(k => {
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
        <Field
          label="Street Address"
          id="address-line1"
          value={value.addressLine1 || ''}
          onChangeText={set('addressLine1')}
          placeholder=""
          autoComplete="address-line1"
          textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.addressLine1}
        />
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
          autoComplete="address-level2"
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
          autoComplete="address-level1"
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
