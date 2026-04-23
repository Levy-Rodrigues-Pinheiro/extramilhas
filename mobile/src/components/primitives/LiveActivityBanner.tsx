/**
 * LiveActivityBanner — Dynamic Island-style banner que aparece no topo
 * quando há uma oportunidade HOT ativa.
 *
 * Visual:
 *  - Pill preto com glow border aurora (cyan ↔ magenta)
 *  - Ícone animado (pulse) à esquerda
 *  - Texto compacto central
 *  - Swipe up to dismiss ou tap pra ação
 *
 * Animações:
 *  - Entrance: scale 0.8 → 1.0 + opacity 0 → 1 (spring bouncy)
 *  - Idle: border gradient rotaciona lentamente (breathing)
 *  - Tap: pulse + navega
 *  - Dismiss: swipe up com threshold
 *
 * Uso:
 *   <LiveActivityBanner
 *     icon="flame"
 *     title="Bônus imperdível ativo"
 *     subtitle="Livelo → Smiles +120%"
 *     onPress={() => router.push('/arbitrage')}
 *     visible={hasImperdivel}
 *   />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  aurora,
  premium,
  text as textTokens,
  surface,
  gradients,
  space,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';
import { SymbolEffect } from './SymbolEffect';

type Props = {
  visible: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  /** Cor accent do glow — default aurora gradient */
  accent?: 'aurora' | 'gold' | 'success' | 'danger';
  onPress?: () => void;
  onDismiss?: () => void;
};

const ACCENT_GRADIENTS: Record<
  NonNullable<Props['accent']>,
  [string, string, string]
> = {
  aurora: [aurora.cyan, aurora.iris, aurora.magenta],
  gold: [premium.goldDark, premium.gold, premium.goldLight],
  success: ['#0F8A3C', '#30D158', '#66E88A'],
  danger: ['#A30014', '#FF453A', '#FF7A73'],
};

export function LiveActivityBanner({
  visible,
  icon = 'flame',
  title,
  subtitle,
  accent = 'aurora',
  onPress,
  onDismiss,
}: Props) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(0);
  const translateY = useSharedValue(-60);
  const dismissY = useSharedValue(0);
  const glowRotate = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        scale.value = withTiming(1, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
      } else {
        // Mount: spring bouncy (Dynamic Island feel)
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 220 });

        // Idle glow rotation (slow breathing)
        glowRotate.value = withRepeat(
          withTiming(1, { duration: 6000, easing: Easing.linear }),
          -1,
          false,
        );
        breath.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      }
      // Haptic
      haptics.success();
    } else {
      scale.value = withTiming(0.9, { duration: 200 });
      translateY.value = withTiming(-60, { duration: 200 });
    }
  }, [visible, reduceMotion, scale, translateY, glowRotate, breath]);

  // Swipe up to dismiss
  const swipe = React.useMemo(() => {
    return Gesture.Pan()
      .activeOffsetY(-10)
      .onUpdate((e) => {
        if (e.translationY < 0) {
          dismissY.value = e.translationY;
        }
      })
      .onEnd((e) => {
        if (e.translationY < -40) {
          // Dismiss
          dismissY.value = withTiming(-120, { duration: 200 });
          runOnJS(haptics.medium)();
          if (onDismiss) runOnJS(onDismiss)();
        } else {
          dismissY.value = withSpring(0, motion.springConfig.snappy);
        }
      });
  }, [dismissY, onDismiss]);

  const tap = React.useMemo(() => {
    return Gesture.Tap().onEnd(() => {
      if (onPress) {
        runOnJS(haptics.tap)();
        runOnJS(onPress)();
      }
    });
  }, [onPress]);

  const composed = Gesture.Exclusive(swipe, tap);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value + dismissY.value },
    ],
    opacity: interpolate(
      dismissY.value,
      [-120, -40, 0],
      [0, 0.7, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${glowRotate.value * 360}deg` }],
    opacity: 0.4 + breath.value * 0.4,
  }));

  if (!visible && scale.value === 0) return null;

  const gradientColors = ACCENT_GRADIENTS[accent];

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.wrap, containerStyle]}>
        {/* Glow ring rotating */}
        <Animated.View style={[styles.glowRing, glowStyle]} pointerEvents="none">
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Inner pill */}
        <View style={styles.pill}>
          <View style={styles.iconWrap}>
            <SymbolEffect
              name={icon}
              size={16}
              color={accent === 'gold' ? premium.goldLight : aurora.cyan}
              effect="pulse"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={13} color={textTokens.muted} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 8,
    left: space.md,
    right: space.md,
    zIndex: 50,
    borderRadius: 999,
    padding: 1.5, // gap for glow ring
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  glowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pill: {
    backgroundColor: 'rgba(10, 12, 24, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  subtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  chevronWrap: {
    marginLeft: 4,
  },
});

export default LiveActivityBanner;
