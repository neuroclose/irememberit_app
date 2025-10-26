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
import { StorageService } from '../src/services/storage.service';

export default function EditProfileScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Debug: Log the user data
  React.useEffect(() => {
    console.log('[EditProfile] User from auth store:', user);
    console.log('[EditProfile] All user fields:', JSON.stringify(user, null, 2));
    console.log('[EditProfile] Company:', user?.company);
    console.log('[EditProfile] JobTitle:', user?.jobTitle);
  }, [user]);

  // Since /api/auth/user is broken for JWT, we'll use the user data from auth store
  // which is populated from login response and sync data
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState(user?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');

  // Update form when user data changes
  React.useEffect(() => {
    if (user) {
      console.log('[EditProfile] Updating form fields with user data:', user);
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setCompany(user.company || '');
      setJobTitle(user.jobTitle || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.updateUserProfile(data),
    onSuccess: async () => {
      try {
        console.log('[EditProfile] Profile updated, fetching fresh sync data...');
        
        // Force refetch syncData to get updated user info
        await queryClient.invalidateQueries({ queryKey: ['syncData'] });
        const syncData = await queryClient.fetchQuery({
          queryKey: ['syncData'],
          queryFn: () => apiService.getInitialSync(),
        });
        
        console.log('[EditProfile] Fresh sync data received:', syncData);
        
        // Update auth store with fresh user data from sync
        if (syncData?.user) {
          const { setUser } = useAuthStore.getState();
          console.log('[EditProfile] Setting complete user data from sync:', syncData.user);
          setUser(syncData.user);
          await StorageService.saveUser(syncData.user);
          console.log('[EditProfile] Auth store and storage updated with complete user data');
        }
        
        Alert.alert('Success', 'Profile updated successfully!');
        router.back();
      } catch (error) {
        console.error('[EditProfile] Failed to refresh data:', error);
        Alert.alert('Success', 'Profile updated! Please reload the app to see changes.');
        router.back();
      }
    },
    onError: (error: any) => {
      console.error('[EditProfile] Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      firstName,
      lastName,
      email,
      company,
      jobTitle,
    });
  };

  // Show loading only when updating
  if (updateMutation.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Updating profile...</Text>
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="Enter company name"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title</Text>
            <TextInput
              style={styles.input}
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Enter job title"
              placeholderTextColor="#64748b"
            />
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
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
