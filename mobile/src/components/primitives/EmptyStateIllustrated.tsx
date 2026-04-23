/**
 * EmptyStateIllustrated — vida pro "vazio".
 *
 * Renderiza:
 *  - SVG illustration (aviação-themed) que tem uma animação idle constante
 *  - Título + descrição
 *  - CTA opcional (PressableScale wrap)
 *
 * Variants:
 *  - 'flight'      — avião circulando
 *  - 'radar'       — ping circular (alerts)
 *  - 'compass'     — agulha oscilando (navegação)
 *  - 'wallet'      — carteira girando
 *  - 'trophy'      — troféu brilhando (leaderboard)
 *
 * Substitui o `EmptyState` chato (ícone cinza + texto).
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { text as textTokens, aurora, surface } from '../../design/tokens';
import { motion } from '../../design/motion';
import { PressableScale } from './PressableScale';
import { useReduceMotion } from '../../design/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Variant = 'flight' | 'radar' | 'compass' | 'wallet' | 'trophy' | 'search';

type Props = {
  variant?: Variant;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

const VARIANT_ICONS: Record<Variant, React.ComponentProps<typeof Ionicons>['name']> = {
  flight: 'airplane',
  radar: 'notifications',
  compass: 'compass',
  wallet: 'wallet',
  trophy: 'trophy',
  search: 'search',
};

export function EmptyStateIllustrated({
  variant = 'flight',
  title,
  description,
  ctaLabel,
  onCtaPress,
}: Props) {
  const reduceMotion = useReduceMotion();

  // Float idle animation pro ícone central
  const float = useSharedValue(0);
  // Ping rádio ao redor
  const ping = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    ping.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [reduceMotion, float, ping]);

  const iconStyle = useAnimatedStyle(() => {
    const translateY = reduceMotion ? 0 : -6 * Math.sin(float.value * Math.PI);
    // Compass: agulha oscila; senão, flutua
    const rotate = variant === 'compass' ? (float.value - 0.5) * 10 : 0;
    return {
      transform: [{ translateY }, { rotate: `${rotate}deg` }],
    };
  });

  const pingAnimated = useAnimatedProps(() => ({
    r: 30 + ping.value * 70,
    opacity: 1 - ping.value,
  }));

  const pingAnimated2 = useAnimatedProps(() => {
    const offset = (ping.value + 0.4) % 1;
    return {
      r: 30 + offset * 70,
      opacity: 1 - offset,
    };
  });

  return (
    <View style={styles.root}>
      {/* Illustration */}
      <View style={styles.illustration}>
        {/* Radar ping circles */}
        <Svg width={180} height={180} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={aurora.cyan} stopOpacity={0.24} />
              <Stop offset="100%" stopColor={aurora.cyan} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={90} cy={90} r={60} fill="url(#glow)" />
          {!reduceMotion && (
            <>
              <AnimatedCircle
                cx={90}
                cy={90}
                stroke={aurora.cyan}
                strokeWidth={1.5}
                fill="none"
                animatedProps={pingAnimated}
              />
              <AnimatedCircle
                cx={90}
                cy={90}
                stroke={aurora.magenta}
                strokeWidth={1.5}
                fill="none"
                animatedProps={pingAnimated2}
              />
            </>
          )}
        </Svg>

        {/* Central icon floating */}
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Ionicons
            name={VARIANT_ICONS[variant]}
            size={56}
            color={aurora.cyan}
          />
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}

      {ctaLabel && onCtaPress && (
        <PressableScale onPress={onCtaPress} style={styles.cta} haptic="tap">
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  illustration: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surface.glassActive,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: textTokens.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: textTokens.muted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: aurora.cyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#041220',
    letterSpacing: 0.3,
  },
});

export default EmptyStateIllustrated;
