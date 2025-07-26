import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';

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
      new: '#3498DB',
      in_progress: '#F39C12',
      pending_vendor: '#9B59B6',
      resolved: '#27AE60',
      closed: '#95A5A6'
    };
    return colors[status] || '#95A5A6';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      new: 'New',
      in_progress: 'In Progress',
      pending_vendor: 'Vendor Assigned',
      resolved: 'Resolved',
      closed: 'Closed'
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading maintenance hub...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3498DB']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Maintenance Hub</Text>
          <TouchableOpacity
            style={styles.newRequestButton}
            onPress={() => navigation.navigate('ReportIssue')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.newRequestButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {activeRequests.length === 0 && resolvedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={80} color="#D5D8DC" />
            <Text style={styles.emptyStateTitle}>No maintenance requests</Text>
            <Text style={styles.emptyStateSubtitle}>
              When you report issues, they'll appear here
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('ReportIssue')}
            >
              <Text style={styles.emptyStateButtonText}>Report First Issue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Requests ({activeRequests.length})</Text>
                {activeRequests.map((request) => (
                  <TouchableOpacity
                    key={request.id}
                    style={styles.requestCard}
                    onPress={() => {
                      // Navigate to detail view when implemented
                      console.log('View request:', request.id);
                    }}
                  >
                    <View style={styles.requestHeader}>
                      <View style={styles.requestTitleContainer}>
                        <Text style={styles.requestTitle}>{request.title}</Text>
                        <View style={styles.requestMeta}>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                              {getStatusText(request.status)}
                            </Text>
                          </View>
                          <View style={styles.priorityIndicator}>
                            <Ionicons 
                              name={getPriorityIcon(request.priority).name as any} 
                              size={16} 
                              color={getPriorityIcon(request.priority).color} 
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.requestDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#7F8C8D" />
                        <Text style={styles.detailText}>{request.location}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={14} color="#7F8C8D" />
                        <Text style={styles.detailText}>{formatDate(request.createdAt)}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.requestDescription} numberOfLines={2}>
                      {request.description}
                    </Text>
                    
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={16} color="#3498DB" />
                        <Text style={styles.actionButtonText}>Message</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="create-outline" size={16} color="#3498DB" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {resolvedRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resolved ({resolvedRequests.length})</Text>
                {resolvedRequests.map((request) => (
                  <TouchableOpacity
                    key={request.id}
                    style={[styles.requestCard, styles.resolvedCard]}
                    onPress={() => {
                      console.log('View resolved request:', request.id);
                    }}
                  >
                    <View style={styles.requestHeader}>
                      <Text style={[styles.requestTitle, styles.resolvedTitle]}>{request.title}</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                    </View>
                    <View style={styles.requestDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#95A5A6" />
                        <Text style={[styles.detailText, styles.resolvedText]}>{request.location}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={14} color="#95A5A6" />
                        <Text style={[styles.detailText, styles.resolvedText]}>
                          Resolved {formatDate(request.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
    marginRight: 12,
  },
  newRequestButton: {
    backgroundColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  newRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resolvedCard: {
    backgroundColor: '#FAFBFC',
    borderColor: '#E8E8E8',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitleContainer: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  resolvedTitle: {
    color: '#7F8C8D',
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  requestDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  resolvedText: {
    color: '#95A5A6',
  },
  requestDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
});

export default MaintenanceStatusScreen;