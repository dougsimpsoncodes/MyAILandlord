-- Copy-paste verification queries for maintenance RLS debugging

-- 1) Inspect policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='maintenance_requests'
ORDER BY policyname, cmd;

-- 2) Check dependent tables have SELECT policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles','properties','tenant_property_links')
ORDER BY tablename, policyname;

-- 3) Validate profile mapping (replace value)
SELECT id, clerk_user_id, role FROM public.profiles WHERE clerk_user_id = 'user_30ODEM6qBd8hMikaCUGP59IClEG';

-- 4) Validate active tenant link (replace ids)
SELECT tpl.*
FROM public.tenant_property_links tpl
JOIN public.profiles p ON p.id = tpl.tenant_id
WHERE p.clerk_user_id = 'user_...'
  AND tpl.property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND tpl.is_active = true;

-- 5) Simulate JWT for session (psql only). Edit sub.
SELECT set_config('request.jwt.claims', json_build_object('sub','user_...','role','authenticated')::text, true);
SELECT auth.jwt() ->> 'sub' as sub;

-- 6) Evaluate helper functions (if installed)
SELECT 
  public.is_tenant_self('fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid) as is_self,
  public.tenant_has_active_link('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) as has_link;

