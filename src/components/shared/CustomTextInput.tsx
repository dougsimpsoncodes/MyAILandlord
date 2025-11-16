import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

interface CustomTextInputProps extends TextInputProps {
  error?: boolean;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({ style, error, ...props }) => {
  return (
    <TextInput
      style={[
        styles.input,
        error && styles.inputError,
        style,
      ]}
      placeholderTextColor="#999"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#ff4444',
  },
});

export default CustomTextInput;