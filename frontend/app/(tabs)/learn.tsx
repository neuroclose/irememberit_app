import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';
import { Module } from '../../src/types';

export default function LearnScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: syncData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['syncData'],
    queryFn: () => apiService.getInitialSync(),
  });

  const modules = syncData?.modules || [];

  const filteredModules = modules.filter((module: Module) =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModuleItem = ({ item }: { item: Module }) => (
    <TouchableOpacity
      style={styles.moduleCard}
      onPress={() => router.push(`/module/${item.id}`)}
    >
      <View style={styles.moduleContent}>
        <View style={styles.moduleIconContainer}>
          <Ionicons name="book" size={32} color="#6366f1" />
        </View>
        <View style={styles.moduleDetails}>
          <Text style={styles.moduleTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.moduleDescription} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>
          <View style={styles.moduleStats}>
            <View style={styles.statItem}>
              <Ionicons name="layers" size={14} color="#94a3b8" />
              <Text style={styles.statText}>{item.cards?.length || 0} cards</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flag" size={14} color="#94a3b8" />
              <Text style={styles.statText}>{item.totalStages || 9} stages</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#64748b" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learn</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search modules..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredModules}
          renderItem={renderModuleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#475569" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No modules found' : 'No modules yet'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start learning by creating or getting assigned modules'}
              </Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  moduleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  moduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleDetails: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  moduleStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 80,
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
});
