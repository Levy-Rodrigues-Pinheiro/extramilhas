/**
 * PressableScale — HOC universal de press feedback.
 *
 * Cada toque:
 *  1. Scale down suave (1 → 0.97) em spring.snappy
 *  2. Haptic disparado no press IN (light default)
 *  3. Scale volta ao soltar
 *
 * Usar em TUDO que é tappable: cards, botões, chips, rows. Substitui
 * TouchableOpacity (que só muda opacity — feedback fraco).
 *
 * Sob `reduceMotion`, desabilita scale e faz opacity dim ao invés.
 */

import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = 'tap' | 'select' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';

type Props = PressableProps & {
  /** Scale target quando pressionado — default 0.97 */
  pressedScale?: number;
  /** Haptic a disparar no press — default 'tap' */
  haptic?: HapticKind;
  /** Disable feedback (pra disabled states) */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function PressableScale({
  pressedScale = 0.97,
  haptic = 'tap',
  disabled,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reduceMotion = useReduceMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      if (reduceMotion) {
        opacity.value = withTiming(0.72, motion.timingConfig.fast);
      } else {
        scale.value = withSpring(pressedScale, motion.springConfig.snappy);
      }
      if (haptic !== 'none') {
        haptics[haptic]?.();
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (reduceMotion) {
      opacity.value = withTiming(1, motion.timingConfig.fast);
    } else {
      scale.value = withSpring(1, motion.springConfig.snappy);
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style, disabled && { opacity: 0.42 }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default PressableScale;
