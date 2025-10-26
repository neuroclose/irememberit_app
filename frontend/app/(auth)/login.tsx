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
} from 'react-native';
import { router } from 'expo-router';
import { apiService } from '../../src/services/api.service';
import { StorageService } from '../../src/services/storage.service';
import { useAuthStore } from '../../src/store/auth.store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    console.log('Login attempt with email:', email);
    try {
      console.log('Calling API login...');
      const response = await apiService.login(email.toLowerCase().trim(), password);
      console.log('Login successful, got response:', response);
      
      // Save tokens
      await StorageService.saveAccessToken(response.accessToken);
      await StorageService.saveRefreshToken(response.refreshToken);
      
      // Save initial user from login response
      await StorageService.saveUser(response.user);
      setUser(response.user);
      
      console.log('Tokens and user saved, fetching complete profile from sync...');
      
      // Fetch complete user data from sync endpoint
      try {
        const syncData = await apiService.getInitialSync();
        if (syncData?.user) {
          console.log('Complete user data from sync:', syncData.user);
          await StorageService.saveUser(syncData.user);
          setUser(syncData.user);
          console.log('Complete user profile saved with company and jobTitle');
        }
      } catch (syncError) {
        console.error('Failed to fetch sync data after login:', syncError);
        // Continue anyway with basic user data
      }
      
      console.log('Navigating to home...');
      // Navigate to home
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Get error message from various possible locations
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          '';
      
      const errorLower = errorMessage.toLowerCase();
      
      // Check if error is due to email not verified
      if (errorLower.includes('verify') || 
          errorLower.includes('verification') || 
          errorLower.includes('not verified') ||
          errorLower.includes('unverified') ||
          error.response?.status === 403) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in. Check your inbox for the verification link.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Verification',
              onPress: () => {
                router.push({
                  pathname: '/(auth)/verify-email',
                  params: { email: email.toLowerCase().trim() },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Login Failed',
          errorMessage || 'Unable to login. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>iRememberIT</Text>
          <Text style={styles.subtitle}>Learn smarter, not harder</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={loading}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/signup')}
            disabled={loading}
            style={styles.signupLink}
          >
            <Text style={styles.signupLinkText}>
              Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
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
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
  forgotLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  signupLinkBold: {
    color: '#6366f1',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
  },
});
