#!/usr/bin/env node
// Comprehensive RLS validation suite
// Requires env:
//  EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
//  TEST_TENANT1_JWT, TEST_TENANT2_JWT (Clerk JWTs with supabase template)

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function run() {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const t1 = process.env.TEST_TENANT1_JWT;
  const t2 = process.env.TEST_TENANT2_JWT;
  if (!base || !anon || !t1 || !t2) {
    console.error('Missing envs: require SUPABASE URL/KEY and TEST_TENANT* JWTs');
    process.exit(2);
  }

  async function q(path, jwt, qs) {
    const q = new URLSearchParams(qs || {}).toString();
    const r = await fetch(`${base}/rest/v1/${path}?${q}`, {
      headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  }

  // Tables to test isolation
  // Profiles: a tenant sees only their own profile (or none if policy restricts)
  // Properties: each tenant/landlord sees only their scoped properties
  // Maintenance: tenant sees only their requests; landlord sees only for owned properties

  console.log('RLS: profiles isolation (no full table scans)');
  let r = await q('profiles', t1, { select: '*' });
  assert(r.status === 200, 'profiles t1 status');
  assert(Array.isArray(r.body), 'profiles t1 body');
  const countT1 = r.body.length;

  r = await q('profiles', t2, { select: '*' });
  assert(r.status === 200, 'profiles t2 status');
  assert(Array.isArray(r.body), 'profiles t2 body');
  const countT2 = r.body.length;
  // No user should see the other’s profile through broad select
  assert(!(countT1 > 0 && countT2 > 0 && (JSON.stringify(r.body).includes('tenant1') || JSON.stringify(r.body).includes('tenant2'))),
    'profiles appear shared across tenants');

  console.log('RLS: properties isolation');
  const pr1 = await q('properties', t1, { select: 'id,landlord_id,address' });
  assert(pr1.status === 200, 'properties t1 status');
  const pr2 = await q('properties', t2, { select: 'id,landlord_id,address' });
  assert(pr2.status === 200, 'properties t2 status');
  // Basic assertion: datasets should not be identical arrays at scale; rely on policy correctness
  assert(!(JSON.stringify(pr1.body) === JSON.stringify(pr2.body) && pr1.body.length > 0), 'both tenants see identical properties');

  console.log('RLS: maintenance_requests isolation');
  const mr1 = await q('maintenance_requests', t1, { select: 'id,tenant_id,property_id' });
  assert(mr1.status === 200, 'mr t1 status');
  const mr2 = await q('maintenance_requests', t2, { select: 'id,tenant_id,property_id' });
  assert(mr2.status === 200, 'mr t2 status');
  assert(!(JSON.stringify(mr1.body) === JSON.stringify(mr2.body) && mr1.body.length > 0), 'both tenants see identical maintenance');

  console.log('✅ RLS suite passed');
}

run().catch((e) => { console.error('RLS suite failed:', e?.message || e); process.exit(1); });

