/**
 * AuroraBackground — mesh gradient animado usado em hero sections.
 *
 * Implementação: 3 círculos gradiente (SVG radial) em camadas, cada um
 * translatando em loop diferente — cria sensação de "respirar" sem
 * ser chamativo. Over bg.space do design system.
 *
 * Performance: tudo worklet via Reanimated. Zero re-renders JS após mount.
 *
 * Uso:
 *   <AuroraBackground intensity="hero" />
 *     <ScreenContent />
 *   </AuroraBackground>
 *
 * Props:
 *   - intensity: 'subtle' (dashboard) | 'hero' (login/onboarding) | 'celebration'
 *   - children
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewProps, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  G,
} from 'react-native-svg';
import { bg, aurora } from '../../design/tokens';
import { useReduceMotion } from '../../design/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Intensity = 'subtle' | 'hero' | 'celebration';

type Props = ViewProps & {
  intensity?: Intensity;
  children?: React.ReactNode;
};

const INTENSITY_PRESETS: Record<
  Intensity,
  { opacity: number; blobSize: number; blobs: Array<{ cx: number; cy: number; color: string }> }
> = {
  subtle: {
    opacity: 0.35,
    blobSize: 360,
    blobs: [
      { cx: SCREEN_W * 0.15, cy: SCREEN_H * 0.18, color: aurora.cyan },
      { cx: SCREEN_W * 0.85, cy: SCREEN_H * 0.32, color: aurora.magenta },
    ],
  },
  hero: {
    opacity: 0.55,
    blobSize: 480,
    blobs: [
      { cx: SCREEN_W * 0.12, cy: SCREEN_H * 0.2, color: aurora.cyan },
      { cx: SCREEN_W * 0.88, cy: SCREEN_H * 0.25, color: aurora.magenta },
      { cx: SCREEN_W * 0.5, cy: SCREEN_H * 0.9, color: aurora.iris },
    ],
  },
  celebration: {
    opacity: 0.8,
    blobSize: 560,
    blobs: [
      { cx: SCREEN_W * 0.2, cy: SCREEN_H * 0.15, color: aurora.cyan },
      { cx: SCREEN_W * 0.8, cy: SCREEN_H * 0.15, color: aurora.magenta },
      { cx: SCREEN_W * 0.5, cy: SCREEN_H * 0.5, color: aurora.iris },
    ],
  },
};

export function AuroraBackground({
  intensity = 'subtle',
  children,
  style,
  ...rest
}: Props) {
  const reduceMotion = useReduceMotion();
  const preset = INTENSITY_PRESETS[intensity];

  // Breath animation — opacity + scale oscilando lentamente
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 4800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breath, reduceMotion]);

  return (
    <View style={[styles.root, style]} {...rest}>
      {/* Camada 1: bg sólido deep-space */}
      <View style={styles.bg} />

      {/* Camada 2: aurora blobs (SVG) */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          {preset.blobs.map((blob, i) => (
            <RadialGradient
              key={i}
              id={`aurora-blob-${i}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <Stop offset="0%" stopColor={blob.color} stopOpacity={preset.opacity} />
              <Stop offset="50%" stopColor={blob.color} stopOpacity={preset.opacity * 0.4} />
              <Stop offset="100%" stopColor={blob.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>

        {/* Blobs estáticos — respiram via opacity sobre eles */}
        <G>
          {preset.blobs.map((blob, i) => (
            <AuroraBlob
              key={i}
              cx={blob.cx}
              cy={blob.cy}
              r={preset.blobSize}
              fill={`url(#aurora-blob-${i})`}
              breath={breath}
              phase={i / preset.blobs.length}
            />
          ))}
        </G>
      </Svg>

      {/* Camada 3: vignette sutil (darken corners) */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <Stop offset="60%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0.35" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      {/* Camada 4: children */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * Componente interno — blob individual que respira.
 * Cada blob tem uma phase diferente pra não animarem em sync.
 */
function AuroraBlob({
  cx,
  cy,
  r,
  fill,
  breath,
  phase,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  breath: Animated.SharedValue<number>;
  phase: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    // shift da phase — cada blob tem uma offset diferente
    const shifted = (breath.value + phase) % 1;
    // opacity varia 0.7 a 1.2 (relative)
    const opacityFactor = 0.7 + 0.5 * Math.abs(shifted - 0.5) * 2;
    // scale varia ±8%
    const scaleFactor = 1 + 0.08 * Math.sin(shifted * Math.PI);

    return {
      r: r * scaleFactor,
      opacity: opacityFactor,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill={fill}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: bg.space,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default AuroraBackground;
