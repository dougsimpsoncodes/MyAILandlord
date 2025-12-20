import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import Button from '../../components/shared/Button';

type MaintenanceStatusScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'MaintenanceStatus'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  location: string;
  description: string;
}

interface MaintenanceRequestResponse {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  area: string;
  description: string;
}

const MaintenanceStatusScreen = () => {
  const navigation = useNavigation<MaintenanceStatusScreenNavigationProp>();
  const apiClient = useApiClient();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      if (!apiClient) {
        console.error('API client not available');
        return;
      }
      const maintenanceRequests = await apiClient.getMaintenanceRequests();
      // Transform the response data to match our interface
      const transformedRequests = maintenanceRequests.map((request: any) => ({
        id: request.id,
        title: request.title,
        status: request.status,
        priority: request.priority,
        createdAt: new Date(request.created_at),
        location: request.area || 'Not specified',
        description: request.description
      }));
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error loading maintenance hub:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRequests();
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#F39C12',
      in_progress: '#3498DB',
      completed: '#2ECC71',
      cancelled: '#95A5A6'
    };
    return colors[status] || '#95A5A6';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  const getPriorityIcon = (priority: string) => {
    const icons: { [key: string]: { name: string; color: string } } = {
      low: { name: 'arrow-down', color: '#27AE60' },
      medium: { name: 'remove', color: '#F39C12' },
      high: { name: 'arrow-up', color: '#E67E22' },
      emergency: { name: 'alert', color: '#E74C3C' }
    };
    return icons[priority] || icons.medium;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Count requests by status
  const pendingCount = requests.filter(req => req.status === 'pending').length;
  const inProgressCount = requests.filter(req => req.status === 'in_progress').length;
  const completedCount = requests.filter(req => ['completed', 'cancelled'].includes(req.status)).length;

  // Filter requests based on selected tab
  const filteredRequests = requests.filter(req => {
    if (selectedFilter === 'completed') {
      return ['completed', 'cancelled'].includes(req.status);
    }
    return req.status === selectedFilter;
  });

  if (isLoading) {
    return (
      <ScreenContainer title="Requests" userRole="tenant" scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const getEmptyStateMessage = () => {
    switch (selectedFilter) {
      case 'pending':
        return { title: 'No New Requests', subtitle: 'Report an issue if something needs fixing' };
      case 'in_progress':
        return { title: 'No Requests In Progress', subtitle: 'Requests being worked on will appear here' };
      case 'completed':
        return { title: 'No Completed Requests', subtitle: 'Resolved requests will appear here' };
      default:
        return { title: 'No Requests', subtitle: 'Report an issue if something needs fixing' };
    }
  };

  const emptyState = getEmptyStateMessage();

  return (
    <ScreenContainer
      title="Requests"
      userRole="tenant"
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      bottomContent={
        <Button
          title="Report New Issue"
          onPress={() => navigation.navigate('ReportIssue')}
          type="success"
          fullWidth
          icon={<Ionicons name="construct" size={20} color="#fff" />}
        />
      }
    >
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
              New
            </Text>
            {pendingCount > 0 && (
              <View style={[styles.filterBadge, selectedFilter === 'pending' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, selectedFilter === 'pending' && styles.filterBadgeTextActive]}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'in_progress' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('in_progress')}
          >
            <Text style={[styles.filterText, selectedFilter === 'in_progress' && styles.filterTextActive]}>
              In Progress
            </Text>
            {inProgressCount > 0 && (
              <View style={[styles.filterBadge, selectedFilter === 'in_progress' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, selectedFilter === 'in_progress' && styles.filterBadgeTextActive]}>
                  {inProgressCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'completed' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('completed')}
          >
            <Text style={[styles.filterText, selectedFilter === 'completed' && styles.filterTextActive]}>
              Completed
            </Text>
            {completedCount > 0 && (
              <View style={[styles.filterBadge, selectedFilter === 'completed' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, selectedFilter === 'completed' && styles.filterBadgeTextActive]}>
                  {completedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Request List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={selectedFilter === 'completed' ? 'checkmark-circle-outline' : 'document-text-outline'}
              size={64}
              color={selectedFilter === 'completed' ? '#2ECC71' : '#BDC3C7'}
            />
            <Text style={styles.emptyStateTitle}>{emptyState.title}</Text>
            <Text style={styles.emptyStateSubtitle}>{emptyState.subtitle}</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={[
                styles.requestCard,
                selectedFilter === 'completed' && styles.resolvedCard
              ]}
              onPress={() => navigation.navigate('FollowUp', { issueId: request.id })}
              activeOpacity={0.7}
            >
              <View style={styles.requestHeader}>
                <Text style={[
                  styles.requestTitle,
                  selectedFilter === 'completed' && styles.resolvedTitle
                ]}>
                  {request.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {getStatusText(request.status)}
                  </Text>
                </View>
              </View>

              <Text style={[
                styles.requestMeta,
                selectedFilter === 'completed' && styles.resolvedText
              ]}>
                {request.location} • {selectedFilter === 'completed' ? 'Completed ' : ''}{formatDate(request.createdAt)}
              </Text>

              {request.description && selectedFilter !== 'completed' && (
                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: DesignSystem.colors.textSecondary,
  },
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#2ECC71',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: DesignSystem.colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DesignSystem.colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: DesignSystem.colors.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resolvedCard: {
    opacity: 0.7,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    flex: 1,
    marginRight: 8,
  },
  resolvedTitle: {
    color: DesignSystem.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestMeta: {
    fontSize: 12,
    color: DesignSystem.colors.textSecondary,
    marginBottom: 4,
  },
  resolvedText: {
    color: '#95A5A6',
  },
  requestDescription: {
    fontSize: 13,
    color: DesignSystem.colors.textSecondary,
    lineHeight: 18,
  },
});

export default MaintenanceStatusScreen;
