/**
 * Memoization TTL-based simples. Pra caches server-side curtos.
 *
 * Uso:
 *   const getPrograms = memoTTL(60_000, () => prisma.loyaltyProgram.findMany(...));
 *   await getPrograms(); // hit DB
 *   await getPrograms(); // hit cache (dentro dos 60s)
 */
export function memoTTL<T>(ttlMs: number, fn: () => Promise<T>) {
  let value: { data: T; expires: number } | null = null;
  return async (): Promise<T> => {
    const now = Date.now();
    if (value && value.expires > now) return value.data;
    const data = await fn();
    value = { data, expires: now + ttlMs };
    return data;
  };
}
