import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../src/services/api.service';
import { useAuthStore } from '../src/store/auth.store';

export default function PreviewCardsScreen() {
  const { title, description, content, cardsJson } = useLocalSearchParams<{
    title: string;
    description: string;
    content: string;
    cardsJson: string;
  }>();
  
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  const cards = useMemo(() => {
    try {
      return JSON.parse(cardsJson as string);
    } catch {
      return [];
    }
  }, [cardsJson]);

  // Assignment states
  const [isPrivate, setIsPrivate] = useState(false);
  const [assignToAll, setAssignToAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  const hasOrganization = !!user?.organizationId;

  // Fetch organization users if admin
  const { data: orgUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['orgUsers', user?.organizationId],
    queryFn: () => apiService.getOrganizationUsers(user?.organizationId || ''),
    enabled: isAdmin && hasOrganization,
  });

  // Create module mutation - using from-text endpoint for server-side card splitting
  const createModuleMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      content: string;
      isPrivate?: boolean;
      autoAssignToNewUsers?: boolean;
    }) => apiService.createModuleFromText(data),
    onSuccess: () => {
      console.log('[PreviewCards] Module created successfully!');
      // Invalidate syncData query to refetch modules
      queryClient.invalidateQueries({ queryKey: ['syncData'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      // Redirect to home immediately
      router.replace('/(tabs)/home');
    },
    onError: (error: any) => {
      console.error('[PreviewCards] Module creation error:', error);
      // Show error in console for now
      alert('Failed to create module: ' + (error.message || 'Unknown error'));
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateModule = () => {
    console.log('[PreviewCards] handleCreateModule called');
    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = () => {
    console.log('[PreviewCards] Creating module...');
    
    // Build module data using the raw content, not the parsed cards
    // The server will handle card splitting via /modules/from-text endpoint
    const moduleData: any = {
      title: title as string,
      description: description as string,
      content: content as string,  // Send raw text instead of cards array
      isPrivate,
    };

    // Add assignment logic based on user type
    if (isAdmin && hasOrganization) {
      if (assignToAll) {
        moduleData.autoAssignToNewUsers = true;
        // For from-text endpoint, we'll need to assign after creation
        // or check if it supports assignedTo array
      } else if (selectedUserIds.length > 0) {
        // moduleData.assignedTo = selectedUserIds;
        // For now, we'll create and assign separately if needed
      }
    }

    console.log('[PreviewCards] Final moduleData:', moduleData);
    setShowConfirmDialog(false);
    createModuleMutation.mutate(moduleData);
  };

  const getAssignmentMessage = () => {
    if (isAdmin && hasOrganization) {
      if (assignToAll) return ' and assign to all users (current and future)';
      if (selectedUserIds.length > 0) return ` and assign to ${selectedUserIds.length} selected user(s)`;
      return ' (unassigned)';
    }
    if (hasOrganization && !isPrivate) return ' (organization module - unassigned)';
    return ' (private module)';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview Cards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleTitle}>{title}</Text>
          {description && <Text style={styles.moduleDescription}>{description}</Text>}
          <Text style={styles.cardCount}>
            {cards.length} card{cards.length !== 1 ? 's' : ''} will be created
          </Text>
        </View>

        {/* Assignment Options */}
        {(hasOrganization || !isAdmin) && (
          <View style={styles.assignmentSection}>
            <Text style={styles.sectionTitle}>Assignment Options</Text>

            {/* Privacy Toggle (for learners with org or standalone learners) */}
            {(!isAdmin || !hasOrganization) && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <View style={styles.optionContent}>
                  <Ionicons
                    name={isPrivate ? 'lock-closed' : 'people'}
                    size={20}
                    color={isPrivate ? '#f59e0b' : '#6366f1'}
                  />
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>
                      {isPrivate ? 'Private Module' : 'Organization Module'}
                    </Text>
                    <Text style={styles.optionHint}>
                      {isPrivate
                        ? 'Only you can see this module'
                        : 'Available to your organization'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isPrivate ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isPrivate ? '#10b981' : '#64748b'}
                />
              </TouchableOpacity>
            )}

            {/* Admin Assignment Options */}
            {isAdmin && hasOrganization && (
              <>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setAssignToAll(!assignToAll)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="globe"
                      size={20}
                      color={assignToAll ? '#10b981' : '#6366f1'}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>Assign to All Users</Text>
                      <Text style={styles.optionHint}>
                        All current and future users in organization
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={assignToAll ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={assignToAll ? '#10b981' : '#64748b'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setShowUserPicker(true)}
                  disabled={assignToAll}
                >
                  <View style={[styles.optionContent, assignToAll && styles.optionDisabled]}>
                    <Ionicons
                      name="people-circle"
                      size={20}
                      color={selectedUserIds.length > 0 ? '#10b981' : '#6366f1'}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>Assign to Specific Users</Text>
                      <Text style={styles.optionHint}>
                        {selectedUserIds.length > 0
                          ? `${selectedUserIds.length} user(s) selected`
                          : 'Tap to select users'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#64748b" />
                </TouchableOpacity>

                {selectedUserIds.length === 0 && !assignToAll && (
                  <View style={styles.unassignedNotice}>
                    <Ionicons name="information-circle" size={16} color="#f59e0b" />
                    <Text style={styles.unassignedText}>
                      Module will be created as unassigned
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.cardsContainer}>
          {cards.map((card: any, index: number) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardNumber}>Card {index + 1}</Text>
                <Text style={styles.wordCount}>
                  {card.words?.length || 0} words
                </Text>
              </View>
              <Text style={styles.cardContent}>{card.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmTitle}>Create Module?</Text>
            <Text style={styles.confirmMessage}>
              This will create a module with {cards.length} cards{getAssignmentMessage()}.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCreateButton]}
                onPress={handleConfirmCreate}
                disabled={createModuleMutation.isPending}
              >
                {createModuleMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Picker Modal */}
      <Modal
        visible={showUserPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Users</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#6366f1" />
              </View>
            ) : (
              <FlatList
                data={orgUsers?.users || []}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleToggleUser(item.id)}
                  >
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <Ionicons
                      name={
                        selectedUserIds.includes(item.id)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={24}
                      color={selectedUserIds.includes(item.id) ? '#10b981' : '#64748b'}
                    />
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowUserPicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, createModuleMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreateModule}
          disabled={createModuleMutation.isPending}
        >
          {createModuleMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Module</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 44,
    height: 44,
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
  moduleInfo: {
    padding: 16,
    backgroundColor: '#1e293b',
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  cardsContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  wordCount: {
    fontSize: 12,
    color: '#64748b',
  },
  cardContent: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  assignmentSection: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  optionHint: {
    fontSize: 13,
    color: '#64748b',
  },
  unassignedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    marginTop: 12,
  },
  unassignedText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  doneButton: {
    backgroundColor: '#6366f1',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  confirmCreateButton: {
    backgroundColor: '#6366f1',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
