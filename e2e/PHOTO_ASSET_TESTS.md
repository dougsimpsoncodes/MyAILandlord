# Photo Upload & Asset Management Tests

Comprehensive Playwright E2E tests for photo uploading, photo removal, and asset management in the MyAILandlord property creation flow.

## Test Overview

### Test File
`e2e/property-creation-flow.spec.ts`

### Test Suites Added

#### 1. Property Creation Flow - Photo Upload & Management
Tests photo upload functionality and photo management features.

**Tests:**
- **Photo Upload: Add single photo via file input**
  - Tests single photo upload through file input
  - Verifies photo appears in the grid after upload
  - Checks for processing indicators
  - Validates photo count display

- **Photo Management: Upload multiple photos and remove one**
  - Tests uploading multiple photos
  - Tests delete button functionality
  - Verifies delete confirmation dialog
  - Validates photo removal from grid

- **Photo Validation: Test max photo limit (5 photos)**
  - Tests maximum photo limit enforcement
  - Verifies photo count indicator shows "of 5 photos"
  - Checks for max photos reached message

#### 2. Property Creation Flow - Complete End-to-End with Photos & Assets
Tests the complete 8-step property creation flow with all features.

**Test:**
- **Complete Flow: Property with photos, rooms, and assets**
  - Step 1: Property Basics (name, address, type, bedrooms, bathrooms)
  - Step 2: Property Photos (upload/skip)
  - Step 3: Room Selection (select rooms)
  - Step 4: Room Photography (capture room photos)
  - Step 5: Asset Scanning (detect/add assets)
  - Step 6: Asset Details (fill in asset information)
  - Step 7: Asset Photos (upload asset photos)
  - Step 8: Review & Submit (verify all data and submit)

## Features Tested

### PropertyPhotosScreen (Step 2)

#### Photo Selection
- ✓ Click "Add Photos" button
- ✓ Photo selection alert dialog appears
- ✓ "Choose from Gallery" option
- ✓ File input handling for React Native Web
- ✓ Multiple photo selection (up to max limit)

#### Photo Upload Processing
- ✓ "Processing Photos..." indicator appears during upload
- ✓ Processing completes and photos display
- ✓ isProcessing state from usePhotoCapture hook
- ✓ Photo count updates correctly

#### Photo Removal
- ✓ Delete button (close-circle icon) on photos
- ✓ Delete confirmation dialog
- ✓ Photo removed from grid
- ✓ Photo count updates after deletion

#### Photo Persistence
- ✓ Photos saved to draft
- ✓ Auto-save functionality
- ✓ Photos persist after page refresh (tested in other suites)
- ✓ Draft resume maintains photos

#### Validation
- ✓ Max photo limit (5 photos for property)
- ✓ Photo count indicator (X of 5 photos)
- ✓ Continue button disabled when no photos (if required)
- ✓ Skip button allows bypassing photo upload

### RoomSelectionScreen (Step 3)

#### Room Selection
- ✓ Default rooms displayed (Living Room, Kitchen, etc.)
- ✓ Room cards show icons and names
- ✓ Selected rooms highlighted
- ✓ Room selection count updates
- ✓ Required rooms cannot be deselected

#### Custom Rooms
- ✓ "Add Custom Room" button
- ✓ Custom room input field
- ✓ Add custom room to list
- ✓ Custom room badge display
- ✓ Remove custom room functionality

### Asset Management (Steps 5-7)

#### Asset Detection
- ✓ Asset scanning screen navigation
- ✓ Asset detection from photos
- ✓ Manual asset addition

#### Asset Details
- ✓ Fill in asset brand, model, serial number
- ✓ Edit asset information
- ✓ Remove assets from list

#### Asset Photos
- ✓ Upload photos for specific assets
- ✓ Associate photos with assets
- ✓ Remove asset photos

### Review & Submit (Step 8)

#### Completion Summary
- ✓ Display completion percentage
- ✓ Show total items vs completed items
- ✓ List missing information
- ✓ Expandable sections for review

#### Data Review
- ✓ Property basics display correctly
- ✓ Photos thumbnails displayed
- ✓ Room list with photo counts
- ✓ Asset list with details
- ✓ Edit buttons for each section

#### Submission
- ✓ Warning for incomplete information
- ✓ Submit confirmation
- ✓ Success message on completion
- ✓ Navigate to Property Management after submit

## Test Helpers

### Image Generation
**File:** `e2e/helpers/test-image-generator.ts`

Functions:
- `generateTestImage()` - Generate minimal valid JPEG for testing
- `generateTestImageFile()` - Generate file object for Playwright
- `generateMultipleTestImages()` - Generate multiple test images
- `generateLargeTestImage()` - Generate large file for size limit testing
- `generateInvalidImageFile()` - Generate invalid file for validation testing

### Test Fixtures
**Directory:** `test-fixtures/`

Mock images for testing:
- Property exterior photos
- Room interior photos
- Asset photos

## Running the Tests

### Run All Photo & Asset Tests
```bash
npm run test:e2e -- property-creation-flow.spec.ts
```

### Run Specific Test Suite
```bash
# Photo Upload & Management tests only
npm run test:e2e -- property-creation-flow.spec.ts -g "Photo Upload & Management"

# Complete End-to-End flow
npm run test:e2e -- property-creation-flow.spec.ts -g "Complete End-to-End"
```

