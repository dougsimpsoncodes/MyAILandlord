import { globalSetup } from './helpers/test-data-seeder';

/**
 * Playwright Global Setup
 *
 * This file runs once before all tests to seed the database with test data.
 * It ensures that tests requiring specific database records can run successfully.
 */
export default async function setup() {
  console.log('\n========================================');
  console.log('Running Playwright Global Setup');
  console.log('========================================\n');

  await globalSetup();

  console.log('\n========================================');
  console.log('Global Setup Complete');
  console.log('========================================\n');
}
