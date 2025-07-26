-- My AI Landlord - Row Level Security Policies
-- Run this SQL AFTER creating the schema to set up security policies
-- This ensures tenant/landlord data isolation

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
ON profiles FOR SELECT
USING (clerk_user_id = current_setting('app.current_user_id', true));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (clerk_user_id = current_setting('app.current_user_id', true))
WITH CHECK (clerk_user_id = current_setting('app.current_user_id', true));

-- Users can insert their own profile (for initial setup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (clerk_user_id = current_setting('app.current_user_id', true));

-- =====================================================
-- PROPERTIES TABLE POLICIES
-- =====================================================

-- Landlords can read their own properties
CREATE POLICY "Landlords can read own properties"
ON properties FOR SELECT
USING (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'landlord'
    )
);

-- Tenants can read properties they're linked to
CREATE POLICY "Tenants can read linked properties"
ON properties FOR SELECT
USING (
    id IN (
        SELECT property_id FROM tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = current_setting('app.current_user_id', true)
        AND p.role = 'tenant'
        AND tpl.is_active = true
    )
);

-- Landlords can insert/update/delete their own properties
CREATE POLICY "Landlords can manage own properties"
ON properties FOR ALL
USING (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'landlord'
    )
)
WITH CHECK (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'landlord'
    )
);

-- =====================================================
-- TENANT_PROPERTY_LINKS TABLE POLICIES
-- =====================================================

-- Landlords can manage links for their properties
CREATE POLICY "Landlords can manage property links"
ON tenant_property_links FOR ALL
USING (
    property_id IN (
        SELECT id FROM properties
        WHERE landlord_id IN (
            SELECT id FROM profiles 
            WHERE clerk_user_id = current_setting('app.current_user_id', true) 
            AND role = 'landlord'
        )
    )
);

-- Tenants can read their own links
CREATE POLICY "Tenants can read own property links"
ON tenant_property_links FOR SELECT
USING (
    tenant_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'tenant'
    )
);

-- =====================================================
-- MAINTENANCE_REQUESTS TABLE POLICIES
-- =====================================================

-- Tenants can read their own maintenance requests
CREATE POLICY "Tenants can read own maintenance requests"
ON maintenance_requests FOR SELECT
USING (
    tenant_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'tenant'
    )
);

-- Landlords can read requests for their properties
CREATE POLICY "Landlords can read property maintenance requests"
ON maintenance_requests FOR SELECT
USING (
    property_id IN (
        SELECT id FROM properties
        WHERE landlord_id IN (
            SELECT id FROM profiles 
            WHERE clerk_user_id = current_setting('app.current_user_id', true) 
            AND role = 'landlord'
        )
    )
);

-- Tenants can create maintenance requests for their properties
CREATE POLICY "Tenants can create maintenance requests"
ON maintenance_requests FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'tenant'
    )
    AND property_id IN (
        SELECT property_id FROM tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = current_setting('app.current_user_id', true)
        AND tpl.is_active = true
    )
);

-- Tenants can update their own requests (limited fields)
CREATE POLICY "Tenants can update own maintenance requests"
ON maintenance_requests FOR UPDATE
USING (
    tenant_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'tenant'
    )
);

-- Landlords can update requests for their properties
CREATE POLICY "Landlords can update property maintenance requests"
ON maintenance_requests FOR UPDATE
USING (
    property_id IN (
        SELECT id FROM properties
        WHERE landlord_id IN (
            SELECT id FROM profiles 
            WHERE clerk_user_id = current_setting('app.current_user_id', true) 
            AND role = 'landlord'
        )
    )
);

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Users can read messages where they are sender or recipient
CREATE POLICY "Users can read own messages"
ON messages FOR SELECT
USING (
    sender_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
    OR recipient_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
    sender_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
);

-- Users can update messages they sent (for read receipts, etc.)
CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (
    sender_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
    OR recipient_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
);

-- =====================================================
-- ANNOUNCEMENTS TABLE POLICIES
-- =====================================================

-- Landlords can read their own announcements
CREATE POLICY "Landlords can read own announcements"
ON announcements FOR SELECT
USING (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'landlord'
    )
);

-- Tenants can read published announcements for their properties
CREATE POLICY "Tenants can read property announcements"
ON announcements FOR SELECT
USING (
    is_published = true
    AND (
        property_id IS NULL -- Global announcements
        OR property_id IN (
            SELECT property_id FROM tenant_property_links tpl
            JOIN profiles p ON p.id = tpl.tenant_id
            WHERE p.clerk_user_id = current_setting('app.current_user_id', true)
            AND p.role = 'tenant'
            AND tpl.is_active = true
        )
    )
);

-- Landlords can manage their own announcements
CREATE POLICY "Landlords can manage own announcements"
ON announcements FOR ALL
USING (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
        AND role = 'landlord'
    )
)
WITH CHECK (
    landlord_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = current_setting('app.current_user_id', true) 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS profiles AS $$
DECLARE
    profile profiles;
BEGIN
    SELECT * INTO profile
    FROM profiles
    WHERE clerk_user_id = current_setting('app.current_user_id', true);
    
    RETURN profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;