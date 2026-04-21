import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

/**
 * Breakpoints pragmáticos pra app mobile-first:
 *   - sm: <600dp  (iPhones todos, Android compactos)
 *   - md: 600-900  (tablet pequeno, iPad mini retrato, foldable aberto)
 *   - lg: 900+     (iPad pro, desktop web)
 *
 * Reage a rotação e resize (útil no web/tablet).
 */
export type Breakpoint = 'sm' | 'md' | 'lg';

export function breakpointFor(width: number): Breakpoint {
  if (width >= 900) return 'lg';
  if (width >= 600) return 'md';
  return 'sm';
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(
    breakpointFor(Dimensions.get('window').width),
  );

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setBp(breakpointFor(window.width));
    };
    const sub = Dimensions.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return bp;
}

/**
 * Shortcut: dado um valor por breakpoint, retorna o atual.
 * Ex: const cols = responsiveValue({ sm: 1, md: 2, lg: 3 });
 */
export function responsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  fallback?: T,
): T | undefined {
  // Hook precisa ser chamado do caller
  return undefined as any;
}

/**
 * Hook-based responsive value. Recalcula quando breakpoint muda.
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  fallback?: T,
): T | undefined {
  const bp = useBreakpoint();
  // Cascata: lg > md > sm. Se pedir lg mas só md definido, usa md.
  if (bp === 'lg' && values.lg !== undefined) return values.lg;
  if ((bp === 'lg' || bp === 'md') && values.md !== undefined) return values.md;
  if (values.sm !== undefined) return values.sm;
  return fallback;
}

export function isTablet(): boolean {
  const { width, height } = Dimensions.get('window');
  const minDim = Math.min(width, height);
  // iPad mini ~768dp menor dim, iPhone 14 Pro Max ~430dp
  return minDim >= 600;
}

export function isDesktop(): boolean {
  return Platform.OS === 'web' && Dimensions.get('window').width >= 900;
}
