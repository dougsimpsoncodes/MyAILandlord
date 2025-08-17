import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Platform, View, Text, TextInput as RNTextInput, ScrollView, NativeSyntheticEvent, TextInputSubmitEditingEventData } from 'react-native';
import Button from '../shared/Button';
import { DesignSystem } from '../../theme/DesignSystem';

type Address = {
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
  requiredFields?: (keyof Address)[];
};

const requiredDefault: (keyof Address)[] = ['fullName','addressLine1','city','state','postalCode','country'];

const normalizeState = (v: string) => v.replace(/[^A-Za-z ]/g,'').toUpperCase().slice(0, 30);
const normalizePostal = (v: string) => v.replace(/[^0-9A-Za-z -]/g,'').slice(0, 12);
const normalizeEmail = (v: string) => v.trim();
const normalizePhone = (v: string) => v.replace(/[^\d+(). -]/g,'').slice(0, 20);

const validate = (addr: Address, required: (keyof Address)[]) => {
  const errors: Partial<Record<keyof Address,string>> = {};
  required.forEach(k => {
    const v = (addr[k] ?? '') as string;
    if (!v || String(v).trim().length === 0) errors[k] = 'Required';
  });
  if (addr.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email)) errors.email = 'Invalid email';
  if (addr.postalCode && addr.postalCode.length < 3) errors.postalCode = errors.postalCode || 'Invalid postal code';
  if (addr.phone && addr.phone.replace(/\D/g,'').length > 0 && addr.phone.replace(/\D/g,'').length < 7) errors.phone = 'Invalid phone';
  return errors;
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  id,
  autoComplete,
  textContentType,
  keyboardType,
  autoCapitalize,
  error,
  onSubmitEditing,
  inputRef
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  id: string;
  autoComplete: string;
  textContentType?: any;
  keyboardType?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
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
        {label}
      </Text>
      <RNTextInput
        ref={inputRef}
        nativeID={id}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoComplete={autoComplete as any}
        textContentType={textContentType}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={baseStyle as any}
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
      />
      {!!error && <Text style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}>{error}</Text>}
    </View>
  );
};

