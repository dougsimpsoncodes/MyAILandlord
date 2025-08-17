import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

type AssetDetailsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'AssetDetails'>;

interface AssetDetail {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  warrantyExpiry: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
  category: string;
  roomId: string;
}

const conditionOptions = [
  { value: 'excellent', label: 'Excellent', color: '#28A745' },
  { value: 'good', label: 'Good', color: '#17A2B8' },
  { value: 'fair', label: 'Fair', color: '#FFC107' },
  { value: 'poor', label: 'Poor', color: '#DC3545' },
];

const AssetDetailsScreen = () => {
  const navigation = useNavigation<AssetDetailsNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as { propertyData: PropertyData };
  const responsive = useResponsive();
  
  // State
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [assetDetails, setAssetDetails] = useState<AssetDetail[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isDraftLoading,
    saveDraft,
  } = usePropertyDraft();

  // Initialize asset details from detected assets
  useEffect(() => {
    if (propertyData.detectedAssets && assetDetails.length === 0) {
      const initialDetails = propertyData.detectedAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyExpiry: '',
        condition: 'good' as const,
        notes: '',
        category: asset.category,
        roomId: asset.roomId,
      }));
      setAssetDetails(initialDetails);
    }
  }, [propertyData.detectedAssets]);

  // Load existing asset details from draft
  useEffect(() => {
    if (draftState?.propertyData?.assetDetails) {
      setAssetDetails(draftState.propertyData.assetDetails);
    }
  }, [draftState]);

  // Auto-save asset details
  useEffect(() => {
    const timer = setTimeout(() => {
      if (assetDetails.length > 0) {
        updatePropertyData({
          ...propertyData,
          assetDetails,
        });
        updateCurrentStep(5); // Sixth step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [assetDetails]);

  const currentAsset = assetDetails[currentAssetIndex];

  const updateAssetField = (field: keyof AssetDetail, value: string) => {
    setAssetDetails(prev => 
      prev.map((asset, index) => 
        index === currentAssetIndex 
          ? { ...asset, [field]: value }
          : asset
      )
    );
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateCurrentAsset = () => {
    const newErrors: Record<string, string> = {};
    
    if (!currentAsset.name.trim()) {
      newErrors.name = 'Asset name is required';
    }
    
    if (currentAsset.purchasePrice && isNaN(parseFloat(currentAsset.purchasePrice))) {
      newErrors.purchasePrice = 'Please enter a valid price';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextAsset = () => {
    if (validateCurrentAsset()) {
      if (currentAssetIndex < assetDetails.length - 1) {
        setCurrentAssetIndex(currentAssetIndex + 1);
      } else {
        handleContinue();
      }
    }
  };

  const previousAsset = () => {
    if (currentAssetIndex > 0) {
      setCurrentAssetIndex(currentAssetIndex - 1);
    }
  };

  const skipAsset = () => {
    if (currentAssetIndex < assetDetails.length - 1) {
      setCurrentAssetIndex(currentAssetIndex + 1);
    } else {
      handleContinue();
    }
  };

  const handleContinue = async () => {
    // Validate all required fields
    const incompleteAssets = assetDetails.filter(asset => !asset.name.trim());
    
    if (incompleteAssets.length > 0) {
      Alert.alert(
        'Incomplete Assets',
        `${incompleteAssets.length} assets are missing names. Continue anyway?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedToNext() },
        ]
      );
      return;
    }

    proceedToNext();
  };

  const proceedToNext = async () => {
    await updatePropertyData({
      ...propertyData,
      assetDetails,
    });
    await saveDraft();
    
    navigation.navigate('AssetPhotos', { 
      propertyData: { ...propertyData, assetDetails } 
    });
  };

  const getProgressPercentage = () => {
    const completedAssets = assetDetails.filter(asset => asset.name.trim()).length;
    const totalAssets = assetDetails.length || 1;
    const baseProgress = 500; // Previous steps complete
    const detailProgress = Math.round((completedAssets / totalAssets) * 100);
    return Math.round(((baseProgress + detailProgress) / 8) * 100);
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
    formSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    requiredLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 56,
    },
    inputError: {
      borderColor: '#DC3545',
      backgroundColor: '#FEF7F7',
    },
    errorText: {
      fontSize: 14,
      color: '#DC3545',
      marginTop: 4,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputHalf: {
      flex: 1,
    },
    conditionSection: {
      marginBottom: 16,
    },
    conditionGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    conditionOption: {
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    conditionOptionSelected: {
      backgroundColor: '#F8FFF9',
      borderColor: '#28A745',
    },
    conditionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#343A40',
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
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
  });

  if (!currentAsset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveTitle>No Assets to Configure</ResponsiveTitle>
          <ResponsiveBody style={{ marginTop: 16, textAlign: 'center' }}>
            No assets were detected in the previous step.
          </ResponsiveBody>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('AssetPhotos', { propertyData })}
          >
            <Text style={styles.continueButtonText}>Continue to Photos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

          <ResponsiveTitle style={{ marginBottom: 8 }}>Asset Details</ResponsiveTitle>
          <ResponsiveBody style={{ color: '#6C757D' }}>
            Complete information for each detected asset.
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
              {getProgressPercentage()}% complete • Step 6 of 8
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Asset Header */}
          <View style={styles.assetHeader}>
            <Text style={styles.assetName}>{currentAsset.name}</Text>
            <Text style={styles.assetCounter}>
              Asset {currentAssetIndex + 1} of {assetDetails.length} • {getRoomName(currentAsset.roomId)}
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
                  {currentAssetIndex === assetDetails.length - 1 ? 'Finish' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.requiredLabel}>Asset Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={currentAsset.name}
                onChangeText={(text) => updateAssetField('name', text)}
                placeholder="e.g., Kitchen Refrigerator"
                placeholderTextColor="#6C757D"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Brand</Text>
                <TextInput
                  style={styles.input}
                  value={currentAsset.brand}
                  onChangeText={(text) => updateAssetField('brand', text)}
                  placeholder="e.g., Samsung"
                  placeholderTextColor="#6C757D"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={currentAsset.model}
                  onChangeText={(text) => updateAssetField('model', text)}
                  placeholder="e.g., RF28R7351SG"
                  placeholderTextColor="#6C757D"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Serial Number</Text>
              <TextInput
                style={styles.input}
                value={currentAsset.serialNumber}
                onChangeText={(text) => updateAssetField('serialNumber', text)}
                placeholder="Enter serial number"
                placeholderTextColor="#6C757D"
              />
            </View>
          </View>

          {/* Purchase Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Purchase Information</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Purchase Date</Text>
                <TextInput
                  style={styles.input}
                  value={currentAsset.purchaseDate}
                  onChangeText={(text) => updateAssetField('purchaseDate', text)}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#6C757D"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Purchase Price</Text>
                <TextInput
                  style={[styles.input, errors.purchasePrice && styles.inputError]}
                  value={currentAsset.purchasePrice}
                  onChangeText={(text) => updateAssetField('purchasePrice', text)}
                  placeholder="$0.00"
                  placeholderTextColor="#6C757D"
                  keyboardType="numeric"
                />
                {errors.purchasePrice && <Text style={styles.errorText}>{errors.purchasePrice}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Warranty Expiry</Text>
              <TextInput
                style={styles.input}
                value={currentAsset.warrantyExpiry}
                onChangeText={(text) => updateAssetField('warrantyExpiry', text)}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#6C757D"
              />
            </View>
          </View>

          {/* Condition & Notes */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Condition & Notes</Text>
            
            <View style={styles.conditionSection}>
              <Text style={styles.label}>Current Condition</Text>
              <View style={styles.conditionGrid}>
                {conditionOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.conditionOption,
                      currentAsset.condition === option.value && styles.conditionOptionSelected
                    ]}
                    onPress={() => updateAssetField('condition', option.value)}
                  >
                    <Text style={styles.conditionLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={currentAsset.notes}
                onChangeText={(text) => updateAssetField('notes', text)}
                placeholder="Any additional notes about this asset..."
                placeholderTextColor="#6C757D"
                multiline
              />
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
                {currentAssetIndex === assetDetails.length - 1 ? 'Skip All' : 'Skip Asset'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={nextAsset}
            >
              <Text style={styles.continueButtonText}>
                {currentAssetIndex === assetDetails.length - 1 ? 'Continue to Photos' : 'Next Asset'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

export default AssetDetailsScreen;