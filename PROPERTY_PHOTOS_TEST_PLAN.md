# PropertyPhotosScreen Testing Plan

## 📋 Test Overview
Comprehensive testing plan for the PropertyPhotosScreen implementation including camera integration, photo management, and user workflows.

## 🎯 Testing Objectives
- Validate all photo capture and management features
- Ensure proper error handling and edge cases
- Verify responsive design across devices
- Confirm data persistence and state management
- Test user experience and accessibility

---

## 1️⃣ Camera Functionality Tests

### Test 1.1: Camera Permission Request
**Steps:**
1. Navigate to PropertyPhotosScreen
2. Tap "Add Photos" button
3. Select "Take Photo"
4. Observe permission dialog

**Expected Result:**
- Camera permission dialog appears
- Approving grants access to camera
- Denying shows appropriate error message

### Test 1.2: Photo Capture
**Steps:**
1. Open camera via "Take Photo"
2. Take a photo
3. Confirm or retake photo
4. Save photo

**Expected Result:**
- Camera opens successfully
- Photo preview shows after capture
- Photo appears in grid after confirmation
- Photo counter updates (1 of 5)

### Test 1.3: Camera Cancellation
**Steps:**
1. Open camera
2. Cancel without taking photo

**Expected Result:**
- Returns to screen without error
- No photo added to grid
- UI remains stable

---

## 2️⃣ Gallery Selection Tests

### Test 2.1: Single Photo Selection
**Steps:**
1. Tap "Add Photos"
2. Select "Choose from Gallery"
3. Select one photo
4. Confirm selection

**Expected Result:**
- Gallery opens with photo picker
- Selected photo appears in grid
- Photo counter updates correctly

### Test 2.2: Multiple Photo Selection
**Steps:**
1. Open gallery with 0 photos added
2. Select 3 photos at once
3. Confirm selection

**Expected Result:**
- All 3 photos appear in grid
- Photos display in selection order
- Counter shows "3 of 5 photos"
- Complete badge appears (✓ Complete)

### Test 2.3: Maximum Photo Limit
**Steps:**
1. Add 5 photos (maximum)
2. Try to add more photos

**Expected Result:**
- "Add Photos" button changes to "Maximum photos reached (5)"
- Cannot add additional photos
- Existing photos remain accessible

### Test 2.4: Partial Selection (Exceeding Limit)
**Steps:**
1. Have 3 photos already added
2. Try to select 4 more from gallery

**Expected Result:**
- Alert: "Only 2 photos can be added. 2 photos were not added."
- Only first 2 photos are added
- Total becomes 5 photos

---

## 3️⃣ Photo Management Tests

### Test 3.1: Photo Deletion
**Steps:**
1. Add 3 photos
2. Tap delete (X) button on photo #2
3. Confirm deletion

**Expected Result:**
- Confirmation dialog appears
- Photo removed from grid
- Remaining photos stay in place
- Counter updates to "2 of 5 photos"

### Test 3.2: Photo Preview
**Steps:**
1. Add multiple photos
2. Tap on any photo

**Expected Result:**
- Full-screen preview opens
- Photo displays at full resolution
- Shows photo info (dimensions, size, timestamp)
- Navigation arrows visible for multiple photos

### Test 3.3: Preview Navigation
**Steps:**
1. Open preview with 3+ photos
2. Swipe or tap arrows to navigate
3. Test wrap-around at ends

**Expected Result:**
- Smooth navigation between photos
- Counter shows "2 of 3" etc.
- Navigation arrows hide at first/last photo

### Test 3.4: Photo Replacement
**Steps:**
1. Open photo in preview
2. Tap "Replace" button
3. Choose new photo source
4. Select replacement photo

**Expected Result:**
- Original photo replaced with new one
- Grid updates immediately
- Preview closes after replacement

---

## 4️⃣ Data Persistence Tests

### Test 4.1: Auto-Save Functionality
**Steps:**
1. Add 2 photos
2. Wait 2 seconds
3. Check save indicator

**Expected Result:**
- "Saving..." indicator appears briefly
- Changes to "All changes saved ✓"
- Draft updated in background

### Test 4.2: Navigation Persistence
**Steps:**
1. Add photos
2. Navigate back to PropertyBasics
3. Return to PropertyPhotos

**Expected Result:**
- Photos remain in grid
- Same order preserved
- Counter shows correct count

### Test 4.3: App Restart Persistence
**Steps:**
1. Add photos
2. Kill app completely
3. Reopen and navigate to screen

**Expected Result:**
- Photos restored from draft
- All photos display correctly
- Can continue adding photos

---

## 5️⃣ Validation & Error Tests

### Test 5.1: Invalid Photo Format
**Steps:**
1. Try selecting non-image file (if possible)
2. Observe error handling

**Expected Result:**
- File rejected with error message
- "Unsupported format. Use JPEG or PNG."

### Test 5.2: Large File Handling
**Steps:**
1. Select photo > 5MB
2. Observe compression

**Expected Result:**
- Photo automatically compressed
- "Compressed" badge appears
- File size reduced below 5MB

### Test 5.3: Network Error Simulation
**Steps:**
1. Add photos
2. Turn off network
3. Try to continue

**Expected Result:**
- Local operations continue working
- Save indicator shows appropriate status
- Can still manage photos offline

---

## 6️⃣ Navigation Flow Tests