export default function PropertyAddressForm({
  value,
  onChange,
  onSubmit,
  sectionId = 'property',
  submitLabel = 'Save Address',
  loading,
  disabled,
  requiredFields = requiredDefault
}: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof Address,string>>>({});
  const [attempted, setAttempted] = useState(false);
  const section = useMemo(() => `section-${sectionId}`, [sectionId]);
  const refs: Record<keyof Address, React.RefObject<RNTextInput>> = {
    fullName: useRef<RNTextInput>(null),
    organization: useRef<RNTextInput>(null),
    addressLine1: useRef<RNTextInput>(null),
    addressLine2: useRef<RNTextInput>(null),
    city: useRef<RNTextInput>(null),
    state: useRef<RNTextInput>(null),
    postalCode: useRef<RNTextInput>(null),
    country: useRef<RNTextInput>(null),
    email: useRef<RNTextInput>(null),
    phone: useRef<RNTextInput>(null)
  };
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!attempted) return;
    setErrors(validate(value, requiredFields));
  }, [value, attempted, requiredFields]);

  const set = (k: keyof Address) => (t: string) => {
    let v = t;
    if (k === 'state') v = normalizeState(t);
    if (k === 'postalCode') v = normalizePostal(t);
    if (k === 'email') v = normalizeEmail(t);
    if (k === 'phone') v = normalizePhone(t);
    onChange({ ...value, [k]: v });
  };

  const submit = () => {
    const e = validate(value, requiredFields);
    setErrors(e);
    setAttempted(true);
    const keys = Object.keys(e) as (keyof Address)[];
    if (keys.length > 0) {
      const firstKey = keys[0];
      const r = refs[firstKey];
      r?.current?.focus();
      setTimeout(() => {
        r?.current?.measure?.((fx, fy, w, h, px, py) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, (py || 0) - 80), animated: true });
        });
      }, 0);
      return;
    }
    onSubmit(value);
  };

  const FormWrapper: React.ComponentType<{ children: React.ReactNode }> =
    Platform.OS === 'web'
      ? (({ children }) => {
          return (
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
          ) as any;
        })
      : (({ children }) => <View style={{ width: '100%' }}>{children}</View>);

  const next = (current: keyof Address, nextKey?: keyof Address) => () => {
    if (nextKey) refs[nextKey].current?.focus();
  };

  return (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: DesignSystem.spacing.lg }}>
      <FormWrapper>
        <Field
          label="Full Name"
          id={`${section}-name`}
          value={value.fullName}
          onChangeText={set('fullName')}
          placeholder="Jane Doe"
          autoComplete={`${section} name`}
          textContentType={Platform.OS === 'ios' ? 'name' : undefined}
          autoCapitalize="words"
          error={errors.fullName}
          onSubmitEditing={next('fullName','organization')}
          inputRef={refs.fullName}
        />
        <Field
          label="Organization"
          id={`${section}-organization`}
          value={value.organization || ''}
          onChangeText={set('organization')}
          placeholder="Acme LLC"
          autoComplete={`${section} organization`}
          textContentType={Platform.OS === 'ios' ? 'organizationName' : undefined}
          autoCapitalize="words"
          error={errors.organization}
          onSubmitEditing={next('organization','addressLine1')}
          inputRef={refs.organization}
        />
        <Field
          label="Address Line 1"
          id={`${section}-address-line1`}
          value={value.addressLine1}
          onChangeText={set('addressLine1')}
          placeholder="123 Main St"
          autoComplete={`${section} address-line1`}
          textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
          autoCapitalize="words"
          error={errors.addressLine1}
          onSubmitEditing={next('addressLine1','addressLine2')}
          inputRef={refs.addressLine1}
        />
        <Field
          label="Address Line 2"
          id={`${section}-address-line2`}
          value={value.addressLine2 || ''}
          onChangeText={set('addressLine2')}
          placeholder="Apt, suite, etc."
          autoComplete={`${section} address-line2`}
          textContentType={Platform.OS === 'ios' ? 'streetAddressLine2' : undefined}
          autoCapitalize="words"
          error={errors.addressLine2}
          onSubmitEditing={next('addressLine2','city')}
          inputRef={refs.addressLine2}
        />
        <Field
          label="City"
          id={`${section}-address-city`}
          value={value.city}
          onChangeText={set('city')}
          placeholder="City"
          autoComplete={`${section} address-level2`}
          textContentType={Platform.OS === 'ios' ? 'addressCity' : undefined}
          autoCapitalize="words"
          error={errors.city}
          onSubmitEditing={next('city','state')}
          inputRef={refs.city}
        />
        <Field
          label="State/Region"
          id={`${section}-address-state`}
          value={value.state}
          onChangeText={set('state')}
          placeholder="State or region"
          autoComplete={`${section} address-level1`}
          textContentType={Platform.OS === 'ios' ? 'addressState' : undefined}
          autoCapitalize="characters"
          error={errors.state}
          onSubmitEditing={next('state','postalCode')}
          inputRef={refs.state}
        />
        <Field
          label="Postal Code"
          id={`${section}-postal-code`}
          value={value.postalCode}
          onChangeText={set('postalCode')}
          placeholder="ZIP or postal code"
          autoComplete={`${section} postal-code`}
          textContentType={Platform.OS === 'ios' ? 'postalCode' : undefined}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
          autoCapitalize="none"
          error={errors.postalCode}
          onSubmitEditing={next('postalCode','country')}
          inputRef={refs.postalCode}
        />
        <Field
          label="Country"
          id={`${section}-country`}
          value={value.country}
          onChangeText={set('country')}
          placeholder="United States"
          autoComplete={`${section} country`}
          textContentType={Platform.OS === 'ios' ? 'countryName' : undefined}
          autoCapitalize="words"
          error={errors.country}
          onSubmitEditing={next('country','email')}
          inputRef={refs.country}
        />
        <Field
          label="Email"
          id={`${section}-email`}
          value={value.email || ''}
          onChangeText={set('email')}
          placeholder="you@example.com"
          autoComplete={`${section} email`}
          textContentType={Platform.OS === 'ios' ? 'emailAddress' : undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          onSubmitEditing={next('email','phone')}
          inputRef={refs.email as any}
        />
        <Field
          label="Phone"
          id={`${section}-tel`}
          value={value.phone || ''}
          onChangeText={set('phone')}
          placeholder="(555) 555-5555"
          autoComplete={`${section} tel`}
          textContentType={Platform.OS === 'ios' ? 'telephoneNumber' : undefined}
          keyboardType="phone-pad"
          autoCapitalize="none"
          error={errors.phone}
          onSubmitEditing={() => {}}
          inputRef={refs.phone as any}
        />
        <View style={{ marginTop: DesignSystem.spacing.lg }}>
          <Button title={submitLabel} onPress={submit} type="primary" fullWidth disabled={disabled} loading={loading} />
        </View>
      </FormWrapper>
    </ScrollView>
  );
}