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

-- Views do not support table RLS. Expose read access via grants.
GRANT SELECT ON public_property_invite_info TO anon;
GRANT SELECT ON public_property_invite_info TO authenticated;
