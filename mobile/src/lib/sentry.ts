/**
 * Setup centralizado do Sentry.
 *
 * Comportamento:
 * - Sem DSN configurado → não faz nada (não crasha, não loga errado).
 * - DSN configurado → captura erros não tratados + mantém contexto de navegação.
 *
 * Pra ativar:
 * 1. Crie conta grátis em https://sentry.io (5k eventos/mês gratuitos).
 * 2. Crie projeto "React Native".
 * 3. Cole o DSN em `EXPO_PUBLIC_SENTRY_DSN` no `.env` do mobile.
 * 4. `eas build` pra produção (dev build no Expo Go roda sem symbolication).
 */

import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) console.log('[sentry] DSN not configured — crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    // Sample 100% em dev pra ver tudo, 20% em prod pra economizar quota
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Ambiente ajuda a segmentar alertas (dev/staging/prod)
    environment: __DEV__ ? 'development' : 'production',
    // Em dev, logs nativos extras no console
    debug: __DEV__,
    // Evita reportar ruído (rede offline, canceled requests, etc.)
    ignoreErrors: [
      'Network request failed',
      'AbortError',
      /^Non-Error promise rejection/,
    ],
  });

  initialized = true;
  if (__DEV__) console.log('[sentry] initialized');
}

/** Captura manual de erro com contexto extra — use em catch blocks importantes. */
export function captureError(error: unknown, context?: Record<string, any>): void {
  if (!initialized) {
    if (__DEV__) console.error('[error]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

/** Breadcrumb pra rastrear ações do usuário antes de um crash. */
export function trackAction(name: string, data?: Record<string, any>): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({ category: 'user-action', message: name, data, level: 'info' });
}

export { Sentry };
