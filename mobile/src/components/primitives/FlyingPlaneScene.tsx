/**
 * FlyingPlaneScene — cena imersiva de avião voando pelas nuvens.
 *
 * Não é só um ícone animado — é uma mini-cena 3D dentro de uma "janela"
 * circular. Múltiplas camadas em parallax dão profundidade real:
 *
 *   Layer 1: Sky gradient (sky-300 → sky-500, bg diurno)
 *   Layer 2: Stars piscando (alpha baixo, far background)
 *   Layer 3: Far clouds (scroll lento, alpha 0.35, tamanho grande)
 *   Layer 4: Middle clouds (scroll médio, alpha 0.6)
 *   Layer 5: Near clouds (scroll rápido, alpha 0.85)
 *   Layer 6: Contrail / vapor trail (atrás do avião)
 *   Layer 7: Plane (bob ±3px, tilt ±1.5°, navigation lights piscando)
 *   Layer 8: Foreground mist (sutil overlay no topo/bottom)
 *
 * Inspiração: Apple Watch activity complications + Weather live wallpaper +
 * vendo pela janelinha de uma aeronave ao nascer do sol. Nada genérico.
 *
 * Uso:
 *   <FlyingPlaneScene size={120} />
 *
 * Props:
 *   - size: lado do square (default 120)
 *   - intensity: 'calm' | 'cruising' (nuvens mais/menos rápidas)
 *   - glow: cor do halo externo (aurora default)
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Ellipse,
  G,
  RadialGradient,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { aurora } from '../../design/tokens';
import { useReduceMotion } from '../../design/hooks';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  size?: number;
  intensity?: 'calm' | 'cruising';
  /** Halo glow color (ao redor do squircle) */
  haloColor?: string;
};

// Cloud shapes — SVG paths desenhados à mão pra cada camada
const CLOUD_SHAPES = {
  small: 'M 8 14 Q 8 8 14 8 Q 16 4 22 6 Q 28 2 32 8 Q 38 8 38 14 Q 38 18 32 18 L 14 18 Q 8 18 8 14 Z',
  medium:
    'M 6 18 Q 6 10 14 10 Q 18 4 26 6 Q 32 -2 42 6 Q 50 6 50 14 Q 58 14 58 22 Q 58 26 50 26 L 14 26 Q 6 26 6 18 Z',
  large:
    'M 4 24 Q 4 14 16 14 Q 20 6 32 8 Q 42 -2 54 8 Q 66 6 70 16 Q 82 16 82 26 Q 82 34 70 34 L 16 34 Q 4 34 4 24 Z',
};

