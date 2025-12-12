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

type HomeScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'Home'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  submittedAt: string;
  status: 'pending' | 'in_progress' | 'complete';
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
  const pendingInviteChecked = useRef(false);

  const [linkedProperty, setLinkedProperty] = useState<LinkedProperty | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check for pending property invite on initial load
  useEffect(() => {
    const checkPendingInvite = async () => {
      if (pendingInviteChecked.current) return;
      pendingInviteChecked.current = true;

      const pendingPropertyId = await PendingInviteService.getPendingInvite();
      if (pendingPropertyId) {
        navigation.navigate('PropertyInviteAccept', { propertyId: pendingPropertyId });
      }
    };

    checkPendingInvite();
  }, [navigation]);

  const loadData = useCallback(async () => {
    try {
      // TODO: Load actual linked property and requests from API
      // For now, show empty/unlinked state
      setLinkedProperty(null);
      setRequests([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Welcome back,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };

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
      case 'complete':
        return { label: 'Complete', style: styles.badgeComplete };
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
        {/* Header greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Tenant'}</Text>
        </View>

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
      userRole="tenant"
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
      }
    >
      {/* Header greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Tenant'}</Text>
      </View>
        {/* Property Banner */}
        {linkedProperty && (
          <TouchableOpacity
            style={styles.propertyBanner}
            onPress={() => navigation.navigate('PropertyInfo')}
            activeOpacity={0.8}
          >
            <Text style={styles.propertyLabel}>Your Property</Text>
            <Text style={styles.propertyName}>
              {linkedProperty.name}
              {linkedProperty.unit && ` ${linkedProperty.unit}`}
            </Text>
            <Text style={styles.propertyAddress}>{linkedProperty.address}</Text>
          </TouchableOpacity>
        )}

        {/* Report Issue CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('ReportIssue')}
          activeOpacity={0.8}
        >
          <Ionicons name="construct" size={24} color="#fff" />
          <Text style={styles.ctaButtonText}>Report an Issue</Text>
        </TouchableOpacity>

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
            onPress={() => navigation.navigate('CommunicationHub')}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>Message{'\n'}Landlord</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('PropertyInfo')}
          >
            <Ionicons name="document-text-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>View{'\n'}Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickLink}>
            <Ionicons name="call-outline" size={28} color="#2ECC71" />
            <Text style={styles.quickLinkLabel}>Emergency{'\n'}Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  greetingContainer: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
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
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  propertyLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  propertyAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  // CTA Button
  ctaButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
