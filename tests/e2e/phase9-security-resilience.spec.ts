import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type RequiredEnv = {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type LandlordScenario = {
  email: string;
  password: string;
  property: {
    id: string;
    name: string;
    address: string;
  };
};

type ProvisionedTenant = {
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

async function provisionLandlordWithProperty(env: RequiredEnv): Promise<LandlordScenario> {
  const runId = Date.now();
  const email = `phase9.landlord.${runId}@myailandlord.com`;
  const password = `Phase9Landlord!${runId}Aa`;
  const propertyName = `Phase9 Security Property ${runId}`;
  const propertyAddress = '501 Security Blvd, Los Angeles, CA 90001';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Phase9 Landlord',
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
      name: 'Phase9 Landlord',
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

async function provisionUnlinkedTenant(env: RequiredEnv): Promise<ProvisionedTenant> {
  const runId = Date.now();
  const email = `phase9.tenant.${runId}@myailandlord.com`;
  const password = `Phase9Tenant!${runId}Aa`;

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Phase9 Tenant',
        role: 'tenant',
      },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to provision tenant account: ${signUpError.message}`);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Provisioned tenant sign-in failed: ${signInError.message}`);
  }

  const userId = signInData.user?.id || signUpData.user?.id;
  if (!userId) {
    throw new Error('Provisioning tenant failed: no user id returned.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name: 'Phase9 Tenant',
      role: 'tenant',
      onboarding_completed: true,
    }, { onConflict: 'id' });

  await supabase.auth.signOut();

  if (profileError) {
    throw new Error(`Failed to set tenant profile role: ${profileError.message}`);
  }

  return { email, password };
}

async function createInviteToken(
  env: RequiredEnv,
  landlordEmail: string,
  landlordPassword: string,
  propertyId: string,
): Promise<string> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: landlordEmail,
    password: landlordPassword,
  });

  if (signInError) {
    throw new Error(`Landlord sign-in failed for invite token creation: ${signInError.message}`);
  }

  try {
    const { data, error } = await supabase.rpc('create_invite', {
      p_property_id: propertyId,
      p_delivery_method: 'code',
      p_intended_email: null,
    });

    if (error) {
      throw new Error(`create_invite RPC failed: ${error.message}`);
    }

    const token = Array.isArray(data) ? data[0]?.token : null;
    if (!token || typeof token !== 'string') {
      throw new Error(`create_invite RPC did not return a token. Body: ${JSON.stringify(data)}`);
    }

    return token;
  } finally {
    await supabase.auth.signOut();
  }
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

async function loginViaAuth(page: Page, env: RequiredEnv, email: string, password: string): Promise<void> {
  await gotoAuthLogin(page, env);

  const loginTab = page.getByText(/^Log In$/i).first();
  if (await isVisible(loginTab, 3_000)) {
    await loginTab.click();
  }

  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
}

