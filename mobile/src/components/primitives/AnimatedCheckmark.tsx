/**
 * AnimatedCheckmark — SVG line-draw checkmark on success.
 *
 * Apple-style: o checkmark desenha linha por linha (stroke-dashoffset
 * anim) dentro de um círculo que cresce. Haptic success + subtle bounce.
 *
 * Uso:
 *   <AnimatedCheckmark trigger={success} size={64} color={semantic.success} />
 *
 * Perfect for: form submission success, mission complete, transfer done.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { semantic } from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  /** Trigger do checkmark — ao virar true, desenha */
  trigger: boolean;
  size?: number;
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Haptic success ao completar */
  haptic?: boolean;
};

const PATH_LENGTH = 30; // Aproximação do comprimento do stroke

export function AnimatedCheckmark({
  trigger,
  size = 64,
  color = semantic.success,
  strokeWidth = 4,
  haptic = true,
}: Props) {
  const reduceMotion = useReduceMotion();

  // Anima: 1) círculo cresce com spring, 2) checkmark desenha linha, 3) pulse final
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const checkDash = useSharedValue(PATH_LENGTH);
  const finalBounce = useSharedValue(1);

  useEffect(() => {
    if (trigger) {
      // 1. Círculo cresce
      circleOpacity.value = withTiming(1, { duration: 200 });
      circleScale.value = withSpring(1, {
        damping: 14,
        stiffness: 260,
      });

      // 2. Depois de 180ms, checkmark desenha
      checkDash.value = withDelay(
        180,
        withTiming(
          0,
          {
            duration: reduceMotion ? 100 : 420,
            easing: motion.curve.decelerated,
          },
          (finished) => {
            if (finished && haptic) {
              runOnJS(haptics.success)();
            }
          },
        ),
      );

      // 3. Pulse final
      finalBounce.value = withDelay(
        600,
        withSequence(
          withSpring(1.12, { damping: 10, stiffness: 320 }),
          withSpring(1, { damping: 18, stiffness: 280 }),
        ),
      );
    } else {
      // Reset
      circleScale.value = 0;
      circleOpacity.value = 0;
      checkDash.value = PATH_LENGTH;
      finalBounce.value = 1;
    }
  }, [trigger, reduceMotion, haptic, circleScale, circleOpacity, checkDash, finalBounce]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value * finalBounce.value }],
    opacity: circleOpacity.value,
  }));

  const checkAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: checkDash.value,
  }));

  const r = size / 2 - strokeWidth;

  return (
    <Animated.View style={[{ width: size, height: size }, wrapperStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle (glow) */}
        <Circle cx={size / 2} cy={size / 2} r={r + strokeWidth / 2} fill={`${color}1A`} />
        {/* Border circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth / 1.5}
          opacity={0.4}
        />
        {/* Checkmark — path aproximado em coordenadas relativas */}
        <AnimatedPath
          d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.46} ${size * 0.66} L ${size * 0.72} ${size * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={PATH_LENGTH}
          animatedProps={checkAnimProps}
        />
      </Svg>
    </Animated.View>
  );
}

export default AnimatedCheckmark;
