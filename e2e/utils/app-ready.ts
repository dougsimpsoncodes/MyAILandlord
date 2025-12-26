import { Page } from '@playwright/test';

export async function waitForAppReady(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 30000;

  // Ensure DOM is loaded
  await page.waitForLoadState('domcontentloaded', { timeout });

  // Wait for the hidden "app-ready" test marker
  // This is rendered in AppNavigator outside NavigationContainer
  const marker = page.getByTestId('app-ready');
  await marker.waitFor({ timeout });

  // Short settle for hydration/React initial work
  await page.waitForTimeout(250);
}
