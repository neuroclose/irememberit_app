import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';
import { useAuthStore } from '../../src/store/auth.store';

// Badge icon mapping from Lucide to Ionicons
const getBadgeIcon = (lucideIcon: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'Sparkles': 'sparkles',
    'CheckCircle2': 'checkmark-circle',
    'Zap': 'flash',
    'Star': 'star',
    'Cloud': 'cloud',
    'ArrowRightLeft': 'swap-horizontal',
    'Grid3x3': 'grid',
    'Gauge': 'speedometer',
    'Mic': 'mic',
    'Volume2': 'volume-high',
    'MessageCircle': 'chatbubble',
    'Award': 'trophy',
    'CalendarCheck': 'calendar',
    'Flame': 'flame',
    'Trophy': 'trophy',
    'Target': 'radio-button-on',
    'RotateCcw': 'refresh',
    'TrendingUp': 'trending-up',
    'Brain': 'bulb',
    'Rocket': 'rocket',
    'GraduationCap': 'school',
    'Gem': 'diamond',
    'Crown': 'medal',
    'Moon': 'moon',
    'Sunrise': 'sunny',
    'Layers': 'layers',
  };
  
  return iconMap[lucideIcon] || 'ribbon';
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: syncData } = useQuery({
    queryKey: ['syncData'],
    queryFn: () => apiService.getInitialSync(),
  });

  // Fetch fresh user data to ensure we have the latest tier information
  // NOTE: /api/auth/user is currently broken for JWT tokens
  // We rely on cached user data from login until this is fixed on the web API
  const { data: freshUserData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiService.getCurrentUser(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false, // Don't retry if it fails (it will with JWT)
    enabled: false, // Disable this until web API fixes JWT support
  });

  // Fetch user stats (total points, weekly points)
  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? apiService.getUserStats(user.id) : null,
    enabled: !!user?.id,
    refetchOnMount: 'always',
    staleTime: 0, // Always fetch fresh data
  });

  const badges = syncData?.badges || [];
  const earnedBadges = badges.filter((badge: any) => badge.userBadge?.earned) || [];
  const organization = syncData?.organization;
  const totalPoints = userStats?.totalPoints || user?.totalPoints || 0;
  
  // Use fresh user data if available, otherwise fall back to stored user
  const currentUser = freshUserData || user;
  
  // Debug logging
  React.useEffect(() => {
    if (currentUser || organization) {
      console.log('[Profile] User role:', currentUser?.role);
      console.log('[Profile] User tier:', currentUser?.tier);
      console.log('[Profile] Organization tier:', organization?.tier);
      console.log('[Profile] Organization data:', organization);
      console.log('[Profile] Full user data:', currentUser);
    }
  }, [currentUser, organization]);
  
  // For team users, show user role (Admin/Learner), for individual show tier
  const displayRole = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'User';
  const isAdmin = currentUser?.role === 'admin';
  const hasOrganization = !!currentUser?.organizationId;

  const handleLogout = async () => {
    try {
      console.log('[Profile] Logout button pressed');
      
      // For web, clear localStorage directly
      if (Platform.OS === 'web') {
        localStorage.clear();
        console.log('[Profile] LocalStorage cleared');
        router.replace('/(auth)/login');
        return;
      }
      
      // For native, show confirmation
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Profile] Starting logout process...');
              // Clear all cached queries
              queryClient.clear();
              console.log('[Profile] Queries cleared');
              // Logout and clear storage
              await logout();
              console.log('[Profile] Storage cleared, navigating to login...');
              // Navigate to login
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('[Profile] Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('[Profile] Error showing logout alert:', error);
      // If alert fails, just logout directly
      try {
        if (Platform.OS === 'web') {
          localStorage.clear();
        } else {
          queryClient.clear();
          await logout();
        }
        router.replace('/(auth)/login');
      } catch (logoutError) {
        console.error('[Profile] Direct logout failed:', logoutError);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '#ef4444'; // Red for admin
      case 'learner':
        return '#3b82f6'; // Blue for learner
      default:
        return '#6366f1'; // Default purple
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>
            {currentUser?.firstName && currentUser?.lastName
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : currentUser?.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(displayRole) }]}>
            <Text style={styles.roleText}>{displayRole.toUpperCase()}</Text>
          </View>
        </View>

        {/* Badges Section - Horizontal Scroll */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <TouchableOpacity onPress={() => Alert.alert('View All Badges', 'Full badges page coming soon!')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {earnedBadges.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.badgesScroll}
              contentContainerStyle={styles.badgesScrollContent}
            >
              {earnedBadges.map((badge: any) => (
                <TouchableOpacity
                  key={badge.id}
                  style={styles.badgeItemHorizontal}
                  onPress={() => Alert.alert(
                    badge.name,
                    badge.description || 'No description available',
                    [{ text: 'OK' }]
                  )}
                >
                  <View style={[styles.badgeIconHorizontal, { backgroundColor: badge.color + '20' }]}>
                    <Ionicons 
                      name={getBadgeIcon(badge.icon)} 
                      size={36} 
                      color={badge.color || '#6366f1'} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyBadges}>
              <Ionicons name="ribbon-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No badges earned yet</Text>
            </View>
          )}
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color="#94a3b8" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          {hasOrganization && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/announcements')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="megaphone-outline" size={24} color="#94a3b8" />
                <Text style={styles.menuItemText}>Announcements</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {(isAdmin || !hasOrganization) && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/subscription')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="card-outline" size={24} color="#94a3b8" />
                <Text style={styles.menuItemText}>Subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#312e81',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  badgesScroll: {
    marginTop: 8,
  },
  badgesScrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  badgeItemHorizontal: {
    alignItems: 'center',
  },
  badgeIconHorizontal: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  badgeEmojiHorizontal: {
    fontSize: 36,
  },
  emptyBadges: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#e2e8f0',
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  syncText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});
