import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../src/services/api.service';
import { useAuthStore } from '../src/store/auth.store';

export default function AnnouncementsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiService.getAnnouncements(),
    enabled: !!user?.organizationId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiService.markAnnouncementRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const handleAnnouncementPress = (announcement: any) => {
    if (!announcement.read) {
      markReadMutation.mutate(announcement.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push('/create-announcement')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : announcements && announcements.length > 0 ? (
          <View style={styles.list}>
            {announcements.map((announcement: any) => (
              <TouchableOpacity
                key={announcement.id}
                style={[
                  styles.announcementCard,
                  !announcement.read && styles.announcementCardUnread,
                ]}
                onPress={() => handleAnnouncementPress(announcement)}
              >
                <View style={styles.announcementHeader}>
                  <View style={styles.announcementTitleRow}>
                    {!announcement.read && <View style={styles.unreadDot} />}
                    <Text
                      style={[
                        styles.announcementTitle,
                        !announcement.read && styles.announcementTitleUnread,
                      ]}
                    >
                      {announcement.title}
                    </Text>
                  </View>
                  <Text style={styles.announcementDate}>
                    {formatDate(announcement.createdAt)}
                  </Text>
                </View>
                <Text style={styles.announcementContent} numberOfLines={3}>
                  {announcement.content}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No announcements yet</Text>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  announcementCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  announcementCardUnread: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  announcementHeader: {
    marginBottom: 8,
  },
  announcementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginRight: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  announcementTitleUnread: {
    fontWeight: '700',
  },
  announcementDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  announcementContent: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
});
