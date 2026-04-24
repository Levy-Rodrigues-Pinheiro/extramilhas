/**
 * PaperPlaneOrbit — avião de papel branco (perfil lateral) orbitando.
 *
 * Movimento: curva Lissajous (figura-8 horizontal) com parametrização:
 *   x(t) = Rx · sin(2π·t)
 *   y(t) = Ry · sin(4π·t) / 2
 *
 * Dá loops orgânicos que cobrem toda a tela em ~22s — fluido, cinemático,
 * meditativo. O avião aponta pra direção do movimento calculando a derivada
 * do path: θ = atan2(dy/dt, dx/dt).
 *
 * Trail: 12 círculos brancos seguem o path com lag progressivo e opacity
 * decrescente — forma contrail elegante.
 *
 * Design do avião de papel (SIDE VIEW — perfil lateral icônico):
 *   - Asa superior: triângulo branco da cauda ao nariz (top half)
 *   - Barriga inferior: triângulo fold-color da cauda ao nariz (bottom)
 *   - Tail fin (estabilizador vertical): pequeno triângulo na cauda topo
 *   - Crista central: linha sutil dividindo asa/barriga (dobra do papel)
 *   - Halo glow radial ao redor (brilho Apple)
 *
 * Performance: 1 sharedValue global + worklet pure; trails = N views
 * animados por useAnimatedStyle — tudo no UI thread.
 *
 * Uso:
 *   <PaperPlaneOrbit />  // fullscreen orbit
 *   <PaperPlaneOrbit width={300} height={300} planeSize={28} />
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';
import { useReduceMotion } from '../../design/hooks';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  /** Largura total do container de órbita (default: screen width) */
  width?: number;
  /** Altura total do container de órbita (default: screen height) */
  height?: number;
  /** Tamanho do avião em px (default: 40) */
  planeSize?: number;
  /** Duração de 1 ciclo completo em ms (default: 22000ms) */
  duration?: number;
  /** Amplitude horizontal como fração de width (0..0.5). Default 0.38 */
  pathAmplitudeX?: number;
  /** Amplitude vertical como fração de height (0..0.5). Default 0.22 */
  pathAmplitudeY?: number;
  /** Mostra trail atrás do avião (default true) */
  showTrail?: boolean;
  /** Nº de pontos do trail (default 10) */
  trailCount?: number;
  /** Cor principal do avião (default #fff) */
  color?: string;
  /** Cor da dobra de papel (default rgba(255,255,255,0.55)) */
  foldColor?: string;
  /** Ativa halo glow sutil ao redor do avião (default true) */
  glow?: boolean;
  /** Style extra no container absoluto */
  style?: StyleProp<ViewStyle>;
};

export function PaperPlaneOrbit({
  width = SCREEN_W,
  height = SCREEN_H,
  planeSize = 40,
  duration = 22000,
  pathAmplitudeX = 0.38,
  pathAmplitudeY = 0.22,
  showTrail = true,
  trailCount = 10,
  color = '#ffffff',
  foldColor = 'rgba(255, 255, 255, 0.55)',
  glow = true,
  style,
}: Props) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  const cx = width / 2;
  const cy = height / 2;
  const Rx = width * pathAmplitudeX;
  const Ry = height * pathAmplitudeY;

  useEffect(() => {
    if (reduceMotion) {
      t.value = 0.25; // frozen posição "bonita" (canto superior esquerdo do arco)
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [t, duration, reduceMotion]);

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { width, height },
        style,
      ]}
    >
      {/* Trail — dots seguindo o path com lag */}
      {showTrail &&
        Array.from({ length: trailCount }).map((_, i) => (
          <TrailDot
            key={i}
            index={i}
            total={trailCount}
            t={t}
            cx={cx}
            cy={cy}
            Rx={Rx}
            Ry={Ry}
            color={color}
          />
        ))}

      {/* Halo glow + avião */}
      <PaperPlane
        t={t}
        cx={cx}
        cy={cy}
        Rx={Rx}
        Ry={Ry}
        size={planeSize}
        color={color}
        foldColor={foldColor}
        glow={glow}
      />
    </View>
  );
}

// ─── Trail dot ──────────────────────────────────────────────────────────

function TrailDot({
  index,
  total,
  t,
  cx,
  cy,
  Rx,
  Ry,
  color,
}: {
  index: number;
  total: number;
  t: Animated.SharedValue<number>;
  cx: number;
  cy: number;
  Rx: number;
  Ry: number;
  color: string;
}) {
  // Lag proporcional — dots mais distantes ficam mais atrás no path
  const lagFactor = (index + 1) / (total * 6); // ex: 10 dots → lags de 0.017 a 0.17

  const dotStyle = useAnimatedStyle(() => {
    // Subtrai o lag — mantém >=0 por wraparound
    const ts = (t.value - lagFactor + 1) % 1;
    const phase = ts * 2 * Math.PI;
    const x = cx + Rx * Math.sin(phase);
    const y = cy + (Ry * Math.sin(phase * 2)) / 2;

    // Opacity decresce ao longo do trail (perto do avião = mais opaco)
    const opacity = interpolate(
      index,
      [0, total - 1],
      [0.42, 0],
      Extrapolation.CLAMP,
    );

    // Size decresce também
    const size = interpolate(
      index,
      [0, total - 1],
      [5, 1.5],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
      ],
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.trailDot,
        { backgroundColor: color },
        dotStyle,
      ]}
    />
  );
}

