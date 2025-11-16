-- Create a public view for property invite previews
-- This allows anonymous users to see basic property details for invites

CREATE OR REPLACE VIEW public_property_invite_info AS
SELECT 
  id,
  name,
  address,
  property_type,
  created_at
FROM properties;

-- Allow anonymous users to read from this view
ALTER TABLE public_property_invite_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous property invite preview" ON public_property_invite_info
FOR SELECT 
TO anon
USING (true);