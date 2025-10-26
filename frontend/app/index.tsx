import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
