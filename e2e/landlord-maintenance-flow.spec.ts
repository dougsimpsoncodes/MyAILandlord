/**
 * Landlord Maintenance Flow Tests - Supabase API
 *
 * Tests landlord maintenance features including:
 * - Dashboard data access
 * - Maintenance request management
 * - Status filtering
 * - Property-based filtering
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

test.describe('Landlord Maintenance Features', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;
  let testMaintenanceIds: string[] = [];

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate landlord and tenant users', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();
    console.log('Both users authenticated successfully');
  });

  test('should verify landlord role', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('role')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(profile?.role).toBe('landlord');
    console.log('Landlord role verified');
  });

  test('should create test property for maintenance tests', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Maintenance Flow Test Property',
        address: '123 Maintenance Test Ave, Test City, TX 12345',
        property_type: 'apartment',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testPropertyId = data!.id;
    testPropertyCode = data!.property_code;
    console.log(`Created test property: ${testPropertyId}`);
  });

  test('should link tenant to property', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data[0]?.success).toBe(true);
    console.log('Tenant linked to property');
  });

  test('should create maintenance requests with different statuses', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const requestsToCreate = [
      { title: 'New Request - Kitchen Leak', status: 'pending', priority: 'high' },
      { title: 'In Progress - Bathroom Fan', status: 'in_progress', priority: 'medium' },
      { title: 'Completed - Light Fixture', status: 'completed', priority: 'low' },
    ];

    for (const req of requestsToCreate) {
      const { data, error } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: testPropertyId,
          tenant_id: tenant1!.profileId,
          title: req.title,
          description: `Test maintenance request: ${req.title}`,
          area: 'kitchen',
          asset: 'sink',
          issue_type: 'plumbing',
          priority: req.priority,
          status: req.status,
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      if (data) testMaintenanceIds.push(data.id);
    }

    expect(testMaintenanceIds.length).toBe(3);
    console.log(`Created ${testMaintenanceIds.length} test maintenance requests`);
  });

  test('should query dashboard data - all maintenance requests', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title, description, status, priority, created_at,
        properties (id, name, address)
      `
      )
      .eq('property_id', testPropertyId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBe(3);
    console.log(`Dashboard shows ${data!.length} maintenance requests`);
  });

  test('should filter by pending status (New Cases)', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].status).toBe('pending');
    console.log('Filtered by pending status: 1 result');
  });

  test('should filter by in_progress status', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('property_id', testPropertyId)
      .eq('status', 'in_progress');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].status).toBe('in_progress');
    console.log('Filtered by in_progress status: 1 result');
  });

  test('should filter by completed status (Resolved)', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('property_id', testPropertyId)
      .eq('status', 'completed');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].status).toBe('completed');
    console.log('Filtered by completed status: 1 result');
  });

  test('should support filtering by priority', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data: highPriority, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, priority')
      .eq('property_id', testPropertyId)
      .eq('priority', 'high');

    expect(error).toBeNull();
    expect(highPriority?.length).toBe(1);
    console.log('Filtered by high priority: 1 result');
  });

  test('should update maintenance request status', async () => {
    test.skip(!landlord1 || testMaintenanceIds.length === 0, 'Prerequisites not met');

    const requestId = testMaintenanceIds[0]; // pending request
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'in_progress' })
      .eq('id', requestId)
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    console.log('Updated request status to in_progress');
  });

  test('should get count by status for dashboard summary', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const statuses = ['pending', 'in_progress', 'completed'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', testPropertyId)
        .eq('status', status);

      expect(error).toBeNull();
      counts[status] = count || 0;
    }

    console.log('Dashboard counts:', counts);
    expect(counts['in_progress']).toBeGreaterThanOrEqual(1); // We updated one to in_progress
  });

  test('should support pagination for large result sets', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const pageSize = 2;
    const { data: page1, error: error1 } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('property_id', testPropertyId)
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1);

    expect(error1).toBeNull();
    expect(page1!.length).toBeLessThanOrEqual(pageSize);

    const { data: page2, error: error2 } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('property_id', testPropertyId)
      .order('created_at', { ascending: false })
      .range(pageSize, pageSize * 2 - 1);

    expect(error2).toBeNull();
    console.log(`Pagination: Page 1 has ${page1!.length} items, Page 2 has ${page2!.length} items`);
  });

  test('should cleanup test data', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Delete maintenance requests
    if (testMaintenanceIds.length > 0) {
      await landlord1!.client.from('maintenance_requests').delete().in('id', testMaintenanceIds);
      console.log(`Deleted ${testMaintenanceIds.length} maintenance requests`);
    }

    // Delete tenant link
    if (testPropertyId) {
      await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
    }

    // Delete property
    if (testPropertyId) {
      await landlord1!.client.from('properties').delete().eq('id', testPropertyId);
      console.log('Deleted test property');
    }
  });
});

test.describe('Landlord Dashboard - Multiple Properties', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let propertyIds: string[] = [];
  let propertyCodes: string[] = [];

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
  });

  test.afterAll(async () => {
    if (landlord1 && propertyIds.length > 0) {
      await landlord1.client.from('maintenance_requests').delete().in('property_id', propertyIds);
      await landlord1.client.from('tenant_property_links').delete().in('property_id', propertyIds);
      await landlord1.client.from('properties').delete().in('id', propertyIds);
    }
  });

  test('should create multiple properties and link tenant', async () => {
    test.skip(!landlord1 || !tenant1, 'Users not authenticated');

    const properties = [
      { name: 'Multi-Test Property A', address: '100 A Street' },
      { name: 'Multi-Test Property B', address: '200 B Street' },
    ];

    for (const prop of properties) {
      const { data } = await landlord1!.client
        .from('properties')
        .insert({
          landlord_id: landlord1!.profileId,
          name: prop.name,
          address: prop.address,
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      if (data) {
        propertyIds.push(data.id);
        propertyCodes.push(data.property_code);

        // Link tenant to each property
        await tenant1!.client.rpc('link_tenant_to_property', {
          input_code: data.property_code,
          tenant_id: tenant1!.profileId,
        });
      }
    }

    expect(propertyIds.length).toBe(2);
    console.log(`Created ${propertyIds.length} properties and linked tenant`);
  });

  test('should query across all properties', async () => {
    test.skip(!tenant1 || propertyIds.length === 0, 'Prerequisites not met');

    // Create maintenance request in each property as tenant
    for (const propId of propertyIds) {
      await tenant1!.client.from('maintenance_requests').insert({
        property_id: propId,
        tenant_id: tenant1!.profileId,
        title: `Request for ${propId}`,
        description: 'Multi-property test',
        area: 'bedroom',
        asset: 'light',
        issue_type: 'electrical',
        priority: 'low',
        status: 'pending',
      });
    }

    // Query all properties' maintenance requests
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title,
        properties!inner (
          id, name, landlord_id
        )
      `
      )
      .in('property_id', propertyIds);

    expect(error).toBeNull();
    expect(data!.length).toBe(2);
    console.log(`Found ${data!.length} requests across all properties`);
  });
});
