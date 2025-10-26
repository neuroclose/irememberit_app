import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../src/services/api.service';
import { useAuthStore } from '../src/store/auth.store';

// Tier data (ordered from least to most expensive)
const INDIVIDUAL_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    features: ['3 modules', '2 cards per module', 'Basic learning modes', 'Personal use only'],
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    period: '/month',
    features: ['3 modules', '3 cards per module', 'All learning modes', 'No ads'],
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: '/month',
    features: ['Unlimited modules', 'Unlimited cards', 'All features', 'Priority support', 'Analytics'],
    popular: true,
  },
];

const TEAM_TIERS = [
  {
    id: 'small_teams',
    name: 'Small Teams',
    price: 49.99,
    period: '/month',
    seats: 3,
    features: ['Up to 3 users', '5 modules', '5 cards per module', 'Team analytics', 'Priority support', '1 admin'],
    popular: false,
  },
  {
    id: 'small_teams_plus',
    name: 'Small Teams Plus',
    price: 79.99,
    period: '/month',
    seats: 3,
    features: ['Up to 3 users', 'Unlimited modules', '5 cards per module', 'Advanced analytics', 'Priority support', '1 admin'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    period: '/month base + $29.99/user',
    seats: 'scalable',
    features: ['3 base users + scalable', 'Unlimited modules', 'Unlimited cards', 'All features', 'Unlimited admins', 'Dedicated support'],
    popular: false,
  },
];

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [planType, setPlanType] = useState<'individual' | 'team'>('individual');
  const [promoCode, setPromoCode] = useState('');
  const [enterpriseUserCount, setEnterpriseUserCount] = useState('10');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('[Subscription] User object:', JSON.stringify(user, null, 2));
    console.log('[Subscription] User tier:', user?.tier);
    console.log('[Subscription] User subscriptionType:', user?.subscriptionType);
  }, [user]);

  // Auto-refresh user data when page loads to ensure fresh subscription info
  React.useEffect(() => {
    console.log('[Subscription] Page loaded, refreshing user data...');
    checkSubscriptionStatus();
  }, []); // Empty dependency array = run once on mount

  const hasOrganization = !!user?.organizationId;
  const isAdmin = user?.role === 'admin';
  const canManage = !hasOrganization || (hasOrganization && isAdmin);

  // Poll for subscription updates when returning from Stripe
  React.useEffect(() => {
    const subscription = Platform.OS !== 'web' 
      ? require('react-native').AppState.addEventListener('change', handleAppStateChange)
      : null;

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isCheckingPayment]);

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'active' && isCheckingPayment) {
      console.log('[Subscription] App became active, checking for payment completion...');
      await checkSubscriptionStatus();
    }
  };

  // Helper function to format subscription status for display
  const formatSubscriptionStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'lifetime_promo': 'Lifetime Promo',
      'canceled': 'Canceled',
      'trial': 'Trial',
      'promo_trial': 'Promo Trial',
      'past_due': 'Past Due',
      'unpaid': 'Unpaid',
    };
    return statusMap[status] || status;
  };

  const checkSubscriptionStatus = async () => {
    try {
      setIsCheckingPayment(true);
      console.log('[Subscription] Manually refreshing subscription data...');
      console.log('[Subscription] User type:', hasOrganization ? 'Organization' : 'Standalone');
      console.log('[Subscription] User ID:', user?.id);
      console.log('[Subscription] Organization ID:', user?.organizationId);
      
      let updatedUserData = null;
      
      if (hasOrganization) {
        // ORGANIZATION USERS: Fetch organization subscription data
        console.log('[Subscription] Fetching organization subscription...');
        try {
          const orgData = await apiService.getOrganization();
          console.log('[Subscription] Organization data received:', JSON.stringify(orgData, null, 2));
          
          // Organization users get tier and status from organization
          updatedUserData = { 
            ...user, 
            tier: orgData.tier || 'free',
            subscriptionStatus: orgData.subscriptionStatus || 'active',
            stripeCustomerId: orgData.stripeCustomerId || null,
            stripeSubscriptionId: orgData.stripeSubscriptionId || null
          };
          
          console.log('[Subscription] Organization user updated with org tier:', updatedUserData.tier);
        } catch (error: any) {
          console.error('[Subscription] Failed to get organization data:', error.message);
          // Keep existing user data if org fetch fails
          updatedUserData = user;
        }
      } else {
        // STANDALONE USERS: Fetch individual user subscription data
        console.log('[Subscription] Fetching standalone user subscription...');
        try {
          const userData = await apiService.getCurrentUser();
          console.log('[Subscription] Standalone user data received:', JSON.stringify(userData, null, 2));
          
          // Use the fresh user data with tier from their individual subscription
          updatedUserData = userData;
          
          console.log('[Subscription] Standalone user tier:', updatedUserData.tier);
        } catch (error: any) {
          console.error('[Subscription] Failed to get user data:', error.message);
          console.log('[Subscription] Attempting fallback to sync endpoint...');
          
          // Fallback to sync endpoint
          try {
            const syncData = await apiService.getInitialSync();
            console.log('[Subscription] Sync data received:', JSON.stringify(syncData, null, 2));
            updatedUserData = syncData.user;
          } catch (syncError: any) {
            console.error('[Subscription] Sync fallback also failed:', syncError.message);
            updatedUserData = user; // Keep existing data
          }
        }
      }
      
      if (updatedUserData) {
        const oldTier = user?.tier;
        const newTier = updatedUserData.tier;
        
        console.log('[Subscription] Tier comparison - Old:', oldTier, '| New:', newTier);
        console.log('[Subscription] Subscription status:', updatedUserData.subscriptionStatus);
        
        // Update user in global state
        useAuthStore.getState().setUser(updatedUserData);
        
        // Show appropriate message
        if (newTier !== oldTier) {
          Alert.alert(
            'Subscription Updated! 🎉',
            `You are now on the ${newTier.toUpperCase()} plan!`
          );
        } else {
          Alert.alert(
            'Refreshed',
            'Your subscription data has been refreshed.'
          );
        }
      }
      
      setIsCheckingPayment(false);
    } catch (error: any) {
      console.error('[Subscription] Critical error in checkSubscriptionStatus:', error);
      Alert.alert(
        'Refresh Failed',
        'Unable to refresh subscription data. Please try again.'
      );
      setIsCheckingPayment(false);
    }
  };

  // Fetch current subscription
  const { data: subscription, isLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        const data = await apiService.getCurrentSubscription();
        console.log('[Subscription] API response:', JSON.stringify(data, null, 2));
        
        // Update user tier from subscription data if available
        if (data?.subscription) {
          const subscriptionData = data.subscription;
          let updatedTier = user?.tier;
          let updatedStatus = user?.subscriptionStatus;
          
          // For organization subscriptions
          if (subscriptionData.organization) {
            updatedTier = subscriptionData.organization.tier || updatedTier;
            updatedStatus = subscriptionData.organization.subscriptionStatus || updatedStatus;
          }
          // For user subscriptions
          else if (subscriptionData.user) {
            updatedTier = subscriptionData.user.tier || updatedTier;
            updatedStatus = subscriptionData.user.subscriptionStatus || updatedStatus;
          }
          
          // Update user in store if tier or status changed
          if (updatedTier !== user?.tier || updatedStatus !== user?.subscriptionStatus) {
            const updatedUser = {
              ...user,
              tier: updatedTier,
              subscriptionStatus: updatedStatus
            };
            console.log('[Subscription] Updating user from subscription data:', {
              oldTier: user?.tier,
              newTier: updatedTier,
              oldStatus: user?.subscriptionStatus,
              newStatus: updatedStatus
            });
            useAuthStore.getState().setUser(updatedUser);
          }
        }
        
        return data;
      } catch (error) {
        console.log('[Subscription] Endpoint not available, using user tier data');
        return null;
      }
    },
    retry: false,
    enabled: true, // Enable to fetch subscription data
  });

  // Create checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: ({ tier, userCount }: { tier: string; userCount?: number }) =>
      apiService.createCheckoutSession(tier, userCount),
    onSuccess: async (data) => {
      console.log('[Checkout] Backend response:', JSON.stringify(data, null, 2));
      
      // The web API returns either { url: "stripe_url" } or { sessionId: "session_id" }
      let checkoutUrl = null;
      
      if (data.url) {
        // Direct URL from Stripe
        checkoutUrl = data.url;
      } else if (data.sessionId) {
        // Construct URL from session ID
        checkoutUrl = `https://checkout.stripe.com/c/pay/${data.sessionId}`;
      }
      
      if (!checkoutUrl) {
        console.error('[Checkout] No URL or sessionId in response:', data);
        Alert.alert('Error', 'Invalid checkout response from server');
        return;
      }
      
      console.log('[Checkout] Opening URL:', checkoutUrl);
      
      try {
        const canOpen = await Linking.canOpenURL(checkoutUrl);
        console.log('[Checkout] Can open URL:', canOpen);
        
        if (canOpen) {
          // Set flag to check payment status when user returns
          setIsCheckingPayment(true);
          
          await Linking.openURL(checkoutUrl);
          console.log('[Checkout] URL opened successfully');
          
          // Show info message
          Alert.alert(
            'Complete Your Payment',
            'Please complete the payment in the browser. When you return, we\'ll automatically check your subscription status.',
            [{ text: 'OK' }]
          );
        } else {
          console.error('[Checkout] Cannot open URL');
          Alert.alert('Error', 'Unable to open Stripe checkout. Please try again.');
        }
      } catch (error) {
        console.error('[Checkout] Error opening URL:', error);
        Alert.alert('Error', `Failed to open checkout: ${error.message}`);
      }
    },
    onError: (error: any) => {
      console.error('[Checkout] Mutation error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start checkout');
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiService.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      Alert.alert('Success', 'Subscription will be canceled at the end of the billing period');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel subscription');
    },
  });

  // Apply promo code mutation
  const promoMutation = useMutation({
    mutationFn: (code: string) => apiService.applyPromoCode(code),
    onSuccess: async (data) => {
      console.log('[Promo] Promo code applied successfully:', JSON.stringify(data, null, 2));
      console.log('[Promo] Success message:', data.message);
      
      // Clear input immediately
      setPromoCode('');
      
      // Refresh user data properly using the correct endpoint
      try {
        let updatedUserData = null;
        
        if (hasOrganization) {
          const orgData = await apiService.getOrganization();
          updatedUserData = { ...user, tier: orgData.tier, subscriptionStatus: orgData.subscriptionStatus };
        } else {
          // For standalone users, use /api/auth/user
          try {
            const userData = await apiService.getCurrentUser();
            console.log('[Promo] Fresh user data:', JSON.stringify(userData, null, 2));
            updatedUserData = userData;
          } catch (error) {
            console.error('[Promo] Failed to get user data, trying sync:', error);
            const syncData = await apiService.getInitialSync();
            updatedUserData = syncData.user;
          }
        }
        
        if (updatedUserData) {
          console.log('[Promo] Updated user tier:', updatedUserData.tier);
          console.log('[Promo] Updated user subscriptionStatus:', updatedUserData.subscriptionStatus);
          
          // Update auth store with new user data
          useAuthStore.getState().setUser(updatedUserData);
        }
        
        console.log('[Promo] About to show success alert');
        
        // Show success message with the custom message from backend
        setTimeout(() => {
          Alert.alert(
            'Success! 🎉', 
            data.message || 'Promo code applied successfully!',
            [{ text: 'OK', onPress: () => console.log('[Promo] Alert dismissed') }]
          );
        }, 100);
      } catch (error) {
        console.error('[Promo] Failed to refresh user:', error);
        
        // Still show success for promo application even if refresh fails
        setTimeout(() => {
          Alert.alert(
            'Success! 🎉', 
            data.message || 'Promo code applied! Please refresh the page to see changes.',
            [{ text: 'OK', onPress: () => console.log('[Promo] Alert dismissed') }]
          );
        }, 100);
      }
    },
    onError: (error: any) => {
      console.error('[Promo] Error applying promo code:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Invalid promo code';
      console.log('[Promo] About to show error alert:', errorMsg);
      Alert.alert('Error', errorMsg);
    },
  });

  const handleUpgrade = (tierId: string) => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only organization admins can manage subscriptions');
      return;
    }

    if (tierId === 'enterprise') {
      const userCount = parseInt(enterpriseUserCount);
      if (isNaN(userCount) || userCount < 1) {
        Alert.alert('Error', 'Please enter a valid user count');
        return;
      }
      checkoutMutation.mutate({ tier: tierId, userCount });
    } else {
      checkoutMutation.mutate({ tier: tierId });
    }
  };

  const handleCancel = () => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only organization admins can manage subscriptions');
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure? Your subscription will remain active until the end of the billing period.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    );
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      Alert.alert('Error', 'Please enter a promo code');
      return;
    }
    promoMutation.mutate(promoCode.trim().toUpperCase());
  };

  const getCurrentTier = () => {
    if (hasOrganization && subscription?.organization) {
      return subscription.organization.tier || 'free';
    }
    return subscription?.user?.tier || user?.tier || 'free';
  };

  const currentTier = getCurrentTier();
  const currentTierLevel = getTierLevel(currentTier);
  const allTiers = hasOrganization ? TEAM_TIERS : (planType === 'team' ? TEAM_TIERS : INDIVIDUAL_TIERS);
  
  // Filter out current tier and tiers below it, sorted by price ascending
  const displayTiers = allTiers
    .filter(tier => getTierLevel(tier.id) > currentTierLevel)
    .sort((a, b) => {
      const priceA = a.price;
      const priceB = b.price;
      return priceA - priceB;
    });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            console.log('[Subscription] Back button pressed');
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        {isCheckingPayment && (
          <TouchableOpacity onPress={checkSubscriptionStatus} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#6366f1" />
          </TouchableOpacity>
        )}
        {!isCheckingPayment && <View style={styles.backButton} />}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Payment Pending Banner */}
        {isCheckingPayment && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={24} color="#f59e0b" />
            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingTitle}>Waiting for Payment</Text>
              <Text style={styles.pendingText}>
                Complete your payment in the browser, then tap the refresh icon above to update your subscription.
              </Text>
            </View>
          </View>
        )}
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <View>
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
              <Text style={styles.currentPlanName}>{currentTier.toUpperCase()}</Text>
              {user?.subscriptionStatus && (
                <Text style={styles.subscriptionStatus}>
                  Status: {formatSubscriptionStatus(user.subscriptionStatus)}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              onPress={checkSubscriptionStatus}
              style={styles.refreshSmallButton}
            >
              <Ionicons name="refresh" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
          
          {/* Show lifetime badge for promo users */}
          {user?.subscriptionStatus === 'lifetime_promo' && (
            <View style={styles.lifetimeBadge}>
              <Ionicons name="infinite" size={20} color="#10b981" />
              <Text style={styles.lifetimeText}>Lifetime Access</Text>
            </View>
          )}
          
          {/* Cancel subscription button for paid active subscriptions */}
          {currentTier !== 'free' && user?.subscriptionStatus === 'active' && user?.stripeSubscriptionId && canManage && (
            <TouchableOpacity
              style={styles.cancelSubscriptionButton}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>
          )}
          
          {subscription?.nextRenewalDate && (
            <Text style={styles.renewalText}>
              Renews on {new Date(subscription.nextRenewalDate).toLocaleDateString()}
            </Text>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <Text style={styles.cancelText}>⚠️ Cancels at period end</Text>
          )}
          {subscription?.subscriptionStatus === 'active' && canManage && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Access Denied Message for Non-Admins */}
        {!canManage && (
          <View style={styles.accessDeniedCard}>
            <Ionicons name="lock-closed" size={48} color="#f59e0b" />
            <Text style={styles.accessDeniedTitle}>View Only</Text>
            <Text style={styles.accessDeniedText}>
              Only organization admins can manage subscriptions. Contact your admin to upgrade or make changes.
            </Text>
          </View>
        )}

        {/* Plan Type Toggle (Standalone Users Only) */}
        {!hasOrganization && canManage && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, planType === 'individual' && styles.toggleButtonActive]}
              onPress={() => setPlanType('individual')}
            >
              <Text style={[styles.toggleText, planType === 'individual' && styles.toggleTextActive]}>
                Individual Plans
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, planType === 'team' && styles.toggleButtonActive]}
              onPress={() => setPlanType('team')}
            >
              <Text style={[styles.toggleText, planType === 'team' && styles.toggleTextActive]}>
                Team Plans
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Dashboard Notice for Teams/Enterprise */}
        {hasOrganization && canManage && (
          <View style={styles.adminNoticeCard}>
            <Ionicons name="desktop-outline" size={32} color="#6366f1" />
            <Text style={styles.adminNoticeTitle}>Manage Additional Seats</Text>
            <Text style={styles.adminNoticeText}>
              To add additional learning seats, please access your admin dashboard on the web version of iRememberIT.
            </Text>
          </View>
        )}

        {/* Available Plans / Upgrades */}
        <Text style={styles.sectionTitle}>
          {hasOrganization ? 'Subscription Plans' : `${planType === 'team' ? 'Team' : 'Individual'} Plans`}
        </Text>

        {displayTiers.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          const canUpgrade = canManage && getTierLevel(tier.id) > getTierLevel(currentTier);
          
          return (
            <View key={tier.id} style={[styles.tierCard, tier.popular && styles.tierCardPopular, isCurrentTier && styles.tierCardCurrent]}>
              {tier.popular && !isCurrentTier && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              {isCurrentTier && (
                <View style={styles.currentBadgeTop}>
                  <Text style={styles.currentBadgeTopText}>CURRENT PLAN</Text>
                </View>
              )}
              <Text style={styles.tierName}>{tier.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.tierPrice}>${tier.price}</Text>
                <Text style={styles.tierPeriod}>{tier.period}</Text>
              </View>
              
              {tier.id === 'enterprise' && canManage && !isCurrentTier && (
                <View style={styles.userCountInput}>
                  <Text style={styles.userCountLabel}>Number of users:</Text>
                  <TextInput
                    style={styles.userCountField}
                    value={enterpriseUserCount}
                    onChangeText={setEnterpriseUserCount}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor="#64748b"
                  />
                </View>
              )}

              <View style={styles.featuresContainer}>
                {tier.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {canUpgrade && (
                <TouchableOpacity
                  style={[styles.upgradeButton, checkoutMutation.isPending && styles.upgradeButtonDisabled]}
                  onPress={() => handleUpgrade(tier.id)}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.upgradeButtonText}>
                      Upgrade to {tier.name}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        
        {displayTiers.length === 0 && (
          <View style={styles.congratsCard}>
            <Ionicons name="trophy" size={64} color="#10b981" />
            <Text style={styles.congratsTitle}>You're on the Top Tier! 🎉</Text>
            <Text style={styles.congratsText}>
              You have access to all premium features. Enjoy unlimited learning with iRememberIT!
            </Text>
          </View>
        )}

        {/* Promo Code Section */}
        {canManage && (
          <View style={styles.promoSection}>
            <Text style={styles.promoTitle}>Have a Promo Code?</Text>
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter promo code"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                editable={!promoMutation.isPending}
              />
              <TouchableOpacity
                style={[styles.promoButton, promoMutation.isPending && styles.promoButtonDisabled]}
                onPress={handleApplyPromo}
                disabled={promoMutation.isPending}
              >
                {promoMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.promoButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to compare tier levels
function getTierLevel(tierId: string): number {
  const levels: Record<string, number> = {
    free: 0,
    basic: 1,
    premium: 2,
    small_teams: 3,
    small_teams_plus: 4,
    enterprise: 5,
  };
  return levels[tierId] || 0;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  currentPlanCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  refreshSmallButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  lifetimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  lifetimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 6,
  },
  cancelSubscriptionButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  cancelSubscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  renewalText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
  },
  cancelText: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  accessDeniedCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  toggleTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  tierCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  tierCardPopular: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  tierCardCurrent: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  currentBadgeTop: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeTopText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  tierName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
  },
  tierPeriod: {
    fontSize: 16,
    color: '#94a3b8',
    marginLeft: 4,
  },
  userCountInput: {
    marginBottom: 16,
  },
  userCountLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  userCountField: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginLeft: 12,
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  upgradeButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  promoSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    marginBottom: 24,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  promoButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoButtonDisabled: {
    opacity: 0.6,
  },
  promoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  adminNoticeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  adminNoticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  adminNoticeText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  noUpgradesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  noUpgradesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  noUpgradesText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  congratsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  congratsText: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
  },
  congratsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  congratsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
  },
  pendingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
});
