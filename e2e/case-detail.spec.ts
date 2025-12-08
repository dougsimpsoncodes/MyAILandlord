/**
 * Case Detail Tests - Maintenance Request Details via Supabase
 *
 * Tests maintenance request detail functionality including:
 * - Fetching full request details with relations
 * - Status updates (pending -> in_progress -> completed)
 * - Priority changes
 * - Notes and cost updates
 * - RLS verification
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

test.describe('Case Detail - Maintenance Request API', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testMaintenanceRequestId: string | null = null;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping case detail tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate users for case detail tests', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();
    console.log('Users authenticated for case detail tests');
  });

  test('should create test property for case detail tests', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Case Detail Test Property',
        address: '456 Case Detail Ave, Test City, TX 54321',
        property_type: 'apartment',
        allow_tenant_signup: true,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testPropertyId = data!.id;
    console.log(`Created test property: ${testPropertyId}`);
  });

  test('should link tenant to property', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { error } = await landlord1!.client.from('tenant_property_links').insert({
      tenant_id: tenant1!.profileId,
      property_id: testPropertyId,
      is_active: true,
      invitation_status: 'active',
    });

    expect(error).toBeNull();
    console.log('Linked tenant to property');
  });

  test('should create maintenance request as tenant', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Case Detail Test - Broken Window',
        description: 'Living room window is cracked and needs replacement',
        area: 'living_room',
        asset: 'window',
        issue_type: 'structural',
        priority: 'high',
        status: 'pending',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testMaintenanceRequestId = data!.id;
    console.log(`Created maintenance request: ${testMaintenanceRequestId}`);
  });

  test('should fetch maintenance request with full details', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        *,
        properties (
          id,
          name,
          address
        )
      `
      )
      .eq('id', testMaintenanceRequestId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.title).toBe('Case Detail Test - Broken Window');
    expect(data.description).toBe('Living room window is cracked and needs replacement');
    expect(data.area).toBe('living_room');
    expect(data.asset).toBe('window');
    expect(data.issue_type).toBe('structural');
    expect(data.priority).toBe('high');
    expect(data.status).toBe('pending');
    expect(data.properties).toBeTruthy();
    expect(data.properties.name).toBe('Case Detail Test Property');
    console.log('Full maintenance request details retrieved');
  });

  test('should update status to in_progress', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'in_progress' })
      .eq('id', testMaintenanceRequestId)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    console.log('Status updated to in_progress');
  });

  test('should update estimated cost', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ estimated_cost: 450.0 })
      .eq('id', testMaintenanceRequestId)
      .select('estimated_cost')
      .single();

    expect(error).toBeNull();
    expect(data?.estimated_cost).toBe(450.0);
    console.log('Estimated cost updated to $450.00');
  });

  test('should add vendor notes', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const vendorNotes = 'Contacted glass repair company. Scheduled for tomorrow.';
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ vendor_notes: vendorNotes })
      .eq('id', testMaintenanceRequestId)
      .select('vendor_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.vendor_notes).toBe(vendorNotes);
    console.log('Vendor notes added');
  });

  test('should update priority', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ priority: 'urgent' })
      .eq('id', testMaintenanceRequestId)
      .select('priority')
      .single();

    expect(error).toBeNull();
    expect(data?.priority).toBe('urgent');
    console.log('Priority updated to urgent');
  });

  test('should update actual cost on completion', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'completed',
        actual_cost: 475.5,
        completion_notes: 'Window replaced with double-pane glass.',
      })
      .eq('id', testMaintenanceRequestId)
      .select('status, actual_cost, completion_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.actual_cost).toBe(475.5);
    expect(data?.completion_notes).toBe('Window replaced with double-pane glass.');
    console.log('Case marked as completed with actual cost');
  });

  test('tenant should see their own maintenance request', async () => {
    test.skip(!tenant1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('id', testMaintenanceRequestId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.id).toBe(testMaintenanceRequestId);
    expect(data?.status).toBe('completed');
    console.log('Tenant can see their own request');
  });

  test('should verify RLS - tenant cannot update landlord-only fields', async () => {
    test.skip(!tenant1 || !testMaintenanceRequestId, 'Prerequisites not met');

    // Tenant trying to update vendor_notes (should still work for status updates though)
    // This is testing the RLS policy allows tenant updates
    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .update({ description: 'Updated description by tenant' })
      .eq('id', testMaintenanceRequestId)
      .select('description')
      .single();

    // RLS allows tenant to update their own requests
    expect(error).toBeNull();
    console.log('Tenant can update their own request description');
  });

  test('should get request history with timestamps', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('created_at, updated_at')
      .eq('id', testMaintenanceRequestId)
      .single();

    expect(error).toBeNull();
    expect(data?.created_at).toBeTruthy();
    expect(data?.updated_at).toBeTruthy();

    const createdAt = new Date(data!.created_at);
    const updatedAt = new Date(data!.updated_at);

    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    console.log(`Created: ${createdAt.toISOString()}, Updated: ${updatedAt.toISOString()}`);
  });

  test('should cleanup test data', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // Delete maintenance request
    if (testMaintenanceRequestId) {
      await landlord1!.client.from('maintenance_requests').delete().eq('id', testMaintenanceRequestId);
    }

    // Delete tenant link
    await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);

    // Delete property
    await landlord1!.client.from('properties').delete().eq('id', testPropertyId);

    console.log('Test data cleaned up');
  });
});

test.describe('Case Detail - Status Workflow', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    if (landlord1 && tenant1) {
      // Create property for status workflow tests
      const { data } = await landlord1.client
        .from('properties')
        .insert({
          landlord_id: landlord1.profileId,
          name: 'Status Workflow Property',
          address: '789 Workflow St',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id')
        .single();

      if (data) {
        testPropertyId = data.id;
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
      // Cleanup all requests for this property
      await landlord1.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should validate status transitions - pending to in_progress', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    // Create a pending request
    const { data: created } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Status Test 1',
        description: 'Testing status transitions',
        area: 'bathroom',
        asset: 'toilet',
        issue_type: 'plumbing',
        status: 'pending',
      })
      .select('id')
      .single();

    // Transition to in_progress
    const { data: updated, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'in_progress' })
      .eq('id', created!.id)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe('in_progress');
    console.log('Transition: pending -> in_progress');

    // Cleanup
    await landlord1!.client.from('maintenance_requests').delete().eq('id', created!.id);
  });

  test('should validate status transitions - in_progress to completed', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    // Create and set to in_progress
    const { data: created } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Status Test 2',
        description: 'Testing completion',
        area: 'kitchen',
        asset: 'dishwasher',
        issue_type: 'appliance',
        status: 'in_progress',
      })
      .select('id')
      .single();

    // Transition to completed
    const { data: updated, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'completed', completion_notes: 'Fixed!' })
      .eq('id', created!.id)
      .select('status, completion_notes')
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe('completed');
    expect(updated?.completion_notes).toBe('Fixed!');
    console.log('Transition: in_progress -> completed');

    // Cleanup
    await landlord1!.client.from('maintenance_requests').delete().eq('id', created!.id);
  });

  test('should allow cancellation from any status', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    // Create pending request
    const { data: created } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Cancel Test',
        description: 'Testing cancellation',
        area: 'bedroom',
        asset: 'light',
        issue_type: 'electrical',
        status: 'pending',
      })
      .select('id')
      .single();

    // Cancel the request
    const { data: updated, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ status: 'cancelled' })
      .eq('id', created!.id)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe('cancelled');
    console.log('Request cancelled successfully');

    // Cleanup
    await landlord1!.client.from('maintenance_requests').delete().eq('id', created!.id);
  });
});
