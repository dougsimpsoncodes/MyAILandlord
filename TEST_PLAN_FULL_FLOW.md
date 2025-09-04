# Full Landlord-Tenant Flow Test Plan

## Test Overview
This test plan covers the complete flow from landlord property creation through tenant maintenance request submission.

## Test Scope
1. Landlord creates a property
2. Landlord generates tenant invitation (property code)
3. Tenant signs up and enters property code
4. Tenant links to property
5. Tenant submits maintenance request
6. Verify data integrity and RLS policies

## Prerequisites
- [ ] Clean test database state
- [ ] Two test accounts (landlord and tenant)
- [ ] Mobile app running on simulator/device
- [ ] Supabase backend accessible
- [ ] Environment variables configured

## Test Execution Steps

### Phase 1: Setup & Preparation
1. **Clear existing test data**
   ```bash
   node scripts/load-test-data-safe.js
   ```

2. **Verify clean state**
   - Check profiles table
   - Check properties table
   - Check tenant_property_links table
   - Check maintenance_requests table

### Phase 2: Landlord Flow

#### Test Case 2.1: Landlord Property Creation
**Actor**: Landlord
**Steps**:
1. Sign in as landlord (use test account or create new)
2. Navigate to Property Management screen
3. Click "Add Property" button
4. Fill in property details:
   - Name: "Test Property 123"
   - Address: "123 Test Street, Test City, CA 90210"
   - Type: Apartment
   - Unit: "4B"
   - Bedrooms: 2
   - Bathrooms: 1
5. Submit property creation

**Expected Results**:
- Property appears in property list
- Property has unique ID
- Property is associated with landlord
- Property code is generated (6-character alphanumeric)

**Verification**:
```sql
SELECT * FROM properties WHERE name = 'Test Property 123';
SELECT property_code FROM properties WHERE name = 'Test Property 123';
```

#### Test Case 2.2: Generate Tenant Invitation
**Actor**: Landlord
**Steps**:
1. Select the created property
2. Click "Invite Tenant" button
3. View the generated property code
4. Copy/note the property code

**Expected Results**:
- Property code is displayed
- Code is 6 characters (alphanumeric)
- Code can be shared with tenant

### Phase 3: Tenant Flow

#### Test Case 3.1: Tenant Signup
**Actor**: Tenant
**Steps**:
1. Open app as new user
2. Click "Sign Up"
3. Enter email and password
4. Complete signup process

**Expected Results**:
- Tenant account created
- Profile created with role='tenant'
- Redirected to property code entry

**Verification**:
```sql
SELECT * FROM profiles WHERE email = 'tenant@test.com';
```

#### Test Case 3.2: Property Code Entry
**Actor**: Tenant
**Steps**:
1. On Property Code Entry screen
2. Enter the 6-character code from landlord
3. Submit code

**Expected Results**:
- Code validated successfully
- Tenant linked to property
- Navigation to tenant home screen
- Property details displayed

**Verification**:
```sql
SELECT * FROM tenant_property_links 
WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant@test.com');
```

### Phase 4: Maintenance Request Flow

#### Test Case 4.1: Submit Maintenance Request
**Actor**: Tenant
**Steps**:
1. Navigate to "Report Issue" screen
2. Fill in maintenance request:
   - Title: "Test Maintenance Request"
   - Description: "Testing the full flow"
   - Area: "Kitchen"
   - Priority: "Medium"
   - Add photo (optional)
3. Submit request

**Expected Results**:
- Request created with status='pending'
- Request linked to tenant and property
- Request appears in tenant's request list
- Landlord can see request

**Verification**:
```sql
SELECT * FROM maintenance_requests 
WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant@test.com')
ORDER BY created_at DESC LIMIT 1;
```

### Phase 5: End-to-End Verification

#### Test Case 5.1: RLS Policy Verification
**Steps**:
1. Verify tenant can only see their own requests
2. Verify landlord can see all property requests
3. Verify tenant cannot modify landlord data
4. Verify proper data isolation

**SQL Checks**:
```sql
-- Check tenant can only see their property
SET LOCAL request.jwt.claims.sub = 'tenant_clerk_id';
SELECT * FROM properties; -- Should only show linked property

-- Check landlord sees their properties
SET LOCAL request.jwt.claims.sub = 'landlord_clerk_id';
SELECT * FROM properties WHERE landlord_id = 'landlord_profile_id';

-- Check maintenance request visibility
SELECT * FROM maintenance_requests WHERE property_id IN 
  (SELECT id FROM properties WHERE landlord_id = 'landlord_profile_id');
```

## Test Data Requirements

### Test Accounts
1. **Landlord Account**
   - Email: landlord@test.com
   - Name: Test Landlord
   - Role: landlord

2. **Tenant Account**
   - Email: tenant@test.com
   - Name: Test Tenant
   - Role: tenant

## Success Criteria
- [ ] All test cases pass
- [ ] No RLS policy violations
- [ ] Data properly isolated between users
- [ ] Maintenance request visible to both tenant and landlord
- [ ] Property code flow works end-to-end

## Known Issues to Watch For
1. RLS policy violations on insert/update
2. Property code generation uniqueness
3. Clerk JWT token synchronization
4. Photo upload permissions
5. Navigation flow after signup

## Test Execution Log

### Test Run: [DATE]
**Environment**: Development
**Tester**: [Name]

#### Results:
- [ ] Phase 1: Setup ✓/✗
- [ ] Phase 2: Landlord Flow ✓/✗
- [ ] Phase 3: Tenant Flow ✓/✗
- [ ] Phase 4: Maintenance Request ✓/✗
- [ ] Phase 5: Verification ✓/✗

#### Issues Found:
1. [Issue description]
2. [Issue description]

#### Notes:
[Any additional observations]

## Automated Test Script
Location: `/Users/dougsimpson/Projects/MyAILandlord/scripts/test-full-flow.js`
(To be created)