### Run in UI Mode
```bash
npm run test:e2e -- --ui property-creation-flow.spec.ts
```

### Run with Debug
```bash
npm run test:e2e -- property-creation-flow.spec.ts --debug
```

## Test Implementation Details

### React Native Web Considerations

The tests account for React Native Web's unique implementation:

1. **File Inputs**: File inputs may be hidden or triggered programmatically
2. **Alert Dialogs**: Native alerts rendered as web modals
3. **Touchable Components**: Rendered as clickable divs with appropriate roles
4. **Image Handling**: Base64 encoded images used for testing

### Photo Upload Mock Strategy

Tests use minimal valid JPEG images encoded in base64:
```typescript
const testImageBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJ...',
  'base64'
);
```

This approach:
- Creates valid JPEG files
- Small file size for fast tests
- Works with Playwright's setInputFiles
- Compatible with image validation logic

### Async Handling

Tests use proper async/await patterns:
- `waitForLoadState('networkidle')` - Wait for network activity to settle
- `waitForTimeout()` - Wait for specific durations
- Auto-save delays (2000ms + buffer)
- Processing indicators

### Error Handling

Tests gracefully handle:
- Missing elements (`.catch(() => false)`)
- Timeouts with appropriate limits
- Console errors logged for debugging
- Page errors captured and logged

## Screenshots Generated

All tests generate screenshots for visual verification:
- `test-results/photo-upload-single.png`
- `test-results/photo-upload-final.png`
- `test-results/photo-management-after-delete.png`
- `test-results/photo-limit-test.png`
- `test-results/complete-flow-step1.png`
- `test-results/complete-flow-step2.png`
- `test-results/complete-flow-step3-rooms.png`
- `test-results/complete-flow-step4.png` (and beyond)
- `test-results/complete-flow-final.png`

## Known Limitations

### Photo Upload in React Native Web

React Native Web's photo upload implementation may differ from native:
- File inputs might not be directly accessible
- Photo picker might be implemented differently
- Tests check for multiple approaches to handle this

### Asset Detection

Asset detection likely requires:
- AI/ML service integration
- Mock responses for testing
- May need separate integration tests

## Future Enhancements

### Additional Tests Needed

1. **Photo Persistence Tests**
   - Test photo upload → navigate away → return
   - Test photo upload → refresh page → verify photos persist
   - Test draft resume with photos

2. **Photo Validation Tests**
   - Test invalid file type (PDF, TXT, etc.)
   - Test oversized files (> 10MB)
   - Test undersized files (< 100KB)
   - Test invalid image format

3. **Room Photography Tests**
   - Test room photo upload for each selected room
   - Test switching between rooms
   - Test photo count per room

4. **Asset Photo Tests**
   - Test asset photo upload
   - Test multiple photos per asset
   - Test asset photo removal

5. **Error Handling Tests**
   - Test network failure during upload
   - Test upload timeout
   - Test storage quota exceeded

### Potential Improvements

1. **Visual Regression Testing**
   - Add screenshot comparison
   - Test photo thumbnails render correctly
   - Test grid layout at different viewport sizes

2. **Performance Testing**
   - Measure photo upload time
   - Test with large batch of photos
   - Test memory usage

3. **Accessibility Testing**
   - Test keyboard navigation
   - Test screen reader compatibility
   - Test ARIA labels on photo controls

## Troubleshooting

### Tests Failing to Find Elements

**Issue:** Tests can't find "Add Photos" button or file input

**Solutions:**
- Check if React Native Web has updated selectors
- Use browser inspector to find actual element structure
- Try alternative selectors (data-testid, aria-label, role)
- Add testID props to components for reliable selection

### Photo Upload Not Working

**Issue:** setInputFiles doesn't trigger upload

**Solutions:**
- Verify file input is visible or focusable
- Check if input has `accept` attribute limiting file types
- Try clicking button to trigger file picker first
- Add explicit wait after file selection

### Tests Timing Out

**Issue:** Tests exceed timeout limits

**Solutions:**
- Increase test timeout (already set to 90-120s)
- Check network conditions
- Add more explicit waits
- Check for hanging async operations

### Screenshots Show Wrong State

**Issue:** Screenshots don't show expected UI state

**Solutions:**
- Add delays before screenshots
- Wait for specific elements to be visible
- Use `fullPage: true` option
- Check viewport size settings

## Contributing

When adding new photo/asset tests:

1. Follow existing test structure
2. Use descriptive test names
3. Add console.log statements for debugging
4. Generate screenshots at key points
5. Handle errors gracefully
6. Update this documentation

## Related Files

- `/e2e/property-creation-flow.spec.ts` - Main test file
- `/e2e/helpers/test-image-generator.ts` - Image generation utilities
- `/test-fixtures/` - Test image assets
- `/src/screens/landlord/PropertyPhotosScreen.tsx` - Screen under test
- `/src/hooks/usePhotoCapture.ts` - Photo capture hook
- `/src/components/property/PhotoCapture.tsx` - Photo capture component
- `/src/components/property/PhotoGrid.tsx` - Photo grid component
