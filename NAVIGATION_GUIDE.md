# Navigation Best Practices

## Problem We Solved

Navigation parameters were mismatched between screens, causing buttons to do nothing on web.

### What Happened
- **PropertyDetails** tried to navigate with simple params: `{ propertyId, propertyName }`
- **PropertyAreas** expected complex params: `{ propertyData: PropertyData }`
- Result: Navigation silently failed (no error, just nothing happened)

## Prevention Strategy

### 1. Always Check TypeScript Types First

Before navigating to a screen, check `src/navigation/MainStack.tsx`:

```typescript
// Find the screen in the param list
PropertyAreas: PropertyAreasParams & { draftId?: string };

// Then check what PropertyAreasParams requires
export interface PropertyAreasParams {
  propertyData: PropertyData;  // ← This is what you need to pass!
}
```

### 2. Use Navigation Helpers

We created helpers in `src/utils/navigationHelpers.ts`:

```typescript
// ✅ GOOD - Use helper
import { getPropertyAreasParams } from '../../utils/navigationHelpers';
navigation.navigate('PropertyAreas', getPropertyAreasParams(property));

// ❌ BAD - Manual (easy to get wrong)
navigation.navigate('PropertyAreas', {
  propertyId: property.id,  // Wrong format!
  propertyName: property.name,
});
```

### 3. Test on Web Platform

React Navigation behaves differently on web:
- **Native**: Can pass complex objects
- **Web**: Objects in URL params get stringified to `[object Object]`

**Always test navigation on web** after adding new navigation.

### 4. Use TypeScript Strict Mode

Your app already has `"strict": true` in `tsconfig.json`. This helps catch type mismatches, but navigation params are often typed as `any` by default.

## Common Navigation Patterns

### From PropertyDetails to PropertyAreas
```typescript
import { getPropertyAreasParams } from '../../utils/navigationHelpers';

const handleViewAreas = () => {
  navigation.navigate('PropertyAreas', getPropertyAreasParams(property));
};
```

### From PropertyDetails to PropertyAssets
```typescript
import { getPropertyAssetsParams } from '../../utils/navigationHelpers';

const handleViewAssets = () => {
  navigation.navigate('PropertyAssets', getPropertyAssetsParams(property));
};
```

### From PropertyDetails to InviteTenant
```typescript
const handleInviteTenant = () => {
  navigation.navigate('InviteTenant', {
    propertyId: property.id,
    propertyName: property.name,
    propertyCode: property.propertyCode || 'GENERATE',
  });
};
```

## Quick Checklist

Before adding navigation:
- [ ] Check `MainStack.tsx` for expected params
- [ ] Use helper functions when available
- [ ] Test on web browser
- [ ] Check TypeScript errors
- [ ] Verify the screen loads with correct data

## When to Create New Helpers

Create a new helper in `navigationHelpers.ts` when:
1. You're navigating to the same screen from multiple places
2. The navigation params are complex (nested objects)
3. The params need transformation (e.g., simple property → PropertyData)

## Related Files

- `src/navigation/MainStack.tsx` - Navigation type definitions
- `src/utils/navigationHelpers.ts` - Navigation helper functions
- `src/types/property.ts` - Property data types
