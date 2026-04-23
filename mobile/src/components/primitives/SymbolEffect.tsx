/**
 * SymbolEffect — ícones com efeitos SF Symbols 5+ style.
 *
 * Efeitos:
 *  - 'bounce'         — scale bounce up em mount ou trigger
 *  - 'pulse'          — pulso infinito suave (attention-getter)
 *  - 'replace'        — fade + rotate quando ícone muda (ex: wallet → wallet-outline)
 *  - 'variableColor'  — color wave cascata (3 camadas)
 *  - 'wiggle'         — micro rotação -5° / +5° (erro/atenção)
 *  - 'scale'          — scale suave on hover/press
 *
 * Por que isso importa: é o que diferencia o feeling "nativo Apple" vs
 * "app qualquer". Cada interação tem peso visual.
 *
 * Uso:
 *   <SymbolEffect name="wallet" size={24} color={aurora.cyan} effect="bounce" />
 *   <SymbolEffect name="flame" effect="variableColor" trigger={isActive} />
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Effect =
  | 'bounce'
  | 'pulse'
  | 'replace'
  | 'variableColor'
  | 'wiggle'
  | 'scale'
  | 'none';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  effect?: Effect;
  /** Trigger pra re-run do efeito (quando muda valor) */
  trigger?: string | number | boolean;
  /** Só dispara o efeito em mount, não em re-render */
  onMountOnly?: boolean;
  /** Color secundária pra variableColor */
  accentColor?: string;
};

export function SymbolEffect({
  name,
  size = 22,
  color = '#FFF',
  effect = 'none',
  trigger,
  onMountOnly = false,
  accentColor,
}: Props) {
  const reduceMotion = useReduceMotion();
  const anim = useSharedValue(0);
  const rotate = useSharedValue(0);
  const layer2 = useSharedValue(0);
  const layer3 = useSharedValue(0);
  const prevName = React.useRef(name);

  // Trigger animations
  useEffect(() => {
    if (reduceMotion && effect !== 'pulse' && effect !== 'variableColor') return;

    switch (effect) {
      case 'bounce':
        anim.value = 0;
        anim.value = withSequence(
          withSpring(1.35, { damping: 10, stiffness: 320 }),
          withSpring(1, { damping: 18, stiffness: 280 }),
        );
        break;
      case 'pulse':
        if (!reduceMotion) {
          anim.value = withRepeat(
            withSequence(
              withTiming(1.1, {
                duration: 800,
                easing: Easing.inOut(Easing.quad),
              }),
              withTiming(1, {
                duration: 800,
                easing: Easing.inOut(Easing.quad),
              }),
            ),
            -1,
            false,
          );
        } else {
          anim.value = 1;
        }
        break;
      case 'replace':
        anim.value = 0;
        rotate.value = withSequence(
          withTiming(90, { duration: 200, easing: motion.curve.accelerated }),
          withTiming(0, { duration: 250, easing: motion.curve.decelerated }),
        );
        anim.value = withSequence(
          withTiming(0.2, { duration: 180 }),
          withTiming(1, { duration: 260, easing: motion.curve.emphasized }),
        );
        prevName.current = name;
        break;
      case 'wiggle':
        rotate.value = withSequence(
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 80 }),
          withTiming(-4, { duration: 70 }),
          withTiming(0, { duration: 100 }),
        );
        break;
      case 'variableColor':
        // Cascata de cor — layer 1 → 2 → 3 acende em sequência
        layer2.value = withRepeat(
          withSequence(
            withDelay(300, withTiming(1, { duration: 600 })),
            withTiming(0, { duration: 400 }),
            withDelay(600, withTiming(0, { duration: 0 })),
          ),
          -1,
          false,
        );
        layer3.value = withRepeat(
          withSequence(
            withDelay(600, withTiming(1, { duration: 600 })),
            withTiming(0, { duration: 400 }),
            withDelay(300, withTiming(0, { duration: 0 })),
          ),
          -1,
          false,
        );
        anim.value = 1;
        break;
      case 'scale':
      case 'none':
      default:
        anim.value = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, trigger, name, reduceMotion]);

  // Mount animation
  useEffect(() => {
    if (!onMountOnly) return;
    anim.value = withSpring(1, { damping: 18, stiffness: 240 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: anim.value || 1 },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // variableColor layers
  const layer2Style = useAnimatedStyle(() => ({
    opacity: layer2.value,
  }));
  const layer3Style = useAnimatedStyle(() => ({
    opacity: layer3.value,
  }));

  if (effect === 'variableColor' && accentColor) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        {/* Layer 1: base */}
        <Animated.View style={[StyleSheet.absoluteFill, iconStyle]}>
          <Ionicons name={name} size={size} color={color} />
        </Animated.View>
        {/* Layer 2: accent (aurora) on top */}
        <Animated.View style={[StyleSheet.absoluteFill, layer2Style]}>
          <Ionicons name={name} size={size} color={accentColor} />
        </Animated.View>
        {/* Layer 3: max intensity */}
        <Animated.View style={[StyleSheet.absoluteFill, layer3Style]}>
          <Ionicons name={name} size={size} color="#FFFFFF" />
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={iconStyle}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SymbolEffect;
