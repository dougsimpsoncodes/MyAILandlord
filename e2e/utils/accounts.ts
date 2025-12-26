import { Page, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { MailpitPage } from '../pom/MailpitPage';

export function generateTestEmail(prefix: string, domain = 'example.com') {
  const run = process.env.CI ? `ci${Date.now()}` : `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  return `${prefix}+${run}@${domain}`;
}

export async function ensureLoggedIn(page: Page, opts: {
  email: string;
  password?: string;
  timeoutMs?: number;
}) {
  const { email, timeoutMs = 15000 } = opts;
  const password = opts.password || 'Password123!';
  const auth = new AuthPage(page);

  // Login only. For invite flows we rely on pre-created, auto-confirmed accounts.
  // If login fails, guide the developer to create the test users.
  try {
    await auth.login(email, password);

    // After login, user could land on:
    // 1. Dashboard (if they have properties) - look for visible dashboard elements
    // 2. Property setup wizard (if landlord with no properties) - look for property intro text
    // Wait for any success indicator
    const dashboardElements = page.getByRole('tab', { name: /home|dashboard/i })
      .or(page.getByText(/properties \(/i))  // "Properties (1)"
      .or(page.getByText(/maintenance \(/i)) // "Maintenance (0)"
      .first();
    const propertyIntro = page.getByText(/let's add your property/i).first();

    await Promise.race([
      expect(dashboardElements).toBeVisible({ timeout: 10000 }),
      expect(propertyIntro).toBeVisible({ timeout: 10000 }),
    ]);
    return;
  } catch (loginError) {
    const help =
      `Login failed for ${email}. Create test users in Supabase (Auth → Users):\n` +
      `- landlord@test.com / Password123! (Auto-confirm ✓)\n` +
      `- tenant@test.com / Password123! (Auto-confirm ✓)`;
    throw new Error(`${help}\nOriginal error: ${loginError}`);
  }
}