async function completeInviteSignup(page: Page, tenantEmail: string, tenantPassword: string): Promise<void> {
  await expect(page.getByText('What should we call you?')).toBeVisible({ timeout: 40_000 });

  await page.getByTestId('onboarding-name-input').fill('Tenantqa');
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

async function assertActiveTenantLinkCount(
  env: RequiredEnv,
  landlordEmail: string,
  landlordPassword: string,
  propertyId: string,
  expectedCount: number,
): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: landlordEmail,
    password: landlordPassword,
  });

  if (signInError) {
    throw new Error(`Landlord sign-in failed for link-count assertion: ${signInError.message}`);
  }

  try {
    const { data, error } = await supabase
      .from('tenant_property_links')
      .select('id')
      .eq('property_id', propertyId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`tenant_property_links query failed: ${error.message}`);
    }

    const count = data?.length || 0;
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} active tenant links for property ${propertyId}, got ${count}.`);
    }
  } finally {
    await supabase.auth.signOut();
  }
}

test.describe('Phase 9 Security + Resilience', () => {
  test('invalid invite token is rejected in UI', async ({ page }) => {
    const env = getRequiredEnv();

    await page.goto(`${env.baseUrl}/invite?t=INVALIDTOKEN123&property=11111111-1111-1111-1111-111111111111`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('invite-invalid')).toBeVisible({ timeout: 35_000 });
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible({ timeout: 20_000 });
  });

  test('invite URL property mismatch is blocked', async ({ page }, testInfo) => {
    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithProperty(env);
    const token = await createInviteToken(env, scenario.email, scenario.password, scenario.property.id);

    const wrongPropertyId = '11111111-1111-1111-1111-111111111111';
    const inviteUrl = `${env.baseUrl}/invite?t=${encodeURIComponent(token)}&property=${encodeURIComponent(wrongPropertyId)}`;

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'property-id', description: scenario.property.id });
    testInfo.annotations.push({ type: 'invite-url', description: inviteUrl });

    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('invite-invalid')).toBeVisible({ timeout: 35_000 });
    await expect(page.getByText(/does not match the expected property|invalid or has expired/i)).toBeVisible({ timeout: 20_000 });
  });

  test('invite token cannot be reused after first successful acceptance', async ({ browser }, testInfo) => {
    test.slow();
    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithProperty(env);
    const token = await createInviteToken(env, scenario.email, scenario.password, scenario.property.id);

    const runId = Date.now();
    const firstTenantEmail = `phase9.accept.tenant1.${runId}@myailandlord.com`;
    const firstTenantPassword = `Phase9Tenant1!${runId}Aa`;
    const secondTenantEmail = `phase9.accept.tenant2.${runId}@myailandlord.com`;
    const secondTenantPassword = `Phase9Tenant2!${runId}Aa`;

    const inviteUrl = `${env.baseUrl}/invite?t=${encodeURIComponent(token)}&property=${encodeURIComponent(scenario.property.id)}`;

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'first-tenant-email', description: firstTenantEmail });
    testInfo.annotations.push({ type: 'second-tenant-email', description: secondTenantEmail });
    testInfo.annotations.push({ type: 'invite-url', description: inviteUrl });

    const tenantOneContext = await browser.newContext();
    const tenantOnePage = await tenantOneContext.newPage();

    try {
      await tenantOnePage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
      await expect(tenantOnePage.getByTestId('invite-property-preview')).toBeVisible({ timeout: 35_000 });
      await tenantOnePage.getByTestId('invite-accept').click();
      await completeInviteSignup(tenantOnePage, firstTenantEmail, firstTenantPassword);
      await waitForTenantLinked(tenantOnePage);
      await expect(tenantOnePage.getByTestId('tenant-property-list')).toBeVisible({ timeout: 20_000 });
    } finally {
      await tenantOneContext.close();
    }

    await assertActiveTenantLinkCount(env, scenario.email, scenario.password, scenario.property.id, 1);

    const tenantTwoContext = await browser.newContext();
    const tenantTwoPage = await tenantTwoContext.newPage();

    try {
      await tenantTwoPage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });

      if (await isVisible(tenantTwoPage.getByTestId('invite-property-preview'), 10_000)) {
        await tenantTwoPage.getByTestId('invite-accept').click();
        if (await isVisible(tenantTwoPage.getByTestId('onboarding-name-continue'), 12_000)) {
          await tenantTwoPage.getByTestId('onboarding-name-input').fill('ReplayTenant');
          await tenantTwoPage.getByTestId('onboarding-name-continue').click();
          await tenantTwoPage.getByTestId('onboarding-email-input').fill(secondTenantEmail);
          await tenantTwoPage.getByTestId('onboarding-password-input').fill(secondTenantPassword);
          await tenantTwoPage.getByTestId('onboarding-confirm-password-input').fill(secondTenantPassword);
          await tenantTwoPage.getByTestId('terms-checkbox').click();
          await tenantTwoPage.getByTestId('onboarding-account-create').click();
        }
      }

      await expect(tenantTwoPage.getByTestId('invite-invalid')).toBeVisible({ timeout: 40_000 });
      await expect(tenantTwoPage.getByText(/invalid or has expired|already used/i)).toBeVisible({ timeout: 20_000 });
    } finally {
      await tenantTwoContext.close();
    }

    await assertActiveTenantLinkCount(env, scenario.email, scenario.password, scenario.property.id, 1);
  });

  test('unlinked tenant cannot read another landlord property via RLS', async ({ page }, testInfo) => {
    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithProperty(env);
    const tenant = await provisionUnlinkedTenant(env);

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'tenant-email', description: tenant.email });
    testInfo.annotations.push({ type: 'property-id', description: scenario.property.id });

    const supabase = createNoPersistSupabaseClient(env);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: tenant.email,
      password: tenant.password,
    });

    if (signInError) {
      throw new Error(`Tenant sign-in failed for RLS assertion: ${signInError.message}`);
    }

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('id', scenario.property.id);

      if (error && !/permission|not found|policy|RLS/i.test(error.message)) {
        throw new Error(`Unexpected properties query error while asserting RLS: ${error.message}`);
      }

      if (data && data.length > 0) {
        throw new Error('RLS isolation failed: unlinked tenant could read landlord property row.');
      }
    } finally {
      await supabase.auth.signOut();
    }

    await loginViaAuth(page, env, tenant.email, tenant.password);
    await expect(page.getByText('No Property Linked')).toBeVisible({ timeout: 35_000 });
  });
});
