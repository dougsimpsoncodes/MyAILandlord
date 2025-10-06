# RLS Policy Violation Debug Report

## Problem Summary
Tenant users cannot create maintenance requests due to RLS policy violation on the `maintenance_requests` table.

## Error Details
```
Error: new row violates row-level security policy for table "maintenance_requests"
HTTP Status: 403
```

## Context from Logs
- **Clerk User ID**: `user_32D3tASWubEjlYfTrsjJKO2dl04`
- **Profile ID**: `71a2098e-afb6-4e24-82e7-e1ab4be57ee6`
- **User Role**: `tenant`
- **Property ID**: `ec4f8fe2-58ff-432c-bf61-7c81bfed340e`
- **Clerk Access Token**: Present and being used

## Request Data Being Inserted
```json
{
  "tenant_id": "71a2098e-afb6-4e24-82e7-e1ab4be57ee6",
  "property_id": "ec4f8fe2-58ff-432c-bf61-7c81bfed340e", 
  "title": "Kitchen Range/Stove: damaged",
  "description": "Location: Kitchen\nAsset: Range/Stove (General)\nIssue Type: damaged\nPriority: Medium\nDuration: just_noticed\nTiming: evenings",
  "priority": "medium"
}
```

## Code Location
- Error occurs in: `src/services/client.ts:196` 
- Called from: `src/screens/ReviewIssueScreen.tsx:286`
- Function: `createMaintenanceRequest`

## Authentication Status
- Clerk session is active and valid
- Supabase client has Clerk access token
- User profile exists with correct tenant role
- RLS context appears to be set correctly

## Previous Attempts
- Tried using the clerk-supabase-rls-agent but got interrupted
- Need to investigate current RLS policies on maintenance_requests table
- Need to verify tenant permissions for property access

## Files to Investigate
- `supabase/migrations/*` - Check RLS policies
- `src/services/client.ts` - Review maintenance request creation logic
- Database schema for `maintenance_requests` table
- Property-tenant relationship policies

## Questions for Investigation
1. What are the current RLS policies on the `maintenance_requests` table?
2. Is there a policy allowing tenants to insert maintenance requests?
3. Are there any foreign key constraints or relationship checks failing?
4. Is the tenant properly associated with the property they're trying to create a request for?
5. Are we missing any required fields in the insert statement?

## Expected Behavior
Tenants should be able to create maintenance requests for properties they have access to, with the request being associated with their tenant_id and the target property_id.