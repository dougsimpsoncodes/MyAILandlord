/**
 * Realistic Landlord Flow Tests - Supabase API
 *
 * Tests the complete landlord journey including:
 * - Onboarding and profile setup
 * - Property creation and configuration
 * - Tenant invitation workflow
 * - Maintenance management
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

test.describe('Realistic Landlord Workflow', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;
  let testMaintenanceId: string | null = null;

  test('Step 1: Landlord authenticates and profile is verified', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    expect(landlord1).toBeTruthy();

    // Verify profile
    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(profile?.role).toBe('landlord');
    expect(profile?.email).toBe(TEST_USERS.landlord1.email);
    console.log('Step 1: Landlord authenticated and profile verified');
  });

  test('Step 2: Landlord creates property with full details', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Create property with comprehensive details
    const { data: property, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Sunset Apartments Unit 4B',
        address: '123 Sunset Boulevard, Los Angeles, CA 90210',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        description: 'Beautiful apartment in prime location',
        allow_tenant_signup: true,
      })
      .select('id, property_code, name, address')
      .single();

    expect(error).toBeNull();
    expect(property?.id).toBeTruthy();
    expect(property?.property_code).toMatch(/^[A-Z]{3}[0-9]{3}$/);

    testPropertyId = property!.id;
    testPropertyCode = property!.property_code;
    console.log(`Step 2: Created property "${property?.name}" with code ${testPropertyCode}`);
  });

  test('Step 3: Landlord configures property details', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // Add emergency contact and WiFi info
    const { error } = await landlord1!.client
      .from('properties')
      .update({
        emergency_contact: 'Property Manager John',
        emergency_phone: '555-123-4567',
        wifi_network: 'SunsetApts_Guest',
        wifi_password: 'WelcomeHome2024',
        onboarding_message: 'Welcome to Sunset Apartments! Please review the house rules.',
      })
      .eq('id', testPropertyId);

    expect(error).toBeNull();

    // Verify the update
    const { data: updated } = await landlord1!.client
      .from('properties')
      .select('emergency_contact, wifi_network, onboarding_message')
      .eq('id', testPropertyId)
      .single();

    expect(updated?.emergency_contact).toBe('Property Manager John');
    expect(updated?.wifi_network).toBe('SunsetApts_Guest');
    console.log('Step 3: Property details configured');
  });

  test('Step 4: Tenant authenticates', async () => {
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
    expect(tenant1).toBeTruthy();

    const { data: profile } = await tenant1!.client
      .from('profiles')
      .select('role')
      .eq('id', tenant1!.profileId)
      .single();

    expect(profile?.role).toBe('tenant');
    console.log('Step 4: Tenant authenticated');
  });

  test('Step 5: Tenant joins property using code', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    // First validate the code
    const { data: validation, error: valError } = await tenant1!.client.rpc('validate_property_code', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(valError).toBeNull();
    expect(validation[0]?.success).toBe(true);

    // Then link tenant to property
    const { data: link, error: linkError } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(linkError).toBeNull();
    expect(link[0]?.success).toBe(true);
    console.log('Step 5: Tenant linked to property');
  });

  test('Step 6: Tenant submits maintenance request', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data: request, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Kitchen faucet is leaking',
        description: 'The kitchen faucet has been dripping constantly for 2 days',
        area: 'kitchen',
        asset: 'faucet',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
      })
      .select('id, title, status, created_at')
      .single();

    expect(error).toBeNull();
    expect(request?.id).toBeTruthy();
    expect(request?.status).toBe('pending');

    testMaintenanceId = request!.id;
    console.log(`Step 6: Tenant created maintenance request: "${request?.title}"`);
  });

  test('Step 7: Landlord sees request in dashboard', async () => {
    test.skip(!landlord1 || !testMaintenanceId, 'Prerequisites not met');

    const { data: requests, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title, description, status, priority, area, asset, issue_type, created_at,
        properties (name, address),
        profiles!maintenance_requests_tenant_id_fkey (email)
      `
      )
      .eq('property_id', testPropertyId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(requests!.length).toBeGreaterThanOrEqual(1);

    const ourRequest = requests!.find((r) => r.id === testMaintenanceId);
    expect(ourRequest).toBeTruthy();
    expect(ourRequest?.title).toBe('Kitchen faucet is leaking');
    console.log('Step 7: Landlord sees maintenance request in dashboard');
  });

  test('Step 8: Landlord assigns vendor and updates status', async () => {
    test.skip(!landlord1 || !testMaintenanceId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'in_progress',
        assigned_vendor_email: 'joes-plumbing@example.com',
        vendor_notes: "Scheduled Joe's Plumbing for tomorrow 9-11am",
        estimated_cost: 150.0,
      })
      .eq('id', testMaintenanceId)
      .select('status, assigned_vendor_email, estimated_cost')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    expect(data?.assigned_vendor_email).toBe('joes-plumbing@example.com');
    console.log('Step 8: Landlord assigned vendor and updated status');
  });

  test('Step 9: Tenant receives update', async () => {
    test.skip(!tenant1 || !testMaintenanceId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('status, assigned_vendor_email, vendor_notes')
      .eq('id', testMaintenanceId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('in_progress');
    expect(data?.assigned_vendor_email).toBe('joes-plumbing@example.com');
    console.log('Step 9: Tenant can see status update and vendor info');
  });

  test('Step 10: Landlord completes maintenance request', async () => {
    test.skip(!landlord1 || !testMaintenanceId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'completed',
        actual_cost: 125.0,
        completion_notes: 'Faucet washer and cartridge replaced. No more leaking.',
      })
      .eq('id', testMaintenanceId)
      .select('status, actual_cost, completion_notes')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.actual_cost).toBe(125.0);
    console.log('Step 10: Maintenance request marked as completed');
  });

  test('Step 11: Verify complete workflow state', async () => {
    test.skip(!tenant1 || !testMaintenanceId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .select('*')
      .eq('id', testMaintenanceId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('completed');
    expect(data?.title).toBe('Kitchen faucet is leaking');
    expect(data?.completion_notes).toContain('No more leaking');

    console.log('Step 11: Complete workflow verified - all states correct');
    console.log('Workflow Summary:');
    console.log('  - Landlord created property with code');
    console.log('  - Landlord configured property details');
    console.log('  - Tenant joined using property code');
    console.log('  - Tenant submitted maintenance request');
    console.log('  - Landlord assigned vendor');
    console.log('  - Landlord completed the work');
  });

  test('Cleanup: Remove test data', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    if (testMaintenanceId) {
      await landlord1!.client.from('maintenance_requests').delete().eq('id', testMaintenanceId);
    }

    if (testPropertyId) {
      await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1!.client.from('properties').delete().eq('id', testPropertyId);
    }

    console.log('Cleanup: Test data removed');
  });
});

test.describe('Responsive Design - API Data Patterns', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('Mobile viewport data pattern (small page, limited fields)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Mobile: Fewer items, essential fields only
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status, priority')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(5);
    console.log(`Mobile pattern: ${data!.length} items with essential fields`);
  });

  test('Tablet viewport data pattern (medium page, more fields)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Tablet: More items, additional fields
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title, status, priority, area, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(10);
    console.log(`Tablet pattern: ${data!.length} items with extended fields`);
  });

  test('Desktop viewport data pattern (large page, all fields)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Desktop: More items, full data including relations
    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title, status, priority, area, asset, issue_type,
        description, estimated_cost, actual_cost, created_at,
        properties (name, address)
      `
      )
      .order('created_at', { ascending: false })
      .limit(20);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(20);
    console.log(`Desktop pattern: ${data!.length} items with full fields and relations`);
  });
});

test.describe('Error Handling and Edge Cases', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('Should handle query for non-existent property gracefully', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('id, name')
      .eq('id', '00000000-0000-0000-0000-000000000000');

    expect(error).toBeNull();
    expect(data).toEqual([]);
    console.log('Non-existent property query handled gracefully');
  });

  test('Should handle query for non-existent maintenance request gracefully', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .eq('id', '00000000-0000-0000-0000-000000000000');

    expect(error).toBeNull();
    expect(data).toEqual([]);
    console.log('Non-existent maintenance request query handled gracefully');
  });

  test('Should return empty array for property with no maintenance requests', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Create property with no maintenance requests
    const { data: property } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Empty Property Test',
        address: '999 Empty Lane',
        property_type: 'house',
      })
      .select('id')
      .single();

    // Query for maintenance requests
    const { data: requests, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id')
      .eq('property_id', property!.id);

    expect(error).toBeNull();
    expect(requests).toEqual([]);

    // Cleanup
    await landlord1!.client.from('properties').delete().eq('id', property!.id);
    console.log('Empty results handled gracefully');
  });
});
