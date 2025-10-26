import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../src/services/api.service';
import { Badge } from '../src/types';

export default function BadgesScreen() {
  const { data: syncData, isLoading } = useQuery({
    queryKey: ['syncData'],
    queryFn: () => apiService.getInitialSync(),
  });

  const badges = syncData?.badges || [];

  const renderBadgeItem = ({ item }: { item: any }) => {
    const earned = item.userBadge?.earned || false;
    const progress = item.userBadge?.progress || 0;
    const earnedAt = item.userBadge?.earnedAt;

    return (
    <View style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
      <View style={[styles.badgeIconContainer, { backgroundColor: item.color + '30' }]}>
        <Text style={styles.badgeIcon}>{item.icon}</Text>
        {earned && (
          <View style={styles.earnedBadge}>
            <Text style={styles.earnedBadgeText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.badgeInfo}>
        <View style={styles.badgeHeader}>
          <Text style={styles.badgeName}>{item.name}</Text>
          <View style={[styles.tierBadge, { backgroundColor: getTierColor(item.tier) }]}>
            <Text style={styles.tierText}>{item.tier.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.badgeDescription}>{item.description}</Text>
        {!earned && progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
        {earned && earnedAt && (
          <Text style={styles.earnedDate}>
            Earned {new Date(earnedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return '#cd7f32';
      case 'silver':
        return '#c0c0c0';
      case 'gold':
        return '#ffd700';
      case 'platinum':
        return '#e5e4e2';
      default:
        return '#6366f1';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitle: 'Badges',
        }}
      />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={badges}
          renderItem={renderBadgeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No badges available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  badgeIcon: {
    fontSize: 36,
  },
  earnedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#10b981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    width: 40,
  },
  earnedDate: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});
