/**
 * RouteArc — SVG arc animado origem → destino com aviãozinho trafegando.
 *
 * Apple-style flight path visualization:
 *  - Arc curvo (quadratic bezier) de A a B
 *  - Path draw animation on mount (stroke-dashoffset)
 *  - Airplane SVG se move ao longo do arc enquanto path desenha
 *  - Pulse nos endpoints (origin/destination dots)
 *  - Dashed line atrás do avião (estilo como se fosse "planned")
 *
 * Uso:
 *   <RouteArc origin="GRU" destination="MIA" width={320} height={180} />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
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
  G,
} from 'react-native-svg';
import { aurora, text as textTokens, surface } from '../../design/tokens';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

type Props = {
  origin: string;
  destination: string;
  width?: number;
  height?: number;
};

export function RouteArc({
  origin,
  destination,
  width = 320,
  height = 180,
}: Props) {
  const reduceMotion = useReduceMotion();

  // Anchor points
  const startX = 36;
  const startY = height - 36;
  const endX = width - 36;
  const endY = 36;

  // Arc control point (above line pra curvatura visível)
  const controlX = (startX + endX) / 2;
  const controlY = Math.min(startY, endY) - 60;

  // Quadratic bezier path
  const path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

  // Path total length (aprox) pra dash-offset animation
  // Calcula approximado usando cord + 1.2 factor pra curva
  const chord = Math.sqrt(
    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
  );
  const pathLength = chord * 1.18;

  // Shared values
  const drawProgress = useSharedValue(0);
  const planeProgress = useSharedValue(0);
  const pulseOrigin = useSharedValue(0);
  const pulseDest = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drawProgress.value = 1;
      planeProgress.value = 1;
      return;
    }

    drawProgress.value = withTiming(1, {
      duration: 1400,
      easing: motion.curve.decelerated,
    });
    planeProgress.value = withDelay(
      300,
      withTiming(1, {
        duration: 1200,
        easing: motion.curve.decelerated,
      }),
    );

    // Pulse endpoints
    pulseOrigin.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 100 }),
      ),
      -1,
      false,
    );
    pulseDest.value = withDelay(
      750,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 100 }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, drawProgress, planeProgress, pulseOrigin, pulseDest]);

  const pathAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - drawProgress.value),
  }));

  // Plane position ao longo do arc — interpolate bezier
  // Bezier: P(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
  const planeStyle = useAnimatedStyle(() => {
    const t = planeProgress.value;
    const px =
      Math.pow(1 - t, 2) * startX +
      2 * (1 - t) * t * controlX +
      Math.pow(t, 2) * endX;
    const py =
      Math.pow(1 - t, 2) * startY +
      2 * (1 - t) * t * controlY +
      Math.pow(t, 2) * endY;

    // Tangent pra rotação do avião
    const dx =
      2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX);
    const dy = 2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      transform: [
        { translateX: px - 14 }, // center plane icon 28x28
        { translateY: py - 14 },
        { rotate: `${angle}deg` },
      ],
      opacity: t > 0.02 && t < 0.99 ? 1 : t < 0.99 ? 0 : 0,
    };
  });

  // Pulse rings
  const pulseOriginProps = useAnimatedProps(() => ({
    r: 8 + pulseOrigin.value * 16,
    opacity: 1 - pulseOrigin.value,
  }));

  const pulseDestProps = useAnimatedProps(() => ({
    r: 8 + pulseDest.value * 16,
    opacity: 1 - pulseDest.value,
  }));

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="route-grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={aurora.cyan} stopOpacity="1" />
            <Stop offset="0.5" stopColor={aurora.iris} stopOpacity="1" />
            <Stop offset="1" stopColor={aurora.magenta} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Origin pulse ring */}
        <AnimatedCircle
          cx={startX}
          cy={startY}
          fill="none"
          stroke={aurora.cyan}
          strokeWidth={1.5}
          animatedProps={pulseOriginProps}
        />
        {/* Dest pulse ring */}
        <AnimatedCircle
          cx={endX}
          cy={endY}
          fill="none"
          stroke={aurora.magenta}
          strokeWidth={1.5}
          animatedProps={pulseDestProps}
        />

        {/* Origin dot */}
        <Circle cx={startX} cy={startY} r={6} fill={aurora.cyan} />
        <Circle cx={startX} cy={startY} r={3} fill="#FFF" />

        {/* Dest dot */}
        <Circle cx={endX} cy={endY} r={6} fill={aurora.magenta} />
        <Circle cx={endX} cy={endY} r={3} fill="#FFF" />

        {/* Arc path */}
        <AnimatedPath
          d={path}
          stroke="url(#route-grad)"
          strokeWidth={2.5}
          fill="none"
          strokeDasharray={`${pathLength} ${pathLength}`}
          strokeLinecap="round"
          animatedProps={pathAnimatedProps}
        />

        {/* Dashed "planned" ghost below */}
        <Path
          d={path}
          stroke={surface.glassBorder}
          strokeWidth={1}
          fill="none"
          strokeDasharray="3 6"
          opacity={0.4}
        />
      </Svg>

      {/* Airplane flying */}
      <Animated.View style={[styles.plane, planeStyle]}>
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Path
            d="M 2 14 L 22 10 L 26 14 L 22 18 L 2 14 M 10 10 L 6 6 M 10 18 L 6 22"
            fill="#FFF"
            stroke="#FFF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* Labels */}
      <View
        style={[
          styles.label,
          { left: startX - 20, top: startY + 12 },
        ]}
      >
        <Text style={styles.labelText}>{origin}</Text>
      </View>
      <View
        style={[
          styles.label,
          { left: endX - 20, top: endY - 30 },
        ]}
      >
        <Text style={styles.labelText}>{destination}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  plane: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    minWidth: 44,
    alignItems: 'center',
  },
  labelText: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

export default RouteArc;
