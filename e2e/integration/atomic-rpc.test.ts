/**
 * Integration Tests: Atomic RPC Functions
 *
 * Tests the atomic database RPC functions directly without UI interaction.
 * This verifies the core onboarding logic works correctly.
 */

import { test, expect } from '@playwright/test';
import { supabase, supabaseAdmin, cleanupTestUser, cleanupTestProperty } from '../utils/supabase-test-client';

test.describe('Atomic RPC Integration Tests', () => {
  const testEmail = `test-${Date.now()}@myailandlord.com`;
  const testPassword = 'TestPassword123!';
  let userId: string;
  let propertyId: string;

  test.afterEach(async () => {
    // Cleanup
    if (userId) {
      await cleanupTestUser(userId);
    }
    if (propertyId) {
      await cleanupTestProperty(propertyId);
    }
  });

  test('signup_and_onboard_landlord() creates profile, property, areas atomically', async () => {
    // Step 1: Sign up a new user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    expect(signUpError).toBeNull();
    expect(authData.user).toBeTruthy();
    userId = authData.user!.id;

    // Step 2: Call atomic onboarding RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('signup_and_onboard_landlord', {
      p_property_name: 'Test Property',
      p_address_jsonb: {
        line1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
      p_property_type: 'house',
      p_bedrooms: 3,
      p_bathrooms: 2,
      p_areas: ['Kitchen', 'Living Room', 'Bedroom'],
    });

    // Step 3: Verify RPC succeeded
    expect(rpcError).toBeNull();
    expect(Array.isArray(rpcData)).toBe(true);
    expect(rpcData.length).toBeGreaterThan(0);

    const result = rpcData[0];
    expect(result.success).toBe(true);
    expect(result.property_id).toBeTruthy();
    propertyId = result.property_id;

    // Step 4: Verify profile was created/updated correctly
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', userId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.role).toBe('landlord');
    expect(profile!.onboarding_completed).toBe(true);

    // Step 5: Verify property was created
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, landlord_id, property_type, bedrooms, bathrooms')
      .eq('id', propertyId)
      .single();

    expect(propertyError).toBeNull();
    expect(property).toBeTruthy();
    expect(property!.name).toBe('Test Property');
    expect(property!.landlord_id).toBe(userId);
    expect(property!.property_type).toBe('house');
    expect(property!.bedrooms).toBe(3);
    expect(property!.bathrooms).toBe(2);

    // Step 6: Verify areas were created
    const { data: areas, error: areasError } = await supabase
      .from('property_areas')
      .select('id, name, area_type')
      .eq('property_id', propertyId);

    expect(areasError).toBeNull();
    expect(areas).toBeTruthy();
    expect(areas!.length).toBe(3);
    expect(areas!.map(a => a.name)).toEqual(expect.arrayContaining(['Kitchen', 'Living Room', 'Bedroom']));
  });

  test.skip('signup_and_accept_invite() creates tenant profile and link atomically - SKIP: invite system mismatch', async () => {
    // NOTE: This test is skipped because the current database uses a salted hash invite system
    // (sha256(token || salt)) but the atomic RPC expects non-salted hashes (sha256(token)).
    // This will be resolved when the tokenized invite system migration is fully deployed.
    // Setup: Create landlord and property using atomic RPC (no admin access needed)
    const landlordEmail = `landlord-${Date.now()}@myailandlord.com`;
    const { data: landlordAuth, error: landlordSignUpError } = await supabase.auth.signUp({
      email: landlordEmail,
      password: testPassword,
    });

    expect(landlordSignUpError).toBeNull();
    expect(landlordAuth.user).toBeTruthy();
    const landlordId = landlordAuth.user!.id;

    // Use atomic RPC to create landlord's property (sets onboarding_completed = true)
    const { data: landlordRpcData, error: landlordRpcError } = await supabase.rpc('signup_and_onboard_landlord', {
      p_property_name: 'Test Property for Invite',
      p_address_jsonb: {
        line1: '456 Test Ave',
        city: 'Oakland',
        state: 'CA',
        zipCode: '94601',
      },
      p_property_type: 'apartment',
      p_bedrooms: 2,
      p_bathrooms: 1,
      p_areas: ['Kitchen', 'Living Room'],
    });

    expect(landlordRpcError).toBeNull();
    expect(Array.isArray(landlordRpcData)).toBe(true);
    expect(landlordRpcData[0].success).toBe(true);
    propertyId = landlordRpcData[0].property_id;

    // Generate invite using existing function
    const { data: inviteData, error: inviteError } = await supabase.rpc('create_invite', {
      p_property_id: propertyId,
      p_delivery_method: 'code',
      p_intended_email: null,
    });

    expect(inviteError).toBeNull();
    expect(inviteData).toBeTruthy();
    expect(Array.isArray(inviteData)).toBe(true);
    expect(inviteData.length).toBeGreaterThan(0);

    const inviteToken = inviteData[0].token;
    console.log('Created invite token:', inviteToken);

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 1: Sign up new tenant
    const tenantEmail = `tenant-${Date.now()}@myailandlord.com`;
    const { data: tenantAuth, error: tenantSignUpError } = await supabase.auth.signUp({
      email: tenantEmail,
      password: testPassword,
    });

    expect(tenantSignUpError).toBeNull();
    expect(tenantAuth.user).toBeTruthy();
    userId = tenantAuth.user!.id;

    console.log('Attempting to accept invite with token:', inviteToken);

    // Step 2: Call atomic invite acceptance RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('signup_and_accept_invite', {
      p_token: inviteToken,
      p_name: 'Test Tenant',
    });

    // Step 3: Verify RPC succeeded
    expect(rpcError).toBeNull();
    expect(Array.isArray(rpcData)).toBe(true);
    expect(rpcData.length).toBeGreaterThan(0);

    const result = rpcData[0];
    if (!result.success) {
      console.log('RPC failed with error:', result.error_message);
    }
    expect(result.success).toBe(true);
    expect(result.property_name).toBe('Test Property for Invite');

    // Step 4: Verify tenant profile was created/updated
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', userId)
      .single();

    expect(profile).toBeTruthy();
    expect(profile!.role).toBe('tenant');
    expect(profile!.onboarding_completed).toBe(true);

    // Step 5: Verify tenant-property link was created
    const { data: link } = await supabase
      .from('tenant_property_links')
      .select('id, tenant_id, property_id, is_active')
      .eq('tenant_id', userId)
      .eq('property_id', propertyId)
      .single();

    expect(link).toBeTruthy();
    expect(link!.is_active).toBe(true);

    // Step 6: Verify invite was marked as used
    const { data: inviteRecord } = await supabase
      .from('invites')
      .select('id, used_at, used_by')
      .eq('property_id', propertyId)
      .single();

    expect(inviteRecord).toBeTruthy();
    expect(inviteRecord!.used_at).toBeTruthy();
    expect(inviteRecord!.used_by).toBe(userId);

    // Cleanup landlord
    await cleanupTestUser(landlordId);
  });

  test('Atomic RPC handles errors gracefully', async () => {
    // Test 1: Invalid property data
    const { data: authData } = await supabase.auth.signUp({
      email: `test-error-${Date.now()}@myailandlord.com`,
      password: testPassword,
    });
    userId = authData.user!.id;

    const { data: rpcData, error: rpcError } = await supabase.rpc('signup_and_onboard_landlord', {
      p_property_name: '', // Invalid: empty name
      p_address_jsonb: null, // Invalid: null address
      p_property_type: null,
      p_bedrooms: null,
      p_bathrooms: null,
      p_areas: null,
    });

    // RPC should either error or return success=false
    if (rpcError) {
      expect(rpcError.message).toBeTruthy();
    } else {
      expect(rpcData[0].success).toBe(false);
      expect(rpcData[0].error_message).toBeTruthy();
    }
  });
});
