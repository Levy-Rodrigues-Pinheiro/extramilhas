/**
 * Performance utilities simples — sem deps, opt-in via __DEV__.
 *
 * 1. useRenderTime(name): loga tempo de render do componente
 * 2. measure(name, fn): mede execução sync/async
 * 3. InteractionManager-like delayed run (defer heavy work)
 */

import { useEffect, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Log render time em __DEV__. Mount + updates.
 * Uso:
 *   function MyExpensiveComponent() {
 *     useRenderTime('MyExpensiveComponent');
 *     ...
 *   }
 */
export function useRenderTime(name: string) {
  const renderStart = useRef<number>(0);
  renderStart.current = Date.now();

  useEffect(() => {
    const duration = Date.now() - renderStart.current;
    if (__DEV__ && duration > 16) {
      // 16ms = 1 frame @ 60fps. Acima disso é dropped frame potencial.
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name} render: ${duration}ms ${duration > 100 ? '⚠️ SLOW' : ''}`);
    }
  });
}

/**
 * Mede tempo de execução de fn (sync ou async).
 */
export async function measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    if (__DEV__) {
      const duration = Date.now() - start;
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name}: ${duration}ms`);
    }
    return result;
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name}: FAILED after ${Date.now() - start}ms`);
    }
    throw err;
  }
}

/**
 * Roda fn depois das interações — útil pra não bloquear animations/gestures.
 * Na web usa setTimeout(0), mobile usa InteractionManager nativo.
 */
export function runAfterInteractions(fn: () => void) {
  if (Platform.OS === 'web') {
    setTimeout(fn, 0);
    return;
  }
  InteractionManager.runAfterInteractions(fn);
}

/**
 * Debounce simples — não puxa lodash.
 * Uso:
 *   const debouncedSave = debounce((v: string) => api.save(v), 500);
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

/**
 * Throttle simples — primeiro call passa, subsequentes dentro da janela são
 * descartadas.
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, windowMs: number) {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= windowMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * memoizeOnce — cache do primeiro resultado indefinidamente.
 * Pra dados raramente voláteis (ex: lista de países IATA).
 */
export function memoizeOnce<T extends (...args: any[]) => any>(fn: T): T {
  let cached: ReturnType<T> | undefined;
  let hasCached = false;
  return ((...args: Parameters<T>) => {
    if (!hasCached) {
      cached = fn(...args);
      hasCached = true;
    }
    return cached!;
  }) as T;
}
