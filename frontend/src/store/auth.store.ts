import { create } from 'zustand';
import { StorageService } from '../services/storage.service';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  role: string;
  organizationId?: string;
  tier: string;
  totalPoints: number;
  rank?: string;
  profileImageUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  updateUser: async (updates) => {
    const currentUser = useAuthStore.getState().user;
    console.log('[AuthStore] updateUser called');
    console.log('[AuthStore] Current user:', currentUser);
    console.log('[AuthStore] Updates:', updates);
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      console.log('[AuthStore] Updated user:', updatedUser);
      await StorageService.saveUser(updatedUser);
      set({ user: updatedUser });
      console.log('[AuthStore] User updated in store and storage');
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    await StorageService.clearAll();
    set({ user: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await StorageService.getUser();
      const accessToken = await StorageService.getAccessToken();
      
      if (user && accessToken) {
        set({ user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
