# Testing Navigation Guide - How to Access PropertyPhotosScreen

## 🚀 Quick Start - Getting to Photo Screen

### Prerequisites
1. Start the app: `npm start`
2. Press `i` for iOS Simulator or `a` for Android
3. Make sure you're logged in (Clerk authentication)

---

## 📱 Navigation Path to PropertyPhotosScreen

### Option 1: New Property Flow (Primary Path)
1. **Login to app** (if not already logged in)
2. **From Home/Dashboard**, look for:
   - "Add Property" button
   - "+" button
   - "Create New Property"
   - "Get Started" button
3. **PropertyBasicsScreen** (Step 1):
   - Fill in required fields:
     - Property Name (e.g., "Test Property")
     - Address
     - Property Type (House/Apartment/etc.)
   - Tap **"Continue to Photos"** button
4. **PropertyPhotosScreen** (Step 2) - YOU'RE HERE! ✅
   - Now you can test photo functionality

### Option 2: Direct Navigation (Developer Testing)
If you have access to developer menu or navigation testing:
1. Look for navigation drawer/menu
2. Find "Landlord" section
3. Select "PropertyPhotos" or "Add Asset"
4. May need to pass test data

### Option 3: Via Existing Property (If Implemented)
1. Go to "My Properties" or "Properties" tab
2. Select an existing property
3. Look for "Edit" or "Add Photos" option
4. Navigate to PropertyPhotosScreen

---

## 🔍 How to Find the Starting Point

### Look for these UI elements on main screen:
```
Common Button Labels:
- "Add Property"
- "New Property"
- "Create Property"
- "Add Your First Property"
- "Get Started"
- "+" (Plus icon)
- "Add Asset"

Common Locations:
- Bottom tab bar
- Floating action button (FAB)
- Top right corner
- Empty state center screen
- Dashboard cards
```

### If you see a Landlord Dashboard:
1. Look for property management section
2. Find "Add New Property" card or button
3. Start the property creation flow

### If you see a Tenant screen:
1. Switch to Landlord mode (if available)
2. Look for role switcher in profile/settings
3. Or logout and login as landlord account

---

## 🧭 Current App Structure

Based on the codebase, the navigation flow is:

```
App Entry
    ↓
AuthNavigator (Clerk Login)
    ↓
MainStack (After Authentication)
    ↓
LandlordStack
    ├── AddAssetScreen (Alternative entry)
    ├── PropertyBasicsScreen (Step 1) ← START HERE
    ├── PropertyPhotosScreen (Step 2) ← TEST THIS
    ├── RoomSelectionScreen (Step 3)
    └── ... (Other screens)
```

---

## 🎯 Specific Test Starting Points

### For PropertyPhotosScreen Testing:

1. **Fastest Path for Testing:**
   ```
   Login → Add Property/Asset → Fill Basic Info → Continue to Photos
   ```

2. **Test Data for PropertyBasicsScreen:**
   ```
   Property Name: "Test Property"
   Address: "123 Test St"
   City: "Test City"
   State: "CA"
   ZIP: "90210"
   Type: "Single Family Home"
   Bedrooms: 3
   Bathrooms: 2
   Square Feet: 1500
   ```

3. **Once on PropertyPhotosScreen:**
   - You'll see "Property Photos" header
   - "Add up to 5 exterior photos" subtitle
   - Progress bar showing "Step 2 of 8"
   - "Add Photos" button to start testing

---

## 🐛 Troubleshooting Navigation

### Can't find Add Property button?
- Check if you're logged in as Landlord
- Look for empty state message
- Check bottom navigation tabs
- Try pull-to-refresh on main screen

### Stuck on login?
- Make sure Clerk is configured
- Check .env file has credentials
- Try test account if available

### PropertyBasicsScreen won't continue?
- Ensure all required fields are filled
- Check for validation errors
- Address lookup might need valid format
- Try minimal required fields first

### App crashes on navigation?
- Check console for errors
- Ensure all dependencies installed: `npm install`
- Clear cache: `expo start -c`
- Restart Metro bundler

---

## 📲 Testing on Physical Device

1. **Using Expo Go:**
   - Scan QR code from terminal
   - Navigate same path as above

2. **Using Development Build:**
   - Install dev client on device
   - Connect to same network
   - Follow navigation path

---

## ✅ Quick Validation

You're on the right screen if you see:
- [ ] "Property Photos" title
- [ ] Progress indicator showing "Step 2 of 8"
- [ ] "Add Photos" button or camera icon
- [ ] "Skip" and "Continue to Rooms" buttons at bottom
- [ ] Photo grid area (empty initially)
- [ ] "0 of 5 photos" counter

---

## 🎬 Ready to Test!

Once you reach PropertyPhotosScreen, you can:
1. Tap "Add Photos" button
2. Choose "Take Photo" or "Choose from Gallery"
3. Start testing according to PROPERTY_PHOTOS_TEST_PLAN.md

---

## 💡 Pro Tips

- **Quick Reset:** Kill app and restart to clear state
- **Test Data:** Use consistent property data for reproducibility
- **Screenshots:** Take screenshots at each step for bug reports
- **Console Logs:** Keep terminal visible for error messages
- **Network:** Ensure stable connection for Supabase operations