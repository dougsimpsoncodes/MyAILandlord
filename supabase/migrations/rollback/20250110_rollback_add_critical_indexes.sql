-- Rollback for: 20250110_add_critical_indexes.sql
-- Purpose: Remove all indexes added in the critical indexes migration
-- Use: Only if performance degradation or issues detected after index creation

-- ============================================================================
-- PROFILE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_profiles_clerk_user_id;
DROP INDEX IF EXISTS idx_profiles_role;

-- ============================================================================
-- PROPERTY INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_properties_landlord_id;
DROP INDEX IF EXISTS idx_properties_created_at;
DROP INDEX IF EXISTS idx_properties_landlord_created;
DROP INDEX IF EXISTS idx_properties_property_code;
DROP INDEX IF EXISTS idx_properties_active_codes;

-- ============================================================================
-- TENANT-PROPERTY LINK INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_tpl_tenant_id;
DROP INDEX IF EXISTS idx_tpl_property_id;
DROP INDEX IF EXISTS idx_tpl_tenant_property_active;
DROP INDEX IF EXISTS idx_tpl_active_links;

-- ============================================================================
-- MAINTENANCE REQUEST INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_mr_property_id;
DROP INDEX IF EXISTS idx_mr_tenant_id;
DROP INDEX IF EXISTS idx_mr_status;
DROP INDEX IF EXISTS idx_mr_created_at;
DROP INDEX IF EXISTS idx_mr_property_status_created;
DROP INDEX IF EXISTS idx_mr_open_requests;
DROP INDEX IF EXISTS idx_mr_urgent;

-- ============================================================================
-- MESSAGE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_recipient;
DROP INDEX IF EXISTS idx_messages_thread;
DROP INDEX IF EXISTS idx_messages_unread;

-- ============================================================================
-- PROPERTY AREAS INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_property_areas_property_id;

-- ============================================================================
-- ANNOUNCEMENTS INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_announcements_landlord_id;
DROP INDEX IF EXISTS idx_announcements_property_id;
DROP INDEX IF EXISTS idx_announcements_published;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all indexes removed:
-- SELECT indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%';
-- Should return empty or only non-performance indexes
