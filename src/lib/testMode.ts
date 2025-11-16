export const isTestMode =
  typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_TEST_MODE === '1';
