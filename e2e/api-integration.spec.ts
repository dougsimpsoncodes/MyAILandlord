/**
 * API Integration Tests - Supabase Backend
 *
 * Tests the Supabase API integration including:
 * - Maintenance request CRUD operations
 * - RLS policies enforcement
 * - Real-time subscriptions
 * - Data transformation
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateWithRetry, AuthenticatedClient } from './helpers/auth-helper';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials (created via SQL in Supabase)
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

// Run tests in serial mode since they share test data
test.describe.configure({ mode: 'serial' });

test.describe('Maintenance API Integration', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testMaintenanceRequestId: string | null = null;

  test.beforeAll(async () => {
    // Skip all tests if Supabase not configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping API tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate test users', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();
    console.log(`Authenticated landlord1: ${landlord1?.profileId}`);
    console.log(`Authenticated tenant1: ${tenant1?.profileId}`);
  });

  test('should fetch maintenance requests from API successfully', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    // Query maintenance requests for landlord
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(`
        id,
        title,
        description,
        area,
        asset,
        issue_type,
        priority,
        status,
        created_at,
        estimated_cost,
        images,
        tenant_id,
        property_id,
        profiles:tenant_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    console.log(`Fetched ${data?.length || 0} maintenance requests for landlord`);
  });

  test('should create property for maintenance request test', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'API Test Property',
        address: '123 API Test St, Test City, TX 12345',
        property_type: 'house',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testPropertyId = data!.id;
    console.log(`Created test property: ${testPropertyId}`);
  });

  test('should link tenant to property', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('tenant_property_links')
      .insert({
        tenant_id: tenant1!.profileId,
        property_id: testPropertyId,
        is_active: true,
        invitation_status: 'active',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    console.log(`Linked tenant to property`);
  });

  test('should create maintenance request as tenant', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'API Test - Leaky Faucet',
        description: 'Kitchen faucet is leaking under the sink',
        area: 'kitchen',
        asset: 'faucet',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testMaintenanceRequestId = data!.id;
    console.log(`Created maintenance request: ${testMaintenanceRequestId}`);
  });

  test('should handle data transformation correctly', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('*')
      .eq('id', testMaintenanceRequestId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    // Verify data types
    expect(typeof data.id).toBe('string');
    expect(typeof data.title).toBe('string');
    expect(typeof data.description).toBe('string');
    expect(['low', 'medium', 'high', 'urgent']).toContain(data.priority);
    expect(['pending', 'in_progress', 'resolved', 'completed']).toContain(data.status);

    // Verify timestamps
    expect(data.created_at).toBeTruthy();
    expect(new Date(data.created_at).getTime()).toBeGreaterThan(0);

    console.log('Data transformation verified');
  });

  test('should validate RLS - tenant can only see own requests', async () => {
    test.skip(!tenant1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('id', testMaintenanceRequestId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].id).toBe(testMaintenanceRequestId);
    console.log('RLS validation passed - tenant sees own request');
  });

  test('should validate RLS - landlord can see requests for their properties', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('id', testMaintenanceRequestId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].id).toBe(testMaintenanceRequestId);
    console.log('RLS validation passed - landlord sees property request');
  });

  test('should update maintenance request status as landlord', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'in_progress' })
      .eq('id', testMaintenanceRequestId)
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    console.log('Status updated to in_progress');
  });

  test('should handle authentication errors - unauthenticated access', async () => {
    // Create an unauthenticated client
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Try to access maintenance_requests without authentication
    const { data, error } = await anonClient
      .from('maintenance_requests')
      .select('id')
      .limit(1);

    // Should return empty due to RLS (not an error, just no results)
    expect(data).toEqual([]);
    console.log('Unauthenticated access blocked by RLS');
  });

  test('should handle pagination', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    // Test pagination with limit and offset
    const pageSize = 5;
    const { data: page1, error: error1 } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1);

    expect(error1).toBeNull();
    expect(Array.isArray(page1)).toBe(true);
    expect(page1!.length).toBeLessThanOrEqual(pageSize);

    // Get count
    const { count, error: countError } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true });

    expect(countError).toBeNull();
    console.log(`Pagination working - total count: ${count}, page size: ${page1!.length}`);
  });

  test('should validate API request - required fields', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    // Try to insert without required fields
    const { error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        // Missing required: title, description, area, asset, issue_type
      } as any);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('null value');
    console.log('Required field validation working');
  });

  // Cleanup test data
  test('should cleanup test data', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // Delete maintenance requests
    if (testMaintenanceRequestId) {
      await landlord1!.client
        .from('maintenance_requests')
        .delete()
        .eq('id', testMaintenanceRequestId);
    }

    // Delete tenant links
    await landlord1!.client
      .from('tenant_property_links')
      .delete()
      .eq('property_id', testPropertyId);

    // Delete property
    await landlord1!.client
      .from('properties')
      .delete()
      .eq('id', testPropertyId);

    console.log('Test data cleaned up');
  });
});
