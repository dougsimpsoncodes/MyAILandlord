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
    addressLine1: string;
  };
  area: {
    id: string;
    name: string;
    cardTestId: string;
  };
};

type DbAssetRow = {
  id: string;
  photos: string[] | null;
  notes: string | null;
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

async function provisionLandlordWithPropertyAndArea(env: RequiredEnv): Promise<LandlordScenario> {
  const runId = Date.now();
  const email = `phase2.landlord.${runId}@myailandlord.com`;
  const password = `Phase2Landlord!${runId}Aa`;
  const propertyName = `RW Lifecycle Property ${runId}`;
  const addressLine1 = '101 QA Lane';

  const supabase = createNoPersistSupabaseClient(env);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Phase2 Landlord',
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
    throw new Error('Provisioning failed: no landlord user ID returned.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name: 'Phase2 Landlord',
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
      address: `${addressLine1}, Los Angeles, CA 90001`,
      address_jsonb: {
        line1: addressLine1,
        line2: '',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'US',
      },
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      user_id: userId,
      landlord_id: userId,
      allow_tenant_signup: true,
    })
    .select('id, name')
    .single();

  if (propertyError || !property) {
    throw new Error(`Failed to create property: ${propertyError?.message || 'unknown error'}`);
  }

  const areaName = 'Kitchen';
  const { data: area, error: areaError } = await supabase
    .from('property_areas')
    .insert({
      property_id: property.id,
      name: areaName,
      area_type: 'kitchen',
      icon_name: 'restaurant',
      is_default: true,
      photos: [],
      inventory_complete: false,
      condition: 'good',
    })
    .select('id, name')
    .single();

  await supabase.auth.signOut();

  if (areaError || !area) {
    throw new Error(`Failed to create property area: ${areaError?.message || 'unknown error'}`);
  }

  return {
    email,
    password,
    property: {
      id: property.id,
      name: property.name,
      addressLine1,
    },
    area: {
      id: area.id,
      name: area.name,
      cardTestId: `area-card-${area.name.toLowerCase().replace(/\s+/g, '-')}`,
    },
  };
}

async function gotoAuthLogin(page: Page, env: RequiredEnv): Promise<void> {
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  if (await isVisible(page.getByTestId('auth-email'), 6_000)) {
    return;
  }

  const signInLink = page.getByText(/Sign In/i).first();
  if (await isVisible(signInLink, 8_000)) {
    await signInLink.click();
  }

  await expect(page.getByTestId('auth-email')).toBeVisible({ timeout: 25_000 });
}

async function loginLandlord(page: Page, env: RequiredEnv, scenario: LandlordScenario): Promise<void> {
  await gotoAuthLogin(page, env);

  await page.getByTestId('auth-email').fill(scenario.email);
  await page.getByTestId('auth-password').fill(scenario.password);
  await page.getByTestId('auth-submit').click();

  await expect(page.getByRole('tab', { name: /Profile|nav-user-menu/i }).first()).toBeVisible({ timeout: 50_000 });
}

async function waitForPropertyDetailsReady(page: Page): Promise<void> {
  await expect(page.getByText('Property Details')).toBeVisible({ timeout: 25_000 });

  if (await isVisible(page.getByText('Unable to load property').first(), 6_000)) {
    const retryButton = page.getByRole('button', { name: 'Retry' });
    if (await isVisible(retryButton, 3_000)) {
      await retryButton.click();
    }
  }

  await expect(page.getByTestId('invite-tenant')).toBeVisible({ timeout: 35_000 });
}

async function uploadUsingFileChooser(page: Page, trigger: Locator, filePath: string): Promise<void> {
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 35_000 });
  await trigger.click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);
}

async function assertAreaPhotoPersisted(
  env: RequiredEnv,
  email: string,
  password: string,
  areaId: string,
): Promise<string> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in landlord for DB assertion: ${signInError.message}`);
  }

  const { data, error } = await supabase
    .from('property_areas')
    .select('photos')
    .eq('id', areaId)
    .single();

  await supabase.auth.signOut();

  if (error) {
    throw new Error(`Failed reading area photos from DB: ${error.message}`);
  }

  const photos = data?.photos as string[] | null | undefined;
  if (!photos || photos.length === 0) {
    throw new Error('Room photo upload did not persist any photo paths in property_areas.photos.');
  }

  return photos[0];
}

async function assertAssetPersisted(
  env: RequiredEnv,
  email: string,
  password: string,
  propertyId: string,
  assetName: string,
): Promise<DbAssetRow> {
  const supabase = createNoPersistSupabaseClient(env);

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in landlord for asset DB assertion: ${signInError.message}`);
  }

  const { data, error } = await supabase
    .from('property_assets')
    .select('id, photos, notes')
    .eq('property_id', propertyId)
    .eq('name', assetName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  await supabase.auth.signOut();

  if (error || !data) {
    throw new Error(`Asset row was not persisted: ${error?.message || 'not found'}`);
  }

  const photos = data.photos as string[] | null;
  if (!photos || photos.length === 0) {
    throw new Error('Asset photo upload did not persist any photo paths in property_assets.photos.');
  }

  return {
    id: data.id,
    photos,
    notes: data.notes,
  };
}

