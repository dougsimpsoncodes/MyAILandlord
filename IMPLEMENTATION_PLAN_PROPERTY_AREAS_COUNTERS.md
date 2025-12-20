# Implementation Plan: Property Areas with +/- Counters

## Overview
Replace checkbox selection with +/- counter controls for property areas to handle varied layouts (multiple kitchens, living rooms, etc.)

## Changes Required

### 1. Room Type Templates
Define templates for each room type with icons and default names:
- Kitchen (kitchen icon)
- Living Room (tv icon)
- Garage (car icon)
- Yard/Outdoor (leaf icon)
- Laundry Room (shirt icon)
- Other custom rooms

### 2. State Management
Replace:
```typescript
const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
```

With:
```typescript
const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
  kitchen: 1,
  living_room: 1,
  garage: 0,
  outdoor: 0,
  laundry: 0,
});
```

### 3. Auto-Naming Logic
```typescript
function generateRoomName(type: string, count: number, index: number): string {
  if (count === 1) return baseName; // "Kitchen"
  if (index === 0) return `Main ${baseName}`; // "Main Kitchen"
  return `${baseName} ${index + 1}`; // "Kitchen 2", "Kitchen 3"
}
```

### 4. Area Generation
Replace `generateDynamicAreas()` logic to:
- Take bedroom/bathroom counts from PropertyBasicsScreen (read-only)
- Generate areas based on roomCounts state
- Auto-name multiple instances

### 5. UI Changes
Replace checkbox cards with counter UI:
```jsx
<View style={styles.roomCounterRow}>
  <Text>🍳 Kitchen</Text>
  <View style={styles.counter}>
    <TouchableOpacity onPress={() => decrementRoom('kitchen')}>
      <Text>−</Text>
    </TouchableOpacity>
    <Text>{roomCounts.kitchen}</Text>
    <TouchableOpacity onPress={() => incrementRoom('kitchen')}>
      <Text>+</Text>
    </TouchableOpacity>
  </View>
</View>
```

### 6. Bedrooms/Bathrooms Display
Show as read-only from PropertyBasicsScreen:
```jsx
<View style={styles.readOnlyRow}>
  <Text>🛏️ Bedrooms</Text>
  <Text>{propertyData.bedrooms}</Text>
</View>
```

## Files to Modify
1. `src/screens/landlord/PropertyAreasScreen.tsx` - Main changes
2. `src/navigation/AuthStack.tsx` - Update onboarding flow to use PropertyBasics
3. Delete: `src/screens/onboarding/LandlordPropertyAddressScreen.tsx`
4. Delete: `src/screens/onboarding/LandlordPropertyTypeScreen.tsx`
5. Delete: `src/screens/onboarding/LandlordPropertyAreasScreen.tsx`
6. Update: `src/screens/onboarding/index.ts` - Remove deleted exports
7. Update: `src/screens/onboarding/LandlordPropertyIntroScreen.tsx` - Navigate to PropertyBasics

## Backward Compatibility
- Existing properties with custom "Kitchen 2" rooms continue to work
- New properties use counter system
- Check if area name matches auto-naming pattern to avoid duplicates

## Testing Checklist
- [ ] Create property with 1 kitchen, 1 living room
- [ ] Create property with 2 kitchens (verify "Main Kitchen", "Kitchen 2")
- [ ] Create property with 4 bedrooms, 2.5 bathrooms from PropertyBasics
- [ ] Verify bedrooms/bathrooms show as read-only
- [ ] Test "Add Custom Room" button still works
- [ ] Test draft save/resume with counters
- [ ] Test onboarding flow using PropertyBasicsScreen
