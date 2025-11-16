import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { RoleContext } from '../../context/RoleContext';
import { UserProfile } from '../../components/shared/UserProfile';
import { useApiClient } from '../../services/api/client';

type LandlordHomeNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'Home'>;

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: keyof LandlordStackParamList;
}

const LandlordHomeScreen = () => {
  const navigation = useNavigation<LandlordHomeNavigationProp>();
  const { user, signOut } = useAppAuth();
  const { clearRole } = useContext(RoleContext);
  const [portfolioData, setPortfolioData] = useState({
    name: '',
    image: '',
  });

  const [activeRequests, setActiveRequests] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const api = useApiClient();

  // Load property count on screen mount
  useEffect(() => {
    const loadPropertyCount = async () => {
      try {
        if (!api) return;
        const properties = await api.getUserProperties();
        setTotalProperties(properties.length);
      } catch (error) {
        console.error('Error loading property count:', error);
        setTotalProperties(0);
      }
    };

    loadPropertyCount();
  }, [api]);

  const quickActions: QuickAction[] = [
    {
      id: 'maintenance',
      title: 'Maintenance Hub',
      subtitle: activeRequests > 0 ? `${activeRequests} active ${activeRequests === 1 ? 'request' : 'requests'}` : 'No active requests',
      icon: 'construct',
      color: '#3498DB',
      route: 'Dashboard',
    },
    {
      id: 'messages',
      title: 'Communication Hub',
      subtitle: unreadMessages > 0 ? `${unreadMessages} unread ${unreadMessages === 1 ? 'message' : 'messages'}` : 'No new messages',
      icon: 'chatbubbles',
      color: '#2ECC71',
      route: 'Communications',
    },
    {
      id: 'properties',
      title: 'Property Management',
      subtitle: totalProperties > 0 ? `${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'}` : 'No properties yet',
      icon: 'business',
      color: '#9B59B6',
      route: 'PropertyManagement',
    },
  ];

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    icon: string;
    color: string;
  }>>([]);

  const handleQuickAction = (route: keyof LandlordStackParamList) => {
    navigation.navigate(route as any);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearRole();
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          {portfolioData.image ? (
            <Image source={{ uri: portfolioData.image }} style={styles.portfolioImage} />
          ) : (
            <View style={styles.portfolioImagePlaceholder}>
              <Ionicons name="business" size={60} color="#BDC3C7" />
            </View>
          )}
          
          <View style={styles.welcomeContent}>
            <View style={styles.greetingContainer}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Landlord'}!</Text>
                {portfolioData.name ? (
                  <Text style={styles.portfolioName}>{portfolioData.name}</Text>
                ) : (
                  <Text style={styles.portfolioName}>Welcome to MyAILandlord</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => setShowProfile(true)}
                accessibilityLabel="Open profile menu"
                accessibilityHint="Double tap to open profile and settings menu"
              >
                <Ionicons name="person-circle-outline" size={28} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsList}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionListItem}
                onPress={() => handleQuickAction(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionListTitle}>{action.title}</Text>
                  <Text style={styles.actionListSubtitle}>{action.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            
            {recentActivity.map((activity, index) => (
              <TouchableOpacity key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}15` }]}>
                  <Ionicons name={activity.icon as any} size={20} color={activity.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Analytics Card - Only show when there's data */}
        {totalProperties > 0 && (
          <TouchableOpacity style={styles.analyticsCard}>
            <Ionicons name="bar-chart" size={24} color="#9B59B6" />
            <View style={styles.analyticsContent}>
              <Text style={styles.analyticsTitle}>View Analytics & Reports</Text>
              <Text style={styles.analyticsSubtitle}>Performance insights and portfolio metrics</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9B59B6" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfile(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profile</Text>
            <TouchableOpacity 
              onPress={() => setShowProfile(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          <UserProfile userRole="landlord" />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  welcomeBanner: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    
    
    
    
    elevation: 5,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  portfolioImagePlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: '#F0F3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContent: {
    padding: 16,
    paddingTop: 12,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  portfolioName: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  quickActionsList: {
    gap: 8,
  },
  actionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    
    
    
    
    elevation: 1,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  actionListSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F3FF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D5FF',
  },
  analyticsContent: {
    flex: 1,
    marginLeft: 12,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B2CBF',
    marginBottom: 2,
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: '#9B59B6',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalCloseButton: {
    padding: 4,
  },
});

export default LandlordHomeScreen;
