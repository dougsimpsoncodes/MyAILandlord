-- Enhanced Minimal Safe RLS Fix - Surgical approach based on enhanced triage
-- Run ONLY after identifying specific issues via quick-triage.sql
-- Apply only the sections needed based on triage results

-- STEP 0: Safety Check - Ensure we have JWT access before proceeding
DO $$
BEGIN
  IF auth.jwt() ->> 'sub' IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: No JWT access - fix Supabase JWKS config first';
  END IF;
  RAISE NOTICE 'JWT OK: %', auth.jwt() ->> 'sub';
END $$;

-- STEP 1: Fix Subquery Visibility FIRST (required for all policy subqueries to work)
-- Only apply if quick-triage.sql showed "CRITICAL: Tenant cannot see own profile"

-- Ensure tenant can see their own profile (required for ALL policy subqueries)
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;  
DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON profiles  
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ensure tenant can see their own tenant_property_links (required for maintenance request subqueries)
DROP POLICY IF EXISTS tpl_select_landlord_or_self ON tenant_property_links;
DROP POLICY IF EXISTS "Users can read property links" ON tenant_property_links;
DROP POLICY IF EXISTS tpl_insert_landlord_or_tenant ON tenant_property_links;
DROP POLICY IF EXISTS tpl_update_landlord_only ON tenant_property_links;
DROP POLICY IF EXISTS tpl_delete_landlord_only ON tenant_property_links;

CREATE POLICY tpl_select_landlord_or_self ON tenant_property_links
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    ) OR tenant_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    )
  );

-- STEP 2: Fix Maintenance Request Policies (remove TO authenticated, ensure 1-per-purpose)
-- Only apply if quick-triage.sql showed role mapping or policy conflict issues

-- Drop ALL existing maintenance_requests policies to avoid conflicts
DROP POLICY IF EXISTS mr_insert_tenant_own_property ON maintenance_requests;
DROP POLICY IF EXISTS mr_select_tenant_or_landlord ON maintenance_requests;
DROP POLICY IF EXISTS mr_update_tenant_or_landlord ON maintenance_requests;
DROP POLICY IF EXISTS "Users can read maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_read_access ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_create_access ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_update_access ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_delete_access ON maintenance_requests;

-- Recreate with NO TO clauses (role-agnostic), 1-per-purpose approach
CREATE POLICY mr_select_tenant_or_landlord ON maintenance_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) OR property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    )
  );

CREATE POLICY mr_insert_tenant_own_property ON maintenance_requests
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) AND property_id IN (
      SELECT tpl.property_id FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
    )
  );

CREATE POLICY mr_update_tenant_or_landlord ON maintenance_requests
  FOR UPDATE USING (
    tenant_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) OR property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    )
  );

-- Step 2: Ensure profiles table allows tenant to see their own row (required for subqueries)
-- Only fix if SELECT visibility test failed
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Step 3: Ensure tenant_property_links allows tenant to see their own links (required for subqueries)
-- Only fix if SELECT visibility test failed
DROP POLICY IF EXISTS tpl_select_landlord_or_self ON tenant_property_links;
CREATE POLICY tpl_select_landlord_or_self ON tenant_property_links
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    ) OR tenant_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    )
  );

-- Step 4: Ensure properties SELECT works for the tenant (via tenant_property_links)
-- Only apply if tenant can't see the property they should have access to
DROP POLICY IF EXISTS properties_select_on_ownership_or_link ON properties;
CREATE POLICY properties_select_on_ownership_or_link ON properties
  FOR SELECT USING (
    landlord_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
    ) OR id IN (
      SELECT tpl.property_id FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND p.role = 'tenant' AND tpl.is_active = true
    )
  );

-- STEP 3: Ensure Properties SELECT works (only if triage showed property visibility issues)
-- Only apply if quick-triage.sql showed "WARNING: Property exists but tenant cannot see it"

DROP POLICY IF EXISTS properties_select_on_ownership_or_link ON properties;
DROP POLICY IF EXISTS "Users can read properties" ON properties;
DROP POLICY IF EXISTS properties_select_own ON properties;

CREATE POLICY properties_select_on_ownership_or_link ON properties
  FOR SELECT USING (
    landlord_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
    ) OR id IN (
      SELECT tpl.property_id FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND p.role = 'tenant' AND tpl.is_active = true
    )
  );

-- STEP 4: Safety Check for Column Defaults/Constraints
-- Check if maintenance_requests has any problematic defaults that could cause WITH CHECK failures
DO $$
DECLARE
  has_tenant_clerk_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_requests' AND column_name = 'tenant_clerk_id'
  ) INTO has_tenant_clerk_id;
  
  IF has_tenant_clerk_id THEN
    RAISE WARNING 'Table has tenant_clerk_id column - ensure your INSERT includes this or has correct default';
  END IF;
END $$;

-- STEP 5: Remove any open policies on properties table (security)
-- Ensure properties table has NO USING (true) policies
DROP POLICY IF EXISTS "Allow anonymous property invite preview" ON properties;

-- STEP 6: Final Verification - Test the exact predicate after applying fixes
-- Run this to confirm the fix worked with your specific IDs:

SELECT 'POST-FIX VERIFICATION' as test_phase;

WITH current_user_profile AS (
  SELECT id, role FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
),
tenant_check AS (
  SELECT CASE WHEN '71a2098e-afb6-4e24-82e7-e1ab4be57ee6' IN (
    SELECT id::text FROM current_user_profile WHERE role = 'tenant'
  ) THEN 'PASS' ELSE 'FAIL' END as tenant_id_check
),
property_access AS (
  SELECT CASE WHEN 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e' IN (
    SELECT tpl.property_id::text FROM tenant_property_links tpl
    JOIN profiles p ON p.id = tpl.tenant_id
    WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
  ) THEN 'PASS' ELSE 'FAIL' END as property_access_check
)
SELECT 
  'Final Predicate Test' as check_name,
  jsonb_build_object(
    'tenant_id_check', t.tenant_id_check,
    'property_access_check', p.property_access_check
  ) as result,
  CASE 
    WHEN t.tenant_id_check = 'PASS' AND p.property_access_check = 'PASS' 
    THEN 'SUCCESS: Both checks pass - maintenance request creation should work'
    ELSE 'FAIL: Still failing - check data or policy logic'
  END as status
FROM tenant_check t, property_access p;

-- STEP 7: Policy Summary Check (ensure no duplicates or restrictive policies remain)
SELECT 
  'Policy Summary' as check_name,
  jsonb_build_object(
    'maintenance_policies', (
      SELECT jsonb_agg(jsonb_build_object('cmd', cmd, 'policy', policyname))
      FROM pg_policies 
      WHERE tablename = 'maintenance_requests'
    ),
    'restrictive_policies', (
      SELECT COALESCE(jsonb_agg(policyname), '[]'::jsonb)
      FROM pg_policies 
      WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
        AND permissive = 'RESTRICTIVE'
    )
  ) as result,
  'INFO: Review policy state' as status;
