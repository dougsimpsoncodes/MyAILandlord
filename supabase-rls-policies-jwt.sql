-- My AI Landlord - RLS Policies for Clerk JWTs
-- Use this version if you integrate Clerk tokens directly with Supabase REST/Storage
-- Assumes Clerk JWT `sub` equals your `profiles.clerk_user_id`

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (clerk_user_id = (auth.jwt() ->> 'sub'))
WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

-- =====================================================
-- PROPERTIES
-- =====================================================
CREATE POLICY "Users can read properties"
ON public.properties FOR SELECT
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
  OR id IN (
    SELECT property_id FROM public.tenant_property_links tpl
    JOIN profiles p ON p.id = tpl.tenant_id
    WHERE p.clerk_user_id = (auth.jwt() ->> 'sub') AND p.role = 'tenant' AND tpl.is_active = true
  )
);

CREATE POLICY "Landlords can insert properties"
ON public.properties FOR INSERT
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);

CREATE POLICY "Landlords can update properties"
ON public.properties FOR UPDATE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
)
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);

CREATE POLICY "Landlords can delete properties"
ON public.properties FOR DELETE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);

-- =====================================================
-- TENANT_PROPERTY_LINKS
-- =====================================================
CREATE POLICY "Users can read property links"
ON public.tenant_property_links FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
  OR tenant_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'tenant'
  )
);

CREATE POLICY "Landlords can insert property links"
ON public.tenant_property_links FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
);

CREATE POLICY "Landlords can update property links"
ON public.tenant_property_links FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
);

CREATE POLICY "Landlords can delete property links"
ON public.tenant_property_links FOR DELETE
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
);

-- =====================================================
-- MAINTENANCE_REQUESTS
-- =====================================================
CREATE POLICY "Users can read maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'tenant'
  )
  OR property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
);

CREATE POLICY "Tenants can create maintenance requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'tenant'
  )
  AND property_id IN (
    SELECT property_id FROM public.tenant_property_links tpl
    JOIN profiles p ON p.id = tpl.tenant_id
    WHERE p.clerk_user_id = (auth.jwt() ->> 'sub') AND tpl.is_active = true
  )
);

CREATE POLICY "Users can update maintenance requests"
ON public.maintenance_requests FOR UPDATE
USING (
  tenant_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'tenant'
  )
  OR property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id IN (
      SELECT id FROM public.profiles 
      WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
    )
  )
);

-- =====================================================
-- MESSAGES
-- =====================================================
CREATE POLICY "Users can read own messages"
ON public.messages FOR SELECT
USING (
  sender_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  )
  OR recipient_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
  sender_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  )
  OR recipient_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

-- =====================================================
-- ANNOUNCEMENTS
-- =====================================================
CREATE POLICY "Users can read announcements"
ON public.announcements FOR SELECT
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
  OR (
    is_published = true AND (
      property_id IS NULL OR property_id IN (
        SELECT property_id FROM public.tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = (auth.jwt() ->> 'sub') AND p.role = 'tenant' AND tpl.is_active = true
      )
    )
  )
);

CREATE POLICY "Landlords can insert announcements"
ON public.announcements FOR INSERT
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);

CREATE POLICY "Landlords can update announcements"
ON public.announcements FOR UPDATE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
)
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);

CREATE POLICY "Landlords can delete announcements"
ON public.announcements FOR DELETE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'landlord'
  )
);