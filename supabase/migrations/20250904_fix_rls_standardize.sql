-- Standardize RLS to auth.jwt()->>'sub' (Clerk) - Fix maintenance request issue
-- This is the comprehensive fix for RLS policy violations

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  -- profiles
  EXECUTE 'DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS profiles_select_own ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS profiles_insert_own ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS profiles_update_own ON public.profiles';

  -- properties
  EXECUTE 'DROP POLICY IF EXISTS "Users can read properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can insert properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can update properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can delete properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_select_own ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_insert_own ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_update_own ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_delete_own ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_select_on_ownership_or_link ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_insert_by_landlord ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_update_by_landlord ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_delete_by_landlord ON public.properties';

  -- tenant_property_links
  EXECUTE 'DROP POLICY IF EXISTS "Users can read property links" ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can insert property links" ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can update property links" ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can delete property links" ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS tpl_select_landlord_or_self ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS tpl_insert_landlord_or_tenant ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS tpl_update_landlord_only ON public.tenant_property_links';
  EXECUTE 'DROP POLICY IF EXISTS tpl_delete_landlord_only ON public.tenant_property_links';

  -- maintenance_requests
  EXECUTE 'DROP POLICY IF EXISTS "Users can read maintenance requests" ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update maintenance requests" ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS mr_select_tenant_or_landlord ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS mr_insert_tenant_own_property ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS mr_update_tenant_or_landlord ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS maintenance_read_access ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS maintenance_create_access ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS maintenance_update_access ON public.maintenance_requests';
  EXECUTE 'DROP POLICY IF EXISTS maintenance_delete_access ON public.maintenance_requests';

  -- messages
  EXECUTE 'DROP POLICY IF EXISTS "Users can read own messages" ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS "Users can send messages" ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own messages" ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS messages_select_own ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS messages_insert_self ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS messages_update_sender_or_recipient ON public.messages';

  -- announcements
  EXECUTE 'DROP POLICY IF EXISTS "Users can read announcements" ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can insert announcements" ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can update announcements" ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS "Landlords can delete announcements" ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS announcements_select_landlord_or_published ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS announcements_insert_landlord ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS announcements_update_landlord ON public.announcements';
  EXECUTE 'DROP POLICY IF EXISTS announcements_delete_landlord ON public.announcements';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $;

-- Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Properties
CREATE POLICY properties_select_on_ownership_or_link ON public.properties
  FOR SELECT USING (
    landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    OR id IN (
      SELECT tpl.property_id FROM public.tenant_property_links tpl
      JOIN public.profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND p.role = 'tenant' AND tpl.is_active = true
    )
  );
CREATE POLICY properties_insert_by_landlord ON public.properties
  FOR INSERT WITH CHECK (
    landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
  );
CREATE POLICY properties_update_by_landlord ON public.properties
  FOR UPDATE USING (
    landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
  ) WITH CHECK (
    landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
  );
CREATE POLICY properties_delete_by_landlord ON public.properties
  FOR DELETE USING (
    landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
  );

-- Tenant property links
CREATE POLICY tpl_select_landlord_or_self ON public.tenant_property_links
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    ) OR tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    )
  );
CREATE POLICY tpl_insert_landlord_or_tenant ON public.tenant_property_links
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties
      WHERE landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    ) OR tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    )
  );
CREATE POLICY tpl_update_landlord_only ON public.tenant_property_links
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    )
  ) WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties
      WHERE landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    )
  );
CREATE POLICY tpl_delete_landlord_only ON public.tenant_property_links
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE landlord_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord')
    )
  );

-- Maintenance requests
CREATE POLICY mr_select_tenant_or_landlord ON public.maintenance_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) OR property_id IN (
      SELECT id FROM public.properties WHERE landlord_id IN (
        SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    )
  );
CREATE POLICY mr_insert_tenant_own_property ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) AND property_id IN (
      SELECT tpl.property_id FROM public.tenant_property_links tpl
      JOIN public.profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
    )
  );
CREATE POLICY mr_update_tenant_or_landlord ON public.maintenance_requests
  FOR UPDATE USING (
    tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) OR property_id IN (
      SELECT id FROM public.properties WHERE landlord_id IN (
        SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'landlord'
      )
    )
  );

-- Public invite view (remove any table-level open access)
DROP VIEW IF EXISTS public.property_invite_info;
CREATE OR REPLACE VIEW public.property_invite_info AS
SELECT id, name, address, property_type, created_at FROM public.properties;
ALTER TABLE public.property_invite_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous property invite preview" ON public.property_invite_info;
CREATE POLICY "Allow anonymous property invite preview" ON public.property_invite_info
  FOR SELECT TO anon USING (true);