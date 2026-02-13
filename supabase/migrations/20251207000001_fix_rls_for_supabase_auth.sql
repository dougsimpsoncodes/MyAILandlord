-- Migration: Fix RLS policies for Supabase Auth
-- After migrating from Clerk to Supabase Auth:
-- - clerk_user_id column was dropped from profiles
-- - profiles.id now equals auth.uid() directly
-- - All RLS policies must use auth.uid() instead of clerk_user_id

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ALL EXISTING POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

  -- Properties policies
  DROP POLICY IF EXISTS "Users can read properties" ON public.properties;
  DROP POLICY IF EXISTS "Landlords can insert properties" ON public.properties;
  DROP POLICY IF EXISTS "Landlords can update properties" ON public.properties;
  DROP POLICY IF EXISTS "Landlords can delete properties" ON public.properties;
  DROP POLICY IF EXISTS properties_select_own ON public.properties;
  DROP POLICY IF EXISTS properties_insert_own ON public.properties;
  DROP POLICY IF EXISTS properties_update_own ON public.properties;
  DROP POLICY IF EXISTS properties_delete_own ON public.properties;
  DROP POLICY IF EXISTS properties_select_on_ownership_or_link ON public.properties;
  DROP POLICY IF EXISTS properties_insert_by_landlord ON public.properties;
  DROP POLICY IF EXISTS properties_update_by_landlord ON public.properties;
  DROP POLICY IF EXISTS properties_delete_by_landlord ON public.properties;

  -- Tenant property links policies
  DROP POLICY IF EXISTS "Users can read property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can insert property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can update property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can delete property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_select_landlord_or_self ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_insert_landlord_or_tenant ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_update_landlord_only ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_delete_landlord_only ON public.tenant_property_links;

  -- Maintenance requests policies
  DROP POLICY IF EXISTS "Users can read maintenance requests" ON public.maintenance_requests;
  DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
  DROP POLICY IF EXISTS "Users can update maintenance requests" ON public.maintenance_requests;
  DROP POLICY IF EXISTS mr_select_tenant_or_landlord ON public.maintenance_requests;
  DROP POLICY IF EXISTS mr_insert_tenant_own_property ON public.maintenance_requests;
  DROP POLICY IF EXISTS mr_update_tenant_or_landlord ON public.maintenance_requests;
  DROP POLICY IF EXISTS maintenance_read_access ON public.maintenance_requests;
  DROP POLICY IF EXISTS maintenance_create_access ON public.maintenance_requests;
  DROP POLICY IF EXISTS maintenance_update_access ON public.maintenance_requests;
  DROP POLICY IF EXISTS maintenance_delete_access ON public.maintenance_requests;

  -- Messages policies
  DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
  DROP POLICY IF EXISTS messages_select_own ON public.messages;
  DROP POLICY IF EXISTS messages_insert_self ON public.messages;
  DROP POLICY IF EXISTS messages_update_sender_or_recipient ON public.messages;

  -- Announcements policies
  DROP POLICY IF EXISTS "Users can read announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can insert announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can update announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can delete announcements" ON public.announcements;
  DROP POLICY IF EXISTS announcements_select_landlord_or_published ON public.announcements;
  DROP POLICY IF EXISTS announcements_insert_landlord ON public.announcements;
  DROP POLICY IF EXISTS announcements_update_landlord ON public.announcements;
  DROP POLICY IF EXISTS announcements_delete_landlord ON public.announcements;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PROFILES: Users can only access their own profile
-- Since profiles.id = auth.uid() in the new schema, we use direct comparison
-- ============================================================================
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PROPERTIES: Landlords own properties, tenants access via active links
-- Key insight: landlord_id directly references profiles.id which equals auth.uid()
-- No need to join to profiles table - just compare landlord_id = auth.uid()
-- ============================================================================
CREATE POLICY properties_select ON public.properties
  FOR SELECT TO authenticated
  USING (
    -- Landlord can see their own properties
    landlord_id = auth.uid()
    OR
    -- Tenant can see properties they are linked to
    id IN (
      SELECT property_id
      FROM public.tenant_property_links
      WHERE tenant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY properties_insert ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY properties_update ON public.properties
  FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY properties_delete ON public.properties
  FOR DELETE TO authenticated
  USING (landlord_id = auth.uid());

-- ============================================================================
-- TENANT_PROPERTY_LINKS: Landlords manage, tenants view their own links
-- ============================================================================
CREATE POLICY tpl_select ON public.tenant_property_links
  FOR SELECT TO authenticated
  USING (
    -- Tenant can see their own links
    tenant_id = auth.uid()
    OR
    -- Landlord can see links for their properties
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY tpl_insert ON public.tenant_property_links
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Tenant can create link for themselves
    tenant_id = auth.uid()
    OR
    -- Landlord can create link for their properties
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY tpl_update ON public.tenant_property_links
  FOR UPDATE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY tpl_delete ON public.tenant_property_links
  FOR DELETE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

-- ============================================================================
-- MAINTENANCE_REQUESTS: Tenants create for linked properties, landlords manage
-- ============================================================================
CREATE POLICY mr_select ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (
    -- Tenant can see their own requests
    tenant_id = auth.uid()
    OR
    -- Landlord can see requests for their properties
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY mr_insert ON public.maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Tenant can only create requests for themselves
    tenant_id = auth.uid()
    AND
    -- And only for properties they are linked to
    property_id IN (
      SELECT property_id
      FROM public.tenant_property_links
      WHERE tenant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY mr_update ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (
    -- Tenant can update their own requests
    tenant_id = auth.uid()
    OR
    -- Landlord can update requests for their properties
    property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGES: Users can see messages they sent or received
-- ============================================================================
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- ============================================================================
-- ANNOUNCEMENTS: Landlords create, tenants see published ones for their properties
-- ============================================================================
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (
    -- Landlord can see their own announcements
    landlord_id = auth.uid()
    OR
    -- Tenants can see published announcements
    (
      is_published = true
      AND (
        -- Global announcements (no specific property)
        property_id IS NULL
        OR
        -- Property-specific announcements for linked properties
        property_id IN (
          SELECT property_id
          FROM public.tenant_property_links
          WHERE tenant_id = auth.uid() AND is_active = true
        )
      )
    )
  );

CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (landlord_id = auth.uid());
