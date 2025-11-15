# Database Integration Fixes for Invite Link Flow

## Issues Found

### 1. **Critical RLS Policy Issue**
**Problem**: The `tenant_property_links` table had RLS enabled but only allowed landlords to insert records. This prevented tenants from accepting invite links.

**Root Cause**: The policy `"Landlords can insert property links"` only checked for landlord role:
```sql
CREATE POLICY "Landlords can insert property links" 
ON public.tenant_property_links FOR INSERT
WITH CHECK (
    property_id IN (
        SELECT id FROM public.properties
        WHERE landlord_id IN (/* landlord check only */)
    )
);
```

**Fix**: Created new policy allowing both landlords and tenants to insert:
```sql
CREATE POLICY "Users can insert property links" 
ON public.tenant_property_links FOR INSERT
WITH CHECK (
    -- Landlords can insert for their properties OR
    -- Tenants can insert for themselves
    ...
);
```

### 2. **Property Access Issue**
**Problem**: Unauthenticated users couldn't view basic property info for invite previews.

**Fix**: Created public view `property_invite_info` with only safe, basic property details.

### 3. **Authentication Context Issue**
**Problem**: The screen was mixing anonymous and authenticated Supabase client calls.

**Fix**: Updated to use proper authenticated Supabase client with RLS context.

## Files Changed

### 1. `/src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- Fixed property fetching to use authenticated client
- Updated database insertion to use proper RLS context
- Added proper error handling for duplicate links

### 2. `/supabase/migrations/20250902_fix_invite_link_flow.sql`
- New RLS policy for tenant_property_links
- Public view for property invite info
- Unique constraint to prevent duplicates

### 3. `/apply-invite-fix.js`
- Script to apply database fixes to remote Supabase instance

## How to Apply Fixes

1. **Apply database migration**:
   ```bash
   node apply-invite-fix.js
   ```

2. **Test the flow**:
   - Create property as landlord
   - Generate invite link
   - Accept invite as tenant
   - Verify property link is created

## Security Considerations

### What's Safe ✅
- Public view only exposes basic property info (name, address, type)
- RLS policies still enforce proper tenant-property relationships
- Unique constraint prevents duplicate links

### What to Monitor ⚠️
- Property invite info is publicly readable (by design for invite previews)
- Make sure no sensitive property data is added to the public view

## Testing Checklist

- [ ] Landlord can create properties
- [ ] Landlord can generate invite links
- [ ] Unauthenticated users can view property invite preview
- [ ] Tenants can accept invites and create property links
- [ ] Duplicate acceptance is handled gracefully
- [ ] RLS policies prevent unauthorized access

## Next Steps

1. Test the full invite link flow end-to-end
2. Consider adding email-based invites as fallback
3. Add analytics to track invite acceptance rates
4. Consider adding invite expiration for security