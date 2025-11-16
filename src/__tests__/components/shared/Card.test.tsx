/**
 * Card Component Tests
 *
 * Tests for the shared Card component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../../../components/shared/Card';
import { DesignSystem } from '../../../theme/DesignSystem';

describe('Card Component', () => {
  test('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );

    expect(getByText('Card Content')).toBeTruthy();
  });

  test('applies default padding (lg)', () => {
    const { getByTestId } = render(
      <Card>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          padding: DesignSystem.spacing.lg,
        }),
      ])
    );
  });

  test('applies different padding sizes', () => {
    const paddingSizes: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];

    paddingSizes.forEach((padding) => {
      const { getByTestId } = render(
        <Card padding={padding}>
          <Text testID={`card-${padding}`}>Content</Text>
        </Card>
      );

      const card = getByTestId(`card-${padding}`).parent;
      const expectedPadding =
        padding === 'none'
          ? 0
          : DesignSystem.spacing[padding as 'sm' | 'md' | 'lg'];

      expect(card?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: expectedPadding,
          }),
        ])
      );
    });
  });

  test('applies default elevation (sm)', () => {
    const { getByTestId } = render(
      <Card>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(DesignSystem.elevation.sm)])
    );
  });

  test('applies different elevation levels', () => {
    const elevations: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];

    elevations.forEach((elevation) => {
      const { getByTestId } = render(
        <Card elevation={elevation}>
          <Text testID={`card-${elevation}`}>Content</Text>
        </Card>
      );

      const card = getByTestId(`card-${elevation}`).parent;
      expect(card?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(DesignSystem.elevation[elevation]),
        ])
      );
    });
  });

  test('applies default background color', () => {
    const { getByTestId } = render(
      <Card>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: DesignSystem.colors.background,
        }),
      ])
    );
  });

  test('applies custom background color', () => {
    const customBg = '#FF5733';
    const { getByTestId } = render(
      <Card backgroundColor={customBg}>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: customBg,
        }),
      ])
    );
  });

  test('applies border radius', () => {
    const { getByTestId } = render(
      <Card>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderRadius: DesignSystem.radius.md,
        }),
      ])
    );
  });

  test('applies custom styles', () => {
    const customStyle = { margin: 20, borderWidth: 2 };
    const { getByTestId } = render(
      <Card style={customStyle}>
        <Text testID="card-content">Content</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  test('renders multiple children', () => {
    const { getByText } = render(
      <Card>
        <Text>First Child</Text>
        <Text>Second Child</Text>
        <Text>Third Child</Text>
      </Card>
    );

    expect(getByText('First Child')).toBeTruthy();
    expect(getByText('Second Child')).toBeTruthy();
    expect(getByText('Third Child')).toBeTruthy();
  });

  test('can combine all props', () => {
    const customBg = '#EEEEEE';
    const customStyle = { marginVertical: 10 };

    const { getByTestId } = render(
      <Card
        elevation="md"
        padding="sm"
        backgroundColor={customBg}
        style={customStyle}
      >
        <Text testID="card-content">Combined Props</Text>
      </Card>
    );

    const card = getByTestId('card-content').parent;
    expect(card?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: customBg,
          padding: DesignSystem.spacing.sm,
          ...DesignSystem.elevation.md,
          borderRadius: DesignSystem.radius.md,
          ...customStyle,
        }),
      ])
    );
  });
});
