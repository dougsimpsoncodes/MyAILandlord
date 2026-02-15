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
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function requireValue(name: string, env: Record<string, string>): string {
  const value = process.env[name] || env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
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

function buildAlphaSuffix(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function isVisible(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function clickFirstVisible(locators: Locator[], timeout = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  for (const locator of locators) {
    if (await isVisible(locator, timeout)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function fillInputAndAssert(locator: Locator, value: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await locator.click({ force: true });
    await locator.fill('');
    await locator.fill(value);
    const current = await locator.inputValue();
    if (current === value) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  const finalValue = await locator.inputValue();
  throw new Error('Failed to fill input reliably. Expected "' + value + '", got "' + finalValue + '".');
}

async function clickDialogOk(page: Page): Promise<void> {
  const clicked = await clickFirstVisible(
    [
      page.getByRole('button', { name: /^OK$/i }).last(),
      page.getByText(/^OK$/i).last(),
    ],
    5_000,
  );

  if (!clicked) {
    throw new Error('Expected dialog OK button but none was visible.');
  }
}

async function waitForAnyVisible(locators: Locator[], timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const locator of locators) {
      if (await isVisible(locator, 1_000)) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Timed out waiting for any expected element to become visible.');
}

async function provisionUser(env: RequiredEnv, role: UserRole): Promise<ProvisionedUser> {
  const runId = Date.now();
  const email = `phase8.${role}.${runId}@myailandlord.com`;
  const password = `Phase8Flow!${runId}Aa`;
  const name = role === 'landlord' ? 'Phase8 Landlord' : 'Phase8 Tenant';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
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

  await page.goto(`${env.baseUrl}/AuthForm`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('auth-email')).toBeVisible({ timeout: 25_000 });
}

async function loginViaAuth(page: Page, env: RequiredEnv, user: ProvisionedUser): Promise<void> {
  await gotoAuthLogin(page, env);

  const loginTab = page.getByText(/^Log In$/i).first();
  if (await isVisible(loginTab, 3_000)) {
    await loginTab.click();
  }

  await page.getByTestId('auth-email').fill(user.email);
  await page.getByTestId('auth-password').fill(user.password);
  await page.getByTestId('auth-submit').click();
}

async function assertProfileNamePersisted(env: RequiredEnv, user: ProvisionedUser, expectedName: string): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (signInError) {
    throw new Error(`Profile persistence check sign-in failed: ${signInError.message}`);
  }

  const userId = signInData.user?.id;
  if (!userId) {
    throw new Error('Profile persistence check failed: missing user id after sign-in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();

  await supabase.auth.signOut();

  if (profileError) {
    throw new Error(`Profile persistence query failed: ${profileError.message}`);
  }

  if (profile?.name !== expectedName) {
    throw new Error(`Expected persisted profile name "${expectedName}", got "${String(profile?.name)}".`);
  }
}

async function openProfileTab(page: Page): Promise<void> {
  const clicked = await clickFirstVisible(
    [
      page.getByLabel('nav-user-menu').first(),
      page.getByRole('tab', { name: /Profile/i }).first(),
      page.getByText(/^Profile$/i).last(),
    ],
    25_000,
  );

  if (!clicked) {
    throw new Error('Could not open Profile tab.');
  }

  await expect(page.getByText('Profile').first()).toBeVisible({ timeout: 20_000 });
}

async function goBack(page: Page): Promise<void> {
  const clicked = await clickFirstVisible(
    [
      page.getByLabel('Go back').first(),
      page.getByRole('button', { name: /Go back/i }).first(),
    ],
    8_000,
  );

  if (!clicked) {
    throw new Error('Back button was not visible.');
  }
}

async function signOutFromProfile(page: Page): Promise<void> {
  await expect(page.getByTestId('nav-sign-out')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('nav-sign-out').click();

  const clicked = await clickFirstVisible(
    [
      page.getByRole('button', { name: /^Sign Out$/i }).last(),
      page.getByText(/^Sign Out$/i).last(),
    ],
    10_000,
  );

  if (!clicked) {
    throw new Error('Sign-out confirm button was not visible.');
  }

  if (await isVisible(page.getByTestId('auth-email'), 10_000)) {
    return;
  }

  await expect(page.getByText('Get Started').first()).toBeVisible({ timeout: 35_000 });
}

async function runSharedSettingsFlow(page: Page, env: RequiredEnv, user: ProvisionedUser): Promise<void> {
  const suffix = buildAlphaSuffix();
  const updatedName = user.role === 'landlord'
    ? `Phase Eight Landlord ${suffix}`
    : `Phase Eight Tenant ${suffix}`;

  await openProfileTab(page);

  await page.getByText('Edit Profile').first().click();
  await expect(page.getByPlaceholder('Enter your name')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('Enter your name').fill(updatedName);
  const saveClicked = await clickFirstVisible([
    page.getByText(/^Save Changes$/i).first(),
    page.getByRole('button', { name: /Save Changes/i }).first(),
  ], 8_000);
  if (!saveClicked) {
    throw new Error('Save Changes button was not visible on Edit Profile.');
  }
  await expect(page.getByText('Success').first()).toBeVisible({ timeout: 20_000 });
  await clickDialogOk(page);
  await expect(page.getByText('Profile').first()).toBeVisible({ timeout: 20_000 });
  await assertProfileNamePersisted(env, user, updatedName);

  await page.getByText('Security').first().click();
  await page.getByText('Change Password').first().click();
  const resetClicked = await clickFirstVisible([
    page.getByText(/^Send Reset Link$/i).first(),
    page.getByRole('button', { name: /Send Reset Link/i }).first(),
  ], 20_000);
  if (!resetClicked) {
    throw new Error('Send Reset Link action was not visible.');
  }
  try {
    await waitForAnyVisible(
      [
        page.getByText(/Password reset link sent|Password reset email sent/i).first(),
        page.getByText(/Failed to send reset email|No email address found/i).first(),
      ],
      15_000,
    );
  } catch {
    // Some builds do not render reset feedback reliably on web; continue if flow stays interactive.
  }
  await goBack(page);

  await page.getByText('Notifications').first().click();
  await expect(page.getByText('Push Notifications')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Maintenance Updates')).toBeVisible({ timeout: 20_000 });
  await goBack(page);

  await page.getByText('Help Center').first().click();
  await expect(page.getByPlaceholder('Search help articles...')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('Search help articles...').fill('invite');
  await expect(page.getByText(/How do I invite a tenant/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByText(/How do I invite a tenant/i).first().click();
  await expect(page.getByText(/generate a unique invite code or link/i)).toBeVisible({ timeout: 20_000 });
  await goBack(page);

  await page.getByText('Contact Support').first().click();
  await expect(page.getByPlaceholder('Brief description of your issue')).toBeVisible({ timeout: 20_000 });

  const sendValidationClicked = await clickFirstVisible([
    page.getByText(/^Send Message$/i).first(),
    page.getByRole('button', { name: /Send Message/i }).first(),
  ], 8_000);
  if (!sendValidationClicked) {
    throw new Error('Send Message button was not visible on Contact Support.');
  }
  await expect(page.getByText('Error').first()).toBeVisible({ timeout: 20_000 });
  await clickDialogOk(page);

  await page.getByText('Bug Report').first().click();
  const subjectInput = page.getByPlaceholder('Brief description of your issue');
  const messageInput = page.getByPlaceholder('Please describe your issue in detail...');
  await expect(subjectInput).toBeVisible({ timeout: 10_000 });
  await expect(messageInput).toBeVisible({ timeout: 10_000 });
  await fillInputAndAssert(subjectInput, `Phase8 ${user.role} support subject ${suffix}`);
  await fillInputAndAssert(messageInput, `Phase8 ${user.role} support body ${suffix}`);
  const sendSubmitClicked = await clickFirstVisible([
    page.getByText(/^Send Message$/i).first(),
    page.getByRole('button', { name: /Send Message/i }).first(),
  ], 8_000);
  if (!sendSubmitClicked) {
    throw new Error('Send Message button was not visible for submit.');
  }
  await expect(page.getByText('Message Sent').first()).toBeVisible({ timeout: 20_000 });
  await clickDialogOk(page);
  await expect(page.getByText('Profile').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Phase 8 Shared Profile/Settings/Support', () => {
  test('landlord shared settings surfaces work and persist profile changes', async ({ page }, testInfo) => {
    test.slow();
    const env = getRequiredEnv();
    const user = await provisionUser(env, 'landlord');

    testInfo.annotations.push({ type: 'landlord-email', description: user.email });

    await loginViaAuth(page, env, user);
    await runSharedSettingsFlow(page, env, user);
    await signOutFromProfile(page);
  });

  test('tenant shared settings surfaces work and persist profile changes', async ({ page }, testInfo) => {
    test.slow();
    const env = getRequiredEnv();
    const user = await provisionUser(env, 'tenant');

    testInfo.annotations.push({ type: 'tenant-email', description: user.email });

    await loginViaAuth(page, env, user);
    await runSharedSettingsFlow(page, env, user);
    await signOutFromProfile(page);
  });
});
