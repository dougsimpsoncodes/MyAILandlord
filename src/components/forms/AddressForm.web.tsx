import React from 'react';
import { Platform, View, Text } from 'react-native';
import { DesignSystem } from '../../theme/DesignSystem';
import { PropertyAddress } from '../../types/property';

interface AddressFormProps {
  value: PropertyAddress;
  onChange: (address: PropertyAddress) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  sectionId?: string;
}

export const AddressForm: React.FC<AddressFormProps> = ({ value, onChange, errors = {}, disabled = false, sectionId = 'property' }) => {
  const section = `section-${sectionId}`;
  const set = (k: keyof PropertyAddress) => (v: string) => onChange({ ...value, [k]: v });

  if (Platform.OS !== 'web') {
    return <View><Text>Use native AddressForm.tsx on mobile</Text></View>;
  }

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: DesignSystem.colors.border,
    borderRadius: DesignSystem.radius.sm as number,
    padding: DesignSystem.spacing.md as number,
    background: DesignSystem.colors.background,
    fontSize: DesignSystem.typography.fontSize.md as number,
    outline: 'none'
  };

  const labelStyle = {
    fontSize: DesignSystem.typography.fontSize.sm,
    fontWeight: DesignSystem.typography.fontWeight.semibold as any,
    marginBottom: DesignSystem.spacing.sm
  };

  const fieldWrap = { marginBottom: DesignSystem.spacing.lg };
  const row = { display: 'flex', gap: DesignSystem.spacing.lg, flexDirection: 'row' as const };
  const half = { flex: 1 };

  return (
    <form autoComplete="on" style={{ width: '100%' }} onSubmit={(e) => e.preventDefault()}>
      <div style={fieldWrap as any}>
        <label htmlFor={`${section}-line1`} style={labelStyle as any}>Street Address *</label>
        <input
          id={`${section}-line1`}
          name="address-line1"
          autoComplete={`${section} address-line1`}
          disabled={disabled}
          value={value.line1}
          onChange={(e) => set('line1')(e.target.value)}
          style={{ ...baseInputStyle, borderColor: errors.line1 ? DesignSystem.colors.danger : DesignSystem.colors.border }}
          placeholder=""
          inputMode="text"
        />
        {errors.line1 ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.line1} </div> : null}
      </div>

      <div style={fieldWrap as any}>
        <label htmlFor={`${section}-line2`} style={labelStyle as any}>Unit, Apt, Suite (Optional)</label>
        <input
          id={`${section}-line2`}
          name="address-line2"
          autoComplete={`${section} address-line2`}
          disabled={disabled}
          value={value.line2 || ''}
          onChange={(e) => set('line2')(e.target.value)}
          style={{ ...baseInputStyle, borderColor: errors.line2 ? DesignSystem.colors.danger : DesignSystem.colors.border }}
          placeholder=""
          inputMode="text"
        />
        {errors.line2 ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.line2} </div> : null}
      </div>

      <div style={{ ...(row as any) }}>
        <div style={half as any}>
          <div style={fieldWrap as any}>
            <label htmlFor={`${section}-city`} style={labelStyle as any}>City *</label>
            <input
              id={`${section}-city`}
              name="address-level2"
              autoComplete={`${section} address-level2`}
              disabled={disabled}
              value={value.city}
              onChange={(e) => set('city')(e.target.value)}
              style={{ ...baseInputStyle, borderColor: errors.city ? DesignSystem.colors.danger : DesignSystem.colors.border }}
              placeholder=""
              inputMode="text"
            />
            {errors.city ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.city} </div> : null}
          </div>
        </div>

        <div style={half as any}>
          <div style={fieldWrap as any}>
            <label htmlFor={`${section}-state`} style={labelStyle as any}>State *</label>
            <input
              id={`${section}-state`}
              name="address-level1"
              autoComplete={`${section} address-level1`}
              disabled={disabled}
              value={value.state}
              onChange={(e) => set('state')(e.target.value.toUpperCase())}
              style={{ ...baseInputStyle, borderColor: errors.state ? DesignSystem.colors.danger : DesignSystem.colors.border }}
              placeholder=""
              inputMode="text"
            />
            {errors.state ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.state} </div> : null}
          </div>
        </div>
      </div>

      <div style={{ ...(row as any) }}>
        <div style={half as any}>
          <div style={fieldWrap as any}>
            <label htmlFor={`${section}-zip`} style={labelStyle as any}>ZIP Code *</label>
            <input
              id={`${section}-zip`}
              name="postal-code"
              autoComplete={`${section} postal-code`}
              disabled={disabled}
              value={value.zipCode}
              onChange={(e) => set('zipCode')(e.target.value)}
              style={{ ...baseInputStyle, borderColor: errors.zipCode ? DesignSystem.colors.danger : DesignSystem.colors.border }}
              placeholder=""
              inputMode="numeric"
            />
            {errors.zipCode ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.zipCode} </div> : null}
          </div>
        </div>

        <div style={half as any}>
          <div style={fieldWrap as any}>
            <label htmlFor={`${section}-country`} style={labelStyle as any}>Country *</label>
            <input
              id={`${section}-country`}
              name="country"
              autoComplete={`${section} country`}
              disabled={disabled}
              value={value.country}
              onChange={(e) => set('country')(e.target.value)}
              style={{ ...baseInputStyle, borderColor: errors.country ? DesignSystem.colors.danger : DesignSystem.colors.border }}
              placeholder=""
              inputMode="text"
            />
            {errors.country ? <div style={{ color: DesignSystem.colors.danger, marginTop: 6, fontSize: DesignSystem.typography.fontSize.sm }}> {errors.country} </div> : null}
          </div>
        </div>
      </div>
    </form>
  );
};