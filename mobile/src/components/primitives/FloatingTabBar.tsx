/**
 * FloatingTabBar — custom tab bar pro expo-router com:
 *  - Indicator deslizando entre tabs via spring
 *  - Ícone focus scale-bounce no tap
 *  - Badge com pop animation
 *  - Glass surface + glow sutil
 *  - Haptic selection no tab change
 *
 * Montagem no expo-router via `tabBar={(props) => <FloatingTabBar {...props} />}`.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { aurora, surface, text as textTokens, premium, gradients } from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { PressableScale } from './PressableScale';
import { useReduceMotion } from '../../design/hooks';

const { width: SCREEN_W } = Dimensions.get('window');

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const reduceMotion = useReduceMotion();

  // Hidden routes (href: null) NÃO devem mostrar no tab bar. Expo-router passa
  // tabBarButton = () => null pras ocultas — detectamos por ausência de ícone
  // ou pela marcação explícita href:null em options.
  const shownRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    const hasIcon = !!options.tabBarIcon;
    return hasIcon && (options as any).href !== null;
  });

  const activeIndex = shownRoutes.findIndex(
    (r) => r.key === state.routes[state.index].key,
  );

  // Layout das tabs (measured ao render)
  const tabLayouts = React.useRef<Array<{ x: number; width: number }>>([]);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  useEffect(() => {
    if (activeIndex < 0 || !tabLayouts.current[activeIndex]) return;
    const target = tabLayouts.current[activeIndex];
    if (reduceMotion) {
      indicatorX.value = withTiming(target.x, motion.timingConfig.short);
      indicatorW.value = withTiming(target.width, motion.timingConfig.short);
    } else {
      indicatorX.value = withSpring(target.x, motion.springConfig.indicator);
      indicatorW.value = withSpring(target.width, motion.springConfig.indicator);
    }
  }, [activeIndex, reduceMotion, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Glass BG */}
        <LinearGradient
          colors={[
            'rgba(14, 22, 48, 0.92)',
            'rgba(14, 22, 48, 0.98)',
          ]}
          style={StyleSheet.absoluteFill}
        />
        {/* Border highlight top */}
        <View style={styles.barBorderTop} />

        {/* Indicator (pill de fundo no item ativo) */}
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {shownRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title || route.name;
          const badgeCount = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.select();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLayout = (e: LayoutChangeEvent) => {
            const { x, width } = e.nativeEvent.layout;
            tabLayouts.current[index] = { x, width };
            // Trigger reposition se esse é o active tab e ainda não tem layout
            if (index === activeIndex && indicatorW.value === 0) {
              indicatorX.value = x;
              indicatorW.value = width;
            }
          };

          return (
            <TabButton
              key={route.key}
              label={String(label)}
              focused={focused}
              iconName={
                (options.tabBarIcon as any)?.({ focused: true, color: aurora.cyan, size: 22 })?.props?.name ||
                'ellipse'
              }
              badgeCount={badgeCount}
              onPress={onPress}
              onLayout={onLayout}
              reduceMotion={reduceMotion}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── TabButton — ícone + label + badge ───────────────────────────────────

type TabButtonProps = {
  label: string;
  focused: boolean;
  iconName: any;
  badgeCount?: any;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  accessibilityLabel: string;
  reduceMotion: boolean;
};

function TabButton({
  label,
  focused,
  iconName,
  badgeCount,
  onPress,
  onLayout,
  accessibilityLabel,
  reduceMotion,
}: TabButtonProps) {
  const bounce = useSharedValue(1);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (focused && !reduceMotion) {
      bounce.value = withSequence(
        withSpring(1.15, { damping: 12, stiffness: 320 }),
        withSpring(1, motion.springConfig.snappy),
      );
    }
  }, [focused, reduceMotion, bounce]);

  useEffect(() => {
    if (badgeCount) {
      badgeScale.value = reduceMotion
        ? 1
        : withSequence(
            withSpring(1.2, { damping: 10, stiffness: 300 }),
            withSpring(1, motion.springConfig.snappy),
          );
    } else {
      badgeScale.value = reduceMotion ? 0 : withTiming(0, motion.timingConfig.short);
    }
  }, [badgeCount, reduceMotion, badgeScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="none" // já dispara em onPress acima
      pressedScale={0.94}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
    >
      <View style={styles.tabContent}>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? iconName : `${iconName}-outline`}
            size={22}
            color={focused ? textTokens.primary : textTokens.muted}
          />
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            { color: focused ? textTokens.primary : textTokens.muted },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Badge */}
        {badgeCount ? (
          <Animated.View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>
              {typeof badgeCount === 'number' && badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 12 : 16,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: surface.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  barBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 18,
    opacity: 0.22, // sutil — não vira CTA, é indicator
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -14,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: aurora.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },
});

export default FloatingTabBar;
