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

type DbRequestRow = {
  id: string;
  status: 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string | null;
  property_id: string;
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

function handleDialogs(page: Page): void {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
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
  const email = `rw.landlord.${runId}@myailandlord.com`;
  const password = `LandlordFlow!${runId}Aa`;
  const propertyName = `RW Lifecycle Property ${runId}`;
  const propertyAddress = '101 QA Lane, Los Angeles, CA 90001';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'RW Landlord',
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
      name: 'RW Landlord',
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

async function captureInviteTokenFromGenerateButton(page: Page): Promise<{ token: string; deliveryState: 'code' }> {
  const createInviteResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/rest/v1/rpc/create_invite'),
    { timeout: 45_000 },
  );

  await page.getByTestId('invite-generate').click();

  const createInviteResponse = await createInviteResponsePromise;
  if (!createInviteResponse.ok()) {
    const rawBody = await createInviteResponse.text().catch(() => '');
    throw new Error(`create_invite failed with HTTP ${createInviteResponse.status()}: ${rawBody}`);
  }

  const createInviteBody = await createInviteResponse.json().catch(() => null);
  const token = Array.isArray(createInviteBody) ? createInviteBody[0]?.token : null;
  if (!token || typeof token !== 'string') {
    throw new Error(`create_invite did not return a token. Body: ${JSON.stringify(createInviteBody)}`);
  }

  await expect(page.getByTestId('invite-code')).toBeVisible({ timeout: 45_000 });
  return { token, deliveryState: 'code' };
}

async function completeInviteSignup(page: Page, tenantEmail: string, tenantPassword: string): Promise<void> {
  await expect(page.getByText('What should we call you?')).toBeVisible({ timeout: 40_000 });

  await page.getByTestId('onboarding-name-input').fill('TenantQa');
  await page.getByTestId('onboarding-name-continue').click();

  await expect(page.getByTestId('onboarding-account-create')).toBeVisible({ timeout: 40_000 });

  await page.getByTestId('onboarding-email-input').fill(tenantEmail);
  await page.getByTestId('onboarding-password-input').fill(tenantPassword);
  await page.getByTestId('onboarding-confirm-password-input').fill(tenantPassword);
  await page.getByTestId('terms-checkbox').click();
  await page.getByTestId('onboarding-account-create').click();
}

async function resetAndLoginLandlord(page: Page, env: RequiredEnv, scenario: LandlordScenario): Promise<void> {
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
  });

  await page.context().clearCookies();
  await loginLandlord(page, env, scenario);
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

async function assertTenantProfileRole(env: RequiredEnv, tenantEmail: string, tenantPassword: string): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: tenantEmail,
    password: tenantPassword,
  });

  if (signInError) {
    throw new Error(`Tenant sign-in failed for profile role check: ${signInError.message}`);
  }

  const tenantId = signInData.user?.id;
  if (!tenantId) {
    throw new Error('Tenant role check failed: missing user id after sign-in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', tenantId)
    .single();

  await supabase.auth.signOut();

  if (profileError) {
    throw new Error(`Tenant role check query failed: ${profileError.message}`);
  }

  if (profile?.role !== 'tenant') {
    throw new Error(`Expected tenant profile role to be tenant, got: ${String(profile?.role)}`);
  }
}

async function submitTenantRequest(page: Page, env: RequiredEnv, marker: string): Promise<void> {
  const reportNewIssueButton = page.getByTestId('tenant-report-new-issue');
  if (!(await isVisible(reportNewIssueButton, 8_000))) {
    const requestsTab = page.getByRole('tab', { name: /Requests/i }).first();
    await expect(requestsTab).toBeVisible({ timeout: 25_000 });
    await requestsTab.click();
  }

  await expect(reportNewIssueButton).toBeVisible({ timeout: 45_000 });
  await reportNewIssueButton.click();

  await expect(page.getByTestId('report-additional-details')).toBeVisible({ timeout: 45_000 });
  const reportNextButton = page.getByTestId('report-issue-next-bottom');
  await expect(reportNextButton).toBeVisible({ timeout: 45_000 });
  await expect(reportNextButton).toBeEnabled({ timeout: 45_000 });
  await page.getByTestId('report-additional-details').fill(`${marker} - faucet dripping under sink.`);
  await reportNextButton.click();

  await expect(page.getByTestId('review-slot-0-morning')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('review-slot-0-morning').click();
  await page.getByTestId('review-vendor-comment').fill(`${marker} vendor note`);
  const reviewSubmitButton = page.getByTestId('review-issue-submit-bottom');
  await expect(reviewSubmitButton).toBeVisible({ timeout: 45_000 });
  await reviewSubmitButton.click();

  await expect(page.getByText('Request Submitted')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('submission-view-requests')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('submission-view-requests').click();

  await expect(page.getByTestId('tenant-requests-filter-new')).toBeVisible({ timeout: 30_000 });
}

async function waitForRequestByMarker(
  env: RequiredEnv,
  landlordEmail: string,
  landlordPassword: string,
  propertyId: string,
  marker: string,
): Promise<DbRequestRow> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: landlordEmail,
    password: landlordPassword,
  });

  if (signInError) {
    throw new Error(`Landlord sign-in failed for request lookup: ${signInError.message}`);
  }

  try {
    const deadline = Date.now() + 120_000;

    while (Date.now() < deadline) {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('id, status, description, property_id')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        throw new Error(`Request lookup query failed: ${error.message}`);
      }

      const rows = (data || []) as DbRequestRow[];
      const match = rows.find((row) => (row.description || '').includes(marker));
      if (match) {
        return match;
      }

      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }

    throw new Error(`Timed out waiting for maintenance request marker: ${marker}`);
  } finally {
    await supabase.auth.signOut();
  }
}