async function ensureOnRoomsInventory(page: Page, scenario: LandlordScenario): Promise<void> {
  const areaCard = page.getByTestId(scenario.area.cardTestId);
  if (await isVisible(areaCard, 12_000)) {
    return;
  }

  const roomsInventoryAction = page.getByText('Rooms & Inventory').first();
  if (await isVisible(roomsInventoryAction, 8_000)) {
    await roomsInventoryAction.click();
    await expect(areaCard).toBeVisible({ timeout: 25_000 });
    return;
  }

  const propertyRow = page.getByText(scenario.property.name, { exact: false }).first();
  await expect(propertyRow).toBeVisible({ timeout: 25_000 });
  await propertyRow.click();
  await waitForPropertyDetailsReady(page);
  await page.getByText('Rooms & Inventory').first().click();
  await expect(areaCard).toBeVisible({ timeout: 30_000 });
}

test.describe('Phase 2 Landlord Property Media Flows', () => {
  test('room + asset photos upload and persist in DB and UI after reload', async ({ page }, testInfo) => {
    test.slow();

    const env = getRequiredEnv();
    const scenario = await provisionLandlordWithPropertyAndArea(env);
    const uploadImagePath = path.resolve(process.cwd(), 'assets/icon.png');

    if (!fs.existsSync(uploadImagePath)) {
      throw new Error(`Upload fixture not found: ${uploadImagePath}`);
    }

    testInfo.annotations.push({ type: 'landlord-email', description: scenario.email });
    testInfo.annotations.push({ type: 'property-id', description: scenario.property.id });
    testInfo.annotations.push({ type: 'area-id', description: scenario.area.id });

    await loginLandlord(page, env, scenario);

    const propertyRow = page.getByText(scenario.property.name, { exact: false }).first();
    await expect(propertyRow).toBeVisible({ timeout: 30_000 });
    await propertyRow.click();

    await waitForPropertyDetailsReady(page);
    await page.getByText('Rooms & Inventory').first().click();

    const areaCard = page.getByTestId(scenario.area.cardTestId);
    await expect(areaCard).toBeVisible({ timeout: 30_000 });

    const roomPhotoUpload = page.getByTestId(`photo-upload-${scenario.area.id}`);
    await expect(roomPhotoUpload).toBeVisible({ timeout: 25_000 });
    await uploadUsingFileChooser(page, roomPhotoUpload, uploadImagePath);

    await expect(areaCard).toContainText('1 room photo', { timeout: 70_000 });

    const roomPhotoPath = await assertAreaPhotoPersisted(env, scenario.email, scenario.password, scenario.area.id);
    testInfo.annotations.push({ type: 'room-photo-path', description: roomPhotoPath });

    await page.getByTestId(`add-asset-${scenario.area.id}`).click();
    await expect(page.getByTestId('asset-name-input')).toBeVisible({ timeout: 35_000 });

    const assetName = `RW Asset ${Date.now()}`;
    const assetNotes = 'Phase2 real-world asset note';

    await page.getByTestId('asset-name-input').fill(assetName);
    await page.getByTestId('asset-notes-input').fill(assetNotes);

    await uploadUsingFileChooser(page, page.getByText('Browse Files').first(), uploadImagePath);
    await expect(page.locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 35_000 });

    await page.getByTestId('save-asset-button').click();
    await expect(page.getByTestId('asset-success')).toBeVisible({ timeout: 45_000 });

    await expect(areaCard).toBeVisible({ timeout: 45_000 });
    await expect(areaCard).toContainText('1 assets', { timeout: 30_000 });
    await expect(page.getByText(assetName).first()).toBeVisible({ timeout: 30_000 });

    const assetRow = await assertAssetPersisted(
      env,
      scenario.email,
      scenario.password,
      scenario.property.id,
      assetName,
    );

    expect(assetRow.notes).toContain('Phase2 real-world asset note');
    testInfo.annotations.push({ type: 'asset-id', description: assetRow.id });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureOnRoomsInventory(page, scenario);

    await expect(areaCard).toContainText('1 room photo', { timeout: 35_000 });
    await expect(areaCard).toContainText('1 assets', { timeout: 35_000 });
    await expect(page.getByText(assetName).first()).toBeVisible({ timeout: 35_000 });
  });
});
