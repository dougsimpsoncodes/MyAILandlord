-- Migration: Fix invite link flow database integration
-- Date: 2025-09-02
-- Purpose: Allow tenants to accept property invites and create their own property links

-- =====================================================
-- 1. FIX TENANT_PROPERTY_LINKS RLS POLICIES
-- =====================================================

-- Drop the old restrictive policy that only allowed landlords to insert
DROP POLICY IF EXISTS "Landlords can insert property links" ON public.tenant_property_links;

-- Create new policy that allows both landlords AND tenants to insert property links
CREATE POLICY "Users can insert property links" 
ON public.tenant_property_links FOR INSERT
WITH CHECK (
    -- Landlords can insert links for their properties
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'landlord'
        )
    )
    OR
    -- Tenants can insert links for themselves (when accepting invites)
    tenant_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
        AND role = 'tenant'
    )
);

-- =====================================================
-- 2. ALLOW PUBLIC ACCESS TO BASIC PROPERTY INFO
-- =====================================================

-- Create a view for public property information (for invite previews)
CREATE OR REPLACE VIEW public.property_invite_info AS
SELECT 
    id,
    name,
    address,
    property_type,
    unit
FROM properties;

-- Grant access to the view for both anonymous and authenticated users
GRANT SELECT ON public.property_invite_info TO anon, authenticated;

-- Add RLS policy for the view (allow all to read basic info)
ALTER VIEW public.property_invite_info SET (security_invoker = true);

-- =====================================================
-- 3. ADD MISSING UNIQUE CONSTRAINT (if not exists)
-- =====================================================

-- Ensure we have unique constraint on tenant_property_links to prevent duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenant_property_links_tenant_property_unique'
    ) THEN
        ALTER TABLE public.tenant_property_links 
        ADD CONSTRAINT tenant_property_links_tenant_property_unique 
        UNIQUE (tenant_id, property_id);
    END IF;
END $$;

-- =====================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON VIEW public.property_invite_info IS 
'Public view for property information shown in invite links. Contains only basic, non-sensitive property details that can be viewed before authentication.';

COMMENT ON POLICY "Users can insert property links" ON public.tenant_property_links IS 
'Allows both landlords (for their properties) and tenants (for themselves) to create property links. This enables the invite link flow where tenants can accept invitations.';