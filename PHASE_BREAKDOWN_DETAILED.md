# Property Management Flow - Detailed Phase Breakdown

## 🎯 Overview
This document outlines the exact components, services, and functionality that will be developed in each phase of the property management flow implementation.

---

## **PHASE 1: PropertyPhotosScreen Foundation** 
*Week 1 - 8-10 hours*

### 🎯 **Objective**: Complete PropertyPhotosScreen and establish reusable patterns

### **Files to Create/Modify:**

#### **1. Main Screen Component**
```typescript
// src/screens/landlord/PropertyPhotosScreen.tsx (ENHANCE EXISTING)
interface PropertyPhotosScreenProps {
  route: RouteProp<LandlordStackParamList, 'PropertyPhotos'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'PropertyPhotos'>;
}

// Features to implement:
- Photo capture/upload interface
- Photo grid with drag-to-reorder
- Progress tracking (20-40%)
- Auto-save integration
- Navigation to RoomSelection
```

#### **2. Photo Management Components**
```typescript
// src/components/property/PhotoCapture.tsx (NEW)
interface PhotoCaptureProps {
  onPhotoTaken: (photo: Photo) => void;
  maxPhotos: number;
  aspectRatio?: [number, number];
  quality?: number;
}

// src/components/property/PhotoGrid.tsx (NEW)
interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo, index: number) => void;
  onPhotoDelete: (index: number) => void;
  onPhotoReorder: (fromIndex: number, toIndex: number) => void;
  maxPhotos: number;
  emptyStateText: string;
}

// src/components/property/PhotoPreviewModal.tsx (NEW)
interface PhotoPreviewModalProps {
  photo: Photo | null;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReplace: () => void;
}
```

#### **3. Services & Utilities**
```typescript
// src/services/PhotoService.ts (NEW)
class PhotoService {
  static async capturePhoto(options: CameraOptions): Promise<Photo>;
  static async selectFromGallery(options: ImagePickerOptions): Promise<Photo[]>;
  static async compressPhoto(photo: Photo, quality: number): Promise<Photo>;
  static async deletePhoto(photoId: string): Promise<void>;
  static validatePhoto(photo: Photo): PhotoValidationResult;
}

// src/utils/photoValidation.ts (NEW)
interface PhotoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// src/types/photo.ts (NEW)
interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  timestamp: Date;
  compressed?: boolean;
}
```

#### **4. Hooks**
```typescript
// src/hooks/usePhotoCapture.ts (NEW)
interface UsePhotoCaptureReturn {
  photos: Photo[];
  capturePhoto: () => Promise<void>;
  selectFromGallery: () => Promise<void>;
  deletePhoto: (index: number) => void;
  reorderPhotos: (fromIndex: number, toIndex: number) => void;
  isCapturing: boolean;
  error: string | null;
}
```

### **Functionality Breakdown:**

1. **Photo Capture System**
   - Camera integration with 4:3 aspect ratio
   - Gallery selection with multi-select
   - Real-time photo compression
   - Error handling for permissions/storage

2. **Photo Management**
   - Grid display with thumbnails
   - Drag-to-reorder functionality
   - Tap-to-preview full screen
   - Swipe-to-delete with confirmation

3. **Progress Integration**
   - Dynamic progress based on photo count (3+ required)
   - Time estimation display
   - Auto-save on photo changes
   - Validation for continuation

4. **UX Enhancements**
   - Loading states during capture
   - Error messages with recovery options
   - Empty state with clear guidance
   - Accessibility support for VoiceOver

---

## **PHASE 2: Room Selection & Photography**
*Week 2-3 - 14-18 hours*

### **Week 2: RoomSelectionScreen** (6-8 hours)

#### **Files to Create:**

