import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use local proxy for web to bypass CORS, direct API for native
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    // Use local backend proxy for web browsers
    return '/api/proxy';
  } else {
    // Use direct API for native iOS/Android
    return 'https://irememberit.replit.app/api';
  }
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export const TOKEN_CONFIG = {
  accessTokenKey: 'irememberit_access_token',
  refreshTokenKey: 'irememberit_refresh_token',
  userKey: 'irememberit_user',
};
