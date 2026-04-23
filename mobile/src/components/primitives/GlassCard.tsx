/**
 * GlassCard — surface glassmorphism padrão do design system.
 *
 * Features:
 *  - BG translúcido (surface.glass) com sheen gradient no topo
 *  - Border sutil de 1px (surface.glassBorder)
 *  - Optional glow quando `active`
 *  - Support pra border gradient (glowColor = 'aurora' | 'gold')
 *
 * Não é Pressable — se precisar interação, wrap com PressableScale.
 */

import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { surface, radius, aurora, premium, gradients, system, semantic } from '../../design/tokens';

type GlowColor = 'none' | 'aurora' | 'cyan' | 'magenta' | 'gold' | 'success' | 'danger' | 'blue';

type Props = ViewProps & {
  /** Intensidade do glow border — defaults to 'none'. */
  glow?: GlowColor;
  /** Ativa sheen gradient no topo (default true). */
  sheen?: boolean;
  /** Radius padrão — `lg` por default. */
  radiusSize?: keyof typeof radius;
  /** Padding interno — default 16. */
  padding?: number;
  /** Override bg alpha — útil em sobre aurora. */
  glassIntensity?: 'light' | 'medium' | 'strong';
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

const INTENSITY_BG: Record<NonNullable<Props['glassIntensity']>, string> = {
  light: 'rgba(255, 255, 255, 0.03)',
  medium: surface.glass,
  strong: surface.glassActive,
};

export function GlassCard({
  glow = 'none',
  sheen = true,
  radiusSize = 'lg',
  padding = 16,
  glassIntensity = 'medium',
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
            : surface.glassBorder,
        },
        glowColor ? styles.glowed : null,
        glowColor ? { shadowColor: glowColor } : null,
        style,
      ]}
      {...rest}
    >
      {sheen && (
        <LinearGradient
          colors={gradients.glassSheenTop}
          style={[styles.sheen, { borderTopLeftRadius: r, borderTopRightRadius: r }]}
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
