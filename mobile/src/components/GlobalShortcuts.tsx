import { router } from 'expo-router';
import { useKeyboardShortcuts } from '../lib/keyboardShortcuts';

/**
 * Mount 1x no root (web only). Registra shortcuts globais de navegação.
 *
 * Convenções:
 *   g h  → home
 *   g w  → wallet
 *   g a  → alerts
 *   g p  → profile
 *   g o  → arbitrage (oportunidades)
 *   g c  → calculator
 *   g n  → notes
 *   g f  → forum
 *   cmd+,  → settings
 */
export function GlobalShortcuts() {
  useKeyboardShortcuts({
    'g h': () => router.push('/' as any),
    'g w': () => router.push('/(tabs)/wallet' as any),
    'g a': () => router.push('/(tabs)/alerts' as any),
    'g p': () => router.push('/(tabs)/profile' as any),
    'g o': () => router.push('/arbitrage' as any),
    'g c': () => router.push('/(tabs)/calculator' as any),
    'g n': () => router.push('/notes' as any),
    'g f': () => router.push('/forum' as any),
    'g s': () => router.push('/settings' as any),
    'cmd+,': () => router.push('/settings' as any),
  });
  return null;
}
