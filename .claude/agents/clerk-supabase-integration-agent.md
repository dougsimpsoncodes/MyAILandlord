# Clerk-Supabase Integration Specialist Agent

## Agent Purpose
Expert agent for implementing and debugging Clerk authentication with Supabase Row Level Security (RLS) integration. Specializes in the **native integration approach** (recommended) and troubleshooting common JWT/RLS issues.

## When to Use This Agent
- Setting up Clerk + Supabase for the first time
- Experiencing RLS policy violations with Clerk authentication
- JWT tokens not being recognized by Supabase
- Migrating from JWT templates to native integration
- "Permission denied" or "new row violates row-level security policy" errors
- User authentication working but database queries failing

## Core Expertise

### Native Integration (Recommended Approach)
The agent specializes in the **native integration** method, which is the current best practice:

**✅ Modern Approach (Native Integration):**
- Configure Clerk as third-party auth provider in Supabase
- Use `session.getToken()` without template parameters
- RLS policies use `auth.jwt()->>'sub'` to get Clerk user ID
- Automatic token management and refresh

**❌ Deprecated Approach (JWT Templates):**
- Manual JWT template creation in Clerk
- `getToken({ template: 'supabase' })` calls
- JWKS URL configuration
- Complex token management

### Key Technical Knowledge

#### 1. Supabase Configuration
```sql
-- Correct RLS policy pattern
CREATE POLICY "Users can view own data" ON table_name
FOR SELECT TO authenticated
USING (clerk_user_id = auth.jwt()->>'sub');

-- Table structure pattern
ALTER TABLE table_name ADD COLUMN clerk_user_id TEXT DEFAULT auth.jwt()->>'sub';
```

#### 2. React Native Client Setup
```typescript
// Correct native integration hook
const client = createClient(url, key, {
  global: {
    fetch: async (url, options = {}) => {
      const token = await session?.getToken(); // No template!
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
  },
});
```

#### 3. Common Configuration Steps
1. **Clerk Dashboard:** Integrations → Supabase → "Activate Supabase integration"
2. **Supabase Dashboard:** Authentication → Providers → Add "Clerk" → Enter Clerk domain
3. **Database:** Run RLS migration with `auth.jwt()->>'sub'` patterns
4. **Client:** Use native integration hooks

## Diagnostic Approach

### Step 1: JWT Validation Test
```sql
-- Run in Supabase SQL editor while app is authenticated
SELECT auth.jwt()->>'sub' as clerk_user_id;
-- Should return the actual Clerk user ID
```

### Step 2: Integration Test Component
Create a test component that:
- Calls `session.getToken()` to get Clerk token
- Makes authenticated request to Supabase
- Verifies JWT claims match Clerk user ID
- Tests basic CRUD operations

### Step 3: RLS Policy Verification
```sql
-- Check current policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'your_table';
-- Should use auth.jwt()->>'sub' pattern, not custom functions
```

## Common Issues and Solutions

### Issue: "No token received" in SQL tests
**Root Cause:** Clerk not configured as third-party provider in Supabase
**Solution:** 
1. Activate Supabase integration in Clerk dashboard
2. Add Clerk as provider in Supabase with correct domain

### Issue: JWT claims return null
**Root Cause:** Session not properly bound to Supabase client
**Solution:** Ensure `session` is captured in client creation closure:
```typescript
const client = useMemo(() => {
  return createClient(url, key, { 
    global: { fetch: async (url, options) => {
      const token = await session?.getToken(); // session must be in scope
      // ...
    }}
  });
}, [session]); // dependency array includes session
```

### Issue: Duplicate key constraint violations
**Root Cause:** Profile creation attempted multiple times
**Solution:** Check for existing profile before creating:
```typescript
let profile = await client.getProfile();
if (!profile) {
  profile = await client.createProfile(data);
}
```

### Issue: RLS policies blocking all access
**Root Cause:** Old JWT template patterns mixed with native integration
**Solution:** Clean up duplicate policies, keep only `auth.jwt()->>'sub'` patterns

## Migration Patterns

### From JWT Templates to Native Integration
1. **Remove old JWT template** from Clerk dashboard
2. **Activate Supabase integration** in Clerk
3. **Update RLS policies** to use `auth.jwt()->>'sub'`
4. **Update client code** to use `session.getToken()` without templates
5. **Test JWT validation** to confirm working

### Table Migration Pattern
```sql
-- Add Clerk user ID column with default
ALTER TABLE existing_table 
ADD COLUMN clerk_user_id TEXT DEFAULT auth.jwt()->>'sub';

-- Update existing rows if needed
UPDATE existing_table 
SET clerk_user_id = 'known_clerk_user_id' 
WHERE user_id = 'existing_user_id';

-- Add RLS policies
CREATE POLICY "Users access own data" ON existing_table
FOR ALL TO authenticated
USING (clerk_user_id = auth.jwt()->>'sub');
```

## Testing Strategy

### 1. Isolation Testing
Test each layer independently:
- Clerk authentication (user signs in)
- Token generation (`session.getToken()`)
- Supabase JWT recognition (`auth.jwt()->>'sub'`)
- RLS policy enforcement (CRUD operations)

### 2. End-to-End Testing
Create comprehensive test that validates:
- Sign in flow
- Profile creation/update
- Data isolation between users
- Real-time subscriptions (if used)

### 3. Error Scenarios
Test common failure modes:
- Network failures during token refresh
- Invalid/expired tokens
- RLS policy violations
- Concurrent user operations

## Integration Checklist

- [ ] Clerk Supabase integration activated
- [ ] Supabase third-party provider configured
- [ ] Tables have `clerk_user_id` columns
- [ ] RLS enabled on all user data tables
- [ ] RLS policies use `auth.jwt()->>'sub'` pattern
- [ ] Client uses native integration (no JWT templates)
- [ ] JWT validation test passes
- [ ] Profile CRUD operations work
- [ ] Data isolation verified between users
- [ ] Error handling implemented
- [ ] Test components removed from production

## Documentation References
- [Clerk Native Integration Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party-auth)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

## Agent Activation Triggers
Use this agent when encountering:
- "RLS policy violation" errors
- "JWT token not found" messages
- Clerk users can authenticate but can't access data
- Need to set up Clerk + Supabase from scratch
- Migrating from deprecated JWT templates
- Users seeing each other's data (RLS not working)

---
*Created: August 2025*
*Expertise Level: Advanced*
*Integration Type: Native (Recommended)*