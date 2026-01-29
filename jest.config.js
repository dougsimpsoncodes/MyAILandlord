/**
 * Jest configuration for Expo React Native + TypeScript project.
 * Note: Requires installing dev deps locally:
 *   - jest, jest-expo, @testing-library/react-native, @testing-library/jest-native,
 *   - ts-jest or babel-jest (jest-expo includes transforms), @types/jest
 */
/**
 * Jest configuration for Expo React Native + TypeScript project.
 * Note: Requires installing dev deps locally:
 *   - jest, jest-expo, @testing-library/react-native, @testing-library/jest-native,
 *   - ts-jest or babel-jest (jest-expo includes transforms), @types/jest
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|@expo|expo|expo-.*|@expo/vector-icons)'
  ],
};
