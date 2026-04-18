import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'milhasextras_access_token',
  REFRESH_TOKEN: 'milhasextras_refresh_token',
};

// IMPORTANT: For production builds, set EXPO_PUBLIC_API_URL in your environment
// to point to the production API (e.g., https://api.milhasextras.com.br/api/v1).
//
// Resolução do dev URL (só aplica se EXPO_PUBLIC_API_URL não estiver setado):
// - Android emulator → 10.0.2.2 (alias do host)
// - iOS simulator / web → localhost
// - Celular físico → precisa setar EXPO_PUBLIC_API_URL=http://<IP_DA_MAQUINA>:3001/api/v1
function resolveDevBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001/api/v1';
  return 'http://localhost:3001/api/v1';
}

const api = axios.create({
  baseURL: resolveDevBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(`[api] baseURL=${api.defaults.baseURL} platform=${Platform.OS}`);
}

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      let token: string | null = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
      } else {
        token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      }
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Storage unavailable, ignore
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: unwrap { success, data } wrapper and handle 401
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
        } else {
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
        }
      } catch {
        // ignore
      }
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  },
);

export default api;
