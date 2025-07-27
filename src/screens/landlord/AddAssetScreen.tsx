import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AssetTemplate, AssetCondition, InventoryItem, PropertyData } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { extractAssetDataFromImage, validateAndEnhanceData } from '../../services/ai/labelExtraction';

type AddAssetNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type AddAssetRouteProp = RouteProp<LandlordStackParamList, 'AddAsset'>;

const { width: screenWidth } = Dimensions.get('window');

const AddAssetScreen = () => {
  const navigation = useNavigation<AddAssetNavigationProp>();
  const route = useRoute<AddAssetRouteProp>();
  const { areaId, areaName, template, propertyData, draftId } = route.params;

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
    if (!assetName.trim()) {
      Alert.alert('Required Field', 'Please enter an asset name.');
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

      // Navigate back with the new asset data
      // The PropertyAssetsScreen will handle adding it to the area
      navigation.navigate('PropertyAssets', {
        propertyData,
        areas: [], // Will be updated by the receiving screen
        draftId,
        newAsset // Pass the new asset
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to save asset. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add Asset</Text>
          <Text style={styles.headerSubtitle}>{areaName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Asset Type Info */}
        {template && (
          <View style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
              <Text style={styles.templateText}>
                Adding {template.name} to {areaName}
              </Text>
            </View>
            <Text style={styles.templateCategory}>{template.category}</Text>
          </View>
        )}

        {/* AI Scan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Setup</Text>
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
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Asset Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={template ? template.name : "Enter asset name"}
              value={assetName}
              onChangeText={setAssetName}
            />
          </View>

          {/* Brand Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Brand</Text>
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
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Model Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., WRF555SDFZ"
              value={model}
              onChangeText={setModel}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Serial Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., WH1234567890"
              value={serialNumber}
              onChangeText={setSerialNumber}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={16} color="#3498DB" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          
          {photos.length > 0 ? (
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
          ) : (
            <View style={styles.noPhotos}>
              <Ionicons name="camera-outline" size={32} color="#BDC3C7" />
              <Text style={styles.noPhotosText}>No photos added yet</Text>
            </View>
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
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || !assetName.trim()) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || !assetName.trim()}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Add Asset</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addPhotoText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  photoScroll: {
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
  noPhotos: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  noPhotosText: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 8,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  saveButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#BDC3C7',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AddAssetScreen;