```typescript
// src/screens/landlord/RoomSelectionScreen.tsx (NEW)
interface RoomSelectionScreenProps {
  route: RouteProp<LandlordStackParamList, 'RoomSelection'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'RoomSelection'>;
}

// src/components/property/RoomTypeSelector.tsx (NEW)
interface RoomTypeSelectorProps {
  roomTypes: RoomType[];
  selectedRooms: string[];
  onRoomToggle: (roomId: string) => void;
  onCustomRoomAdd: (customRoom: CustomRoom) => void;
}

// src/components/property/RoomTypeCard.tsx (NEW)
interface RoomTypeCardProps {
  roomType: RoomType;
  isSelected: boolean;
  onPress: () => void;
  canAddMultiple: boolean;
  currentCount: number;
}

// src/components/property/CustomRoomInput.tsx (NEW)
interface CustomRoomInputProps {
  onRoomAdd: (room: CustomRoom) => void;
  existingRooms: string[];
}

// src/types/room.ts (NEW)
interface RoomType {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'essential' | 'common' | 'optional';
  allowMultiple: boolean;
  suggestedPhotos: number;
}

interface SelectedRoom {
  id: string;
  roomTypeId: string;
  customName?: string;
  isCustom: boolean;
  photoCount: number;
  photos: Photo[];
}
```

### **Week 3: RoomPhotographyScreen** (8-10 hours)

#### **Files to Create:**

```typescript
// src/screens/landlord/RoomPhotographyScreen.tsx (NEW)
interface RoomPhotographyScreenProps {
  route: RouteProp<LandlordStackParamList, 'RoomPhotography'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'RoomPhotography'>;
}

// src/components/property/RoomPhotographyFlow.tsx (NEW)
interface RoomPhotographyFlowProps {
  rooms: SelectedRoom[];
  currentRoomIndex: number;
  onRoomComplete: (roomId: string, photos: Photo[]) => void;
  onRoomChange: (index: number) => void;
}

// src/components/property/RoomPhotoCapture.tsx (NEW)
interface RoomPhotoCaptureProps {
  room: SelectedRoom;
  onPhotosUpdate: (photos: Photo[]) => void;
  maxPhotos: number;
  photoRequirements: string[];
}

// src/components/property/RoomProgressIndicator.tsx (NEW)
interface RoomProgressIndicatorProps {
  rooms: SelectedRoom[];
  currentRoomIndex: number;
  onRoomSelect: (index: number) => void;
}
```

### **Functionality Breakdown:**

**RoomSelectionScreen:**
- Smart defaults based on PropertyBasics data (bedrooms/bathrooms)
- Visual room type grid with icons and descriptions
- Multi-select functionality with visual feedback
- Custom room addition with validation
- Progress tracking (40-60%)

**RoomPhotographyScreen:**
- Room-by-room navigation with progress indicator
- 3-photo requirement per room with guidance
- Photo capture reusing PhotoService
- Room completion validation
- Visual progress through all rooms

---

## **PHASE 3: Asset Management & Documentation**
*Week 4-5 - 18-22 hours*

### **Week 4: AssetScanningScreen** (10-12 hours)

#### **Files to Create:**

```typescript
// src/screens/landlord/AssetScanningScreen.tsx (NEW)
interface AssetScanningScreenProps {
  route: RouteProp<LandlordStackParamList, 'AssetScanning'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'AssetScanning'>;
}

// src/components/property/AssetDiscovery.tsx (NEW)
interface AssetDiscoveryProps {
  currentRoom: SelectedRoom;
  onAssetDetected: (asset: DetectedAsset) => void;
  onManualAssetAdd: (asset: ManualAsset) => void;
}

// src/components/property/AssetSuggestions.tsx (NEW)
interface AssetSuggestionsProps {
  roomType: string;
  detectedAssets: DetectedAsset[];
  onAssetSelect: (asset: AssetTemplate) => void;
}

// src/services/AssetRecognitionService.ts (NEW - Future AI)
class AssetRecognitionService {
  static async detectAssets(photo: Photo): Promise<DetectedAsset[]>;
  static async suggestAssets(roomType: string): Promise<AssetTemplate[]>;
  static validateAsset(asset: Asset): AssetValidationResult;
}

// src/types/asset.ts (NEW)
interface DetectedAsset {
  id: string;
  type: string;
  confidence: number;
  boundingBox: BoundingBox;
  suggestedBrand?: string;
  suggestedModel?: string;
}

interface Asset {
  id: string;
  roomId: string;
  type: string;
  brand?: string;
  model?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  estimatedValue?: number;
  photos: Photo[];
  notes?: string;
}
```

