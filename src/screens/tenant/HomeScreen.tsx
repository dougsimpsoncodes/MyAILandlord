import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import Button from '../../components/shared/Button';
import { PendingInviteService } from '../../services/storage/PendingInviteService';
import { useApiClient } from '../../services/api/client';
import log from '../../lib/log';
import { PropertyImage } from '../../components/shared/PropertyImage';

type HomeScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'Home'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  submittedAt: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface LinkedProperty {
  id: string;
  name: string;
  address: string;
  unit?: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAppAuth();
  const apiClient = useApiClient();
  const pendingInviteChecked = useRef(false);

  const [linkedProperty, setLinkedProperty] = useState<LinkedProperty | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check for pending property invite on initial load and auto-link
  useEffect(() => {
    const checkAndProcessPendingInvite = async () => {
      if (pendingInviteChecked.current || !apiClient) return;
      pendingInviteChecked.current = true;

      const pendingPropertyId = await PendingInviteService.getPendingInvite();
      if (pendingPropertyId) {
        log.info('📥 Processing pending invite for property:', pendingPropertyId);

        try {
          // Directly link the tenant to the property
          await apiClient.linkTenantToPropertyById(pendingPropertyId);
          log.info('✅ Tenant successfully linked to property via pending invite');

          // Clear the pending invite
          await PendingInviteService.clearPendingInvite();

          // Reload data to show the linked property
          loadData();
        } catch (linkError: unknown) {
          const message = linkError instanceof Error ? linkError.message : '';
          // If already linked, just clear and continue
          if (message.includes('duplicate') || message.includes('23505')) {
            log.warn('⚠️ Tenant already linked to this property');
            await PendingInviteService.clearPendingInvite();
            loadData();
          } else {
            log.error('Failed to auto-link tenant to property:', linkError as any);
            // Still clear the invite to prevent infinite loops
            await PendingInviteService.clearPendingInvite();
          }
        }
      }
    };

    checkAndProcessPendingInvite();
  }, [apiClient]);

  const loadData = useCallback(async () => {
    if (!apiClient) {
      setIsLoading(false);
      return;
    }

    try {
      // Load tenant's linked properties
      const tenantProperties = await apiClient.getTenantProperties();
      log.info('Loaded tenant properties', { count: tenantProperties.length });

      if (tenantProperties.length > 0) {
        // Use the first active property (most apps link tenant to one property)
        const firstLink = tenantProperties[0];
        const property = firstLink.properties as any;

        if (property) {
          setLinkedProperty({
            id: property.id,
            name: property.name,
            address: property.address || '',
            unit: firstLink.unit_number || undefined,
          });
        }
      } else {
        setLinkedProperty(null);
      }

      // Load maintenance requests for this tenant
      const maintenanceRequests = await apiClient.getMaintenanceRequests();
      log.info('Loaded maintenance requests', { count: maintenanceRequests.length });

      // Map to our local interface format, filtering out completed requests
      const mappedRequests: MaintenanceRequest[] = maintenanceRequests
        .filter((req: any) => req.status !== 'completed')
        .map((req: any) => ({
          id: req.id,
          title: req.title || 'Maintenance Request',
          location: req.area || 'Unknown',
          submittedAt: new Date(req.created_at).toLocaleDateString(),
          status: req.status as 'pending' | 'in_progress' | 'completed',
        }));

      setRequests(mappedRequests);
    } catch (error) {
      log.error('Error loading tenant data', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getInitials = () => {
    if (!user?.name) return '?';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { label: 'In Progress', style: styles.badgeProgress };
      case 'pending':
        return { label: 'Pending', style: styles.badgePending };
      case 'completed':
        return { label: 'Completed', style: styles.badgeComplete };
      default:
        return { label: status, style: styles.badgePending };
    }
  };

  // Not linked to a property - show onboarding
  if (!isLoading && !linkedProperty) {
    return (
      <ScreenContainer
        userRole="tenant"
        scrollable={false}
        headerRight={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
        }
      >
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>No Property Linked</Text>
            <Text style={styles.emptySubtitle}>
              Enter a property code from your landlord to get started
            </Text>
            <Button
              title="Link to Property"
              onPress={() => navigation.navigate('PropertyCodeEntry')}
              type="success"
              icon={<Ionicons name="link" size={20} color="#fff" />}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="MyAILandlord"
      userRole="tenant"
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
      }
    >
        {/* Property Banner */}
        {linkedProperty && (
          <TouchableOpacity
            style={styles.propertyBanner}
            onPress={() => navigation.navigate('PropertyInfo', { address: linkedProperty.address })}
            activeOpacity={0.8}
          >
            <PropertyImage
              address={linkedProperty.address}
              width={320}
              height={200}
              borderRadius={12}
              style={{ alignSelf: 'center' }}
            />
            <Text style={styles.propertyAddress}>{linkedProperty.address}</Text>
          </TouchableOpacity>
        )}

        {/* Your Requests Section */}
        <Text style={styles.sectionTitle}>Your Requests</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#2ECC71" />
            <Text style={styles.emptyCardTitle}>No Active Requests</Text>
            <Text style={styles.emptyCardSubtitle}>
              Report an issue if something needs fixing
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const badge = getStatusBadge(request.status);
            return (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => navigation.navigate('FollowUp', { issueId: request.id })}
                activeOpacity={0.7}
              >
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <View style={badge.style}>
                    <Text style={[styles.badgeText, badge.style]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={styles.requestMeta}>
                  {request.location} • {request.submittedAt}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('ReportIssue')}
          >
            <Ionicons name="construct-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>Report{'\n'}Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('CommunicationHub')}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>Message{'\n'}Landlord</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('PropertyInfo', { address: linkedProperty?.address })}
          >
            <Ionicons name="home-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>Property{'\n'}Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Property Banner
  propertyBanner: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginTop: 12,
    textAlign: 'center',
  },
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  // Request Cards
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  requestMeta: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  // Badges
  badgeProgress: {
    backgroundColor: '#EBF5FB',
    color: '#3498DB',
  },
  badgePending: {
    backgroundColor: '#FEF5E7',
    color: '#F39C12',
  },
  badgeComplete: {
    backgroundColor: '#E8F8F0',
    color: '#2ECC71',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Empty Card
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  // Quick Links
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickLinkLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  // Empty State (No Property)
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default HomeScreen;
