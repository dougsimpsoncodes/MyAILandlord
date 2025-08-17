# Debug Script for LLM: Persistent Placeholder Text Issue

## PROBLEM SUMMARY
The PropertyBasicsScreen (step 1 of 5 in property setup) is showing hardcoded placeholder text in input fields despite multiple attempts to remove it. The user's browser continues to display:
- "San Francisco" in City field
- "123 Main Street" in Street Address field  
- "12345" in ZIP Code field
- "e.g., Sunset Apartments Unit 4B" in Property Name field

## EXPECTED BEHAVIOR
All input fields should have completely empty placeholder strings (`placeholder=""`).

## CURRENT TECHNICAL STATE

### Files with Empty Placeholders (Correct Implementation)
1. **PropertyAddressFormSimplified.tsx** - Lines 187, 201, 214, 226, 239, 251, 264, 277, 291, 304, 317
   - All placeholder attributes set to `placeholder=""`
   - Has debug marker at lines 178-180 (red banner with white text)

### Files with Hardcoded Placeholders (Problem Source)
1. **AddressForm.tsx** - Lines 76, 105, 126, 179
   - Contains: `placeholder="123 Main Street"`, `placeholder="San Francisco"`, `placeholder="12345"`

### Navigation and Routing
- **MainStack.tsx** Line 208: PropertyBasics screen routes to PropertyBasicsScreen component
- **PropertyBasicsScreen.tsx** Line 26: Imports PropertyAddressFormSimplified
- **PropertyBasicsScreen.tsx** Lines 531-536: Uses PropertyAddressFormSimplified component

### Recent Fixes Applied
1. Fixed undefined `validateField` function in PropertyBasicsScreen.tsx (was causing JS error)
2. Added debug marker to PropertyAddressFormSimplified to confirm rendering
3. Cleared Metro cache multiple times
4. Restarted Expo dev server on port 8081

## DEBUGGING CHECKLIST FOR NEXT LLM

### Step 1: Verify Component Rendering
```bash
# Check if debug marker appears in browser
# Look for red banner with "DEBUG: PropertyAddressFormSimplified IS RENDERING"
```

**If debug marker does NOT appear:**
- PropertyAddressFormSimplified is not rendering
- Check for JavaScript errors in browser console
- Check for import/export issues
- Check if AddressForm.tsx is being used instead

**If debug marker DOES appear but placeholders still show:**
- CSS override issue
- Browser autofill interfering
- React Native Web platform issue

### Step 2: Browser Console Investigation
```javascript
// Check these in browser dev tools console:
console.log(document.querySelectorAll('input[placeholder]'));
// Should show all input elements and their current placeholder values

document.querySelectorAll('input').forEach(input => {
  console.log('Input:', input.name || input.id, 'Placeholder:', input.placeholder);
});
// Should show which inputs have non-empty placeholders
```

### Step 3: Component Import Verification
```bash
# Search for any other PropertyAddressForm imports
rg "PropertyAddressForm" --type typescript --type tsx
rg "AddressForm" --type typescript --type tsx

# Check if multiple components are being imported
rg "import.*Address.*Form" src/
```

### Step 4: React DevTools Investigation
In browser React DevTools:
1. Navigate to PropertyBasicsScreen component
2. Find PropertyAddressFormSimplified in component tree
3. Verify its props.value contains empty strings
4. Check if any other address form components are rendering

### Step 5: Platform-Specific Check
The app uses React Native Web. Check if:
```javascript
// In browser console, verify platform detection
console.log(window.navigator.platform);
console.log(window.navigator.userAgent);
```

### Step 6: Cache Investigation
```bash
# Clear all possible caches
rm -rf .expo
rm -rf node_modules/.cache
rm -rf web-build
npx expo start --clear
```

### Step 7: Network Tab Investigation
In browser Network tab:
1. Reload page
2. Check if any cached JavaScript bundles are loading
3. Look for 304 responses indicating cached content

## CRITICAL FILES TO EXAMINE

### 1. PropertyBasicsScreen.tsx
**Lines 531-536** - Component usage:
```typescript
<PropertyAddressFormSimplified
  value={addressData}
  onChange={setAddressData}
  onSubmit={() => {}}
  sectionId="property"
/>
```

### 2. PropertyAddressFormSimplified.tsx  
**Lines 178-180** - Debug marker (should be visible):
```typescript
<View style={{ backgroundColor: 'red', padding: 10, marginBottom: 20 }}>
  <Text style={{ color: 'white', fontWeight: 'bold' }}>DEBUG: PropertyAddressFormSimplified IS RENDERING</Text>
</View>
```

**All Field components** - Should have `placeholder=""`:
```typescript
<Field
  label="Property Name"
  placeholder=""
  // ... other props
/>
```

### 3. AddressForm.tsx (POTENTIAL CONFLICT)
**Lines 76, 126, 179** - Contains hardcoded placeholders:
```typescript
placeholder="123 Main Street"
placeholder="San Francisco"  
placeholder="12345"
```

## POSSIBLE ROOT CAUSES

### 1. Import Resolution Issue
PropertyBasicsScreen thinks it's importing PropertyAddressFormSimplified but actually gets AddressForm.

### 2. Webpack/Metro Bundle Issue
Old JavaScript bundle cached with hardcoded values.

### 3. React Native Web Rendering Issue
Component renders but platform-specific rendering shows cached HTML.

### 4. Browser Autofill Override
Browser ignoring placeholder attribute and showing autofill suggestions.

### 5. CSS Override
Styles overriding placeholder text with hardcoded values.

## NEXT STEPS FOR LLM

1. **FIRST**: Check if red debug banner appears in browser
2. **SECOND**: Check browser console for JavaScript errors
3. **THIRD**: Use React DevTools to verify component tree
4. **FOURTH**: Check Network tab for cached resources
5. **FIFTH**: Search codebase for other address form components being used

## CURRENT SERVER STATUS
- Expo dev server running on port 8081
- Metro bundler active
- Browser should be accessible at localhost:8081

## USER FRUSTRATION LEVEL
High - User said "this is such a simple issue, i cant believe you cant solve it yourself" and "obviously you need help"

## CRITICAL SUCCESS CRITERIA
The browser must show completely empty placeholder text in all input fields on the PropertyBasicsScreen form.