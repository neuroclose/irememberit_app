import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_CONFIG } from '../config/api.config';
import { StorageService } from './storage.service';
import { useAuthStore } from '../store/auth.store';

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.api = axios.create(API_CONFIG);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Don't try to refresh token for auth endpoints (login, signup, etc.)
        const authEndpoints = ['/mobile/auth/login', '/mobile/auth/signup', '/auth/login', '/auth/signup'];
        const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));

        // If error is 401 and we haven't tried to refresh yet, and it's NOT an auth endpoint
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await StorageService.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(
              `${API_CONFIG.baseURL}/mobile/auth/refresh`,
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await StorageService.saveAccessToken(accessToken);
            await StorageService.saveRefreshToken(newRefreshToken);

            // Process queued requests
            this.failedQueue.forEach((prom) => prom.resolve(accessToken));
            this.failedQueue = [];

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            await StorageService.clearAll();
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string,
    company?: string,
    jobTitle?: string,
    accountType?: string
  ) {
    const payload: any = {
      email,
      password,
      firstName,
      lastName,
      accountType: accountType || 'personal', // Default to personal if not provided
    };
    
    // Add company and jobTitle if provided (for team accounts)
    if (company) payload.company = company;
    if (jobTitle) payload.jobTitle = jobTitle;
    
    const response = await this.api.post('/mobile/auth/signup', payload);
    return response.data;
  }

  async login(email: string, password?: string) {
    const payload = password ? { email, password } : { email };
    const response = await this.api.post('/mobile/auth/login', payload);
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.api.post('/mobile/auth/refresh', { refreshToken });
    return response.data;
  }

  async checkEmailVerification(email: string) {
    const response = await this.api.post('/auth/check-verification', { email });
    return response.data;
  }

  async resendVerification(email: string) {
    const response = await this.api.post('/auth/resend-verification', { email });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }

  // Subscription endpoints
  async getCurrentSubscription() {
    const response = await this.api.get('/subscription/current');
    return response.data;
  }

  async createCheckoutSession(tier: string, userCount?: number) {
    const response = await this.api.post('/subscription/create-checkout', { tier, userCount });
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.api.post('/subscription/cancel');
    return response.data;
  }

  async getBillingInvoices() {
    const response = await this.api.get('/subscription/invoices');
    return response.data;
  }

  async updateUserSeats(userCount: number) {
    const response = await this.api.post('/subscription/user-seats', { userCount });
    return response.data;
  }

  async validatePromoCode(code: string) {
    const response = await this.api.post('/subscription/validate-promo', { code });
    return response.data;
  }

  async applyPromoCode(code: string) {
    const response = await this.api.post('/subscription/apply-promo', { code });
    return response.data;
  }

  // Mobile sync endpoint (recommended for mobile apps)
  async getInitialSync() {
    const response = await this.api.get('/mobile/sync/initial');
    console.log('[API] Sync data received:', response.data);
    console.log('[API] Sync user data:', response.data?.user);
    console.log('[API] Sync organization data:', response.data?.organization);
    console.log('[API] User has company?', response.data?.user?.company);
    console.log('[API] User has jobTitle?', response.data?.user?.jobTitle);
    
    // For organization users, prioritize organization tier over user tier
    if (response.data?.user && response.data?.organization) {
      console.log('[API] Organization user detected - using org tier');
      console.log('[API] User tier:', response.data.user.tier);
      console.log('[API] Organization tier:', response.data.organization.tier);
      console.log('[API] Organization subscriptionStatus:', response.data.organization.subscriptionStatus);
      
      // Update user object with organization tier
      response.data.user = {
        ...response.data.user,
        tier: response.data.organization.tier || response.data.user.tier,
        subscriptionStatus: response.data.organization.subscriptionStatus || response.data.user.subscriptionStatus
      };
      console.log('[API] Updated user tier to:', response.data.user.tier);
      console.log('[API] Updated user subscriptionStatus to:', response.data.user.subscriptionStatus);
    } else {
      console.log('[API] Standalone user - using user tier');
    }
    
    return response.data;
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.api.get('/auth/user');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.api.patch('/auth/profile', data);
    return response.data;
  }

  async getWeeklyPoints() {
    const response = await this.api.get('/auth/weekly-points');
    return response.data;
  }

  // Module endpoints
  async getModules() {
    try {
      // Try mobile sync first (includes all data)
      const syncData = await this.getInitialSync();
      return syncData.modules || [];
    } catch (error) {
      console.error('Sync failed, trying regular modules endpoint:', error);
      // Fallback to regular endpoint
      const response = await this.api.get('/modules');
      return response.data;
    }
  }

  async getModuleById(moduleId: string) {
    const response = await this.api.get(`/modules/${moduleId}`);
    return response.data;
  }

  async getCardById(cardId: string) {
    console.log('[API] Fetching card by ID:', cardId);
    const response = await this.api.get(`/proxy/cards/${cardId}`);
    console.log('[API] Card response:', response.data);
    return response.data;
  }

  // Module creation methods
  async extractTextFromFile(file: any) {
    const formData = new FormData();
    
    // Handle blob URI on web (React Native Web)
    if (file.uri && file.uri.startsWith('blob:')) {
      // Fetch the blob and convert to File object
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileObject = new File([blob], file.name, { type: file.type });
      formData.append('file', fileObject);
    } else {
      // Native file handling
      formData.append('file', file);
    }
    
    const apiResponse = await this.api.post('/extract-text', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return apiResponse.data;
  }

  async parseCards(content: string) {
    const response = await this.api.post('/parse-cards', { content });
    return response.data;
  }

  async createModuleFromText(data: {
    title: string;
    description?: string;
    content: string;
    autoAssignToNewUsers?: boolean;
  }) {
    const response = await this.api.post('/modules/from-text', data);
    return response.data;
  }

  async createModule(data: {
    title: string;
    description?: string;
    cards: Array<{ content: string; words?: string[] }>;
    isPrivate?: boolean;
    assignedTo?: string[];  // Array of user IDs
    autoAssignToNewUsers?: boolean;  // For admin: assign to all future users
  }) {
    const response = await this.api.post('/modules/create', data);
    return response.data;
  }

  async getOrganizationUsers(organizationId: string) {
    const response = await this.api.get(`/organizations/${organizationId}/users`);
    return response.data;
  }

  async getModuleStats(moduleId: string) {
    const response = await this.api.get(`/modules/${moduleId}/stats`);
    return response.data;
  }

  // User Profile endpoints
  async getUserProfile() {
    const response = await this.api.get('/auth/user');
    return response.data;
  }

  async updateUserProfile(data: any) {
    const response = await this.api.patch('/auth/profile', data);
    return response.data;
  }

  // Organization endpoints
  async getOrganization() {
    const response = await this.api.get('/organization');
    return response.data;
  }

  async updateOrganization(data: any) {
    const response = await this.api.patch('/organization/name', data);
    return response.data;
  }

  // Announcements endpoints
  async getAnnouncements() {
    const response = await this.api.get('/announcements');
    return response.data;
  }

  async createAnnouncement(data: any) {
    const response = await this.api.post('/announcements', data);
    return response.data;
  }

  async markAnnouncementRead(announcementId: string) {
    const response = await this.api.post(`/proxy/announcements/${announcementId}/mark-read`);
    return response.data;
  }

  // Push Notifications endpoints
  async registerPushToken(token: string) {
    const response = await this.api.post('/push-tokens', { token });
    return response.data;
  }

  async deletePushToken(token: string) {
    const response = await this.api.delete(`/push-tokens/${token}`);
    return response.data;
  }

  // Session endpoints
  async startSession(moduleId: string, learningType: string, stage: number) {
    const response = await this.api.post('/sessions/start', {
      moduleId,
      learningType,
      stage,
    });
    return response.data;
  }

  async checkAnswer(moduleId: string, answerData: any) {
    const response = await this.api.post('/sessions/check', answerData);
    return response.data;
  }

  async completeStage(sessionId: string, cardId: string, learningType: string, stage: number) {
    const response = await this.api.post('/sessions/complete-stage', {
      sessionId,
      cardId,
      learningType,
      stage,
    });
    return response.data;
  }

  async recordProgress(cardId: string, learningType: string, stage: number, passed: boolean, accuracy: number) {
    const response = await this.api.post('/progress/card', {
      cardId,
      learningType,
      stage,
      passed,
      accuracy,
    });
    return response.data;
  }

  // Gamification endpoints
  async getBadges() {
    const response = await this.api.get('/badges');
    return response.data;
  }

  // Push notifications
  async registerPushToken(token: string) {
    const response = await this.api.post('/push-tokens', { token });
    return response.data;
  }

  // Progress Tracking (direct to our backend, not proxied)
  async saveProgress(progressData: {
    userId: string;
    moduleId: string;
    cardId: string;
    stage: number;
    learningType: string;
    pointsEarned: number;
    timeSpent: number;
    accuracy: number;
    completedAt: string;
    pointsBreakdown: any;
  }): Promise<any> {
    // Call OUR backend directly at /api/progress (backend port 8001)
    // This is NOT proxied to external API
    const token = await StorageService.getAccessToken();
    
    // Get backend URL - for both web and native, we need to hit our backend
    const backendURL = Platform.OS === 'web' 
      ? '/api/progress/save'  // Web: relative URL goes to our ingress -> backend
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/progress/save`; // Native: use EXPO_PUBLIC_BACKEND_URL
    
    const response = await axios.post(
      backendURL,
      progressData,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  }

  async getProgress(userId: string, moduleId: string): Promise<any> {
    const token = await StorageService.getAccessToken();
    
    const backendURL = Platform.OS === 'web'
      ? `/api/progress/${userId}/${moduleId}`
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/progress/${userId}/${moduleId}`;
    
    const response = await axios.get(
      backendURL,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  }

  async getAllProgress(userId: string): Promise<any> {
    const token = await StorageService.getAccessToken();
    
    const backendURL = Platform.OS === 'web'
      ? `/api/progress/${userId}/all`
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/progress/${userId}/all`;
    
    const response = await axios.get(
      backendURL,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  }

  async getUserStats(userId: string): Promise<any> {
    const token = await StorageService.getAccessToken();
    
    const backendURL = Platform.OS === 'web'
      ? `/api/progress/${userId}/stats`
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/progress/${userId}/stats`;
    
    const response = await axios.get(
      backendURL,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  }

  async getStreak() {
    const response = await this.api.get('/streak');
    return response.data;
  }

  async getLeaderboard(timeframe: string = 'alltime'): Promise<any> {
    const token = await StorageService.getAccessToken();
    
    const backendURL = Platform.OS === 'web'
      ? `/api/proxy/mobile/leaderboard?timeframe=${timeframe}`
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/proxy/mobile/leaderboard?timeframe=${timeframe}`;
    
    console.log('[API] Fetching leaderboard from:', backendURL);
    console.log('[API] Token present:', !!token);
    
    const response = await axios.get(backendURL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    console.log('[API] Leaderboard response:', response.data);
    return response.data;
  }

  async syncAllProgressToWeb(userId: string): Promise<any> {
    const token = await StorageService.getAccessToken();
    
    const backendURL = Platform.OS === 'web'
      ? `/api/progress/${userId}/sync-all`
      : `${Constants.expoConfig?.extra?.backendUrl || ''}/api/progress/${userId}/sync-all`;
    
    const response = await axios.post(
      backendURL,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return response.data;
  }
}

export const apiService = new ApiService();
