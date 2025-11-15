import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
// Import barcode scanner conditionally to handle Expo Go limitations
let BarCodeScanner: typeof import('expo-barcode-scanner').BarCodeScanner | null = null;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.log('BarCodeScanner not available in this environment:', error);
}
import * as ImagePicker from 'expo-image-picker';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

type AssetScanningNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'AssetScanning'>;

interface DetectedAsset {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  roomId: string;
  confidence: number;
  scannedData?: string;
}

const assetCategories = [
  { id: 'appliances', name: 'Appliances', icon: 'restaurant-outline', color: '#28A745' },
  { id: 'hvac', name: 'HVAC', icon: 'thermometer-outline', color: '#17A2B8' },
  { id: 'plumbing', name: 'Plumbing', icon: 'water-outline', color: '#007BFF' },
  { id: 'electrical', name: 'Electrical', icon: 'flash-outline', color: '#FFC107' },
  { id: 'fixtures', name: 'Fixtures', icon: 'bulb-outline', color: '#6F42C1' },
  { id: 'flooring', name: 'Flooring', icon: 'grid-outline', color: '#FD7E14' },
  { id: 'windows', name: 'Windows', icon: 'square-outline', color: '#20C997' },
  { id: 'doors', name: 'Doors', icon: 'enter-outline', color: '#E83E8C' },
];

