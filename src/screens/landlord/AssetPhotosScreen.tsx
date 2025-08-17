import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

type AssetPhotosNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'AssetPhotos'>;

interface AssetPhoto {
  assetId: string;
  photos: string[];
  conditionPhotos: string[];
  serialNumberPhoto?: string;
}

const AssetPhotosScreen = () => {
  const navigation = useNavigation<AssetPhotosNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as { propertyData: PropertyData };
  const responsive = useResponsive();
  
  // State
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [assetPhotos, setAssetPhotos] = useState<AssetPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [photoType, setPhotoType] = useState<'general' | 'condition' | 'serial'>('general');
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isDraftLoading,
    saveDraft,
  } = usePropertyDraft();

  // Initialize asset photos from asset details
  useEffect(() => {
    if (propertyData.assetDetails && assetPhotos.length === 0) {
      const initialPhotos = propertyData.assetDetails.map(asset => ({
        assetId: asset.id,
        photos: [],
        conditionPhotos: [],
        serialNumberPhoto: undefined,
      }));
      setAssetPhotos(initialPhotos);
    }
  }, [propertyData.assetDetails]);

  // Load existing asset photos from draft
  useEffect(() => {
    if (draftState?.propertyData?.assetPhotos) {
      setAssetPhotos(draftState.propertyData.assetPhotos);
    }
  }, [draftState]);

  // Auto-save asset photos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (assetPhotos.length > 0) {
        updatePropertyData({
          ...propertyData,
          assetPhotos,
        });
        updateCurrentStep(6); // Seventh step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [assetPhotos]);

  const currentAsset = propertyData.assetDetails?.[currentAssetIndex];
  const currentAssetPhoto = assetPhotos.find(ap => ap.assetId === currentAsset?.id);

  const pickImage = async (source: 'camera' | 'library') => {
    setIsUploading(true);
    
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          setIsUploading(false);
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }
      
      if (!result.canceled && result.assets[0] && currentAsset) {
        const imageUri = result.assets[0].uri;
        
        setAssetPhotos(prev => 
          prev.map(ap => {
            if (ap.assetId === currentAsset.id) {
              if (photoType === 'general') {
                return { ...ap, photos: [...ap.photos, imageUri].slice(0, 3) };
              } else if (photoType === 'condition') {
                return { ...ap, conditionPhotos: [...ap.conditionPhotos, imageUri].slice(0, 2) };
              } else if (photoType === 'serial') {
                return { ...ap, serialNumberPhoto: imageUri };
              }
            }
            return ap;
          })
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (photoIndex: number, type: 'general' | 'condition' | 'serial') => {
    if (!currentAsset) return;
    
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAssetPhotos(prev => 
              prev.map(ap => {
                if (ap.assetId === currentAsset.id) {
                  if (type === 'general') {
                    return { ...ap, photos: ap.photos.filter((_, i) => i !== photoIndex) };
                  } else if (type === 'condition') {
                    return { ...ap, conditionPhotos: ap.conditionPhotos.filter((_, i) => i !== photoIndex) };
                  } else if (type === 'serial') {
                    return { ...ap, serialNumberPhoto: undefined };
                  }
                }
                return ap;
              })
            );
          },
        },
      ]
    );
  };

  const nextAsset = () => {
    if (currentAssetIndex < (propertyData.assetDetails?.length || 0) - 1) {
      setCurrentAssetIndex(currentAssetIndex + 1);
    } else {
      handleContinue();
    }
  };

  const previousAsset = () => {
    if (currentAssetIndex > 0) {
      setCurrentAssetIndex(currentAssetIndex - 1);
    }
  };

  const skipAsset = () => {
    if (currentAssetIndex < (propertyData.assetDetails?.length || 0) - 1) {
      setCurrentAssetIndex(currentAssetIndex + 1);
    } else {
      handleContinue();
    }
  };

  const handleContinue = async () => {
    await updatePropertyData({
      ...propertyData,
      assetPhotos,
    });
    await saveDraft();
    
    navigation.navigate('ReviewSubmit', { 
      propertyData: { ...propertyData, assetPhotos } 
    });
  };

  const getProgressPercentage = () => {
    const totalAssets = propertyData.assetDetails?.length || 1;
    const assetsWithPhotos = assetPhotos.filter(ap => ap.photos.length > 0).length;
    const baseProgress = 600; // Previous steps complete
    const photoProgress = Math.round((assetsWithPhotos / totalAssets) * 100);
    return Math.round(((baseProgress + photoProgress) / 8) * 100);
  };

  const getCompletedCount = () => {
    return assetPhotos.filter(ap => ap.photos.length > 0).length;
  };

  // Dynamic styles that use responsive values
  const dynamicStyles = {
    photoCardWidth: responsive.select({
      mobile: '48%',
      tablet: '31%',
      default: '48%'
    }),
    headerPadding: responsive.spacing?.screenPadding?.[responsive.screenSize] || 16,
    sectionPadding: responsive.spacing?.section?.[responsive.screenSize] || 16,
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
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
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    assetHeader: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center',
    },
    assetName: {
      fontSize: 24,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    assetCounter: {
      fontSize: 16,
      color: '#6C757D',
      marginBottom: 16,
    },
    assetNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    navButtonText: {
      fontSize: 16,
      color: '#007AFF',
      marginLeft: 4,
    },
    photoTypeSelector: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    photoTypeTabs: {
      flexDirection: 'row',
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      padding: 4,
    },
    photoTypeTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
      backgroundColor: '#FFFFFF',
      elevation: 2,
    },
    photoTypeTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6C757D',
    },
    photoTypeTabTextActive: {
      color: '#28A745',
    },
    photoSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    sectionDesc: {
      fontSize: 14,
      color: '#6C757D',
      marginBottom: 16,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    photoCard: {
      width: '48%',
      aspectRatio: 1.333,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#DEE2E6',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    photoCardFilled: {
      borderStyle: 'solid',
      borderColor: '#28A745',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    photoOverlay: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
    removeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addPhotoButton: {
      alignItems: 'center',
      padding: 8,
    },
    addPhotoText: {
      fontSize: 12,
      color: '#6C757D',
      marginTop: 4,
    },
    footer: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 16,
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
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  if (!currentAsset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveTitle>No Assets to Photograph</ResponsiveTitle>
          <ResponsiveBody style={{ marginTop: 16, textAlign: 'center' }}>
            No assets were configured in the previous step.
          </ResponsiveBody>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('ReviewSubmit', { propertyData })}
          >
            <Text style={styles.continueButtonText}>Continue to Review</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getPhotosForCurrentType = () => {
    if (!currentAssetPhoto) return [];
    switch (photoType) {
      case 'general':
        return currentAssetPhoto.photos;
      case 'condition':
        return currentAssetPhoto.conditionPhotos;
      case 'serial':
        return currentAssetPhoto.serialNumberPhoto ? [currentAssetPhoto.serialNumberPhoto] : [];
      default:
        return [];
    }
  };

  const getMaxPhotosForType = () => {
    switch (photoType) {
      case 'general':
        return 3;
      case 'condition':
        return 2;
      case 'serial':
        return 1;
      default:
        return 0;
    }
  };

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

          <ResponsiveTitle style={{ marginBottom: 8 }}>Asset Photos</ResponsiveTitle>
          <ResponsiveBody style={{ color: '#6C757D' }}>
            Document each asset with photos for maintenance records.
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
              {getProgressPercentage()}% complete • Step 7 of 8
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Asset Header */}
          <View style={styles.assetHeader}>
            <Text style={styles.assetName}>
              {currentAsset.brand ? `${currentAsset.brand} ${currentAsset.name}` : currentAsset.name}
            </Text>
            <Text style={styles.assetCounter}>
              Asset {currentAssetIndex + 1} of {propertyData.assetDetails?.length || 0} • {getCompletedCount()} completed
            </Text>
            
            <View style={styles.assetNavigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentAssetIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={previousAsset}
                disabled={currentAssetIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color="#007AFF" />
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={nextAsset}
              >
                <Text style={styles.navButtonText}>
                  {currentAssetIndex === (propertyData.assetDetails?.length || 0) - 1 ? 'Finish' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Type Selector */}
          <View style={styles.photoTypeSelector}>
            <View style={styles.photoTypeTabs}>
              <TouchableOpacity
                style={[
                  styles.photoTypeTab,
                  photoType === 'general' && styles.photoTypeTabActive
                ]}
                onPress={() => setPhotoType('general')}
              >
                <Text style={[
                  styles.photoTypeTabText,
                  photoType === 'general' && styles.photoTypeTabTextActive
                ]}>
                  General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.photoTypeTab,
                  photoType === 'condition' && styles.photoTypeTabActive
                ]}
                onPress={() => setPhotoType('condition')}
              >
                <Text style={[
                  styles.photoTypeTabText,
                  photoType === 'condition' && styles.photoTypeTabTextActive
                ]}>
                  Condition
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.photoTypeTab,
                  photoType === 'serial' && styles.photoTypeTabActive
                ]}
                onPress={() => setPhotoType('serial')}
              >
                <Text style={[
                  styles.photoTypeTabText,
                  photoType === 'serial' && styles.photoTypeTabTextActive
                ]}>
                  Serial #
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>
              {photoType === 'general' && 'General Photos (up to 3)'}
              {photoType === 'condition' && 'Condition Photos (up to 2)'}
              {photoType === 'serial' && 'Serial Number Photo (1)'}
            </Text>
            <Text style={styles.sectionDesc}>
              {photoType === 'general' && 'Overall views of the asset from different angles'}
              {photoType === 'condition' && 'Close-up photos showing current condition and any wear'}
              {photoType === 'serial' && 'Clear photo of serial number or model plate'}
            </Text>
            
            <View style={styles.photoGrid}>
              {[...Array(getMaxPhotosForType())].map((_, index) => {
                const photos = getPhotosForCurrentType();
                const photo = photos[index];
                
                if (photo) {
                  return (
                    <View key={index} style={[styles.photoCard, styles.photoCardFilled, { width: dynamicStyles.photoCardWidth }]}>
                      <Image source={{ uri: photo }} style={styles.photoImage} />
                      <View style={styles.photoOverlay}>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removePhoto(index, photoType)}
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                } else if (index === photos.length) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.photoCard, { width: dynamicStyles.photoCardWidth }]}
                      onPress={() => {
                        Alert.alert(
                          'Add Photo',
                          'Choose photo source',
                          [
                            { text: 'Camera', onPress: () => pickImage('camera') },
                            { text: 'Photo Library', onPress: () => pickImage('library') },
                            { text: 'Cancel', style: 'cancel' },
                          ]
                        );
                      }}
                      disabled={isUploading}
                    >
                      <View style={styles.addPhotoButton}>
                        <Ionicons name="camera-outline" size={24} color="#6C757D" />
                        <Text style={styles.addPhotoText}>Add Photo</Text>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return <View key={index} style={[styles.photoCard, { width: dynamicStyles.photoCardWidth }]} />;
                }
              })}
            </View>
          </View>
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
              onPress={skipAsset}
            >
              <Text style={styles.skipButtonText}>
                {currentAssetIndex === (propertyData.assetDetails?.length || 0) - 1 ? 'Skip All' : 'Skip Asset'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={nextAsset}
            >
              <Text style={styles.continueButtonText}>
                {currentAssetIndex === (propertyData.assetDetails?.length || 0) - 1 ? 'Continue to Review' : 'Next Asset'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Uploading Overlay */}
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#28A745" />
            <ResponsiveBody style={{ marginTop: 16, color: '#6C757D' }}>
              Processing photo...
            </ResponsiveBody>
          </View>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

export default AssetPhotosScreen;