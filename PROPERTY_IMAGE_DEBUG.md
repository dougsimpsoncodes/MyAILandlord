# Property Image Not Rendering - Diagnostic Report

## Problem Statement

The Google Maps house photo is not rendering on the Tenant Home screen (`src/screens/tenant/HomeScreen.tsx`). Instead of showing the property image, a placeholder icon is displayed.

## Current Implementation

**Component**: `src/components/shared/PropertyImage.tsx`
**Screen**: `src/screens/tenant/HomeScreen.tsx` (line 268-274)

```typescript
<PropertyImage
  address={linkedProperty.address}
  width={320}
  height={200}
  borderRadius={12}
  style={{ alignSelf: 'center' }}
/>
```

## Database State

Property "3101 Vista" in database:
```sql
SELECT id, name, address, address_jsonb FROM properties WHERE name LIKE '%Vista%';
```

Result:
- `address` column: **EMPTY (null)**
- `address_jsonb` column: `{"city": "Manhattan Beach", "line1": "3101 Vista Drive", "line2": "", "state": "CA", "country": "US", "zipCode": "90266-3955"}`

## Address Formatting in HomeScreen.tsx (lines 123-129)

```typescript
// Format address from address_jsonb if plain address is empty
let formattedAddress = property.address || '';
if (!formattedAddress && property.address_jsonb) {
  const addr = property.address_jsonb;
  const parts = [addr.line1, addr.city, addr.state, addr.zipCode].filter(Boolean);
  formattedAddress = parts.join(', ');
}
```

This creates: `"3101 Vista Drive, Manhattan Beach, CA, 90266"`

## Logs Show

From `/tmp/claude/-Users-dougsimpson-Projects-MyAILandlord/tasks/b55a3bf.output`:

```
LOG  [PropertyImage] Rendering with: {
  "address": "310***266",  // Address is being passed (redacted in logs)
  "hasApiKey": "[REDACTED]",
  "hasError": true,  // ← IMAGE FAILED TO LOAD
  "imageUrl": "https://maps.googleapis.com/maps/api/streetview?size=640x400&location=3101%20Vista%20Drive%2C%20Manh...",
  "isLoading": false
}
```

**Key finding**: `hasError: true` means React Native's `<Image>` component's `onError` handler was triggered.

## Google API Verification

### API Key Status
- Environment variable: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCUlm1pCAXIRMqYIvU6fxAS8F3qxccbx24`
- API key is set and accessible to the app

### Manual API Test - Street View Static API

```bash
curl "https://maps.googleapis.com/maps/api/streetview?size=400x200&location=3101%20Vista%20Drive%2C%20Manhattan%20Beach%2C%20CA%2C%2090266&key=AIzaSyCUlm1pCAXIRMqYIvU6fxAS8F3qxccbx24" -o test.jpg
```

**Result**: ✅ Returns valid JPEG image (20KB)

### Metadata Check

```bash
curl "https://maps.googleapis.com/maps/api/streetview/metadata?location=3101%20Vista%20Drive%2C%20Manhattan%20Beach%2C%20CA%2C%2090266&key=AIzaSyCUlm1pCAXIRMqYIvU6fxAS8F3qxccbx24"
```

**Result**:
```json
{
   "copyright" : "© Google",
   "date" : "2015-04",
   "location" : {
      "lat" : 33.8976276486931,
      "lng" : -118.4148306169963
   },
   "pano_id" : "-MpcJPpJ3d4efyVw_ewWLw",
   "status" : "OK"
}
```

✅ Street View imagery is available for this address (from April 2015)

### Static Maps API Test (Attempted Fallback)

```bash
curl "https://maps.googleapis.com/maps/api/staticmap?center=3101%20Vista%20Drive%2C%20Manhattan%20Beach%2C%20CA%2C%2090266&zoom=19&size=640x400&maptype=satellite&key=AIzaSyCUlm1pCAXIRMqYIvU6fxAS8F3qxccbx24"
```

**Result**: ❌ "The Google Maps Platform server rejected your request. This API project is not authorized to use this API."

The API key is only authorized for Street View Static API, not Static Maps API.

## Attempted Fixes

### Fix #1: Added Debug Logging
- Added `log.info()` in PropertyImage component to track:
  - Address being passed
  - API key presence
  - Image URL being generated
  - Loading state
  - Error state

**Outcome**: Confirmed that `hasError: true` and image is not loading in React Native

### Fix #2: Tried Google Static Maps API Fallback
- Attempted to switch from Street View to Static Maps API (more reliable)
- Added satellite view with marker

**Outcome**: ❌ API key not authorized for Static Maps API

### Fix #3: Added useEffect to Reset Error State
- Added effect to reset `hasError` and `isLoading` when address changes
- Prevents stale error state from previous render

**Outcome**: Unknown - needs testing with app reload

### Fix #4: Enhanced Street View URL
- Added `fov=90&pitch=0` parameters to Street View URL
- These are standard parameters for better framing

**Outcome**: Unknown - needs testing

## Root Cause Hypothesis

**The Google Street View API works correctly via curl, but React Native's `<Image>` component is failing to load it.**

Possible causes:
1. **CORS issue**: Mobile apps shouldn't have CORS issues, but API restrictions might block non-browser requests
2. **API key restrictions**: The API key might be restricted to specific domains/apps and not configured for the bundle ID
3. **React Native Image caching**: The component may have cached a failed load
4. **iOS/Android HTTP requirements**: ATS (App Transport Security) or similar might be blocking the request
5. **Network request headers**: Google might require specific headers that React Native isn't sending

## What We Know FOR SURE

✅ API key exists and is configured
✅ Google Street View API returns valid imagery for this address via curl
✅ Address is being formatted correctly (`"3101 Vista Drive, Manhattan Beach, CA, 90266"`)
✅ PropertyImage component is receiving the address
✅ Image URL is being constructed correctly
❌ React Native's `<Image>` component `onError` is being triggered
❌ No error message is being captured (React Native Image errors don't provide details)

## Next Steps Needed

1. **Check API key restrictions in Google Cloud Console**
   - Verify bundle ID restrictions
   - Check referrer restrictions
   - Verify API is enabled

2. **Test with a different image source**
   - Try loading a test image from a different domain to verify Image component works

3. **Check iOS/Android network logs**
   - Use Xcode/Android Studio to see actual HTTP request/response
   - Check if request is being blocked or if Google is returning an error

4. **Try alternative approach**
   - Use `expo-image` instead of React Native Image
   - Use WebView to display the image
   - Pre-fetch image and convert to base64 data URI

5. **Check app permissions**
   - Verify network permissions in iOS/Android manifests
   - Check if ATS (App Transport Security) is blocking HTTP requests

## Files Modified

1. `src/components/shared/PropertyImage.tsx`
   - Added debug logging
   - Added useEffect to reset error state on address change
   - Enhanced Street View URL with fov and pitch parameters
