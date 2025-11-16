// Simple RLS isolation smoke test
/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

async function testRLSIsolation() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL/ANON_KEY')
  }
  const sb = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })

  const tenant1Token = process.env.TEST_TENANT1_JWT
  const tenant2Token = process.env.TEST_TENANT2_JWT
  if (!tenant1Token || !tenant2Token) {
    throw new Error('Missing TEST_TENANT1_JWT/TEST_TENANT2_JWT')
  }

  console.log('🔒 Testing RLS isolation for multiple tables...')

  // Test Properties isolation
  console.log('  Testing properties table...')
  await sb.auth.setSession({ access_token: tenant1Token, refresh_token: tenant1Token })
  const { data: t1Props, error: e1 } = await sb.from('properties').select('id')
  if (e1) throw new Error(`Tenant1 properties query failed: ${e1.message}`)

  await sb.auth.setSession({ access_token: tenant2Token, refresh_token: tenant2Token })
  const { data: t2Props, error: e2 } = await sb.from('properties').select('id')
  if (e2) throw new Error(`Tenant2 properties query failed: ${e2.message}`)

  const propsOverlap = (t1Props || []).filter(p1 => (t2Props || []).some(p2 => p2.id === p1.id))
  if (propsOverlap.length) {
    throw new Error(`RLS VIOLATION: cross-tenant properties visible: ${propsOverlap.map(p => p.id).join(', ')}`)
  }
  console.log(`    ✓ Properties isolated (T1: ${t1Props?.length || 0}, T2: ${t2Props?.length || 0})`)

  // Test Maintenance Requests isolation
  console.log('  Testing maintenance_requests table...')
  await sb.auth.setSession({ access_token: tenant1Token, refresh_token: tenant1Token })
  const { data: t1Maint, error: e3 } = await sb.from('maintenance_requests').select('id')
  if (e3 && e3.code !== 'PGRST116') throw new Error(`Tenant1 maintenance query failed: ${e3.message}`)

  await sb.auth.setSession({ access_token: tenant2Token, refresh_token: tenant2Token })
  const { data: t2Maint, error: e4 } = await sb.from('maintenance_requests').select('id')
  if (e4 && e4.code !== 'PGRST116') throw new Error(`Tenant2 maintenance query failed: ${e4.message}`)

  const maintOverlap = (t1Maint || []).filter(m1 => (t2Maint || []).some(m2 => m2.id === m1.id))
  if (maintOverlap.length) {
    throw new Error(`RLS VIOLATION: cross-tenant maintenance requests visible: ${maintOverlap.map(m => m.id).join(', ')}`)
  }
  console.log(`    ✓ Maintenance requests isolated (T1: ${t1Maint?.length || 0}, T2: ${t2Maint?.length || 0})`)

  // Test Messages isolation
  console.log('  Testing messages table...')
  await sb.auth.setSession({ access_token: tenant1Token, refresh_token: tenant1Token })
  const { data: t1Msgs, error: e5 } = await sb.from('messages').select('id')
  if (e5 && e5.code !== 'PGRST116') throw new Error(`Tenant1 messages query failed: ${e5.message}`)

  await sb.auth.setSession({ access_token: tenant2Token, refresh_token: tenant2Token })
  const { data: t2Msgs, error: e6 } = await sb.from('messages').select('id')
  if (e6 && e6.code !== 'PGRST116') throw new Error(`Tenant2 messages query failed: ${e6.message}`)

  const msgsOverlap = (t1Msgs || []).filter(m1 => (t2Msgs || []).some(m2 => m2.id === m1.id))
  if (msgsOverlap.length) {
    throw new Error(`RLS VIOLATION: cross-tenant messages visible: ${msgsOverlap.map(m => m.id).join(', ')}`)
  }
  console.log(`    ✓ Messages isolated (T1: ${t1Msgs?.length || 0}, T2: ${t2Msgs?.length || 0})`)

  // Test Tenant Property Links isolation
  console.log('  Testing tenant_property_links table...')
  await sb.auth.setSession({ access_token: tenant1Token, refresh_token: tenant1Token })
  const { data: t1Links, error: e7 } = await sb.from('tenant_property_links').select('id')
  if (e7 && e7.code !== 'PGRST116') throw new Error(`Tenant1 links query failed: ${e7.message}`)

  await sb.auth.setSession({ access_token: tenant2Token, refresh_token: tenant2Token })
  const { data: t2Links, error: e8 } = await sb.from('tenant_property_links').select('id')
  if (e8 && e8.code !== 'PGRST116') throw new Error(`Tenant2 links query failed: ${e8.message}`)

  const linksOverlap = (t1Links || []).filter(l1 => (t2Links || []).some(l2 => l2.id === l1.id))
  if (linksOverlap.length) {
    throw new Error(`RLS VIOLATION: cross-tenant property links visible: ${linksOverlap.map(l => l.id).join(', ')}`)
  }
  console.log(`    ✓ Property links isolated (T1: ${t1Links?.length || 0}, T2: ${t2Links?.length || 0})`)

  console.log('✅ All RLS isolation tests passed')
}

testRLSIsolation().catch(err => {
  console.error('❌ RLS test failed:', err)
  process.exit(1)
})

