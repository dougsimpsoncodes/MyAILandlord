-- Add Virus Scanning Fields to Storage Objects
-- Date: 2025-01-11
-- Purpose: Track virus scan status for all uploaded files
-- Impact: Enables async virus scanning with quarantine

-- ============================================================================
-- ADD VIRUS SCAN COLUMNS
-- ============================================================================

-- Add virus scan status tracking
ALTER TABLE storage.objects
ADD COLUMN IF NOT EXISTS virus_scan_status TEXT DEFAULT 'pending' CHECK (
  virus_scan_status IN ('pending', 'scanning', 'safe', 'infected', 'error')
),
ADD COLUMN IF NOT EXISTS virus_scan_result JSONB,
ADD COLUMN IF NOT EXISTS virus_scanned_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN storage.objects.virus_scan_status IS
  'Status of virus scan: pending (uploaded but not scanned), scanning (in progress), safe (clean), infected (malware detected), error (scan failed)';

COMMENT ON COLUMN storage.objects.virus_scan_result IS
  'JSON result from virus scanner API (Cloudmersive, VirusTotal, etc.)';

COMMENT ON COLUMN storage.objects.virus_scanned_at IS
  'Timestamp when file was last scanned for viruses';

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for querying pending scans (used by background worker)
CREATE INDEX IF NOT EXISTS idx_objects_virus_scan_pending
  ON storage.objects(virus_scan_status, created_at)
  WHERE virus_scan_status = 'pending';

COMMENT ON INDEX idx_objects_virus_scan_pending IS
  'Optimize queries for files awaiting virus scan (used by background scanner)';

-- Index for querying infected files (used by admin dashboard)
CREATE INDEX IF NOT EXISTS idx_objects_virus_scan_infected
  ON storage.objects(virus_scan_status, created_at)
  WHERE virus_scan_status = 'infected';

COMMENT ON INDEX idx_objects_virus_scan_infected IS
  'Optimize queries for infected files (used by security audits)';

-- ============================================================================
-- CREATE QUARANTINE BUCKET
-- ============================================================================

-- Create quarantine storage bucket for infected files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quarantine',
  'quarantine',
  false, -- Never public
  52428800, -- 50MB max
  ARRAY['*/*'] -- Accept any mime type (for forensics)
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN storage.buckets.id IS
  'Quarantine bucket stores infected files for security analysis and audit trail';

-- ============================================================================
-- RLS POLICIES FOR QUARANTINE BUCKET
-- ============================================================================

-- Only service role can access quarantine bucket
CREATE POLICY quarantine_service_role_only ON storage.objects
FOR ALL
USING (bucket_id = 'quarantine')
WITH CHECK (false); -- Prevent all user access

COMMENT ON POLICY quarantine_service_role_only ON storage.objects IS
  'Only service role (Edge Functions, admins) can access quarantined files';

-- ============================================================================
-- HELPER FUNCTION: GET PENDING SCANS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_virus_scans(limit_count INT DEFAULT 100)
RETURNS TABLE (
  bucket_id TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.bucket_id,
    o.name,
    o.created_at
  FROM storage.objects o
  WHERE o.virus_scan_status = 'pending'
  ORDER BY o.created_at ASC
  LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION public.get_pending_virus_scans IS
  'Returns list of files awaiting virus scan, ordered by upload time. Used by background scanner.';

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION public.get_pending_virus_scans TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_pending_virus_scans FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pending_virus_scans FROM anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns added:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'storage'
-- AND table_name = 'objects'
-- AND column_name LIKE 'virus_%';

-- Verify indexes created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND indexname LIKE '%virus%';

-- Verify quarantine bucket created:
-- SELECT id, name, public, file_size_limit
-- FROM storage.buckets
-- WHERE id = 'quarantine';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- After this migration:
-- 1. All existing files will have virus_scan_status = 'pending'
-- 2. Deploy virus-scan Edge Function
-- 3. Trigger background scan of existing files (optional)
-- 4. Update upload logic to queue virus scans
-- 5. Update download logic to check scan status

-- To scan existing files:
-- SELECT public.get_pending_virus_scans(1000);
-- Then trigger virus-scan function for each file
