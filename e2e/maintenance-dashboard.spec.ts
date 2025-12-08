/**
 * Maintenance Dashboard Tests - Supabase API
 *
 * Tests the dashboard data retrieval and filtering functionality:
 * - Fetching maintenance requests with statistics
 * - Filtering by status (pending, in_progress, completed)
 * - Sorting and pagination
 * - RLS verification for landlord access
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

// Run tests in serial mode
test.describe.configure({ mode: 'serial' });

test.describe('Maintenance Dashboard - Data Fetching', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  const createdRequestIds: string[] = [];

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping dashboard tests - Supabase not configured');
      return;
    }

    // Setup
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    if (landlord1 && tenant1) {
      // Create test property
      const { data: propData } = await landlord1.client
        .from('properties')
        .insert({
          landlord_id: landlord1.profileId,
          name: 'Dashboard Test Property',
          address: '100 Dashboard Lane',
          property_type: 'apartment',
          allow_tenant_signup: true,
        })
        .select('id')
        .single();

      if (propData) {
        testPropertyId = propData.id;

        // Link tenant
        await landlord1.client.from('tenant_property_links').insert({
          tenant_id: tenant1.profileId,
          property_id: testPropertyId,
          is_active: true,
          invitation_status: 'active',
        });

        // Create test maintenance requests with different statuses
        const requests = [
          {
            title: 'Dashboard Test - Pending 1',
            status: 'pending',
            priority: 'high',
          },
          {
            title: 'Dashboard Test - Pending 2',
            status: 'pending',
            priority: 'low',
          },
          {
            title: 'Dashboard Test - In Progress',
            status: 'in_progress',
            priority: 'medium',
          },
          {
            title: 'Dashboard Test - Completed',
            status: 'completed',
            priority: 'urgent',
          },
        ];

        for (const req of requests) {
          const { data } = await tenant1.client
            .from('maintenance_requests')
            .insert({
              property_id: testPropertyId,
              tenant_id: tenant1.profileId,
              title: req.title,
              description: 'Testing dashboard functionality',
              area: 'general',
              asset: 'other',
              issue_type: 'general',
              priority: req.priority,
              status: req.status,
            })
            .select('id')
            .single();

          if (data) createdRequestIds.push(data.id);
        }
      }
    }
  });

  test.afterAll(async () => {
    if (landlord1 && testPropertyId) {
      // Cleanup requests
      for (const id of createdRequestIds) {
        await landlord1.client.from('maintenance_requests').delete().eq('id', id);
      }
      // Cleanup tenant link and property
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should fetch all maintenance requests for landlord', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status, priority, created_at')
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    console.log(`Dashboard: Fetched ${data?.length || 0} total requests`);
  });

  test('should get dashboard statistics by status', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    // Get counts for each status
    const statuses = ['pending', 'in_progress', 'completed'];
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const { count, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      expect(error).toBeNull();
      stats[status] = count || 0;
    }

    console.log(`Dashboard stats: pending=${stats.pending}, in_progress=${stats.in_progress}, completed=${stats.completed}`);
    expect(stats.pending).toBeGreaterThanOrEqual(2); // We created 2 pending
    expect(stats.in_progress).toBeGreaterThanOrEqual(1); // We created 1 in_progress
    expect(stats.completed).toBeGreaterThanOrEqual(1); // We created 1 completed
  });

  test('should filter by pending status', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('status', 'pending');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(2);
    data?.forEach((req) => {
      expect(req.status).toBe('pending');
    });
    console.log(`Filtered: ${data?.length} pending requests`);
  });

  test('should filter by in_progress status', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('status', 'in_progress');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    data?.forEach((req) => {
      expect(req.status).toBe('in_progress');
    });
    console.log(`Filtered: ${data?.length} in_progress requests`);
  });

  test('should filter by completed status', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('status', 'completed');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    data?.forEach((req) => {
      expect(req.status).toBe('completed');
    });
    console.log(`Filtered: ${data?.length} completed requests`);
  });

  test('should sort by created_at descending (newest first)', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);

    // Verify descending order
    for (let i = 1; i < (data?.length || 0); i++) {
      const currentDate = new Date(data![i].created_at);
      const prevDate = new Date(data![i - 1].created_at);
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currentDate.getTime());
    }
    console.log('Sort: Requests correctly ordered by created_at DESC');
  });

  test('should sort by priority', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, priority')
      .order('priority', { ascending: true })
      .limit(10);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    console.log(`Sort: Got ${data?.length} requests sorted by priority`);
  });

  test('should paginate results', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const pageSize = 2;

    // Get first page
    const { data: page1, error: error1 } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1);

    expect(error1).toBeNull();
    expect(page1?.length).toBeLessThanOrEqual(pageSize);

    // Get second page
    const { data: page2, error: error2 } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .order('created_at', { ascending: false })
      .range(pageSize, pageSize * 2 - 1);

    expect(error2).toBeNull();

    // Verify no overlap between pages
    if (page1 && page2 && page1.length > 0 && page2.length > 0) {
      const page1Ids = page1.map((r) => r.id);
      const page2Ids = page2.map((r) => r.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
    console.log(`Pagination: Page 1 has ${page1?.length} items, Page 2 has ${page2?.length} items`);
  });

  test('should search by title', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .ilike('title', '%Dashboard Test%');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(4); // We created 4 with "Dashboard Test" in title
    console.log(`Search: Found ${data?.length} requests matching 'Dashboard Test'`);
  });

  test('should filter by priority', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, priority')
      .eq('priority', 'high');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    data?.forEach((req) => {
      expect(req.priority).toBe('high');
    });
    console.log(`Filter: Found ${data?.length} high priority requests`);
  });

  test('should fetch requests with property details', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id,
        title,
        status,
        properties (
          id,
          name,
          address
        )
      `
      )
      .limit(5);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].properties).toBeTruthy();
    console.log('Fetch with relations: Property details included');
  });
});

test.describe('Maintenance Dashboard - RLS Access Control', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
  });

  test('landlord can only see requests for their properties', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(`
        id,
        property_id,
        properties!inner (
          landlord_id
        )
      `);

    expect(error).toBeNull();

    // Verify all returned requests are for properties owned by this landlord
    data?.forEach((req) => {
      expect(req.properties.landlord_id).toBe(landlord1!.profileId);
    });
    console.log(`RLS: Landlord sees ${data?.length} requests for their properties`);
  });

  test('tenant can only see their own requests', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');

    const { data, error } = await tenant1!.client.from('maintenance_requests').select('id, tenant_id');

    expect(error).toBeNull();

    // Verify all returned requests belong to this tenant
    data?.forEach((req) => {
      expect(req.tenant_id).toBe(tenant1!.profileId);
    });
    console.log(`RLS: Tenant sees ${data?.length} of their own requests`);
  });

  test('unauthenticated user cannot see any requests', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await anonClient.from('maintenance_requests').select('id').limit(1);

    expect(error).toBeNull();
    expect(data).toEqual([]);
    console.log('RLS: Unauthenticated user sees 0 requests');
  });
});

test.describe('Maintenance Dashboard - Real-time Statistics', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testRequestId: string | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    if (landlord1 && tenant1) {
      const { data: propData } = await landlord1.client
        .from('properties')
        .insert({
          landlord_id: landlord1.profileId,
          name: 'Stats Test Property',
          address: '200 Stats Ave',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id')
        .single();

      if (propData) {
        testPropertyId = propData.id;
        await landlord1.client.from('tenant_property_links').insert({
          tenant_id: tenant1.profileId,
          property_id: testPropertyId,
          is_active: true,
          invitation_status: 'active',
        });
      }
    }
  });

  test.afterAll(async () => {
    if (landlord1 && testPropertyId) {
      if (testRequestId) {
        await landlord1.client.from('maintenance_requests').delete().eq('id', testRequestId);
      }
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('statistics should update when new request is created', async () => {
    test.skip(!landlord1 || !tenant1 || !testPropertyId, 'Prerequisites not met');

    // Get initial pending count for this specific property only
    const { count: initialCount } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    // Create new request
    const { data } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Stats Test Request',
        description: 'Testing statistics update',
        area: 'bathroom',
        asset: 'shower',
        issue_type: 'plumbing',
        status: 'pending',
      })
      .select('id')
      .single();

    testRequestId = data?.id || null;

    // Get updated count for this specific property
    const { count: newCount } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    expect(newCount).toBe((initialCount || 0) + 1);
    console.log(`Stats: Pending count updated from ${initialCount} to ${newCount}`);
  });

  test('statistics should update when request status changes', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // First, ensure we have a pending request for this property
    let requestId = testRequestId;
    if (!requestId && tenant1) {
      const { data } = await tenant1.client
        .from('maintenance_requests')
        .insert({
          property_id: testPropertyId,
          tenant_id: tenant1.profileId,
          title: 'Status Change Test',
          description: 'Testing status change',
          area: 'kitchen',
          asset: 'sink',
          issue_type: 'plumbing',
          status: 'pending',
        })
        .select('id')
        .single();
      requestId = data?.id || null;
    }

    test.skip(!requestId, 'No request to update');

    // Get initial counts for this property only
    const { count: pendingBefore } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    const { count: inProgressBefore } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'in_progress');

    // Update status
    await landlord1!.client.from('maintenance_requests').update({ status: 'in_progress' }).eq('id', requestId);

    // Get updated counts for this property
    const { count: pendingAfter } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    const { count: inProgressAfter } = await landlord1!.client
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', testPropertyId)
      .eq('status', 'in_progress');

    expect(pendingAfter).toBe((pendingBefore || 0) - 1);
    expect(inProgressAfter).toBe((inProgressBefore || 0) + 1);
    console.log(`Stats: Status change updated counts correctly`);
  });
});
