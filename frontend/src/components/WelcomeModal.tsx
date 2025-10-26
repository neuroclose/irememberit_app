import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  userTier: string;
  isOrganization: boolean;
  userName?: string;
}

export default function WelcomeModal({ 
  visible, 
  onClose, 
  userTier, 
  isOrganization,
  userName 
}: WelcomeModalProps) {
  
  // Determine welcome message based on account type
  const getWelcomeMessage = () => {
    if (isOrganization) {
      return {
        title: '🎉 Welcome to Your 3-Day Trial!',
        message: `Hi ${userName || 'there'}! Your Teams/Enterprise account has been activated with a 3-day free trial. Explore all premium features and see how iRememberIT can transform your team's learning experience.`,
        trialInfo: '3-day trial active',
      };
    } else {
      return {
        title: '🎉 Welcome to iRememberIT!',
        message: `Hi ${userName || 'there'}! Your free account is ready. Start creating modules, learning with interactive sessions, and track your progress.`,
        trialInfo: 'Free account',
      };
    }
  };

  // Get popular upgrade suggestion based on tier
  const getUpgradeSuggestion = () => {
    if (isOrganization) {
      // For teams, suggest Small Teams Plus
      return {
        name: 'Small Teams Plus',
        price: '$79.99/month',
        reason: 'Most Popular for Teams',
        features: [
          'Up to 3 users',
          'Unlimited modules',
          'Advanced analytics',
          'Priority support',
        ],
        icon: 'people' as const,
      };
    } else {
      // For personal, suggest Premium
      return {
        name: 'Premium',
        price: '$19.99/month',
        reason: 'Most Popular Upgrade',
        features: [
          'Unlimited modules',
          'Unlimited cards',
          'All features',
          'Priority support',
          'Analytics',
        ],
        icon: 'star' as const,
      };
    }
  };

  const welcomeData = getWelcomeMessage();
  const upgradeData = getUpgradeSuggestion();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>{welcomeData.title}</Text>
              <Text style={styles.message}>{welcomeData.message}</Text>
              
              <View style={styles.statusBadge}>
                <Ionicons 
                  name={isOrganization ? "business" : "person"} 
                  size={16} 
                  color="#10b981" 
                />
                <Text style={styles.statusText}>{welcomeData.trialInfo}</Text>
              </View>
            </View>

            {/* Upgrade Suggestion */}
            <View style={styles.upgradeSection}>
              <View style={styles.popularBadge}>
                <Ionicons name="trending-up" size={16} color="#fff" />
                <Text style={styles.popularText}>{upgradeData.reason}</Text>
              </View>

              <View style={styles.upgradeCard}>
                <View style={styles.upgradeHeader}>
                  <Ionicons 
                    name={upgradeData.icon} 
                    size={32} 
                    color="#6366f1" 
                  />
                  <View style={styles.upgradeInfo}>
                    <Text style={styles.upgradeName}>{upgradeData.name}</Text>
                    <Text style={styles.upgradePrice}>{upgradeData.price}</Text>
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {upgradeData.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.upgradeHint}>
                  Upgrade anytime from your Profile → Subscription
                </Text>
              </View>
            </View>

            {/* CTA Buttons */}
            <View style={styles.ctaButtonsContainer}>
              <TouchableOpacity 
                style={styles.upgradeButton} 
                onPress={() => {
                  onClose();
                  // Navigate to subscription page
                  router.push('/(tabs)/profile');
                  // Small delay to ensure profile loads first
                  setTimeout(() => {
                    router.push('/subscription');
                  }, 100);
                }}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.ctaButton} 
                onPress={onClose}
              >
                <Text style={styles.ctaButtonText}>Start Learning</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#334155',
  },
  scrollContent: {
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  upgradeSection: {
    marginBottom: 24,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  upgradeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  upgradePrice: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  upgradeHint: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ctaButtonsContainer: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  ctaButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
