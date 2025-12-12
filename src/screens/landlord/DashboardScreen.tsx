import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
  status: 'new' | 'in_progress' | 'resolved';
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
  status: 'new' | 'in_progress' | 'resolved';
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
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
      const transformedCases = maintenanceRequests.map((request: MaintenanceRequestResponse) => ({
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency':
        return '#E74C3C'; // Red for urgent
      case 'Very urgent':
        return '#E74C3C'; // Red for urgent
      case 'Moderate':
        return '#F39C12'; // Orange for medium
      case 'Can wait':
        return '#2ECC71'; // Green for low
      case 'Low priority':
        return '#2ECC71'; // Green for low
      default:
        return '#3498DB';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3498DB';
      case 'in_progress':
        return '#F39C12';
      case 'resolved':
        return '#27AE60';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const filteredCases = selectedFilter === 'all' 
    ? cases 
    : cases.filter(case_ => case_.status === selectedFilter);

  const newCasesCount = cases.filter(case_ => case_.status === 'new').length;
  const inProgressCount = cases.filter(case_ => case_.status === 'in_progress').length;
  const resolvedCount = cases.filter(case_ => case_.status === 'resolved').length;

  const handleCasePress = (caseId: string) => {
    navigation.navigate('CaseDetail', { caseId });
  };

  const handleRespondPress = (caseId: string) => {
    navigation.navigate('CaseDetail', { caseId });
  };

  const handleAssignVendorPress = (caseId: string) => {
    navigation.navigate('SendToVendor', { caseId });
  };

  return (
    <ScreenContainer
      title="Maintenance Dashboard"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      refreshing={refreshing}
      onRefresh={onRefresh}
      padded={false}
    >
      <View style={styles.content}>
        {/* Filter Pills */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All Cases', count: cases.length },
              { key: 'new', label: 'New', count: newCasesCount },
              { key: 'in_progress', label: 'In Progress', count: inProgressCount },
              { key: 'resolved', label: 'Resolved', count: resolvedCount },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter.key as typeof selectedFilter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter.key && styles.filterTextActive,
                  ]}
                >
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498DB" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : filteredCases.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyCardTitle}>
              {selectedFilter === 'all' ? 'All Caught Up!' : 'No Cases Found'}
            </Text>
            <Text style={styles.emptyCardSubtitle}>
              {selectedFilter === 'all'
                ? 'No maintenance requests at the moment'
                : `No ${selectedFilter.replace('_', ' ')} cases found`}
            </Text>
          </View>
        ) : (
          /* Request Cards with Action Buttons */
          filteredCases.map((case_) => (
            <TouchableOpacity
              key={case_.id}
              style={styles.requestCard}
              onPress={() => handleCasePress(case_.id)}
              activeOpacity={0.7}
            >
              {/* Priority Indicator Bar */}
              <View style={[styles.priorityBar, { backgroundColor: getUrgencyColor(case_.urgency) }]} />

              <View style={styles.requestContent}>
                {/* Request Header */}
                <View style={styles.requestHeader}>
                  <View style={styles.requestHeaderLeft}>
                    <Text style={styles.requestTitle}>{case_.issueType}</Text>
                    <Text style={styles.requestLocation}>
                      {case_.location} • {case_.tenantName}
                    </Text>
                  </View>
                  <Text style={styles.requestTime}>{case_.submittedAt}</Text>
                </View>

                {/* Description */}
                <Text style={styles.requestDescription} numberOfLines={2}>
                  {case_.description}
                </Text>

                {/* Metadata */}
                <View style={styles.requestMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="images" size={14} color="#7F8C8D" />
                    <Text style={styles.metaText}>{case_.mediaCount} photos</Text>
                  </View>
                  {case_.estimatedCost && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Est:</Text>
                      <Text style={styles.metaCost}>{case_.estimatedCost}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(case_.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{getStatusText(case_.status)}</Text>
                  </View>
                </View>

                {/* Inline Action Buttons */}
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRespondPress(case_.id);
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Respond</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAssignVendorPress(case_.id);
                    }}
                  >
                    <Text style={styles.btnSecondaryText}>Assign Vendor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  // Filter Pills
  filtersContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignSystem.colors.background,
    borderWidth: 1,
    borderColor: DesignSystem.colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  filterText: {
    fontSize: 13,
    color: DesignSystem.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  // Request Cards with Priority Bars
  requestCard: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    padding: 14,
    paddingLeft: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priorityBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 48,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  requestHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginBottom: 2,
  },
  requestLocation: {
    fontSize: 13,
    color: DesignSystem.colors.textSecondary,
  },
  requestTime: {
    fontSize: 11,
    color: DesignSystem.colors.textSubtle,
  },
  requestDescription: {
    fontSize: 14,
    color: DesignSystem.colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  // Metadata Row
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: DesignSystem.colors.textSecondary,
  },
  metaLabel: {
    fontSize: 11,
    color: DesignSystem.colors.textSecondary,
  },
  metaCost: {
    fontSize: 12,
    color: DesignSystem.colors.success,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Inline Action Buttons
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: '#3498DB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSecondary: {
    backgroundColor: DesignSystem.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: DesignSystem.colors.textSecondary,
  },
  // Loading State
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: DesignSystem.colors.textSecondary,
    marginTop: 16,
  },
  // Empty State
  emptyCard: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: DesignSystem.colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default DashboardScreen;