# Clerk + Supabase Integration Setup Guide

This guide follows the official Clerk documentation for integrating with Supabase.

## Prerequisites
- Clerk account with your app configured
- Supabase project
- React Native/Expo application

## Step-by-Step Setup

### 1. Configure Clerk JWT Template

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **JWT Templates**
3. Click **New template** → Select **Supabase** preset (or create blank)
4. Name it exactly: `supabase`
5. Set **Lifetime**: 60 seconds (for security)
6. Use these claims:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "phone": "{{user.primary_phone_number.phone_number}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "name": "{{user.full_name}}"
  }
}
```

7. **IMPORTANT**: Copy the **Public Key** from the template (you'll need this for Supabase)

### 2. Configure Supabase to Accept Clerk JWTs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Authentication**
4. Find **JWT Configuration** section
5. Set the **JWT Secret** to your Clerk public key:
   - Paste the entire public key including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`

### 3. Set Up Database and RLS

Run the SQL from `supabase/clerk-integration-setup.sql` in your Supabase SQL editor. This will:
- Create the `auth.user_id()` function to extract Clerk user ID from JWT
- Set up the profiles table
- Configure RLS policies that use the Clerk user ID

### 4. Update Your React Native Code

Use the provided hooks in `src/hooks/useClerkSupabase.ts`:

```tsx
import { useClerkSupabase, useSupabaseProfile } from './hooks/useClerkSupabase';

function MyComponent() {
  const { supabase, isAuthenticated } = useClerkSupabase();
  const { profile, loading, updateProfile } = useSupabaseProfile();

  if (!isAuthenticated) {
    return <Text>Please sign in</Text>;
  }

  if (loading) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <View>
      <Text>Welcome, {profile?.name}</Text>
      <Button 
        title="Update Name" 
        onPress={() => updateProfile({ name: 'New Name' })} 
      />
    </View>
  );
}
```

### 5. Environment Variables

Ensure these are set in your `.env`:

```bash
# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://[project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Testing the Integration

1. Sign in with Clerk
2. Check if profile is automatically created
3. Test CRUD operations on your profile
4. Verify RLS policies are working (users can only see their own data)

## Troubleshooting

### JWT Not Validated
- Ensure JWT template is named exactly `supabase`
- Verify the public key is correctly pasted in Supabase
- Check that claims include `"aud": "authenticated"`

### RLS Policies Failing
- Run `SELECT auth.user_id()` in Supabase SQL editor while authenticated
- Should return your Clerk user ID
- If NULL, JWT isn't being passed correctly

### Profile Not Creating
- Check browser console for errors
- Ensure `clerk_user_id` is being set to `user.id` from Clerk
- Verify RLS INSERT policy allows `auth.user_id() = clerk_user_id`

## Key Differences from Standard Supabase Auth

1. **User IDs**: Use Clerk user IDs (not Supabase UUIDs)
2. **Auth Function**: Use `auth.user_id()` (custom) not `auth.uid()`
3. **Token Provider**: Clerk provides JWTs, not Supabase
4. **Profile Creation**: Must be done manually after Clerk sign-up

## Security Best Practices

1. ✅ Always use RLS policies
2. ✅ Keep JWT lifetime short (60 seconds)
3. ✅ Never expose service role key
4. ✅ Validate all user inputs
5. ✅ Use `authenticated` role in RLS policies

## Next Steps

1. Implement webhook sync between Clerk and Supabase
2. Add organization/team support if needed
3. Set up real-time subscriptions with proper auth
4. Implement role-based access control (RBAC)

## Resources

- [Official Clerk + Supabase Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Example Repository](https://github.com/clerk/clerk-supabase-nextjs)