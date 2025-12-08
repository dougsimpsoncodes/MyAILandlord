/**
 * Comprehensive Property and Maintenance Workflow Tests - Supabase API
 *
 * Tests complete landlord workflow including:
 * - Property creation and setup
 * - Tenant linking
 * - Maintenance request creation
 * - Status updates and completion
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

test.describe('Complete Property and Maintenance Workflow', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;
  let testMaintenanceId: string | null = null;

  test('Full landlord workflow from onboarding to maintenance management', async () => {
    console.log('Starting comprehensive landlord workflow test');

    // Step 1: Authenticate landlord
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    expect(landlord1).toBeTruthy();
    console.log('Step 1: Landlord authenticated');

    // Step 2: Verify landlord profile exists with correct role
    const { data: profile, error: profileError } = await landlord1!.client
      .from('profiles')
      .select('id, email, role')
      .eq('id', landlord1!.profileId)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('landlord');
    console.log('Step 2: Landlord profile verified');

    // Step 3: Create a new property
    const { data: property, error: propError } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Workflow Test Apartments',
        address: '100 Workflow Test Lane, Test City, TX 12345',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        description: 'Test property for workflow validation',
        allow_tenant_signup: true,
      })
      .select('id, property_code, name')
      .single();

    expect(propError).toBeNull();
    expect(property?.id).toBeTruthy();
    expect(property?.property_code).toMatch(/^[A-Z]{3}[0-9]{3}$/);
    testPropertyId = property!.id;
    testPropertyCode = property!.property_code;
    console.log(`Step 3: Property created - ${property?.name} (${testPropertyCode})`);

    // Step 4: Set property details (emergency contact, WiFi)
    const { error: updateError } = await landlord1!.client
      .from('properties')
      .update({
        emergency_contact: 'Test Manager',
        emergency_phone: '555-123-4567',
        wifi_network: 'TestNetwork',
        wifi_password: 'TestPass123',
        onboarding_message: 'Welcome to Workflow Test Apartments!',
      })
      .eq('id', testPropertyId);

    expect(updateError).toBeNull();
    console.log('Step 4: Property details updated');

    // Step 5: Authenticate tenant
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
    expect(tenant1).toBeTruthy();
    console.log('Step 5: Tenant authenticated');

    // Step 6: Validate property code (simulating tenant entering code)
    const { data: validation, error: valError } = await tenant1!.client.rpc('validate_property_code', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(valError).toBeNull();
    expect(validation[0]?.success).toBe(true);
    console.log('Step 6: Property code validated');

    // Step 7: Link tenant to property
    const { data: link, error: linkError } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(linkError).toBeNull();
    expect(link[0]?.success).toBe(true);
    console.log('Step 7: Tenant linked to property');

    // Step 8: Tenant creates maintenance request
    const { data: request, error: reqError } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'Workflow Test - Leaking Faucet',
        description: 'Kitchen faucet is dripping constantly',
        area: 'kitchen',
        asset: 'faucet',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
      })
      .select('id, title, status')
      .single();

    expect(reqError).toBeNull();
    expect(request?.id).toBeTruthy();
    testMaintenanceId = request!.id;
    console.log(`Step 8: Maintenance request created - ${request?.title}`);

    // Step 9: Landlord views the request
    const { data: landlordView, error: viewError } = await landlord1!.client
      .from('maintenance_requests')
      .select(
        `
        id, title, description, status, priority,
        properties (name, address)
      `
      )
      .eq('id', testMaintenanceId)
      .single();

    expect(viewError).toBeNull();
    expect(landlordView?.title).toBe('Workflow Test - Leaking Faucet');
    console.log('Step 9: Landlord viewed maintenance request');

    // Step 10: Landlord updates status to in_progress
    const { error: statusError } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'in_progress',
        assigned_vendor_email: 'plumber@example.com',
        vendor_notes: 'Plumber scheduled for tomorrow',
        estimated_cost: 150.0,
      })
      .eq('id', testMaintenanceId);

    expect(statusError).toBeNull();
    console.log('Step 10: Status updated to in_progress');

    // Step 11: Tenant can see the update
    const { data: tenantView } = await tenant1!.client
      .from('maintenance_requests')
      .select('status, assigned_vendor_email')
      .eq('id', testMaintenanceId)
      .single();

    expect(tenantView?.status).toBe('in_progress');
    console.log('Step 11: Tenant can see status update');

    // Step 12: Complete the maintenance request
    const { error: completeError } = await landlord1!.client
      .from('maintenance_requests')
      .update({
        status: 'completed',
        actual_cost: 125.0,
        completion_notes: 'Faucet washer replaced. Fixed.',
      })
      .eq('id', testMaintenanceId);

    expect(completeError).toBeNull();
    console.log('Step 12: Maintenance request completed');

    // Cleanup
    await landlord1!.client.from('maintenance_requests').delete().eq('id', testMaintenanceId);
    await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
    await landlord1!.client.from('properties').delete().eq('id', testPropertyId);
    console.log('Cleanup completed');
  });

  test('Test maintenance request lifecycle simulation', async () => {
    // Re-authenticate for this test
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
    expect(landlord1).toBeTruthy();
    expect(tenant1).toBeTruthy();

    // Create property
    const { data: property } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Lifecycle Test Property',
        address: '200 Lifecycle Ave',
        property_type: 'house',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    testPropertyId = property!.id;

    // Link tenant to property
    await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: property!.property_code,
      tenant_id: tenant1!.profileId,
    });

    // Create multiple maintenance requests with different statuses
    const statuses = ['pending', 'in_progress', 'completed'];
    const createdIds: string[] = [];

    for (const status of statuses) {
      const { data: req } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: testPropertyId,
          tenant_id: tenant1!.profileId,
          title: `Lifecycle Test - ${status}`,
          description: `Testing ${status} status`,
          area: 'bedroom',
          asset: 'light',
          issue_type: 'electrical',
          priority: 'low',
          status: status,
        })
        .select('id')
        .single();

      if (req) createdIds.push(req.id);
    }

    expect(createdIds.length).toBe(3);

    // Query by status
    const { data: pending } = await landlord1!.client
      .from('maintenance_requests')
      .select('id')
      .eq('property_id', testPropertyId)
      .eq('status', 'pending');

    expect(pending?.length).toBe(1);

    const { data: inProgress } = await landlord1!.client
      .from('maintenance_requests')
      .select('id')
      .eq('property_id', testPropertyId)
      .eq('status', 'in_progress');

    expect(inProgress?.length).toBe(1);

    const { data: completed } = await landlord1!.client
      .from('maintenance_requests')
      .select('id')
      .eq('property_id', testPropertyId)
      .eq('status', 'completed');

    expect(completed?.length).toBe(1);

    console.log('Lifecycle simulation completed successfully');

    // Cleanup
    await landlord1!.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
    await landlord1!.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
    await landlord1!.client.from('properties').delete().eq('id', testPropertyId);
  });
});
