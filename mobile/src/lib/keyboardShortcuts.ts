import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Registra keyboard shortcuts globais. Só ativo no web (Platform.OS === 'web').
 * Mobile ignora — shortcuts fazem pouco sentido sem teclado.
 *
 * Convenções:
 *   - "cmd+k" = search/command palette
 *   - "g h" = go home
 *   - "g w" = go wallet
 *   - "esc" = fecha modais (via router.back)
 *
 * Cada shortcut recebe um callback — o caller decide o que fazer.
 *
 * Uso:
 *   useKeyboardShortcuts({
 *     'cmd+k': () => setSearchOpen(true),
 *     'g h': () => router.push('/'),
 *   });
 */
type Handler = () => void;

export function useKeyboardShortcuts(shortcuts: Record<string, Handler>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Sequential shortcuts ("g h") precisam track do último key
    let lastKey: string | null = null;
    let lastKeyTime = 0;

    const handler = (e: any) => {
      const key = (e.key || '').toLowerCase();
      const ctrlOrCmd = e.metaKey || e.ctrlKey;
      const alt = e.altKey;
      const shift = e.shiftKey;

      // Build combo string
      const parts: string[] = [];
      if (ctrlOrCmd) parts.push('cmd');
      if (alt) parts.push('alt');
      if (shift) parts.push('shift');
      parts.push(key);
      const combo = parts.join('+');

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
        lastKey = null;
        return;
      }

      // Sequential: "g h" ("g" então "h" dentro de 1s)
      const now = Date.now();
      if (lastKey && now - lastKeyTime < 1000) {
        const seq = `${lastKey} ${key}`;
        if (shortcuts[seq]) {
          e.preventDefault();
          shortcuts[seq]();
          lastKey = null;
          return;
        }
      }
      // Guarda pra próxima
      if (!ctrlOrCmd && !alt && !shift && /^[a-z]$/.test(key)) {
        lastKey = key;
        lastKeyTime = now;
      } else {
        lastKey = null;
      }
    };

    (globalThis as any).document?.addEventListener?.('keydown', handler);
    return () => {
      (globalThis as any).document?.removeEventListener?.('keydown', handler);
    };
  }, [shortcuts]);
}
