-- Add Virus Scanning Fields to Storage Objects
-- Date: 2025-01-11
-- Purpose: Track virus scan status for uploaded files when storage ownership permits
-- Notes:
--   - In linked Supabase projects, app roles often cannot ALTER storage.objects.
--   - This migration now skips storage DDL gracefully when privileges are insufficient.

DO $$
DECLARE
  storage_mutation_applied BOOLEAN := TRUE;
BEGIN
  BEGIN
    ALTER TABLE storage.objects
      ADD COLUMN IF NOT EXISTS virus_scan_status TEXT DEFAULT 'pending' CHECK (
        virus_scan_status IN ('pending', 'scanning', 'safe', 'infected', 'error')
      ),
      ADD COLUMN IF NOT EXISTS virus_scan_result JSONB,
      ADD COLUMN IF NOT EXISTS virus_scanned_at TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN storage.objects.virus_scan_status IS
      'Status of virus scan: pending/scanning/safe/infected/error';

    COMMENT ON COLUMN storage.objects.virus_scan_result IS
      'JSON result from virus scanner API (Cloudmersive, VirusTotal, etc.)';

    COMMENT ON COLUMN storage.objects.virus_scanned_at IS
      'Timestamp when file was last scanned for viruses';

    CREATE INDEX IF NOT EXISTS idx_objects_virus_scan_pending
      ON storage.objects(virus_scan_status, created_at)
      WHERE virus_scan_status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_objects_virus_scan_infected
      ON storage.objects(virus_scan_status, created_at)
      WHERE virus_scan_status = 'infected';

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'quarantine',
      'quarantine',
      false,
      52428800,
      ARRAY['*/*']
    )
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS quarantine_service_role_only ON storage.objects;
    CREATE POLICY quarantine_service_role_only ON storage.objects
      FOR ALL
      USING (bucket_id = 'quarantine')
      WITH CHECK (false);

    COMMENT ON POLICY quarantine_service_role_only ON storage.objects IS
      'Only service role should access quarantined files';

  EXCEPTION
    WHEN insufficient_privilege THEN
      storage_mutation_applied := FALSE;
      RAISE NOTICE 'Skipping storage virus-scan DDL: insufficient privilege for role %', current_user;
  END;

  -- Always create the helper function, but query dynamically only when columns exist.
  CREATE OR REPLACE FUNCTION public.get_pending_virus_scans(limit_count INT DEFAULT 100)
  RETURNS TABLE (
    bucket_id TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage'
        AND table_name = 'objects'
        AND column_name = 'virus_scan_status'
    ) THEN
      RETURN QUERY
      EXECUTE '
        SELECT o.bucket_id, o.name, o.created_at
        FROM storage.objects o
        WHERE o.virus_scan_status = ''pending''
        ORDER BY o.created_at ASC
        LIMIT $1
      '
      USING limit_count;
    END IF;

    RETURN;
  END;
  $fn$;

  GRANT EXECUTE ON FUNCTION public.get_pending_virus_scans TO service_role;
  REVOKE EXECUTE ON FUNCTION public.get_pending_virus_scans FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.get_pending_virus_scans FROM anon;

  IF storage_mutation_applied THEN
    RAISE NOTICE 'Virus scan storage migration applied successfully';
  ELSE
    RAISE NOTICE 'Virus scan storage migration completed with storage DDL skipped';
  END IF;
END $$;
