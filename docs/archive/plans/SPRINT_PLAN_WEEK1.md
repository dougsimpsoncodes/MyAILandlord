# Sprint Plan: Week 1 - Complete Property Creation Flow

## Current Status ✅
- Database schema: FIXED
- Property submission: WORKING
- Basic property creation: FUNCTIONAL
- Properties display: OPERATIONAL

## This Week's Focus: Polish the 8-Screen Property Flow

### Day 1 (Monday): PropertyPhotosScreen
**Morning (2-3 hours)**
- [ ] Fix photo grid display issues
- [ ] Implement proper photo upload with progress indicators
- [ ] Add photo deletion with confirmation

**Afternoon (2-3 hours)**
- [ ] Add drag-to-reorder using `react-native-draggable-flatlist`
- [ ] Implement 10-photo maximum limit
- [ ] Test photo persistence in draft state

**Validation**: Can upload, reorder, and delete photos; all changes persist

### Day 2 (Tuesday): RoomSelectionScreen
**Morning (2-3 hours)**
- [ ] Implement smart defaults by property type:
  - House: Living Room, Kitchen, Master Bedroom, Bathroom
  - Apartment: Living Room, Kitchen, Bedroom, Bathroom
  - Condo: Similar to apartment
  - Townhouse: Similar to house

**Afternoon (2-3 hours)**
- [ ] Add custom room creation with validation
- [ ] Implement room deletion
- [ ] Save selections to draft state

**Validation**: Rooms auto-populate based on type; can add/remove custom rooms

### Day 3 (Wednesday): RoomPhotographyScreen
**Morning (2-3 hours)**
- [ ] Build room-by-room navigation (swipe or next button)
- [ ] Implement camera capture for each room
- [ ] Add 3-photo limit per room

**Afternoon (2-3 hours)**
- [ ] Create photo preview gallery per room
- [ ] Add skip option for rooms without photos
- [ ] Ensure room-photo associations save correctly

**Validation**: Can photograph each room individually; photos correctly associated

### Day 4 (Thursday): Asset Screens (Scanning, Details, Photos)
**Morning (3-4 hours)**
- [ ] AssetScanningScreen:
  - For MVP: Create sophisticated mock detection
  - Return realistic assets: Refrigerator, Stove, Dishwasher, etc.
  - Add manual asset addition option
  - Future: Integration point for real AI

**Afternoon (3-4 hours)**
- [ ] AssetDetailsScreen:
  - Dynamic forms based on asset type
  - Common fields: Brand, Model, Year, Serial Number
  - Appliance-specific: Energy rating, warranty
  - Safety-specific: Last inspection, battery replacement
  
- [ ] AssetPhotosScreen:
  - 4-photo limit per asset
  - Multiple angle guides (front, label, serial number, full view)

**Validation**: Can add assets manually or via mock scan; details save properly

### Day 5 (Friday): Review & Submit
**Morning (2-3 hours)**
- [ ] ReviewSubmitScreen:
  - Display all collected data in sections
  - Property basics with edit option
  - Photo gallery with counts
  - Room list with photo indicators
  - Asset inventory summary

**Afternoon (2-3 hours)**
- [ ] Implement final submission:
  - Validate all required fields
  - Save to database (properties, property_areas, property_assets)
  - Clear draft on success
  - Navigate to success screen
  - Show property in management list

**Validation**: Complete flow from start to finish; property appears in list

## Success Criteria for Week 1
- [ ] Complete property creation flow works end-to-end
- [ ] All data persists correctly in draft during navigation
- [ ] Final submission saves all data to database
- [ ] Property appears in management screen after creation
- [ ] No crashes or data loss during the flow

## Technical Decisions for This Sprint

### Photo Management
- Use Supabase Storage for all photos
- Compress images to max 1MB before upload
- Generate thumbnails for grid views

### Draft Persistence
- Continue using AsyncStorage for draft
- Auto-save after each screen
- Clear only on successful submission

### Mock AI Detection
```typescript
// Sophisticated mock for AssetScanningScreen
const mockDetectAssets = async (): Promise<DetectedAsset[]> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return variety of common assets
  const possibleAssets = [
    { type: 'refrigerator', confidence: 0.92, bounds: {...} },
    { type: 'stove', confidence: 0.88, bounds: {...} },
    { type: 'dishwasher', confidence: 0.85, bounds: {...} },
    { type: 'microwave', confidence: 0.90, bounds: {...} },
    { type: 'smoke_detector', confidence: 0.95, bounds: {...} }
  ];
  
  // Randomly return 2-4 assets
  const count = Math.floor(Math.random() * 3) + 2;
  return possibleAssets.slice(0, count);
};
```

## Daily Standup Format
Each day at 9 AM:
1. What was completed yesterday?
2. What's the plan for today?
3. Any blockers?
4. Quick demo of working features

## Risk Mitigation
- **If photo upload is slow**: Implement queue system
- **If drag-to-reorder is complex**: Use simpler up/down arrows initially
- **If asset detection is challenging**: Focus on manual entry with good UX

## Next Week Preview
Once property flow is complete:
- Week 2: Communication system (messaging, notifications)
- Week 3: AI integration (real detection, cost estimation)
- Week 4: Advanced features (vendor management, analytics)