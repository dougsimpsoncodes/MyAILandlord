-- My AI Landlord - Row Level Security Policies (Clean Version)
-- Run this AFTER running supabase-drop-all-policies.sql
-- This ensures tenant/landlord data isolation with performance optimizations

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text))
WITH CHECK (clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text));

-- Users can insert their own profile (for initial setup)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text));

-- =====================================================
-- PROPERTIES TABLE POLICIES
-- =====================================================

-- Users can read properties (landlords read own, tenants read linked)
CREATE POLICY "Users can read properties"
ON public.properties FOR SELECT
USING (
    -- Landlords can read their own properties
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
    OR
    -- Tenants can read properties they're linked to
    id IN (
        SELECT property_id FROM public.tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
        AND p.role = 'tenant'
        AND tpl.is_active = true
    )
);

-- Landlords can insert their own properties
CREATE POLICY "Landlords can insert properties"
ON public.properties FOR INSERT
WITH CHECK (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- Landlords can update their own properties
CREATE POLICY "Landlords can update properties"
ON public.properties FOR UPDATE
USING (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
)
WITH CHECK (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- Landlords can delete their own properties
CREATE POLICY "Landlords can delete properties"
ON public.properties FOR DELETE
USING (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- =====================================================
-- TENANT_PROPERTY_LINKS TABLE POLICIES
-- =====================================================

-- Users can read property links (landlords and tenants)
CREATE POLICY "Users can read property links"
ON public.tenant_property_links FOR SELECT
USING (
    -- Landlords can read links for their properties
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
    OR
    -- Tenants can read their own links
    tenant_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'tenant'
    )
);

-- Landlords can insert property links
CREATE POLICY "Landlords can insert property links"
ON public.tenant_property_links FOR INSERT
WITH CHECK (
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
);

-- Landlords can update property links
CREATE POLICY "Landlords can update property links"
ON public.tenant_property_links FOR UPDATE
USING (
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
)
WITH CHECK (
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
);

-- Landlords can delete property links
CREATE POLICY "Landlords can delete property links"
ON public.tenant_property_links FOR DELETE
USING (
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
);

-- =====================================================
-- MAINTENANCE_REQUESTS TABLE POLICIES
-- =====================================================

-- Users can read maintenance requests (tenants read own, landlords read property requests)
CREATE POLICY "Users can read maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
    -- Tenants can read their own maintenance requests
    tenant_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'tenant'
    )
    OR
    -- Landlords can read requests for their properties
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
);

-- Tenants can create maintenance requests for their properties
CREATE POLICY "Tenants can create maintenance requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'tenant'
    )
    AND property_id IN (
        SELECT property_id FROM public.tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
        AND tpl.is_active = true
    )
);

-- Users can update maintenance requests (tenants update own, landlords update property requests)
CREATE POLICY "Users can update maintenance requests"
ON public.maintenance_requests FOR UPDATE
USING (
    -- Tenants can update their own requests
    tenant_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'tenant'
    )
    OR
    -- Landlords can update requests for their properties
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (
            SELECT id FROM public.profiles 
            WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
            AND role = 'landlord'
        )
    )
);

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Users can read messages where they are sender or recipient
CREATE POLICY "Users can read own messages"
ON public.messages FOR SELECT
USING (
    sender_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    )
    OR recipient_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    )
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
    sender_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    )
);

-- Users can update messages they sent (for read receipts, etc.)
CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
    sender_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    )
    OR recipient_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    )
);

-- =====================================================
-- ANNOUNCEMENTS TABLE POLICIES
-- =====================================================

-- Users can read announcements (landlords read own, tenants read published)
CREATE POLICY "Users can read announcements"
ON public.announcements FOR SELECT
USING (
    -- Landlords can read their own announcements
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
    OR
    -- Tenants can read published announcements for their properties
    (
        is_published = true
        AND (
            property_id IS NULL -- Global announcements
            OR property_id IN (
                SELECT property_id FROM public.tenant_property_links tpl
                JOIN profiles p ON p.id = tpl.tenant_id
                WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
                AND p.role = 'tenant'
                AND tpl.is_active = true
            )
        )
    )
);

-- Landlords can insert their own announcements
CREATE POLICY "Landlords can insert announcements"
ON public.announcements FOR INSERT
WITH CHECK (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- Landlords can update their own announcements
CREATE POLICY "Landlords can update announcements"
ON public.announcements FOR UPDATE
USING (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
)
WITH CHECK (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- Landlords can delete their own announcements
CREATE POLICY "Landlords can delete announcements"
ON public.announcements FOR DELETE
USING (
    landlord_id IN (
        SELECT id FROM public.profiles 
        WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text) 
        AND role = 'landlord'
    )
);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to set the current user context
-- This should be called by your application before making database queries
CREATE OR REPLACE FUNCTION set_current_user_id(user_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS jsonb AS $$
BEGIN
    RETURN (
        SELECT to_jsonb(p.*)
        FROM public.profiles p
        WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;