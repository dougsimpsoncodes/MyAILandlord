## [SEVERITY: MEDIUM] Potential for Orphaned Files in `createMaintenanceRequest`

**File**: `src/services/api/client.ts`
**Issue**: The `createMaintenanceRequest` function has a potential for orphaned files. If the function fails after uploading the files but before updating the maintenance request with the file URLs, the files will be orphaned in storage.
**Impact**: This could lead to wasted storage space and a confusing user experience.
**Reproduction**: N/A
**Fix**: The function should be modified to handle this case. One way to do this is to delete the uploaded files if the function fails after they have been uploaded.

**Code Example**:
```typescript
// The current implementation has a potential for orphaned files
const createMaintenanceRequest = async (requestData: CreateMaintenanceRequestData) => {
  // ...
  const maintenanceRequest = await client.createMaintenanceRequest(apiRequestData);

  // If there are images or voice notes, upload them with validation
  const uploadedImages: string[] = [];
  const uploadedVoiceNotes: string[] = [];

  if (validatedData.images?.length) {
    // ... upload images
  }

  if (validatedData.voiceNotes?.length) {
    // ... upload voice notes
  }

  // If this fails, the files will be orphaned
  await client.updateMaintenanceRequest(maintenanceRequest.id, {
    images: uploadedImages.length ? uploadedImages : undefined,
    voice_notes: uploadedVoiceNotes.length ? uploadedVoiceNotes : undefined,
  });
}

// The corrected implementation should handle this case
const createMaintenanceRequest = async (requestData: CreateMaintenanceRequestData) => {
  // ...
  const maintenanceRequest = await client.createMaintenanceRequest(apiRequestData);

  const uploadedImages: string[] = [];
  const uploadedVoiceNotes: string[] = [];

  try {
    if (validatedData.images?.length) {
      // ... upload images
    }

    if (validatedData.voiceNotes?.length) {
      // ... upload voice notes
    }

    await client.updateMaintenanceRequest(maintenanceRequest.id, {
      images: uploadedImages.length ? uploadedImages : undefined,
      voice_notes: uploadedVoiceNotes.length ? uploadedVoiceNotes : undefined,
    });
  } catch (error) {
    // If the update fails, delete the uploaded files
    for (const image of uploadedImages) {
      await storageService.deleteFile('maintenance-images', image);
    }
    for (const voiceNote of uploadedVoiceNotes) {
      await storageService.deleteFile('voice-notes', voiceNote);
    }
    throw error;
  }
}
```
