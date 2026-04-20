import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api, { SECURE_STORE_KEYS } from '../lib/api';
import { identify, track, reset as resetAnalytics } from '../lib/analytics';
import type {
  User,
  AuthResponse,
  LoginPayload,
  SocialLoginPayload,
} from '../types';

// Web-safe storage helpers (SecureStore doesn't work on web)
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginSocial: (
    provider: 'google' | 'apple',
    token: string,
    name: string,
    email: string,
  ) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  loadTokens: () => Promise<void>;
}

const saveTokens = async (accessToken: string, refreshToken: string) => {
  await storage.set(SECURE_STORE_KEYS.ACCESS_TOKEN, accessToken);
  await storage.set(SECURE_STORE_KEYS.REFRESH_TOKEN, refreshToken);
};

const clearTokens = async () => {
  await storage.remove(SECURE_STORE_KEYS.ACCESS_TOKEN);
  await storage.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const payload: LoginPayload = { email, password };
      const { data } = await api.post<AuthResponse>('/auth/login', payload);
      await saveTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      identify(data.user.id, { email: data.user.email, plan: (data.user as any).plan });
      track('auth_login', { method: 'email' });
      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginSocial: async (
    provider: 'google' | 'apple',
    token: string,
    name: string,
    email: string,
  ) => {
    set({ isLoading: true });
    try {
      const payload: SocialLoginPayload = { provider, token, name, email };
      const { data } = await api.post<AuthResponse>('/auth/social', payload);
      await saveTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      identify(data.user.id, { email: data.user.email, provider });
      track('auth_login', { method: 'social', provider });
      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
      });
      await saveTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      identify(data.user.id, { email: data.user.email });
      track('auth_register', { method: 'email' });
      // Novo usuário vai direto pro quiz de onboarding — maximiza conversão
      // (carteira cadastrada = valor aparece na home, arbitragem personalizada)
      router.replace('/welcome-quiz' as any);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    clearTokens().catch(() => {});
    track('auth_logout');
    resetAnalytics();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    router.replace('/(auth)/login');
  },

  setUser: (user: User) => set({ user }),

  loadTokens: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await storage.get(SECURE_STORE_KEYS.ACCESS_TOKEN);
      const refreshToken = await storage.get(SECURE_STORE_KEYS.REFRESH_TOKEN);

      if (accessToken) {
        // Fetch current user
        const { data } = await api.get<User>('/auth/me');
        set({
          user: data,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await clearTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
