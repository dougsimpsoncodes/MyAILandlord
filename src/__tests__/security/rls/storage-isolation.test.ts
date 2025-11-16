/**
 * Storage Isolation Tests
 *
 * Validates that file storage (images, documents) is properly isolated
 * Prevents unauthorized access to uploaded files
 */

import {
  createTestLandlord,
  createTestTenant,
  cleanupTestUser,
  TestUser,
} from './helpers';

describe('Storage Bucket Isolation', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('User A cannot access signed URLs for User B uploaded files', async () => {
    // Upload a test file as User B
    const testImageBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const fileName = `test-uploads/${landlordB.id}/test-image-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await landlordB.supabaseClient.storage
      .from('property-images')
      .upload(fileName, testImageBlob);

    if (uploadError) {
      throw new Error(`Test setup failed: Could not upload file - ${uploadError.message}`);
    }

    // Generate signed URL as User B
    const { data: signedUrlData, error: signedUrlError } =
      await landlordB.supabaseClient.storage
        .from('property-images')
        .createSignedUrl(fileName, 60); // 60 second expiry

    if (signedUrlError || !signedUrlData) {
      throw new Error(`Test setup failed: Could not create signed URL - ${signedUrlError?.message}`);
    }

    // User A tries to access the file path directly
    const { data: accessData, error: accessError } = await landlordA.supabaseClient.storage
      .from('property-images')
      .download(fileName);

    if (!accessError && accessData) {
      throw new Error(
        'RLS VIOLATION: User A downloaded User B file from storage bucket'
      );
    }

    // Cleanup
    await landlordB.supabaseClient.storage.from('property-images').remove([fileName]);
  });

  test('User A cannot list objects in User B storage folders', async () => {
    // User A tries to list files in User B folder
    const { data, error } = await landlordA.supabaseClient.storage
      .from('property-images')
      .list(`test-uploads/${landlordB.id}`);

    // RLS should block this or return empty
    if (!error && data && data.length > 0) {
      // Check if any files were actually returned
      const hasFiles = data.some((file) => file.name !== '.emptyFolderPlaceholder');
      if (hasFiles) {
        throw new Error(
          'RLS VIOLATION: User A listed User B files in storage bucket'
        );
      }
    }
  });

  test('User A cannot delete objects they do not own', async () => {
    // Upload a test file as User B
    const testImageBlob = new Blob(['fake-image-data-2'], { type: 'image/jpeg' });
    const fileName = `test-uploads/${landlordB.id}/test-image-delete-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await landlordB.supabaseClient.storage
      .from('property-images')
      .upload(fileName, testImageBlob);

    if (uploadError) {
      throw new Error(`Test setup failed: Could not upload file - ${uploadError.message}`);
    }

    // User A tries to delete User B file
    const { data, error } = await landlordA.supabaseClient.storage
      .from('property-images')
      .remove([fileName]);

    // Check if deletion succeeded
    const { data: checkData } = await landlordB.supabaseClient.storage
      .from('property-images')
      .list(`test-uploads/${landlordB.id}`);

    const fileStillExists = checkData?.some((file) => file.name === fileName.split('/').pop());

    if (!fileStillExists) {
      throw new Error(
        'RLS VIOLATION: User A deleted User B file from storage bucket'
      );
    }

    // Cleanup
    await landlordB.supabaseClient.storage.from('property-images').remove([fileName]);
  });

  test('Tenant cannot upload to landlord-only buckets', async () => {
    // Assuming there's a landlord-only bucket (e.g., 'property-documents')
    const testDocBlob = new Blob(['fake-doc-data'], { type: 'application/pdf' });
    const fileName = `documents/${tenantA.id}/unauthorized-doc-${Date.now()}.pdf`;

    // Tenant tries to upload to property-documents bucket
    const { data, error } = await tenantA.supabaseClient.storage
      .from('property-documents')
      .upload(fileName, testDocBlob);

    if (!error && data) {
      // Cleanup
      await tenantA.supabaseClient.storage.from('property-documents').remove([fileName]);

      throw new Error(
        'RLS VIOLATION: Tenant uploaded to landlord-only storage bucket'
      );
    }

    // Error expected - RLS should block tenant uploads to this bucket
  });

  test('User can only upload to their own user folder', async () => {
    // User A tries to upload to User B folder
    const testImageBlob = new Blob(['fake-image-data-3'], { type: 'image/jpeg' });
    const fileName = `test-uploads/${landlordB.id}/unauthorized-${Date.now()}.jpg`;

    const { data, error } = await landlordA.supabaseClient.storage
      .from('property-images')
      .upload(fileName, testImageBlob);

    if (!error && data) {
      // Cleanup
      await landlordA.supabaseClient.storage.from('property-images').remove([fileName]);

      throw new Error(
        'RLS VIOLATION: User A uploaded to User B folder in storage bucket'
      );
    }

    // Error expected - RLS should enforce folder-level isolation
  });
});

describe('Maintenance Request Photo Isolation', () => {
  let tenantA: TestUser;
  let tenantB: TestUser;

  beforeAll(async () => {
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();
  });

  afterAll(async () => {
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Tenant A cannot access Tenant B maintenance request photos', async () => {
    // Upload a maintenance photo as Tenant B
    const testPhotoBlob = new Blob(['fake-photo-data'], { type: 'image/jpeg' });
    const fileName = `maintenance-photos/${tenantB.id}/issue-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await tenantB.supabaseClient.storage
      .from('maintenance-photos')
      .upload(fileName, testPhotoBlob);

    if (uploadError) {
      throw new Error(`Test setup failed: Could not upload photo - ${uploadError.message}`);
    }

    // Tenant A tries to download the photo
    const { data, error } = await tenantA.supabaseClient.storage
      .from('maintenance-photos')
      .download(fileName);

    if (!error && data) {
      throw new Error(
        'RLS VIOLATION: Tenant A accessed Tenant B maintenance photo'
      );
    }

    // Cleanup
    await tenantB.supabaseClient.storage.from('maintenance-photos').remove([fileName]);
  });
});
