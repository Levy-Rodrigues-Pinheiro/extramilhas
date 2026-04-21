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

const STORAGE_KEY = 'offline-cache-v2';
const STORAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB cap — AsyncStorage tem limite por plataforma

const PERSISTED_KEYS = [
  JSON.stringify(['wallet']),
  JSON.stringify(['arbitrage', 'transfer-bonuses']),
  JSON.stringify(['programs']),
  JSON.stringify(['family']),
  JSON.stringify(['engagement', 'streak']),
  JSON.stringify(['engagement', 'goals']),
  JSON.stringify(['engagement', 'milestones']),
  JSON.stringify(['portfolio', 'analyze']),
  JSON.stringify(['portfolio', 'signals']),
  JSON.stringify(['notes']),
  JSON.stringify(['bookmarks']),
  JSON.stringify(['guides', 'all']),
  JSON.stringify(['guides', 'mine']),
  JSON.stringify(['community', 'threads', 'all']),
  JSON.stringify(['community', 'polls']),
  JSON.stringify(['dashboard', 'stats']),
  JSON.stringify(['wallet-history']),
  JSON.stringify(['sessions']),
  JSON.stringify(['support', 'tickets']),
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
  let snap: Snapshot = { data, savedAt: Date.now() };
  let payload = JSON.stringify(snap);

  // Se passou do cap, começa a dropar keys menos críticas até caber.
  // Ordem de drop: reverse de PERSISTED_KEYS — as primeiras são as mais críticas
  // (wallet, arbitrage, programs, family).
  if (payload.length > STORAGE_MAX_BYTES) {
    const dropOrder = [...PERSISTED_KEYS].reverse();
    for (const k of dropOrder) {
      if (payload.length <= STORAGE_MAX_BYTES) break;
      delete data[k];
      snap = { data, savedAt: Date.now() };
      payload = JSON.stringify(snap);
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, payload);
}

export async function clearOfflineCache() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
