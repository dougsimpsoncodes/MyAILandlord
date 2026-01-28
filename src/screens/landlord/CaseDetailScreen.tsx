import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Image, Linking } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/shared/ScreenContainer';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useApiClient } from '../../services/api/client';
import log from '../../lib/log';
import { useAppState } from '../../context/AppStateContext';

type CaseDetailScreenRouteProp = RouteProp<LandlordStackParamList, 'CaseDetail'>;
type CaseDetailScreenNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'CaseDetail'>;

interface DetailedCase {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  propertyAddress: string;
  title: string;
  description: string;
  area: string;
  asset: string;
  issueType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  images: string[];
}

const { width } = Dimensions.get('window');

const CaseDetailScreen = () => {
  const route = useRoute<CaseDetailScreenRouteProp>();
  const navigation = useNavigation<CaseDetailScreenNavigationProp>();
  const api = useApiClient();
  const { refreshNotificationCounts } = useAppState();
  const { caseId } = route.params;

  const [caseData, setCaseData] = useState<DetailedCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'media'>('overview');
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    // Prevent re-fetching if already loaded for this caseId
    if (loadedRef.current) return;

    const loadCaseData = async () => {
      if (!api) return;

      loadedRef.current = true;

      try {
        setIsLoading(true);
        const request = await api.getMaintenanceRequestById(caseId);

        if (!request) {
          setError('Maintenance request not found');
          return;
        }

        // Map API data to UI format
        const mapped: DetailedCase = {
          id: request.id,
          tenantId: request.tenant_id,
          tenantName: request.profiles?.name || 'Unknown Tenant',
          tenantEmail: request.profiles?.email || '',
          propertyName: request.properties?.name || 'Unknown Property',
          propertyAddress: request.properties?.address || '',
          title: request.title,
          description: request.description,
          area: request.area,
          asset: request.asset,
          issueType: request.issue_type,
          priority: (request.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          status: (request.status || 'pending') as 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled',
          createdAt: request.created_at ?? new Date().toISOString(),
          images: request.images || [],
        };

        setCaseData(mapped);
        log.info('Loaded maintenance request', { id: caseId });

        // Mark as "pending" if this is a new "submitted" request (landlord has now seen it)
        if (request.status === 'submitted') {
          try {
            await api.updateMaintenanceRequest(caseId, { status: 'pending' });
            log.info('Marked request as viewed (submitted -> pending)', { id: caseId });
            // Update local state to reflect the change
            mapped.status = 'pending';
            setCaseData({ ...mapped });
            // Refresh the badge count
            refreshNotificationCounts();
          } catch (updateErr) {
            log.error('Failed to mark request as viewed', { error: String(updateErr) });
          }
        }
      } catch (err) {
        log.error('Failed to load maintenance request', { error: String(err) });
        setError('Failed to load maintenance request');
        loadedRef.current = false; // Allow retry on error
      } finally {
        setIsLoading(false);
      }
    };

    loadCaseData();
  }, [api, caseId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#E74C3C';
      case 'high':
        return '#E67E22';
      case 'medium':
        return '#F39C12';
      case 'low':
        return '#27AE60';
      default:
        return '#3498DB';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low Priority';
      default:
        return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#3498DB';
      case 'in_progress':
        return '#F39C12';
      case 'completed':
        return '#27AE60';
      case 'cancelled':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Resolved';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  const handleMarkResolved = () => {
    log.info('handleMarkResolved called', { hasApi: !!api, hasCaseData: !!caseData, caseId });

    if (!api || !caseData) {
      log.warn('handleMarkResolved: missing api or caseData');
      return;
    }

    setShowResolveDialog(true);
  };

  const confirmMarkResolved = async () => {
    if (!api) return;

    setIsResolving(true);
    try {
      log.info('Updating maintenance request status to completed', { caseId });
      await api.updateMaintenanceRequest(caseId, { status: 'completed' });
      log.info('Successfully marked as resolved', { caseId });
      setShowResolveDialog(false);
      navigation.goBack();
    } catch (err) {
      log.error('Failed to mark as resolved', { caseId, error: String(err) });
      setShowResolveDialog(false);
      Alert.alert('Error', `Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleEmail = () => {
    if (caseData?.tenantEmail) {
      Linking.openURL(`mailto:${caseData.tenantEmail}`);
    }
  };

  const handleMessageTenant = () => {
    if (caseData?.tenantId) {
      navigation.navigate('LandlordChat', {
        tenantId: caseData.tenantId,
        tenantName: caseData.tenantName,
        tenantEmail: caseData.tenantEmail,
      });
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer
        title="Case Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="landlord"
        scrollable={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading case details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !caseData) {
    return (
      <ScreenContainer
        title="Case Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="landlord"
        scrollable={false}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Failed to load case'}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{caseData.description}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleMessageTenant}>
            <Ionicons name="chatbubble" size={24} color="#9B59B6" />
            <Text style={styles.quickActionText}>Message Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleEmail}>
            <Ionicons name="mail" size={24} color="#3498DB" />
            <Text style={styles.quickActionText}>Email Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleMarkResolved}>
            <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
            <Text style={styles.quickActionText}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{caseData.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Area</Text>
            <Text style={styles.detailValue}>{caseData.area}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Asset</Text>
            <Text style={styles.detailValue}>{caseData.asset}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Type</Text>
            <Text style={styles.detailValue}>{caseData.issueType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{formatTimeAgo(caseData.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Property</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{caseData.propertyName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{caseData.propertyAddress}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenant</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{caseData.tenantName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{caseData.tenantEmail}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const handleImageError = (index: number, url: string) => {
    log.warn('Image failed to load', { index, url });
    setFailedImages(prev => new Set(prev).add(index));
  };

  const renderMedia = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attached Photos ({caseData.images.length})</Text>
        {caseData.images.length === 0 ? (
          <View style={styles.noMediaCard}>
            <Ionicons name="images-outline" size={40} color="#95A5A6" />
            <Text style={styles.noMediaText}>No photos attached</Text>
          </View>
        ) : (
          <View style={styles.mediaGrid}>
            {caseData.images.map((url, index) => (
              <TouchableOpacity key={index} style={styles.mediaItem}>
                {failedImages.has(index) ? (
                  <View style={styles.failedImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color="#95A5A6" />
                    <Text style={styles.failedImageText}>Image unavailable</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: url }}
                    style={styles.mediaImage}
                    resizeMode="contain"
                    onError={() => handleImageError(index, url)}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScreenContainer
      title="Case Details"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable={false}
      padded={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.tenantInfo}>
            <Text style={styles.tenantName}>{caseData.propertyAddress || caseData.propertyName}</Text>
            <Text style={styles.propertyName}>Reported by {caseData.tenantName}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(caseData.status) },
              ]}
            >
              <Text style={styles.statusText}>{getStatusText(caseData.status)}</Text>
            </View>
            <View
              style={[
                styles.priorityBadge,
                { borderColor: getPriorityColor(caseData.priority) },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  { color: getPriorityColor(caseData.priority) },
                ]}
              >
                {getPriorityLabel(caseData.priority)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.issueTitle} numberOfLines={2}>
          {caseData.title}
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'home' },
          { key: 'details', label: 'Details', icon: 'list' },
          { key: 'media', label: 'Media', icon: 'images' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={selectedTab === tab.key ? '#34495E' : '#95A5A6'}
            />
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'details' && renderDetails()}
        {selectedTab === 'media' && renderMedia()}
      </ScrollView>

      <ConfirmDialog
        visible={showResolveDialog}
        title="Mark as Resolved"
        message="Are you sure this maintenance issue has been resolved? The tenant will be notified."
        confirmText="Mark Resolved"
        cancelText="Cancel"
        onConfirm={confirmMarkResolved}
        onCancel={() => setShowResolveDialog(false)}
        isLoading={isResolving}
      />
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
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenantInfo: {},
  tenantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueTitle: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#34495E',
  },
  tabText: {
    fontSize: 14,
    color: '#95A5A6',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#34495E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  summaryText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  quickActionText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  mediaItem: {
    width: (width - 64) / 2,
  },
  mediaImage: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  noMediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  noMediaText: {
    marginTop: 12,
    fontSize: 14,
    color: '#95A5A6',
  },
  failedImagePlaceholder: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedImageText: {
    marginTop: 8,
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
  },
});

export default CaseDetailScreen;
