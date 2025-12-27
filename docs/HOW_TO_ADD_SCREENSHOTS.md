# How to Add More Screenshots to Documentation

The automated screenshot capture got us 3 onboarding screens. Here's how to easily add more:

## Quick Manual Method

### 1. Login to the App
Open http://localhost:8081 and login with test credentials:
- **Landlord**: landlord-doc@myailandlord.com / TestDoc2025!
- **Tenant**: tenant-doc@myailandlord.com / TestDoc2025!

### 2. Capture Screenshots
On any screen you want to document:
- Open browser DevTools (F12)
- Device mode (Cmd/Ctrl + Shift + M)
- Set viewport to 1280x720
- Screenshot the screen (Cmd/Ctrl + Shift + P → "Capture screenshot")

### 3. Save Screenshot
Save to: `docs/screenshots/screen-name.png`

Naming convention:
- `landlord-home.png`
- `tenant-property-details.png`
- `landlord-requests-list.png`
- `error-login-failed.png`

### 4. Create Metadata File
Create `docs/metadata/screen-name.json`:

```json
{
  "screenName": "landlord-home",
  "timestamp": "2025-12-26T12:00:00.000Z",
  "url": "http://localhost:8081/landlord/home",
  "title": "Landlord Home",
  "flow": "Landlord Dashboard",
  "role": "landlord",
  "purpose": "Main landlord dashboard showing properties and maintenance requests"
}
```

### 5. Regenerate Documentation
```bash
node scripts/build-documentation-html.js
open docs/COMPLETE_APP_DOCUMENTATION.html
```

## Priority Screens to Capture

### Landlord Screens (Authenticated)
1. ✅ `landlord-home` - Dashboard with properties
2. ✅ `landlord-properties-list` - All properties
3. ✅ `landlord-property-details` - Single property view
4. ✅ `landlord-property-areas` - Property areas list
5. ✅ `landlord-requests-list` - Maintenance requests
6. ✅ `landlord-request-details` - Single request view
7. ✅ `landlord-messages` - Message inbox
8. ✅ `landlord-profile` - Profile settings

### Tenant Screens (Authenticated)
1. ✅ `tenant-home` - Dashboard with property
2. ✅ `tenant-property-info` - Property details
3. ✅ `tenant-report-issue` - Create maintenance request
4. ✅ `tenant-requests-list` - Request history
5. ✅ `tenant-messages` - Message inbox
6. ✅ `tenant-profile` - Profile settings

### Error States
1. ✅ `error-login-invalid` - Invalid credentials
2. ✅ `error-form-validation` - Form errors
3. ✅ `error-network` - Network failure

### Empty States
1. ✅ `landlord-no-properties` - No properties yet
2. ✅ `landlord-no-requests` - No requests
3. ✅ `tenant-no-requests` - No requests
4. ✅ `messages-empty` - No messages

## Tips

- **Use the seeded test data**: Both accounts have realistic data (properties, requests, messages)
- **Clear data for empty states**: Delete test data to capture empty states
- **Consistent viewport**: Always use 1280x720 for consistency
- **Name descriptively**: Use clear names like `landlord-add-property-form` not `screen-23`

## Automation Script Status

The Playwright automation script (`scripts/generate-app-documentation.js`) works but has limitations with React Native Web. You can improve it by:

1. Using direct URL navigation instead of clicking through flows
2. Adding auth state management to stay logged in
3. Using more specific data-testid attributes in components

Current coverage: **3 screens** (onboarding flow)
Target coverage: **30+ screens** (core flows + edge cases)
