-- Fix RLS vulnerability: Tenants should NOT be able to create properties
-- Only users with role='landlord' should be able to insert properties

-- Drop the current overly permissive insert policy
DROP POLICY IF EXISTS properties_insert ON public.properties;

-- Create new insert policy that checks both landlord_id AND role
CREATE POLICY properties_insert ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'landlord'
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY properties_insert ON public.properties IS
  'Only authenticated users with landlord role can create properties where they are the landlord';
