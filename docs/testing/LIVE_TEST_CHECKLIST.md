# Live Testing Checklist - Full Landlord-Tenant Flow

## Test Setup
- [ ] Expo server running (`npm start`)
- [ ] iPhone connected to same network
- [ ] Mac ready for landlord testing
- [ ] iPhone ready for tenant testing

## Quick Commands Reference
```bash
# Start Expo
npm start

# Clear test data and load fresh
node scripts/load-test-data-safe.js

# Check current users in database
psql $DATABASE_URL -c "SELECT id, clerk_user_id, role, name, email FROM profiles;"

# Check properties
psql $DATABASE_URL -c "SELECT id, name, property_code, landlord_id FROM properties;"

# Check tenant links
psql $DATABASE_URL -c "SELECT * FROM tenant_property_links;"

# Check maintenance requests
psql $DATABASE_URL -c "SELECT id, title, status, tenant_id, property_id FROM maintenance_requests ORDER BY created_at DESC;"
```

## Test Flow

### 📱 Device 1 (Mac) - LANDLORD ROLE

#### Step 1: Sign In as Landlord
- [ ] Open app in browser/simulator
- [ ] Sign in with landlord account
- [ ] Verify redirected to Property Management screen
- [ ] Note: Should see existing properties if any

#### Step 2: Create New Property
- [ ] Click "Add Property" button
- [ ] Enter property details:
  ```
  Name: Test Property [timestamp]
  Address: 123 Test St, Unit 5A, Los Angeles, CA 90210
  Type: Apartment
  Unit: 5A
  Bedrooms: 2
  Bathrooms: 1
  ```
- [ ] Submit property
- [ ] Verify property appears in list
- [ ] **IMPORTANT: Note the 6-character property code displayed**

Property Code: `______` (write it here)

---

### 📱 Device 2 (iPhone) - TENANT ROLE

#### Step 3: Sign Up as New Tenant
- [ ] Open Expo Go app
- [ ] Scan QR code from terminal
- [ ] On welcome screen, click "Sign Up"
- [ ] Create new account:
  ```
  Email: tenant[timestamp]@test.com
  Password: [secure password]
  Name: Test Tenant
  ```
- [ ] Complete signup

#### Step 4: Enter Property Code
- [ ] Should be redirected to Property Code Entry screen
- [ ] Enter the 6-character code from Step 2
- [ ] Submit code
- [ ] Verify successful link message
- [ ] Should navigate to Tenant Home screen

#### Step 5: Submit Maintenance Request
- [ ] From Home screen, tap "Report Issue"
- [ ] Fill in maintenance request:
  ```
  Title: Leaking Kitchen Faucet
  Description: The kitchen faucet is dripping constantly
  Area: Kitchen
  Priority: Medium
  ```
- [ ] Optional: Add photo
- [ ] Submit request
- [ ] Verify success message
- [ ] Check request appears in "My Requests" list

---

### 📱 Back to Device 1 (Mac) - LANDLORD VERIFICATION

#### Step 6: Verify Landlord Can See Request
- [ ] Refresh Property Management screen
- [ ] Select the property
- [ ] Navigate to maintenance requests
- [ ] Verify new request is visible
- [ ] Check request details match submission

---

## Database Verification Commands

After completing the flow, run these to verify:

```bash
# Check the new tenant profile
psql $DATABASE_URL -c "SELECT * FROM profiles WHERE email LIKE '%tenant%' ORDER BY created_at DESC LIMIT 1;"

# Check property was created with code
psql $DATABASE_URL -c "SELECT id, name, property_code FROM properties ORDER BY created_at DESC LIMIT 1;"

# Verify tenant-property link
psql $DATABASE_URL -c "SELECT tpl.*, p.name as property_name FROM tenant_property_links tpl JOIN properties p ON tpl.property_id = p.id ORDER BY tpl.created_at DESC LIMIT 1;"

# Check maintenance request
psql $DATABASE_URL -c "SELECT mr.*, p.name as property_name FROM maintenance_requests mr JOIN properties p ON mr.property_id = p.id ORDER BY mr.created_at DESC LIMIT 1;"
```

## Common Issues & Solutions

### Issue: Property code not working
- Check code is exactly 6 characters
- Verify no spaces before/after
- Check property exists in database
- Verify property_code column has value

### Issue: RLS Policy Violations
- Check user roles are set correctly
- Verify JWT token includes correct claims
- Check RLS policies are enabled

### Issue: Can't see maintenance requests
- Verify tenant_property_links exists
- Check property_id matches
- Verify tenant_id is correct

### Issue: Navigation problems
- Check role-based routing in AppNavigator
- Verify user role in context
- Check navigation stack

## Test Results

### Test Run Date: ___________

#### Success Checklist:
- [ ] Landlord can create property ✓/✗
- [ ] Property code generated ✓/✗
- [ ] Tenant can sign up ✓/✗
- [ ] Property code accepted ✓/✗
- [ ] Tenant linked to property ✓/✗
- [ ] Maintenance request submitted ✓/✗
- [ ] Landlord sees request ✓/✗
- [ ] No RLS violations ✓/✗

#### Issues Found:
1. 
2. 
3. 

#### Notes: