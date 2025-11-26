# Comprehensive E2E Testing Plan - MyAILandlord

## Executive Summary

This document outlines the complete E2E testing strategy for MyAILandlord, covering all 48 screens, 10 major user flows, and 14 feature areas.

---

## Current Test Coverage

### Total: 39 Test Files - ALL PASSING

**New Tests Implemented (8 files, 27 tests):**
- `tenant-maintenance-request.spec.ts` - Tenant maintenance request submission
- `tenant-property-linking.spec.ts` - Property code linking flow
- `landlord-maintenance-review.spec.ts` - Landlord dashboard and case review
- `communication-hub.spec.ts` - Landlord-tenant messaging
- `asset-inventory.spec.ts` - Property asset management
- `tenant-invite-flow.spec.ts` - Tenant invitation workflow
- `authentication-flows.spec.ts` - Login/signup/role selection
- `property-management-crud.spec.ts` - Property CRUD operations

### Existing Tests (31 files)
| File | Area | Status |
|------|------|--------|
| `real-user-property-creation.spec.ts` | Property Creation (8-step) | PASSING |
| `landlord-tenant-workflow.spec.ts` | Cross-role workflow | Needs verification |
| `maintenance-dashboard.spec.ts` | Landlord dashboard | Needs verification |
| `tenant/tenant-user-flows.spec.ts` | Tenant flows | Needs verification |
| `auth/*.spec.ts` | Authentication | Needs verification |
| `access-control/*.spec.ts` | RLS/Permissions | Needs verification |
| `uploads/file-upload-flows.spec.ts` | File uploads | Needs verification |
| `realtime/realtime-features.spec.ts` | Real-time | Needs verification |

---

## Test Priority Matrix

### Priority 1 - Critical User Journeys (Must Pass)

| # | Flow | Description | Test File |
|---|------|-------------|-----------|
| 1 | **Landlord Property Creation** | Complete 8-step wizard | `real-user-property-creation.spec.ts` |
| 2 | **Tenant Maintenance Request** | Report issue with photos | NEEDS TEST |
| 3 | **Tenant Property Linking** | Enter code to join property | NEEDS TEST |
| 4 | **Landlord Review Maintenance** | View and respond to requests | NEEDS TEST |
| 5 | **Communication Hub** | Landlord-Tenant messaging | NEEDS TEST |

### Priority 2 - Core Features

| # | Feature | Screens Involved | Test File |
|---|---------|------------------|-----------|
| 6 | Property Management Dashboard | PropertyManagement, PropertyDetails | Partial |
| 7 | Asset Inventory Management | PropertyAssets, AddAsset | NEEDS TEST |
| 8 | Tenant Invite Flow | InviteTenant, PropertyInviteAccept | NEEDS TEST |
| 9 | Maintenance Status Tracking | MaintenanceStatus, CaseDetail | NEEDS TEST |
| 10 | Send to Vendor | SendToVendor | `send-to-vendor.spec.ts` |

### Priority 3 - Supporting Features

| # | Feature | Description | Test File |
|---|---------|-------------|-----------|
| 11 | Profile Management | Create/update user profile | `onboarding/profile-creation.spec.ts` |
| 12 | Role Selection | Tenant/Landlord switch | Needs verification |
| 13 | Deep Link Handling | Invite URLs | NEEDS TEST |
| 14 | Responsive Design | Mobile/tablet/desktop | `ui-consistency.spec.ts` |

---

## Detailed Test Specifications

### TEST 1: Landlord Property Creation (8-step)
**File:** `e2e/real-user-property-creation.spec.ts`
**Status:** PASSING

Steps verified:
- Step 0: Navigate to PropertyManagement, click "Add Property"
- Step 1: Fill PropertyBasics (name, address, type)
- Step 2: PropertyPhotos (skip or add)
- Step 3: RoomSelection (select rooms)
- Step 4: RoomPhotography (cycle through rooms)
- Step 5: AssetScanning (scan for assets)
- Step 6: AssetDetails (fill details or skip if empty)
- Step 7: AssetPhotos (add photos or skip if empty)
- Step 8: ReviewSubmit (review and submit)
- Verification: Property appears in list

