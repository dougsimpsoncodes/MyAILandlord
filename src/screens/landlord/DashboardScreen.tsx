import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import ResponsiveGrid from '../../components/shared/ResponsiveGrid';
import { ResponsiveText, ResponsiveTitle, ResponsiveSubtitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';

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
  const responsive = useResponsive();
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
        return '#E74C3C';
      case 'Very urgent':
        return '#E67E22';
      case 'Moderate':
        return '#F39C12';
      case 'Can wait':
        return '#27AE60';
      case 'Low priority':
        return '#95A5A6';
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


  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth="xl" padding={false}>
        <View style={styles.header}>
          <View>
            <ResponsiveTitle fluid>Welcome back!</ResponsiveTitle>
            <ResponsiveSubtitle style={{ color: '#7F8C8D' }}>Maintenance Dashboard</ResponsiveSubtitle>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons 
              name="notifications" 
              size={responsive.select({ mobile: 24, tablet: 26, desktop: 28, large: 30, xl: 32, xxl: 34, default: 24 })} 
              color="#34495E" 
            />
            {newCasesCount > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <ResponsiveGrid minItemWidth={200} maxColumns={3}>
            <View style={styles.statCard}>
              <ResponsiveText
                variant="display" 
                style={{ 
                  color: '#2C3E50', 
                  marginBottom: 4,
                  textAlign: 'center'
                }}
              >
                {newCasesCount}
              </ResponsiveText>
              <ResponsiveCaption style={{ color: '#7F8C8D', marginBottom: 8, textAlign: 'center' }}>
                New Cases
              </ResponsiveCaption>
              <Ionicons 
                name="alert-circle" 
                size={responsive.select({ mobile: 24, tablet: 26, desktop: 28, large: 30, xl: 32, xxl: 34, default: 24 })} 
                color="#3498DB" 
              />
            </View>
            <View style={styles.statCard}>
              <ResponsiveText 
                variant="display" 
                style={{ 
                  color: '#2C3E50', 
                  marginBottom: 4,
                  textAlign: 'center'
                }}
              >
                {inProgressCount}
              </ResponsiveText>
              <ResponsiveCaption style={{ color: '#7F8C8D', marginBottom: 8, textAlign: 'center' }}>
                In Progress
              </ResponsiveCaption>
              <Ionicons 
                name="time" 
                size={responsive.select({ mobile: 24, tablet: 26, desktop: 28, large: 30, xl: 32, xxl: 34, default: 24 })} 
                color="#F39C12" 
              />
            </View>
            <View style={styles.statCard}>
              <ResponsiveText 
                variant="display" 
                style={{ 
                  color: '#2C3E50', 
                  marginBottom: 4,
                  textAlign: 'center'
                }}
              >
                {resolvedCount}
              </ResponsiveText>
              <ResponsiveCaption style={{ color: '#7F8C8D', marginBottom: 8, textAlign: 'center' }}>
                Resolved
              </ResponsiveCaption>
              <Ionicons 
                name="checkmark-circle" 
                size={responsive.select({ mobile: 24, tablet: 26, desktop: 28, large: 30, xl: 32, xxl: 34, default: 24 })} 
                color="#27AE60" 
              />
            </View>
          </ResponsiveGrid>
        </View>

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

      <ScrollView
        style={styles.casesContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498DB" />
            <Text style={styles.loadingText}>Loading cases...</Text>
          </View>
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#95A5A6" />
            <Text style={styles.emptyTitle}>No Cases Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'all' 
                ? 'No maintenance cases have been reported yet.'
                : `No ${selectedFilter.replace('_', ' ')} cases found.`}
            </Text>
          </View>
        ) : (
          filteredCases.map((case_) => (
          <TouchableOpacity
            key={case_.id}
            style={styles.caseCard}
            onPress={() => handleCasePress(case_.id)}
            activeOpacity={0.8}
          >
            <View style={styles.caseHeader}>
              <View style={styles.caseInfo}>
                <Text style={styles.tenantName}>{case_.tenantName}</Text>
                <Text style={styles.tenantUnit}>{case_.tenantUnit}</Text>
              </View>
              <View style={styles.caseStatus}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(case_.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusText(case_.status)}</Text>
                </View>
                <View
                  style={[
                    styles.urgencyBadge,
                    { borderColor: getUrgencyColor(case_.urgency) },
                  ]}
                >
                  <Text
                    style={[
                      styles.urgencyText,
                      { color: getUrgencyColor(case_.urgency) },
                    ]}
                  >
                    {case_.urgency}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.caseContent}>
              <View style={styles.issueTypeContainer}>
                <Ionicons name="construct" size={16} color="#7F8C8D" />
                <Text style={styles.issueType}>{case_.issueType}</Text>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.location}>{case_.location}</Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {case_.description}
              </Text>
            </View>

            <View style={styles.caseFooter}>
              <View style={styles.caseMetadata}>
                <View style={styles.mediaInfo}>
                  <Ionicons name="images" size={16} color="#7F8C8D" />
                  <Text style={styles.mediaCount}>{case_.mediaCount} photos</Text>
                </View>
                <Text style={styles.timestamp}>{case_.submittedAt}</Text>
              </View>
              {case_.estimatedCost && (
                <View style={styles.costContainer}>
                  <Text style={styles.costLabel}>Est. Cost:</Text>
                  <Text style={styles.costValue}>{case_.estimatedCost}</Text>
                </View>
              )}
            </View>

            <View style={styles.caseActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble" size={16} color="#3498DB" />
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="mail" size={16} color="#3498DB" />
                <Text style={styles.actionText}>Send to Vendor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="checkmark" size={16} color="#27AE60" />
                <Text style={[styles.actionText, { color: '#27AE60' }]}>Mark Resolved</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )))}

        {!loading && filteredCases.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open" size={64} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>No cases found</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all'
                ? 'No maintenance cases have been submitted yet.'
                : `No ${selectedFilter.replace('_', ' ')} cases at the moment.`}
            </Text>
          </View>
        )}
      </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    
    
    
    
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#34495E',
    borderColor: '#34495E',
  },
  filterText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  casesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 6,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  caseInfo: {},
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  tenantUnit: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  caseStatus: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  caseContent: {
    marginBottom: 12,
  },
  issueTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  issueType: {
    fontSize: 14,
    color: '#34495E',
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
    color: '#BDC3C7',
  },
  location: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  description: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  caseMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaCount: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  timestamp: {
    fontSize: 12,
    color: '#95A5A6',
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  costValue: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  caseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});

export default DashboardScreen;