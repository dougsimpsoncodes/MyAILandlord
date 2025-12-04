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

type RoomSelectionNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'RoomSelection'>;

interface SelectionRoom {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  required: boolean;
  custom?: boolean;
}

const defaultRooms: SelectionRoom[] = [
  { id: 'living-room', name: 'Living Room', icon: 'tv-outline', selected: true, required: true },
  { id: 'kitchen', name: 'Kitchen', icon: 'restaurant-outline', selected: true, required: true },
  { id: 'master-bedroom', name: 'Master Bedroom', icon: 'bed-outline', selected: true, required: false },
  { id: 'bathroom', name: 'Bathroom', icon: 'water-outline', selected: true, required: true },
  { id: 'bedroom-2', name: 'Bedroom 2', icon: 'bed-outline', selected: false, required: false },
  { id: 'bedroom-3', name: 'Bedroom 3', icon: 'bed-outline', selected: false, required: false },
  { id: 'dining-room', name: 'Dining Room', icon: 'restaurant-outline', selected: false, required: false },
  { id: 'garage', name: 'Garage', icon: 'car-outline', selected: false, required: false },
  { id: 'basement', name: 'Basement', icon: 'arrow-down-outline', selected: false, required: false },
  { id: 'attic', name: 'Attic', icon: 'arrow-up-outline', selected: false, required: false },
  { id: 'office', name: 'Home Office', icon: 'desktop-outline', selected: false, required: false },
  { id: 'laundry', name: 'Laundry Room', icon: 'shirt-outline', selected: false, required: false },
];

