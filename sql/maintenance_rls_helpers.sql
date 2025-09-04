-- Helper functions for RLS predicates that rely on auth.jwt() and bypass table RLS via SECURITY DEFINER.
-- These functions enable robust, readable policy definitions.

-- Returns Clerk sub from JWT, or NULL
CREATE OR REPLACE FUNCTION public.current_clerk_sub()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(auth.jwt() ->> 'sub', NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Returns true if the current user (by Clerk sub) is the same tenant profile id
CREATE OR REPLACE FUNCTION public.is_tenant_self(tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  sub text;
  prof_id uuid;
  prof_role text;
BEGIN
  sub := public.current_clerk_sub();
  IF sub IS NULL THEN
    RETURN false;
  END IF;
  SELECT id, role INTO prof_id, prof_role
  FROM public.profiles
  WHERE clerk_user_id = sub
  LIMIT 1;
  RETURN (prof_id = tenant_id AND prof_role = 'tenant');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Returns true if current user (by Clerk sub) has an active tenant_property_link for the property
CREATE OR REPLACE FUNCTION public.tenant_has_active_link(property uuid)
RETURNS boolean AS $$
DECLARE
  sub text;
  ok boolean;
BEGIN
  sub := public.current_clerk_sub();
  IF sub IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_property_links tpl
    JOIN public.profiles p ON p.id = tpl.tenant_id
    WHERE p.clerk_user_id = sub
      AND tpl.property_id = property
      AND tpl.is_active = true
  ) INTO ok;
  RETURN ok;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Returns true if current user (by Clerk sub) is the landlord for the property
CREATE OR REPLACE FUNCTION public.is_landlord_for_property(property uuid)
RETURNS boolean AS $$
DECLARE
  sub text;
  ok boolean;
BEGIN
  sub := public.current_clerk_sub();
  IF sub IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.properties pr
    JOIN public.profiles prof ON prof.id = pr.landlord_id
    WHERE prof.clerk_user_id = sub
      AND pr.id = property
  ) INTO ok;
  RETURN ok;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

