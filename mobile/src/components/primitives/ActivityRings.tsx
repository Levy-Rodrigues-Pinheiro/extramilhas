/**
 * ActivityRings — 3 anéis concêntricos estilo Apple Watch Activity.
 *
 * Cada anel tem:
 *  - Background track (20% alpha da cor)
 *  - Foreground arc (stroke com gradient se completa)
 *  - Anima em mount (0 → target value, duração decelerated)
 *  - Haptic threshold quando completa 100%
 *
 * Inspiração pura Apple: a complexidade visual vem DA INTERAÇÃO entre 3
 * objetos simples (rings), não de um elemento decorado. "Simple but not
 * simpler."
 *
 * Uso:
 *   <ActivityRings
 *     rings={[
 *       { value: 0.72, color: aurora.cyan, label: 'Meta mensal' },
 *       { value: 1.0, color: aurora.magenta, label: 'Streak' },
 *       { value: 0.45, color: premium.gold, label: 'Missões' },
 *     ]}
 *   />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { text as textTokens, surface, space } from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Ring = {
  value: number; // 0 a 1.0+ (acima de 1 preenche duas voltas)
  color: string;
  label?: string;
};

type Props = {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  /** Exibir labels no canvas esquerdo */
  showLabels?: boolean;
};

export function ActivityRings({
  rings,
  size = 200,
  strokeWidth = 14,
  gap = 4,
  showLabels = true,
}: Props) {
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.wrap}>
      <View>
        <Svg width={size} height={size}>
          <Defs>
            {rings.map((r, i) => (
              <SvgLinearGradient
                key={`grad-${i}`}
                id={`ring-grad-${i}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <Stop offset="0" stopColor={r.color} stopOpacity="1" />
                <Stop offset="1" stopColor={r.color} stopOpacity="0.65" />
              </SvgLinearGradient>
            ))}
          </Defs>

          {rings.map((ring, i) => {
            const radius = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap);
            const circumference = 2 * Math.PI * radius;
            return (
              <AnimatedRing
                key={i}
                ring={ring}
                radius={radius}
                circumference={circumference}
                size={size}
                strokeWidth={strokeWidth}
                gradId={`ring-grad-${i}`}
                index={i}
                reduceMotion={reduceMotion}
              />
            );
          })}
        </Svg>

        {/* Center dot */}
        <View
          style={[
            styles.centerDot,
            {
              width: size,
              height: size,
            },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Labels */}
      {showLabels && (
        <View style={styles.labels}>
          {rings.map((ring, i) => (
            <View key={i} style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: ring.color }]} />
              <Text style={styles.labelText}>{ring.label ?? `Ring ${i + 1}`}</Text>
              <Text style={[styles.labelValue, { color: ring.color }]}>
                {Math.round(Math.min(ring.value, 1) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── AnimatedRing ────────────────────────────────────────────────────────

function AnimatedRing({
  ring,
  radius,
  circumference,
  size,
  strokeWidth,
  gradId,
  index,
  reduceMotion,
}: {
  ring: Ring;
  radius: number;
  circumference: number;
  size: number;
  strokeWidth: number;
  gradId: string;
  index: number;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const target = Math.min(ring.value, 1);
    progress.value = 0;
    progress.value = withDelay(
      index * 120 + 80,
      withTiming(
        target,
        {
          duration: reduceMotion ? 200 : 900,
          easing: motion.curve.decelerated,
        },
        (finished) => {
          // Haptic quando completa
          if (finished && target >= 1) {
            runOnJS(haptics.success)();
          }
        },
      ),
    );
  }, [ring.value, index, progress, reduceMotion]);

  // Pulse pós-completion
  useEffect(() => {
    if (ring.value >= 1) {
      pulse.value = withDelay(
        index * 120 + 1000,
        withTiming(1.04, { duration: 400, easing: motion.curve.decelerated }),
      );
      setTimeout(
        () => {
          pulse.value = withTiming(1, { duration: 500 });
        },
        index * 120 + 1400,
      );
    }
  }, [ring.value, index, pulse]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset: dashOffset,
      opacity: interpolate(progress.value, [0, 0.01, 1], [0.0, 0.9, 1]),
    };
  });

  const containerStyle = { transform: [{ scale: pulse }] } as any;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track (bg) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${ring.color}22`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Rotate to start from top
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  centerDot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: {
    flex: 1,
    gap: 8,
    minWidth: 120,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    flex: 1,
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  labelValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.1,
  },
});

export default ActivityRings;
