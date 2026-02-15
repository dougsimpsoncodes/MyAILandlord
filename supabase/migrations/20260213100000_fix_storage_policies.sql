-- Fix storage policies after db reset
-- These get silently dropped and the migration can't recreate them
-- due to insufficient privileges in the DO block

-- Drop any stale policies first
DROP POLICY IF EXISTS storage_property_images_insert_landlord ON storage.objects;
DROP POLICY IF EXISTS storage_property_images_select_public ON storage.objects;
DROP POLICY IF EXISTS storage_maintenance_images_insert ON storage.objects;
DROP POLICY IF EXISTS storage_maintenance_images_select ON storage.objects;
DROP POLICY IF EXISTS storage_voice_notes_insert ON storage.objects;
DROP POLICY IF EXISTS storage_voice_notes_select ON storage.objects;
DROP POLICY IF EXISTS storage_documents_insert ON storage.objects;
DROP POLICY IF EXISTS storage_documents_select ON storage.objects;

-- Property images: authenticated users can upload, anyone can read
CREATE POLICY storage_property_images_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY storage_property_images_select ON storage.objects
FOR SELECT USING (bucket_id = 'property-images');

-- Maintenance images: authenticated users can upload and read
CREATE POLICY storage_maintenance_images_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-images');

CREATE POLICY storage_maintenance_images_select ON storage.objects
FOR SELECT USING (bucket_id = 'maintenance-images');

-- Voice notes: authenticated users can upload and read
CREATE POLICY storage_voice_notes_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-notes');

CREATE POLICY storage_voice_notes_select ON storage.objects
FOR SELECT USING (bucket_id = 'voice-notes');

-- Documents: authenticated users can upload and read
CREATE POLICY storage_documents_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY storage_documents_select ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
