/**
 * SegmentedControl — iOS 17 capsule-style segmented picker.
 *
 * Apple HIG pattern: fundo glass + indicador "pill" que desliza entre
 * segmentos com spring. Não é toggle — é picker exclusivo.
 *
 * Features:
 *  - Indicator pill morfa entre segmentos via spring.snappy
 *  - Cada segment pode ter icon + label + badge count
 *  - Haptic selection no change
 *  - Auto-layout: segmentos dividem largura igualmente
 *  - Suporte a ícones-only (radio) ou icon+label (default)
 *
 * Uso:
 *   <SegmentedControl
 *     value={filter}
 *     onChange={setFilter}
 *     segments={[
 *       { value: 'all', label: 'Todos' },
 *       { value: 'active', label: 'Ativos', icon: 'flash' },
 *       { value: 'expired', label: 'Expirados', badge: 3 },
 *     ]}
 *   />
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import {
  aurora,
  surface,
  text as textTokens,
  gradients,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

type Segment<T extends string> = {
  value: T;
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  badge?: number | string;
};

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  segments: Segment<T>[];
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  /** Usa gradient aurora no indicator (default true) */
  gradient?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = 'md',
  style,
  gradient = true,
}: Props<T>) {
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = React.useState<Array<{ x: number; width: number } | null>>(
    () => segments.map(() => null),
  );

  const activeIndex = segments.findIndex((s) => s.value === value);

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  useEffect(() => {
    const layout = layouts[activeIndex];
    if (!layout) return;
    if (reduceMotion) {
      indicatorX.value = withTiming(layout.x, motion.timingConfig.short);
      indicatorW.value = withTiming(layout.width, motion.timingConfig.short);
    } else {
      indicatorX.value = withSpring(layout.x, motion.springConfig.indicator);
      indicatorW.value = withSpring(layout.width, motion.springConfig.indicator);
    }
  }, [activeIndex, layouts, indicatorX, indicatorW, reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const handleLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  const sizeConfig = {
    sm: { py: 6, fontSize: 12, iconSize: 13, padding: 3, radius: 10 },
    md: { py: 9, fontSize: 13, iconSize: 14, padding: 4, radius: 12 },
    lg: { py: 11, fontSize: 14, iconSize: 16, padding: 5, radius: 14 },
  }[size];

  return (
    <View
      style={[
        styles.root,
        {
          padding: sizeConfig.padding,
          borderRadius: sizeConfig.radius + 2,
        },
        style,
      ]}
    >
      {/* Indicator (pill animated) */}
      <Animated.View
        style={[
          styles.indicator,
          {
            top: sizeConfig.padding,
            bottom: sizeConfig.padding,
            borderRadius: sizeConfig.radius,
          },
          indicatorStyle,
        ]}
      >
        {gradient ? (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: sizeConfig.radius },
            ]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: aurora.cyan,
                borderRadius: sizeConfig.radius,
              },
            ]}
          />
        )}
      </Animated.View>

      {segments.map((seg, i) => {
        const selected = seg.value === value;
        return (
          <PressableScale
            key={seg.value}
            onPress={() => {
              haptics.select();
              onChange(seg.value);
            }}
            haptic="none"
            onLayout={handleLayout(i)}
            style={styles.segment}
            pressedScale={0.95}
          >
            <View
              style={[
                styles.segmentContent,
                {
                  paddingVertical: sizeConfig.py,
                  paddingHorizontal: 12,
                },
              ]}
            >
              {seg.icon && (
                <Ionicons
                  name={seg.icon}
                  size={sizeConfig.iconSize}
                  color={selected ? '#041220' : textTokens.secondary}
                  style={{ marginRight: seg.label ? 5 : 0 }}
                />
              )}
              {seg.label && (
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: sizeConfig.fontSize,
                      color: selected ? '#041220' : textTokens.secondary,
                      fontFamily: selected ? 'Inter_700Bold' : 'Inter_600SemiBold',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {seg.label}
                </Text>
              )}
              {seg.badge != null && (
                <View
                  style={[
                    styles.badge,
                    selected ? styles.badgeSelected : styles.badgeDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: selected ? '#041220' : textTokens.primary },
                    ]}
                  >
                    {seg.badge}
                  </Text>
                </View>
              )}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    letterSpacing: -0.1,
  },
  badge: {
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeSelected: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  badgeDefault: {
    backgroundColor: surface.glassActive,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
});

export default SegmentedControl;
