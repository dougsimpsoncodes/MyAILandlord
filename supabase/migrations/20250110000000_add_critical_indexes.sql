-- Critical Index Implementation
-- Date: 2025-01-10
-- Purpose: Add missing indexes for performance optimization
-- Impact: 10-100x faster queries at scale

-- ============================================================================
-- PROFILE INDEXES
-- ============================================================================

-- Core identity lookup (most frequent query)
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id
  ON profiles(clerk_user_id);

COMMENT ON INDEX idx_profiles_clerk_user_id IS
  'Optimize auth lookups by Clerk user ID - used in every authenticated request';

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role)
  WHERE role IS NOT NULL;

COMMENT ON INDEX idx_profiles_role IS
  'Optimize role-based filtering for landlord/tenant queries';

-- ============================================================================
-- PROPERTY INDEXES
-- ============================================================================

-- Ownership queries (landlord dashboard)
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id
  ON properties(landlord_id);

COMMENT ON INDEX idx_properties_landlord_id IS
  'Optimize landlord property queries - critical for dashboard performance';

-- Sorting by creation date
CREATE INDEX IF NOT EXISTS idx_properties_created_at
  ON properties(created_at DESC);

COMMENT ON INDEX idx_properties_created_at IS
  'Optimize property list sorting by most recent';

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_properties_landlord_created
  ON properties(landlord_id, created_at DESC);

COMMENT ON INDEX idx_properties_landlord_created IS
  'Optimize paginated property queries for specific landlord';

-- Property code indexes (columns added by later migration)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_properties_property_code
    ON properties(property_code)
    WHERE property_code IS NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_properties_active_codes
    ON properties(property_code, code_expires_at)
    WHERE allow_tenant_signup = true AND code_expires_at > NOW();
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- TENANT-PROPERTY LINK INDEXES
-- ============================================================================

-- Tenant's properties lookup
CREATE INDEX IF NOT EXISTS idx_tpl_tenant_id
  ON tenant_property_links(tenant_id);

COMMENT ON INDEX idx_tpl_tenant_id IS
  'Optimize tenant property list queries';

-- Property's tenants lookup
CREATE INDEX IF NOT EXISTS idx_tpl_property_id
  ON tenant_property_links(property_id);

COMMENT ON INDEX idx_tpl_property_id IS
  'Optimize landlord tenant list queries';

-- Composite for RLS policies
CREATE INDEX IF NOT EXISTS idx_tpl_tenant_property_active
  ON tenant_property_links(tenant_id, property_id, is_active);

COMMENT ON INDEX idx_tpl_tenant_property_active IS
  'Optimize RLS policy checks for tenant access to properties';

-- Active links only (partial index)
CREATE INDEX IF NOT EXISTS idx_tpl_active_links
  ON tenant_property_links(property_id, tenant_id)
  WHERE is_active = true;

COMMENT ON INDEX idx_tpl_active_links IS
  'Optimize queries for currently active tenant-property relationships';

-- ============================================================================
-- MAINTENANCE REQUEST INDEXES
-- ============================================================================

-- Property maintenance requests (landlord view)
CREATE INDEX IF NOT EXISTS idx_mr_property_id
  ON maintenance_requests(property_id);

COMMENT ON INDEX idx_mr_property_id IS
  'Optimize landlord maintenance request queries by property';

-- Tenant maintenance requests (tenant view)
CREATE INDEX IF NOT EXISTS idx_mr_tenant_id
  ON maintenance_requests(tenant_id);

COMMENT ON INDEX idx_mr_tenant_id IS
  'Optimize tenant maintenance request history queries';

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_mr_status
  ON maintenance_requests(status);

COMMENT ON INDEX idx_mr_status IS
  'Optimize filtering by request status (open, in_progress, closed)';

-- Sorting by date
CREATE INDEX IF NOT EXISTS idx_mr_created_at
  ON maintenance_requests(created_at DESC);

COMMENT ON INDEX idx_mr_created_at IS
  'Optimize sorting maintenance requests by submission date';

-- Composite for common landlord query
CREATE INDEX IF NOT EXISTS idx_mr_property_status_created
  ON maintenance_requests(property_id, status, created_at DESC);

COMMENT ON INDEX idx_mr_property_status_created IS
  'Optimize landlord dashboard: requests by property and status, sorted by date';

-- Open requests only (partial index - most common query)
CREATE INDEX IF NOT EXISTS idx_mr_open_requests
  ON maintenance_requests(property_id, created_at DESC)
  WHERE status = 'submitted';

COMMENT ON INDEX idx_mr_open_requests IS
  'Optimize landlord dashboard open requests - most frequently accessed';

-- Urgent requests
CREATE INDEX IF NOT EXISTS idx_mr_urgent
  ON maintenance_requests(property_id, created_at DESC)
  WHERE priority = 'urgent';

COMMENT ON INDEX idx_mr_urgent IS
  'Optimize urgent request notifications and filtering';

-- ============================================================================
-- MESSAGE INDEXES
-- ============================================================================

-- Sender's messages
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id, created_at DESC);

COMMENT ON INDEX idx_messages_sender IS
  'Optimize sent messages history for user';

-- Recipient's messages (inbox)
CREATE INDEX IF NOT EXISTS idx_messages_recipient
  ON messages(recipient_id, created_at DESC);

COMMENT ON INDEX idx_messages_recipient IS
  'Optimize inbox queries - most frequent message access pattern';

-- Message threads (conversation view)
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(sender_id, recipient_id, created_at DESC);

COMMENT ON INDEX idx_messages_thread IS
  'Optimize conversation thread queries between two users';

-- Unread messages (partial index - read_at added by later migration)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON messages(recipient_id, created_at DESC)
    WHERE read_at IS NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- PROPERTY AREAS INDEXES
-- ============================================================================

-- property_areas created by later migration
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_areas_property_id
    ON property_areas(property_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================================
-- ANNOUNCEMENTS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_announcements_landlord_id
  ON announcements(landlord_id);

COMMENT ON INDEX idx_announcements_landlord_id IS
  'Optimize landlord announcement management queries';

CREATE INDEX IF NOT EXISTS idx_announcements_property_id
  ON announcements(property_id)
  WHERE property_id IS NOT NULL;

COMMENT ON INDEX idx_announcements_property_id IS
  'Optimize property-specific announcement queries';

CREATE INDEX IF NOT EXISTS idx_announcements_published
  ON announcements(property_id, created_at DESC)
  WHERE is_published = true;

COMMENT ON INDEX idx_announcements_published IS
  'Optimize tenant announcement feed - only published, sorted by date';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify indexes were created successfully:

-- List all new indexes
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexname::regclass)) as size
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Check index usage (run after some production traffic)
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as times_used,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

-- Find unused indexes (candidates for removal)
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexname::regclass)) as size
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0
-- AND schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY pg_relation_size(indexname::regclass) DESC;
