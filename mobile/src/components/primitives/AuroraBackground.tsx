/**
 * AuroraBackground — mesh-bg + noise texture (Aurora UI spec exato).
 *
 * Adaptação fiel de globals.css do Aurora UI web:
 *   .mesh-bg {
 *     position: absolute;
 *     inset: -20%;
 *     filter: blur(80px);
 *     opacity: 0.5;
 *   }
 *   .mesh-bg::before  { accent orb @ 10% 10%, anima 20s → translate(100,-50) → (-80,80) }
 *   .mesh-bg::after   { accent-2 orb @ bottom/right, animation-delay: -10s }
 *   .noise            { SVG feTurbulence baseFrequency 0.9, opacity 0.03 }
 *
 * React Native:
 *  - Usamos SVG RadialGradient (2 orbs cyan + iris) em AnimatedG translate
 *  - 20s loop com Reanimated withSequence — ease-in-out Apple
 *  - Noise: SVG fractalNoise + opacity 0.03 overlay (texture granular Apple)
 *  - Respeita reduce-motion → orbs parados na posição default
 *
 * Uso:
 *   <AuroraBackground intensity="hero">
 *     <ScreenContent />
 *   </AuroraBackground>
 *
 * Props:
 *   - intensity: 'subtle' (padrão dashboards) | 'hero' (login/onboarding) | 'celebration'
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewProps, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
} from 'react-native-svg';
import { bg, aurora } from '../../design/tokens';
import { useReduceMotion } from '../../design/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Intensity = 'subtle' | 'hero' | 'celebration';

type Props = ViewProps & {
  intensity?: Intensity;
  children?: React.ReactNode;
  /** Se true, desabilita a textura de noise (melhora perf em listas longas) */
  disableNoise?: boolean;
};

/**
 * Aurora UI mesh orb — 600x600px com radial-gradient blur 80px.
 * No RN, aproximamos com Circle grande + gradient radial que esmaece em 60%,
 * já que blur CSS não existe direto no SVG RN.
 */
const ORB_BASE_SIZE = Math.max(SCREEN_W, SCREEN_H) * 0.9;

const INTENSITY_PRESETS: Record<
  Intensity,
  { opacity: number; orbScale: number }
> = {
  subtle: { opacity: 0.35, orbScale: 1.0 },
  hero: { opacity: 0.55, orbScale: 1.15 },
  celebration: { opacity: 0.75, orbScale: 1.25 },
};

export function AuroraBackground({
  intensity = 'subtle',
  children,
  style,
  disableNoise,
  ...rest
}: Props) {
  const reduceMotion = useReduceMotion();
  const preset = INTENSITY_PRESETS[intensity];

  // Animação mesh-float (20s loop) — mesma curva que o CSS do Aurora UI.
  // Shared value 0 → 1 → 0 cobre o ciclo completo; usamos interpolate para
  // gerar as 3 fases (0, 100/-50, -80/80, 0).
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      phase.value = 0;
      return;
    }
    phase.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 10000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        withTiming(0, {
          duration: 10000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ),
      -1,
      false,
    );
  }, [phase, reduceMotion]);

  const orbSize = ORB_BASE_SIZE * preset.orbScale;
  const orb1BaseCx = SCREEN_W * 0.15;
  const orb1BaseCy = SCREEN_H * 0.15;
  const orb2BaseCx = SCREEN_W * 0.85;
  const orb2BaseCy = SCREEN_H * 0.78;

  // Orb 1 (accent cyan) — anima cx/cy (0,0) → (100,-50) → (-80,80) sobre base
  const orb1Props = useAnimatedProps(() => {
    const tx = interpolate(phase.value, [0, 0.5, 1], [0, 100, -80]);
    const ty = interpolate(phase.value, [0, 0.5, 1], [0, -50, 80]);
    return {
      cx: orb1BaseCx + tx,
      cy: orb1BaseCy + ty,
    };
  });

  // Orb 2 (accent-2 iris) — animation-delay: -10s → fase deslocada em +0.5
  const orb2Props = useAnimatedProps(() => {
    const shifted = (phase.value + 0.5) % 1;
    const tx = interpolate(shifted, [0, 0.5, 1], [0, 100, -80]);
    const ty = interpolate(shifted, [0, 0.5, 1], [0, -50, 80]);
    return {
      cx: orb2BaseCx + tx,
      cy: orb2BaseCy + ty,
    };
  });

  return (
    <View style={[styles.root, style]} {...rest}>
      {/* Camada 1: bg sólido #000000 (Aurora UI --bg) */}
      <View style={styles.bg} />

      {/* Camada 2: mesh-bg (2 orbs animated) */}
      <View style={[styles.meshContainer, { opacity: preset.opacity }]} pointerEvents="none">
        <Svg width={SCREEN_W * 1.4} height={SCREEN_H * 1.4} style={styles.meshSvg}>
          <Defs>
            {/* Orb 1: cyan accent blue #0a84ff */}
            <RadialGradient id="meshOrb1" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={aurora.cyan} stopOpacity="0.9" />
              <Stop offset="60%" stopColor={aurora.cyan} stopOpacity="0" />
            </RadialGradient>

            {/* Orb 2: iris accent-2 purple #bf5af2 */}
            <RadialGradient id="meshOrb2" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={aurora.iris} stopOpacity="0.9" />
              <Stop offset="60%" stopColor={aurora.iris} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <AnimatedCircle
            animatedProps={orb1Props}
            r={orbSize / 2}
            fill="url(#meshOrb1)"
          />
          <AnimatedCircle
            animatedProps={orb2Props}
            r={orbSize / 2}
            fill="url(#meshOrb2)"
          />
        </Svg>
      </View>

      {/* Camada 3: noise texture (Aurora UI .noise — feTurbulence fractalNoise) */}
      {!disableNoise && <NoiseOverlay />}

      {/* Camada 4: vignette sutil — darken nas bordas pra guiar o olho */}
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="auroraVignette" cx="50%" cy="50%" r="75%">
            <Stop offset="65%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0.40" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auroraVignette)" />
      </Svg>

      {/* Camada 5: children */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * Noise overlay — Aurora UI spec .noise (feTurbulence fractalNoise).
 *
 * react-native-svg não suporta Filter/feTurbulence (web-only). Aproximamos com
 * 240 pontos brancos espalhados deterministicamente — dá textura granular
 * similar a grain fotográfico. Opacity 0.03 pra não ruído visual.
 *
 * Memoizado — gera só uma vez no mount.
 */
const NOISE_SEED_COUNT = 240;

function NoiseOverlay() {
  const dots = React.useMemo(() => {
    const arr: Array<{ x: number; y: number; r: number; o: number }> = [];
    // PRNG simples seed fixo pra padrão consistente entre renders
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < NOISE_SEED_COUNT; i++) {
      arr.push({
        x: rand() * SCREEN_W,
        y: rand() * SCREEN_H,
        r: 0.5 + rand() * 0.8,
        o: 0.2 + rand() * 0.6,
      });
    }
    return arr;
  }, []);

  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H}
      style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
      pointerEvents="none"
    >
      {dots.map((d, i) => (
        <Circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="#ffffff"
          opacity={d.o}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    backgroundColor: bg.base,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: bg.base,
  },
  meshContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  meshSvg: {
    position: 'absolute',
    top: -SCREEN_H * 0.2,
    left: -SCREEN_W * 0.2,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default AuroraBackground;
