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
  status: 'new' | 'in_progress' | 'pending_vendor' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  createdAt: Date;
  location: string;
  description: string;
}

interface MaintenanceRequestResponse {
  id: string;
  title: string;
  status: 'new' | 'in_progress' | 'pending_vendor' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'emergency';
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
      const transformedRequests = maintenanceRequests.map((request: MaintenanceRequestResponse) => ({
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
      // For now, use mock data if API fails
      setRequests(getMockRequests());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getMockRequests = (): MaintenanceRequest[] => [
    {
      id: '1',
      title: 'Kitchen Sink: Faucet leak',
      status: 'in_progress',
      priority: 'high',
      createdAt: new Date('2024-01-15'),
      location: 'Kitchen',
      description: 'Faucet is dripping constantly'
    },
    {
      id: '2',
      title: 'Bathroom Toilet: Running constantly',
      status: 'new',
      priority: 'medium',
      createdAt: new Date('2024-01-18'),
      location: 'Bathroom',
      description: 'Toilet keeps running after flush'
    },
    {
      id: '3',
      title: 'Living Room Lighting: Not working',
      status: 'resolved',
      priority: 'low',
      createdAt: new Date('2024-01-10'),
      location: 'Living Room',
      description: 'Overhead light not turning on'
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRequests();
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: '#F39C12',
      in_progress: '#3498DB',
      pending_vendor: '#3498DB',
      resolved: '#2ECC71',
      closed: '#2ECC71'
    };
    return colors[status] || '#95A5A6';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      new: 'Pending',
      in_progress: 'In Progress',
      pending_vendor: 'In Progress',
      resolved: 'Complete',
      closed: 'Complete'
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

  const activeRequests = requests.filter(req => ['new', 'in_progress', 'pending_vendor'].includes(req.status));
  const resolvedRequests = requests.filter(req => ['resolved', 'closed'].includes(req.status));

  if (isLoading) {
    return (
      <ScreenContainer title="My Requests" userRole="tenant" scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="My Requests"
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

        {activeRequests.length === 0 && resolvedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#2ECC71" />
            <Text style={styles.emptyStateTitle}>No Active Requests</Text>
            <Text style={styles.emptyStateSubtitle}>
              Report an issue if something needs fixing
            </Text>
          </View>
        ) : (
          <>
            {activeRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => {
                  // Navigate to detail view when implemented
                }}
                activeOpacity={0.7}
              >
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestMeta}>
                  {request.location} • {formatDate(request.createdAt)}
                </Text>

                {request.description && (
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {request.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            {resolvedRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={[styles.requestCard, styles.resolvedCard]}
                onPress={() => {
                  // Navigate to detail view when implemented
                }}
                activeOpacity={0.7}
              >
                <View style={styles.requestHeader}>
                  <Text style={[styles.requestTitle, styles.resolvedTitle]}>{request.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.requestMeta, styles.resolvedText]}>
                  {request.location} • Resolved {formatDate(request.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </>
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
