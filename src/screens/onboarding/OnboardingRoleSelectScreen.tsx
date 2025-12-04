import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { RoleContext } from '../../context/RoleContext';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'RoleSelect'>;

const { width } = Dimensions.get('window');

const OnboardingRoleSelectScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { setUserRole } = useContext(RoleContext);

  const handleRoleSelect = async (role: 'tenant' | 'landlord') => {
    await setUserRole(role);
    if (role === 'landlord') {
      navigation.navigate('LandlordSetup');
    } else {
      navigation.navigate('TenantSetup');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>

          <View style={styles.backButton} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>What's your role?</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your experience
          </Text>
        </View>

        {/* Role cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.roleCard, styles.tenantCard]}
            onPress={() => handleRoleSelect('tenant')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏘️</Text>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>I'm a Tenant</Text>
                <Text style={styles.cardSubtitle}>Renting a property</Text>
              </View>
            </View>
            <View style={styles.cardFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#3498DB" />
                <Text style={styles.featureText}>Report maintenance issues</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#3498DB" />
                <Text style={styles.featureText}>Track repair status</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#3498DB" />
                <Text style={styles.featureText}>Message your landlord</Text>
              </View>
            </View>
            <View style={styles.selectIndicator}>
              <Text style={styles.selectText}>Select</Text>
              <Ionicons name="arrow-forward" size={18} color="#3498DB" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, styles.landlordCard]}
            onPress={() => handleRoleSelect('landlord')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏢</Text>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>I'm a Landlord</Text>
                <Text style={styles.cardSubtitle}>Managing properties</Text>
              </View>
            </View>
            <View style={styles.cardFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#34495E" />
                <Text style={styles.featureText}>Manage maintenance requests</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#34495E" />
                <Text style={styles.featureText}>AI-powered cost estimates</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#34495E" />
                <Text style={styles.featureText}>Coordinate with vendors</Text>
              </View>
            </View>
            <View style={styles.selectIndicator}>
              <Text style={[styles.selectText, { color: '#34495E' }]}>Select</Text>
              <Ionicons name="arrow-forward" size={18} color="#34495E" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E8ED',
  },
  progressDotActive: {
    backgroundColor: '#3498DB',
    width: 24,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  cardsContainer: {
    flex: 1,
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  tenantCard: {
    borderColor: '#3498DB',
  },
  landlordCard: {
    borderColor: '#34495E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  cardFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#5D6D7E',
  },
  selectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
});

export default OnboardingRoleSelectScreen;
