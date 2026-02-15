import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';

type ConfirmSubmissionScreenRouteProp = RouteProp<TenantStackParamList, 'ConfirmSubmission'>;
type ConfirmSubmissionScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'ConfirmSubmission'>;

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  available: boolean;
}

const ConfirmSubmissionScreen = () => {
  const route = useRoute<ConfirmSubmissionScreenRouteProp>();
  const navigation = useNavigation<ConfirmSubmissionScreenNavigationProp>();
  const { issueId } = route.params;

  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Fetch real issue data from database using issueId
  // const issue = await fetchMaintenanceRequest(issueId);

  const timeSlots: TimeSlot[] = [
    { id: '1', day: 'Today', time: '2:00 PM - 6:00 PM', available: true },
    { id: '2', day: 'Tomorrow', time: '9:00 AM - 1:00 PM', available: true },
    { id: '3', day: 'Tomorrow', time: '2:00 PM - 6:00 PM', available: false },
    { id: '4', day: 'Friday', time: '9:00 AM - 1:00 PM', available: true },
    { id: '5', day: 'Friday', time: '2:00 PM - 6:00 PM', available: true },
    { id: '6', day: 'Saturday', time: '10:00 AM - 2:00 PM', available: true },
  ];

  const handleTimeSlotToggle = (slotId: string) => {
    setSelectedTimeSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(id => id !== slotId);
      } else {
        return [...prev, slotId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedTimeSlots.length === 0) {
      Alert.alert('Select Time Slots', 'Please select at least one preferred time slot for the repair.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Issue Submitted Successfully!',
        'Your maintenance request has been sent to your landlord. You\'ll receive updates on the progress.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ReportIssue'),
          },
        ]
      );
    } catch {
      Alert.alert('Submission Error', 'Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Header right with Submit button
  const headerRight = (
    <TouchableOpacity
      style={[styles.headerSubmitButton, isSubmitting && styles.headerSubmitButtonDisabled]}
      onPress={handleSubmit}
      disabled={isSubmitting}
    >
      <Text style={[styles.headerSubmitButtonText, isSubmitting && styles.headerSubmitButtonTextDisabled]}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      title="Confirm Request"
      subtitle="Step 2 of 2"
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="tenant"
    >
        <View style={styles.headerIcon}>
          <Ionicons name="checkmark-circle" size={48} color="#27AE60" />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Issue Summary</Text>

          {/* TODO: Display real issue data fetched from database */}
          <View style={styles.summaryItem}>
            <Ionicons name="document-text" size={20} color="#3498DB" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.summaryValue}>Issue #{issueId}</Text>
            </View>
          </View>
        </View>

        <View style={styles.timeSlotCard}>
          <Text style={styles.cardTitle}>Preferred Repair Times</Text>
          <Text style={styles.cardSubtitle}>
            Select all times when you'll be available (select multiple for faster scheduling)
          </Text>

          <View style={styles.timeSlotsContainer}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeSlot,
                  !slot.available && styles.timeSlotDisabled,
                  selectedTimeSlots.includes(slot.id) && styles.timeSlotSelected,
                ]}
                onPress={() => slot.available && handleTimeSlotToggle(slot.id)}
                disabled={!slot.available}
                activeOpacity={0.7}
              >
                <View style={styles.timeSlotContent}>
                  <View>
                    <Text style={[
                      styles.timeSlotDay,
                      !slot.available && styles.timeSlotTextDisabled,
                      selectedTimeSlots.includes(slot.id) && styles.timeSlotTextSelected,
                    ]}>
                      {slot.day}
                    </Text>
                    <Text style={[
                      styles.timeSlotTime,
                      !slot.available && styles.timeSlotTextDisabled,
                      selectedTimeSlots.includes(slot.id) && styles.timeSlotTextSelected,
                    ]}>
                      {slot.time}
                    </Text>
                  </View>
                  {!slot.available ? (
                    <Ionicons name="close-circle" size={24} color="#E74C3C" />
                  ) : selectedTimeSlots.includes(slot.id) ? (
                    <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                  ) : (
                    <Ionicons name="radio-button-off" size={24} color="#BDC3C7" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timeSlotNote}>
            <Ionicons name="information-circle" size={16} color="#7F8C8D" />
            <Text style={styles.timeSlotNoteText}>
              More time slots = faster scheduling. We'll contact you to confirm the exact time.
            </Text>
          </View>
        </View>

        <View style={styles.aiSummary}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color="#9B59B6" />
            <Text style={styles.aiTitle}>AI Summary</Text>
          </View>
          <Text style={styles.aiText}>
            Based on your description, this appears to be a plumbing issue that may require a licensed plumber. 
            The moderate priority suggests it can be scheduled within 1-2 business days. Photos will help the 
            repair team bring the right tools and parts.
          </Text>
        </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    
    
    
    
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  timeSlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    
    
    
    
    elevation: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  timeSlotsContainer: {
    gap: 12,
  },
  timeSlot: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    backgroundColor: '#F8F9FA',
  },
  timeSlotSelected: {
    borderColor: '#27AE60',
    backgroundColor: '#E8F8F5',
  },
  timeSlotDisabled: {
    backgroundColor: '#ECEFF1',
    borderColor: '#E1E8ED',
  },
  timeSlotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSlotDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  timeSlotTextSelected: {
    color: '#27AE60',
  },
  timeSlotTextDisabled: {
    color: '#BDC3C7',
  },
  timeSlotNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  timeSlotNoteText: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
  },
  aiSummary: {
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8D5FF',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B59B6',
  },
  aiText: {
    fontSize: 14,
    color: '#8E44AD',
    lineHeight: 20,
  },
  headerSubmitButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerSubmitButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  headerSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubmitButtonTextDisabled: {
    color: '#FFFFFF',
  },
});

export default ConfirmSubmissionScreen;