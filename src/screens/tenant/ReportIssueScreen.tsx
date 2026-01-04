import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useApiClient } from '../../services/api/client';
import { SmartDropdown } from '../../components/shared/SmartDropdown';
import { AREA_TEMPLATES } from '../../data/areaTemplates';
import { getAssetsByRoom, ASSET_TEMPLATES_BY_ROOM } from '../../data/assetTemplates';
import { AreaType } from '../../models/Property';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { formatAddress } from '../../utils/helpers';

type ReportIssueScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'ReportIssue'>;

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
}

// Helper function - moved outside component to avoid hoisting issues
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'plumbing': return 'water';
    case 'electrical': return 'flash';
    case 'hvac': return 'thermometer';
    case 'appliance': return 'home';
    case 'fixture': return 'build';
    case 'structural': return 'business';
    default: return 'construct';
  }
};

const ReportIssueScreen = () => {
  const navigation = useNavigation<ReportIssueScreenNavigationProp>();
  const { isSignedIn } = useUnifiedAuth();

  const handleGoBack = () => {
    navigation.goBack();
  };
  const apiClient = useApiClient();
  const [issueDescription, setIssueDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  
  // Property context
  const [tenantProperties, setTenantProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Smart dropdown states
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('');
  const [selectedPriority, setPriority] = useState<string>('medium');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedTiming, setSelectedTiming] = useState<string>('');
  const [otherIssueDescription, setOtherIssueDescription] = useState<string>('');
  
  const speechRecognitionRef = useRef<object | null>(null);

  // Load tenant properties on component mount
  useEffect(() => {
    loadTenantProperties();
  }, []);

  const loadTenantProperties = async () => {
    if (!apiClient) {
      setLoadingProperties(false);
      return;
    }

    try {
      const properties = await apiClient.getTenantProperties();
      setTenantProperties(properties || []);

      // Auto-select if only one property
      if (properties && properties.length === 1) {
        setSelectedProperty(properties[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load your properties. Please try again.');
    } finally {
      setLoadingProperties(false);
    }
  };

  // Get dropdown options based on selections
  const areaOptions = AREA_TEMPLATES.map(area => ({
    value: area.type,
    label: area.displayName,
    icon: area.icon,
    description: area.description
  }));

  const assetOptions = selectedArea
    ? [
        ...getAssetsByRoom(selectedArea).map(asset => ({
          value: asset.name,
          label: asset.name,
          icon: getCategoryIcon(asset.category.toLowerCase()),
          description: asset.category
        })),
        {
          value: 'Other',
          label: 'Other',
          icon: 'ellipsis-horizontal',
          description: 'Something else not listed'
        }
      ]
    : [];

  const getIssueTypesForAsset = (assetName: string) => {
    const commonIssues: Record<string, { value: string; label: string; icon: string; description: string }[]> = {
      'Refrigerator': [
        { value: 'not cooling', label: 'Not cooling properly', icon: 'snow', description: 'Temperature issues' },
        { value: 'strange noise', label: 'Making strange noises', icon: 'volume-high', description: 'Unusual sounds' },
        { value: 'water leak', label: 'Water leaking', icon: 'water', description: 'Water on floor' },
        { value: 'ice maker issue', label: 'Ice maker not working', icon: 'cube', description: 'Ice production problems' }
      ],
      'Dishwasher': [
        { value: 'not cleaning', label: 'Not cleaning dishes', icon: 'ban', description: 'Poor washing performance' },
        { value: 'water leak', label: 'Water leaking', icon: 'water', description: 'Water on floor' },
        { value: 'strange noise', label: 'Making strange noises', icon: 'volume-high', description: 'Unusual sounds' },
        { value: 'not draining', label: 'Not draining properly', icon: 'funnel', description: 'Water remains in bottom' }
      ],
      'Kitchen Faucet': [
        { value: 'dripping', label: 'Dripping/leaking', icon: 'water', description: 'Continuous drip' },
        { value: 'low pressure', label: 'Low water pressure', icon: 'arrow-down', description: 'Weak water flow' },
        { value: 'handle loose', label: 'Handle is loose', icon: 'hand-left', description: 'Handle moves freely' },
        { value: 'no hot water', label: 'No hot water', icon: 'thermometer', description: 'Only cold water flows' }
      ],
      'Toilet': [
        { value: 'running constantly', label: 'Running constantly', icon: 'infinite', description: 'Water keeps running' },
        { value: 'not flushing', label: 'Not flushing properly', icon: 'close-circle', description: 'Weak or no flush' },
        { value: 'clogged', label: 'Clogged', icon: 'ban', description: 'Water overflowing' },
        { value: 'loose', label: 'Toilet is loose', icon: 'move', description: 'Rocks or moves' }
      ],
      'Garbage Disposal': [
        { value: 'not working', label: 'Not working at all', icon: 'close-circle', description: 'No power or response' },
        { value: 'jammed', label: 'Jammed/stuck', icon: 'lock-closed', description: 'Not grinding' },
        { value: 'strange noise', label: 'Making strange noises', icon: 'volume-high', description: 'Unusual grinding sounds' },
        { value: 'water leak', label: 'Water leaking', icon: 'water', description: 'Water under sink' }
      ]
    };

    return commonIssues[assetName] || [
      { value: 'not working', label: 'Not working properly', icon: 'close-circle', description: 'General malfunction' },
      { value: 'damaged', label: 'Damaged', icon: 'warning', description: 'Physical damage visible' },
      { value: 'strange noise', label: 'Making strange noises', icon: 'volume-high', description: 'Unusual sounds' }
    ];
  };

  const issueTypeOptions = selectedAsset
    ? [
        ...getIssueTypesForAsset(selectedAsset),
        {
          value: 'other',
          label: 'Other (not listed)',
          icon: 'ellipsis-horizontal',
          description: 'Issue not in the list above'
        }
      ]
    : [];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', icon: 'arrow-down', description: 'Not urgent, can wait' },
    { value: 'medium', label: 'Medium Priority', icon: 'remove', description: 'Needs attention soon' },
    { value: 'high', label: 'High Priority', icon: 'arrow-up', description: 'Urgent, affects daily life' },
    { value: 'emergency', label: 'Emergency', icon: 'alert', description: 'Safety issue, immediate attention' }
  ];

  const durationOptions = [
    { value: 'just_noticed', label: 'Just noticed', icon: 'eye', description: 'First time seeing this issue' },
    { value: 'few_days', label: 'A few days', icon: 'calendar', description: '2-3 days' },
    { value: 'week', label: 'About a week', icon: 'calendar', description: '7 days or so' },
    { value: 'more_week', label: 'More than a week', icon: 'calendar', description: 'Over a week' },
    { value: 'ongoing_months', label: 'Ongoing for months', icon: 'time', description: 'Long-term issue' }
  ];

  const timingOptions = [
    { value: 'all_time', label: 'All the time', icon: 'infinite', description: 'Constant issue' },
    { value: 'mornings', label: 'Only mornings', icon: 'sunny', description: 'Happens in AM' },
    { value: 'evenings', label: 'Only evenings', icon: 'moon', description: 'Happens in PM' },
    { value: 'randomly', label: 'Randomly', icon: 'shuffle', description: 'No clear pattern' },
    { value: 'specific_use', label: 'When using specific items', icon: 'hand-left', description: 'During certain activities' }
  ];

  // Reset dependent dropdowns when parent changes
  const handleAreaChange = (areaType: string) => {
    setSelectedArea(areaType);
    setSelectedAsset('');
    setSelectedIssueType('');
    
    // Auto-generate title if asset and issue are selected
    updateTitle(areaType, '', '');
  };

  const handleAssetChange = (assetName: string) => {
    setSelectedAsset(assetName);
    setSelectedIssueType('');
    
    updateTitle(selectedArea, assetName, '');
  };

  const handleIssueTypeChange = (issueType: string) => {
    setSelectedIssueType(issueType);
    updateTitle(selectedArea, selectedAsset, issueType);
  };

  const updateTitle = (area: string, asset: string, issue: string) => {
    if (asset && issue) {
      setTitle(`${asset}: ${issue}`);
    } else if (asset) {
      setTitle(`${asset} Issue`);
    } else {
      setTitle('');
    }
  };

  const handleVoiceInput = () => {
    Alert.alert(
      'Voice Input',
      'For voice descriptions, use the camera button to record a video with audio. This text field is for typing additional details.',
      [
        { 
          text: 'Add Sample Text', 
          onPress: () => {
            setIssueDescription(prev => 
              prev + (prev ? ' ' : '') + 'Issue started this morning around 8 AM. Water is dripping steadily and there are water stains forming on the ceiling.'
            );
          }
        },
        { text: 'OK' }
      ]
    );
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newMediaItems: MediaItem[] = result.assets.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
        type: 'image' as const,
      }));
      setMediaItems(prev => [...prev, ...newMediaItems]);
    }
  };

  const handleCamera = async () => {
    // Check if we're in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo) {
      Alert.alert(
        'Camera Not Available',
        'Camera functionality requires a development build. In Expo Go, you can use "Choose from Library" instead.',
        [
          { text: 'Choose from Library', onPress: handleImagePicker },
          { text: 'OK' }
        ]
      );
      return;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos and videos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Note: ImagePicker handles microphone permissions automatically for video recording
      // The NSMicrophoneUsageDescription in app.json will prompt when needed

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const newMedia: MediaItem = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        };
        setMediaItems(prev => [...prev, newMedia]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Camera Error',
        'There was an issue accessing the camera. Please try again or use "Choose from Library".',
        [
          { text: 'Choose from Library', onPress: handleImagePicker },
          { text: 'OK' }
        ]
      );
    }
  };

  const removeMediaItem = (id: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedProperty) {
      Alert.alert('Missing Information', 'Please select a property first.');
      return;
    }

    if (selectedIssueType === 'other' && !otherIssueDescription.trim()) {
      Alert.alert('Missing Information', 'Please describe the issue since you selected "Other".');
      return;
    }

    const reviewData = {
      propertyId: selectedProperty.properties?.id || selectedProperty.id,
      propertyName: selectedProperty.properties?.name || selectedProperty.name,
      unitNumber: selectedProperty.unit_number,
      area: selectedArea,
      asset: selectedAsset,
      issueType: selectedIssueType === 'other' ? otherIssueDescription.trim() : selectedIssueType,
      priority: selectedPriority,
      duration: selectedDuration,
      timing: selectedTiming,
      additionalDetails: issueDescription.trim(),
      mediaItems: mediaItems.map(item => item.uri),
      title: title.trim()
    };

    navigation.navigate('ReviewIssue', { reviewData });
  };

  // Check if form is valid for forward navigation
  // All fields are optional except property
  const isFormValid = () => {
    if (!selectedProperty) return false;
    if (selectedIssueType === 'other' && !otherIssueDescription.trim()) return false;
    return true;
  };

  // Header right with forward navigation
  const headerRight = (
    <TouchableOpacity
      style={[styles.headerNextButton, !isFormValid() && styles.headerNextButtonDisabled]}
      onPress={handleSubmit}
      disabled={!isFormValid()}
    >
      <Ionicons name="arrow-forward" size={24} color={!isFormValid() ? '#BDC3C7' : '#2C3E50'} />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      title="Report Issue"
      subtitle="Step 1 of 2"
      showBackButton
      onBackPress={handleGoBack}
      headerRight={headerRight}
      userRole="tenant"
      keyboardAware
    >

        {/* Property Selection */}
        {tenantProperties.length > 1 && (
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Ionicons name="home" size={16} color="#007AFF" />
              </View>
              <Text style={styles.stepTitle}>Select Property</Text>
            </View>
            <SmartDropdown
              label=""
              placeholder="Choose which property has the issue"
              options={tenantProperties.map(prop => ({
                value: prop.properties?.id || prop.id,
                label: `${prop.properties.name}${prop.unit_number ? ` - Unit ${prop.unit_number}` : ''}`,
                icon: 'home',
                description: prop.properties.address
              }))}
              value={selectedProperty?.properties?.id || selectedProperty?.id || ''}
              onSelect={(value) => {
                const property = tenantProperties.find(p => p.properties?.id === value || p.id === value);
                setSelectedProperty(property);
              }}
            />
          </View>
        )}

        {/* Current Property Display */}
        {selectedProperty && (
          <View style={styles.propertyDisplay}>
            <View style={styles.propertyHeader}>
              <Ionicons name="home" size={20} color="#007AFF" />
              <Text style={styles.propertyName}>{selectedProperty.properties.name}</Text>
            </View>
            <Text style={styles.propertyAddress}>
              {formatAddress(selectedProperty.properties.address)}
              {selectedProperty.unit_number && ` • Unit ${selectedProperty.unit_number}`}
            </Text>
          </View>
        )}

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Where is the issue?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select area (e.g., Kitchen, Bathroom)"
            options={areaOptions}
            value={selectedArea}
            onSelect={handleAreaChange}
          />
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>What needs repair?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select the specific item"
            options={assetOptions}
            value={selectedAsset}
            onSelect={handleAssetChange}
            disabled={!selectedArea}
          />
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>What's the problem?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select the specific issue"
            options={issueTypeOptions}
            value={selectedIssueType}
            onSelect={handleIssueTypeChange}
            disabled={!selectedAsset}
          />
          {selectedIssueType === 'other' && (
            <View style={styles.otherIssueSection}>
              <Text style={styles.otherIssueLabel}>Please describe the issue:</Text>
              <TextInput
                style={styles.otherIssueInput}
                placeholder="Tell us what's wrong..."
                placeholderTextColor="#95A5A6"
                multiline
                numberOfLines={3}
                value={otherIssueDescription}
                onChangeText={setOtherIssueDescription}
                textAlignVertical="top"
              />
            </View>
          )}
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepTitle}>How urgent is this?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select priority level"
            options={priorityOptions}
            value={selectedPriority}
            onSelect={setPriority}
          />
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>5</Text>
            </View>
            <Text style={styles.stepTitle}>How long has this been occurring?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select duration"
            options={durationOptions}
            value={selectedDuration}
            onSelect={setSelectedDuration}
          />
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>6</Text>
            </View>
            <Text style={styles.stepTitle}>Does this happen at specific times?</Text>
          </View>
          <SmartDropdown
            label=""
            placeholder="Select timing pattern"
            options={timingOptions}
            value={selectedTiming}
            onSelect={setSelectedTiming}
          />
        </View>

        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>7</Text>
            </View>
            <Text style={styles.stepTitle}>Additional details</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Any additional context, symptoms, or details that might help... (optional)"
              placeholderTextColor="#95A5A6"
              multiline
              numberOfLines={4}
              value={issueDescription}
              onChangeText={setIssueDescription}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
              onPress={handleVoiceInput}
            >
              <Ionicons 
                name={isRecording ? "stop-circle" : "mic"} 
                size={24} 
                color={isRecording ? "#E74C3C" : "#3498DB"} 
              />
            </TouchableOpacity>
          </View>
          {isRecording && (
            <Text style={styles.recordingText}>🎤 Listening...</Text>
          )}
        </View>

        {title && (
          <View style={styles.titlePreview}>
            <Text style={styles.titlePreviewLabel}>Summary:</Text>
            <Text style={styles.titlePreviewText}>{title}</Text>
          </View>
        )}

        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>Add Photos or Videos</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaButton} onPress={handleCamera}>
              <Ionicons name="camera" size={24} color="#3498DB" />
              <Text style={styles.mediaButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={handleImagePicker}>
              <Ionicons name="images" size={24} color="#3498DB" />
              <Text style={styles.mediaButtonText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          {mediaItems.length > 0 && (
            <View style={styles.mediaPreview}>
              <Text style={styles.previewTitle}>Attached Media ({mediaItems.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mediaItems.map((item) => (
                  <View key={item.id} style={styles.photoContainer}>
                    <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeMediaItem(item.id)}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 24,
  },
  stepSection: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  voiceButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  voiceButtonActive: {
    backgroundColor: '#FCF3F3',
    borderColor: '#E74C3C',
  },
  recordingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#E74C3C',
    fontStyle: 'italic',
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  mediaPreview: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNextButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNextButtonDisabled: {
    opacity: 0.4,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  pickerText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  estimateSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  estimateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27AE60',
  },
  estimateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 4,
  },
  estimateSubtext: {
    fontSize: 14,
    color: '#16A34A',
  },
  titlePreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titlePreviewLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  titlePreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  otherIssueSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  otherIssueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  otherIssueInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  propertyDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default ReportIssueScreen;
