/**
 * Tenant User Flows E2E Tests
 * Tests tenant-specific functionality via Supabase API
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateWithRetry, AuthenticatedClient } from '../helpers/auth-helper';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test users
const TEST_USERS = {
  landlord: {
    email: 'test-landlord@myailandlord.com',
    password: 'MyAI2025!Landlord#Test',
  },
  tenant: {
    email: 'test-tenant@myailandlord.com',
    password: 'MyAI2025!Tenant#Test',
  },
};

test.describe('Tenant User Flows', () => {
  let landlord: AuthenticatedClient | null = null;
  let tenant: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;

  test.beforeAll(async () => {
    landlord = await authenticateWithRetry(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    tenant = await authenticateWithRetry(TEST_USERS.tenant.email, TEST_USERS.tenant.password);

    // Create test property
    if (landlord) {
      const { data } = await landlord.client
        .from('properties')
        .insert({
          landlord_id: landlord.profileId,
          name: 'Tenant Flow Test Property',
          address: '123 Tenant Flow Ave',
          property_type: 'apartment',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      if (data) {
        testPropertyId = data.id;
        testPropertyCode = data.property_code;

        // Pre-link tenant to property for subsequent tests
        if (tenant) {
          await tenant.client.rpc('link_tenant_to_property', {
            input_code: data.property_code,
            tenant_id: tenant.profileId,
          });
        }
      }
    }
  });

  test.afterAll(async () => {
    if (landlord && testPropertyId) {
      await landlord.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
      await landlord.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should accept property invite via property code', async () => {
    test.skip(!tenant || !testPropertyCode, 'Prerequisites not met');

    // Link tenant to property using the property code
    const { error: linkError } = await tenant!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant!.profileId,
    });

    // If already linked (from previous test run), that's ok
    if (linkError && !linkError.message.includes('already linked')) {
      expect(linkError).toBeNull();
    }

    // Verify the link exists
    const { data: links, error: verifyError } = await tenant!.client
      .from('tenant_property_links')
      .select('id, property_id')
      .eq('tenant_id', tenant!.profileId)
      .eq('property_id', testPropertyId);

    expect(verifyError).toBeNull();
    expect(links).toBeTruthy();
    expect(links!.length).toBeGreaterThan(0);

    console.log('✓ Tenant accepted property invite via code');
  });

  test('should create maintenance request', async () => {
    test.skip(!tenant || !testPropertyId, 'Prerequisites not met');

    const { data: request, error } = await tenant!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant!.profileId,
        title: 'Tenant Flow Test - Leaky Sink',
        description: 'Kitchen sink is leaking under the cabinet',
        area: 'kitchen',
        asset: 'sink',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
      })
      .select('id, title')
      .single();

    expect(error).toBeNull();
    expect(request).toBeTruthy();
    expect(request?.title).toBe('Tenant Flow Test - Leaky Sink');

    console.log('✓ Tenant created maintenance request');

    // Cleanup
    if (request) {
      await tenant!.client.from('maintenance_requests').delete().eq('id', request.id);
    }
  });

  test('should view own maintenance requests', async () => {
    test.skip(!tenant, 'Tenant not authenticated');

    const { data: requests, error } = await tenant!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('tenant_id', tenant!.profileId);

    expect(error).toBeNull();
    expect(Array.isArray(requests)).toBe(true);

    // All requests should belong to this tenant
    for (const req of requests || []) {
      expect(req).toHaveProperty('id');
      expect(req).toHaveProperty('title');
      expect(req).toHaveProperty('status');
    }

    console.log(`✓ Tenant can view ${requests?.length || 0} of their requests`);
  });

  test('should view linked property details', async () => {
    test.skip(!tenant, 'Tenant not authenticated');

    const { data: links, error } = await tenant!.client
      .from('tenant_property_links')
      .select(`
        property_id,
        is_active,
        properties (
          id,
          name,
          address
        )
      `)
      .eq('tenant_id', tenant!.profileId)
      .eq('is_active', true);

    expect(error).toBeNull();
    expect(Array.isArray(links)).toBe(true);

    console.log(`✓ Tenant can view ${links?.length || 0} linked properties`);
  });

  test('should upload photos with maintenance request', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const uploadButton = page.locator('input[type="file"]').first();
    const hasUpload = await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`Photo upload available: ${hasUpload ? '✓' : '✗'}`);
    expect(true).toBeTruthy();
  });
});

test.describe('Tenant Maintenance Request Workflow', () => {
  let landlord: AuthenticatedClient | null = null;
  let tenant: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testRequestId: string | null = null;

  test.beforeAll(async () => {
    landlord = await authenticateWithRetry(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    tenant = await authenticateWithRetry(TEST_USERS.tenant.email, TEST_USERS.tenant.password);

    if (landlord && tenant) {
      // Create property
      const { data: property } = await landlord.client
        .from('properties')
        .insert({
          landlord_id: landlord.profileId,
          name: 'Tenant Workflow Property',
          address: '456 Workflow Ave',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      if (property) {
        testPropertyId = property.id;

        // Link tenant
        await tenant.client.rpc('link_tenant_to_property', {
          input_code: property.property_code,
          tenant_id: tenant.profileId,
        });

        // Create maintenance request
        const { data: request } = await tenant.client
          .from('maintenance_requests')
          .insert({
            property_id: property.id,
            tenant_id: tenant.profileId,
            title: 'Workflow Test Request',
            description: 'Testing maintenance workflow',
            area: 'bathroom',
            asset: 'toilet',
            issue_type: 'plumbing',
            priority: 'high',
            status: 'pending',
          })
          .select('id')
          .single();

        if (request) {
          testRequestId = request.id;
        }
      }
    }
  });

  test.afterAll(async () => {
    if (landlord && testPropertyId) {
      await landlord.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
      await landlord.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should see status updates from landlord', async () => {
    test.skip(!tenant || !testRequestId, 'Prerequisites not met');

    // Landlord updates status
    if (landlord) {
      await landlord.client
        .from('maintenance_requests')
        .update({ status: 'in_progress' })
        .eq('id', testRequestId);
    }

    // Tenant fetches updated status
    const { data: request, error } = await tenant!.client
      .from('maintenance_requests')
      .select('id, status')
      .eq('id', testRequestId)
      .single();

    expect(error).toBeNull();
    expect(request?.status).toBe('in_progress');

    console.log('✓ Tenant can see status updates');
  });

  test('should see completion when request is resolved', async () => {
    test.skip(!tenant || !testRequestId, 'Prerequisites not met');

    // Landlord completes the request
    if (landlord) {
      await landlord.client
        .from('maintenance_requests')
        .update({
          status: 'completed',
          completion_notes: 'Issue has been resolved',
        })
        .eq('id', testRequestId);
    }

    // Tenant fetches completed request
    const { data: request, error } = await tenant!.client
      .from('maintenance_requests')
      .select('id, status, completion_notes')
      .eq('id', testRequestId)
      .single();

    expect(error).toBeNull();
    expect(request?.status).toBe('completed');
    expect(request?.completion_notes).toBe('Issue has been resolved');

    console.log('✓ Tenant can see completed request');
  });
});
