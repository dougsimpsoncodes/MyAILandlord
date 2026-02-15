import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        File: 'readonly',
        Blob: 'readonly',
        window: 'readonly',
        document: 'readonly',
        __DEV__: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: { react, 'react-native': reactNative },
    rules: {
      'no-console': 'error',
      // Prevent importing legacy client directly from screens/hooks
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../clients/ClerkSupabaseClient',
              message: 'Use useApiClient from services/api/client instead.',
            },
            {
              name: '../../clients/ClerkSupabaseClient',
              message: 'Use useApiClient from services/api/client instead.',
            },
          ],
        },
      ],
      'react/react-in-jsx-scope': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/lib/log.ts', 'src/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx', 'e2e/**/*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
