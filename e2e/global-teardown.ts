import { globalTeardown } from './helpers/test-data-seeder';

/**
 * Playwright Global Teardown
 *
 * This file runs once after all tests complete to clean up test data.
 * It removes the seeded test records to keep the database clean.
 */
export default async function teardown() {
  console.log('\n========================================');
  console.log('Running Playwright Global Teardown');
  console.log('========================================\n');

  // Skip cleanup in CI to preserve test data for debugging
  if (process.env.CI) {
    console.log('Skipping cleanup in CI environment');
    return;
  }

  await globalTeardown();

  console.log('\n========================================');
  console.log('Global Teardown Complete');
  console.log('========================================\n');
}