export function FlyingPlaneScene({
  size = 120,
  intensity = 'cruising',
  haloColor = aurora.magenta,
}: Props) {
  const reduceMotion = useReduceMotion();

  const speedFactor = intensity === 'cruising' ? 1 : 0.6;

  // Cloud layer scroll positions (0 → 1 looped)
  const farClouds = useSharedValue(0);
  const midClouds = useSharedValue(0);
  const nearClouds = useSharedValue(0);

  // Plane bob + tilt
  const planeBob = useSharedValue(0);
  const planeTilt = useSharedValue(0);

  // Contrail fade pulses
  const contrail = useSharedValue(0);

  // Navigation lights (wingtip blinking)
  const navLight = useSharedValue(1);

  // Stars twinkle
  const star1 = useSharedValue(0);
  const star2 = useSharedValue(0);
  const star3 = useSharedValue(0);

  // Halo rotation
  const halo = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    // Cloud layers — loop infinito em velocidades diferentes (parallax)
    farClouds.value = withRepeat(
      withTiming(1, { duration: 22000 / speedFactor, easing: Easing.linear }),
      -1,
      false,
    );
    midClouds.value = withRepeat(
      withTiming(1, { duration: 13000 / speedFactor, easing: Easing.linear }),
      -1,
      false,
    );
    nearClouds.value = withRepeat(
      withTiming(1, { duration: 7500 / speedFactor, easing: Easing.linear }),
      -1,
      false,
    );

    // Plane bob — correntes de ar sutis
    planeBob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    // Tilt sutil dessincronizado com o bob
    planeTilt.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Contrail pulse (mais denso em rajadas)
    contrail.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.in(Easing.quad) }),
        withTiming(0.6, { duration: 900, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );

    // Nav lights — piscam em sequência (port red / stbd green)
    navLight.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.2, { duration: 100 }),
        withTiming(1, { duration: 150 }),
        withTiming(0.2, { duration: 1400 }),
      ),
      -1,
      false,
    );

    // Stars — twinkle dessincronizado
    star1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0.3, { duration: 1400 }),
      ),
      -1,
      false,
    );
    star2.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200 }),
          withTiming(0.4, { duration: 1100 }),
        ),
        -1,
        false,
      ),
    );
    star3.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600 }),
          withTiming(0.2, { duration: 1600 }),
        ),
        -1,
        false,
      ),
    );

    // Halo slow rotation
    halo.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [
    reduceMotion,
    speedFactor,
    farClouds,
    midClouds,
    nearClouds,
    planeBob,
    planeTilt,
    contrail,
    navLight,
    star1,
    star2,
    star3,
    halo,
  ]);

  // viewBox 100x100 — todos os shapes são nessa unidade
  const vb = 100;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Halo externo — gradient glow rotacionando */}
      <HaloRing size={size} halo={halo} color={haloColor} reduceMotion={reduceMotion} />

      {/* Janela circular (portal) */}
      <View style={[styles.window, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
          <Defs>
            {/* Sky gradient (day cruising) */}
            <SvgLinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#7DD3FC" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#38BDF8" stopOpacity="1" />
              <Stop offset="1" stopColor="#0EA5E9" stopOpacity="1" />
            </SvgLinearGradient>

            {/* Vignette escura nos cantos */}
            <RadialGradient id="vignette" cx="50%" cy="50%" r="75%">
              <Stop offset="0" stopColor="#000" stopOpacity="0" />
              <Stop offset="1" stopColor="#0F172A" stopOpacity="0.35" />
            </RadialGradient>

            {/* Cloud fill — branco com soft edge */}
            <RadialGradient id="cloudFill" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            {/* Contrail gradient — vapor branco fade pra trás */}
            <SvgLinearGradient id="contrail" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
            </SvgLinearGradient>

            {/* Plane body gradient — metálico */}
            <SvgLinearGradient id="planeBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F8FAFC" stopOpacity="1" />
              <Stop offset="1" stopColor="#CBD5E1" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {/* Sky bg */}
          <Path d={`M 0 0 H ${vb} V ${vb} H 0 Z`} fill="url(#sky)" />

          {/* Stars (far layer) */}
          <TwinkleStar cx={18} cy={15} r={0.6} anim={star1} />
          <TwinkleStar cx={78} cy={22} r={0.5} anim={star2} />
          <TwinkleStar cx={88} cy={12} r={0.7} anim={star3} />
          <TwinkleStar cx={35} cy={8} r={0.45} anim={star2} />

          {/* Sun/Halo — sutil círculo de luz no canto superior esquerdo */}
          <Circle cx={18} cy={28} r={14} fill="#FEF3C7" opacity={0.22} />
          <Circle cx={18} cy={28} r={6} fill="#FDE68A" opacity={0.4} />

          {/* Far clouds (slowest, big, semi-transparent) */}
          <CloudLayer
            anim={farClouds}
            size="large"
            y={25}
            opacity={0.35}
            startX={-30}
            endX={vb + 30}
          />

          {/* Middle clouds */}
          <CloudLayer
            anim={midClouds}
            size="medium"
            y={60}
            opacity={0.7}
            startX={-40}
            endX={vb + 40}
          />
          <CloudLayer
            anim={midClouds}
            size="small"
            y={40}
            opacity={0.65}
            startX={vb + 20}
            endX={-20}
            phase={0.5}
          />

          {/* Contrail — atrás do avião */}
          <Contrail anim={contrail} />

          {/* Plane — central, bobbing */}
          <Plane bob={planeBob} tilt={planeTilt} navLight={navLight} />

          {/* Near clouds (fastest, foreground) */}
          <CloudLayer
            anim={nearClouds}
            size="small"
            y={78}
            opacity={0.85}
            startX={vb + 15}
            endX={-15}
          />
          <CloudLayer
            anim={nearClouds}
            size="medium"
            y={85}
            opacity={0.95}
            startX={-20}
            endX={vb + 20}
            phase={0.4}
          />

          {/* Vignette final */}
          <Path d={`M 0 0 H ${vb} V ${vb} H 0 Z`} fill="url(#vignette)" />
        </Svg>
      </View>

      {/* Border glow sutil nas bordas da janela */}
      <View
        style={[
          styles.borderGlow,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── HaloRing ──────────────────────────────────────────────────────────

function HaloRing({
  size,
  halo,
  color,
  reduceMotion,
}: {
  size: number;
  halo: Animated.SharedValue<number>;
  color: string;
  reduceMotion: boolean;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${halo.value * 360}deg` }],
    opacity: reduceMotion ? 0.4 : 0.55,
  }));

  return (
    <Animated.View
      style={[
        styles.halo,
        {
          width: size * 1.35,
          height: size * 1.35,
          borderRadius: size * 0.4,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[
          'rgba(100, 210, 255, 0.35)',
          'rgba(191, 90, 242, 0.35)',
          'rgba(100, 210, 255, 0.35)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ─── CloudLayer — conjunto de nuvens que scrolla ──────────────────────

function CloudLayer({
  anim,
  size,
  y,
  opacity,
  startX,
  endX,
  phase = 0,
}: {
  anim: Animated.SharedValue<number>;
  size: 'small' | 'medium' | 'large';
  y: number;
  opacity: number;
  startX: number;
  endX: number;
  phase?: number;
}) {
  const path = CLOUD_SHAPES[size];
  const scale = size === 'small' ? 0.45 : size === 'medium' ? 0.7 : 1;

  const animProps = useAnimatedProps(() => {
    const progress = (anim.value + phase) % 1;
    const x = interpolate(progress, [0, 1], [startX, endX]);
    return {
      transform: `translate(${x}, ${y}) scale(${scale})`,
    };
  });

  return (
    <AnimatedG animatedProps={animProps} opacity={opacity}>
      <Path d={path} fill="url(#cloudFill)" />
    </AnimatedG>
  );
}

// ─── Contrail ──────────────────────────────────────────────────────────

function Contrail({ anim }: { anim: Animated.SharedValue<number> }) {
  // Trail aparece "saindo" do final do avião (direita do centro)
  // Path: começa largo atrás do avião, afina pra esquerda
  const animProps = useAnimatedProps(() => ({
    opacity: interpolate(anim.value, [0, 1], [0.35, 0.9]),
  }));

  return (
    <AnimatedG animatedProps={animProps}>
      {/* Trail principal */}
      <Ellipse cx={32} cy={52} rx={18} ry={1.4} fill="url(#contrail)" opacity={0.7} />
      {/* Segunda layer (mais densa mais perto do avião) */}
      <Ellipse cx={42} cy={52} rx={8} ry={2} fill="#FFFFFF" opacity={0.5} />
      {/* Poof de saída (mais quente) */}
      <Circle cx={48} cy={52} r={1.6} fill="#FFFFFF" opacity={0.85} />
    </AnimatedG>
  );
}

// ─── Plane — avião desenhado à mão em SVG ──────────────────────────────

function Plane({
  bob,
  tilt,
  navLight,
}: {
  bob: Animated.SharedValue<number>;
  tilt: Animated.SharedValue<number>;
  navLight: Animated.SharedValue<number>;
}) {
  // Plane no centro (50, 52), apontando pra direita (nose = right)
  // Bob: ±2 em y, tilt: ±2° em rotação

  const planeProps = useAnimatedProps(() => {
    const dy = bob.value * 2;
    const angle = tilt.value * 2;
    return {
      transform: `translate(50 ${52 + dy}) rotate(${angle})`,
    };
  });

  // Port light (red, left wingtip)
  const portProps = useAnimatedProps(() => ({
    opacity: navLight.value,
  }));
  // Starboard light (green, right wingtip) — anti-phase
  const stbdProps = useAnimatedProps(() => ({
    opacity: 1 - navLight.value,
  }));

  return (
    <AnimatedG animatedProps={planeProps}>
      {/* Shadow sutil abaixo */}
      <Ellipse cx={0} cy={10} rx={13} ry={1.2} fill="#0F172A" opacity={0.22} />

      {/* Wing back (far — antes do body) */}
      <Path
        d="M -4 -1 L -2 3 L 6 3 L 4 -1 Z"
        fill="#94A3B8"
        opacity={0.85}
      />

      {/* Body (fuselage) */}
      <Path
        d="M -14 0 Q -14 -2.5 -10 -3 L 10 -3 Q 14 -2 15 0 Q 14 2 10 3 L -10 3 Q -14 2.5 -14 0 Z"
        fill="url(#planeBody)"
      />

      {/* Nose cone */}
      <Path d="M 15 0 Q 17 -1 18 0 Q 17 1 15 0 Z" fill="#E2E8F0" />

      {/* Main wing (foreground) */}
      <Path
        d="M -2 1 L -8 5.5 L -6 5.7 L 0 2 L 6 5.7 L 8 5.5 L 2 1 Z"
        fill="#CBD5E1"
      />

      {/* Tail fin (vertical) */}
      <Path d="M -13 -1 L -15 -5 L -11 -5 L -10 -1 Z" fill="#94A3B8" />

      {/* Tail stabilizers (horizontal) */}
      <Path d="M -12 -0.5 L -16 -2 L -15 0 L -11 0 Z" fill="#94A3B8" />
      <Path d="M -12 0.5 L -16 2 L -15 0 L -11 0 Z" fill="#94A3B8" />

      {/* Cockpit windows (row) */}
      <Ellipse cx={9} cy={-1} rx={3} ry={0.8} fill="#0EA5E9" opacity={0.85} />
      <Circle cx={12} cy={-1} r={0.7} fill="#0EA5E9" opacity={0.85} />

      {/* Cabin windows (tiny row) */}
      <Circle cx={3} cy={-1.2} r={0.3} fill="#0EA5E9" opacity={0.9} />
      <Circle cx={0} cy={-1.2} r={0.3} fill="#0EA5E9" opacity={0.9} />
      <Circle cx={-3} cy={-1.2} r={0.3} fill="#0EA5E9" opacity={0.9} />
      <Circle cx={-6} cy={-1.2} r={0.3} fill="#0EA5E9" opacity={0.9} />

      {/* Wing accent stripe */}
      <Path
        d="M -14 0 L 14 0"
        stroke={aurora.cyan}
        strokeWidth={0.3}
        opacity={0.6}
      />

      {/* Navigation lights */}
      {/* Port (left wingtip) — red */}
      <AnimatedCircle cx={-8.2} cy={5.7} r={0.75} fill="#EF4444" animatedProps={portProps} />
      {/* Starboard (right wingtip) — green */}
      <AnimatedCircle cx={8.2} cy={5.7} r={0.75} fill="#22C55E" animatedProps={stbdProps} />
      {/* Tail beacon — white anti-collision */}
      <Circle cx={-15} cy={-5} r={0.55} fill="#FFFFFF" opacity={0.9} />
    </AnimatedG>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────

function TwinkleStar({
  cx,
  cy,
  r,
  anim,
}: {
  cx: number;
  cy: number;
  r: number;
  anim: Animated.SharedValue<number>;
}) {
  const props = useAnimatedProps(() => ({
    opacity: anim.value * 0.9,
  }));
  return <AnimatedCircle cx={cx} cy={cy} r={r} fill="#FFFFFF" animatedProps={props} />;
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    opacity: 0.55,
    overflow: 'hidden',
  },
  window: {
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 18,
    backgroundColor: '#0EA5E9',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  borderGlow: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});

export default FlyingPlaneScene;
