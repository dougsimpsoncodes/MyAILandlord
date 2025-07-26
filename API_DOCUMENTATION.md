# API Documentation - My AI Landlord

This document provides comprehensive API documentation for the My AI Landlord application, including authentication, database operations, file storage, and AI services.

## Overview

The application uses a **Supabase-first architecture** with **Clerk authentication**:
- **Authentication**: Clerk manages user auth and sessions
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for files
- **AI Processing**: Supabase Edge Functions with OpenAI
- **Real-time**: Supabase real-time subscriptions

## Authentication API

### Clerk Integration

The app uses Clerk for authentication with the `useAppAuth` hook:

```typescript
import { useAppAuth } from '../context/ClerkAuthContext';

const { user, isLoading, isSignedIn, signOut } = useAppAuth();
```

**User Object Structure:**
```typescript
interface AppUser {
  id: string;                    // Clerk user ID
  name: string;                  // Full name or first name
  email: string;                 // Primary email address
  avatar?: string;               // Profile image URL
}
```

**Authentication States:**
- `isLoading: boolean` - Authentication state loading
- `isSignedIn: boolean` - User is authenticated
- `user: AppUser | null` - Current user data
- `signOut: () => void` - Sign out function

## Main API Client

### Hook Usage

The primary way to interact with the API is through the `useSupabaseApiClient` hook:

```typescript
import { useApiClient } from '../services/api/client';

const apiClient = useApiClient();
```

## User Profile API

### Get User Profile
```typescript
const profile = await apiClient.getUserProfile();
```

**Response:**
```typescript
interface Profile {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'tenant' | 'landlord' | null;
  created_at: string;
  updated_at: string;
}
```

### Create User Profile
```typescript
const profile = await apiClient.createUserProfile({
  email: 'user@example.com',
  name: 'John Doe',
  role: 'tenant',
  avatarUrl: 'https://...'
});
```

**Input Validation:**
- `email`: Required, valid email format
- `name`: Optional, 1-100 characters
- `role`: Optional, 'tenant' or 'landlord'
- `avatarUrl`: Optional, valid URL

### Update User Profile
```typescript
const updated = await apiClient.updateUserProfile({
  name: 'Updated Name',
  role: 'landlord'
});
```

### Set User Role
```typescript
await apiClient.setUserRole('tenant');
```

## Property API

### Get User Properties
```typescript
const properties = await apiClient.getUserProperties();
```

**Response:**
```typescript
interface Property {
  id: string;
  name: string;
  address: string;
  landlord_id: string;
  created_at: string;
  updated_at: string;
}
```

**Behavior:**
- **Landlords**: Get properties they own
- **Tenants**: Get properties they're linked to

## Maintenance Request API

### Get Maintenance Requests
```typescript
const requests = await apiClient.getMaintenanceRequests();
```

**Response:**
```typescript
interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  area: string;
  asset: string;
  issue_type: string;
  images: string[] | null;
  voice_notes: string[] | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  assigned_vendor_email: string | null;
  vendor_notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Create Maintenance Request
```typescript
const request = await apiClient.createMaintenanceRequest({
  propertyId: 'prop-123',
  title: 'Leaky faucet',
  description: 'Kitchen sink is dripping',
  priority: 'medium',
  area: 'Kitchen',
  asset: 'Sink',
  issueType: 'Plumbing',
  images: ['image-url-1', 'image-url-2'],
  voiceNotes: ['audio-url-1']
});
```

**Input Validation:**
- `propertyId`: Required, valid UUID
- `title`: Required, 1-100 characters
- `description`: Required, 1-2000 characters
- `priority`: Required, one of: 'low', 'medium', 'high', 'urgent'
- `area`: Required, 1-100 characters
- `asset`: Required, 1-100 characters
- `issueType`: Required, 1-100 characters
- `images`: Optional, max 5 images
- `voiceNotes`: Optional array of URLs

**Permissions:**
- Only tenants can create maintenance requests
- User must have an active profile

### Update Maintenance Request
```typescript
const updated = await apiClient.updateMaintenanceRequest('request-id', {
  status: 'in_progress',
  assignedVendorEmail: 'vendor@example.com',
  estimatedCost: 150.00
});
```

**Input Validation:**
- `status`: Optional, valid status enum
- `priority`: Optional, valid priority enum
- `assignedVendorEmail`: Optional, valid email format
- `vendorNotes`: Optional, max 1000 characters
- `estimatedCost`: Optional, non-negative number
- `actualCost`: Optional, non-negative number
- `completionNotes`: Optional, max 1000 characters

## Messaging API

### Get Messages
```typescript
// Get all messages for current user
const allMessages = await apiClient.getMessages();

