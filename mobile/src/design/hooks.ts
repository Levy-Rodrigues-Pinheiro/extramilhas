/**
 * Design-system React hooks: reduceMotion, staggerIndex, pressScale etc.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Respeita `reduceMotion` do sistema. Componentes de animação devem
 * degradar (ver motion.ts → reduceMotion) quando essa flag for true.
 */
export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setEnabled(v);
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setEnabled(v),
    );

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
