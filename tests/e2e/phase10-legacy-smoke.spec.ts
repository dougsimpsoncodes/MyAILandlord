import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type RequiredEnv = {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type ProvisionedLandlord = {
  email: string;
  password: string;
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

async function isVisible(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function provisionLandlord(env: RequiredEnv): Promise<ProvisionedLandlord> {
  const runId = Date.now();
  const email = `phase10.landlord.${runId}@myailandlord.com`;
  const password = `Phase10Landlord!${runId}Aa`;

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Phase10 Landlord',
        role: 'landlord',
      },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to provision landlord account: ${signUpError.message}`);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Provisioned landlord sign-in failed: ${signInError.message}`);
  }

  const userId = signInData.user?.id || signUpData.user?.id;
  if (!userId) {
    throw new Error('Provisioning landlord failed: no user id returned.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name: 'Phase10 Landlord',
      role: 'landlord',
      onboarding_completed: true,
    }, { onConflict: 'id' });

  await supabase.auth.signOut();

  if (profileError) {
    throw new Error(`Failed to set landlord profile role: ${profileError.message}`);
  }

  return { email, password };
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

async function loginViaAuth(page: Page, env: RequiredEnv, user: ProvisionedLandlord): Promise<void> {
  await gotoAuthLogin(page, env);

  const loginTab = page.getByText(/^Log In$/i).first();
  if (await isVisible(loginTab, 3_000)) {
    await loginTab.click();
  }

  await page.getByTestId('auth-email').fill(user.email);
  await page.getByTestId('auth-password').fill(user.password);
  await page.getByTestId('auth-submit').click();

  await expect(page.getByText('My AI Landlord').first()).toBeVisible({ timeout: 40_000 });
}

test.describe('Phase 10 Legacy Route Smoke', () => {
  test('legacy routes do not crash the app shell', async ({ page }, testInfo) => {
    const env = getRequiredEnv();
    const user = await provisionLandlord(env);

    testInfo.annotations.push({ type: 'landlord-email', description: user.email });

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await loginViaAuth(page, env, user);

    const legacyRoutes = [
      'PropertyPhotos',
      'RoomSelection',
      'RoomPhotography',
      'AssetScanning',
      'AssetDetails',
      'AssetPhotos',
      'ReviewSubmit',
    ];

    for (const route of legacyRoutes) {
      const url = `${env.baseUrl}/${route}?draftId=legacy-smoke-${Date.now()}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1_500);

      const bodyText = await page.locator('body').innerText();

      expect.soft(bodyText.length).toBeGreaterThan(20);
      expect.soft(bodyText).not.toContain('A client-side exception has occurred');
      expect.soft(bodyText).toMatch(/My AI Landlord|Property|Requests|Get Started|Sign In/i);
    }

    expect(pageErrors, `Legacy route navigation produced JS errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});
