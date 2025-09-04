import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { AREA_TEMPLATES } from '../../data/areaTemplates';
// import { ASSET_TEMPLATES } from '../../data/nulls'; // TODO: Fix import

type ReviewIssueScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'ReviewIssue'>;
type ReviewIssueScreenRouteProp = RouteProp<TenantStackParamList, 'ReviewIssue'>;

interface TimeSlot {
  day: string;
  date: string;
  periods: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

const ReviewIssueScreen = () => {
  console.log('=== ReviewIssueScreen MOUNTED at', new Date().toISOString(), '===');
  
  const navigation = useNavigation<ReviewIssueScreenNavigationProp>();
  const route = useRoute<ReviewIssueScreenRouteProp>();
  
  console.log('Route params:', route.params);
  console.log('Raw route params string:', JSON.stringify(route.params));
  
  const { reviewData } = route.params || {};
  console.log('ReviewData received:', reviewData);
  console.log('ReviewData stringified:', JSON.stringify(reviewData));
  
  // Safety check for reviewData
  if (!reviewData || typeof reviewData !== 'object') {
    console.error('Invalid reviewData received:', reviewData);
    // Navigate back or show error
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: Invalid review data received</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const apiClient = useApiClient();

  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [vendorComment, setVendorComment] = useState('');
  const [applyToAllDays, setApplyToAllDays] = useState(false);

  // Generate next 5 days for scheduling
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      slots.push({
        day: dayNames[date.getDay()],
        date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
        periods: {
          morning: false,
          afternoon: false,
          evening: false
        }
      });
    }
    
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  const handleApplyToAllDaysToggle = () => {
    const newApplyToAllDays = !applyToAllDays;
    setApplyToAllDays(newApplyToAllDays);
    
    // If turning ON the toggle, apply any existing selections to all days
    if (newApplyToAllDays) {
      // Find all periods that are selected on any day
      const selectedPeriods = {
        morning: timeSlots.some(slot => slot.periods.morning),
        afternoon: timeSlots.some(slot => slot.periods.afternoon),
        evening: timeSlots.some(slot => slot.periods.evening),
      };
      
      // Apply these selections to all days
      const updated = timeSlots.map(slot => ({
        ...slot,
        periods: {
          morning: selectedPeriods.morning,
          afternoon: selectedPeriods.afternoon,
          evening: selectedPeriods.evening,
        }
      }));
      setTimeSlots(updated);
    }
  };

  const toggleTimeSlot = (dayIndex: number, period: 'morning' | 'afternoon' | 'evening') => {
    if (applyToAllDays) {
      // Toggle the same period for all days
      const newValue = !timeSlots[dayIndex].periods[period];
      const updated = timeSlots.map(slot => ({
        ...slot,
        periods: {
          ...slot.periods,
          [period]: newValue
        }
      }));
      setTimeSlots(updated);
    } else {
      // Toggle only the specific day/period
      const updated = timeSlots.map((slot, index) => {
        if (index === dayIndex) {
          return {
            ...slot,
            periods: {
              ...slot.periods,
              [period]: !slot.periods[period]
            }
          };
        }
        return slot;
      });
      setTimeSlots(updated);
    }
  };

  const getSelectedSlotsCount = () => {
    return timeSlots.reduce((count, slot) => {
      return count + Object.values(slot.periods).filter(Boolean).length;
    }, 0);
  };

  const getAIAnalysis = () => {
    const areaName = AREA_TEMPLATES.find((a: {type: string, displayName?: string}) => a.type === reviewData.area)?.displayName || reviewData.area;
    // const assetTemplate = null; // ASSET_TEMPLATES integration disabled
    
    // Simple AI analysis based on issue data
    const analysisMap: { [key: string]: { what: string; timeline: string; vendor: string } } = {
      'faucet leak': {
        what: 'Likely worn faucet gasket or loose packing nut. Common after 2-3 years of use.',
        timeline: 'Typical repair time: 1-2 hours. Can usually be scheduled within 2-3 days.',
        vendor: 'Plumber required for proper repair and parts replacement.'
      },
      'drain clog': {
        what: 'Blockage in drain pipes, often from hair, soap, or food particles.',
        timeline: 'Typical repair time: 30-60 minutes. Emergency service available if urgent.',
        vendor: 'Plumber with drain cleaning equipment needed.'
      },
      'toilet running': {
        what: 'Usually a faulty flapper, chain, or fill valve in the tank mechanism.',
        timeline: 'Quick repair: 15-30 minutes. Can often be done same day.',
        vendor: 'Basic plumbing repair - handyman or plumber.'
      }
    };

    const key = reviewData.issueType.toLowerCase();
    const analysis = analysisMap[key] || {
      what: 'Issue requires professional assessment to determine exact cause.',
      timeline: 'Repair timeline depends on diagnosis and parts availability.',
      vendor: 'Appropriate specialist will be assigned based on issue type.'
    };

    return analysis;
  };

  const formatPriorityDisplay = (priority: string) => {
    const priorityColors: { [key: string]: string } = {
      low: '#27AE60',
      medium: '#F39C12', 
      high: '#E67E22',
      emergency: '#E74C3C'
    };

    return {
      text: priority.charAt(0).toUpperCase() + priority.slice(1),
      color: priorityColors[priority] || '#95A5A6'
    };
  };

  const handleEdit = () => {
    navigation.goBack();
  };

  const handleSubmit = async () => {
    const selectedCount = getSelectedSlotsCount();
    if (selectedCount === 0) {
      Alert.alert('Select Availability', 'Please select at least one time slot when you\'ll be available for the repair.');
      return;
    }

    setIsSubmitting(true);

    try {
      const areaName = AREA_TEMPLATES.find((a: {type: string, displayName?: string}) => a.type === reviewData.area)?.displayName || reviewData.area;
      // const assetTemplate = null; // ASSET_TEMPLATES integration disabled

      // Build comprehensive description
      const structuredDescription = `Location: ${areaName}
Asset: ${reviewData.asset} (${'General'})
Issue Type: ${reviewData.issueType}
Priority: ${reviewData.priority.charAt(0).toUpperCase() + reviewData.priority.slice(1)}
Duration: ${reviewData.duration}
Timing: ${reviewData.timing}${reviewData.additionalDetails ? `

Additional Details: ${reviewData.additionalDetails}` : ''}${vendorComment ? `

Vendor Instructions: ${vendorComment}` : ''}`;

      // Format selected time slots
      const availableSlots = timeSlots
        .filter(slot => Object.values(slot.periods).some(Boolean))
        .map(slot => {
          const periods = Object.entries(slot.periods)
            .filter(([_, selected]) => selected)
            .map(([period, _]) => period);
          return `${slot.day} ${slot.date}: ${periods.join(', ')}`;
        });

      // Create case data
      const caseData = {
        title: reviewData.title || `${areaName} ${reviewData.asset}: ${reviewData.issueType}`,
        description: structuredDescription,
        category: 'General'?.toLowerCase().replace(/\s+/g, '_') || 'other',
        priority: reviewData.priority,
        propertyAddress: 'Default Property Address',
        location: reviewData.area,
        
        structuredData: {
          area: reviewData.area,
          areaDisplayName: areaName,
          asset: reviewData.asset,
          issueType: reviewData.issueType,
          priority: reviewData.priority,
          duration: reviewData.duration,
          timing: reviewData.timing,
          assetCategory: 'General',
          vendorType: 'specialist',
          additionalDetails: reviewData.additionalDetails || null,
          availableTimeSlots: availableSlots
        },
        
        images: []
      };

      if (!apiClient) {
        console.error('API client not available');
        return;
      }
      
      const maintenanceRequestData = {
        propertyId: reviewData.propertyId,
        title: reviewData.title || reviewData.issueType,
        description: structuredDescription,
        priority: reviewData.priority,
        area: reviewData.area,
        asset: reviewData.asset,
        issueType: reviewData.issueType,
        images: reviewData.mediaItems || []
      };
      
      console.log('=== SUBMITTING MAINTENANCE REQUEST ===');
      console.log('Request data:', JSON.stringify(maintenanceRequestData, null, 2));
      
      const response = await apiClient.createMaintenanceRequest(maintenanceRequestData);
      
      // Navigate to success screen
      navigation.navigate('SubmissionSuccess');
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Submission Failed',
        `Failed to submit your request: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const analysis = getAIAnalysis();
  const areaName = AREA_TEMPLATES.find(a => a.type === reviewData.area)?.displayName || reviewData.area;
  const priorityDisplay = formatPriorityDisplay(reviewData.priority);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Your Request</Text>
          <Text style={styles.subtitle}>Confirm details and select your availability</Text>
        </View>

        {/* Request Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="document-text" size={20} color="#3498DB" />
            <Text style={styles.summaryTitle}>Request Summary</Text>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={16} color="#3498DB" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryContent}>
            <Text style={styles.requestTitle}>{reviewData.title}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{areaName}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Item:</Text>
              <Text style={styles.detailValue}>{reviewData.asset}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issue:</Text>
              <Text style={styles.detailValue}>{reviewData.issueType}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Priority:</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityDisplay.color + '20' }]}>
                <Text style={[styles.priorityText, { color: priorityDisplay.color }]}>
                  {priorityDisplay.text}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{reviewData.duration.replace('_', ' ')}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timing:</Text>
              <Text style={styles.detailValue}>{reviewData.timing.replace('_', ' ')}</Text>
            </View>
            
            {reviewData.additionalDetails && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Additional Details:</Text>
                <Text style={styles.detailValue}>{reviewData.additionalDetails}</Text>
              </View>
            )}
          </View>
        </View>

        {/* AI Analysis */}
        <View style={styles.aiCard}>
          <TouchableOpacity 
            style={styles.aiHeader}
            onPress={() => setShowAIAnalysis(!showAIAnalysis)}
          >
            <Ionicons name="bulb" size={20} color="#F39C12" />
            <Text style={styles.aiTitle}>AI Analysis</Text>
            <Ionicons 
              name={showAIAnalysis ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#F39C12" 
            />
          </TouchableOpacity>
          
          {showAIAnalysis && (
            <View style={styles.aiContent}>
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>What's likely happening:</Text>
                <Text style={styles.aiSectionText}>• {analysis.what}</Text>
              </View>
              
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>What to expect:</Text>
                <Text style={styles.aiSectionText}>• {analysis.timeline}</Text>
              </View>
              
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>Who will handle this:</Text>
                <Text style={styles.aiSectionText}>• {analysis.vendor}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Time Slot Selection */}
        <View style={styles.schedulingCard}>
          <View style={styles.schedulingHeader}>
            <Ionicons name="calendar" size={20} color="#27AE60" />
            <Text style={styles.schedulingTitle}>When are you available?</Text>
            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>{getSelectedSlotsCount()} selected</Text>
            </View>
          </View>
          
          <Text style={styles.schedulingSubtitle}>
            Select multiple time slots to help schedule faster
          </Text>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Apply same times to all days</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                applyToAllDays ? styles.toggleButtonActive : null
              ]}
              onPress={handleApplyToAllDaysToggle}
            >
              <View style={[
                styles.toggleCircle, 
                applyToAllDays ? styles.toggleCircleActive : null
              ]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.timeSlotGrid}>
            {timeSlots.map((slot, dayIndex) => (
              <View key={dayIndex} style={styles.daySlot}>
                <Text style={styles.dayTitle}>{slot.day}</Text>
                <Text style={styles.dayDate}>{slot.date}</Text>
                
                <View style={styles.periodButtons}>
                  {['morning', 'afternoon', 'evening'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        slot.periods[period as keyof typeof slot.periods] && styles.periodButtonSelected
                      ]}
                      onPress={() => toggleTimeSlot(dayIndex, period as 'morning' | 'afternoon' | 'evening')}
                    >
                      <View style={styles.periodButtonContent}>
                        <Text style={[
                          styles.periodButtonText,
                          slot.periods[period as keyof typeof slot.periods] && styles.periodButtonTextSelected
                        ]}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                        <Text style={[
                          styles.periodButtonTime,
                          slot.periods[period as keyof typeof slot.periods] && styles.periodButtonTimeSelected
                        ]}>
                          {period === 'morning' ? '8am-12pm' : period === 'afternoon' ? '12pm-5pm' : '5pm-8pm'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Vendor Comment */}
        <View style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <Ionicons name="chatbubble-outline" size={20} color="#3498DB" />
            <Text style={styles.commentTitle}>Comments for vendor (optional)</Text>
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Any special instructions, access details, or other information..."
            placeholderTextColor="#95A5A6"
            multiline
            numberOfLines={3}
            value={vendorComment}
            onChangeText={setVendorComment}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Text>
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  summaryContent: {
    gap: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 2,
    textAlign: 'right',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F4D03F',
    overflow: 'hidden',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F39C12',
    flex: 1,
  },
  aiContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  aiSection: {
    gap: 4,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D68910',
  },
  aiSectionText: {
    fontSize: 14,
    color: '#D68910',
    lineHeight: 20,
  },
  schedulingCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  schedulingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  schedulingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27AE60',
    flex: 1,
  },
  selectedCount: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedCountText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  schedulingSubtitle: {
    fontSize: 14,
    color: '#16A34A',
    marginBottom: 16,
  },
  timeSlotGrid: {
    gap: 12,
  },
  daySlot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  dayDate: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#27AE60',
    borderColor: '#27AE60',
  },
  periodButtonContent: {
    alignItems: 'center',
    gap: 2,
  },
  periodButtonText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  periodButtonTime: {
    fontSize: 10,
    color: '#95A5A6',
  },
  periodButtonTimeSelected: {
    color: '#E8F5E9',
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    
    
    
    
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  commentInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  toggleButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#27AE60',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    
    
    
    
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  submitButton: {
    backgroundColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    
    
    
    
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#27AE60',
    opacity: 1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#E74C3C',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewIssueScreen;