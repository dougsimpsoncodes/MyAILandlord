-- Migration: Complete Supabase Auth Migration
-- This migration consolidates all fixes made during the Clerk -> Supabase Auth migration
-- Date: 2025-12-07
--
-- Changes:
-- 1. RLS policies updated to use auth.uid() instead of clerk_user_id
-- 2. Property code RPCs updated to accept tenant_id UUID instead of clerk_id TEXT
-- 3. Property code auto-generation trigger added
-- 4. Clerk-referencing functions cleaned up

-- ============================================================================
-- PART 1: Enable RLS on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Drop all existing RLS policies
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
  DROP POLICY IF EXISTS properties_select ON public.properties;
  DROP POLICY IF EXISTS properties_insert ON public.properties;
  DROP POLICY IF EXISTS properties_update ON public.properties;
  DROP POLICY IF EXISTS properties_delete ON public.properties;

  -- Tenant property links policies
  DROP POLICY IF EXISTS "Users can read property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can insert property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can update property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS "Landlords can delete property links" ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_select_landlord_or_self ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_insert_landlord_or_tenant ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_update_landlord_only ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_delete_landlord_only ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_select ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_insert ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_update ON public.tenant_property_links;
  DROP POLICY IF EXISTS tpl_delete ON public.tenant_property_links;

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
  DROP POLICY IF EXISTS mr_select ON public.maintenance_requests;
  DROP POLICY IF EXISTS mr_insert ON public.maintenance_requests;
  DROP POLICY IF EXISTS mr_update ON public.maintenance_requests;

  -- Messages policies
  DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
  DROP POLICY IF EXISTS messages_select_own ON public.messages;
  DROP POLICY IF EXISTS messages_insert_self ON public.messages;
  DROP POLICY IF EXISTS messages_update_sender_or_recipient ON public.messages;
  DROP POLICY IF EXISTS messages_select ON public.messages;
  DROP POLICY IF EXISTS messages_insert ON public.messages;
  DROP POLICY IF EXISTS messages_update ON public.messages;

  -- Announcements policies
  DROP POLICY IF EXISTS "Users can read announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can insert announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can update announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Landlords can delete announcements" ON public.announcements;
  DROP POLICY IF EXISTS announcements_select_landlord_or_published ON public.announcements;
  DROP POLICY IF EXISTS announcements_insert_landlord ON public.announcements;
  DROP POLICY IF EXISTS announcements_update_landlord ON public.announcements;
  DROP POLICY IF EXISTS announcements_delete_landlord ON public.announcements;
  DROP POLICY IF EXISTS announcements_select ON public.announcements;
  DROP POLICY IF EXISTS announcements_insert ON public.announcements;
  DROP POLICY IF EXISTS announcements_update ON public.announcements;
  DROP POLICY IF EXISTS announcements_delete ON public.announcements;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PART 3: Create new RLS policies using auth.uid()
-- Key insight: profiles.id = auth.uid() in Supabase Auth
-- ============================================================================

-- PROFILES: Users can only access their own profile
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

