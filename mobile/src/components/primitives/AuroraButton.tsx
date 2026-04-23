/**
 * AuroraButton — CTA premium com gradient cyan→magenta + glow + haptic.
 *
 * Estados:
 *  - idle: gradient estático
 *  - pressed: scale 0.97 + glow intensifica
 *  - loading: shimmer sweep sobre o gradient
 *
 * Variants:
 *  - 'primary' (aurora cyan→magenta)
 *  - 'gold'    (premium)
 *  - 'ghost'   (outline glass)
 *  - 'danger'
 *
 * Sempre com min-height 48 (touch target WCAG).
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { aurora, premium, text as textTokens, gradients, surface } from '../../design/tokens';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

type Variant = 'primary' | 'gold' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: 'tap' | 'medium' | 'success';
};

const SIZE_CONFIG: Record<Size, { height: number; padHorizontal: number; fontSize: number }> = {
  sm: { height: 40, padHorizontal: 14, fontSize: 13 },
  md: { height: 48, padHorizontal: 20, fontSize: 15 },
  lg: { height: 56, padHorizontal: 28, fontSize: 17 },
};

const VARIANT_GRADIENTS: Record<Variant, [string, string] | [string, string, string] | null> = {
  primary: gradients.auroraCyanMagenta,
  gold: [premium.goldLight, premium.goldDark],
  ghost: null,
  danger: ['#F87171', '#DC2626'],
};

const VARIANT_TEXT_COLOR: Record<Variant, string> = {
  primary: textTokens.onAurora,
  gold: textTokens.onGold,
  ghost: textTokens.primary,
  danger: '#FFF',
};

export function AuroraButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading,
  disabled,
  fullWidth,
  style,
  haptic = 'tap',
}: Props) {
  const sizeCfg = SIZE_CONFIG[size];
  const gradientColors = VARIANT_GRADIENTS[variant];
  const textColor = VARIANT_TEXT_COLOR[variant];
  const reduceMotion = useReduceMotion();

  // Loading shimmer
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (loading && !reduceMotion) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      shimmer.value = 0;
    }
  }, [loading, reduceMotion, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-120, 300]) },
    ],
    opacity: loading ? 0.5 : 0,
  }));

  const baseStyle: ViewStyle = {
    height: sizeCfg.height,
    paddingHorizontal: sizeCfg.padHorizontal,
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  const content = (
    <View style={styles.contentRow}>
      {icon && iconPosition === 'left' && !loading && (
        <Ionicons name={icon} size={sizeCfg.fontSize + 3} color={textColor} style={{ marginRight: 8 }} />
      )}
      {loading && (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={{ marginRight: 10 }}
        />
      )}
      <Text style={[styles.label, { fontSize: sizeCfg.fontSize, color: textColor }]}>
        {label}
      </Text>
      {icon && iconPosition === 'right' && !loading && (
        <Ionicons name={icon} size={sizeCfg.fontSize + 3} color={textColor} style={{ marginLeft: 8 }} />
      )}
    </View>
  );

  // Ghost variant = transparent with glass border
  if (variant === 'ghost') {
    return (
      <PressableScale
        disabled={disabled || loading}
        onPress={onPress}
        haptic={haptic}
        style={[
          baseStyle,
          styles.ghost,
          style,
        ]}
      >
        {content}
      </PressableScale>
    );
  }

  return (
    <PressableScale
      disabled={disabled || loading}
      onPress={onPress}
      haptic={haptic}
      style={[
        baseStyle,
        variant === 'primary' && styles.primaryGlow,
        variant === 'gold' && styles.goldGlow,
        variant === 'danger' && styles.dangerGlow,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors!}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '60%' }]}
      />
      {/* Loading shimmer */}
      {loading && (
        <AnimatedGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.shimmerTrack, shimmerStyle]}
        />
      )}
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
  primaryGlow: {
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  dangerGlow: {
    shadowColor: '#F87171',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  ghost: {
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  shimmerTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
});

export default AuroraButton;