// ─── Paper plane (SVG + rotação seguindo direção do movimento) ─────────

function PaperPlane({
  t,
  cx,
  cy,
  Rx,
  Ry,
  size,
  color,
  foldColor,
  glow,
}: {
  t: Animated.SharedValue<number>;
  cx: number;
  cy: number;
  Rx: number;
  Ry: number;
  size: number;
  color: string;
  foldColor: string;
  glow: boolean;
}) {
  const planeStyle = useAnimatedStyle(() => {
    const phase = t.value * 2 * Math.PI;
    const x = cx + Rx * Math.sin(phase);
    const y = cy + (Ry * Math.sin(phase * 2)) / 2;

    // Derivada: dx/dphase = Rx·cos(phase); dy/dphase = Ry·cos(2·phase)
    const dx = Rx * Math.cos(phase);
    const dy = Ry * Math.cos(phase * 2);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Bob sutil em Y (correntes de ar) — overlay sobre o path principal
    const bobY = Math.sin(phase * 3.2) * 2.5;

    return {
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 + bobY },
        { rotate: `${angle}deg` },
      ],
    };
  });

  // Paper plane SIDE VIEW (perfil lateral icônico, apontando pra direita)
  //
  // Dimensões:
  //   - Altura total ocupa ~80% de `size` (y 0.15 → 0.85) pra deixar margem
  //     de voo ao redor sem cortar
  //   - Nose direita (100%, meio-baixo = 0.58)
  //   - Cauda alongada (0%, topo = 0.22 e base = 0.72)
  //   - Dobra central (fold) em ~40% x
  //   - Tail fin (estabilizador vertical) pequeno triângulo topo-trás
  //
  // Coordenadas (s = size):
  const s = size;

  // Asa superior (top wing silhouette) — triângulo da cauda-top ao nariz
  //   cauda-top (0, 0.22) → nariz (1.00, 0.58) → fold (0.38, 0.58) → close
  const wingTop = `M 0 ${s * 0.22} L ${s} ${s * 0.58} L ${s * 0.38} ${s * 0.58} Z`;

  // Barriga inferior (fuselage bottom) — triângulo da cauda-base ao nariz
  //   cauda-base (0, 0.72) → nariz (1.00, 0.58) → fold (0.38, 0.58) → close
  const bellyBottom = `M 0 ${s * 0.72} L ${s} ${s * 0.58} L ${s * 0.38} ${s * 0.58} Z`;

  // Tail fin (estabilizador vertical, cauda-topo) — triângulo pequeno
  //   cauda-top (0, 0.22) → meio (0.12, 0.35) → cauda base fin (0, 0.40) → close
  const tailFin = `M 0 ${s * 0.22} L ${s * 0.12} ${s * 0.36} L 0 ${s * 0.42} Z`;

  // Crista central (dobra do papel) — linha sutil no eixo do avião
  const crease = `M ${s * 0.38} ${s * 0.58} L ${s} ${s * 0.58}`;

  // Cockpit highlight subtle — risco próximo ao nariz
  const noseHighlight = `M ${s * 0.80} ${s * 0.55} L ${s * 0.95} ${s * 0.57}`;

  return (
    <Animated.View
      style={[
        styles.plane,
        {
          width: size,
          height: size,
        },
        planeStyle,
      ]}
    >
      {/* Halo glow — círculo branco difuso atrás do avião */}
      {glow && (
        <View
          style={[
            styles.halo,
            {
              width: size * 2.2,
              height: size * 2.2,
              borderRadius: size * 1.1,
              backgroundColor: color,
              left: -size * 0.6,
              top: -size * 0.6,
            },
          ]}
        />
      )}

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {/* 1. Barriga inferior (fold-color — papel dobra) */}
          <Path d={bellyBottom} fill={foldColor} />
          {/* 2. Asa superior (branco pleno) */}
          <Path d={wingTop} fill={color} />
          {/* 3. Tail fin (estabilizador vertical — branco pleno) */}
          <Path d={tailFin} fill={color} />
          {/* 4. Crista central (linha de dobra — branco forte) */}
          <Path
            d={crease}
            stroke={color}
            strokeWidth={0.8}
            strokeLinecap="round"
            fill="none"
            opacity={0.95}
          />
          {/* 5. Nose highlight (reflexo no bico) */}
          <Path
            d={noseHighlight}
            stroke={color}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.7}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  trailDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  plane: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow drop pra papel
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  halo: {
    position: 'absolute',
    opacity: 0.12,
  },
});

export default PaperPlaneOrbit;
