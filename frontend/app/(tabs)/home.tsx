import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../src/services/api.service';
import { useAuthStore } from '../../src/store/auth.store';
import { Module } from '../../src/types';
import WelcomeModal from '../../src/components/WelcomeModal';

// Helper function to format time in hours and minutes
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function HomeScreen() {
  const { user, setUser } = useAuthStore();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Check if this is the first time opening the app after signup/login
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
        
        if (!user) return;
        
        // Calculate if user should see welcome modal
        const shouldShowModal = () => {
          // Always show for free tier
          if (user.tier === 'free') return true;
          
          // Show for trials under 14 days
          if (user.trialEndsAt) {
            const trialEnd = new Date(user.trialEndsAt);
            const now = new Date();
            const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining > 0 && daysRemaining < 14) return true;
          }
          
          // Show when promo period expires within 7 days
          if (user.promoExpiresAt) {
            const promoEnd = new Date(user.promoExpiresAt);
            const now = new Date();
            const daysRemaining = Math.ceil((promoEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining > 0 && daysRemaining <= 7) return true;
          }
          
          return false;
        };
        
        if (!hasSeenWelcome && shouldShowModal()) {
          setShowWelcomeModal(true);
          await AsyncStorage.setItem('hasSeenWelcome', 'true');
        }
      } catch (error) {
        console.error('Error checking first login:', error);
      }
    };

    checkFirstLogin();
  }, [user]);

  const { data: syncData, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['syncData'],
    queryFn: async () => {
      const data = await apiService.getInitialSync();
      console.log('Sync data received:', {
        modulesCount: data.modules?.length || 0,
        badgesCount: data.badges?.length || 0,
        user: data.user?.email,
      });
      
      // Debug: Log each module and its cards
      if (data.modules) {
        data.modules.forEach((module: any, index: number) => {
          console.log(`Module ${index + 1}:`, {
            id: module.id,
            name: module.name,
            cardsCount: module.cards?.length || 0,
            cardIds: module.cards?.map((c: any) => c.id) || [],
            firstCardContent: module.cards?.[0]?.content?.substring(0, 50) || 'No cards'
          });
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Update user data from sync
      if (data.user) {
        setUser(data.user);
      }
    },
    onError: (err: any) => {
      console.error('Sync error:', err);
    },
  });

  const modules = syncData?.modules || [];
  
  // Fetch user stats (total points, weekly points)
  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? apiService.getUserStats(user.id) : null,
    enabled: !!user?.id,
    refetchOnMount: 'always',
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch streak data
  const { data: streakData, refetch: refetchStreak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => apiService.getStreak(),
    enabled: !!user?.id,
  });

  // Combined refetch function for stats container
  const refetchUserData = () => {
    refetchStats();
    refetchStreak();
  };
  
  const totalPoints = userStats?.totalPoints || 0;
  const rank = userStats?.rank || null;
  const currentStreak = streakData?.currentStreak || 0;
  const maxStreak = streakData?.maxStreak || 0;
  
  // Determine user type
  const isAdmin = user?.role === 'admin';
  const hasOrganization = !!user?.organizationId;

  // Fetch announcements for badge count
  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiService.getAnnouncements(),
    enabled: hasOrganization,
  });

  const unreadAnnouncementsCount = announcements?.filter((a: any) => !a.userAnnouncement?.hasRead)?.length || 0;
  
  console.log('[Home] Module classification debug:');
  modules.forEach((m: any) => {
    console.log(`[Home] Module "${m.name}": moduleType="${m.moduleType}", organizationId="${m.organizationId}", createdById="${m.createdById}", isPrivate=${m.isPrivate}`);
  });
  
  // Filter modules based on user role
  // For organization users, classify based on organizationId match
  const unassignedModules = isAdmin && hasOrganization 
    ? modules.filter((m: any) => {
        // Unassigned if explicitly marked OR private without assignment
        return m.moduleType === 'unassigned' || (m.isPrivate && !m.moduleType);
      })
    : [];
    
  const assignedModules = isAdmin && hasOrganization
    ? modules.filter((m: any) => {
        // For org admins: assigned if it belongs to their organization
        // OR explicitly marked as assigned OR not unassigned/personal
        return m.organizationId === user?.organizationId || 
               m.moduleType === 'assigned' || 
               (!m.isPrivate && m.moduleType !== 'unassigned' && m.moduleType !== 'personal');
      })
    : modules.filter((m: any) => m.moduleType === 'assigned');
    
  const myModules = !isAdmin || !hasOrganization
    ? modules.filter((m: any) => m.moduleType === 'personal' || m.createdById === user?.id)
    : [];

  console.log('Home screen - modules count:', modules.length);
  console.log('Home screen - isAdmin:', isAdmin, 'hasOrg:', hasOrganization);
  console.log('Home screen - unassigned:', unassignedModules.length, 'assigned:', assignedModules.length);
  console.log('[Home] User organizationId:', user?.organizationId);

  const renderModuleCard = (module: Module) => (
    <TouchableOpacity
      key={module.id}
      style={styles.moduleCard}
      onPress={() => router.push(`/module/${module.id}`)}
    >
      <View style={styles.moduleHeader}>
        <View style={styles.moduleIcon}>
          <Ionicons name="book" size={24} color="#6366f1" />
        </View>
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleTitle} numberOfLines={1}>
            {module.title}
          </Text>
          <Text style={styles.moduleDescription} numberOfLines={2}>
            {module.description || 'No description'}
          </Text>
        </View>
      </View>
      <View style={styles.moduleFooter}>
        <View style={styles.moduleStats}>
          <Ionicons name="layers" size={14} color="#94a3b8" />
          <Text style={styles.moduleStatsText}>
            {module.cards?.length || 0} {(module.cards?.length || 0) === 1 ? 'card' : 'cards'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${module.progress || 0}%` }]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Welcome Modal */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userTier={user?.tier || 'free'}
        isOrganization={hasOrganization}
        userName={user?.firstName}
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
      >
        {/* Header with App Name */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>iRememberIT</Text>
            <Text style={styles.greeting}>Hello, {user?.firstName || 'Learner'}! 👋</Text>
            <Text style={styles.subGreeting}>Ready to learn something new?</Text>
          </View>
          
          {/* Announcements Icon with Badge */}
          {hasOrganization && (
            <TouchableOpacity
              style={styles.announcementButton}
              onPress={() => router.push('/announcements')}
            >
              <Ionicons name="megaphone" size={24} color="#fff" />
              {unreadAnnouncementsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadAnnouncementsCount > 99 ? '99+' : unreadAnnouncementsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Cards - 3 Cards Horizontal */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flash" size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          {hasOrganization ? (
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="ribbon" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.statValue}>{rank || 'N/A'}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          ) : (
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{formatTime(userStats?.totalTimeSpent || 0)}</Text>
              <Text style={styles.statLabel}>Time Spent</Text>
            </View>
          )}
        </ScrollView>

        {/* Create Module Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-module')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create Module</Text>
        </TouchableOpacity>

        {/* Modules Section - Admin View */}
        {isAdmin && hasOrganization ? (
          <>
            {/* Unassigned Modules (Admin's Private) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Unassigned Modules</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/learn')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                </View>
              ) : unassignedModules.length > 0 ? (
                <View style={styles.modulesList}>
                  {unassignedModules.slice(0, 3).map(renderModuleCard)}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="lock-closed-outline" size={48} color="#475569" />
                  <Text style={styles.emptyStateTextSmall}>No unassigned modules</Text>
                  <Text style={styles.emptyStateSubtextSmall}>
                    Create modules to assign to your team
                  </Text>
                </View>
              )}
            </View>

            {/* Assigned Modules */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Assigned Modules</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/learn')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                </View>
              ) : assignedModules.length > 0 ? (
                <View style={styles.modulesList}>
                  {assignedModules.slice(0, 3).map(renderModuleCard)}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#475569" />
                  <Text style={styles.emptyStateTextSmall}>No assigned modules</Text>
                  <Text style={styles.emptyStateSubtextSmall}>
                    Assign modules to your team members
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          /* Modules Section - Learner View */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {hasOrganization ? 'My Modules' : 'My Modules'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/learn')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
              </View>
            ) : (myModules.length > 0 || assignedModules.length > 0) ? (
              <View style={styles.modulesList}>
                {myModules.slice(0, 3).map(renderModuleCard)}
                {assignedModules.slice(0, 2).map(renderModuleCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={64} color="#475569" />
                <Text style={styles.emptyStateText}>No modules yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  {hasOrganization 
                    ? 'Wait for your admin to assign modules'
                    : 'Create your first module to start learning'}
                </Text>
              </View>
            )}
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#94a3b8',
  },
  announcementButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsScrollView: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 110,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
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
    marginBottom: 24,
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
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  modulesList: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  moduleHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleStatsText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTextSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtextSmall: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