async function waitForRequestStatus(
  env: RequiredEnv,
  landlordEmail: string,
  landlordPassword: string,
  requestId: string,
  expectedStatus: DbRequestRow['status'],
): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: landlordEmail,
    password: landlordPassword,
  });

  if (signInError) {
    throw new Error(`Landlord sign-in failed for request status check: ${signInError.message}`);
  }

  try {
    const deadline = Date.now() + 120_000;

    while (Date.now() < deadline) {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      if (error) {
        throw new Error(`Request status query failed: ${error.message}`);
      }

      if (data?.status === expectedStatus) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }

    throw new Error(`Timed out waiting for request ${requestId} to reach status ${expectedStatus}`);
  } finally {
    await supabase.auth.signOut();
  }
}

async function sendTenantMessage(page: Page, env: RequiredEnv, message: string): Promise<void> {
  const tenantMessageInput = page.getByTestId('tenant-message-input');
  if (!(await isVisible(tenantMessageInput, 6_000))) {
    const messagesTab = page.getByRole('tab', { name: /Messages/i }).first();
    await expect(messagesTab).toBeVisible({ timeout: 25_000 });
    await messagesTab.click();
  }

  await expect(tenantMessageInput).toBeVisible({ timeout: 45_000 });
  await tenantMessageInput.fill(message);
  await page.getByTestId('tenant-message-send').click();
  await expect(page.getByText(message)).toBeVisible({ timeout: 45_000 });
}

async function sendLandlordReply(page: Page, env: RequiredEnv, message: string): Promise<void> {
  const conversationCard = page.locator('[data-testid^="landlord-conversation-card-"]').first();
  if (!(await isVisible(conversationCard, 8_000))) {
    const messagesTab = page.getByRole('tab', { name: /Messages/i }).first();
    await expect(messagesTab).toBeVisible({ timeout: 25_000 });
    await messagesTab.click();
  }

  await expect(conversationCard).toBeVisible({ timeout: 60_000 });
  await conversationCard.click();

  await expect(page.getByTestId('landlord-message-input')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('landlord-message-input').fill(message);
  await page.getByTestId('landlord-message-send').click();
  await expect(page.getByText(message)).toBeVisible({ timeout: 45_000 });
}

async function waitForTenantToSeeMessage(page: Page, env: RequiredEnv, message: string): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const messagesTab = page.getByRole('tab', { name: /Messages/i }).first();
    if (await isVisible(messagesTab, 3_000)) {
      await messagesTab.click();
    }

    if (await isVisible(page.getByText(message).first(), 3_000)) {
      return;
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
  }

  throw new Error(`Tenant did not receive landlord message in UI: ${message}`);
}