const AssetScanningScreen = () => {
  const navigation = useNavigation<AssetScanningNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as { propertyData: PropertyData };
  const responsive = useResponsive();
  
  // State
  const [detectedAssets, setDetectedAssets] = useState<DetectedAsset[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isDraftLoading,
    saveDraft,
  } = usePropertyDraft();

  // Request camera permissions
  useEffect(() => {
    (async () => {
      if (BarCodeScanner) {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        // If BarCodeScanner is not available (Expo Go), skip permissions
        setHasPermission(true);
      }
    })();
  }, []);

  // Load existing detected assets from draft
  useEffect(() => {
    if (draftState?.propertyData?.detectedAssets) {
      setDetectedAssets(draftState.propertyData.detectedAssets);
    }
  }, [draftState]);

  // Auto-save detected assets
  useEffect(() => {
    const timer = setTimeout(() => {
      if (detectedAssets.length >= 0) {
        updatePropertyData({
          ...propertyData,
          detectedAssets,
        });
        updateCurrentStep(4); // Fifth step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [detectedAssets]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setIsScanning(true);
    setScannerActive(false);
    
    // Simulate AI processing
    setTimeout(() => {
      // Mock asset detection based on barcode
      const mockAsset: DetectedAsset = {
        id: `asset-${Date.now()}`,
        name: 'Detected Appliance',
        category: 'appliances',
        brand: 'Samsung',
        model: 'Model-' + data.slice(-4),
        roomId: propertyData.rooms?.[0]?.id || 'unknown',
        confidence: 0.85,
        scannedData: data,
      };
      
      setDetectedAssets(prev => [...prev, mockAsset]);
      setIsScanning(false);
      
      Alert.alert(
        'Asset Detected!',
        `Found: ${mockAsset.brand} ${mockAsset.model}\nConfidence: ${(mockAsset.confidence * 100).toFixed(0)}%`,
        [
          { text: 'Add Another', onPress: () => setScannerActive(true) },
          { text: 'Continue', onPress: () => {} },
        ]
      );
    }, 2000);
  };

  const scanWithCamera = async () => {
    if (hasPermission === null) {
      Alert.alert('Permission Required', 'Camera permission is required for scanning.');
      return;
    }
    
    if (hasPermission === false) {
      Alert.alert('No Camera Access', 'Please enable camera access in settings.');
      return;
    }

    setScannerActive(true);
  };

  const scanFromPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0,
      });
      
      if (!result.canceled) {
        setIsScanning(true);
        
        // Simulate AI analysis of the photo
        setTimeout(() => {
          const mockAsset: DetectedAsset = {
            id: `asset-${Date.now()}`,
            name: 'Refrigerator',
            category: 'appliances',
            brand: 'LG',
            model: 'Photo-Detected',
            roomId: propertyData.rooms?.find(r => r.name.toLowerCase().includes('kitchen'))?.id || 'unknown',
            confidence: 0.72,
          };
          
          setDetectedAssets(prev => [...prev, mockAsset]);
          setIsScanning(false);
          
          Alert.alert(
            'Asset Detected from Photo!',
            `Found: ${mockAsset.brand} ${mockAsset.name}\nConfidence: ${(mockAsset.confidence * 100).toFixed(0)}%`
          );
        }, 2500);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze photo. Please try again.');
      setIsScanning(false);
    }
  };

  const addManualAsset = (categoryId: string) => {
    const category = assetCategories.find(c => c.id === categoryId);
    if (!category) return;

    const manualAsset: DetectedAsset = {
      id: `asset-${Date.now()}`,
      name: `New ${category.name}`,
      category: categoryId,
      roomId: propertyData.rooms?.[0]?.id || 'unknown',
      confidence: 1.0,
    };
    
    setDetectedAssets(prev => [...prev, manualAsset]);
    
    Alert.alert(
      'Asset Added',
      `${category.name} asset added. You can edit details in the next step.`
    );
  };

  const removeAsset = (assetId: string) => {
    Alert.alert(
      'Remove Asset',
      'Are you sure you want to remove this detected asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDetectedAssets(prev => prev.filter(asset => asset.id !== assetId));
          },
        },
      ]
    );
  };

  const handleContinue = async () => {
    if (detectedAssets.length === 0) {
      Alert.alert(
        'No Assets Found',
        'No assets have been detected yet. You can skip this step or add assets manually.',
        [
          { text: 'Skip for Now', onPress: () => proceedToNext() },
          { text: 'Add Assets', style: 'cancel' },
        ]
      );
      return;
    }

    proceedToNext();
  };

  const proceedToNext = async () => {
    await updatePropertyData({
      ...propertyData,
      detectedAssets,
    });
    await saveDraft();
    
    navigation.navigate('AssetDetails', { 
      propertyData: { ...propertyData, detectedAssets } 
    });
  };

  const getProgressPercentage = () => {
    const baseProgress = 400; // Previous steps complete
    const assetProgress = Math.min(detectedAssets.length * 10, 100);
    return Math.round(((baseProgress + assetProgress) / 8) * 100);
  };

  const getRoomName = (roomId: string) => {
    return propertyData.rooms?.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: responsive.spacing.section[responsive.screenSize],
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E9ECEF',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      marginBottom: 16,
    },
    backButtonText: {
      marginLeft: 8,
      fontSize: 16,
      color: '#6C757D',
    },
    progressContainer: {
      marginBottom: 24,
    },
    progressBar: {
      height: 4,
      backgroundColor: '#E9ECEF',
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28A745',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingTop: responsive.spacing.section[responsive.screenSize],
    },
    scannerContainer: {
      height: 300,
      backgroundColor: '#000000',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanner: {
      flex: 1,
      width: '100%',
    },
    scannerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scannerPrompt: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
    },
    closeScanner: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    closeScannerText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    scanningMessage: {
      color: '#FFFFFF',
      fontSize: 16,
      textAlign: 'center',
    },
    scanOptions: {
      marginBottom: 32,
    },
    scanButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#DEE2E6',
    },
    scanButtonPrimary: {
      backgroundColor: '#28A745',
      borderColor: '#28A745',
    },
    scanButtonIcon: {
      marginRight: 16,
    },
    scanButtonContent: {
      flex: 1,
    },
    scanButtonTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 4,
    },
    scanButtonTitlePrimary: {
      color: '#FFFFFF',
    },
    scanButtonDesc: {
      fontSize: 14,
      color: '#6C757D',
    },
    scanButtonDescPrimary: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
    categorySection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 16,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryCard: {
      width: responsive.select({
        mobile: '48%',
        tablet: '31%',
        default: '48%'
      }),
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 80,
    },
    categoryIcon: {
      marginBottom: 8,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#343A40',
      textAlign: 'center',
    },
    detectedSection: {
      marginBottom: 32,
    },
    assetList: {
      gap: 12,
    },
    assetCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#28A745',
    },
    assetIcon: {
      marginRight: 12,
    },
    assetContent: {
      flex: 1,
    },
    assetName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 2,
    },
    assetDetails: {
      fontSize: 14,
      color: '#6C757D',
      marginBottom: 2,
    },
    confidenceBadge: {
      backgroundColor: '#E7F5FF',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    confidenceText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#0066CC',
    },
    removeAssetButton: {
      padding: 8,
    },
    footer: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: 16,
      paddingBottom: Math.max(16, responsive.spacing.safeAreaBottom || 0),
    },
    saveStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    saveStatusText: {
      fontSize: 14,
      color: '#6C757D',
      marginLeft: 6,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    skipButton: {
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
      borderWidth: 1,
      borderColor: '#DEE2E6',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C757D',
    },
    continueButton: {
      flex: 2,
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth="lg" padding={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#6C757D" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <ResponsiveTitle style={{ marginBottom: 8 }}>Asset Detection</ResponsiveTitle>
          <ResponsiveBody style={{ color: '#6C757D' }}>
            Scan barcodes, take photos, or manually add assets to your property inventory.
          </ResponsiveBody>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getProgressPercentage()}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {getProgressPercentage()}% complete • Step 5 of 8
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Scanner */}
          {scannerActive ? (
            <View style={styles.scannerContainer}>
              {BarCodeScanner ? (
                <BarCodeScanner
                  onBarCodeScanned={handleBarCodeScanned}
                  style={styles.scanner}
                />
              ) : (
                <View style={[styles.scanner, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
                    Barcode scanner not available in Expo Go.{'\n'}Use manual entry instead.
                  </Text>
                </View>
              )}
              <View style={styles.scannerOverlay}>
                {isScanning ? (
                  <>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.scanningMessage}>Analyzing barcode...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.scannerPrompt}>Point camera at barcode or QR code</Text>
                    <TouchableOpacity
                      style={styles.closeScanner}
                      onPress={() => setScannerActive(false)}
                    >
                      <Text style={styles.closeScannerText}>Close Scanner</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ) : (
            /* Scan Options */
            <View style={styles.scanOptions}>
              <TouchableOpacity
                style={[styles.scanButton, styles.scanButtonPrimary]}
                onPress={scanWithCamera}
                disabled={isScanning}
              >
                <Ionicons name="scan" size={32} color="#FFFFFF" style={styles.scanButtonIcon} />
                <View style={styles.scanButtonContent}>
                  <Text style={[styles.scanButtonTitle, styles.scanButtonTitlePrimary]}>
                    Scan Barcode
                  </Text>
                  <Text style={[styles.scanButtonDesc, styles.scanButtonDescPrimary]}>
                    Best for appliances, electronics, HVAC units
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanButton}
                onPress={scanFromPhoto}
                disabled={isScanning}
              >
                <Ionicons name="camera" size={32} color="#28A745" style={styles.scanButtonIcon} />
                <View style={styles.scanButtonContent}>
                  <Text style={styles.scanButtonTitle}>AI Photo Analysis</Text>
                  <Text style={styles.scanButtonDesc}>
                    Take or upload photos to detect assets
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Manual Asset Categories */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Or Add Assets Manually</Text>
            <View style={styles.categoryGrid}>
              {assetCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => addManualAsset(category.id)}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color={category.color} 
                    style={styles.categoryIcon}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Detected Assets */}
          {detectedAssets.length > 0 && (
            <View style={styles.detectedSection}>
              <Text style={styles.sectionTitle}>
                Detected Assets ({detectedAssets.length})
              </Text>
              <View style={styles.assetList}>
                {detectedAssets.map((asset) => {
                  const category = assetCategories.find(c => c.id === asset.category);
                  return (
                    <View key={asset.id} style={styles.assetCard}>
                      <Ionicons 
                        name={category?.icon as any || 'cube-outline'} 
                        size={32} 
                        color={category?.color || '#6C757D'} 
                        style={styles.assetIcon}
                      />
                      <View style={styles.assetContent}>
                        <Text style={styles.assetName}>
                          {asset.brand ? `${asset.brand} ${asset.name}` : asset.name}
                        </Text>
                        <Text style={styles.assetDetails}>
                          {category?.name} • {getRoomName(asset.roomId)}
                        </Text>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>
                            {(asset.confidence * 100).toFixed(0)}% confidence
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeAssetButton}
                        onPress={() => removeAsset(asset.id)}
                      >
                        <Ionicons name="close-circle" size={24} color="#DC3545" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Save Status */}
          <View style={styles.saveStatus}>
            <Ionicons 
              name={isDraftLoading ? 'sync' : 'checkmark-circle'} 
              size={16} 
              color={isDraftLoading ? '#6C757D' : '#28A745'} 
            />
            <Text style={styles.saveStatusText}>
              {isDraftLoading ? 'Saving...' : 'All changes saved'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => proceedToNext()}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                Continue to Details ({detectedAssets.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Overlay */}
        {isScanning && !scannerActive && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#28A745" />
            <ResponsiveBody style={{ marginTop: 16, color: '#6C757D' }}>
              Analyzing asset...
            </ResponsiveBody>
          </View>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

export default AssetScanningScreen;