import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TOKEN_CONFIG } from '../config/api.config';

// Check if we're on web platform
const isWeb = Platform.OS === 'web';

export const StorageService = {
  // Secure token storage (uses AsyncStorage on web, SecureStore on native)
  async saveAccessToken(token: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(TOKEN_CONFIG.accessTokenKey, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_CONFIG.accessTokenKey, token);
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (isWeb) {
      return await AsyncStorage.getItem(TOKEN_CONFIG.accessTokenKey);
    } else {
      return await SecureStore.getItemAsync(TOKEN_CONFIG.accessTokenKey);
    }
  },

  async saveRefreshToken(token: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(TOKEN_CONFIG.refreshTokenKey, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_CONFIG.refreshTokenKey, token);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (isWeb) {
      return await AsyncStorage.getItem(TOKEN_CONFIG.refreshTokenKey);
    } else {
      return await SecureStore.getItemAsync(TOKEN_CONFIG.refreshTokenKey);
    }
  },

  async clearTokens(): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(TOKEN_CONFIG.accessTokenKey);
      await AsyncStorage.removeItem(TOKEN_CONFIG.refreshTokenKey);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_CONFIG.accessTokenKey);
      await SecureStore.deleteItemAsync(TOKEN_CONFIG.refreshTokenKey);
    }
  },

  // User data storage
  async saveUser(user: any): Promise<void> {
    await AsyncStorage.setItem(TOKEN_CONFIG.userKey, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem(TOKEN_CONFIG.userKey);
    return user ? JSON.parse(user) : null;
  },

  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_CONFIG.userKey);
  },

  async clearAll(): Promise<void> {
    await this.clearTokens();
    await this.clearUser();
  },
};