### Test 6.1: Continue Button
**Steps:**
1. Add at least 1 photo
2. Tap "Continue to Rooms"

**Expected Result:**
- Navigates to RoomSelection screen
- Photos saved to propertyData
- Progress bar updates

### Test 6.2: Skip Button
**Steps:**
1. Don't add any photos
2. Tap "Skip"
3. Confirm skip dialog

**Expected Result:**
- Warning dialog appears
- Confirming navigates forward
- propertyData.photos is empty array

### Test 6.3: Back Navigation
**Steps:**
1. Add photos
2. Tap back button
3. Return to screen

**Expected Result:**
- Returns to PropertyBasics
- Photos preserved on return
- No data loss

---

## 7️⃣ UI/UX Tests

### Test 7.1: Progress Indicator
**Steps:**
1. Observe progress bar with 0 photos
2. Add photos incrementally
3. Check progress updates

**Expected Result:**
- Base: 12.5% (PropertyBasics complete)
- +2.5% per photo (up to 25% total)
- Time estimate updates accordingly

### Test 7.2: Loading States
**Steps:**
1. Open camera (observe loading)
2. Open gallery (observe loading)
3. Process large photo

**Expected Result:**
- "Opening Camera..." indicator
- "Loading Photos..." indicator
- Smooth transitions, no UI freezing

### Test 7.3: Responsive Design
**Steps:**
1. Test on phone (portrait/landscape)
2. Test on tablet
3. Test on desktop (if applicable)

**Expected Result:**
- Grid adapts: 2 columns (mobile), 3 columns (tablet)
- Buttons remain accessible
- Text remains readable

---

## 8️⃣ Accessibility Tests

### Test 8.1: Screen Reader
**Steps:**
1. Enable VoiceOver/TalkBack
2. Navigate all UI elements
3. Perform photo operations

**Expected Result:**
- All buttons have proper labels
- Photo count announced
- Actions confirmed verbally

### Test 8.2: Touch Targets
**Steps:**
1. Test all buttons/controls
2. Verify hit areas

**Expected Result:**
- Minimum 44x44pt touch targets
- Adequate spacing between controls
- Easy to tap without errors

---

## 9️⃣ Edge Cases

### Test 9.1: Rapid Actions
**Steps:**
1. Quickly add/delete photos
2. Rapidly tap buttons
3. Quick navigation

**Expected Result:**
- No crashes or freezes
- Actions queue properly
- UI remains responsive

### Test 9.2: Memory Management
**Steps:**
1. Add 5 high-resolution photos
2. Navigate between screens
3. Monitor app performance

**Expected Result:**
- No memory warnings
- Smooth performance
- Photos load efficiently

### Test 9.3: Interruption Handling
**Steps:**
1. Receive phone call during camera
2. Switch apps during gallery selection
3. Lock screen during operations

**Expected Result:**
- Graceful recovery
- No data loss
- Operations can resume

---

## 🐛 Bug Report Template

**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Device Info:**
- Device: [iPhone/Android model]
- OS Version: [iOS/Android version]
- App Version: [version number]

**Screenshots/Videos:** [Attach if applicable]

**Severity:** [Critical/High/Medium/Low]

---

## ✅ Test Checklist

### Core Functionality
- [ ] Camera capture works
- [ ] Gallery selection works
- [ ] Photo preview works
- [ ] Photo deletion works
- [ ] Photo replacement works
- [ ] Auto-save works

### Validation
- [ ] Maximum 5 photos enforced
- [ ] File size limits work
- [ ] Format validation works
- [ ] Compression works

### Navigation
- [ ] Continue with photos works
- [ ] Skip without photos works
- [ ] Back navigation preserves data
- [ ] Progress tracking accurate

### UX/UI
- [ ] Loading states display
- [ ] Error messages clear
- [ ] Responsive on all devices
- [ ] Animations smooth

### Edge Cases
- [ ] Handles interruptions
- [ ] Manages memory well
- [ ] Recovers from errors
- [ ] Performs under stress

---

## 📊 Test Results Summary

**Test Date:** _______________

**Tester:** _______________

**Device(s) Tested:** _______________

**Overall Result:** [ ] PASS  [ ] FAIL

**Notes:**

---

## 🔄 Regression Tests
After any code changes, re-run:
1. Basic photo capture flow
2. Gallery selection with 3 photos
3. Delete and replace operations
4. Navigation persistence
5. Auto-save verification

---

## 📱 Device Matrix

| Device | OS Version | Result | Notes |
|--------|------------|--------|-------|
| iPhone 15 Pro | iOS 17.x | [ ] | |
| iPhone 13 | iOS 16.x | [ ] | |
| iPhone SE | iOS 15.x | [ ] | |
| iPad Pro | iPadOS 17.x | [ ] | |
| Android Pixel 8 | Android 14 | [ ] | |
| Android Samsung | Android 13 | [ ] | |

---

## 🚀 Performance Metrics

**Target Metrics:**
- Camera open: < 2 seconds
- Photo save: < 1 second
- Gallery load: < 2 seconds
- Preview open: < 500ms
- Navigation: < 300ms

**Actual Results:**
- Camera open: _____
- Photo save: _____
- Gallery load: _____
- Preview open: _____
- Navigation: _____

---

## 📝 Sign-off

**QA Lead:** _______________  **Date:** _______________

**Developer:** _______________  **Date:** _______________

**Product Owner:** _______________  **Date:** _______________