/**
 * Cross-Role Security Tests
 *
 * Validates that role-based permissions are enforced correctly
 * Prevents privilege escalation and unauthorized actions
 */

import {
  createTestLandlord,
  createTestProperty,
  createTestTenant,
  linkTenantToProperty,
  assertCannotInsert,
  assertCannotDelete,
  assertCannotUpdate,
  cleanupTestUser,
  TestUser,
  TestProperty,
} from './helpers';

describe('Tenant Cannot Perform Landlord-Only Operations', () => {
  let landlord: TestUser;
  let tenant: TestUser;
  let property: TestProperty;

  beforeAll(async () => {
    landlord = await createTestLandlord();
    tenant = await createTestTenant();
    property = await createTestProperty(landlord);
    await linkTenantToProperty(landlord, tenant, property);
  });

  afterAll(async () => {
    await cleanupTestUser(landlord);
    await cleanupTestUser(tenant);
  });

  test('Tenant cannot INSERT into properties table', async () => {
    await assertCannotInsert(
      tenant,
      'properties',
      {
        landlord_id: tenant.id, // Trying to create property as tenant
        name: 'Unauthorized Property',
        address: '123 Hacker St',
        property_type: 'single_family',
        bedrooms: 3,
        bathrooms: 2,
      },
      'RLS VIOLATION: Tenant created property record (landlord-only operation)'
    );
  });

  test('Tenant cannot DELETE from properties table', async () => {
    await assertCannotDelete(
      tenant,
      'properties',
      property.id,
      'RLS VIOLATION: Tenant deleted property record (landlord-only operation)'
    );
  });

  test('Tenant cannot UPDATE critical property fields', async () => {
    await assertCannotUpdate(
      tenant,
      'properties',
      property.id,
      {
        landlord_id: tenant.id, // Trying to take ownership
        allow_tenant_signup: false,
      },
      'RLS VIOLATION: Tenant updated property ownership/settings'
    );
  });
});

describe('Landlord Cannot Impersonate Tenant', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    propertyA = await createTestProperty(landlordA);
    propertyB = await createTestProperty(landlordB);

    await linkTenantToProperty(landlordA, tenantA, propertyA);
    await linkTenantToProperty(landlordB, tenantB, propertyB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Landlord A cannot modify tenant_property_links for Landlord B property', async () => {
    // Landlord A tries to link their tenant to Landlord B property
    await assertCannotInsert(
      landlordA,
      'tenant_property_links',
      {
        tenant_id: tenantA.id,
        property_id: propertyB.id, // Property owned by Landlord B
        is_active: true,
        unit: 'Unauthorized Unit',
      },
      'RLS VIOLATION: Landlord A linked tenant to Landlord B property'
    );
  });

  test('Landlord cannot UPDATE tenant_property_links to steal tenant from another landlord', async () => {
    // Get the link ID for tenant B -> property B
    const { data: links } = await landlordB.supabaseClient
      .from('tenant_property_links')
      .select('id')
      .eq('tenant_id', tenantB.id)
      .eq('property_id', propertyB.id)
      .single();

    if (!links) {
      throw new Error('Test setup failed: Could not find tenant link');
    }

    // Landlord A tries to change the property_id to steal tenant B
    await assertCannotUpdate(
      landlordA,
      'tenant_property_links',
      links.id,
      { property_id: propertyA.id },
      'RLS VIOLATION: Landlord A stole tenant from Landlord B by modifying link'
    );
  });
});

describe('Profile Role Enforcement', () => {
  let landlord: TestUser;
  let tenant: TestUser;

  beforeAll(async () => {
    landlord = await createTestLandlord();
    tenant = await createTestTenant();
  });

  afterAll(async () => {
    await cleanupTestUser(landlord);
    await cleanupTestUser(tenant);
  });

  test('Tenant cannot UPDATE their role to landlord', async () => {
    await assertCannotUpdate(
      tenant,
      'profiles',
      tenant.id,
      { role: 'landlord' },
      'RLS VIOLATION: Tenant escalated their role to landlord'
    );
  });

  test('Landlord cannot UPDATE their role to tenant (potential privilege de-escalation attack)', async () => {
    await assertCannotUpdate(
      landlord,
      'profiles',
      landlord.id,
      { role: 'tenant' },
      'RLS VIOLATION: Landlord changed their role (should be immutable)'
    );
  });

  test('User cannot UPDATE another user clerk_user_id (identity theft)', async () => {
    await assertCannotUpdate(
      tenant,
      'profiles',
      landlord.id,
      { clerk_user_id: tenant.clerkId },
      'RLS VIOLATION: User modified another user clerk_user_id'
    );
  });
});
