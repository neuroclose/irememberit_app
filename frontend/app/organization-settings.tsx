import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../src/services/api.service';
import { useAuthStore } from '../src/store/auth.store';

export default function OrganizationSettingsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => apiService.getOrganization(),
    enabled: !!user?.organizationId,
  });

  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');

  React.useEffect(() => {
    if (orgData) {
      setName(orgData.name || '');
      setPrimaryColor(orgData.primaryColor || '#6366f1');
      setAccentColor(orgData.accentColor || '#f59e0b');
    }
  }, [orgData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.updateOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      Alert.alert('Success', 'Organization settings updated successfully!');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update organization settings');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name,
      // Don't send theme colors - they're view-only on mobile
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter organization name"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme Colors (View Only)</Text>
            <Text style={styles.sectionSubtitle}>
              Theme colors are managed on the web version and applied to the mobile app.
              Changes made here will not affect the web version.
            </Text>

            <View style={styles.colorRow}>
              <View style={styles.colorItem}>
                <Text style={styles.colorLabel}>Primary Color</Text>
                <View style={styles.colorPreview}>
                  <View style={[styles.colorBox, { backgroundColor: primaryColor }]} />
                  <Text style={styles.colorValue}>{primaryColor}</Text>
                </View>
              </View>

              <View style={styles.colorItem}>
                <Text style={styles.colorLabel}>Accent Color</Text>
                <View style={styles.colorPreview}>
                  <View style={[styles.colorBox, { backgroundColor: accentColor }]} />
                  <Text style={styles.colorValue}>{accentColor}</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              updateMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 16,
  },
  colorItem: {
    flex: 1,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  colorPreview: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 8,
  },
  colorBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  colorValue: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