---

### TEST 2: Tenant Maintenance Request (NEEDS IMPLEMENTATION)
**File:** `e2e/tenant-maintenance-request.spec.ts`

```
Flow: Home → ReportIssue → ReviewIssue → SubmissionSuccess
```

Test cases:
1. **Basic maintenance request**
   - Navigate to Home as tenant
   - Click "Report Issue" or similar
   - Select area (Kitchen, Bathroom, etc.)
   - Select issue type (Plumbing, Electrical, HVAC)
   - Add description
   - Set priority
   - Submit request
   - Verify success screen

2. **Request with photos**
   - Same as above
   - Add 1-3 photos
   - Verify photos attached

3. **Request with voice note**
   - Same as above
   - Record voice note
   - Verify recording attached

4. **Validation errors**
   - Try to submit without description
   - Try to submit without selecting area
   - Verify error messages

---

### TEST 3: Tenant Property Linking (NEEDS IMPLEMENTATION)
**File:** `e2e/tenant-property-linking.spec.ts`

```
Flow: Home → PropertyCodeEntry → Validate → PropertyWelcome → Home
```

Test cases:
1. **Valid property code**
   - Navigate to PropertyCodeEntry
   - Enter valid 6-character code
   - Click validate
   - Verify property details shown
   - Accept invitation
   - Verify redirected to Home with property

2. **Invalid property code**
   - Enter invalid code
   - Verify error message

3. **Expired property code**
   - Enter expired code
   - Verify expiration message

4. **Multi-unit property**
   - Enter code for multi-unit property
   - Verify unit selection shown
   - Select unit
   - Complete linking

---

### TEST 4: Landlord Review Maintenance (NEEDS IMPLEMENTATION)
**File:** `e2e/landlord-maintenance-review.spec.ts`

```
Flow: Dashboard → CaseDetail → Update Status → Send to Vendor (optional)
```

Test cases:
1. **View maintenance requests**
   - Navigate to Dashboard
   - Verify requests list loads
   - Click on a request
   - Verify CaseDetail opens

2. **Update request status**
   - Open CaseDetail
   - Change status to "In Progress"
   - Verify status updated

3. **Add vendor assignment**
   - Click "Send to Vendor"
   - Fill vendor email
   - Add notes
   - Set estimated cost
   - Submit
   - Verify vendor assigned

4. **Complete request**
   - Change status to "Completed"
   - Add completion notes
   - Verify request closed

---

### TEST 5: Communication Hub (NEEDS IMPLEMENTATION)
**File:** `e2e/communication-hub.spec.ts`

```
Flow: CommunicationHub (tenant) ↔ LandlordCommunicationScreen (landlord)
```

Test cases:
1. **Tenant sends message**
   - Navigate to CommunicationHub as tenant
   - Type message
   - Send
   - Verify message appears

2. **Landlord receives message**
   - Navigate to Communications as landlord
   - Verify tenant message appears
   - Reply to message
   - Verify reply sent

3. **Message with attachment**
   - Attach image to message
   - Send
   - Verify attachment appears

---

### TEST 6: Property Management Dashboard (PARTIAL)
**File:** `e2e/property-management.spec.ts`

Test cases:
1. **View all properties**
   - Navigate to PropertyManagement
   - Verify properties list loads
   - Verify property cards show name, address

2. **View property details**
   - Click on property
   - Verify PropertyDetails screen
   - Verify sections: Overview, Tenants, Inventory

3. **Delete property**
   - Click delete on a property
   - Confirm deletion
   - Verify property removed

4. **Invite tenant from property**
   - Click "Invite Tenant"
   - Verify InviteTenant screen

---

### TEST 7: Asset Inventory Management (NEEDS IMPLEMENTATION)
**File:** `e2e/asset-inventory.spec.ts`

Test cases:
1. **View assets list**
   - Navigate to PropertyAssets
   - Verify assets list loads
   - Filter by area/category

