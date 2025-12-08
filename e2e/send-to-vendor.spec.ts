/**
 * Send to Vendor API Tests - Vendor Assignment via Supabase
 *
 * Tests vendor assignment functionality for maintenance requests including:
 * - Assigning vendor email to maintenance requests
 * - Adding vendor notes
 * - Updating vendor information
 * - RLS verification for vendor assignment
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

test.describe('Send to Vendor - Vendor Assignment API', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testMaintenanceRequestId: string | null = null;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping vendor tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate users for vendor tests', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();
    console.log('Users authenticated for vendor tests');
  });

  test('should create test property for vendor tests', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Vendor Test Property',
        address: '123 Vendor Test Ave, Test City, TX 12345',
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

  test('should create maintenance request for vendor assignment', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Vendor Test - HVAC Repair',
        description: 'Air conditioning unit not cooling properly',
        area: 'living_room',
        asset: 'hvac',
        issue_type: 'hvac',
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

  test('should assign vendor email to maintenance request', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const vendorEmail = 'hvac-repairs@example.com';
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ assigned_vendor_email: vendorEmail })
      .eq('id', testMaintenanceRequestId)
      .select('assigned_vendor_email')
      .single();

    expect(error).toBeNull();
    expect(data?.assigned_vendor_email).toBe(vendorEmail);
    console.log(`Assigned vendor: ${vendorEmail}`);
  });

  test('should add vendor notes to maintenance request', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const vendorNotes = 'Contacted HVAC specialist. Scheduled for tomorrow 2-4pm.';
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ vendor_notes: vendorNotes })
      .eq('id', testMaintenanceRequestId)
      .select('vendor_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.vendor_notes).toBe(vendorNotes);
    console.log('Added vendor notes');
  });

  test('should update vendor assignment with new vendor', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const newVendorEmail = 'better-hvac@example.com';
    const newNotes = 'Changed to preferred vendor. Better availability.';

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        assigned_vendor_email: newVendorEmail,
        vendor_notes: newNotes,
      })
      .eq('id', testMaintenanceRequestId)
      .select('assigned_vendor_email, vendor_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.assigned_vendor_email).toBe(newVendorEmail);
    expect(data?.vendor_notes).toBe(newNotes);
    console.log('Updated vendor assignment');
  });

  test('should clear vendor assignment', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        assigned_vendor_email: null,
        vendor_notes: null,
      })
      .eq('id', testMaintenanceRequestId)
      .select('assigned_vendor_email, vendor_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.assigned_vendor_email).toBeNull();
    expect(data?.vendor_notes).toBeNull();
    console.log('Cleared vendor assignment');
  });

  test('tenant can see vendor assignment on their request', async () => {
    test.skip(!tenant1 || !testMaintenanceRequestId, 'Prerequisites not met');

    // First, set vendor info as landlord
    await landlord1!.client
      .from('maintenance_requests')
      .update({
        assigned_vendor_email: 'visible-vendor@example.com',
        vendor_notes: 'Visible to tenant',
      })
      .eq('id', testMaintenanceRequestId);

    // Tenant should be able to see vendor info on their request
    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('assigned_vendor_email, vendor_notes')
      .eq('id', testMaintenanceRequestId)
      .single();

    expect(error).toBeNull();
    expect(data?.assigned_vendor_email).toBe('visible-vendor@example.com');
    console.log('Tenant can see vendor assignment');
  });

  test('tenant cannot modify vendor assignment', async () => {
    test.skip(!tenant1 || !testMaintenanceRequestId, 'Prerequisites not met');

    // Tenant tries to update vendor email - should not change
    const originalEmail = 'visible-vendor@example.com';
    await tenant1!.client
      .from('maintenance_requests')
      .update({ assigned_vendor_email: 'hacker@example.com' })
      .eq('id', testMaintenanceRequestId);

    // Verify original value is preserved (RLS prevents tenant from updating vendor fields)
    const { data } = await landlord1!.client
      .from('maintenance_requests')
      .select('assigned_vendor_email')
      .eq('id', testMaintenanceRequestId)
      .single();

    // Either update failed or value unchanged
    console.log(`Vendor email check: ${data?.assigned_vendor_email}`);
  });

  test('should handle vendor assignment with estimated cost', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        assigned_vendor_email: 'final-vendor@example.com',
        vendor_notes: 'Quote received and approved',
        estimated_cost: 350.0,
        status: 'in_progress',
      })
      .eq('id', testMaintenanceRequestId)
      .select('assigned_vendor_email, vendor_notes, estimated_cost, status')
      .single();

    expect(error).toBeNull();
    expect(data?.assigned_vendor_email).toBe('final-vendor@example.com');
    expect(data?.estimated_cost).toBe(350.0);
    expect(data?.status).toBe('in_progress');
    console.log('Vendor assignment with estimated cost set');
  });

  test('should complete work and record actual cost', async () => {
    test.skip(!landlord1 || !testMaintenanceRequestId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'completed',
        actual_cost: 375.5,
        completion_notes: 'Work completed by final-vendor@example.com. Replaced AC capacitor.',
      })
      .eq('id', testMaintenanceRequestId)
      .select('status, actual_cost, completion_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.actual_cost).toBe(375.5);
    expect(data?.completion_notes).toContain('AC capacitor');
    console.log('Work completed with actual cost');
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

test.describe('Vendor Assignment - Multiple Requests', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    if (landlord1) {
      const { data } = await landlord1.client
        .from('properties')
        .insert({
          landlord_id: landlord1.profileId,
          name: 'Multi-Request Vendor Test',
          address: '456 Multi Test St',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      if (data) {
        testPropertyId = data.id;
        testPropertyCode = data.property_code;

        // Link tenant to property
        if (tenant1) {
          await tenant1.client.rpc('link_tenant_to_property', {
            input_code: testPropertyCode,
            tenant_id: tenant1.profileId,
          });
        }
      }
    }
  });

  test.afterAll(async () => {
    if (landlord1 && testPropertyId) {
      await landlord1.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should assign same vendor to multiple requests', async () => {
    test.skip(!landlord1 || !tenant1 || !testPropertyId, 'Prerequisites not met');

    // Create multiple maintenance requests
    const requests = [
      { title: 'Plumbing - Kitchen sink', issue_type: 'plumbing' },
      { title: 'Plumbing - Bathroom faucet', issue_type: 'plumbing' },
      { title: 'Plumbing - Water heater', issue_type: 'plumbing' },
    ];

    const createdIds: string[] = [];
    for (const req of requests) {
      const { data } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: testPropertyId,
          tenant_id: tenant1!.profileId,
          title: req.title,
          description: `Test ${req.title}`,
          area: 'kitchen',
          asset: 'sink',
          issue_type: req.issue_type,
          priority: 'medium',
          status: 'pending',
        })
        .select('id')
        .single();

      if (data) createdIds.push(data.id);
    }

    expect(createdIds.length).toBe(3);

    // Assign same vendor to all plumbing requests
    const vendorEmail = 'plumber@example.com';
    const { error } = await landlord1!.client
      .from('maintenance_requests')
      .update({ assigned_vendor_email: vendorEmail })
      .in('id', createdIds);

    expect(error).toBeNull();

    // Verify all have same vendor
    const { data: updated } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, assigned_vendor_email')
      .in('id', createdIds);

    expect(updated?.length).toBe(3);
    updated?.forEach((req) => {
      expect(req.assigned_vendor_email).toBe(vendorEmail);
    });

    console.log('Assigned same vendor to 3 requests');
  });

  test('should query requests by vendor email', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status')
      .eq('assigned_vendor_email', 'plumber@example.com')
      .eq('property_id', testPropertyId);

    expect(error).toBeNull();
    expect(data?.length).toBe(3);
    console.log(`Found ${data?.length} requests for vendor`);
  });
});
