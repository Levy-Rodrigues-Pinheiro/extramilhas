import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Offline cache simples — snapshot periódico de queries críticas em
 * AsyncStorage, hidratação no boot. Sem dep extra (evita NetInfo /
 * react-query-persist-client).
 *
 * Estratégia:
 *   - Ao boot: lê snapshot do storage → popula react-query cache com
 *     placeholderData (se ainda não fetched).
 *   - Após cada fetch success das queries listadas: salva novo snapshot
 *     (debounced 3s pra não hammerar FS).
 *   - Se user estiver offline (fetch falha), o cache hidratado continua
 *     válido visualmente com isPlaceholderData=true.
 *
 * Queries persistidas (as críticas read-heavy):
 *   - ['wallet']
 *   - ['arbitrage', 'transfer-bonuses']
 *   - ['programs']
 *   - ['family']
 */

const STORAGE_KEY = 'offline-cache-v1';

const PERSISTED_KEYS = [
  JSON.stringify(['wallet']),
  JSON.stringify(['arbitrage', 'transfer-bonuses']),
  JSON.stringify(['programs']),
  JSON.stringify(['family']),
];

interface Snapshot {
  data: Record<string, { data: unknown; dataUpdatedAt: number }>;
  savedAt: number;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateOfflineCache(qc: QueryClient) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const snap = JSON.parse(raw) as Snapshot;
    for (const [keyStr, entry] of Object.entries(snap.data)) {
      const queryKey = JSON.parse(keyStr);
      // Só popula se ainda não foi fetched nessa sessão
      if (!qc.getQueryData(queryKey)) {
        qc.setQueryData(queryKey, entry.data);
      }
    }
  } catch {
    // Falha silenciosa — cache corrompido não deve travar o app
  }
}

export function subscribeOfflineCache(qc: QueryClient) {
  const unsub = qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const keyStr = JSON.stringify(event.query.queryKey);
    if (!PERSISTED_KEYS.includes(keyStr)) return;
    // Debounce — snapshot 3s após última mudança
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => snapshot(qc).catch(() => {}), 3000);
  });
  return unsub;
}

async function snapshot(qc: QueryClient) {
  const data: Snapshot['data'] = {};
  for (const keyStr of PERSISTED_KEYS) {
    const key = JSON.parse(keyStr);
    const q = qc.getQueryState(key);
    if (q && q.data !== undefined && q.status === 'success') {
      data[keyStr] = { data: q.data, dataUpdatedAt: q.dataUpdatedAt };
    }
  }
  if (Object.keys(data).length === 0) return;
  const snap: Snapshot = { data, savedAt: Date.now() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
}

export async function clearOfflineCache() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
