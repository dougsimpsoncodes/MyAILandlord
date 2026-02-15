import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type RequiredEnv = {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type UserRole = 'landlord' | 'tenant';

type ProvisionedUser = {
  email: string;
  password: string;
  role: UserRole;
};

const DEFAULT_TIMEOUT_MS = 5_000;

function readDotEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function requireValue(name: string, env: Record<string, string>): string {
  const value = process.env[name] || env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getRequiredEnv(): RequiredEnv {
  const dotEnv = readDotEnv();

  return {
    baseUrl: process.env.E2E_BASE_URL || 'http://localhost:8081',
    supabaseUrl: requireValue('EXPO_PUBLIC_SUPABASE_URL', dotEnv),
    supabaseAnonKey: requireValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', dotEnv),
  };
}

function createNoPersistSupabaseClient(env: RequiredEnv) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function isVisible(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function provisionUser(env: RequiredEnv, role: UserRole): Promise<ProvisionedUser> {
  const runId = Date.now();
  const email = `phase1.${role}.${runId}@myailandlord.com`;
  const password = `Phase1Auth!${runId}Aa`;
  const name = role === 'landlord' ? 'Phase1 Landlord' : 'Phase1 Tenant';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to provision ${role} account: ${signUpError.message}`);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Provisioned ${role} sign-in failed: ${signInError.message}`);
  }

  const userId = signInData.user?.id || signUpData.user?.id;
  if (!userId) {
    throw new Error(`Provisioning ${role} failed: no user id returned.`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name,
      role,
      onboarding_completed: true,
    }, { onConflict: 'id' });

  await supabase.auth.signOut();

  if (profileError) {
    throw new Error(`Failed to set ${role} profile: ${profileError.message}`);
  }

  return { email, password, role };
}

async function gotoAuthLogin(page: Page, env: RequiredEnv): Promise<void> {
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  if (await isVisible(page.getByTestId('auth-email'), 5_000)) {
    return;
  }

  const signInLink = page.getByText(/Sign In/i).first();
  if (await isVisible(signInLink, 5_000)) {
    await signInLink.click();
  }

  if (await isVisible(page.getByTestId('auth-email'), 8_000)) {
    return;
  }

  // Deep-link fallback for environments that don't land on auth by default.
  await page.goto(`${env.baseUrl}/AuthForm`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('auth-email')).toBeVisible({ timeout: 25_000 });
}

async function loginViaAuth(page: Page, email: string, password: string): Promise<void> {
  const loginTab = page.getByText(/^Log In$/i).first();
  if (await isVisible(loginTab, 3_000)) {
    await loginTab.click();
  }

  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
  const profileTab = page.getByRole('tab', { name: /Profile|nav-user-menu/i }).first();
  await expect(profileTab).toBeVisible({ timeout: 50_000 });
}

async function signOutFromProfile(page: Page): Promise<void> {
  const profileTab = page.getByRole('tab', { name: /Profile|nav-user-menu/i }).first();
  await expect(profileTab).toBeVisible({ timeout: 25_000 });
  await profileTab.click();

  await expect(page.getByTestId('nav-sign-out')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('nav-sign-out').click();

  if (!(await isVisible(page.getByTestId('auth-email'), 5_000))) {
    const confirmByRole = page.getByRole('button', { name: /^Sign Out$/i }).last();
    if (await isVisible(confirmByRole, 5_000)) {
      await confirmByRole.click();
    } else {
      const confirmByText = page.getByText(/^Sign Out$/i).last();
      if (await isVisible(confirmByText, 5_000)) {
        await confirmByText.click();
      }
    }
  }

  if (await isVisible(page.getByTestId('auth-email'), 8_000)) {
    return;
  }

  await expect(page.getByText('Get Started').first()).toBeVisible({ timeout: 40_000 });
}

async function runOnboardingToRoleSelection(page: Page, env: RequiredEnv, role: UserRole): Promise<void> {
  const runId = Date.now();
  const firstName = role === 'landlord' ? 'LandlordFlow' : 'TenantFlow';
  const email = `phase1.onboarding.${role}.${runId}@myailandlord.com`;
  const password = `OnboardFlow!${runId}Aa`;

  await page.goto(`${env.baseUrl}/OnboardingWelcome`, { waitUntil: 'domcontentloaded' });

  if (!(await isVisible(page.getByText('Get Started').first(), 8_000))) {
    await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByText('Get Started').first()).toBeVisible({ timeout: 25_000 });
  await page.getByText('Get Started').first().click();

  await expect(page.getByTestId('onboarding-name-input')).toBeVisible({ timeout: 25_000 });
  await page.getByTestId('onboarding-name-input').fill(firstName);
  await page.getByTestId('onboarding-name-continue').click();

  await expect(page.getByTestId('onboarding-email-input')).toBeVisible({ timeout: 25_000 });
  await page.getByTestId('onboarding-email-input').fill(email);
  await page.getByTestId('onboarding-password-input').fill(password);
  await page.getByTestId('onboarding-confirm-password-input').fill(password);
  await page.getByTestId('terms-checkbox').click();
  await page.getByTestId('onboarding-account-create').click();

  await expect(page.getByText(/How will you use/i)).toBeVisible({ timeout: 45_000 });

  if (role === 'landlord') {
    await page.getByText(/I'm a Landlord/i).click();
  } else {
    await page.getByText(/I'm a Tenant/i).click();
  }

  const roleContinueButton = page.getByRole('button', { name: /^Continue$/i }).last();
  if (await isVisible(roleContinueButton, 3_000)) {
    await roleContinueButton.click();
  } else {
    await page.getByText(/^Continue$/i).last().click();
  }

  if (role === 'landlord') {
    await expect(page.getByText(/Landlord Setup/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Let's Set Up Your First Property/i)).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(page.getByText(/Tenant Setup/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Connect to My Property/i)).toBeVisible({ timeout: 20_000 });
  }
}

test.describe('Phase 1 Auth + Role Routing', () => {
  test('invalid credentials render auth error', async ({ page }) => {
    const env = getRequiredEnv();
    await gotoAuthLogin(page, env);

    await page.getByTestId('auth-email').fill(`invalid.${Date.now()}@myailandlord.com`);
    await page.getByTestId('auth-password').fill('wrong-password');
    await page.getByTestId('auth-submit').click();

    await expect(page.getByText(/Invalid email or password|Too many login attempts|Failed to sign in/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('landlord account routes to landlord navigator and can sign out', async ({ page }, testInfo) => {
    test.slow();

    const env = getRequiredEnv();
    const user = await provisionUser(env, 'landlord');
    testInfo.annotations.push({ type: 'landlord-email', description: user.email });

    await gotoAuthLogin(page, env);
    await loginViaAuth(page, user.email, user.password);

    await expect(page.getByRole('tab', { name: /Properties|nav-properties/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('tab', { name: /Requests/i }).first()).toBeVisible({ timeout: 20_000 });

    await signOutFromProfile(page);
  });

  test('tenant account routes to tenant navigator and can sign out', async ({ page }, testInfo) => {
    test.slow();

    const env = getRequiredEnv();
    const user = await provisionUser(env, 'tenant');
    testInfo.annotations.push({ type: 'tenant-email', description: user.email });

    await gotoAuthLogin(page, env);
    await loginViaAuth(page, user.email, user.password);

    await expect(page.getByRole('tab', { name: /Requests/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('tab', { name: /Messages/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: /Properties|nav-properties/i })).toHaveCount(0);
    await expect(page.getByText(/No Property Linked|Link to Property/i).first()).toBeVisible({ timeout: 30_000 });

    await signOutFromProfile(page);
  });

  test('onboarding role selection routes to landlord and tenant setup screens', async ({ browser }) => {
    test.slow();

    const env = getRequiredEnv();

    const landlordContext = await browser.newContext();
    const landlordPage = await landlordContext.newPage();
    try {
      await runOnboardingToRoleSelection(landlordPage, env, 'landlord');
    } finally {
      await landlordContext.close();
    }

    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();
    try {
      await runOnboardingToRoleSelection(tenantPage, env, 'tenant');
    } finally {
      await tenantContext.close();
    }
  });
});
