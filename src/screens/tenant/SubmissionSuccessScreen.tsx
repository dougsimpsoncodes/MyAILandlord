import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';

type SubmissionSuccessScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'SubmissionSuccess'>;
type SubmissionSuccessScreenRouteProp = RouteProp<TenantStackParamList, 'SubmissionSuccess'>;

const SubmissionSuccessScreen = () => {
  const navigation = useNavigation<SubmissionSuccessScreenNavigationProp>();
  const route = useRoute<SubmissionSuccessScreenRouteProp>();
  const summary = route.params?.summary;

  const handleNewRequest = () => {
    navigation.navigate('ReportIssue');
  };

  const handleViewRequests = () => {
    navigation.getParent()?.navigate('TenantRequests' as never);
  };

  const formatPriority = (priority: string) => {
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

  return (
    <ScreenContainer
      title="Request Submitted"
      userRole="tenant"
      scrollable={true}
      padded={true}
    >
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#27AE60" />
        </View>

        {/* Request Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="document-text" size={20} color="#3498DB" />
              <Text style={styles.summaryTitle}>Your Request</Text>
            </View>

            <Text style={styles.requestTitle}>{summary.title}</Text>

            <View style={styles.summaryDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{summary.area}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cube-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailLabel}>Item:</Text>
                <Text style={styles.detailValue}>{summary.asset}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="warning-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailLabel}>Issue:</Text>
                <Text style={styles.detailValue}>{summary.issueType}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="flag-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailLabel}>Priority:</Text>
                <View style={[styles.priorityBadge, { backgroundColor: formatPriority(summary.priority).color + '20' }]}>
                  <Text style={[styles.priorityText, { color: formatPriority(summary.priority).color }]}>
                    {formatPriority(summary.priority).text}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  summaryDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  infoTitle: {
    fontSize: 16,
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
