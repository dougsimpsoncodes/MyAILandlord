import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyArea, InventoryItem, PropertyData } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { PropertyDraftService } from '../../services/storage/PropertyDraftService';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import PhotoDropzone from '../../components/media/PhotoDropzone';
import { storageService } from '../../services/supabase/storage';
import { useResponsive } from '../../hooks/useResponsive';
import Card from '../../components/shared/Card';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import ResponsiveGrid from '../../components/shared/ResponsiveGrid';
import { ResponsiveTitle, ResponsiveSubtitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';
import { LoadingScreen } from '../../components/LoadingSpinner';
import ScreenContainer from '../../components/shared/ScreenContainer';

type PropertyAssetsListNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyAssetsListRouteProp = RouteProp<LandlordStackParamList, 'PropertyAssets'>;

interface ExpandableAreaProps {
  area: PropertyArea;
  isSelected: boolean;
  onToggle: () => void;
  onAddPhoto: () => void;
  onPhotosUploaded: (photos: { path: string; url: string }[]) => void;
  onAddAsset: () => void;
  onRemoveAsset: (assetId: string) => void;
  responsive: ReturnType<typeof useResponsive>;
  propertyId: string;
}

const ExpandableAreaCard: React.FC<ExpandableAreaProps> = ({
  area,
  isSelected,
  onToggle,
  onAddPhoto,
  onPhotosUploaded,
  onAddAsset,
  onRemoveAsset,
  responsive,
  propertyId,
}) => {
  // Start expanded by default so Assets & Inventory is visible
  const [expanded, setExpanded] = useState(true);
  const animatedHeight = useState(new Animated.Value(0))[0];

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Only count valid photos (non-empty URLs)
  const validPhotos = area.photos.filter(p => p && p.trim() !== '');
  const photoCount = validPhotos.length;
  const assetCount = area.assets?.length || 0;
  const isComplete = photoCount > 0 && assetCount > 0;

  return (
    <Card style={[styles.areaCard, responsive.isWeb && styles.areaCardWeb]}>
      {/* Area Header - Always Visible */}
      <TouchableOpacity
        style={[styles.areaHeader, expanded && styles.areaHeaderExpanded]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.areaHeaderLeft}>
          <View style={[styles.areaStatusIndicator, isComplete && styles.areaStatusComplete]} />
          <Ionicons
            name={area.icon as keyof typeof Ionicons.glyphMap}
            size={responsive.select({ mobile: 24, desktop: 28, default: 24 })}
            color="#3498DB"
          />
          <View style={styles.areaInfo}>
            <ResponsiveBody style={styles.areaName}>
              {area.name}
            </ResponsiveBody>
            <View style={styles.areaStats}>
              <View style={styles.statItem}>
                <Ionicons name="camera" size={14} color="#7F8C8D" />
                <Text style={styles.statText}>{photoCount} photos</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cube" size={14} color="#7F8C8D" />
                <Text style={styles.statText}>{assetCount} assets</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#7F8C8D"
        />
      </TouchableOpacity>

      {/* Photos Section - Horizontal Scroll Strip */}
      <View style={styles.areaContent}>
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            {photoCount > 0 && (
              <Text style={styles.photoCountBadge}>{photoCount}</Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}
          >
            {/* Existing Photos */}
            {validPhotos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoThumbWrapper}
                activeOpacity={0.8}
                onPress={() => {
                  // TODO: Navigate to photo viewer for full screen view & delete option
                  console.log('📸 Photo tapped:', area.name, index);
                }}
              >
                <Image
                  source={{ uri: photo }}
                  style={styles.photoThumbImage}
                  onError={(e) => console.error(`📸 Image load failed for ${area.name}[${index}]:`, e.nativeEvent.error)}
                  onLoad={() => console.log(`📸 Image loaded successfully for ${area.name}[${index}]`)}
                />
              </TouchableOpacity>
            ))}

            {/* Inline Add Button */}
            <PhotoDropzone
              propertyId={propertyId}
              areaId={area.id}
              onUploaded={onPhotosUploaded}
              onCameraPress={onAddPhoto}
              variant="inline"
            />
          </ScrollView>
        </View>
      </View>

      {/* Assets Section - Only when expanded */}
      {expanded && (
        <View style={styles.areaContent}>
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assets & Inventory</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddAsset}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color="#3498DB" />
                <Text style={styles.addButtonText}>Add Asset</Text>
              </TouchableOpacity>
            </View>
            
            {assetCount > 0 ? (
              <View style={styles.assetsList}>
                {area.assets?.map((asset) => (
                  <View key={asset.id} style={styles.assetItem}>
                    <View style={styles.assetItemInfo}>
                      <Text style={styles.assetName}>{asset.name}</Text>
                      <Text style={styles.assetDetails}>
                        {asset.brand && asset.model ? `${asset.brand} ${asset.model}` : asset.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemoveAsset(asset.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No assets documented yet</Text>
            )}
          </View>
        </View>
      )}
    </Card>
  );
};

const PropertyAssetsListScreen = () => {
  const navigation = useNavigation<PropertyAssetsListNavigationProp>();
  const route = useRoute<PropertyAssetsListRouteProp>();
  const responsive = useResponsive();
  const { user } = useAppAuth();

  // Get route params with defaults for page refresh scenario
  const routePropertyData = route.params?.propertyData;
  const routeAreas = route.params?.areas;
  const routeDraftId = route.params?.draftId;
  const routeNewAsset = route.params?.newAsset;
  const routePropertyId = route.params?.propertyId; // For existing properties from database

  // State for handling page refresh/direct URL access
  // For existing properties (routePropertyId), never initialize from drafts - even if areas are empty
  const [isInitializing, setIsInitializing] = useState(
    !routePropertyId && (!routeDraftId || !routeAreas || routeAreas.length === 0)
  );
  const [effectiveDraftId, setEffectiveDraftId] = useState<string | undefined>(routeDraftId);
  const [propertyData, setPropertyData] = useState<PropertyData | undefined>(routePropertyData);

  // Initialize draft management
  const {
    draftState,
    isLoading: isDraftLoading,
    isSaving,
    lastSaved,
    error: draftError,
    updateAreas,
    updateCurrentStep,
    saveDraft,
    clearError,
    loadDraft,
  } = usePropertyDraft({
    draftId: effectiveDraftId,
    enableAutoSave: true,
    autoSaveDelay: 2000
  });

  const [selectedAreas, setSelectedAreas] = useState<PropertyArea[]>(routeAreas || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processedAssetIds, setProcessedAssetIds] = useState<Set<string>>(new Set());

  // Refs to hold latest values for the focus listener
  const selectedAreasRef = useRef(selectedAreas);
  const draftAreasRef = useRef(draftState?.areas);
  selectedAreasRef.current = selectedAreas;
  draftAreasRef.current = draftState?.areas;

  // Debug: Areas are being received correctly
  console.log('========================================');
  console.log('🏠 PropertyAssetsListScreen RENDER');
  console.log('🏠 Mode:', routePropertyId ? '🟢 EXISTING_PROPERTY (from DB)' : '🟡 DRAFT');
  console.log('🏠 routePropertyId:', routePropertyId || '(none - draft mode)');
  console.log('🏠 routeAreas count:', routeAreas?.length || 0);
  console.log('🏠 selectedAreas count:', selectedAreas.length);
  console.log('🏠 isInitializing:', isInitializing);
  console.log('🏠 effectiveDraftId:', effectiveDraftId || '(none)');
  if (selectedAreas.length > 0) {
    console.log('🏠 First area:', selectedAreas[0].name, '| photos:', selectedAreas[0].photos?.length || 0);
  }
  console.log('========================================');

  // Debug: Log photoPaths for first area with photos
  const firstAreaWithPhotos = selectedAreas.find(a => a.photos?.length > 0);
  if (firstAreaWithPhotos) {
    console.log(`📸 First area with photos (${firstAreaWithPhotos.name}): photos=${firstAreaWithPhotos.photos?.length}, photoPaths=${firstAreaWithPhotos.photoPaths?.length || 0}`);
  }

  // Check for pending assets when screen gains focus (after returning from AddAssetScreen)
  // Using navigation listener is more reliable on web than useFocusEffect
  useEffect(() => {
    const checkPendingAsset = async () => {
      if (!effectiveDraftId) return;

      const pendingAssetKey = `pending_asset_${effectiveDraftId}`;
      console.log('📦 Checking for pending asset with key:', pendingAssetKey);
      const pendingAssetJson = await AsyncStorage.getItem(pendingAssetKey);

      if (pendingAssetJson) {
        console.log('📦 Found pending asset in storage');
        const pendingAsset: InventoryItem = JSON.parse(pendingAssetJson);

        // Get current areas - use refs to get latest values
        const latestAreas = selectedAreasRef.current;
        const latestDraftAreas = draftAreasRef.current;
        const currentAreas = latestAreas.length > 0 ? latestAreas : (latestDraftAreas || []);

        if (currentAreas.length === 0) {
          console.log('📦 No areas available yet, will retry when areas load');
          return;
        }

        // Check if already added
        const targetArea = currentAreas.find(a => a.id === pendingAsset.areaId);
        if (targetArea?.assets?.some(a => a.id === pendingAsset.id)) {
          console.log('📦 Pending asset already added, clearing storage');
          await AsyncStorage.removeItem(pendingAssetKey);
          return;
        }

        // Add the asset to the areas
        const updatedAreas = currentAreas.map(area => {
          if (area.id === pendingAsset.areaId) {
            const existingAssets = area.assets || [];
            console.log('📦 Adding pending asset to area:', area.name);
            return {
              ...area,
              assets: [...existingAssets, pendingAsset]
            };
          }
          return area;
        });

        // Update state and draft
        setSelectedAreas(updatedAreas);
        updateAreas(updatedAreas);

        // Clear the pending asset
        await AsyncStorage.removeItem(pendingAssetKey);
        console.log('📦 Pending asset added successfully and cleared from storage');
      } else {
        console.log('📦 No pending asset found in storage');
      }
    };

    // Subscribe to focus events for when navigating back
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📦 Screen focused - checking for pending assets');
      checkPendingAsset();
    });

    // Also check immediately on mount
    checkPendingAsset();

    return unsubscribe;
  }, [navigation, effectiveDraftId, updateAreas]);

  // Handle new asset from AddAssetScreen navigation (legacy route params method)
  useEffect(() => {
    if (routeNewAsset && !processedAssetIds.has(routeNewAsset.id)) {
      console.log('📦 Received new asset from AddAssetScreen:', routeNewAsset.name, 'for area:', routeNewAsset.areaId);

      // Get the current areas - prefer selectedAreas, fall back to draftState
      const currentAreas = selectedAreas.length > 0 ? selectedAreas : (draftState?.areas || []);

      if (currentAreas.length === 0) {
        console.log('📦 No areas found in state or draft yet, waiting for areas to load...');
        // Don't return - let the effect re-run when draftState.areas is populated
        return;
      }

      // Check if asset already exists to prevent duplicates
      const targetArea = currentAreas.find(a => a.id === routeNewAsset.areaId);
      if (targetArea?.assets?.some(a => a.id === routeNewAsset.id)) {
        console.log('📦 Asset already exists in area, marking as processed');
        setProcessedAssetIds(prev => new Set(prev).add(routeNewAsset.id));
        return;
      }

      const updatedAreas = currentAreas.map(area => {
        if (area.id === routeNewAsset.areaId) {
          const existingAssets = area.assets || [];
          console.log('📦 Adding asset to area:', area.name, '| Total assets after:', existingAssets.length + 1);
          return {
            ...area,
            assets: [...existingAssets, routeNewAsset]
          };
        }
        return area;
      });

      // Update local state immediately
      setSelectedAreas(updatedAreas);

      // Update draft with new areas
      updateAreas(updatedAreas);

      // Mark this asset as processed to prevent duplicates
      setProcessedAssetIds(prev => new Set(prev).add(routeNewAsset.id));

      console.log('📦 Asset added successfully, updated areas count:', updatedAreas.length);
    }
  }, [routeNewAsset, processedAssetIds, updateAreas, selectedAreas, draftState?.areas]);

  // Helper function to regenerate signed URLs for areas with stored paths
  const regeneratePhotoUrls = async (areas: PropertyArea[]): Promise<PropertyArea[]> => {
    console.log('📸 regeneratePhotoUrls called for', areas.length, 'areas');

    const updatedAreas = await Promise.all(
      areas.map(async (area) => {
        console.log(`📸 Processing area "${area.name}": photos=${area.photos?.length || 0}, photoPaths=${area.photoPaths?.length || 0}`);

        // If we have stored paths, regenerate signed URLs
        if (area.photoPaths && area.photoPaths.length > 0) {
          console.log(`📸 Regenerating signed URLs for ${area.name} from ${area.photoPaths.length} paths`);
          const newUrls = await Promise.all(
            area.photoPaths.map(async (path, idx) => {
              try {
                console.log(`📸 Getting signed URL for path[${idx}]: ${path}`);
                const url = await storageService.getDisplayUrl('property-images', path);
                if (url) {
                  console.log(`📸 ✓ Got URL for ${area.name}[${idx}]: ${url.substring(0, 80)}...`);
                } else {
                  console.warn(`📸 ✗ No URL returned for ${area.name}[${idx}], path: ${path}`);
                }
                return url || '';
              } catch (e) {
                console.error(`📸 ✗ Failed to get signed URL for path: ${path}`, e);
                return '';
              }
            })
          );
          // Filter out empty URLs (failed regenerations)
          const validUrls = newUrls.filter(url => url !== '');
          console.log(`📸 ${area.name}: ${validUrls.length}/${area.photoPaths.length} URLs regenerated successfully`);
          return {
            ...area,
            photos: validUrls
          };
        }

        // If photos exist but no photoPaths, log this discrepancy
        if (area.photos && area.photos.length > 0 && (!area.photoPaths || area.photoPaths.length === 0)) {
          console.warn(`📸 Area "${area.name}" has ${area.photos.length} photos but no photoPaths - URLs may be stale/local`);
          // Check if existing photos are valid URLs
          const validPhotos = area.photos.filter(p => p && p.startsWith('http'));
          if (validPhotos.length !== area.photos.length) {
            console.warn(`📸 Area "${area.name}": ${area.photos.length - validPhotos.length} photos are not valid HTTP URLs`);
          }
        }

        return area;
      })
    );
    return updatedAreas;
  };

  // Handle page refresh: Check for stored current draft if route params are missing
  useEffect(() => {
    const checkForStoredDraft = async () => {
      // CRITICAL: If we have a propertyId (existing property from database), NEVER load from drafts
      // This property's data comes from the database, even if it has 0 areas
      if (routePropertyId) {
        console.log('🏠 EXISTING PROPERTY MODE - skipping ALL draft loading, propertyId:', routePropertyId);
        console.log('🏠 Using route areas (from database):', routeAreas?.length || 0, 'areas');
        setIsInitializing(false);
        return;
      }

      // If we already have valid route params for a draft, no need to check storage
      if (routeDraftId && routeAreas && routeAreas.length > 0) {
        console.log('Using route params for draft, no need to check storage');
        setIsInitializing(false);
        return;
      }

      // Check if there's a stored current draft ID for this user
      if (user?.id) {
        console.log('Checking for stored draft (page refresh scenario)...');
        const storedDraft = await PropertyDraftService.getCurrentDraftId(user.id);

        if (storedDraft && storedDraft.step >= 2) {
          console.log('Found stored draft for refresh recovery:', storedDraft);
          setEffectiveDraftId(storedDraft.draftId);

          // Load the draft data
          const draft = await PropertyDraftService.loadDraft(user.id, storedDraft.draftId);
          if (draft) {
            console.log('Loaded draft data for page refresh:', draft.propertyData?.name);

            // Regenerate signed URLs for photos from stored paths
            const areasWithFreshUrls = await regeneratePhotoUrls(draft.areas || []);

            setSelectedAreas(areasWithFreshUrls);
            setPropertyData(draft.propertyData);
          }
        } else {
          console.log('No stored draft found or draft is at earlier step, redirecting to home');
          // No stored draft for this step - redirect to home
          navigation.replace('Home');
          return;
        }
      }

      setIsInitializing(false);
    };

    checkForStoredDraft();
  }, [user?.id, routeDraftId, routeAreas, routePropertyId, navigation]);

  // Save the current draft ID for page refresh persistence
  // Skip for existing properties (they don't use drafts)
  useEffect(() => {
    if (routePropertyId) return; // Existing properties don't use draft persistence
    if (user?.id && effectiveDraftId && !isInitializing) {
      PropertyDraftService.setCurrentDraftId(user.id, effectiveDraftId, 2);
    }
  }, [user?.id, effectiveDraftId, isInitializing, routePropertyId]);

  // Use draft areas if available and route areas are empty, OR merge photoPaths from draft
  // IMPORTANT: Skip this entirely for existing properties (routePropertyId) - they load from database
  const hasMergedPhotoPaths = useRef(false);
  useEffect(() => {
    const loadDraftAreas = async () => {
      // Skip draft merging for existing properties - their data comes from database
      if (routePropertyId) {
        console.log('📸 Skipping draft merge - using database data for existing property:', routePropertyId);
        return;
      }

      if (!draftState?.areas || draftState.areas.length === 0) {
        return;
      }

      // Case 1: No route areas - use draft areas entirely
      if (!routeAreas || routeAreas.length === 0) {
        console.log('📸 Using draft areas instead of route params');
        const areasWithFreshUrls = await regeneratePhotoUrls(draftState.areas);
        setSelectedAreas(areasWithFreshUrls);
      }
      // Case 2: Route areas exist but may be missing photoPaths - merge from draft (once only)
      else if (!hasMergedPhotoPaths.current && selectedAreas.length > 0) {
        // Check if any area has photos but no photoPaths
        const needsMerge = selectedAreas.some(area =>
          area.photos?.length > 0 && (!area.photoPaths || area.photoPaths.length === 0)
        );

        if (needsMerge) {
          hasMergedPhotoPaths.current = true;
          console.log('📸 Merging photoPaths from draft into route areas');
          // Create a map of draft areas by ID for quick lookup
          const draftAreaMap = new Map(draftState.areas.map(a => [a.id, a]));

          // Merge photoPaths from draft into route areas
          const mergedAreas = selectedAreas.map(area => {
            const draftArea = draftAreaMap.get(area.id);
            if (draftArea?.photoPaths && draftArea.photoPaths.length > 0) {
              console.log(`📸 Merging ${draftArea.photoPaths.length} photoPaths for area: ${area.name}`);
              return {
                ...area,
                photoPaths: draftArea.photoPaths
              };
            }
            return area;
          });

          // Now regenerate URLs with the photoPaths
          const areasWithFreshUrls = await regeneratePhotoUrls(mergedAreas);
          setSelectedAreas(areasWithFreshUrls);
        }
      }

      // Also update property data from draft if not from route
      if (!routePropertyData && draftState?.propertyData) {
        setPropertyData(draftState.propertyData);
      }
    };
    loadDraftAreas();
  }, [routeAreas, routePropertyData, routePropertyId, draftState?.areas, draftState?.propertyData]);

  // Regenerate photo URLs when areas come from route params with photoPaths
  // This handles: empty photos, expired signed URLs, or stale URLs
  const hasRegeneratedUrls = useRef(false);
  useEffect(() => {
    const regenerateUrlsForRouteAreas = async () => {
      // Only run once to avoid infinite loops
      if (hasRegeneratedUrls.current) return;

      if (selectedAreas.length > 0) {
        // Check if any area has photoPaths - if so, ALWAYS regenerate fresh URLs
        // This ensures we never use expired signed URLs
        const needsRegeneration = selectedAreas.some(area =>
          area.photoPaths && area.photoPaths.length > 0
        );

        if (needsRegeneration) {
          hasRegeneratedUrls.current = true;
          console.log('📸 Regenerating fresh signed URLs for all areas with photoPaths');
          const areasWithFreshUrls = await regeneratePhotoUrls(selectedAreas);
          setSelectedAreas(areasWithFreshUrls);
          // Also update the draft with fresh URLs (only for drafts, not existing properties)
          if (!routePropertyId) {
            updateAreas(areasWithFreshUrls);
          }
        }
      }
    };
    regenerateUrlsForRouteAreas();
  }, [selectedAreas, routePropertyId]); // Run when areas change

  // Set current step to 2 (photos & assets step)
  // Skip for existing properties (they don't use draft state)
  useEffect(() => {
    if (routePropertyId) return;
    if (draftState && draftState.currentStep !== 2) {
      updateCurrentStep(2);
    }
  }, [draftState?.currentStep, updateCurrentStep, routePropertyId]);

  // Handle draft error display
  useEffect(() => {
    if (draftError) {
      Alert.alert('Auto-save Error', draftError, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [draftError, clearError]);

  const handleAddPhoto = async (areaId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Validate image
        const validation = await validateImageFile(imageUri);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }

        // Update area with new photo
        const updatedAreas = selectedAreas.map(area => {
          if (area.id === areaId) {
            return {
              ...area,
              photos: [...area.photos, imageUri]
            };
          }
          return area;
        });

        setSelectedAreas(updatedAreas);
        updateAreas(updatedAreas);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePhotosUploaded = (areaId: string) => (photos: { path: string; url: string }[]) => {
    console.log('📸 PropertyAssetsListScreen: Photos uploaded:', photos.length);

    if (photos.length > 0) {
      const photoUrls = photos.map(p => p.url);
      const photoPaths = photos.map(p => p.path);

      const updatedAreas = selectedAreas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            photos: [...area.photos, ...photoUrls],
            // Store paths for regenerating signed URLs after page reload
            photoPaths: [...(area.photoPaths || []), ...photoPaths]
          };
        }
        return area;
      });

      console.log('📸 PropertyAssetsListScreen: Updating state with', photoUrls.length, 'photos and paths');
      setSelectedAreas(updatedAreas);
      updateAreas(updatedAreas);

      // Background save is handled by auto-save; no extra action needed here
    }
  };

  const handleAddAsset = async (areaId: string, areaName: string) => {
    const area = selectedAreas.find(a => a.id === areaId);
    if (!area || !propertyData) return;

    // Store navigation params in AsyncStorage for web (URL params lose complex objects)
    const navParams = {
      areaId,
      areaName,
      template: null,
      propertyData,
      draftId: effectiveDraftId,
      propertyId: routePropertyId // Pass propertyId for existing properties (saves to DB)
    };

    // Store params in AsyncStorage so AddAssetScreen can recover them on web
    const storageKey = `add_asset_params_${areaId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(navParams));
    console.log('📦 Stored AddAsset params for web recovery:', storageKey, '| propertyId:', routePropertyId);

    // Navigate to AddAssetScreen
    navigation.navigate('AddAsset', navParams);
  };

  const handleRemoveAsset = (areaId: string, assetId: string) => {
    Alert.alert(
      'Remove Asset',
      'Are you sure you want to remove this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedAreas = selectedAreas.map(area => {
              if (area.id === areaId) {
                return {
                  ...area,
                  assets: (area.assets || []).filter(asset => asset.id !== assetId)
                };
              }
              return area;
            });
            setSelectedAreas(updatedAreas);
            updateAreas(updatedAreas);
          }
        }
      ]
    );
  };

  const handleNext = async () => {
    if (isSubmitting || isDraftLoading || !propertyData) return;

    try {
      setIsSubmitting(true);

      // Save current progress
      if (draftState) {
        await saveDraft();
      }

      // Update current draft ID to step 3
      if (user?.id && effectiveDraftId) {
        await PropertyDraftService.setCurrentDraftId(user.id, effectiveDraftId, 3);
      }

      navigation.navigate('PropertyReview', {
        propertyData,
        areas: selectedAreas,
        draftId: effectiveDraftId
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading screen while initializing after page refresh
  console.log('📸 Render check - isInitializing:', isInitializing, 'selectedAreas:', selectedAreas.length);
  if (isInitializing) {
    return <LoadingScreen message="Loading your property draft..." />;
  }

  const headerRight = (
    <View style={styles.headerRightContainer}>
      {/* Auto-save status indicator */}
      {(isSaving || lastSaved) && (
        <View style={styles.saveStatus}>
          {isSaving ? (
            <>
              <Ionicons name="sync" size={12} color="#3498DB" />
              <Text style={styles.saveStatusText}>Saving...</Text>
            </>
          ) : lastSaved ? (
            <>
              <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
              <Text style={styles.saveStatusText}>Saved</Text>
            </>
          ) : null}
        </View>
      )}
      {/* Review button */}
      <TouchableOpacity
        style={[
          styles.headerReviewButton,
          (isSubmitting || isDraftLoading) && styles.headerReviewButtonDisabled
        ]}
        onPress={handleNext}
        disabled={isSubmitting || isDraftLoading}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-forward"
          size={24}
          color={(isSubmitting || isDraftLoading) ? '#BDC3C7' : '#2C3E50'}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer
      title="Rooms & Inventory"
      subtitle="Step 3 of 4"
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="landlord"
      scrollable={true}
    >
      <ResponsiveContainer maxWidth={responsive.isLargeScreen() ? 'large' : 'desktop'} style={{ flex: 1 }}>
        {selectedAreas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateTitle}>No Areas Selected</Text>
            <Text style={styles.emptyStateText}>
              Please go back to Step 1 and select areas for your property.
            </Text>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.goBackButtonText}>Go Back to Step 1</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.areasContainer}>
            {selectedAreas.map((area) => (
              <ExpandableAreaCard
                key={area.id}
                area={area}
                isSelected={false}
                onToggle={() => {}}
                onAddPhoto={() => handleAddPhoto(area.id)}
                onPhotosUploaded={handlePhotosUploaded(area.id)}
                onAddAsset={() => handleAddAsset(area.id, area.name)}
                onRemoveAsset={(assetId) => handleRemoveAsset(area.id, assetId)}
                responsive={responsive}
                propertyId={routePropertyId || effectiveDraftId || 'temp'}
              />
            ))}
          </View>
        )}
      </ResponsiveContainer>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  containerWeb: {
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerTitleSimple: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveStatusText: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  headerReviewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerReviewButtonDisabled: {
    opacity: 0.4,
  },
  headerReviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
  headerReviewButtonTextDisabled: {
    color: '#BDC3C7',
  },
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  stepCounterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  stepCounterHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCounterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  stepCounterSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumberActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  stepNumberComplete: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    maxWidth: 80,
  },
  stepLabelActive: {
    color: '#3498DB',
    fontWeight: '600',
  },
  stepLabelComplete: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  stepConnector: {
    height: 2,
    backgroundColor: '#E9ECEF',
    flex: 0.5,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  progressSummary: {
    backgroundColor: '#E8F4FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#D6EAF8',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 13,
    color: '#3498DB',
    fontStyle: 'italic',
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  areasList: {
    flex: 1,
  },
  areasListContent: {
    padding: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  areasContainer: {
    gap: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 0,
    elevation: 2,
  },
  areaCardWeb: {
    // Web-specific styles handled by React Native Web
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  areaHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  areaStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E9ECEF',
    marginRight: 8,
  },
  areaStatusComplete: {
    backgroundColor: '#2ECC71',
  },
  areaInfo: {
    marginLeft: 8,
    flex: 1,
  },
  areaName: {
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  areaStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  areaContent: {
    padding: 12,
    paddingTop: 8,
  },
  contentSection: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  // Photo Strip Styles (Option 2 - Horizontal Scroll)
  photoStrip: {
    marginHorizontal: -4,
    marginTop: 8,
  },
  photoStripContent: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  photoThumbWrapper: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoCountBadge: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  assetsList: {
    gap: 6,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    marginBottom: 0,
  },
  assetItemInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E50',
  },
  assetDetails: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 1,
  },
  removeButton: {
    padding: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#95A5A6',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PropertyAssetsListScreen;