### **Week 5: AssetDetailsScreen & AssetPhotosScreen** (8-10 hours)

#### **Files to Create:**

```typescript
// src/screens/landlord/AssetDetailsScreen.tsx (NEW)
interface AssetDetailsScreenProps {
  route: RouteProp<LandlordStackParamList, 'AssetDetails'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'AssetDetails'>;
}

// src/screens/landlord/AssetPhotosScreen.tsx (NEW)
interface AssetPhotosScreenProps {
  route: RouteProp<LandlordStackParamList, 'AssetPhotos'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'AssetPhotos'>;
}

// src/components/property/AssetForm.tsx (NEW)
interface AssetFormProps {
  asset: Asset;
  onAssetUpdate: (asset: Asset) => void;
  assetTemplate?: AssetTemplate;
}

// src/components/property/AssetPhotoCapture.tsx (NEW)
interface AssetPhotoCaptureProps {
  asset: Asset;
  onPhotosUpdate: (photos: Photo[]) => void;
  maxPhotos: number;
  photoGuidelines: string[];
}

// src/components/property/AssetConditionSelector.tsx (NEW)
interface AssetConditionSelectorProps {
  condition: Asset['condition'];
  onConditionChange: (condition: Asset['condition']) => void;
  showGuidance: boolean;
}
```

### **Functionality Breakdown:**

**AssetScanningScreen:**
- Room-based asset discovery workflow
- AI-powered suggestions (future enhancement)
- Manual asset addition with templates
- Asset type categorization and validation

**AssetDetailsScreen:**
- Dynamic form based on asset type
- Smart suggestions for brand/model
- Condition assessment with guidance
- Warranty and value tracking

**AssetPhotosScreen:**
- Individual asset photo documentation
- 4-photo maximum per asset with guidelines
- Photo organization by asset
- Completion validation

---

## **PHASE 4: Review & Submission**
*Week 6 - 8-10 hours*

### **Files to Create:**

```typescript
// src/screens/landlord/ReviewSubmitScreen.tsx (NEW)
interface ReviewSubmitScreenProps {
  route: RouteProp<LandlordStackParamList, 'ReviewSubmit'>;
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'ReviewSubmit'>;
}

// src/components/property/PropertySummary.tsx (NEW)
interface PropertySummaryProps {
  propertyData: CompletePropertyData;
  onSectionEdit: (section: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

// src/components/property/SectionSummary.tsx (NEW)
interface SectionSummaryProps {
  title: string;
  isComplete: boolean;
  completionPercentage: number;
  summary: string;
  photoCount: number;
  onEdit: () => void;
  children?: React.ReactNode;
}

// src/components/property/RoomSummaryCard.tsx (NEW)
interface RoomSummaryCardProps {
  room: SelectedRoom;
  assetCount: number;
  onEdit: () => void;
}

// src/components/property/AssetSummaryCard.tsx (NEW)
interface AssetSummaryCardProps {
  asset: Asset;
  onEdit: () => void;
}

// src/services/PropertySubmissionService.ts (NEW)
class PropertySubmissionService {
  static async validatePropertyData(data: CompletePropertyData): Promise<ValidationResult>;
  static async submitProperty(data: CompletePropertyData): Promise<SubmissionResult>;
  static async generatePropertyReport(data: CompletePropertyData): Promise<PropertyReport>;
}
```

