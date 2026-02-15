-- One-time data wipe for fresh non-production testing.
-- Preserves schema, migrations history, functions, triggers, and policies.

DO $$
DECLARE
  v_table TEXT;
  v_truncate_tables TEXT[] := ARRAY[
    'public.invite_code_attempts',
    'public.messages',
    'public.maintenance_requests',
    'public.property_assets',
    'public.property_areas',
    'public.tenant_property_links',
    'public.invite_tokens',
    'public.invites',
    'public.properties',
    'public.device_tokens',
    'public.rate_limits',
    'public.announcements',
    'public.profiles',
    'storage.objects',
    'storage.s3_multipart_uploads'
  ];
  v_delete_tables TEXT[] := ARRAY[
    'auth.one_time_tokens',
    'auth.mfa_amr_claims',
    'auth.mfa_challenges',
    'auth.mfa_factors',
    'auth.sessions',
    'auth.refresh_tokens',
    'auth.identities',
    'auth.audit_log_entries',
    'auth.users'
  ];
BEGIN
  -- 1) Clear app + storage rows first.
  FOREACH v_table IN ARRAY v_truncate_tables
  LOOP
    IF to_regclass(v_table) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', v_table);
    END IF;
  END LOOP;

  -- 2) Clear auth rows so every login/account starts fresh.
  FOREACH v_table IN ARRAY v_delete_tables
  LOOP
    IF to_regclass(v_table) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %s', v_table);
    END IF;
  END LOOP;
END
$$;
