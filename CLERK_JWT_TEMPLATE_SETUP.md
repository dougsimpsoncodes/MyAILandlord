# Clerk JWT Template Setup for Supabase

## Problem
The app is failing with error: `No JWT template exists with name: supabase`

This occurs when the code calls `getToken({ template: 'supabase' })` but no JWT template named "supabase" exists in your Clerk dashboard.

## Solution: Configure JWT Template in Clerk Dashboard

### Step 1: Access Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Select your application (MyAILandlord)
3. Navigate to **JWT Templates** in the left sidebar

### Step 2: Create New JWT Template
1. Click **"New template"**
2. Set the following:
   - **Name**: `supabase` (must match exactly)
   - **Token lifetime**: 60 seconds (recommended for security)
   - **Algorithm**: RS256

### Step 3: Configure Claims
Add the following claims to your JWT template:

```json
{
  "aud": "authenticated",
  "iss": "https://clerk.com",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "user_metadata": {
    "name": "{{user.full_name}}"
  },
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "role": "authenticated"
}
```

### Step 4: Set Supabase Project Reference
In the template settings, add your Supabase project reference:
- Find this in your Supabase dashboard under Settings → API
- It's the part before `.supabase.co` in your URL
- Example: If your URL is `https://xyzabc123.supabase.co`, your reference is `xyzabc123`

Add to claims:
```json
{
  "aud": "xyzabc123", // Replace with your actual Supabase project reference
  // ... other claims
}
```

### Step 5: Configure Supabase to Accept Clerk JWTs

#### In Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **Authentication** → **Providers**
3. Scroll to **JWT Configuration**
4. Add Clerk's public key:
   - Get this from Clerk Dashboard → **API Keys** → **JWKS Endpoint**
   - Or use the PEM public key from Clerk

#### Set JWT Secret in Supabase:
1. In Supabase SQL Editor, run:
```sql
-- Enable JWT verification
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-clerk-public-key-here';
```

### Step 6: Update Environment Variables
Ensure your `.env` file has:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # Your Clerk publishable key
CLERK_SECRET_KEY=sk_test_... # Your Clerk secret key (backend only)
EXPO_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Your Supabase anon key
```

### Step 7: Test the Configuration

1. In your browser console, test the JWT generation:
```javascript
// This should now work without 404
const token = await window.Clerk.session.getToken({ template: 'supabase' });
console.log('JWT Token:', token);
```

2. Verify token structure at https://jwt.io

## Alternative: Custom Claims Without Template

If you can't create a JWT template (free tier limitation), modify the code to use standard claims:

```typescript
// In useProfileSync.ts, change:
const t = await getToken({ template: 'supabase' })

// To:
const t = await getToken() // Uses default JWT without template
```

Then configure Supabase to accept standard Clerk JWTs without custom claims.

## Verification Steps

1. **Check Clerk Dashboard**:
   - JWT Templates section should show "supabase" template
   - Template should be active

2. **Check Supabase Dashboard**:
   - Authentication → Settings should show JWT configuration
   - JWT secret should match Clerk's public key

3. **Test in App**:
   - No more 404 errors on `/tokens/supabase`
   - Profile sync should work
   - API calls should authenticate properly

## Common Issues

### Issue: Template not appearing
- Ensure you saved the template in Clerk dashboard
- Template name must be exactly "supabase" (case-sensitive)

### Issue: JWT verification fails in Supabase
- Verify the public key is correctly configured
- Check that the `aud` claim matches your Supabase project

### Issue: Free tier limitations
- Clerk free tier may not support custom JWT templates
- Consider upgrading or using standard claims

## Resources
- [Clerk JWT Templates Documentation](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Supabase JWT Authentication](https://supabase.com/docs/guides/auth/jwt)
- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)