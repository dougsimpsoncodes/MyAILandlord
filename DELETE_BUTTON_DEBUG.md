# Delete Button Not Working - Debug Information

## Problem Description
The delete button (trash icon) on property draft cards in the PropertyManagementScreen is not responding to clicks/taps on web. The button renders visually but the onPress event is not firing.

## Environment
- React Native Expo app
- Testing on: Web browser (http://localhost:8081)
- Platform: Web (works on mobile but not web)

## Expected Behavior
When clicking the trash icon button on a property draft card, it should:
1. Trigger the onPress event
2. Show an Alert confirmation dialog
3. Delete the draft if confirmed

## Actual Behavior
- Button renders with proper styling (red trash icon with light red background)
- No response when clicked
- No console logs are triggered
- No alert dialog appears

## Relevant Code Structure

### Component Hierarchy
```
PropertyManagementScreen
└── ScrollView
    └── View (draftsList)
        └── View (draftCard) - for each draft
            ├── View (draftHeader)
            │   ├── TouchableOpacity (draftInfoTouchable) - navigates to draft
            │   │   └── View (draftInfo)
            │   │       ├── Text (draft name)
            │   │       └── Text (draft address)
            │   └── Pressable (deleteDraftButton) - DELETE BUTTON NOT WORKING
            │       └── Ionicons (trash-outline)
            └── TouchableOpacity - navigates to draft
                ├── View (draftStatus)
                └── View (progressBar)
```

## Current Implementation

### Delete Button JSX (lines 259-271)
```jsx
<Pressable
  style={({ pressed }) => [
    styles.deleteDraftButton,
    pressed && { opacity: 0.7 }
  ]}
  onPress={() => {
    console.log('Delete button pressed for draft:', draft.id);
    handleDeleteDraft(draft);
  }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Ionicons name="trash-outline" size={20} color="#E74C3C" />
</Pressable>
```

### Delete Handler Function (lines 94-117)
```javascript
const handleDeleteDraft = async (draft: PropertySetupState) => {
  console.log('Delete button pressed for draft:', draft.id);
  Alert.alert(
    'Delete Draft',
    `Are you sure you want to delete the draft for "${draft.propertyData.name || 'Untitled Property'}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('Delete confirmed for draft:', draft.id);
          try {
            await deleteDraft(draft.id);
            Alert.alert('Success', 'Draft deleted successfully.');
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Failed to delete draft. Please try again.');
          }
        }
      }
    ]
  );
};
```

### Delete Button Styles (lines 637-647)
```javascript
deleteDraftButton: {
  padding: 8,
  backgroundColor: '#FFE5E5',
  borderRadius: 8,
  minWidth: 36,
  minHeight: 36,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  elevation: 5,
},
```

### Parent Container Styles
```javascript
draftCard: {
  backgroundColor: '#F8F9FA',
  borderRadius: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E9ECEF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 2,
  elevation: 1,
  padding: 16,
},

draftHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 12,
},

draftInfoTouchable: {
  flex: 1,
},
```

## What We've Tried
1. **Changed from TouchableOpacity to Pressable** - More reliable on web
2. **Added hitSlop** - Increased touch target area
3. **Added z-index and elevation** - Ensure button is above other elements
4. **Added console.log debugging** - To verify if onPress fires (it doesn't)
5. **Restructured layout** - Separated delete button from main card TouchableOpacity
6. **Added explicit styling** - Background color, min dimensions, padding

## Potential Issues to Investigate
1. **Event bubbling/propagation** - Parent TouchableOpacity might be capturing events
2. **Web-specific touch handling** - React Native Web might handle nested pressables differently
3. **Z-index stacking context** - Despite z-index, button might be behind invisible element
4. **Flexbox layout issue** - Parent's flex: 1 might be affecting touch areas
5. **React Native Web bug** - Known issues with nested pressable components on web

## File Locations
- Main component: `/src/screens/landlord/PropertyManagementScreen.tsx`
- Hook for draft management: `/src/hooks/usePropertyDrafts.ts`
- Draft service: `/src/services/storage/PropertyDraftService.ts`

## Questions for Debugging
1. Are there any known issues with Pressable/TouchableOpacity nesting in React Native Web?
2. Should we use a different approach like absolute positioning for the delete button?
3. Could the parent ScrollView be interfering with touch events?
4. Would using a different component structure (e.g., no nesting) solve this?
5. Is there a web-specific solution using onClick instead of onPress?

## Minimal Reproducible Example Request
To help debug, we need to know:
1. Does a simple Pressable work in isolation on this web setup?
2. Does the issue occur with a minimal nested structure?
3. Are there any browser console errors when clicking?
4. Does inspecting the element in browser DevTools show any overlapping elements?