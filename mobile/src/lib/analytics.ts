import PostHog from 'posthog-react-native';

/**
 * Analytics wrapper. Inicializa PostHog SE EXPO_PUBLIC_POSTHOG_KEY estiver
 * setado — senão vira no-op silencioso (dev/local).
 *
 * Uso:
 *   track('paywall_shown', { lockedCount: 12 });
 *   identify(userId, { plan: 'PREMIUM' });
 *
 * Eventos chave da app (canônicos):
 *  - auth_register / auth_login
 *  - onboarding_step_completed / onboarding_finished
 *  - arbitrage_viewed / paywall_shown / paywall_upgrade_clicked
 *  - bonus_report_created / bonus_report_approved
 *  - referral_shared / referral_applied
 *  - push_permission_granted / push_notification_opened
 *  - subscription_checkout_started / subscription_activated
 */

let client: PostHog | null = null;
let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    if (__DEV__) console.log('[analytics] no key set, running in no-op mode');
    return;
  }

  try {
    client = new PostHog(apiKey, {
      host,
      flushInterval: 30,
      flushAt: 20,
    });
  } catch (err) {
    if (__DEV__) console.warn('[analytics] init failed:', err);
  }
}

export function track(event: string, properties?: Record<string, any>) {
  if (__DEV__) console.log(`[analytics] ${event}`, properties ?? '');
  if (!client) return;
  try {
    client.capture(event, properties);
  } catch {}
}

export function identify(userId: string, properties?: Record<string, any>) {
  if (!client) return;
  try {
    client.identify(userId, properties);
  } catch {}
}

export function reset() {
  if (!client) return;
  try {
    client.reset();
  } catch {}
}
