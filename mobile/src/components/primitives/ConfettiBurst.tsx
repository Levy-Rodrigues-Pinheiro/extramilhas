/**
 * ConfettiBurst — celebration pra rewards, streak, goal hit.
 *
 * Renderiza N partículas em explosão radial com física simples:
 *  - Explosão rádial (cada particle tem angle + velocity aleatória)
 *  - Gravity puxa pra baixo após ~50% da duração
 *  - Rotação constante
 *  - Fade out no final
 *
 * Performance: tudo worklet, 24 particles default, duração 1200ms.
 *
 * Uso imperativo:
 *   const confettiRef = useRef<ConfettiBurstHandle>(null);
 *   confettiRef.current?.burst();
 *   <ConfettiBurst ref={confettiRef} />
 *
 * Sob reduceMotion, confetti desabilitado — o componente renderiza null.
 */

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { aurora, premium, semantic } from '../../design/tokens';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = [
  aurora.cyan,
  aurora.magenta,
  aurora.iris,
  premium.goldLight,
  semantic.success,
];

const PARTICLE_COUNT = 24;
const DURATION = 1400;

export type ConfettiBurstHandle = {
  burst: (x?: number, y?: number) => void;
};

type Props = {
  particleCount?: number;
  /** Origem default — centro da tela. Pode ser overridado no burst(). */
  originX?: number;
  originY?: number;
  /** Dispara haptic.success junto com o burst. */
  withHaptic?: boolean;
};

type Particle = {
  color: string;
  angle: number;
  velocity: number;
  size: number;
  rotationSpeed: number;
};

export const ConfettiBurst = forwardRef<ConfettiBurstHandle, Props>(
  (
    {
      particleCount = PARTICLE_COUNT,
      originX = SCREEN_W / 2,
      originY = SCREEN_H / 3,
      withHaptic = true,
    },
    ref,
  ) => {
    const reduceMotion = useReduceMotion();
    const progress = useSharedValue(0);
    const origin = useRef({ x: originX, y: originY });

    const particles = useMemo<Particle[]>(() => {
      return Array.from({ length: particleCount }).map((_, i) => ({
        color: COLORS[i % COLORS.length],
        // Ângulo distribuído ao redor de 360°, com spread radial uniforme
        angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3,
        velocity: 180 + Math.random() * 240,
        size: 6 + Math.random() * 6,
        rotationSpeed: (Math.random() - 0.5) * 4,
      }));
    }, [particleCount]);

    useImperativeHandle(
      ref,
      () => ({
        burst: (x?: number, y?: number) => {
          if (reduceMotion) {
            // Sob reduceMotion, só haptic, sem partículas
            if (withHaptic) haptics.success();
            return;
          }
          origin.current = { x: x ?? originX, y: y ?? originY };
          progress.value = 0;
          progress.value = withTiming(1, {
            duration: DURATION,
            easing: Easing.bezier(0.2, 0, 0, 1),
          });
          if (withHaptic) haptics.success();
        },
      }),
      [reduceMotion, originX, originY, withHaptic, progress],
    );

    if (reduceMotion) return null;

    return (
      <View style={styles.root} pointerEvents="none">
        {particles.map((p, i) => (
          <ConfettiParticle
            key={i}
            particle={p}
            progress={progress}
            origin={origin}
          />
        ))}
      </View>
    );
  },
);

ConfettiBurst.displayName = 'ConfettiBurst';

function ConfettiParticle({
  particle,
  progress,
  origin,
}: {
  particle: Particle;
  progress: Animated.SharedValue<number>;
  origin: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { angle, velocity, size, color, rotationSpeed } = particle;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Movimento radial
    const dx = Math.cos(angle) * velocity * p;
    // Gravidade: primeiro sobe com angle, depois cai
    const dy = Math.sin(angle) * velocity * p + 500 * p * p;
    // Rotação
    const rotate = rotationSpeed * p * 360;
    // Fade
    const opacity = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.7) / 0.3);

    return {
      opacity,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size * 0.4,
          backgroundColor: color,
          left: origin.current.x,
          top: origin.current.y,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});

export default ConfettiBurst;