-- PROPERTIES: Landlords own properties, tenants access via active links
CREATE POLICY properties_select ON public.properties
  FOR SELECT TO authenticated
  USING (
    landlord_id = auth.uid()
    OR id IN (
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

-- TENANT_PROPERTY_LINKS: Landlords manage, tenants view their own links
CREATE POLICY tpl_select ON public.tenant_property_links
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid()
    OR property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY tpl_insert ON public.tenant_property_links
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    OR property_id IN (
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

-- MAINTENANCE_REQUESTS: Tenants create for linked properties, landlords manage
CREATE POLICY mr_select ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid()
    OR property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY mr_insert ON public.maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    AND property_id IN (
      SELECT property_id
      FROM public.tenant_property_links
      WHERE tenant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY mr_update ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid()
    OR property_id IN (
      SELECT id FROM public.properties WHERE landlord_id = auth.uid()
    )
  );

-- MESSAGES: Users can see messages they sent or received
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- ANNOUNCEMENTS: Landlords create, tenants see published ones for their properties
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (
    landlord_id = auth.uid()
    OR (
      is_published = true
      AND (
        property_id IS NULL
        OR property_id IN (
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

-- ============================================================================
-- PART 4: Property code generation function and trigger
-- ============================================================================

-- Generate unique 6-character property codes (3 letters + 3 numbers)
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        code := upper(
            chr(65 + floor(random() * 26)::int) ||
            chr(65 + floor(random() * 26)::int) ||
            chr(65 + floor(random() * 26)::int) ||
            floor(random() * 10)::text ||
            floor(random() * 10)::text ||
            floor(random() * 10)::text
        );
        SELECT EXISTS(SELECT 1 FROM properties WHERE property_code = code) INTO exists_already;
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate property code on insert (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.auto_generate_property_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.property_code IS NULL THEN
        NEW.property_code := public.generate_property_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_property_code ON public.properties;
CREATE TRIGGER trigger_auto_generate_property_code
    BEFORE INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_property_code();

-- ============================================================================
-- PART 5: Update property code validation RPCs for Supabase Auth
-- These functions now accept tenant_id UUID instead of clerk_id TEXT
-- ============================================================================

-- Drop old functions with TEXT signature
DROP FUNCTION IF EXISTS validate_property_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS link_tenant_to_property(TEXT, TEXT, TEXT);

-- Validate property code and check tenant eligibility
CREATE OR REPLACE FUNCTION validate_property_code(
    input_code TEXT,
    tenant_id UUID
)
RETURNS TABLE(
    property_id UUID,
    property_name TEXT,
    property_address TEXT,
    is_multi_unit BOOLEAN,
    wifi_network TEXT,
    wifi_password TEXT,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    prop_record RECORD;
    input_tenant_id UUID := tenant_id;
    existing_link_id UUID;
BEGIN
    -- Validate tenant_id exists in profiles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = input_tenant_id) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant profile not found'::TEXT;
        RETURN;
    END IF;

    -- Find property by code
    SELECT p.id, p.name, p.address, p.allow_tenant_signup, p.code_expires_at, p.wifi_network AS wifi_net, p.wifi_password AS wifi_pass
    INTO prop_record
    FROM properties p
    WHERE p.property_code = upper(input_code);

    IF prop_record.id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Invalid property code'::TEXT;
        RETURN;
    END IF;

    -- Check if code is expired
    IF prop_record.code_expires_at IS NOT NULL AND prop_record.code_expires_at < NOW() THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Property code has expired'::TEXT;
        RETURN;
    END IF;

    -- Check if tenant signup is allowed
    IF NOT prop_record.allow_tenant_signup THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant signup not allowed for this property'::TEXT;
        RETURN;
    END IF;

    -- Check if tenant is already linked (explicit table reference to avoid ambiguity)
    SELECT tpl.id INTO existing_link_id
    FROM tenant_property_links tpl
    WHERE tpl.tenant_id = input_tenant_id AND tpl.property_id = prop_record.id AND tpl.is_active = true;

    IF existing_link_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'You are already linked to this property'::TEXT;
        RETURN;
    END IF;

    -- Return property info
    RETURN QUERY SELECT
        prop_record.id,
        prop_record.name,
        prop_record.address,
        (SELECT COUNT(*) > 1 FROM tenant_property_links tpl2 WHERE tpl2.property_id = prop_record.id)::BOOLEAN,
        prop_record.wifi_net,
        prop_record.wifi_pass,
        TRUE,
        'Property code validated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Link tenant to property using property code
CREATE OR REPLACE FUNCTION link_tenant_to_property(
    input_code TEXT,
    tenant_id UUID,
    unit_number TEXT DEFAULT NULL
)
RETURNS TABLE(
    link_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    prop_record RECORD;
    input_tenant_id UUID := tenant_id;
    new_link_id UUID;
BEGIN
    -- Validate the property code first
    SELECT vpc.property_id INTO prop_record
    FROM validate_property_code(input_code, input_tenant_id) vpc
    WHERE vpc.success = true;

    IF prop_record.property_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Property code validation failed'::TEXT;
        RETURN;
    END IF;

    -- Create the tenant-property link
    INSERT INTO tenant_property_links (
        tenant_id,
        property_id,
        unit_number,
        is_active,
        invitation_status,
        accepted_at
    ) VALUES (
        input_tenant_id,
        prop_record.property_id,
        unit_number,
        true,
        'active',
        NOW()
    ) RETURNING id INTO new_link_id;

    RETURN QUERY SELECT new_link_id, TRUE, 'Successfully linked to property'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_property_code() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_property_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION link_tenant_to_property(TEXT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- PART 6: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code) WHERE property_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_links_tenant_property ON tenant_property_links(tenant_id, property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_links_active ON tenant_property_links(is_active) WHERE is_active = true;

-- ============================================================================
-- PART 7: Backfill property codes for existing properties
-- ============================================================================
UPDATE properties
SET
    property_code = generate_property_code(),
    code_expires_at = COALESCE(code_expires_at, NOW() + INTERVAL '90 days'),
    allow_tenant_signup = COALESCE(allow_tenant_signup, true)
WHERE property_code IS NULL;
