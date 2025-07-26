import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { useAppAuth } from '../../context/ClerkAuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useApiErrorHandling } from '../../hooks/useErrorHandling';
import { formatRelativeTime, formatCurrency } from '../../utils/helpers';

type LandlordHomeNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'Home'>;

interface DashboardStats {
  totalProperties: number;
  totalTenants: number;
  activeRequests: number;
  emergencyRequests: number;
  overdueRequests: number;
  monthlyRevenue: number;
  pendingActions: number;
}

interface PriorityAlert {
  id: string;
  type: 'emergency' | 'overdue' | 'urgent' | 'payment';
  title: string;
  description: string;
  property: string;
  tenant: string;
  timeInfo: string;
  actionRequired: string;
}

interface RecentActivity {
  id: string;
  type: 'request_created' | 'request_updated' | 'message_received' | 'payment_received';
  title: string;
  description: string;
  timestamp: string;
  property?: string;
  tenant?: string;
}

const { width } = Dimensions.get('window');

const LandlordHomeScreen = () => {
  const navigation = useNavigation<LandlordHomeNavigationProp>();
  const apiClient = useApiClient();
  const { user } = useAppAuth();
  const { handleApiError } = useApiErrorHandling();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalTenants: 0,
    activeRequests: 0,
    emergencyRequests: 0,
    overdueRequests: 0,
    monthlyRevenue: 0,
    pendingActions: 0,
  });
  const [priorityAlerts, setPriorityAlerts] = useState<PriorityAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!apiClient) {
        console.error('API client not available');
        setLoading(false);
        return;
      }
      
      // Load maintenance requests and properties
      const [maintenanceRequests, properties] = await Promise.all([
        apiClient.getMaintenanceRequests(),
        apiClient.getUserProperties(),
      ]);

      // Calculate stats
      const emergencyCount = maintenanceRequests.filter(req => req.priority === 'urgent').length;
      const overdueCount = maintenanceRequests.filter(req => {
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceCreated > 3 && req.status === 'pending';
      }).length;

      setStats({
        totalProperties: properties.length,
        totalTenants: 0, // TODO: Calculate from tenant_property_links
        activeRequests: maintenanceRequests.filter(req => req.status !== 'completed').length,
        emergencyRequests: emergencyCount,
        overdueRequests: overdueCount,
        monthlyRevenue: 0, // TODO: Calculate from payments
        pendingActions: emergencyCount + overdueCount,
      });

      // Generate priority alerts
      const alerts: PriorityAlert[] = [];
      
      // Emergency requests
      maintenanceRequests
        .filter(req => req.priority === 'urgent')
        .slice(0, 3) // Top 3 most urgent
        .forEach(req => {
          alerts.push({
            id: req.id,
            type: 'emergency',
            title: 'Emergency Maintenance Request',
            description: req.title,
            property: req.properties?.name || 'Property',
            tenant: req.profiles?.name || 'Tenant',
            timeInfo: formatRelativeTime(req.created_at),
            actionRequired: 'Immediate response required',
          });
        });

      // Overdue requests
      maintenanceRequests
        .filter(req => {
          const daysSinceCreated = Math.floor(
            (Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSinceCreated > 3 && req.status === 'pending';
        })
        .slice(0, 2)
        .forEach(req => {
          const daysSinceCreated = Math.floor(
            (Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          alerts.push({
            id: req.id,
            type: 'overdue',
            title: 'Overdue Maintenance Request',
            description: req.title,
            property: req.properties?.name || 'Property',
            tenant: req.profiles?.name || 'Tenant',
            timeInfo: `${daysSinceCreated} days overdue`,
            actionRequired: 'Follow up required',
          });
        });

      setPriorityAlerts(alerts);

      // Generate recent activity
      const activities: RecentActivity[] = maintenanceRequests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(req => ({
          id: req.id,
          type: 'request_created' as const,
          title: 'New Maintenance Request',
          description: req.title,
          timestamp: formatRelativeTime(req.created_at),
          property: req.properties?.name,
          tenant: req.profiles?.name,
        }));

      setRecentActivity(activities);

    } catch (error) {
      handleApiError(error, 'Loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAlertPress = (alert: PriorityAlert) => {
    navigation.navigate('CaseDetail', { caseId: alert.id });
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'emergency': return '#E74C3C';
      case 'overdue': return '#E67E22';
      case 'urgent': return '#F39C12';
      case 'payment': return '#8E44AD';
      default: return '#3498DB';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'emergency': return 'alert-circle';
      case 'overdue': return 'time';
      case 'urgent': return 'warning';
      case 'payment': return 'card';
      default: return 'information-circle';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your landlord dashboard..." />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Landlord'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications" size={24} color="#34495E" />
              {stats.pendingActions > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{stats.pendingActions}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Priority Alerts */}
          {priorityAlerts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning" size={20} color="#E74C3C" />
                <Text style={styles.sectionTitle}>Priority Alerts</Text>
              </View>
              
              {priorityAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.type) }]}
                  onPress={() => handleAlertPress(alert)}
                  activeOpacity={0.7}
                >
                  <View style={styles.alertHeader}>
                    <Ionicons 
                      name={getAlertIcon(alert.type) as any} 
                      size={20} 
                      color={getAlertColor(alert.type)} 
                    />
                    <Text style={[styles.alertTitle, { color: getAlertColor(alert.type) }]}>
                      {alert.title}
                    </Text>
                  </View>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                  <View style={styles.alertMeta}>
                    <Text style={styles.alertLocation}>{alert.property} • {alert.tenant}</Text>
                    <Text style={styles.alertTime}>{alert.timeInfo}</Text>
                  </View>
                  <Text style={styles.alertAction}>{alert.actionRequired}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="home" size={24} color="#3498DB" />
                <Text style={styles.statNumber}>{stats.totalProperties}</Text>
                <Text style={styles.statLabel}>Properties</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="#27AE60" />
                <Text style={styles.statNumber}>{stats.totalTenants}</Text>
                <Text style={styles.statLabel}>Tenants</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="construct" size={24} color="#F39C12" />
                <Text style={styles.statNumber}>{stats.activeRequests}</Text>
                <Text style={styles.statLabel}>Active Requests</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash" size={24} color="#9B59B6" />
                <Text style={styles.statNumber}>{formatCurrency(stats.monthlyRevenue)}</Text>
                <Text style={styles.statLabel}>Monthly Revenue</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E8F4FD' }]}>
                  <Ionicons name="list" size={24} color="#3498DB" />
                </View>
                <Text style={styles.actionTitle}>Maintenance</Text>
                <Text style={styles.actionSubtitle}>View all requests</Text>
                {stats.emergencyRequests > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{stats.emergencyRequests}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('Communications')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E8F8F0' }]}>
                  <Ionicons name="chatbubbles" size={24} color="#27AE60" />
                </View>
                <Text style={styles.actionTitle}>Communications</Text>
                <Text style={styles.actionSubtitle}>Tenant messages</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('PropertyManagement')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FDF2E8' }]}>
                  <Ionicons name="business" size={24} color="#E67E22" />
                </View>
                <Text style={styles.actionTitle}>Properties</Text>
                <Text style={styles.actionSubtitle}>Manage portfolio</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => {/* Navigate to Reports */}}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F4E8FD' }]}>
                  <Ionicons name="bar-chart" size={24} color="#9B59B6" />
                </View>
                <Text style={styles.actionTitle}>Reports</Text>
                <Text style={styles.actionSubtitle}>Analytics & insights</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#BDC3C7" />
                <Text style={styles.emptyTitle}>No Recent Activity</Text>
                <Text style={styles.emptySubtitle}>
                  When tenants submit requests or send messages, they'll appear here.
                </Text>
              </View>
            ) : (
              recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons 
                      name={activity.type === 'request_created' ? 'construct' : 'chatbubble'} 
                      size={16} 
                      color="#7F8C8D" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activityMetaText}>
                        {activity.property && `${activity.property} • `}
                        {activity.tenant && `${activity.tenant} • `}
                        {activity.timestamp}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Performance Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="trending-up" size={20} color="#27AE60" />
                <Text style={styles.insightTitle}>Response Time</Text>
              </View>
              <Text style={styles.insightValue}>Average: 2.3 hours</Text>
              <Text style={styles.insightDescription}>
                You're responding 15% faster than last month. Great job!
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#3498DB" />
                <Text style={styles.insightTitle}>Resolution Rate</Text>
              </View>
              <Text style={styles.insightValue}>92% this month</Text>
              <Text style={styles.insightDescription}>
                {stats.overdueRequests} requests need follow-up
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerLeft: {},
  headerRight: {},
  greeting: {
    fontSize: 16,
    color: '#6C757D',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertDescription: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 8,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertLocation: {
    fontSize: 12,
    color: '#6C757D',
  },
  alertTime: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  alertAction: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 52) / 2, // 2 columns with padding and gap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6C757D',
  },
  actionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 4,
  },
  activityMeta: {},
  activityMetaText: {
    fontSize: 11,
    color: '#6C757D',
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#6C757D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});

export default LandlordHomeScreen;