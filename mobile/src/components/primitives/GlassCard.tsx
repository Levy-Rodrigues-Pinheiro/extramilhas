/**
 * GlassCard — surface glassmorphism Aurora UI.
 *
 * Aurora UI GlassCard.tsx spec:
 *   backdrop-filter: blur(20) + saturate(180%)
 *   background: var(--surface-strong) = rgba(255,255,255,0.10)
 *   border: 1px solid var(--border-strong) = rgba(255,255,255,0.16)
 *   border-radius: var(--radius-lg) = 32px
 *   padding: 32px (default hero)
 *   shadow: var(--shadow-lg) = 0 30px 60px -20px rgba(0,0,0,0.7)
 *
 * Em RN, blur real precisa de BlurView (expo-blur). Como alguns cards são
 * grandes ou em listas longas, usamos apenas bg + border + shadow — o olho
 * continua lendo como "glass" sobre bg preto mesh.
 *
 * Props:
 *  - radiusSize: keyof radius — default 'lg' (22), pro Aurora UI hero use 'xl' (32)
 *  - padding: default 16 (cards densos) — pro Aurora UI hero use 32
 *  - glassIntensity: 'light' | 'medium' | 'strong' — 'strong' = Aurora UI --surface-strong
 *  - glow: 'none' | 'aurora' | 'cyan' | 'magenta' | 'gold' | 'success' | 'danger' | 'blue'
 *  - elevated: true → aplica --shadow-lg (Aurora UI hero cards)
 *  - sheen: highlight gradient no topo (default true)
 */

import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  surface,
  radius,
  aurora,
  premium,
  gradients,
  system,
  semantic,
  shadow,
} from '../../design/tokens';

type GlowColor = 'none' | 'aurora' | 'cyan' | 'magenta' | 'gold' | 'success' | 'danger' | 'blue';

type Props = ViewProps & {
  /** Intensidade do glow border — defaults to 'none'. */
  glow?: GlowColor;
  /** Ativa sheen gradient no topo (default true). */
  sheen?: boolean;
  /** Radius padrão — `lg` (22) por default; 'xl' (32) = Aurora UI hero. */
  radiusSize?: keyof typeof radius;
  /** Padding interno — default 16; Aurora UI hero = 32. */
  padding?: number;
  /** Override bg alpha — útil em sobre aurora. 'strong' = Aurora UI --surface-strong */
  glassIntensity?: 'light' | 'medium' | 'strong';
  /** True → aplica shadow-lg (Aurora UI hero spec). */
  elevated?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const GLOW_COLORS: Record<GlowColor, string | null> = {
  none: null,
  aurora: aurora.iris,
  cyan: aurora.cyan,
  magenta: aurora.magenta,
  gold: premium.goldLight,
  success: semantic.success,
  danger: semantic.danger,
  blue: system.blue,
};

/**
 * Aurora UI spec:
 *   --surface:       rgba(255,255,255,0.05)  → 'medium'
 *   --surface-strong: rgba(255,255,255,0.10) → 'strong'
 *   --surface-hover:  rgba(255,255,255,0.14) → (interno, usado via press)
 */
const INTENSITY_BG: Record<NonNullable<Props['glassIntensity']>, string> = {
  light: 'rgba(255, 255, 255, 0.03)',
  medium: 'rgba(255, 255, 255, 0.05)', // Aurora UI --surface
  strong: 'rgba(255, 255, 255, 0.10)', // Aurora UI --surface-strong
};

export function GlassCard({
  glow = 'none',
  sheen = true,
  radiusSize = 'lg',
  padding = 16,
  glassIntensity = 'medium',
  elevated,
  children,
  style,
  ...rest
}: Props) {
  const glowColor = GLOW_COLORS[glow];
  const r = radius[radiusSize];

  return (
    <View
      style={[
        styles.root,
        {
          borderRadius: r,
          padding,
          backgroundColor: INTENSITY_BG[glassIntensity],
          borderColor: glowColor
            ? withAlpha(glowColor, 0.35)
            : surface.glassBorderActive, // Aurora UI --border-strong (0.16)
        },
        glowColor ? styles.glowed : null,
        glowColor ? { shadowColor: glowColor } : null,
        elevated ? shadow.lg : null,
        style,
      ]}
      {...rest}
    >
      {sheen && (
        <LinearGradient
          colors={gradients.glassSheenTop}
          style={[
            styles.sheen,
            { borderTopLeftRadius: r, borderTopRightRadius: r },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

/** Adiciona canal alpha a uma cor hex/rgb — helper simples. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  glowed: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
});

export default GlassCard;
