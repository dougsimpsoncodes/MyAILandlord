import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Platform, View, Text, TextInput as RNTextInput, ScrollView, KeyboardTypeOptions, TextInputIOSProps } from 'react-native';
import Button from '../shared/Button';
import { DesignSystem } from '../../theme/DesignSystem';

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

type Props = {
  value: Address;
  onChange: (next: Address) => void;
  onSubmit: (addr: Address) => void;
  sectionId?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
};

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
const normalizeEmail = (v: string) => v.trim();
const normalizePhone = (v: string) => v.replace(/[^\d+(). -]/g,'').slice(0, 20);

const requiredKeys: (keyof Address)[] = ['fullName','addressLine1','city','state','postalCode','country'];

export default function PropertyAddressFormSimplified({
  value,
  onChange,
  onSubmit,
  sectionId = 'property',
  submitLabel = 'Save Address',
  loading,
  disabled
}: Props) {
  // Internal state - manages form data locally
  const [localData, setLocalData] = useState<Address>(value);
  const [errors, setErrors] = useState<Partial<Record<keyof Address,string>>>({});
  const section = useMemo(() => `section-${sectionId}`, [sectionId]);
  const scrollRef = useRef<ScrollView>(null);

  // Initialize from prop value only on mount or when value.propertyName changes (indicates new form)
  useEffect(() => {
    setLocalData(value);
  }, [value.propertyName]); // Only reset when starting fresh with a new property

  // Local state setter - NO parent notification on every keystroke!
  const set = (k: keyof Address) => (t: string) => {
    let v = t;
    if (k === 'state') v = normalizeState(t);
    if (k === 'postalCode') v = normalizePostal(t);
    if (k === 'email') v = normalizeEmail(t);
    if (k === 'phone') v = normalizePhone(t);

    // Update local state only
    setLocalData(prev => ({ ...prev, [k]: v }));
  };

  // Notify parent on blur - user finished with this field
  const handleBlur = () => {
    onChange(localData);
  };

  const validate = () => {
    const e: Partial<Record<keyof Address,string>> = {};
    requiredKeys.forEach(k => {
      const v = (localData[k] ?? '') as string;
      if (!v || String(v).trim().length === 0) e[k] = 'Required';
    });
    if (localData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localData.email)) e.email = 'Invalid email';
    if (localData.postalCode && localData.postalCode.length < 3) e.postalCode = e.postalCode || 'Invalid postal code';
    if (localData.phone && localData.phone.replace(/\D/g,'').length > 0 && localData.phone.replace(/\D/g,'').length < 7) e.phone = 'Invalid phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) {
      const firstKey = (Object.keys(errors).find(k => (errors as any)[k]) as keyof Address) || requiredKeys.find(k => !localData[k] || String(localData[k]||'').trim()==='');
      if (firstKey) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
      }
      return;
    }
    // Notify parent with final data
    onChange(localData);
    onSubmit(localData);
  };

  const FormWrapper: React.ComponentType<{ children: React.ReactNode }> =
    Platform.OS === 'web'
      ? (({ children }) => (
          <form
            autoComplete="on"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            style={{ width: '100%' }}
          >
            {children}
          </form>
        ) as any)
      : (({ children }) => <View style={{ width: '100%' }}>{children}</View>);

  return (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: DesignSystem.spacing.lg }}>
      <FormWrapper>
        <Field
          label="Property Name"
          id={`${section}-property-name`}
          value={localData.propertyName || ''}
          onChangeText={set('propertyName')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete="off"
          textContentType={Platform.OS === 'ios' ? 'none' : undefined}
          importantForAutofill="no"
          autoCorrect={false}
          nameAttr="ignore-property-name"
          required={false}
          error={undefined}
        />
        <Field
          label="Full Name"
          id={`${section}-name`}
          value={localData.fullName || ''}
          onChangeText={set('fullName')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} name`}
          textContentType={Platform.OS === 'ios' ? 'name' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.fullName}
        />
        <Field
          label="Organization"
          id={`${section}-organization`}
          value={localData.organization || ''}
          onChangeText={set('organization')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} organization`}
          textContentType={Platform.OS === 'ios' ? 'organizationName' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          error={errors.organization}
        />
        <Field
          label="Address Line 1"
          id={`${section}-address-line1`}
          value={localData.addressLine1 || ''}
          onChangeText={set('addressLine1')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} address-line1`}
          textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.addressLine1}
        />
        <Field
          label="Address Line 2"
          id={`${section}-address-line2`}
          value={localData.addressLine2 || ''}
          onChangeText={set('addressLine2')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} address-line2`}
          textContentType={Platform.OS === 'ios' ? 'streetAddressLine2' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          error={errors.addressLine2}
        />
        <Field
          label="City"
          id={`${section}-address-city`}
          value={localData.city || ''}
          onChangeText={set('city')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} address-level2`}
          textContentType={Platform.OS === 'ios' ? 'addressCity' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.city}
        />
        <Field
          label="State/Region"
          id={`${section}-address-state`}
          value={localData.state || ''}
          onChangeText={set('state')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} address-level1`}
          textContentType={Platform.OS === 'ios' ? 'addressState' : undefined}
          autoCapitalize="characters"
          importantForAutofill="yes"
          required
          error={errors.state}
        />
        <Field
          label="Postal Code"
          id={`${section}-postal-code`}
          value={localData.postalCode || ''}
          onChangeText={set('postalCode')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} postal-code`}
          textContentType={Platform.OS === 'ios' ? 'postalCode' : undefined}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
          autoCapitalize="none"
          importantForAutofill="yes"
          required
          error={errors.postalCode}
        />
        <Field
          label="Country"
          id={`${section}-country`}
          value={localData.country || ''}
          onChangeText={set('country')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} country`}
          textContentType={Platform.OS === 'ios' ? 'countryName' : undefined}
          autoCapitalize="words"
          importantForAutofill="yes"
          required
          error={errors.country}
        />
        <Field
          label="Email"
          id={`${section}-email`}
          value={localData.email || ''}
          onChangeText={set('email')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} email`}
          textContentType={Platform.OS === 'ios' ? 'emailAddress' : undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          importantForAutofill="yes"
          error={errors.email}
        />
        <Field
          label="Phone"
          id={`${section}-tel`}
          value={localData.phone || ''}
          onChangeText={set('phone')}
          onBlur={handleBlur}
          placeholder=""
          autoComplete={`${section} tel`}
          textContentType={Platform.OS === 'ios' ? 'telephoneNumber' : undefined}
          keyboardType="phone-pad"
          autoCapitalize="none"
          importantForAutofill="yes"
          error={errors.phone}
        />
        <View style={{ marginTop: DesignSystem.spacing.lg }}>
          <Button title={submitLabel} onPress={submit} type="primary" fullWidth disabled={disabled} loading={loading} />
        </View>
      </FormWrapper>
    </ScrollView>
  );
}
