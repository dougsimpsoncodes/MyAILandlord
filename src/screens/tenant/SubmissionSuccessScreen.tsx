import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';

type SubmissionSuccessScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'SubmissionSuccess'>;

const SubmissionSuccessScreen = () => {
  const navigation = useNavigation<SubmissionSuccessScreenNavigationProp>();

  const handleNewRequest = () => {
    navigation.navigate('ReportIssue');
  };

  const handleViewRequests = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MaintenanceStatus' }],
    });
  };

  return (
    <ScreenContainer
      title="Request Submitted"
      userRole="tenant"
      scrollable={false}
      padded={false}
    >
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color="#27AE60" />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoItem}>
            <Ionicons name="notifications-outline" size={20} color="#3498DB" />
            <Text style={styles.infoText}>Your landlord will be notified immediately</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="construct-outline" size={20} color="#3498DB" />
            <Text style={styles.infoText}>They'll coordinate with appropriate vendors</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#3498DB" />
            <Text style={styles.infoText}>Repairs will be scheduled based on your availability</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="chatbubbles-outline" size={20} color="#3498DB" />
            <Text style={styles.infoText}>You'll receive updates on the repair status</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleNewRequest}
          >
            <Text style={styles.primaryButtonText}>Report Another Issue</Text>
          </TouchableOpacity>
          
          <Text style={styles.orText}>or</Text>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleViewRequests}
          >
            <Text style={styles.secondaryButtonText}>View Your Requests</Text>
            <Ionicons name="arrow-forward" size={18} color="#3498DB" />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    
    
    
    
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    
    
    
    
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    fontSize: 14,
    color: '#95A5A6',
    marginBottom: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '500',
  },
});

export default SubmissionSuccessScreen;