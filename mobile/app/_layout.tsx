import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/lib/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { initSentry } from '../src/lib/sentry';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { initAnalytics } from '../src/lib/analytics';

// Arma push notifications (permissão + token + listeners).
// Extraído como componente vazio só pra poder usar o hook dentro do provider tree.
function PushBootstrap() {
  usePushNotifications();
  return null;
}

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

// Initialize Sentry (no-op if EXPO_PUBLIC_SENTRY_DSN not set)
initSentry();
// Initialize PostHog analytics (no-op if EXPO_PUBLIC_POSTHOG_KEY not set)
initAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30s — evita refetch imediato em navegação comum
      gcTime: 10 * 60 * 1000, // 10min — mantém em cache 10min após última uso
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always', // refaz ao reconectar (útil em mobile instável)
    },
    mutations: {
      retry: 1, // muta só 1x; não é idempotente por padrão
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
          <PushBootstrap />
          <StatusBar style="light" backgroundColor={Colors.bg.primary} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg.primary },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="offer/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="alerts/create"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="subscription"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="price-history/[programId]" options={{ headerShown: false }} />
            <Stack.Screen name="articles/index" options={{ headerShown: false }} />
            <Stack.Screen name="articles/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="explore" options={{ headerShown: false }} />
            <Stack.Screen name="transfers" options={{ headerShown: false }} />
            <Stack.Screen name="value-compare" options={{ headerShown: false }} />
            <Stack.Screen name="family" options={{ headerShown: false }} />
            <Stack.Screen name="report-bonus" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
            <Stack.Screen name="welcome-quiz" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
            <Stack.Screen name="referral" options={{ headerShown: false }} />
            <Stack.Screen name="admin-review/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="missions" options={{ headerShown: false }} />
          </Stack>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
