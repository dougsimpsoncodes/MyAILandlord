import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';

type DashboardScreenNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'Dashboard'>;

interface CaseFile {
  id: string;
  tenantName: string;
  tenantUnit: string;
  issueType: string;
  description: string;
  location: string;
  urgency: 'Emergency' | 'Very urgent' | 'Moderate' | 'Can wait' | 'Low priority';
  status: 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  submittedAt: string;
  mediaCount: number;
  estimatedCost?: string;
}

interface MaintenanceRequestResponse {
  id: string;
  issue_type: string;
  description: string;
  area: string;
  priority: string;
  status: 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  estimated_cost?: number;
  images?: string[];
  profiles?: {
    name?: string;
  };
}

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const apiClient = useApiClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'new' | 'in_progress' | 'completed'>('new');
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      if (!apiClient) {
        console.error('API client not available');
        return;
      }
      const maintenanceRequests = await apiClient.getMaintenanceRequests();
      
      // Transform API data to match the expected interface
      const transformedCases = maintenanceRequests.map((request: any) => ({
        id: request.id,
        tenantName: request.profiles?.name || 'Tenant User',
        tenantUnit: 'N/A', // TODO: Get from tenant_property_links
        issueType: capitalizeFirst(request.issue_type),
        description: request.description,
        location: request.area,
        urgency: mapPriorityToUrgency(request.priority),
        status: request.status,
        submittedAt: formatDate(request.created_at),
        mediaCount: request.images?.length || 0,
        estimatedCost: request.estimated_cost ? `$${request.estimated_cost}` : 'TBD'
      }));
      
      setCases(transformedCases);
    } catch (error) {
      console.error('Error loading cases:', error);
      Alert.alert('Error', 'Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mapPriorityToUrgency = (priority: string): 'Emergency' | 'Very urgent' | 'Moderate' | 'Can wait' | 'Low priority' => {
    switch (priority) {
      case 'emergency': return 'Emergency';
      case 'high': return 'Very urgent';
      case 'medium': return 'Moderate';
      case 'low': return 'Can wait';
      default: return 'Low priority';
    }
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadCases();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return '#E74C3C'; // Red for new/submitted
      case 'pending':
        return '#F39C12'; // Orange for pending
      case 'in_progress':
        return '#3498DB';
      case 'completed':
        return '#2ECC71';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'New';
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  // Filter cases based on selected tab
  const filteredCases = selectedFilter === 'new'
    ? cases.filter(case_ => case_.status === 'submitted')
    : selectedFilter === 'in_progress'
    ? cases.filter(case_ => case_.status === 'pending' || case_.status === 'in_progress')
    : cases.filter(case_ => case_.status === 'completed');

  const newCasesCount = cases.filter(case_ => case_.status === 'submitted').length;
  const inProgressCount = cases.filter(case_ => case_.status === 'pending' || case_.status === 'in_progress').length;
  const completedCount = cases.filter(case_ => case_.status === 'completed').length;

  const handleCasePress = (caseId: string) => {
    navigation.navigate('CaseDetail', { caseId });
  };

  const getEmptyStateMessage = () => {
    switch (selectedFilter) {
      case 'new':
        return { title: 'No New Requests', subtitle: 'New maintenance requests will appear here' };
      case 'in_progress':
        return { title: 'No Pending Requests', subtitle: 'Requests awaiting action will appear here' };
      case 'completed':
        return { title: 'No Completed Requests', subtitle: 'Completed requests will appear here' };
      default:
        return { title: 'No Requests', subtitle: 'Maintenance requests will appear here' };
    }
  };

  const emptyState = getEmptyStateMessage();

  return (
    <ScreenContainer
      title="Requests"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'new' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('new')}
        >
          <Text style={[styles.filterText, selectedFilter === 'new' && styles.filterTextActive]}>
            New
          </Text>
          {newCasesCount > 0 && (
            <View style={[styles.filterBadge, selectedFilter === 'new' && styles.filterBadgeActive]}>
              <Text style={[styles.filterBadgeText, selectedFilter === 'new' && styles.filterBadgeTextActive]}>
                {newCasesCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'in_progress' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('in_progress')}
        >
          <Text style={[styles.filterText, selectedFilter === 'in_progress' && styles.filterTextActive]}>
            Pending
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
            Complete
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

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : filteredCases.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyState}>
          <Ionicons
            name={selectedFilter === 'completed' ? 'checkmark-circle-outline' : 'document-text-outline'}
            size={64}
            color={selectedFilter === 'completed' ? '#3498DB' : '#BDC3C7'}
          />
          <Text style={styles.emptyStateTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyStateSubtitle}>{emptyState.subtitle}</Text>
        </View>
      ) : (
        /* Request Cards - Simple clickable design */
        filteredCases.map((case_) => (
          <TouchableOpacity
            key={case_.id}
            style={[
              styles.requestCard,
              case_.status === 'completed' && styles.resolvedCard
            ]}
            onPress={() => handleCasePress(case_.id)}
            activeOpacity={0.7}
          >
            <View style={styles.requestHeader}>
              <Text style={[
                styles.requestTitle,
                case_.status === 'completed' && styles.resolvedTitle
              ]}>
                {case_.issueType}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(case_.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(case_.status) }]}>
                  {getStatusText(case_.status)}
                </Text>
              </View>
            </View>

            <Text style={[
              styles.requestMeta,
              case_.status === 'completed' && styles.resolvedText
            ]}>
              {case_.location} • {case_.tenantName}
            </Text>

            <Text style={[
              styles.requestTime,
              case_.status === 'completed' && styles.resolvedText
            ]}>
              {case_.status === 'completed' ? 'Completed ' : ''}{case_.submittedAt}
            </Text>

            {case_.description && case_.status !== 'completed' && (
              <Text style={styles.requestDescription} numberOfLines={2}>
                {case_.description}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#3498DB',
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
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: DesignSystem.colors.textSecondary,
  },
  // Empty State
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
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
  // Request Cards
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
  requestTime: {
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
    marginTop: 4,
  },
});

export default DashboardScreen;