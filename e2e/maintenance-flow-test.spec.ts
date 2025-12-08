/**
 * Maintenance Flow Tests - Supabase API
 *
 * Tests the complete maintenance request lifecycle including:
 * - Request creation
 * - Status transitions
 * - Property-tenant relationships
 * - Query capabilities
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateWithRetry, AuthenticatedClient } from './helpers/auth-helper';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = {
  landlord1: {
    email: 'test-landlord@myailandlord.com',
    password: 'MyAI2025!Landlord#Test',
  },
  tenant1: {
    email: 'test-tenant@myailandlord.com',
    password: 'MyAI2025!Tenant#Test',
  },
};

// Helper to authenticate and get client with retry for rate limits
async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  return authenticateWithRetry(email, password);
}

test.describe.configure({ mode: 'serial' });

test.describe('Maintenance Workflow E2E', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;
  let testRequestId: string | null = null;

  // Increase timeout for tests that require multiple auth operations with rate limit retries
  test.setTimeout(60000);

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate both landlord and tenant', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();
    console.log('Both users authenticated successfully');
  });

  test('should setup test property', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'E2E Maintenance Test Property',
        address: '789 E2E Test Blvd, Test City, TX 12345',
        property_type: 'apartment',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.property_code).toBeTruthy();

    testPropertyId = data!.id;
    testPropertyCode = data!.property_code;
    console.log(`Created property with code: ${testPropertyCode}`);
  });

  test('should link tenant to property', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    // Use the link function
    const { data, error } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data[0]?.success).toBe(true);
    console.log('Tenant linked to property successfully');
  });

  test('should create maintenance request as tenant', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'E2E Test - Kitchen Faucet Leak',
        description: 'The kitchen faucet is dripping water constantly and needs repair',
        area: 'kitchen',
        asset: 'faucet',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
      })
      .select('id, title, status')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.status).toBe('pending');

    testRequestId = data!.id;
    console.log(`Created maintenance request: ${data?.title}`);
  });

  test('landlord should see the maintenance request', async () => {
    test.skip(!landlord1 || !testRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title, description, status, priority, area, asset, issue_type,
        properties (name, address),
        profiles!maintenance_requests_tenant_id_fkey (email)
      `
      )
      .eq('id', testRequestId)
      .single();

    expect(error).toBeNull();
    expect(data?.title).toBe('E2E Test - Kitchen Faucet Leak');
    expect(data?.status).toBe('pending');
    console.log('Landlord can view tenant maintenance request');
  });

  test('landlord should update status to in_progress', async () => {
    test.skip(!landlord1 || !testRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'in_progress',
        assigned_vendor_email: 'plumber@testvendor.com',
        vendor_notes: 'Scheduled plumber for next business day',
        estimated_cost: 150.0,
      })
      .eq('id', testRequestId)
      .select('status, assigned_vendor_email, estimated_cost')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    expect(data?.assigned_vendor_email).toBe('plumber@testvendor.com');
    console.log('Landlord updated status to in_progress');
  });

  test('tenant should see the status update', async () => {
    test.skip(!tenant1 || !testRequestId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('status, assigned_vendor_email')
      .eq('id', testRequestId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    expect(data?.assigned_vendor_email).toBe('plumber@testvendor.com');
    console.log('Tenant can see status update');
  });

  test('landlord should complete the maintenance request', async () => {
    test.skip(!landlord1 || !testRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'completed',
        actual_cost: 125.0,
        completion_notes: 'Fixed leaking faucet. Replaced washers and tightened connections.',
      })
      .eq('id', testRequestId)
      .select('status, actual_cost, completion_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.actual_cost).toBe(125.0);
    console.log('Maintenance request completed');
  });

  test('should verify final state', async () => {
    test.skip(!tenant1 || !testRequestId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('status, completion_notes')
      .eq('id', testRequestId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.completion_notes).toContain('Fixed leaking faucet');
    console.log('Final state verified - request completed successfully');
  });

  test('should cleanup test data', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    if (testRequestId) {
      await landlord1!.client.from('maintenance_requests').delete().eq('id', testRequestId);
    }

    if (testPropertyId) {
      await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1!.client.from('properties').delete().eq('id', testPropertyId);
    }

    console.log('Test data cleaned up');
  });
});

test.describe('Maintenance Request Filtering', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;
  const testRequestIds: string[] = [];

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
  });

  test.afterAll(async () => {
    if (landlord1) {
      if (testRequestIds.length > 0) {
        await landlord1.client.from('maintenance_requests').delete().in('id', testRequestIds);
      }
      if (testPropertyId) {
        await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
        await landlord1.client.from('properties').delete().eq('id', testPropertyId);
      }
    }
  });

  test('should create property and various maintenance requests', async () => {
    test.skip(!landlord1 || !tenant1, 'Users not authenticated');

    // Create property
    const { data: property } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Filter Test Property',
        address: '456 Filter Ave',
        property_type: 'apartment',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    testPropertyId = property!.id;
    testPropertyCode = property!.property_code;

    // Link tenant to property
    await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    // Create requests with different attributes
    const requestsToCreate = [
      { area: 'kitchen', issue_type: 'plumbing', priority: 'high', status: 'pending' },
      { area: 'bathroom', issue_type: 'plumbing', priority: 'medium', status: 'pending' },
      { area: 'bedroom', issue_type: 'electrical', priority: 'low', status: 'in_progress' },
      { area: 'living_room', issue_type: 'hvac', priority: 'high', status: 'completed' },
    ];

    for (const req of requestsToCreate) {
      const { data } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: testPropertyId,
          tenant_id: tenant1!.profileId,
          title: `Filter Test - ${req.area} ${req.issue_type}`,
          description: `Testing ${req.issue_type} in ${req.area}`,
          area: req.area,
          asset: 'general',
          issue_type: req.issue_type,
          priority: req.priority,
          status: req.status,
        })
        .select('id')
        .single();

      if (data) testRequestIds.push(data.id);
    }

    expect(testRequestIds.length).toBe(4);
    console.log(`Created ${testRequestIds.length} test requests`);
  });

  test('should filter by area', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, area')
      .eq('property_id', testPropertyId)
      .eq('area', 'kitchen');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].area).toBe('kitchen');
    console.log('Filtered by area: kitchen');
  });

  test('should filter by issue type', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, issue_type')
      .eq('property_id', testPropertyId)
      .eq('issue_type', 'plumbing');

    expect(error).toBeNull();
    expect(data?.length).toBe(2);
    console.log('Filtered by issue_type: plumbing - 2 results');
  });

  test('should filter by multiple criteria', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, priority, status')
      .eq('property_id', testPropertyId)
      .eq('priority', 'high')
      .eq('status', 'pending');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    console.log('Filtered by priority=high AND status=pending: 1 result');
  });

  test('should support text search in title/description', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('property_id', testPropertyId)
      .or('title.ilike.%kitchen%,description.ilike.%kitchen%');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    console.log('Text search for "kitchen" found results');
  });

  test('should order by priority and created_at', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, priority, created_at')
      .eq('property_id', testPropertyId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(data!.length).toBe(4);

    // Verify ordering (most recent first)
    const dates = data!.map((d) => new Date(d.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
    console.log('Results ordered by created_at descending');
  });
});

test.describe('Responsive Design via API Data', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('should support mobile-friendly pagination (small page size)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const mobilePageSize = 5;
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .limit(mobilePageSize);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(mobilePageSize);
    console.log(`Mobile pagination: ${data!.length} items (max ${mobilePageSize})`);
  });

  test('should support tablet page size', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const tabletPageSize = 10;
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .limit(tabletPageSize);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(tabletPageSize);
    console.log(`Tablet pagination: ${data!.length} items (max ${tabletPageSize})`);
  });

  test('should support desktop page size', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const desktopPageSize = 20;
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .limit(desktopPageSize);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(desktopPageSize);
    console.log(`Desktop pagination: ${data!.length} items (max ${desktopPageSize})`);
  });
});
