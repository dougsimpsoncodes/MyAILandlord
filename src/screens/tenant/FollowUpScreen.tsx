import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { useApiClient } from '../../services/api/client';

type FollowUpScreenRouteProp = RouteProp<TenantStackParamList, 'FollowUp'>;
type FollowUpScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'FollowUp'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  area?: string;
  asset?: string;
  issue_type?: string;
  created_at: string;
  updated_at?: string;
}

const FollowUpScreen = () => {
  const route = useRoute<FollowUpScreenRouteProp>();
  const navigation = useNavigation<FollowUpScreenNavigationProp>();
  const { issueId } = route.params;
  const apiClient = useApiClient();

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequestDetails();
  }, [issueId]);

  const loadRequestDetails = async () => {
    if (!apiClient) {
      setError('Unable to connect to services');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Get all requests and find the one we need
      const requests = await apiClient.getMaintenanceRequests();
      const found = requests.find((r: any) => r.id === issueId);

      if (found) {
        setRequest({
          id: found.id,
          title: found.title || 'Maintenance Request',
          description: found.description || '',
          status: found.status || 'pending',
          priority: found.priority || 'medium',
          area: found.area,
          asset: found.asset,
          issue_type: found.issue_type,
          created_at: found.created_at,
          updated_at: found.updated_at,
        });
      } else {
        setError('Request not found');
      }
    } catch (err) {
      console.error('Error loading request:', err);
      setError('Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; bgColor: string; icon: string } } = {
      pending: { label: 'Pending', color: '#F39C12', bgColor: '#FEF5E7', icon: 'time-outline' },
      in_progress: { label: 'In Progress', color: '#3498DB', bgColor: '#EBF5FB', icon: 'construct-outline' },
      completed: { label: 'Completed', color: '#27AE60', bgColor: '#E8F8F0', icon: 'checkmark-circle-outline' },
      cancelled: { label: 'Cancelled', color: '#95A5A6', bgColor: '#F5F5F5', icon: 'close-circle-outline' },
    };
    return statusMap[status] || statusMap.pending;
  };

  const getPriorityDisplay = (priority: string) => {
    const priorityMap: { [key: string]: { label: string; color: string } } = {
      low: { label: 'Low', color: '#27AE60' },
      medium: { label: 'Medium', color: '#F39C12' },
      high: { label: 'High', color: '#E67E22' },
      urgent: { label: 'Urgent', color: '#E74C3C' },
    };
    return priorityMap[priority] || priorityMap.medium;
  };

  if (isLoading) {
    return (
      <ScreenContainer
        title="Request Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="tenant"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !request) {
    return (
      <ScreenContainer
        title="Request Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="tenant"
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Request not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRequestDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const statusDisplay = getStatusDisplay(request.status);
  const priorityDisplay = getPriorityDisplay(request.priority);

  return (
    <ScreenContainer
      title="Request Details"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="tenant"
    >
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusDisplay.bgColor }]}>
        <Ionicons name={statusDisplay.icon as any} size={24} color={statusDisplay.color} />
        <View style={styles.statusBannerContent}>
          <Text style={[styles.statusLabel, { color: statusDisplay.color }]}>
            {statusDisplay.label}
          </Text>
          <Text style={styles.statusDate}>
            Submitted {formatDate(request.created_at)}
          </Text>
        </View>
      </View>

      {/* Request Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="document-text" size={20} color="#3498DB" />
          <Text style={styles.summaryTitle}>Request Summary</Text>
        </View>

        <Text style={styles.requestTitle}>{request.title}</Text>

        <View style={styles.detailsGrid}>
          {request.area && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{request.area}</Text>
            </View>
          )}

          {request.asset && (
            <View style={styles.detailRow}>
              <Ionicons name="cube-outline" size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Item:</Text>
              <Text style={styles.detailValue}>{request.asset}</Text>
            </View>
          )}

          {request.issue_type && (
            <View style={styles.detailRow}>
              <Ionicons name="warning-outline" size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Issue:</Text>
              <Text style={styles.detailValue}>{request.issue_type}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="flag-outline" size={16} color="#7F8C8D" />
            <Text style={styles.detailLabel}>Priority:</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityDisplay.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityDisplay.color }]}>
                {priorityDisplay.label}
              </Text>
            </View>
          </View>
        </View>

        {request.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{request.description}</Text>
          </View>
        )}
      </View>

      {/* What's Next Card */}
      <View style={styles.nextStepsCard}>
        <View style={styles.nextStepsHeader}>
          <Ionicons name="time-outline" size={20} color="#9B59B6" />
          <Text style={styles.nextStepsTitle}>What's happening</Text>
        </View>

        {request.status === 'pending' && (
          <View style={styles.nextStepsList}>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Your landlord has been notified</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="ellipse-outline" size={18} color="#BDC3C7" />
              <Text style={styles.nextStepTextPending}>Waiting for vendor assignment</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="ellipse-outline" size={18} color="#BDC3C7" />
              <Text style={styles.nextStepTextPending}>Repair to be scheduled</Text>
            </View>
          </View>
        )}

        {request.status === 'in_progress' && (
          <View style={styles.nextStepsList}>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Your landlord has been notified</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Vendor has been assigned</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="ellipse-outline" size={18} color="#BDC3C7" />
              <Text style={styles.nextStepTextPending}>Repair in progress</Text>
            </View>
          </View>
        )}

        {request.status === 'completed' && (
          <View style={styles.nextStepsList}>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Request submitted</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Vendor assigned</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
              <Text style={styles.nextStepText}>Repair completed</Text>
            </View>
          </View>
        )}
      </View>

      {/* Contact Landlord Button */}
      <TouchableOpacity
        style={styles.contactButton}
        onPress={() => navigation.navigate('CommunicationHub')}
      >
        <Ionicons name="chatbubbles-outline" size={20} color="#3498DB" />
        <Text style={styles.contactButtonText}>Message Landlord</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusDate: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 10,
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
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  nextStepsCard: {
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8D5FF',
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B59B6',
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextStepText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  nextStepTextPending: {
    fontSize: 14,
    color: '#95A5A6',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
});

export default FollowUpScreen;