// Get conversation with specific user
const conversation = await apiClient.getMessages('other-user-clerk-id');
```

### Send Message
```typescript
const message = await apiClient.sendMessage({
  recipientClerkId: 'recipient-id',
  content: 'Hello, how are you?',
  messageType: 'text',
  propertyId: 'prop-123' // Optional
});
```

**Input Validation:**
- `recipientClerkId`: Required
- `content`: Required, 1-1000 characters
- `messageType`: Optional, 'text' | 'image' | 'file'
- `attachmentUrl`: Optional, valid URL if provided
- `propertyId`: Optional, valid UUID

## File Storage API

### Upload File
```typescript
const result = await apiClient.uploadFile(
  'maintenance-images',  // bucket
  fileBlob,             // file data
  'image.jpg',          // filename
  'request-123'         // optional folder
);
```

**Storage Buckets:**
- `maintenance-images`: For maintenance request photos
- `voice-notes`: For audio recordings
- `property-images`: For property photos
- `documents`: For documents and files

**File Validation:**
- **Images**: JPEG, PNG, WebP (max 10MB)
- **Audio**: MP4, M4A, WAV (max 10MB)
- **General**: All files max 10MB

### Get Signed URL
```typescript
const signedUrl = await apiClient.getSignedUrl(
  'maintenance-images',
  'path/to/file.jpg'
);
```

### Delete File
```typescript
await apiClient.deleteFile(
  'maintenance-images',
  'path/to/file.jpg'
);
```

## AI Services API

### Analyze Maintenance Request
```typescript
const analysis = await apiClient.analyzeMaintenanceRequest(
  'The kitchen faucet is leaking constantly',
  ['image-url-1', 'image-url-2']
);
```

**Input:**
- `description`: Required, 1-2000 characters
- `images`: Optional array of image URLs

**Response:**
```typescript
interface AIAnalysis {
  classification: string;      // Issue type classification
  urgency: string;            // Recommended urgency level
  estimatedCost: number;      // Cost estimate
  recommendedActions: string[]; // Suggested next steps
  vendorType: string;         // Type of vendor needed
}
```

**Processing:**
- Uses Supabase Edge Function
- Integrates with OpenAI for analysis
- Validates user exists before processing

## Real-time Subscriptions

### Subscribe to Maintenance Requests
```typescript
const subscription = apiClient.subscribeToMaintenanceRequests((payload) => {
  console.log('Maintenance request updated:', payload);
});

// Cleanup
subscription.unsubscribe();
```

### Subscribe to Messages
```typescript
const subscription = apiClient.subscribeToMessages((payload) => {
  console.log('New message:', payload);
});
```

## Error Handling

### Error Types
```typescript
interface ApiError extends Error {
  status?: number;      // HTTP status code
  code?: string;        // Error code
  details?: any;        // Additional error details
}
```

### Common Error Responses

**Authentication Errors:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Insufficient permissions

**Validation Errors:**
- `400 Bad Request`: Invalid input data
- `422 Unprocessable Entity`: Validation failed

**Resource Errors:**
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource already exists

**Server Errors:**
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily down

### Error Handling Hooks

```typescript
import { useApiErrorHandling } from '../hooks/useErrorHandling';

const { handleApiError, errorState } = useApiErrorHandling();

try {
  await apiClient.someOperation();
} catch (error) {
  handleApiError(error, 'Operation context');
}
```

## Security Considerations

### Input Validation
All API methods include comprehensive validation:
- **Length limits**: Enforced on all text fields
- **Type validation**: Ensures correct data types
- **Sanitization**: HTML/script tag removal
- **File validation**: Type, size, and content checks

### Authentication
- **Clerk tokens**: Automatically included in requests
- **User context**: All operations validate user permissions
- **Session management**: Automatic token refresh

### Database Security
- **Row Level Security**: Protects data isolation (disabled for testing)
- **Parameterized queries**: Prevents SQL injection
- **User context**: Operations scoped to authenticated user

## Rate Limiting

**Current Status**: Not implemented  
**TODO**: Add rate limiting for:
- File uploads: 10 per minute
- API calls: 100 per minute
- Authentication attempts: 5 per minute

## API Client Architecture

### Service Layer
```
useSupabaseApiClient (Hook)
    ↓
SupabaseOnlyApiClient (Class)
    ↓
supabaseClient (Database Client)
    ↓
Supabase (Backend)
```

### Type Safety
- **Full TypeScript coverage**: All operations typed
- **Interface validation**: Runtime validation with TypeScript interfaces
- **Error typing**: Structured error responses

### Validation Pipeline
```
User Input
    ↓
Type Validation (TypeScript)
    ↓
Runtime Validation (validation.ts)
    ↓
Sanitization (helpers.ts)
    ↓
Database Operation
```

---

**Last Updated**: January 2025  
**API Version**: 1.0.0  
**Next Review**: [Set review date]

> **Note**: This API is designed for internal use by the React Native application. For external integrations, additional authentication and rate limiting would be required.