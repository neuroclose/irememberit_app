import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../src/services/api.service';

export default function TabsLayout() {
  const { user } = useAuthStore();
  
  // Fetch user stats for header
  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? apiService.getUserStats(user.id) : null,
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const totalPoints = userStats?.totalPoints || user?.totalPoints || 0;
  const rank = userStats?.rank || user?.rank || 'N/A';
  const hasOrganization = !!user?.organizationId;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#fff',
        headerRight: () => (
          <View style={styles.headerRight}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="#f59e0b" />
              <Text style={styles.statText}>{totalPoints}</Text>
            </View>
            {hasOrganization && rank && (
              <View style={styles.statItem}>
                <Ionicons name="ribbon" size={16} color="#8b5cf6" />
                <Text style={styles.statText}>#{rank}</Text>
              </View>
            )}
          </View>
        ),
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          href: hasOrganization ? '/(tabs)/leaderboard' : null,
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
