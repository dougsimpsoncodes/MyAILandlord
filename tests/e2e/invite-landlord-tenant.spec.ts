import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type RequiredEnv = {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type ProvisionedProperty = {
  id: string;
  name: string;
  address: string;
};

type LandlordScenario = {
  email: string;
  password: string;
  property: ProvisionedProperty;
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

async function provisionLandlordWithProperty(env: RequiredEnv): Promise<LandlordScenario> {
  const runId = Date.now();
  const email = `e2e.landlord.${runId}@myailandlord.com`;
  const password = `LandlordFlow!${runId}`;
  const propertyName = `E2E QA Property ${runId}`;
  const propertyAddress = '100 Test Way, Los Angeles, CA 90001';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'E2E Landlord',
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
    throw new Error('Provisioning failed: no user ID returned after landlord signup/sign-in.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name: 'E2E Landlord',
      role: 'landlord',
      onboarding_completed: true,
    }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Failed to set landlord profile role: ${profileError.message}`);
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      name: propertyName,
      address: propertyAddress,
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      user_id: userId,
      landlord_id: userId,
      allow_tenant_signup: true,
    })
    .select('id, name, address')
    .single();

  await supabase.auth.signOut();

  if (propertyError || !property) {
    throw new Error(`Failed to create test property: ${propertyError?.message || 'unknown error'}`);
  }

  return {
    email,
    password,
    property: {
      id: property.id,
      name: property.name,
      address: property.address || propertyAddress,
    },
  };
}

async function loginLandlord(page: Page, env: RequiredEnv, scenario: LandlordScenario): Promise<void> {
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  const authEmailInput = page.getByTestId('auth-email');

  if (!(await isVisible(authEmailInput, 5_000))) {
    const signInText = page.getByText(/Sign In/i).first();
    if (await isVisible(signInText, 6_000)) {
      await signInText.click();
    }
  }

  await expect(authEmailInput).toBeVisible({ timeout: 25_000 });
  await page.getByTestId('auth-email').fill(scenario.email);
  await page.getByTestId('auth-password').fill(scenario.password);
  await page.getByTestId('auth-submit').click();

  const onHome = await isVisible(page.getByText('My AI Landlord').first(), 50_000);
  if (!onHome) {
    const maybeError = await page
      .locator('text=/Invalid email or password|Too many login attempts|Failed to sign in/i')
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(`Landlord login did not reach home. UI error: ${maybeError || 'none'}`);
  }
}

async function waitForPropertyDetailsReady(page: Page): Promise<void> {
  await expect(page.getByText('Property Details')).toBeVisible({ timeout: 25_000 });

  if (await isVisible(page.getByText('Unable to load property').first(), 5_000)) {
    const retryButton = page.getByRole('button', { name: 'Retry' });
    if (await isVisible(retryButton, 3_000)) {
      await retryButton.click();
    }
  }

  await expect(page.getByTestId('invite-tenant')).toBeVisible({ timeout: 30_000 });
}

async function completeInviteSignup(page: Page, tenantEmail: string, tenantPassword: string): Promise<void> {
  await expect(page.getByText('What should we call you?')).toBeVisible({ timeout: 40_000 });

  const tenantFirstName = 'Tenantqa';
  await page.getByTestId('onboarding-name-input').fill(tenantFirstName);
  await page.getByTestId('onboarding-name-continue').click();

  await expect(page.getByTestId('onboarding-account-create')).toBeVisible({ timeout: 40_000 });

  await page.getByTestId('onboarding-email-input').fill(tenantEmail);
  await page.getByTestId('onboarding-password-input').fill(tenantPassword);
  await page.getByTestId('onboarding-confirm-password-input').fill(tenantPassword);

  await page.getByTestId('terms-checkbox').click();
  await page.getByTestId('onboarding-account-create').click();
}

async function waitForTenantLinked(page: Page): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (await isVisible(page.getByTestId('tenant-property-list'), 1_500)) {
      return;
    }

    if (await isVisible(page.getByTestId('invite-invalid'), 1_000)) {
      const details = await page.getByTestId('invite-invalid').textContent();
      throw new Error(`Invite became invalid during acceptance: ${details || 'unknown error'}`);
    }

    if (await isVisible(page.getByTestId('invite-property-preview'), 1_000)) {
      const acceptButton = page.getByTestId('invite-accept');
      if (await isVisible(acceptButton, 1_000)) {
        await acceptButton.click();
      }
    }

    await page.waitForTimeout(1_000);
  }

  throw new Error('Timed out waiting for tenant home after invite acceptance.');
}

async function assertTenantLinkInDatabase(
  env: RequiredEnv,
  tenantEmail: string,
  tenantPassword: string,
  propertyId: string,
): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: tenantEmail,
    password: tenantPassword,
  });

  if (signInError) {
    throw new Error(`Tenant sign-in failed after invite flow: ${signInError.message}`);
  }

  const { data, error } = await supabase
    .from('tenant_property_links')
    .select('property_id, is_active')
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .limit(1);

  await supabase.auth.signOut();

  if (error) {
    throw new Error(`Failed verifying tenant link: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Tenant account was created but no active tenant_property_link was found for invited property.');
  }
}

test.describe('Landlord + Tenant Invite Flow', () => {
  test('landlord generates invite and new tenant accepts it end-to-end', async ({ browser, page }, testInfo) => {
    test.slow();

    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithProperty(env);

    const runId = Date.now();
    const tenantEmail = `e2e.tenant.${runId}@myailandlord.com`;
    const tenantPassword = `TenantFlow!${runId}`;

    await loginLandlord(page, env, scenario);

    const propertyRow = page.getByText(scenario.property.name, { exact: false }).first();
    await expect(propertyRow).toBeVisible({ timeout: 30_000 });
    await propertyRow.click();

    await waitForPropertyDetailsReady(page);
    await page.getByTestId('invite-tenant').click();

    await expect(page.getByTestId('invite-mode-code')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('invite-mode-code').click();

    if (await isVisible(page.getByTestId('invite-generate'), 3_000)) {
      await page.getByTestId('invite-generate').click();
    }

    await expect(page.getByTestId('invite-code')).toBeVisible({ timeout: 35_000 });

    const inviteToken = (await page.getByTestId('invite-code').textContent())?.trim();
    if (!inviteToken) {
      throw new Error('Invite token was not present in UI after generation.');
    }

    const inviteUrl = `${env.baseUrl}/invite?t=${encodeURIComponent(inviteToken)}&property=${encodeURIComponent(scenario.property.id)}`;

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'tenant-email', description: tenantEmail });
    testInfo.annotations.push({ type: 'property-id', description: scenario.property.id });
    testInfo.annotations.push({ type: 'invite-url', description: inviteUrl });

    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();

    try {
      await tenantPage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
      const invitePreview = tenantPage.getByTestId('invite-property-preview');
      await expect(invitePreview).toBeVisible({ timeout: 35_000 });
      await expect(invitePreview).toContainText(scenario.property.name);
      await expect(invitePreview).toContainText(scenario.property.address);

      await tenantPage.getByTestId('invite-accept').click();
      await completeInviteSignup(tenantPage, tenantEmail, tenantPassword);
      await waitForTenantLinked(tenantPage);

      await expect(tenantPage.getByTestId('tenant-property-list')).toBeVisible({ timeout: 20_000 });
      await expect(tenantPage.getByText('No Property Linked')).toHaveCount(0);

      await assertTenantLinkInDatabase(env, tenantEmail, tenantPassword, scenario.property.id);
    } finally {
      await tenantContext.close();
    }
  });
});