### **Functionality Breakdown:**

1. **Comprehensive Review Interface**
   - Collapsible sections for each flow step
   - Completion indicators and validation
   - Photo galleries and data summaries
   - Edit capability for each section

2. **Final Validation System**
   - Pre-submission data validation
   - Missing information indicators
   - Submission confirmation dialog
   - Error handling and recovery

3. **Success Flow**
   - Completion celebration
   - Property summary generation
   - Sharing capabilities
   - Navigation to dashboard

---

## **PHASE 5: Integration & Shared Components**
*Week 7 - 10-12 hours*

### **Files to Create:**

```typescript
// src/components/property/shared/StepHeader.tsx (NEW)
interface StepHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  timeEstimate?: string;
  onBack: () => void;
}

// src/components/property/shared/StepFooter.tsx (NEW)
interface StepFooterProps {
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  saveStatus: SaveStatus;
  continueText?: string;
  backText?: string;
}

// src/components/property/shared/ProgressIndicator.tsx (NEW)
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: boolean[];
  onStepPress?: (step: number) => void;
}

// src/hooks/usePropertyFlow.ts (NEW)
interface UsePropertyFlowReturn {
  currentStep: number;
  progress: number;
  canContinue: boolean;
  canGoBack: boolean;
  nextStep: () => void;
  previousStep: () => void;
  jumpToStep: (step: number) => void;
  saveAndExit: () => void;
}

// src/hooks/useStepValidation.ts (NEW)
interface UseStepValidationReturn {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validate: () => Promise<ValidationResult>;
}

// src/utils/propertyFlowNavigation.ts (NEW)
class PropertyFlowNavigation {
  static getNextScreen(currentScreen: string, propertyData: PropertyData): string;
  static getPreviousScreen(currentScreen: string): string;
  static canNavigateToStep(step: number, propertyData: PropertyData): boolean;
  static getStepProgress(propertyData: PropertyData): StepProgress[];
}
```

### **Integration Components:**

1. **Shared UI Components**
   - Consistent header/footer patterns
   - Reusable progress indicators
   - Standard loading states
   - Error boundaries

2. **Navigation Utilities**
   - Flow-aware navigation logic
   - Step validation and progression
   - Save and resume functionality
   - Error recovery mechanisms

3. **Validation System**
   - Step-by-step validation
   - Cross-step data validation
   - Real-time error feedback
   - Completion requirements

---

## 📊 **Summary by Phase**

| Phase | New Files | Components | Services | Hooks | Total Lines |
|-------|-----------|------------|----------|-------|------------|
| 1 | 6 | 5 | 1 | 1 | ~800 |
| 2 | 8 | 6 | 0 | 0 | ~1200 |
| 3 | 10 | 8 | 1 | 0 | ~1500 |
| 4 | 6 | 6 | 1 | 0 | ~900 |
| 5 | 6 | 4 | 0 | 2 | ~600 |
| **Total** | **36** | **29** | **4** | **3** | **~5000** |

---

## 🎯 **Key Patterns & Standards**

### **Component Structure:**
```typescript
// Standard component template
interface ComponentProps {
  // Props with clear types
}

const Component: React.FC<ComponentProps> = ({ 
  // Props with destructuring
}) => {
  // Hooks and state
  // Event handlers
  // Effects
  
  return (
    <ResponsiveContainer>
      {/* JSX with consistent styling */}
    </ResponsiveContainer>
  );
};

export default Component;
```

### **Service Pattern:**
```typescript
class ServiceName {
  static async methodName(params: Type): Promise<ReturnType> {
    // Implementation with error handling
  }
}
```

### **Hook Pattern:**
```typescript
const useCustomHook = (params: HookParams): HookReturn => {
  // Hook implementation
  return { /* return object */ };
};
```

This breakdown shows exactly what will be built in each phase, with specific file names, component interfaces, and functionality descriptions. Ready to proceed with any specific phase!