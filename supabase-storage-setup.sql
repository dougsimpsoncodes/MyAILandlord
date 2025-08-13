-- Supabase Storage Setup for My AI Landlord
-- Run this in your Supabase SQL editor after the main schema

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('maintenance-images', 'maintenance-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('voice-notes', 'voice-notes', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/m4a']),
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for maintenance-images bucket
CREATE POLICY "Users can upload maintenance images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'maintenance-images' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);

CREATE POLICY "Users can view maintenance images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'maintenance-images'
);

CREATE POLICY "Users can update their own maintenance images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'maintenance-images' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);

CREATE POLICY "Users can delete their own maintenance images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'maintenance-images' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);

-- Storage policies for voice-notes bucket
CREATE POLICY "Users can upload voice notes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-notes' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);

CREATE POLICY "Users can access voice notes for their requests" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-notes' AND
  (
    -- Tenant can access their own voice notes
    auth.uid::text IN (
      SELECT p.clerk_user_id 
      FROM public.profiles p
      JOIN public.maintenance_requests mr ON mr.tenant_id = p.id
      WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
      AND (storage.foldername(name))[1] = mr.id::text
    )
    OR
    -- Landlord can access voice notes for their properties
    auth.uid::text IN (
      SELECT p.clerk_user_id
      FROM public.profiles p
      JOIN public.properties prop ON prop.landlord_id = p.id
      JOIN public.maintenance_requests mr ON mr.property_id = prop.id
      WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
      AND (storage.foldername(name))[1] = mr.id::text
    )
  )
);

-- Storage policies for property-images bucket
CREATE POLICY "Landlords can upload property images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-images' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    AND role = 'landlord'
  )
);

CREATE POLICY "Anyone can view property images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-images'
);

CREATE POLICY "Landlords can update their property images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-images' AND
  auth.uid::text IN (
    SELECT p.clerk_user_id 
    FROM public.profiles p
    JOIN public.properties prop ON prop.landlord_id = p.id
    WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    AND p.role = 'landlord'
  )
);

CREATE POLICY "Landlords can delete their property images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-images' AND
  auth.uid::text IN (
    SELECT p.clerk_user_id 
    FROM public.profiles p
    JOIN public.properties prop ON prop.landlord_id = p.id
    WHERE p.clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
    AND p.role = 'landlord'
  )
);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);

CREATE POLICY "Users can access relevant documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid::text IN (
    SELECT clerk_user_id FROM public.profiles
    WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
  )
);