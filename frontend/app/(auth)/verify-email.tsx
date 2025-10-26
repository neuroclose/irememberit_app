import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../src/services/api.service';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);

  // Auto-poll every 5 seconds to check verification status
  useEffect(() => {
    if (!email || !pollingActive) return;

    const checkVerification = async () => {
      try {
        const response = await apiService.checkEmailVerification(email);
        
        if (response.verified) {
          setPollingActive(false);
          Alert.alert(
            'Email Verified!',
            'Your email has been verified successfully. You can now log in.',
            [
              {
                text: 'Continue to Login',
                onPress: () => router.replace('/(auth)/login'),
              },
            ]
          );
        }
      } catch (error) {
        console.log('Verification check:', error);
        // Continue polling even if there's an error
      }
    };

    // Check immediately
    checkVerification();

    // Then check every 5 seconds
    const interval = setInterval(checkVerification, 5000);

    return () => clearInterval(interval);
  }, [email, pollingActive]);

  const handleResendEmail = async () => {
    if (!email) return;

    setResending(true);
    try {
      await apiService.resendVerification(email);
      Alert.alert('Success', 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to resend verification email. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    setPollingActive(false);
    router.replace('/(auth)/login');
  };

  // Disable automatic polling - user will manually return to login
  useEffect(() => {
    setPollingActive(false);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color="#6366f1" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification email to:
        </Text>
        <Text style={styles.email}>{email}</Text>

        <Text style={styles.instructions}>
          Please click the link in the email to verify your account. Once verified, click "Return to Login" below to continue.
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, resending && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#6366f1" />
              <Text style={styles.secondaryButtonText}>Resend Email</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleBackToLogin}
        >
          <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Return to Login</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Didn't receive the email? Check your spam folder or click "Resend Email"
        </Text>
      </View>
    </View>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    textAlign: 'center',
    marginBottom: 24,
  },
  instructions: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pollingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#6366f1',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 24,
    lineHeight: 18,
  },
});
