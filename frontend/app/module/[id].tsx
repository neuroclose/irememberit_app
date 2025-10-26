import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';
import { useAuthStore } from '../../src/store/auth.store';
import { Card } from '../../src/types';

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { user } = useAuthStore();

  // Get module from sync data first, fall back to individual fetch
  const { data: syncData } = useQuery({
    queryKey: ['syncData'],
    queryFn: () => apiService.getInitialSync(),
  });

  const moduleFromSync = syncData?.modules?.find((m: any) => m.id === id);

  const { data: moduleFetched, isLoading: isFetchingModule } = useQuery({
    queryKey: ['module', id],
    queryFn: () => apiService.getModuleById(id as string),
    enabled: !moduleFromSync, // Only fetch if not in sync data
  });

  const module = moduleFromSync || moduleFetched;
  const isLoading = !moduleFromSync && isFetchingModule;

  const { data: stats } = useQuery({
    queryKey: ['moduleStats', id],
    queryFn: () => apiService.getModuleStats(id as string),
  });

  // Fetch user stats for header
  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? apiService.getUserStats(user.id) : null,
    enabled: !!user?.id,
  });

  const totalPoints = userStats?.totalPoints || user?.totalPoints || 0;
  const rank = userStats?.rank || user?.rank || 'N/A';
  const hasOrganization = !!user?.organizationId;

  console.log('Module Detail - ID:', id);
  console.log('Module Detail - Module data:', module);
  console.log('Module Detail - Cards:', module?.cards);

  const startLearning = (card: Card) => {
    router.push({
      pathname: '/session/learning-modes',
      params: { 
        cardId: card.id, 
        moduleId: id as string,
        moduleDataJson: JSON.stringify(module), // Pass the full module data including cards
      },
    });
  };

  const renderCard = (card: Card, index: number) => (
    <TouchableOpacity
      key={card.id}
      style={styles.card}
      onPress={() => startLearning(card)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardText} numberOfLines={3}>
            {card.content}
          </Text>
          {card.words && card.words.length > 0 && (
            <View style={styles.wordsContainer}>
              {card.words.slice(0, 3).map((word, idx) => (
                <View key={idx} style={styles.wordChip}>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
              {card.words.length > 3 && (
                <Text style={styles.moreWords}>+{card.words.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </View>
      <Ionicons name="play-circle" size={32} color="#6366f1" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#fff',
            headerTitle: 'Loading...',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitle: module?.title || 'Module',
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.headerStatItem}>
                <Ionicons name="trophy" size={16} color="#f59e0b" />
                <Text style={styles.headerStatText}>{totalPoints}</Text>
              </View>
              {hasOrganization && rank && (
                <View style={styles.headerStatItem}>
                  <Ionicons name="ribbon" size={16} color="#8b5cf6" />
                  <Text style={styles.headerStatText}>#{rank}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
        {/* Module Header */}
        <View style={styles.moduleHeader}>
          <View style={styles.moduleIconLarge}>
            <Ionicons name="book" size={48} color="#6366f1" />
          </View>
          <Text style={styles.moduleTitle}>{module?.title}</Text>
          <Text style={styles.moduleDescription}>{module?.description}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="layers" size={20} color="#94a3b8" />
            <Text style={styles.statText}>{module?.cards?.length || 0} Cards</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flag" size={20} color="#94a3b8" />
            <Text style={styles.statText}>{module?.totalStages || 9} Stages</Text>
          </View>
          {stats?.accuracy && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.statText}>{Math.round(stats.accuracy)}% Acc</Text>
            </View>
          )}
        </View>

        {/* Cards List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cards</Text>
          {module?.cards && module.cards.length > 0 ? (
            <View style={styles.cardsList}>
              {module.cards.map((card, index) => renderCard(card, index))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#475569" />
              <Text style={styles.emptyStateText}>No cards yet</Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  moduleIconLarge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  cardsList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  cardNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  cardContent: {
    flex: 1,
  },
  cardText: {
    fontSize: 15,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  wordChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wordText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  moreWords: {
    fontSize: 12,
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 16,
  },
  headerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
});
