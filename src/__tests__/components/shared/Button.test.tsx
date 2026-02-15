/**
 * Button Component Tests
 *
 * Tests for the shared Button component - focuses on behavior, not implementation details
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../components/shared/Button';

describe('Button Component', () => {
  test('renders with title', () => {
    const { getByText } = render(
      <Button title="Click Me" onPress={() => {}} />
    );

    expect(getByText('Click Me')).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Click Me'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} disabled />
    );

    fireEvent.press(getByText('Click Me'));

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  test('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} loading />
    );

    fireEvent.press(getByText('Click Me'));

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  test('shows loading indicator when loading', () => {
    const { UNSAFE_queryAllByType } = render(
      <Button title="Click Me" onPress={() => {}} loading />
    );

    // ActivityIndicator should be present when loading
    const ActivityIndicator = require('react-native').ActivityIndicator;
    const indicators = UNSAFE_queryAllByType(ActivityIndicator);
    expect(indicators.length).toBeGreaterThan(0);
  });

  test('renders different button types without errors', () => {
    const types: Array<'primary' | 'secondary' | 'danger' | 'success' | 'warning'> = [
      'primary',
      'secondary',
      'danger',
      'success',
      'warning',
    ];

    types.forEach((type) => {
      const { getByText } = render(
        <Button title={`${type} button`} onPress={() => {}} type={type} />
      );

      expect(getByText(`${type} button`)).toBeTruthy();
    });
  });

  test('renders different sizes without errors', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      const { getByText } = render(
        <Button title={`${size} button`} onPress={() => {}} size={size} />
      );

      expect(getByText(`${size} button`)).toBeTruthy();
    });
  });

  test('renders with icon', () => {
    const TestIcon = () => <></>;

    const { getByText } = render(
      <Button title="With Icon" onPress={() => {}} icon={<TestIcon />} />
    );

    expect(getByText('With Icon')).toBeTruthy();
  });

  test('renders full width button', () => {
    const { getByText } = render(
      <Button title="Full Width" onPress={() => {}} fullWidth />
    );

    expect(getByText('Full Width')).toBeTruthy();
  });

  test('accepts custom styles without error', () => {
    const customStyle = { margin: 20 };
    const { getByText } = render(
      <Button title="Styled Button" onPress={() => {}} style={customStyle} />
    );

    expect(getByText('Styled Button')).toBeTruthy();
  });

  test('accepts custom text styles without error', () => {
    const customTextStyle = { fontStyle: 'italic' as const };
    const { getByText } = render(
      <Button title="Custom Text" onPress={() => {}} textStyle={customTextStyle} />
    );

    expect(getByText('Custom Text')).toBeTruthy();
  });

  test('sets accessibility label', () => {
    const { getByLabelText } = render(
      <Button
        title="Accessible Button"
        onPress={() => {}}
        accessibilityLabel="Custom Label"
      />
    );

    expect(getByLabelText('Custom Label')).toBeTruthy();
  });

  test('uses title as default accessibility label', () => {
    const { getByLabelText } = render(
      <Button title="Default Label" onPress={() => {}} />
    );

    expect(getByLabelText('Default Label')).toBeTruthy();
  });

  test('sets accessibility hint', () => {
    const { getByA11yHint } = render(
      <Button
        title="Hinted Button"
        onPress={() => {}}
        accessibilityHint="This button does something"
      />
    );

    expect(getByA11yHint('This button does something')).toBeTruthy();
  });

  test('has button accessibility role', () => {
    const { getByRole } = render(<Button title="Role Button" onPress={() => {}} />);

    expect(getByRole('button')).toBeTruthy();
  });

  test('renders disabled button', () => {
    const { getByText } = render(
      <Button title="Disabled Button" onPress={() => {}} disabled />
    );

    expect(getByText('Disabled Button')).toBeTruthy();
  });
});
