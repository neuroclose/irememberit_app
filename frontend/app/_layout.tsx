import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryProvider } from '../src/contexts/QueryProvider';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useAuthStore } from '../src/store/auth.store';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function RootLayout() {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </QueryProvider>
  );
}
