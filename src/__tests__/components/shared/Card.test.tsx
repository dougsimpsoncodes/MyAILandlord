/**
 * Card Component Tests
 *
 * Tests for the shared Card component - focuses on rendering, not implementation details
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../../../components/shared/Card';

describe('Card Component', () => {
  test('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );

    expect(getByText('Card Content')).toBeTruthy();
  });

  test('renders with default props', () => {
    const { getByText } = render(
      <Card>
        <Text>Content</Text>
      </Card>
    );

    // Component renders without error with default props
    expect(getByText('Content')).toBeTruthy();
  });

  test('accepts different padding sizes', () => {
    const paddingSizes: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];

    paddingSizes.forEach((padding) => {
      const { getByText } = render(
        <Card padding={padding}>
          <Text>Content {padding}</Text>
        </Card>
      );

      expect(getByText(`Content ${padding}`)).toBeTruthy();
    });
  });

  test('accepts different elevation levels', () => {
    const elevations: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];

    elevations.forEach((elevation) => {
      const { getByText } = render(
        <Card elevation={elevation}>
          <Text>Content {elevation}</Text>
        </Card>
      );

      expect(getByText(`Content ${elevation}`)).toBeTruthy();
    });
  });

  test('accepts custom background color', () => {
    const customBg = '#FF5733';
    const { getByText } = render(
      <Card backgroundColor={customBg}>
        <Text>Content</Text>
      </Card>
    );

    expect(getByText('Content')).toBeTruthy();
  });

  test('accepts custom styles', () => {
    const customStyle = { margin: 20, borderWidth: 2 };
    const { getByText } = render(
      <Card style={customStyle}>
        <Text>Content</Text>
      </Card>
    );

    expect(getByText('Content')).toBeTruthy();
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

  test('combines all props without error', () => {
    const customBg = '#EEEEEE';
    const customStyle = { marginVertical: 10 };

    const { getByText } = render(
      <Card
        elevation="md"
        padding="sm"
        backgroundColor={customBg}
        style={customStyle}
      >
        <Text>Combined Props</Text>
      </Card>
    );

    expect(getByText('Combined Props')).toBeTruthy();
  });
});
