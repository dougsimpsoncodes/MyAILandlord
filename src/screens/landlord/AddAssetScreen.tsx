import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../lib/log';
import { AssetTemplate, AssetCondition, InventoryItem, PropertyData } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { extractAssetDataFromImage, validateAndEnhanceData } from '../../services/ai/labelExtraction';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';

import { propertyAreasService } from '../../services/supabase/propertyAreasService';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';

type AddAssetNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type AddAssetRouteProp = RouteProp<LandlordStackParamList, 'AddAsset'>;

const { width: screenWidth } = Dimensions.get('window');

const AddAssetScreen = () => {
  const navigation = useNavigation<AddAssetNavigationProp>();
  const route = useRoute<AddAssetRouteProp>();
  const { supabase } = useSupabaseWithAuth();

  // SAFE: Get auth context but don't destructure immediately
  const authContext = useUnifiedAuth();
  const user = authContext?.user;

  // Route params (may be incomplete on web due to URL serialization)
  const routeAreaId = route.params?.areaId;
  const routeAreaName = route.params?.areaName;
  const routeTemplate = route.params?.template;
  const routePropertyData = route.params?.propertyData;
  const routeDraftId = route.params?.draftId;
  const routePropertyId = route.params?.propertyId;
  const routeUserId = route.params?.userId; // FALLBACK: passed explicitly if context fails

  // Compute effective userId (prefer context, fallback to route param)
  const effectiveUserId = user?.id || routeUserId;

  // Effective params (recovered from storage on web if needed)
  const [areaId, setAreaId] = useState(routeAreaId || '');
  const [areaName, setAreaName] = useState(routeAreaName || '');
  const [template, setTemplate] = useState<AssetTemplate | null>(routeTemplate || null);
  const [propertyData, setPropertyData] = useState<PropertyData | undefined>(routePropertyData);
  const [draftId, setDraftId] = useState<string | undefined>(routeDraftId);
  const [propertyId, setPropertyId] = useState<string | undefined>(routePropertyId);
  const [isParamsLoaded, setIsParamsLoaded] = useState(!!routePropertyData);

  // Recover params from AsyncStorage on web (URL params lose complex objects)
  useEffect(() => {
    const recoverParams = async () => {
      if (!routeAreaId) {
        return;
      }

      // If we already have propertyData from route, no need to recover
      if (routePropertyData) {
        setIsParamsLoaded(true);
        return;
      }

      // Try to recover from AsyncStorage (web scenario)
      const storageKey = `add_asset_params_${routeAreaId}`;

      try {
        const storedParams = await AsyncStorage.getItem(storageKey);
        if (storedParams) {
          const params = JSON.parse(storedParams);

          setAreaId(params.areaId || routeAreaId);
          setAreaName(params.areaName || routeAreaName || '');
          setTemplate(params.template || null);
          setPropertyData(params.propertyData);
          setDraftId(params.draftId);
          setPropertyId(params.propertyId);

          // Clean up storage after recovery
          await AsyncStorage.removeItem(storageKey);
        } else {
          console.warn('📦 AddAssetScreen: No stored params found for key:', storageKey);
        }
      } catch (error) {
        console.error('📦 AddAssetScreen: Failed to recover params:', error);
      }

      setIsParamsLoaded(true);
    };

    recoverParams();
  }, [routeAreaId, routePropertyData, routeAreaName]);

  // Form state
  const [assetName, setAssetName] = useState(template?.name || '');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [year, setYear] = useState('');
  const [condition, setCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // UI state
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dropdownRef = useRef<View>(null);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  // Create hidden file input for web multi-select
  useEffect(() => {
    if (Platform.OS === 'web' && !webFileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
      webFileInputRef.current = input;
    }
    return () => {
      if (webFileInputRef.current) {
        document.body.removeChild(webFileInputRef.current);
        webFileInputRef.current = null;
      }
    };
  }, []);

  // Brand options based on template or general brands
  const brandOptions = template?.commonBrands || [
    'Whirlpool', 'GE', 'Samsung', 'LG', 'Bosch', 'KitchenAid', 'Frigidaire', 
    'Maytag', 'Kenmore', 'Amana', 'Electrolux', 'Fisher & Paykel'
  ];

  // Enhanced AI label extraction with proper error handling
  const processAssetLabel = async (imageUri: string) => {
    setIsProcessingImage(true);
    try {
      const result = await extractAssetDataFromImage(imageUri);
      
      if (result.success && result.data) {
        // Validate and enhance the extracted data
        const enhancedData = validateAndEnhanceData(result.data);
        
        // Auto-fill form with extracted data
        if (enhancedData.brand) setSelectedBrand(enhancedData.brand);
        if (enhancedData.model) setModel(enhancedData.model);
        if (enhancedData.serialNumber) setSerialNumber(enhancedData.serialNumber);
        if (enhancedData.year) setYear(enhancedData.year);
        
        // Add additional notes with extra extracted info
        const additionalInfo = [];
        if (enhancedData.capacity) additionalInfo.push(`Capacity: ${enhancedData.capacity}`);
        if (enhancedData.energyRating) additionalInfo.push(`Energy: ${enhancedData.energyRating}`);
        if (enhancedData.voltage) additionalInfo.push(`Voltage: ${enhancedData.voltage}`);
        if (enhancedData.color) additionalInfo.push(`Color: ${enhancedData.color}`);
        
        if (additionalInfo.length > 0) {
          const existingNotes = notes ? `${notes}\n\n` : '';
          setNotes(`${existingNotes}Auto-extracted info:\n${additionalInfo.join(', ')}`);
        }
        
        // Add the scanned image to photos
        setPhotos(prev => [...prev, imageUri]);
        
        const confidence = Math.round((enhancedData.confidence || 0.9) * 100);
        Alert.alert(
          'Data Extracted Successfully!',
          `Confidence: ${confidence}%\n\nFound:\n• Brand: ${enhancedData.brand || 'Not found'}\n• Model: ${enhancedData.model || 'Not found'}\n• Serial: ${enhancedData.serialNumber || 'Not found'}\n• Year: ${enhancedData.year || 'Not found'}${enhancedData.capacity ? `\n• Capacity: ${enhancedData.capacity}` : ''}`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('Label processing error:', error);
      Alert.alert(
        'Extraction Failed', 
        'Could not extract data from the image. Please ensure the label is well-lit and clearly visible, then try again or fill in manually.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleTakePhoto = async () => {
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

        setPhotos(prev => [...prev, imageUri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickPhotos = async () => {
    try {
      // Use native file input for web (supports multi-select properly)
      if (Platform.OS === 'web' && webFileInputRef.current) {
        const input = webFileInputRef.current;

        return new Promise<void>((resolve) => {
          input.onchange = async () => {
            const files = Array.from(input.files || []);
            const newPhotos: string[] = [];

            for (const file of files) {
              const uri = URL.createObjectURL(file);
              newPhotos.push(uri);
            }

            if (newPhotos.length > 0) {
              setPhotos(prev => [...prev, ...newPhotos]);
            }

            input.value = ''; // Reset for next selection
            resolve();
          };
          input.click();
        });
      }

      // Native platform handling
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos: string[] = [];
        for (const asset of result.assets) {
          const validation = await validateImageFile(asset.uri);
          if (validation.isValid) {
            newPhotos.push(asset.uri);
          }
        }
        if (newPhotos.length > 0) {
          setPhotos(prev => [...prev, ...newPhotos]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    }
  };

  const handleScanLabel = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to scan labels.');
        return;
      }

      Alert.alert(
        'Scan Asset Label',
        'Position the camera over the asset label, nameplate, or energy guide sticker. The AI will extract brand, model, serial number, and other details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Camera', 
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.9, // Higher quality for better OCR
              });

              if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                
                await processAssetLabel(imageUri);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  };

  const handleSave = async () => {
    // Clear previous errors
    setSaveError(null);
    setSaveSuccess(false);

    log.debug('[AddAsset] Save attempt', { hasUser: !!effectiveUserId, propertyId, areaId });

    if (!effectiveUserId) {
      setSaveError('User not authenticated. Please sign in again.');
      return;
    }

    if (!isParamsLoaded) {
      setSaveError('Loading data, please try again in a moment.');
      return;
    }

    if (!areaId) {
      setSaveError('Area information is missing. Please go back and try again.');
      return;
    }

    if (!assetName.trim()) {
      const error = 'Please enter an asset name.';
      setSaveError(error);
      return;
    }

    setIsSaving(true);

    try {
      const newAsset: InventoryItem = {
        id: `asset_${Date.now()}`,
        areaId,
        name: assetName.trim(),
        assetType: template?.assetType || 'other',
        category: template?.category || 'Other',
        subcategory: template?.subcategory,
        condition,
        brand: selectedBrand || customBrand || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        warrantyEndDate: warrantyEndDate || undefined,
        notes: notes.trim() || undefined,
        photos,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        isActive: true,
      };


      // For EXISTING properties (propertyId), save directly to database
      if (propertyId) {
        try {
          const savedAsset = await propertyAreasService.addAsset(propertyId, newAsset, supabase);
          log.debug('[AddAsset] Asset saved', { assetId: savedAsset.id });
          setSaveSuccess(true);

          // Navigate back after a short delay to show success message
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
        } catch (dbError: any) {
          console.error('📦 ❌ DATABASE ERROR:', dbError);
          console.error('📦 Error name:', dbError?.name);
          console.error('📦 Error message:', dbError?.message);
          console.error('📦 Error code:', dbError?.code);
          console.error('📦 Error details:', dbError?.details);
          console.error('📦 Error hint:', dbError?.hint);
          console.error('📦 Full error:', JSON.stringify(dbError, null, 2));

          const errorMsg = `Failed to save asset: ${dbError?.message || dbError?.details || 'Unknown error'}`;
          setSaveError(errorMsg);
        }
        return;
      }

      // For DRAFTS (draftId), save to AsyncStorage for later
      if (draftId) {
        await AsyncStorage.setItem(`pending_asset_${draftId}`, JSON.stringify(newAsset));
        navigation.goBack();
      } else {
        console.warn('📦 WARNING: No propertyId or draftId - cannot persist asset!');
        Alert.alert('Warning', 'Unable to save asset - no property context found. Please go back and try again.');
      }

    } catch (error: any) {
      console.error('📦 ERROR saving asset:', error);
      console.error('📦 Error details:', error?.message || String(error));
      Alert.alert('Error', `Failed to save asset: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Show loading while recovering params on web
  if (!isParamsLoaded && !routePropertyData) {
    return (
      <ScreenContainer
        title="Add Item"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="landlord"
        scrollable={false}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={{ marginTop: 16, color: '#7F8C8D' }}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // GUARD: Wait for user context to load (unless we have fallback userId from route)
  if (!user && !routeUserId) {
    return (
      <ScreenContainer
        title="Add Item"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="landlord"
        scrollable={false}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={{ marginTop: 16, color: '#7F8C8D' }}>Authenticating...</Text>
          <Text testID="waiting-for-auth" style={{ marginTop: 8, fontSize: 12, color: '#95A5A6' }}>
            Waiting for user context
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const headerRight = (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={styles.cancelText}>Cancel</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      title="Add Item"
      subtitle={areaName}
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="landlord"
      keyboardAware
      scrollable
      bottomContent={
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || !assetName.trim()) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || !assetName.trim()}
          testID="save-asset-button"
          accessibilityRole="button"
          accessibilityLabel="Save asset"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Add Asset</Text>
          )}
        </TouchableOpacity>
      }
    >
        {/* DIAGNOSTIC: Show IDs for E2E testing */}
        {__DEV__ && (
          <View style={{ padding: 8, backgroundColor: '#f0f0f0', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'monospace' }} testID="debug-user-id">
              User: {effectiveUserId || 'NO_USER'} {routeUserId ? '(from route)' : '(from context)'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'monospace' }} testID="debug-property-id">
              Property: {propertyId || 'NO_PROPERTY_ID'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'monospace' }} testID="debug-area-id">
              Area: {areaId || 'NO_AREA_ID'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'monospace' }} testID="debug-draft-id">
              Draft: {draftId || 'NO_DRAFT_ID'}
            </Text>
          </View>
        )}

        {/* Error/Success Messages */}
        {saveError && (
          <View style={{ padding: 12, backgroundColor: '#fee', marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fcc' }} testID="asset-error">
            <Text style={{ color: '#c00', fontSize: 14, fontWeight: '600' }}>❌ Error</Text>
            <Text style={{ color: '#c00', fontSize: 12, marginTop: 4 }}>{saveError}</Text>
          </View>
        )}

        {saveSuccess && (
          <View style={{ padding: 12, backgroundColor: '#efe', marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cfc' }} testID="asset-success">
            <Text style={{ color: '#0a0', fontSize: 14, fontWeight: '600' }}>✅ Success</Text>
            <Text style={{ color: '#0a0', fontSize: 12, marginTop: 4 }}>Asset saved successfully! Returning to list...</Text>
          </View>
        )}

        {/* AI Scan Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanLabel}
            disabled={isProcessingImage}
          >
            <View style={styles.scanContent}>
              {isProcessingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="scan" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.scanText}>
                {isProcessingImage ? 'Processing...' : 'Scan Asset Label with AI'}
              </Text>
            </View>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scanDescription}>
            Point camera at nameplate, energy guide, or label to auto-fill details
          </Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Asset Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={template ? template.name : "Enter asset name"}
              value={assetName}
              onChangeText={setAssetName}
              autoComplete="name"
              textContentType="name"
              autoCorrect={false}
              autoCapitalize="words"
              testID="asset-name-input"
            />
          </View>

          {/* Brand Dropdown */}
          <View style={[styles.inputGroup, showBrandDropdown && styles.inputGroupDropdownOpen]}>
            <Text style={styles.inputLabel}>Brand</Text>
            <View style={styles.dropdownContainer} ref={dropdownRef}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowBrandDropdown(!showBrandDropdown)}
              >
                <Text style={[styles.dropdownText, selectedBrand && styles.dropdownTextSelected]}>
                  {selectedBrand || 'Select brand...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
              </TouchableOpacity>

              {showBrandDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={styles.dropdownScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {brandOptions.map((brand, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedBrand(brand);
                          setShowBrandDropdown(false);
                          setCustomBrand('');
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{brand}</Text>
                        {selectedBrand === brand && (
                          <Ionicons name="checkmark" size={16} color="#3498DB" />
                        )}
                      </TouchableOpacity>
                    ))}
                    <View style={styles.dropdownDivider} />
                    <View style={styles.customBrandSection}>
                      <Text style={styles.customBrandLabel}>Other brand:</Text>
                      <TextInput
                        style={styles.customBrandInput}
                        placeholder="Enter custom brand"
                        value={customBrand}
                        onChangeText={(text) => {
                          setCustomBrand(text);
                          if (text.trim()) {
                            setSelectedBrand('');
                          }
                        }}
                        onSubmitEditing={() => {
                          if (customBrand.trim()) {
                            setShowBrandDropdown(false);
                          }
                        }}
                        autoComplete="organization"
                        textContentType="organizationName"
                        autoCorrect={false}
                        autoCapitalize="words"
                      />
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Backdrop to close dropdown when clicking outside */}
          {showBrandDropdown && (
            <TouchableOpacity
              style={styles.dropdownBackdrop}
              onPress={() => setShowBrandDropdown(false)}
              activeOpacity={1}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Model Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., WRF555SDFZ"
              value={model}
              onChangeText={setModel}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Serial Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., WH1234567890"
              value={serialNumber}
              onChangeText={setSerialNumber}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2021"
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
              autoComplete="off"
              autoCorrect={false}
              maxLength={4}
            />
          </View>
        </View>

        {/* Condition Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condition Assessment</Text>
          <View style={styles.conditionGrid}>
            {Object.values(AssetCondition).map((conditionOption) => (
              <TouchableOpacity
                key={conditionOption}
                style={[
                  styles.conditionOption,
                  condition === conditionOption && styles.conditionOptionSelected,
                ]}
                onPress={() => setCondition(conditionOption)}
              >
                <Text
                  style={[
                    styles.conditionOptionText,
                    condition === conditionOption && styles.conditionOptionTextSelected,
                  ]}
                >
                  {conditionOption.charAt(0).toUpperCase() + conditionOption.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>

          {photos.length > 0 ? (
            <>
              <ScrollView horizontal style={styles.photoScroll}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {/* Compact dropzone for adding more photos */}
              <View style={styles.dropzoneWrapper}>
                <TouchableOpacity
                  style={styles.compactDropzone}
                  onPress={handlePickPhotos}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#7F8C8D" />
                  <Text style={styles.compactDropzoneText}>
                    {Platform.OS === 'web' ? 'Drag photos here' : 'Add more photos'}
                  </Text>
                  {Platform.OS === 'web' && <Text style={styles.orText}>or</Text>}
                  <View style={styles.browseButton}>
                    <Text style={styles.browseButtonText}>Browse</Text>
                  </View>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={styles.cameraButton}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Full dropzone for empty state */
            <TouchableOpacity
              style={styles.fullDropzone}
              onPress={handlePickPhotos}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={40} color="#95A5A6" />
              <Text style={styles.fullDropzoneText}>
                {Platform.OS === 'web' ? 'Drag photos here to upload' : 'Add photos'}
              </Text>
              {Platform.OS === 'web' && <Text style={styles.orTextFull}>or</Text>}
              <View style={styles.browseButtonFull}>
                <Text style={styles.browseButtonFullText}>Browse Files</Text>
              </View>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.cameraButtonFull}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.cameraButtonFullText}>Take Photo</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.fileTypes}>Supports JPG, PNG, HEIC</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Warranty End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              value={warrantyEndDate}
              onChangeText={setWarrantyEndDate}
              autoComplete="off"
              autoCorrect={false}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Purchase Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="decimal-pad"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes about this asset..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoComplete="off"
              autoCorrect={true}
              autoCapitalize="sentences"
              testID="asset-notes-input"
            />
          </View>
        </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  templateCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ECC71',
  },
  templateCategory: {
    fontSize: 13,
    color: '#27AE60',
    marginTop: 4,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#8E44AD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    
    
    
    elevation: 3,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
    zIndex: 1,
  },
  inputGroupDropdownOpen: {
    zIndex: 1000,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#95A5A6',
  },
  dropdownTextSelected: {
    color: '#2C3E50',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 5,
    maxHeight: 200,
    zIndex: 1001,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 8,
  },
  customBrandSection: {
    padding: 12,
  },
  customBrandLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  customBrandInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    minWidth: (screenWidth - 64) / 2 - 4,
    alignItems: 'center',
  },
  conditionOptionSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  conditionOptionText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  conditionOptionTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  photoScroll: {
    marginBottom: 8,
  },
  dropzoneWrapper: {
    marginTop: 12,
  },
  // Compact dropzone styles (has photos)
  compactDropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DEE2E6',
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  compactDropzoneText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  orText: {
    fontSize: 14,
    color: '#95A5A6',
  },
  browseButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  browseButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraButton: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  // Full dropzone styles (empty state)
  fullDropzone: {
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DEE2E6',
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  fullDropzoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 4,
  },
  orTextFull: {
    fontSize: 14,
    color: '#95A5A6',
    marginBottom: 12,
  },
  browseButtonFull: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  browseButtonFullText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraButtonFull: {
    backgroundColor: '#2C3E50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cameraButtonFullText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fileTypes: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    
    
    
    
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#BDC3C7',
    boxShadow: 'none',
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AddAssetScreen;