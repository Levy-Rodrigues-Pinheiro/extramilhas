import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import api from '../lib/api';

/**
 * Hook que gerencia o ciclo de vida do push notification:
 *  1. Pede permissão (iOS/Android 13+)
 *  2. Obtém o ExpoPushToken
 *  3. Registra no backend (associa ao user se logado via interceptor do axios)
 *  4. Listeners: notificação recebida em foreground + tap (deep link)
 *
 * Falhas silenciosas — não queremos crashar o app se push não funcionar.
 * Chamado uma vez no root layout.
 *
 * Deep link convention: payload.data.deepLink = '/arbitrage' → router.push
 */

// Configuração global do handler de foreground (mostra banner mesmo com app aberto).
// IMPORTANTE: precisa rodar antes de qualquer notificação chegar.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Emulador não suporta push real. Não é erro.
    if (__DEV__) console.log('[push] not a physical device — skip');
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      if (__DEV__) console.warn('[push] no projectId found in app.json');
      return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    if (__DEV__) console.warn('[push] getExpoPushToken failed', err);
    return null;
  }
}

async function registerOnBackend(token: string) {
  try {
    await api.post('/devices/register', {
      token,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    });
  } catch (err) {
    if (__DEV__) console.warn('[push] backend register failed', err);
  }
}

export function usePushNotifications() {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Android precisa de channel explícito pra notificação aparecer.
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Oportunidades de Milhas',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366f1',
            sound: 'default',
          });
        } catch {}
      }

      const ok = await ensurePermission();
      if (!ok || cancelled) return;

      const token = await getExpoPushToken();
      if (!token || cancelled) return;

      if (__DEV__) console.log('[push] token:', token.slice(0, 30) + '...');
      await registerOnBackend(token);
    })();

    // Listener 1: notificação recebida com app em foreground (já mostra banner
    // por conta do setNotificationHandler acima).
    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.log('[push] received', notification.request.content.title);
      },
    );

    // Listener 2: usuário tocou na notificação → deep link.
    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (__DEV__) console.log('[push] tapped', data);
        const deepLink = data?.deepLink;
        if (typeof deepLink === 'string' && deepLink.startsWith('/')) {
          try {
            router.push(deepLink as any);
          } catch (err) {
            if (__DEV__) console.warn('[push] deep link failed', err);
          }
        }
      },
    );

    return () => {
      cancelled = true;
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);
}
