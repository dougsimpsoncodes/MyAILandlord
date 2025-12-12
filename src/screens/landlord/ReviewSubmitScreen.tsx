import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import ScreenContainer from '../../components/shared/ScreenContainer';

type ReviewSubmitNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'ReviewSubmit'>;

interface CompletionStats {
  totalItems: number;
  completedItems: number;
  percentage: number;
}

const ReviewSubmitScreen = () => {
  const navigation = useNavigation<ReviewSubmitNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as { propertyData: PropertyData };
  const responsive = useResponsive();
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    property: true,
    photos: false,
    rooms: false,
    assets: false,
  });
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isLoading: isDraftLoading,
    saveDraft,
    resetDraft,
  } = usePropertyDraft();

  // Auto-save and mark as final step
  useEffect(() => {
    updateCurrentStep(7); // Final step
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getCompletionStats = (): CompletionStats => {
    let totalItems = 0;
    let completedItems = 0;

    // Property basics (always required)
    totalItems += 5; // name, address, type, bedrooms, bathrooms
    if (propertyData.name) completedItems++;
    if (propertyData.address?.line1) completedItems++;
    if (propertyData.address?.city) completedItems++;
    if (propertyData.address?.state) completedItems++;
    if (propertyData.type) completedItems++;

    // Property photos (optional but recommended)
    totalItems += 1;
    if (propertyData.photos && propertyData.photos.length > 0) completedItems++;

    // Rooms (based on selected rooms)
    const selectedRooms = propertyData.rooms || [];
    totalItems += selectedRooms.length;
    const roomsWithPhotos = propertyData.roomPhotos?.filter(rp => rp.photos.length > 0).length || 0;
    completedItems += roomsWithPhotos;

    // Assets (based on detected assets)
    const detectedAssets = propertyData.detectedAssets || [];
    totalItems += detectedAssets.length;
    const assetsWithDetails = propertyData.assetDetails?.filter(ad => ad.name.trim()).length || 0;
    completedItems += assetsWithDetails;

    return {
      totalItems: Math.max(totalItems, 1),
      completedItems,
      percentage: Math.round((completedItems / Math.max(totalItems, 1)) * 100),
    };
  };

  const getMissingItems = () => {
    const missing: string[] = [];

    // Check required property fields
    if (!propertyData.name) missing.push('Property name');
    if (!propertyData.address?.line1) missing.push('Property address');
    if (!propertyData.type) missing.push('Property type');

    // Check for property photos
    if (!propertyData.photos || propertyData.photos.length === 0) {
      missing.push('Property photos (recommended)');
    }

    // Check room coverage
    const requiredRooms = propertyData.rooms?.filter(r => r.required) || [];
    const roomsWithPhotos = propertyData.roomPhotos || [];
    const missingRoomPhotos = requiredRooms.filter(room => {
      const roomPhoto = roomsWithPhotos.find(rp => rp.roomId === room.id);
      return !roomPhoto || roomPhoto.photos.length === 0;
    });
    
    missingRoomPhotos.forEach(room => {
      missing.push(`${room.name} photos`);
    });

    return missing;
  };

  const handleEditSection = (section: string) => {
    switch (section) {
      case 'property':
        navigation.navigate('PropertyBasics');
        break;
      case 'photos':
        navigation.navigate('PropertyPhotos', { propertyData });
        break;
      case 'rooms':
        navigation.navigate('RoomSelection', { propertyData });
        break;
      case 'assets':
        navigation.navigate('AssetScanning', { propertyData });
        break;
    }
  };

  const handleSubmit = async () => {
    const missingItems = getMissingItems();
    
    if (missingItems.length > 0) {
      Alert.alert(
        'Incomplete Information',
        `The following items are missing:\n\n• ${missingItems.join('\n• ')}\n\nSubmit anyway?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Submit', onPress: () => proceedWithSubmission() },
        ]
      );
      return;
    }

    proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    setIsSubmitting(true);
    
    try {
      // Save final property data
      await updatePropertyData(propertyData);
      await saveDraft();
      
      // Simulate submission process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear draft after successful submission
      await resetDraft();
      
      Alert.alert(
        'Property Submitted Successfully! 🎉',
        'Your property inventory has been created and saved. You can view and manage it in your Property Management dashboard.',
        [
          {
            text: 'View Property',
            onPress: () => navigation.navigate('PropertyManagement'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        'There was an error submitting your property. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = getCompletionStats();
  const missingItems = getMissingItems();

  const styles = StyleSheet.create({
    progressContainer: {
      marginBottom: 24,
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingTop: responsive.spacing.section[responsive.screenSize],
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
    summaryCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    stat: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '600',
      color: '#28A745',
    },
    statLabel: {
      fontSize: 14,
      color: '#6C757D',
      marginTop: 4,
    },
    completionBar: {
      height: 8,
      backgroundColor: '#E9ECEF',
      borderRadius: 4,
      marginBottom: 8,
      overflow: 'hidden',
    },
    completionFill: {
      height: '100%',
      backgroundColor: '#28A745',
      borderRadius: 4,
    },
    completionText: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
    missingSection: {
      backgroundColor: '#FFF3CD',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#FFEAA7',
    },
    missingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#856404',
      marginBottom: 8,
    },
    missingList: {
      marginLeft: 16,
    },
    missingItem: {
      fontSize: 14,
      color: '#856404',
      marginBottom: 4,
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F8F9FA',
    },
    sectionHeaderContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 2,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: '#6C757D',
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: '#F8F9FA',
      borderRadius: 6,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#007AFF',
    },
    sectionContent: {
      padding: 16,
    },
    propertyDetails: {
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    detailLabel: {
      fontSize: 14,
      color: '#6C757D',
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#343A40',
    },
    photoGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    photoThumbnail: {
      width: 60,
      height: 45,
      borderRadius: 6,
      backgroundColor: '#F8F9FA',
    },
    itemList: {
      gap: 8,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
    },
    listItemIcon: {
      marginRight: 8,
    },
    listItemText: {
      flex: 1,
      fontSize: 14,
      color: '#343A40',
    },
    listItemCount: {
      fontSize: 12,
      color: '#6C757D',
    },
    footer: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: 16,
      paddingBottom: Math.max(16, (responsive as any).spacing?.safeAreaBottom || 0),
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
    submitButton: {
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
    },
    submitButtonSubmitting: {
      backgroundColor: '#6C757D',
    },
    submitButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  const footerContent = (
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

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonSubmitting
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting Property...' : 'Submit Property Inventory'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer
      title="Review & Submit"
      subtitle="Review your property information and submit to complete setup"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable={true}
      padded={false}
      bottomContent={footerContent}
    >
      <ResponsiveContainer maxWidth="large" padding={false}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>100% complete • Step 8 of 8</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Completion Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Completion Summary</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{stats.completedItems}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{stats.percentage}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>

            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${stats.percentage}%` }]} />
            </View>
            <Text style={styles.completionText}>
              {stats.percentage === 100 ? 'Ready to submit!' : 'Good progress - you can still submit'}
            </Text>
          </View>

          {/* Missing Items Warning */}
          {missingItems.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={styles.missingTitle}>⚠️ Missing Information</Text>
              <View style={styles.missingList}>
                {missingItems.map((item, index) => (
                  <Text key={index} style={styles.missingItem}>• {item}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Property Basics */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('property')}
            >
              <View style={styles.sectionHeaderContent}>
                <Ionicons name="home" size={24} color="#28A745" style={styles.sectionIcon} />
                <View>
                  <Text style={styles.sectionTitle}>Property Basics</Text>
                  <Text style={styles.sectionSubtitle}>{propertyData.name || 'Unnamed Property'}</Text>
                </View>
              </View>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSection('property')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Ionicons 
                  name={expandedSections.property ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6C757D" 
                />
              </View>
            </TouchableOpacity>
            
            {expandedSections.property && (
              <View style={styles.sectionContent}>
                <View style={styles.propertyDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{propertyData.name || 'Not set'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{propertyData.type || 'Not set'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>
                      {propertyData.address?.line1 ? 
                        `${propertyData.address.line1}, ${propertyData.address.city}, ${propertyData.address.state}` :
                        'Not set'
                      }
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bedrooms</Text>
                    <Text style={styles.detailValue}>{propertyData.bedrooms || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bathrooms</Text>
                    <Text style={styles.detailValue}>{propertyData.bathrooms || 0}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Property Photos */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('photos')}
            >
              <View style={styles.sectionHeaderContent}>
                <Ionicons name="camera" size={24} color="#17A2B8" style={styles.sectionIcon} />
                <View>
                  <Text style={styles.sectionTitle}>Property Photos</Text>
                  <Text style={styles.sectionSubtitle}>
                    {propertyData.photos?.length || 0} photos
                  </Text>
                </View>
              </View>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSection('photos')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Ionicons 
                  name={expandedSections.photos ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6C757D" 
                />
              </View>
            </TouchableOpacity>
            
            {expandedSections.photos && (
              <View style={styles.sectionContent}>
                {propertyData.photos && propertyData.photos.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {propertyData.photos.slice(0, 5).map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailValue}>No photos added</Text>
                )}
              </View>
            )}
          </View>

          {/* Rooms */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('rooms')}
            >
              <View style={styles.sectionHeaderContent}>
                <Ionicons name="grid" size={24} color="#FFC107" style={styles.sectionIcon} />
                <View>
                  <Text style={styles.sectionTitle}>Rooms</Text>
                  <Text style={styles.sectionSubtitle}>
                    {propertyData.rooms?.length || 0} rooms selected
                  </Text>
                </View>
              </View>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSection('rooms')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Ionicons 
                  name={expandedSections.rooms ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6C757D" 
                />
              </View>
            </TouchableOpacity>
            
            {expandedSections.rooms && (
              <View style={styles.sectionContent}>
                <View style={styles.itemList}>
                  {propertyData.rooms?.map((room) => {
                    const roomPhoto = propertyData.roomPhotos?.find(rp => rp.roomId === room.id);
                    return (
                      <View key={room.id} style={styles.listItem}>
                        <Ionicons 
                          name={room.icon as any} 
                          size={20} 
                          color="#6C757D" 
                          style={styles.listItemIcon}
                        />
                        <Text style={styles.listItemText}>{room.name}</Text>
                        <Text style={styles.listItemCount}>
                          {roomPhoto?.photos.length || 0} photos
                        </Text>
                      </View>
                    );
                  }) || []}
                </View>
              </View>
            )}
          </View>

          {/* Assets */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('assets')}
            >
              <View style={styles.sectionHeaderContent}>
                <Ionicons name="cube" size={24} color="#6F42C1" style={styles.sectionIcon} />
                <View>
                  <Text style={styles.sectionTitle}>Assets</Text>
                  <Text style={styles.sectionSubtitle}>
                    {propertyData.detectedAssets?.length || 0} assets detected
                  </Text>
                </View>
              </View>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSection('assets')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Ionicons 
                  name={expandedSections.assets ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6C757D" 
                />
              </View>
            </TouchableOpacity>
            
            {expandedSections.assets && (
              <View style={styles.sectionContent}>
                <View style={styles.itemList}>
                  {propertyData.detectedAssets?.map((asset) => {
                    const assetDetail = propertyData.assetDetails?.find(ad => ad.id === asset.id);
                    const assetPhoto = propertyData.assetPhotos?.find(ap => ap.assetId === asset.id);
                    return (
                      <View key={asset.id} style={styles.listItem}>
                        <Ionicons 
                          name="cube-outline" 
                          size={20} 
                          color="#6C757D" 
                          style={styles.listItemIcon}
                        />
                        <Text style={styles.listItemText}>
                          {assetDetail?.brand ? `${assetDetail.brand} ${assetDetail.name}` : asset.name}
                        </Text>
                        <Text style={styles.listItemCount}>
                          {assetPhoto?.photos.length || 0} photos
                        </Text>
                      </View>
                    );
                  }) || []}
                </View>
              </View>
            )}
          </View>
        </View>
      </ResponsiveContainer>
    </ScreenContainer>
  );
};

export default ReviewSubmitScreen;