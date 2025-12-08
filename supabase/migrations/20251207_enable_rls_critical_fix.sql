-- CRITICAL SECURITY FIX: Enable RLS on tables that have policies but RLS is disabled
-- This migration addresses the Supabase Database Linter finding:
--   "policy_exists_rls_disabled" and "rls_disabled_in_public"

-- Enable RLS on properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tenant_property_links table
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;

-- Also ensure all other critical tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Verify by querying pg_tables (this will show in migration logs)
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('properties', 'tenant_property_links', 'profiles', 'maintenance_requests', 'messages', 'announcements')
  LOOP
    RAISE NOTICE 'Table: %, RLS Enabled: %', tbl.tablename, tbl.rowsecurity;
  END LOOP;
END $$;