async function waitForMessageInDb(
  env: RequiredEnv,
  userEmail: string,
  userPassword: string,
  marker: string,
): Promise<void> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });

  if (signInError) {
    throw new Error(`Sign-in failed for message lookup: ${signInError.message}`);
  }

  try {
    const deadline = Date.now() + 90_000;

    while (Date.now() < deadline) {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Message lookup query failed: ${error.message}`);
      }

      const rows = (data || []) as Array<{ id: string; content: string | null }>;
      const found = rows.some((row) => (row.content || '').includes(marker));
      if (found) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }

    throw new Error(`Timed out waiting for message marker in DB: ${marker}`);
  } finally {
    await supabase.auth.signOut();
  }
}

test.describe('MVP Real-world Lifecycle', () => {
  test('landlord invite + tenant request + landlord resolve + bidirectional messaging', async ({ browser, page }, testInfo) => {
    test.slow();

    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithProperty(env);
    const runId = Date.now();

    const tenantEmail = `rw.tenant.${runId}@myailandlord.com`;
    const tenantPassword = `TenantFlow!${runId}Aa`;
    const requestMarker = `RW-REQUEST-${runId}`;
    const tenantMsg = `RW-TENANT-MSG-${runId}`;
    const landlordMsg = `RW-LANDLORD-MSG-${runId}`;

    handleDialogs(page);
    await loginLandlord(page, env, scenario);

    const propertyRow = page.getByText(scenario.property.name, { exact: false }).first();
    await expect(propertyRow).toBeVisible({ timeout: 30_000 });
    await propertyRow.click();

    await waitForPropertyDetailsReady(page);
    await page.getByTestId('invite-tenant').click();

    await expect(page.getByTestId('invite-mode-code')).toBeVisible({ timeout: 25_000 });
    await page.getByTestId('invite-mode-code').click();

    const { token, deliveryState } = await captureInviteTokenFromGenerateButton(page);
    const inviteUrl = `${env.baseUrl}/invite?t=${encodeURIComponent(token)}&property=${encodeURIComponent(scenario.property.id)}`;

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'tenant-email', description: tenantEmail });
    testInfo.annotations.push({ type: 'property-id', description: scenario.property.id });
    testInfo.annotations.push({ type: 'invite-url', description: inviteUrl });
    testInfo.annotations.push({ type: 'delivery-state', description: deliveryState });

    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();
    handleDialogs(tenantPage);

    try {
      await tenantPage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
      const invitePreview = tenantPage.getByTestId('invite-property-preview');
      await expect(invitePreview).toBeVisible({ timeout: 35_000 });
      await expect(invitePreview).toContainText(scenario.property.name);

      await tenantPage.getByTestId('invite-accept').click();
      await completeInviteSignup(tenantPage, tenantEmail, tenantPassword);
      await waitForTenantLinked(tenantPage);
      await assertTenantProfileRole(env, tenantEmail, tenantPassword);

      await expect(tenantPage.getByTestId('tenant-property-list')).toBeVisible({ timeout: 20_000 });

      await submitTenantRequest(tenantPage, env, requestMarker);

      const request = await waitForRequestByMarker(
        env,
        scenario.email,
        scenario.password,
        scenario.property.id,
        requestMarker,
      );

      testInfo.annotations.push({ type: 'request-id', description: request.id });
      testInfo.annotations.push({ type: 'request-status-initial', description: request.status });

      const landlordOpsContext = await browser.newContext();
      const landlordOpsPage = await landlordOpsContext.newPage();
      handleDialogs(landlordOpsPage);

      try {
        await loginLandlord(landlordOpsPage, env, scenario);
        const landlordRequestsTab = landlordOpsPage.getByRole('tab', { name: /Requests/i }).first();
        await expect(landlordRequestsTab).toBeVisible({ timeout: 30_000 });
        await landlordRequestsTab.click();
        await expect(landlordOpsPage.getByTestId('landlord-requests-filter-new')).toBeVisible({ timeout: 45_000 });
        if (!(await isVisible(landlordOpsPage.getByTestId('landlord-case-card-0'), 8_000))) {
          await landlordOpsPage.getByTestId('landlord-requests-filter-pending').click();
        }
        await expect(landlordOpsPage.getByTestId('landlord-case-card-0')).toBeVisible({ timeout: 60_000 });
        await landlordOpsPage.getByTestId('landlord-case-card-0').click();

        await expect(landlordOpsPage.getByTestId('case-detail-mark-resolved')).toBeVisible({ timeout: 45_000 });
        await landlordOpsPage.getByTestId('case-detail-mark-resolved').click();

        const confirmResolveButton = landlordOpsPage.getByTestId('case-detail-confirm-resolved');
        await expect(confirmResolveButton).toBeVisible({ timeout: 20_000 });
        await confirmResolveButton.click();

        await expect(landlordOpsPage.getByTestId('landlord-requests-filter-complete')).toBeVisible({ timeout: 60_000 });
        await waitForRequestStatus(env, scenario.email, scenario.password, request.id, 'completed');

        const tenantRequestsTab = tenantPage.getByRole('tab', { name: /Requests/i }).first();
        await expect(tenantRequestsTab).toBeVisible({ timeout: 30_000 });
        await tenantRequestsTab.click();
        await expect(tenantPage.getByTestId('tenant-requests-filter-completed')).toBeVisible({ timeout: 30_000 });
        await tenantPage.getByTestId('tenant-requests-filter-completed').click();
        await expect(tenantPage.getByTestId('tenant-request-card-0')).toBeVisible({ timeout: 60_000 });

        await sendTenantMessage(tenantPage, env, tenantMsg);
        await sendLandlordReply(landlordOpsPage, env, landlordMsg);
        await waitForTenantToSeeMessage(tenantPage, env, landlordMsg);
      } finally {
        await landlordOpsContext.close();
      }

      await waitForMessageInDb(env, scenario.email, scenario.password, tenantMsg);
      await waitForMessageInDb(env, scenario.email, scenario.password, landlordMsg);
    } finally {
      await tenantContext.close();
    }
  });
});
