/**
 * ShimmerSkeleton — placeholder com shimmer gradiente animado.
 *
 * Renderiza um retângulo com gradiente que desliza em loop (1800ms).
 * Substitui `ActivityIndicator` que não comunica forma/estrutura.
 *
 * Uso:
 *   <ShimmerSkeleton width={240} height={20} radius={6} />
 *   <ShimmerSkeleton width="100%" height={120} radius={14} />
 *
 * Bom pattern: compor shimmers pra aproximar o shape do conteúdo real.
 * Veja `SkeletonCard`, `SkeletonListItem` exports abaixo.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, DimensionValue, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { surface, radius as radiusTokens } from '../../design/tokens';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: keyof typeof radiusTokens | number;
  style?: StyleProp<ViewStyle>;
};

export function ShimmerSkeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  style,
}: Props) {
  const progress = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: motion.timing.ambient,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [progress, reduceMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-200, 400]),
      },
    ],
  }));

  const r = typeof radius === 'number' ? radius : radiusTokens[radius];

  return (
    <View
      style={[
        styles.root,
        { width, height, borderRadius: r },
        style,
      ]}
    >
      {!reduceMotion && (
        <AnimatedGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradient, shimmerStyle]}
        />
      )}
    </View>
  );
}

// ─── Preset compositions ───────────────────────────────────────────────

/** Card skeleton — aproxima shape de um GlassCard com título + 2 linhas */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.cardRoot, style]}>
      <ShimmerSkeleton width="60%" height={20} radius="sm" />
      <View style={{ height: 12 }} />
      <ShimmerSkeleton width="100%" height={12} radius="xs" />
      <View style={{ height: 8 }} />
      <ShimmerSkeleton width="85%" height={12} radius="xs" />
      <View style={{ height: 16 }} />
      <ShimmerSkeleton width="40%" height={32} radius="sm" />
    </View>
  );
}

/** List item skeleton — avatar + 2 linhas */
export function SkeletonListItem({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.listItemRoot, style]}>
      <ShimmerSkeleton width={44} height={44} radius="pill" />
      <View style={{ flex: 1, gap: 8 }}>
        <ShimmerSkeleton width="50%" height={14} radius="xs" />
        <ShimmerSkeleton width="80%" height={10} radius="xs" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  gradient: {
    width: 200,
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardRoot: {
    backgroundColor: surface.glass,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  listItemRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
});

export default ShimmerSkeleton;
