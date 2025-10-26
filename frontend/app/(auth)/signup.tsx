import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../src/services/api.service';

export default function SignupScreen() {
  const [accountType, setAccountType] = useState<'personal' | 'team'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    // Validate team fields
    if (accountType === 'team') {
      if (!company.trim()) {
        Alert.alert('Error', 'Please enter your company name');
        return false;
      }
      if (!jobTitle.trim()) {
        Alert.alert('Error', 'Please enter your job title');
        return false;
      }
    }
    return true;
  };

  const handleSignup = async () => {
    console.log('=== SIGNUP ATTEMPT ===');
    console.log('Account Type:', accountType);
    console.log('Form data:', { firstName, lastName, email, company, jobTitle });
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Validation passed, starting signup...');
    setLoading(true);
    setErrorMessage(''); // Clear any previous errors
    try {
      console.log('Calling API signup...');
      await apiService.signup(
        email.toLowerCase().trim(),
        password,
        firstName.trim(),
        lastName.trim(),
        accountType === 'team' ? company.trim() : undefined,
        accountType === 'team' ? jobTitle.trim() : undefined,
        accountType
      );
      
      console.log('Signup successful, navigating to verify-email...');
      // Navigate to email verification screen
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: email.toLowerCase().trim() },
      });
    } catch (error: any) {
      console.error('=== SIGNUP ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract error message
      let errorMsg = '';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      } else {
        errorMsg = 'Unable to create account. Please try again.';
      }
      
      console.log('Final error message to display:', errorMsg);
      
      // Set error message for on-screen display
      setErrorMessage(errorMsg);
      
      // Also show Alert
      Alert.alert('Signup Failed', errorMsg);
    } finally {
      setLoading(false);
      console.log('=== SIGNUP COMPLETE ===');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join iRememberIT today</Text>
        </View>

        <View style={styles.form}>
          {/* Account Type Selection */}
          <Text style={styles.sectionTitle}>Account Type</Text>
          <View style={styles.accountTypeContainer}>
            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'personal' && styles.accountTypeButtonActive,
              ]}
              onPress={() => setAccountType('personal')}
              disabled={loading}
            >
              <Ionicons 
                name="person" 
                size={24} 
                color={accountType === 'personal' ? '#fff' : '#94a3b8'} 
              />
              <Text
                style={[
                  styles.accountTypeText,
                  accountType === 'personal' && styles.accountTypeTextActive,
                ]}
              >
                Personal
              </Text>
              <Text
                style={[
                  styles.accountTypeSubtext,
                  accountType === 'personal' && styles.accountTypeSubtextActive,
                ]}
              >
                Standalone Learner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'team' && styles.accountTypeButtonActive,
              ]}
              onPress={() => setAccountType('team')}
              disabled={loading}
            >
              <Ionicons 
                name="people" 
                size={24} 
                color={accountType === 'team' ? '#fff' : '#94a3b8'} 
              />
              <Text
                style={[
                  styles.accountTypeText,
                  accountType === 'team' && styles.accountTypeTextActive,
                ]}
              >
                Teams/Enterprise
              </Text>
              <Text
                style={[
                  styles.accountTypeSubtext,
                  accountType === 'team' && styles.accountTypeSubtextActive,
                ]}
              >
                Organization Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor="#64748b"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor="#64748b"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            editable={!loading}
          />

          {/* Conditional Team Fields */}
          {accountType === 'team' && (
            <>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your company name"
                placeholderTextColor="#64748b"
                value={company}
                onChangeText={setCompany}
                autoCapitalize="words"
                editable={!loading}
              />

              <Text style={styles.label}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your job title"
                placeholderTextColor="#64748b"
                value={jobTitle}
                onChangeText={setJobTitle}
                autoCapitalize="words"
                editable={!loading}
              />
            </>
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor="#64748b"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.back()}
            disabled={loading}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  form: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  accountTypeButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  accountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 8,
  },
  accountTypeTextActive: {
    color: '#fff',
  },
  accountTypeSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  accountTypeSubtextActive: {
    color: '#cbd5e1',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  loginLinkBold: {
    color: '#6366f1',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});
