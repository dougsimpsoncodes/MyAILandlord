-- ============================================================================
-- Initial Base Schema Migration
-- Date: 2025-08-14 (reconstructed)
-- Purpose: Create all base tables that were originally created via the
--          Supabase dashboard before versioned migrations began.
--          All subsequent migrations depend on these tables existing.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- CUSTOM ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('landlord', 'tenant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('submitted', 'pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text', 'image', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.announcement_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Must be created before any table triggers reference it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================================================
-- TABLE: profiles
-- Extends Supabase auth.users with app-specific data.
-- Originally had clerk_user_id (removed by 20250115 migration).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role public.user_role,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: properties
-- Core property records owned by landlords.
-- Later migrations add: property_type, unit, bedrooms, bathrooms,
-- address_jsonb, user_id, property_code fields, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: tenant_property_links
-- Many-to-many link between tenants and properties.
-- Later migrations add: invitation_status, invited_by, invited_at, accepted_at,
-- landlord_id (FK to profiles).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_property_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    landlord_id UUID REFERENCES public.profiles(id),
    unit_number TEXT,
    lease_start_date DATE,
    lease_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, property_id, unit_number)
);

-- ============================================================================
-- TABLE: maintenance_requests
-- Tenant-submitted maintenance/repair requests.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority public.request_priority DEFAULT 'medium',
    status public.request_status DEFAULT 'pending',
    area TEXT NOT NULL,
    asset TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    images TEXT[],
    voice_notes TEXT[],
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    assigned_vendor_email TEXT,
    vendor_notes TEXT,
    completion_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: messages
-- Direct messaging between tenants and landlords.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type public.message_type DEFAULT 'text',
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: announcements
-- Landlord broadcasts to tenants (property-specific or global).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority public.announcement_priority DEFAULT 'medium',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at on row modification
-- ============================================================================

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_tenant_property_links_updated_at
    BEFORE UPDATE ON public.tenant_property_links
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_maintenance_requests_updated_at
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- BASIC INDEXES (pre-critical-indexes migration)
-- These are the minimal indexes needed for FK lookups and common queries.
-- The 20250110_add_critical_indexes.sql migration adds more comprehensive ones.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenant_property_links_tenant_id ON public.tenant_property_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_property_links_property_id ON public.tenant_property_links(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_announcements_landlord_id ON public.announcements(landlord_id);
CREATE INDEX IF NOT EXISTS idx_announcements_property_id ON public.announcements(property_id);

-- ============================================================================
-- ROW LEVEL SECURITY: Enable on all tables
-- Policies are defined in later migrations (20250904_consolidate_rls.sql etc.)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANTS: Allow authenticated and service_role access
-- ============================================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.tenant_property_links TO authenticated;
GRANT ALL ON public.tenant_property_links TO service_role;
GRANT ALL ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
