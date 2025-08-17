# Clerk + Supabase Native Integration Implementation

## Overview
This document outlines the **native integration** approach for Clerk + Supabase, which is the recommended method as of 2025. The JWT template approach is deprecated.

## Key Changes from Previous Attempts

### ❌ OLD Approach (JWT Templates - Deprecated)
- Created JWT template in Clerk
- Used `getToken({ template: 'supabase' })`  
- Configured JWKS URL or JWT secret in Supabase
- Complex token management

### ✅ NEW Approach (Native Integration - Recommended)
- Configure Clerk as third-party auth provider in Supabase
- Use `session.getToken()` without template parameter
- Supabase handles JWT validation natively
- Simpler, more reliable integration

## Implementation Steps

### 1. Configure Clerk in Supabase Dashboard

**Critical Step - This enables the integration:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **Integrations** → **Supabase**
2. Click **Activate Supabase integration**
3. Copy your Clerk domain: `https://driven-alien-15.clerk.accounts.dev`

4. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/zxqhxjuwmkxevhkpqfzf/auth/providers)
5. Navigate to **Authentication** → **Providers**
6. Click **Add provider** → Select **Clerk** from the list
7. Enter your Clerk domain: `https://driven-alien-15.clerk.accounts.dev`
8. Click **Save**

### 2. Run Database Migration

Execute the SQL from `supabase/native-clerk-integration.sql` in your Supabase SQL editor. This:
- Creates tables with `clerk_user_id` defaulting to `auth.jwt()->>'sub'`
- Sets up RLS policies using `auth.jwt()->>'sub'` for user identification
- Removes old custom functions from previous attempts

### 3. Update Your Code

The native integration uses these new patterns:

```typescript
// ✅ NEW: Native integration
const client = createClient(url, key, {
  global: {
    fetch: async (url, options = {}) => {
      const token = await session?.getToken(); // No template parameter!
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
  },
});
```

### 4. Files Created/Updated

#### New Files:
- `src/hooks/useClerkSupabaseClient.ts` - Native integration hook
- `src/services/supabase/ClerkSupabaseClient.ts` - Client wrapper
- `src/components/ClerkSupabaseTest.tsx` - Test component
- `supabase/native-clerk-integration.sql` - Database setup

#### Updated Files:
- `src/hooks/useProfileSync.ts` - Uses native integration

### 5. Test the Integration

Add the test component temporarily to verify everything works:

```tsx
import { ClerkSupabaseTest } from './components/ClerkSupabaseTest';

// In your app...
<ClerkSupabaseTest />
```

Run all tests to verify:
1. JWT authentication (`auth.jwt()->>'sub'` returns Clerk user ID)
2. Profile CRUD operations work
3. RLS policies enforce correct access
4. Property operations respect ownership

## Troubleshooting

### Issue: JWT not validated (auth.jwt()->>'sub' returns null)

**Solution:** Clerk provider not configured in Supabase
- Verify Clerk is added as a provider in Supabase Authentication settings
- Ensure the Clerk domain is exactly: `https://driven-alien-15.clerk.accounts.dev`
- No trailing slashes or extra characters

### Issue: RLS policies blocking all access

**Solution:** JWT claims not matching
- Run `SELECT auth.jwt()->>'sub'` in SQL editor while authenticated
- Should return your Clerk user ID (e.g., `user_2abc...`)
- If null, Clerk provider is not configured correctly

### Issue: "role": "authenticated" missing

**Solution:** Activate Supabase integration in Clerk
- Go to Clerk Dashboard → Integrations → Supabase
- Click "Activate Supabase integration"
- This adds required claims to your session tokens

## Key Differences from JWT Template Approach

| Aspect | JWT Template (Old) | Native Integration (New) |
|--------|-------------------|------------------------|
| Token Generation | `getToken({ template: 'supabase' })` | `session.getToken()` |
| Supabase Config | Configure JWT secret/JWKS | Add Clerk as provider |
| Token Refresh | Manual management | Automatic |
| Complexity | High | Low |
| Maintenance | Requires template updates | Managed by Clerk/Supabase |

## Security Considerations

1. **RLS is Critical**: All tables must have RLS enabled
2. **User ID Validation**: Always use `auth.jwt()->>'sub'` in policies
3. **Default Values**: Set `clerk_user_id` to default to `auth.jwt()->>'sub'`
4. **Role Checking**: Use `TO authenticated` in all policies

## Next Steps After Integration

1. ✅ Remove old JWT template from Clerk (if exists)
2. ✅ Update all client code to use native integration
3. ✅ Test all CRUD operations
4. ✅ Verify RLS policies work correctly
5. ✅ Remove test components from production

## Resources

- [Clerk Native Integration Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party-auth)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

*Integration Type: Native (Recommended)*  
*Status: Ready for Implementation*  
*Last Updated: August 2025*