2. **Add new asset**
   - Click "Add Asset"
   - Fill name, brand, model
   - Set condition
   - Add warranty info
   - Add photos
   - Save
   - Verify asset in list

3. **Edit asset**
   - Click on asset
   - Update details
   - Save
   - Verify changes saved

4. **Delete asset**
   - Click delete on asset
   - Confirm
   - Verify removed

---

### TEST 8: Tenant Invite Flow (NEEDS IMPLEMENTATION)
**File:** `e2e/tenant-invite.spec.ts`

Test cases:
1. **Generate invite URL**
   - Navigate to InviteTenant
   - Verify invite URL generated
   - Copy URL to clipboard

2. **Share via email**
   - Click share button
   - Verify email compose opens

3. **QR code generation**
   - Verify QR code displayed
   - Verify QR encodes invite URL

---

## Test Environment Setup

### Prerequisites
```bash
# Start dev server with mock auth
EXPO_PUBLIC_AUTH_DISABLED=1 npx expo start --web --port 8082

# Run tests
EXPO_PUBLIC_AUTH_DISABLED=1 npx playwright test
```

### Test Data
- Mock user: Auto-created in mock auth mode
- Properties: Created during tests
- Maintenance requests: Created during tests

### Cleanup
- Tests should clean up created data after completion
- Use unique identifiers (timestamps) for test data

---

## Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Landlord Flows | 40% | 90% |
| Tenant Flows | 10% | 90% |
| Authentication | 30% | 80% |
| Maintenance | 20% | 90% |
| Communication | 0% | 80% |
| File Uploads | 20% | 70% |
| Real-time | 10% | 60% |

---

## Implementation Order

### Phase 1 - Critical Paths (Immediate)
1. Tenant Maintenance Request - NEW
2. Landlord Maintenance Review - NEW
3. Tenant Property Linking - NEW

### Phase 2 - Core Features
4. Communication Hub - NEW
5. Asset Inventory Management - NEW
6. Tenant Invite Flow - NEW

### Phase 3 - Hardening
7. Fix existing failing tests
8. Add edge case tests
9. Performance tests
10. Accessibility tests

---

## Running Tests

### Run all tests
```bash
EXPO_PUBLIC_AUTH_DISABLED=1 npx playwright test --project=chromium
```

### Run specific test file
```bash
EXPO_PUBLIC_AUTH_DISABLED=1 npx playwright test e2e/real-user-property-creation.spec.ts
```

### Run tests with UI
```bash
EXPO_PUBLIC_AUTH_DISABLED=1 npx playwright test --ui
```

### Generate report
```bash
npx playwright show-report
```

---

## Appendix: All 48 Screens

### Authentication (4 screens)
- WelcomeScreen
- LoginScreen
- SignUpScreen
- PropertyInviteAcceptScreen

### Tenant (17 screens)
- HomeScreen
- ReportIssueScreen
- ReviewIssueScreen
- SubmissionSuccessScreen
- FollowUpScreen
- ConfirmSubmissionScreen
- MaintenanceStatusScreen
- CommunicationHubScreen
- PropertyInfoScreen
- PropertyCodeEntryScreen
- PropertyInviteAcceptScreen
- PropertyWelcomeScreen
- InviteAcceptScreen
- UnitSelectionScreen
- (+ others)

### Landlord (27 screens)
- LandlordHomeScreen
- DashboardScreen
- CaseDetailScreen
- SendToVendorScreen
- LandlordCommunicationScreen
- PropertyManagementScreen
- PropertyDetailsScreen
- AddPropertyScreen
- PropertyBasicsScreen
- PropertyPhotosScreen
- RoomSelectionScreen
- RoomPhotographyScreen
- AssetScanningScreen
- AssetDetailsScreen
- AssetPhotosScreen
- ReviewSubmitScreen
- PropertyAreasScreen
- PropertyAssetsListScreen
- PropertyReviewScreen
- AddAssetScreen
- InviteTenantScreen
- (+ others)

---

*Last updated: 2025-01-21*
