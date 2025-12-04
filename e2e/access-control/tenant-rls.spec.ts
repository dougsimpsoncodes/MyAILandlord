import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SupabaseAuthHelper } from '../helpers/auth-helper';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tenant RLS Tests
 *
 * These tests require:
 * - LANDLORD_EMAIL and LANDLORD_PASSWORD environment variables
 * - The ability to create test tenants and properties
 * - Proper Supabase RLS policies configured
 *
 * Currently skipped - requires test user management setup
 */
test.describe.skip('Tenant RLS - Two-Browser-Context Workflow', () => {
  let landlordContext: BrowserContext;
  let tenantContext: BrowserContext;
  let landlordPage: Page;
  let tenantPage: Page;

  let propertyId1: string;
  let propertyCode1: string;
  let propertyId2: string;
  let tenantEmail: string;

  test.beforeAll(async ({ browser }) => {
    landlordContext = await browser.newContext();
    tenantContext = await browser.newContext();
    landlordPage = await landlordContext.newPage();
    tenantPage = await tenantContext.newPage();
    tenantEmail = `tenant-rls-test-${uuidv4()}@example.com`;
  });

  test.afterAll(async () => {
    await landlordContext.close();
    await tenantContext.close();
  });

  async function createProperty(page: Page, name: string): Promise<{id: string, code: string}> {
    await page.goto('/properties/new');
    await page.locator('input[placeholder="e.g. Sunset Apartments"]').fill(name);
    await page.locator('#section-property-line1').fill('123 RLS Test St');
    await page.locator('#section-property-city').fill('Testville');
    await page.locator('#section-property-state').fill('TS');
    await page.locator('#section-property-zip').fill('12345');
    await page.locator('text="Apartment"').first().click();
    await page.locator('text=Continue').click();

    await page.waitForLoadState('networkidle');
    const submitButton = page.locator('text=/Submit|Save|Finish/i').first();
    await submitButton.click();
    
    await page.waitForURL(/\/properties\/\w+/);
    const propertyId = page.url().split('/').pop()!;
    
    // Now, get the property code by querying the API as the landlord
    const auth = new AuthHelper(page);
    const token = await auth.getSessionToken();
    if (!token) throw new Error('No auth token found for landlord');
    const apiRequest = page.request;
    const response = await apiRequest.get(`/api/properties/${propertyId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const propertyData = await response.json();
    
    return { id: propertyId, code: propertyData.property_code };
  }

  test('1. Landlord creates two properties', async () => {
    test.slow();
    const landlordAuth = new AuthHelper(landlordPage);
    const landlordCreds = { email: process.env.LANDLORD_EMAIL!, password: process.env.LANDLORD_PASSWORD! };
    if (!landlordCreds.email || !landlordCreds.password) {
        test.skip(true, "LANDLORD_EMAIL and LANDLORD_PASSWORD env vars must be set");
        return;
    }
    const loginResult = await landlordAuth.loginWithEmail(landlordCreds.email, landlordCreds.password);
    console.log('Landlord login result:', loginResult);
    if (!loginResult.success) throw new Error(`Landlord login failed: ${loginResult.error}`);

    const prop1 = await createProperty(landlordPage, `RLS Test Property 1 ${uuidv4()}`);
    propertyId1 = prop1.id;
    propertyCode1 = prop1.code;
    
    const prop2 = await createProperty(landlordPage, `RLS Test Property 2 ${uuidv4()}`);
    propertyId2 = prop2.id;

    expect(propertyId1).toBeDefined();
    expect(propertyCode1).toBeDefined();
    expect(propertyId2).toBeDefined();
  });

  test('2. Landlord invites tenant to Property 1', async () => {
    await landlordPage.goto(`/properties/${propertyId1}`);
    await landlordPage.locator('text=Manage Tenants').click();
    await landlordPage.locator('input[type="email"]').fill(tenantEmail);
    await landlordPage.locator('button:has-text("Send Invitation")').click();
    await expect(landlordPage.locator('text=Invitation Sent')).toBeVisible();
  });

  test('3. Tenant signs up and is linked to Property 1', async () => {
    test.slow();
    const inviteUrl = `/invite?propertyCode=${propertyCode1}`;
    await tenantPage.goto(inviteUrl);
    await expect(tenantPage.locator('text=You have been invited to join')).toBeVisible();

    const tenantAuth = new AuthHelper(tenantPage);
    const signupResult = await tenantAuth.signUpWithEmail(tenantEmail, 'StrongPassword123!');
    console.log('Tenant signup result:', signupResult);
    if (!signupResult.success) throw new Error(`Tenant signup failed: ${signupResult.error}`);

    await expect(tenantPage.locator(`text=Welcome`)).toBeVisible({ timeout: 15000 });
    await expect(tenantPage.locator(`text=${propertyId1}`)).toBeVisible();
    await expect(tenantPage.locator(`text=${propertyId2}`)).not.toBeVisible();
  });

  test('4. Tenant CANNOT access Property 2 data via API', async () => {
    const tenantAuth = new AuthHelper(tenantPage);
    const token = await tenantAuth.getSessionToken();
    if (!token) throw new Error('No auth token found for tenant');
    const apiRequest = tenantPage.request;

    // Attempt to fetch the other property directly
    const response = await apiRequest.get(`/api/properties/${propertyId2}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(response.status()).toBe(404);

    // Attempt to fetch all properties and ensure only one is returned
    const allPropsResponse = await apiRequest.get('/api/properties', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allProps = await allPropsResponse.json();
    expect(allProps).toHaveLength(1);
    expect(allProps[0].id).toBe(propertyId1);
  });
});
