import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';
import { useAuthStore } from '../../src/store/auth.store';

export default function LeaderboardScreen() {
  const { user } = useAuthStore();

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      console.log('[Leaderboard] Fetching leaderboard data...');
      try {
        const result = await apiService.getLeaderboard('alltime');
        console.log('[Leaderboard] Received data:', result);
        console.log('[Leaderboard] Leaderboard array length:', result?.leaderboard?.length);
        return result;
      } catch (err) {
        console.error('[Leaderboard] Error fetching:', err);
        throw err;
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
    staleTime: 0, // Don't use stale data
    cacheTime: 0, // Don't cache
  });

  console.log('[Leaderboard] Component state:', { 
    isLoading, 
    hasData: !!leaderboardData, 
    hasError: !!error,
    errorMessage: error?.message,
    leaderboardLength: leaderboardData?.leaderboard?.length,
    rawData: leaderboardData
  });

  const leaderboard = leaderboardData?.leaderboard || [];
  const currentUserRank = leaderboard.find((entry: any) => entry.userId === user?.id)?.rank;
  
  console.log('[Leaderboard] Processed:', {
    leaderboardArray: leaderboard,
    leaderboardLength: leaderboard.length,
    currentUserRank
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
            <Text style={styles.emptyText}>Failed to load leaderboard</Text>
            <Text style={styles.emptySubtext}>{error.message || 'Unknown error'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Top performers in your organization</Text>
        </View>

        {/* Current User Rank Card */}
        {currentUserRank && (
          <View style={styles.currentUserCard}>
            <View style={styles.currentUserLeft}>
              <Ionicons name="person-circle" size={48} color="#6366f1" />
              <View>
                <Text style={styles.currentUserName}>Your Rank</Text>
                <Text style={styles.currentUserPoints}>
                  {leaderboard.find((e: any) => e.userId === user?.id)?.totalPoints || 0} points
                </Text>
              </View>
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#{currentUserRank}</Text>
            </View>
          </View>
        )}

        {/* Top 3 Podium */}
        <View style={styles.podiumContainer}>
          {leaderboard.slice(0, 3).map((entry: any, index: number) => {
            const isCurrentUser = entry.userId === user?.id;
            const colors = ['#f59e0b', '#94a3b8', '#cd7f32']; // Gold, Silver, Bronze
            const heights = [120, 100, 80];
            const icons = ['trophy', 'medal', 'medal'];

            return (
              <View key={entry.userId} style={[styles.podiumItem, { order: index === 0 ? 2 : index === 1 ? 1 : 3 }]}>
                <View style={[styles.podiumTop, isCurrentUser && styles.podiumHighlight]}>
                  <Ionicons name={icons[index]} size={32} color={colors[index]} />
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {entry.name || entry.email || (isCurrentUser ? 'You' : `User ${entry.userId.slice(0, 4)}`)}
                  </Text>
                  <Text style={styles.podiumPoints}>{entry.totalPoints} pts</Text>
                </View>
                <View style={[styles.podiumBase, { height: heights[index], backgroundColor: colors[index] }]}>
                  <Text style={styles.podiumRank}>#{entry.rank}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Rest of Leaderboard - Show ranks 4-10 */}
        {leaderboard.length > 3 && (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>All Rankings</Text>
            {leaderboard.slice(3, 10).map((entry: any) => {
              const isCurrentUser = entry.userId === user?.id;
              return (
                <View
                  key={entry.userId}
                  style={[styles.listItem, isCurrentUser && styles.listItemHighlight]}
                >
                  <View style={styles.listItemLeft}>
                    <View style={styles.rankCircle}>
                      <Text style={styles.rankCircleText}>#{entry.rank}</Text>
                    </View>
                    <View>
                      <Text style={[styles.listItemName, isCurrentUser && styles.highlightText]}>
                        {entry.name || entry.email || (isCurrentUser ? 'You' : `User ${entry.userId.slice(0, 4)}`)}
                        {isCurrentUser && !entry.name && !entry.email && ''}
                      </Text>
                      <Text style={styles.listItemPoints}>{entry.totalPoints} points</Text>
                    </View>
                  </View>
                  {isCurrentUser && (
                    <Ionicons name="star" size={20} color="#f59e0b" />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {leaderboard.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#64748b" />
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
            <Text style={styles.emptySubtext}>Complete some modules to see your ranking!</Text>
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
  scrollContent: {
    padding: 16,
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  currentUserCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6366f120',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  currentUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentUserPoints: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  rankBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rankBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  podiumTop: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    width: '100%',
  },
  podiumHighlight: {
    backgroundColor: '#6366f120',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listItemHighlight: {
    backgroundColor: '#6366f120',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankCircleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  highlightText: {
    color: '#6366f1',
  },
  listItemPoints: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});
