import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { apiClient } from '../../services/api/client';
import { SmartDropdown } from '../../components/shared/SmartDropdown';
import { AREA_TEMPLATES } from '../../data/areaTemplates';
import { ASSET_TEMPLATES, getAssetsByArea, getCommonIssues, getEstimatedCost } from '../../data/assetTemplates';
import { AreaType } from '../../models/Property';

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
  const [issueDescription, setIssueDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  
  // Smart dropdown states
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('');
  const [selectedPriority, setPriority] = useState<string>('medium');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedTiming, setSelectedTiming] = useState<string>('');
  const [otherIssueDescription, setOtherIssueDescription] = useState<string>('');
  
  // AI insights states
  const [showQuickTip, setShowQuickTip] = useState<boolean>(false);
  
  const speechRecognitionRef = useRef<any>(null);

  // Get dropdown options based on selections
  const areaOptions = AREA_TEMPLATES.map(area => ({
    value: area.type,
    label: area.displayName,
    icon: area.icon,
    description: area.description
  }));

  const assetOptions = selectedArea 
    ? getAssetsByArea(selectedArea as AreaType).map(asset => ({
        value: asset.name,
        label: asset.name,
        icon: getCategoryIcon(asset.category),
        description: `${asset.category} • ${asset.vendorType}`
      }))
    : [];

  const issueTypeOptions = selectedAsset
    ? [
        ...getCommonIssues(selectedAsset).map(issue => ({
          value: issue,
          label: issue,
          icon: 'warning-outline'
        })),
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
    
    // Show AI quick tip if we have enough data and it's not "other"
    if (selectedArea && selectedAsset && issueType && issueType !== 'other') {
      setShowQuickTip(true);
    } else {
      setShowQuickTip(false);
    }
  };

  const getQuickTip = () => {
    if (!selectedAsset || !selectedIssueType || selectedIssueType === 'other') return '';
    
    // Simple AI tips based on common issues
    const tips: { [key: string]: string } = {
      'faucet leak': 'Try tightening the packing nut under the handle first.',
      'drain clog': 'Try using a plunger or drain snake before calling for service.',
      'toilet running': 'Check if the flapper in the tank is sealing properly.',
      'garbage disposal not working': 'Try pressing the reset button on the bottom of the unit.',
      'low water pressure': 'Check if the aerator needs cleaning by unscrewing it from the faucet.',
      'no hot water': 'Check if the pilot light is on (gas) or circuit breaker (electric).',
    };
    
    return tips[selectedIssueType.toLowerCase()] || 'Check if the issue is intermittent or constant for better diagnosis.';
  };

  const updateTitle = (area: string, asset: string, issue: string) => {
    if (area && asset && issue) {
      const areaName = AREA_TEMPLATES.find(a => a.type === area)?.displayName || area;
      setTitle(`${areaName} ${asset}: ${issue}`);
    } else if (area && asset) {
      const areaName = AREA_TEMPLATES.find(a => a.type === area)?.displayName || area;
      setTitle(`${areaName} ${asset} Issue`);
    } else {
      setTitle('');
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      Speech.speak('Please describe your maintenance issue', {
        onDone: () => {
          setIssueDescription(prev => prev + ' [Voice input would be captured here]');
          setIsRecording(false);
        }
      });
    } else {
      Speech.stop();
      setIsRecording(false);
    }
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
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
  };

  const handleCamera = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.All,
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
  };

  const removeMediaItem = (id: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedArea || !selectedAsset || !selectedIssueType || !selectedPriority || !selectedDuration || !selectedTiming) {
      Alert.alert('Missing Information', 'Please complete all required fields (Steps 1-6) to continue.');
      return;
    }
    
    if (selectedIssueType === 'other' && !otherIssueDescription.trim()) {
      Alert.alert('Missing Information', 'Please describe the issue since you selected "Other".');
      return;
    }

    // Navigate to review screen with all collected data
    const reviewData = {
      area: selectedArea,
      asset: selectedAsset,
      issueType: selectedIssueType === 'other' ? otherIssueDescription.trim() : selectedIssueType,
      priority: selectedPriority,
      duration: selectedDuration,
      timing: selectedTiming,
      additionalDetails: issueDescription.trim(),
      mediaItems: mediaItems,
      title: title.trim()
    };

    navigation.navigate('ReviewIssue', { reviewData });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Report Maintenance Issue</Text>
          <Text style={styles.subtitle}>Follow the steps below to submit your request</Text>
        </View>

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

        {showQuickTip && (
          <View style={styles.quickTipSection}>
            <TouchableOpacity 
              style={styles.quickTipHeader}
              onPress={() => setShowQuickTip(!showQuickTip)}
            >
              <Ionicons name="bulb" size={16} color="#F39C12" />
              <Text style={styles.quickTipTitle}>Quick tip available</Text>
              <Ionicons name="chevron-down" size={16} color="#F39C12" />
            </TouchableOpacity>
            <View style={styles.quickTipContent}>
              <Text style={styles.quickTipText}>{getQuickTip()}</Text>
              <View style={styles.quickTipActions}>
                <TouchableOpacity style={styles.quickTipButton}>
                  <Text style={styles.quickTipButtonText}>Mark as Fixed</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickTipButton, styles.quickTipContinueButton]}
                  onPress={() => setShowQuickTip(false)}
                >
                  <Text style={[styles.quickTipButtonText, styles.quickTipContinueButtonText]}>Continue Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
                  <View key={item.id} style={styles.mediaItem}>
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons 
                        name={item.type === 'video' ? 'videocam' : 'image'} 
                        size={40} 
                        color="#95A5A6" 
                      />
                      {item.type === 'video' && (
                        <Text style={styles.mediaTypeLabel}>Video</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMediaItem(item.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.tipSection}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={20} color="#F39C12" />
            <Text style={styles.tipTitle}>Helpful Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Be as specific as possible about the location
            {'\n'}• Include when the problem started
            {'\n'}• Photos help us understand the issue better
            {'\n'}• Mention if it's urgent or affecting daily life
          </Text>
        </View>
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Review Request
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  mediaItem: {
    marginRight: 12,
    position: 'relative',
  },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  mediaTypeLabel: {
    fontSize: 10,
    color: '#7F8C8D',
    marginTop: 2,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  tipSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F4D03F',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F39C12',
  },
  tipText: {
    fontSize: 14,
    color: '#D68910',
    lineHeight: 20,
  },
  submitSection: {
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  continueButton: {
    backgroundColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonDisabled: {
    backgroundColor: '#95A5A6',
    opacity: 0.7,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  quickTipSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F4D03F',
    overflow: 'hidden',
  },
  quickTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  quickTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F39C12',
    flex: 1,
  },
  quickTipContent: {
    padding: 16,
    paddingTop: 0,
  },
  quickTipText: {
    fontSize: 14,
    color: '#D68910',
    lineHeight: 20,
    marginBottom: 12,
  },
  quickTipActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickTipButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F4D03F',
    alignItems: 'center',
  },
  quickTipButtonText: {
    fontSize: 12,
    color: '#D68910',
    fontWeight: '500',
  },
  quickTipContinueButton: {
    backgroundColor: '#F39C12',
  },
  quickTipContinueButtonText: {
    color: '#FFFFFF',
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
});

export default ReportIssueScreen;