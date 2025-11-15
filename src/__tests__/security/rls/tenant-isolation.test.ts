/**
 * Tenant Isolation Tests
 *
 * Validates that tenants can only access data for properties they're linked to
 * Prevents unauthorized access to other tenants' data
 */

import {
  createTestLandlord,
  createTestProperty,
  createTestTenant,
  linkTenantToProperty,
  createTestMaintenanceRequest,
  assertCannotAccess,
  assertCanAccess,
  assertCannotUpdate,
  assertCannotInsert,
  cleanupTestUser,
  TestUser,
  TestProperty,
  TestMaintenanceRequest,
} from './helpers';

describe('Tenant Isolation - Maintenance Requests', () => {
  let landlord: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;
  let requestA: TestMaintenanceRequest;
  let requestB: TestMaintenanceRequest;

  beforeAll(async () => {
    landlord = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    propertyA = await createTestProperty(landlord);
    propertyB = await createTestProperty(landlord);

    await linkTenantToProperty(landlord, tenantA, propertyA);
    await linkTenantToProperty(landlord, tenantB, propertyB);

    requestA = await createTestMaintenanceRequest(tenantA, propertyA);
    requestB = await createTestMaintenanceRequest(tenantB, propertyB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlord);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Tenant A cannot SELECT maintenance_requests for Tenant B', async () => {
    await assertCannotAccess(
      tenantA,
      'maintenance_requests',
      requestB.id,
      'RLS VIOLATION: Tenant A accessed Tenant B maintenance request'
    );
  });

  test('Tenant A can SELECT their own maintenance_requests', async () => {
    await assertCanAccess(
      tenantA,
      'maintenance_requests',
      requestA.id,
      'RLS ERROR: Tenant A could not access their own maintenance request'
    );
  });

  test('Tenant A cannot UPDATE maintenance_requests for Tenant B', async () => {
    await assertCannotUpdate(
      tenantA,
      'maintenance_requests',
      requestB.id,
      { status: 'closed' },
      'RLS VIOLATION: Tenant A updated Tenant B maintenance request'
    );
  });
});

describe('Tenant Isolation - Properties Table', () => {
  let landlord: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlord = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    propertyA = await createTestProperty(landlord);
    propertyB = await createTestProperty(landlord);

    await linkTenantToProperty(landlord, tenantA, propertyA);
    await linkTenantToProperty(landlord, tenantB, propertyB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlord);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Tenant A cannot SELECT properties table directly (must use tenant_property_links)', async () => {
    // Tenant should not be able to query properties table directly
    const { data, error } = await tenantA.supabaseClient
      .from('properties')
      .select('*')
      .eq('id', propertyA.id)
      .maybeSingle();

    if (data !== null) {
      throw new Error(
        'RLS VIOLATION: Tenant accessed properties table directly (should only access via tenant_property_links)'
      );
    }
  });

  test('Tenant A cannot access properties not linked to their profile', async () => {
    await assertCannotAccess(
      tenantA,
      'properties',
      propertyB.id,
      'RLS VIOLATION: Tenant A accessed property not linked to their profile'
    );
  });
});

describe('Tenant Isolation - Tenant Property Links', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let tenant: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    tenant = await createTestTenant();

    propertyA = await createTestProperty(landlordA);
    propertyB = await createTestProperty(landlordB);

    await linkTenantToProperty(landlordA, tenant, propertyA);
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
    await cleanupTestUser(tenant);
  });

  test('Tenant cannot INSERT tenant_property_links for properties without landlord permission', async () => {
    await assertCannotInsert(
      tenant,
      'tenant_property_links',
      {
        tenant_id: tenant.id,
        property_id: propertyB.id,
        is_active: true,
        unit: 'Unauthorized Unit',
      },
      'RLS VIOLATION: Tenant self-linked to property without landlord permission'
    );
  });
});