const PropertyRoomSelectionScreen = () => {
  const navigation = useNavigation<RoomSelectionNavigationProp>();
  const route = useRoute();
  const { propertyData, draftId } = route.params as { propertyData: PropertyData; draftId?: string };
  const responsive = useResponsive();
  
  // Room state
  const [rooms, setRooms] = useState<SelectionRoom[]>(defaultRooms);
  const [customRoomName, setCustomRoomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Draft management - use draftId to load/save the correct draft
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isLoading: isDraftLoading,
    saveDraft,
  } = usePropertyDraft({ draftId });

  // Load existing room selection from draft
  useEffect(() => {
    if (draftState?.propertyData?.rooms) {
      const savedRooms = draftState.propertyData.rooms as any[];
      // Merge saved rooms with defaults; ensure icon exists
      const mergedRooms: SelectionRoom[] = rooms.map(room => {
        const saved = savedRooms.find((r: any) => r.id === room.id);
        return saved ? { ...room, selected: true } : room;
      });

      // Add any custom rooms from saved draft, normalizing shape
      const customRooms: SelectionRoom[] = savedRooms
        .filter((r: any) => !defaultRooms.find(dr => dr.id === r.id))
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          icon: r.icon || 'home-outline',
          selected: true,
          required: !!r.required,
          custom: true,
        }));

      setRooms([...mergedRooms, ...customRooms]);
    }
  }, [draftState]);

  // Auto-save room selection
  useEffect(() => {
    const timer = setTimeout(() => {
      const selectedRooms = rooms.filter(r => r.selected);
      if (selectedRooms.length > 0) {
        updatePropertyData({
          ...propertyData,
          rooms: selectedRooms,
        });
        updateCurrentStep(2); // Third step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [rooms]);

  const toggleRoom = (roomId: string) => {
    setRooms(prevRooms => 
      prevRooms.map(room => {
        if (room.id === roomId) {
          if (room.required && room.selected) {
            Alert.alert(
              'Required Room',
              `${room.name} is required and cannot be deselected.`
            );
            return room;
          }
          return { ...room, selected: !room.selected };
        }
        return room;
      })
    );
  };

  const addCustomRoom = () => {
    if (!customRoomName.trim()) {
      Alert.alert('Enter Name', 'Please enter a room name.');
      return;
    }

    const customRoom: SelectionRoom = {
      id: `custom-${Date.now()}`,
      name: customRoomName.trim(),
      icon: 'home-outline',
      selected: true,
      required: false,
      custom: true,
    };

    setRooms([...rooms, customRoom]);
    setCustomRoomName('');
    setShowCustomInput(false);
  };

  const removeCustomRoom = (roomId: string) => {
    Alert.alert(
      'Remove Room',
      'Are you sure you want to remove this custom room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRooms(rooms.filter(r => r.id !== roomId));
          },
        },
      ]
    );
  };

  const handleContinue = async () => {
    const selectedRooms = rooms.filter(r => r.selected);
    console.log('📸 RoomSelection: handleContinue called', { selectedCount: selectedRooms.length });

    if (selectedRooms.length === 0) {
      Alert.alert(
        'Select Rooms',
        'Please select at least one room to continue.'
      );
      return;
    }

    // Build updated property data with rooms
    const updatedPropertyData = {
      ...propertyData,
      rooms: selectedRooms.map(r => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        required: r.required,
        selected: r.selected,
        custom: r.custom,
      })),
    };

    console.log('📸 RoomSelection: Saving with rooms:', updatedPropertyData.rooms);

    // Save draft (non-blocking - navigate regardless)
    try {
      updatePropertyData(updatedPropertyData);
      await saveDraft();
      console.log('📸 RoomSelection: Draft saved successfully');
    } catch (error) {
      console.warn('📸 RoomSelection: Draft save failed (continuing anyway):', error);
    }

    // Navigate to next screen with draftId for persistence
    console.log('📸 RoomSelection: Navigating to RoomPhotography with draftId:', draftId);
    navigation.navigate('RoomPhotography', {
      propertyData: updatedPropertyData,
      draftId,
    });
  };

  const getProgressPercentage = () => {
    // Step 3 of 8: base progress is 2 completed steps (25%)
    // Add up to 12.5% more based on room selection (filling step 3)
    const selectedCount = rooms.filter(r => r.selected).length;
    const baseProgress = 25; // Steps 1-2 complete
    const selectionBonus = selectedCount > 0 ? Math.min(selectedCount, 10) : 0;
    return Math.min(baseProgress + selectionBonus, 37); // Cap at ~37% for step 3
  };

  const getSelectedCount = () => rooms.filter(r => r.selected).length;

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
    selectionSummary: {
      backgroundColor: '#E7F5FF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryText: {
      fontSize: 16,
      color: '#004499',
    },
    summaryCount: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0066CC',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 16,
    },
    roomGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 32,
    },
    roomCard: {
      width: responsive.select({
        mobile: '48%',
        tablet: '31%',
        desktop: '23%',
        default: '48%'
      }),
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#DEE2E6',
      minHeight: 100,
    },
    roomCardSelected: {
      borderColor: '#28A745',
      backgroundColor: '#F8FFF9',
    },
    roomCardRequired: {
      borderColor: '#FFC107',
    },
    roomIcon: {
      marginBottom: 8,
    },
    roomName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#343A40',
      textAlign: 'center',
      marginBottom: 4,
    },
    roomBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#FFC107',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    customRoomBadge: {
      backgroundColor: '#6C757D',
    },
    removeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#DC3545',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addCustomSection: {
      marginBottom: 32,
    },
    addCustomButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#DEE2E6',
    },
    addCustomText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C757D',
      marginLeft: 8,
    },
    customInputContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    customInput: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      minHeight: 56,
    },
    addButton: {
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingHorizontal: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
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
    continueButton: {
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
    },
    continueButtonDisabled: {
      backgroundColor: '#DEE2E6',
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth="large" padding={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#6C757D" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <ResponsiveTitle style={{ marginBottom: 8 }}>Select Rooms</ResponsiveTitle>
          <ResponsiveBody style={{ color: '#6C757D' }}>
            Choose which rooms to document. You can add custom rooms too.
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
              {getProgressPercentage()}% complete • Step 3 of 8
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Selection Summary */}
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryText}>Rooms Selected</Text>
            <Text style={styles.summaryCount}>{getSelectedCount()}</Text>
          </View>

          {/* Common Rooms */}
          <Text style={styles.sectionTitle}>Common Rooms</Text>
          <View style={styles.roomGrid}>
            {rooms.filter(r => !r.custom).map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.roomCard,
                  room.selected && styles.roomCardSelected,
                  room.required && styles.roomCardRequired,
                ]}
                onPress={() => toggleRoom(room.id)}
              >
                <Ionicons 
                  name={room.icon as any} 
                  size={32} 
                  color={room.selected ? '#28A745' : '#6C757D'} 
                  style={styles.roomIcon}
                />
                <Text style={styles.roomName}>{room.name}</Text>
                {room.required && (
                  <View style={styles.roomBadge}>
                    <Text style={styles.badgeText}>Required</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Rooms */}
          {rooms.some(r => r.custom) && (
            <>
              <Text style={styles.sectionTitle}>Custom Rooms</Text>
              <View style={styles.roomGrid}>
                {rooms.filter(r => r.custom).map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.roomCard,
                      room.selected && styles.roomCardSelected,
                    ]}
                    onPress={() => toggleRoom(room.id)}
                  >
                    <Ionicons 
                      name="home-outline" 
                      size={32} 
                      color={room.selected ? '#28A745' : '#6C757D'} 
                      style={styles.roomIcon}
                    />
                    <Text style={styles.roomName}>{room.name}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeCustomRoom(room.id)}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Add Custom Room */}
          <View style={styles.addCustomSection}>
            {!showCustomInput ? (
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={() => setShowCustomInput(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#6C757D" />
                <Text style={styles.addCustomText}>Add Custom Room</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  value={customRoomName}
                  onChangeText={setCustomRoomName}
                  placeholder="Enter room name"
                  placeholderTextColor="#6C757D"
                  autoFocus
                  onSubmitEditing={addCustomRoom}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addCustomRoom}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
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

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              getSelectedCount() === 0 && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={getSelectedCount() === 0}
          >
            <Text style={styles.continueButtonText}>
              Continue to Room Photos
            </Text>
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

export default PropertyRoomSelectionScreen;
