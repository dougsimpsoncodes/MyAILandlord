-- Supabase Storage policies for Clerk JWTs
-- Use this version when passing Clerk tokens via Authorization header to Supabase

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- maintenance-images (public read, auth write)
CREATE POLICY "Users can upload maintenance images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'maintenance-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);

CREATE POLICY "Users can view maintenance images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'maintenance-images'
);

CREATE POLICY "Users can update their own maintenance images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'maintenance-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);

CREATE POLICY "Users can delete their own maintenance images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'maintenance-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);

-- voice-notes (private)
CREATE POLICY "Users can upload voice notes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-notes' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);

CREATE POLICY "Users can access voice notes for their requests" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-notes' AND (
    auth.jwt() ->> 'sub' IN (
      SELECT p.clerk_user_id 
      FROM public.profiles p
      JOIN public.maintenance_requests mr ON mr.tenant_id = p.id
      WHERE (storage.foldername(name))[1] = mr.id::text
    )
    OR auth.jwt() ->> 'sub' IN (
      SELECT p.clerk_user_id
      FROM public.profiles p
      JOIN public.properties prop ON prop.landlord_id = p.id
      JOIN public.maintenance_requests mr ON mr.property_id = prop.id
      WHERE (storage.foldername(name))[1] = mr.id::text
    )
  )
);

-- property-images (public read, landlord write)
CREATE POLICY "Landlords can upload property images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles WHERE role = 'landlord'
  )
);

CREATE POLICY "Anyone can view property images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-images'
);

CREATE POLICY "Landlords can update their property images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT p.clerk_user_id 
    FROM public.profiles p
    JOIN public.properties prop ON prop.landlord_id = p.id
    WHERE p.role = 'landlord'
  )
);

CREATE POLICY "Landlords can delete their property images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-images' AND
  auth.jwt() ->> 'sub' IN (
    SELECT p.clerk_user_id 
    FROM public.profiles p
    JOIN public.properties prop ON prop.landlord_id = p.id
    WHERE p.role = 'landlord'
  )
);

-- documents (private)
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);

CREATE POLICY "Users can access relevant documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.jwt() ->> 'sub' IN (
    SELECT clerk_user_id FROM public.profiles
  )
);